import json
import re

class LLMJSONError(Exception):
    pass


def safe_parse_json(raw: str):
    if not raw or not raw.strip():
        raise LLMJSONError("LLM returned empty response")

    text = raw.strip()

    # Entferne ```json ``` oder ``` ```
    text = re.sub(r"^```json", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"^```", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise LLMJSONError(
            f"Invalid JSON from LLM: {e.msg} (line {e.lineno})"
        )
