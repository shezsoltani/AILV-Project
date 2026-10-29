import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

import httpx
from fastapi import BackgroundTasks, HTTPException

from app.config import settings
from app.models.generate_models import GenerateRequest
from app.services.llm_selection import resolve_selection, create_provider, available_models
from app.services.llm_client import OpenAILLMProvider
from app.services.ollama_provider import OllamaLLMProvider
from app.services.generation import orchestrator, stage_runner
from app.services import batch_runner, job_runner
from app.api import routes_generate
from app.core.exceptions import LLMAPIError
from tests.fakes.fake_llm_provider import FakeLLMProvider


class TestSelection(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        for name, value in {"ollama_enabled": True, "ollama_models": ("qwen3:8b",),
                            "openai_model_name": "gpt-4o"}.items():
            p = patch.object(settings, name, value)
            p.start()
            self.addCleanup(p.stop)

    def test_default_and_local_selection(self):
        req = resolve_selection(GenerateRequest(topic="Datenbanken"))
        self.assertEqual((req.provider, req.model), ("openai", "gpt-4o"))
        self.assertIsInstance(create_provider(req), OpenAILLMProvider)
        local = resolve_selection(req.model_copy(update={"provider": "ollama", "model": None}))
        self.assertEqual(local.model, "qwen3:8b")
        self.assertIsInstance(create_provider(local), OllamaLLMProvider)

    def test_invalid_selection(self):
        for values in [{"provider": "unknown"}, {"provider": "ollama", "model": "unknown"},
                       {"provider": "openai", "model": ""}]:
            with self.subTest(values=values), self.assertRaises(HTTPException):
                resolve_selection(GenerateRequest(topic="Datenbanken", **values))
        with patch.object(settings, "ollama_enabled", False), self.assertRaises(HTTPException):
            resolve_selection(GenerateRequest(topic="Datenbanken", provider="ollama"))

    async def test_route_saves_resolved_selection(self):
        tasks = BackgroundTasks()
        job = SimpleNamespace(id=uuid4(), status="queued")
        with patch.object(routes_generate, "create_job", return_value=job) as create:
            await routes_generate.generate(
                GenerateRequest(topic="Datenbanken", provider="ollama"), tasks,
                validator=Mock(), db=Mock(), current_user=SimpleNamespace(id=uuid4()),
            )
        data = create.call_args.kwargs["request_data"]
        self.assertEqual((data["provider"], data["model"]), ("ollama", "qwen3:8b"))
        self.assertEqual(tasks.tasks[0].args[1], data)

    async def test_parallel_jobs_keep_provider_through_all_stages(self):
        question = {"id": str(uuid4()), "type": "SCQ", "difficulty": "easy",
                    "stem": "Frage?", "choices": ["A", "B"], "correct_index": 0}
        responses = [json.dumps([question])] * 3
        class YieldingProvider(FakeLLMProvider):
            async def complete(self, prompt):
                # Ensure the two jobs actually interleave between stage calls.
                await asyncio.sleep(0)
                return await super().complete(prompt)

        first, second = YieldingProvider(responses), YieldingProvider(responses)
        for target, name, value in [
            (orchestrator, "create_generation_request_db", SimpleNamespace(id=uuid4())),
            (orchestrator, "get_latest_prompt_by_stage", SimpleNamespace(id=uuid4())),
            (orchestrator, "store_generated_questions", []),
            (stage_runner, "insert_prompt_entry", SimpleNamespace()),
        ]:
            p = patch.object(target, name, return_value=value)
            p.start()
            self.addCleanup(p.stop)
        with patch.object(stage_runner, "get_template_by_stage", side_effect=lambda db, stage, language: stage), \
             patch.object(orchestrator, "create_provider", side_effect=lambda req: first if req.provider == "openai" else second), \
             patch.object(stage_runner, "get_default_llm_provider", side_effect=AssertionError("Unexpected fallback")):
            await asyncio.gather(*[
                orchestrator.generate_questions(
                    GenerateRequest(topic="Datenbanken", count=1, provider=provider), Mock(), uuid4(),
                ) for provider in ("openai", "ollama")
            ])
        self.assertEqual(first.prompts, ["SKELETON", "CONTENT", "IMPROVE"])
        self.assertEqual(second.prompts, first.prompts)

    async def test_batches_share_one_provider(self):
        selected = object()
        with patch.object(batch_runner, "create_provider", return_value=selected) as factory, \
             patch.object(batch_runner, "update_job"), \
             patch.object(batch_runner, "generate_questions", new_callable=AsyncMock) as generate:
            generate.return_value = SimpleNamespace(questions=[])
            await batch_runner.run_question_batches(
                uuid4(), GenerateRequest(topic="Datenbanken", count=11, provider="ollama", model="qwen3:8b"),
                uuid4(), Mock(), Mock(), existing_request_id=uuid4(),
            )
        factory.assert_called_once()
        self.assertEqual(generate.await_count, 2)
        for call in generate.call_args_list:
            self.assertIs(call.kwargs["llm_provider"], selected)
            self.assertEqual(call.args[0].model, "qwen3:8b")

    async def test_failure_reaches_job_status(self):
        with patch.object(job_runner, "SessionLocal", return_value=Mock()), \
             patch.object(job_runner, "ensure_job_not_cancelled"), \
             patch.object(job_runner, "update_job") as update, \
             patch.object(job_runner, "run_question_batches", new_callable=AsyncMock,
                          side_effect=LLMAPIError("Ollama ist nicht erreichbar.")):
            await job_runner.run_questions_job(uuid4(), {"topic": "Datenbanken", "provider": "ollama"}, uuid4())
        self.assertEqual(update.call_args.kwargs["status"], "failed")
        self.assertIn("Ollama", update.call_args.kwargs["error_message"])

    async def test_model_list_and_disabled_ollama(self):
        with patch.object(settings, "ollama_enabled", False), \
             patch("app.services.llm_selection.httpx.AsyncClient") as client:
            result = await available_models()
            client.assert_not_called()
            self.assertEqual(len(result["models"]), 1)
        response = httpx.Response(200, json={"models": [{"name": "qwen3:8b"}]},
                                  request=httpx.Request("GET", "http://test/api/tags"))
        with patch("app.services.llm_selection.httpx.AsyncClient") as client:
            client.return_value.__aenter__.return_value.get = AsyncMock(return_value=response)
            result = await available_models()
            self.assertTrue(result["models"][1]["available"])
            client.return_value.__aenter__.return_value.get = AsyncMock(side_effect=httpx.ConnectError("offline"))
            result = await available_models()
            self.assertFalse(result["models"][1]["available"])
