from collections import deque
from collections.abc import Iterable
from copy import deepcopy
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy.orm import Session


@dataclass(frozen=True)
class StageCall:
    db: Session
    request_id: UUID
    stage: str
    language: str
    context: dict
    custom_prompt: str | None


class FakeStageRunner:
    """Return queued responses or raise queued exceptions, without any I/O."""

    def __init__(self, responses: Iterable[str | Exception]):
        self._responses = deque(responses)
        self.calls: list[StageCall] = []

    async def __call__(
        self,
        db: Session,
        request_id: UUID,
        stage: str,
        language: str,
        context: dict,
        custom_prompt: str | None = None,
    ) -> str:
        self.calls.append(
            StageCall(db, request_id, stage, language, deepcopy(context), custom_prompt)
        )
        if not self._responses:
            raise AssertionError(f"No prepared response left for stage {stage!r}.")
        response = self._responses.popleft()
        if isinstance(response, Exception):
            raise response
        return response
