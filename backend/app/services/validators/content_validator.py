from ...core.exceptions import ContentValidationError

ALLOWED_TYPES = {"MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}


def validate_content(data, expected_count: int):
    if not isinstance(data, list):
        raise ContentValidationError("Content must be a JSON array")

    if len(data) != expected_count:
        raise ContentValidationError(
            f"Expected {expected_count} items, got {len(data)}"
        )

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise ContentValidationError(f"Item {i} is not an object")

        # Pflichtfelder
        for key in ("id", "stem", "type", "difficulty"):
            if key not in item:
                raise ContentValidationError(
                    f"Item {i} missing field '{key}'"
                )

        # Typ prüfen
        if item["type"] not in ALLOWED_TYPES:
            raise ContentValidationError(
                f"Item {i} has invalid type '{item['type']}'"
            )

        # Schwierigkeit prüfen
        if item["difficulty"] not in ALLOWED_DIFFICULTIES:
            raise ContentValidationError(
                f"Item {i} has invalid difficulty '{item['difficulty']}'"
            )

        # Typ-spezifische Regeln
        qtype = item["type"]

        if qtype in {"MCQ", "TRUE_FALSE"}:
            if "choices" not in item or not isinstance(item["choices"], list):
                raise ContentValidationError(
                    f"Item {i} ({qtype}) must have 'choices' array"
                )

            if len(item["choices"]) < 2:
                raise ContentValidationError(
                    f"Item {i} ({qtype}) must have at least 2 choices"
                )

            if "correct_index" not in item or not isinstance(item["correct_index"], int):
                raise ContentValidationError(
                    f"Item {i} ({qtype}) must have integer 'correct_index'"
                )

            if not (0 <= item["correct_index"] < len(item["choices"])):
                raise ContentValidationError(
                    f"Item {i} ({qtype}) has invalid correct_index"
                )

        if qtype == "SHORT_ANSWER":
            if "correct_index" in item:
                raise ContentValidationError(
                    f"Item {i} (SHORT_ANSWER) must not have 'correct_index'"
                )
