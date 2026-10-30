from uuid import uuid4

import pytest

from fakes.fake_stage_runner import FakeStageRunner


async def test_responses_and_exceptions_are_consumed_in_order():
    error = RuntimeError("planned failure")
    runner = FakeStageRunner(["first", error, "third"])
    request_id = uuid4()
    kwargs = dict(db=None, request_id=request_id, language="de", context={})

    assert await runner(stage="SKELETON", **kwargs) == "first"
    with pytest.raises(RuntimeError) as caught:
        await runner(stage="CONTENT", **kwargs)
    assert caught.value is error
    assert await runner(stage="IMPROVE", **kwargs) == "third"
    assert [call.stage for call in runner.calls] == ["SKELETON", "CONTENT", "IMPROVE"]
    assert all(call.request_id == request_id for call in runner.calls)
    assert all(call.language == "de" for call in runner.calls)


async def test_call_context_is_a_snapshot_including_nested_data():
    runner = FakeStageRunner(["response"])
    context = {"questions": [{"stem": "original"}]}
    request_id = uuid4()
    db = object()

    await runner(db, request_id, "CONTENT", "en", context, "custom template")
    context["questions"][0]["stem"] = "changed"
    context["attempt"] = 1

    call = runner.calls[0]
    assert call.db is db
    assert call.request_id == request_id
    assert call.stage == "CONTENT"
    assert call.language == "en"
    assert call.custom_prompt == "custom template"
    assert call.context == {"questions": [{"stem": "original"}]}


async def test_unprepared_call_fails_explicitly_and_is_recorded():
    runner = FakeStageRunner([])

    with pytest.raises(AssertionError, match="No prepared response left.*SKELETON"):
        await runner(None, uuid4(), "SKELETON", "de", {})

    assert len(runner.calls) == 1
