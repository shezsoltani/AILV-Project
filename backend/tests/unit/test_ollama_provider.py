import json
import unittest

import httpx

from app.core.exceptions import LLMAPIError
from app.services.ollama_provider import OllamaLLMProvider


class TestOllamaProvider(unittest.IsolatedAsyncioTestCase):
    def provider(self, handler):
        return OllamaLLMProvider(
            "http://ollama.test:11434/", "qwen3:8b",
            transport=httpx.MockTransport(handler),
        )

    async def test_request_and_response(self):
        def handler(request):
            self.assertEqual(str(request.url), "http://ollama.test:11434/api/generate")
            payload = json.loads(request.content)
            self.assertEqual(payload["model"], "qwen3:8b")
            self.assertEqual(payload["prompt"], "Testfrage")
            self.assertFalse(payload["stream"])
            return httpx.Response(200, json={"response": " Antwort ", "done": True})

        self.assertEqual(await self.provider(handler).complete("Testfrage"), "Antwort")

    async def test_empty_prompt_does_not_send_request(self):
        def handler(request):
            self.fail("An empty prompt must not cause a request")

        with self.assertRaises(ValueError):
            await self.provider(handler).complete("  ")

    async def test_http_errors_are_readable(self):
        for status, message in [(404, "nicht gefunden"), (500, "HTTP 500")]:
            with self.subTest(status=status):
                with self.assertRaisesRegex(LLMAPIError, message):
                    await self.provider(lambda r: httpx.Response(status)).complete("Test")

    async def test_bad_responses_are_rejected(self):
        for payload in [[], {}, {"error": "failed"},
                        {"response": "text", "done": False},
                        {"response": "  ", "done": True},
                        {"response": 123, "done": True}]:
            with self.subTest(payload=payload):
                with self.assertRaises(LLMAPIError):
                    await self.provider(lambda r: httpx.Response(200, json=payload)).complete("Test")

    async def test_invalid_json(self):
        with self.assertRaisesRegex(LLMAPIError, "ungültige API-Antwort"):
            await self.provider(lambda r: httpx.Response(200, text="not JSON")).complete("Test")

    async def test_network_errors(self):
        for error, message in [(httpx.ConnectError("offline"), "nicht erreichbar"),
                               (httpx.ReadTimeout("slow"), "Sekunden")]:
            def handler(request):
                raise error

            with self.subTest(error=type(error).__name__):
                with self.assertRaisesRegex(LLMAPIError, message):
                    await self.provider(handler).complete("Test")

    async def test_total_timeout(self):
        import asyncio

        async def handler(request):
            await asyncio.sleep(1)
            return httpx.Response(200, json={"response": "late", "done": True})

        provider = self.provider(handler)
        provider.timeout_seconds = 0.01
        with self.assertRaisesRegex(LLMAPIError, "Sekunden"):
            await provider.complete("Test")
