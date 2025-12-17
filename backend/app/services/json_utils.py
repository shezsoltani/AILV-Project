import json
import re
from ..core.exceptions import LLMJSONError


def safe_parse_json(raw: str):
    if not raw or not raw.strip():
        raise LLMJSONError(
            detail="LLM returned empty response",
            raw=raw,
        )

    text = raw.strip()

    # Entferne ```json ``` oder ``` ```
    text = re.sub(r"^```json", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^```", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise LLMJSONError(
            detail=f"{e.msg} (line {e.lineno})",
            raw=text,
        )
