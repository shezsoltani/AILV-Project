from ...core.exceptions import ContentValidationError

ALLOWED_TYPES = {"SCQ", "MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
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

        qtype = item["type"]

        # SCQ und TRUE_FALSE: choices + genau 1 correct_index
        if qtype in {"SCQ", "TRUE_FALSE"}:
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

        # MCQ (Multiple Response): choices + correct_indices (Liste mit mind. 1 Eintrag)
        elif qtype == "MCQ":
            if "correct_index" in item:
                raise ContentValidationError(
                    f"Item {i} (MCQ) must not have 'correct_index' – use 'correct_indices' instead"
                )
            if "choices" not in item or not isinstance(item["choices"], list):
                raise ContentValidationError(
                    f"Item {i} (MCQ) must have 'choices' array"
                )
            if len(item["choices"]) < 2:
                raise ContentValidationError(
                    f"Item {i} (MCQ) must have at least 2 choices"
                )
            if "correct_indices" not in item or not isinstance(item["correct_indices"], list):
                raise ContentValidationError(
                    f"Item {i} (MCQ) must have 'correct_indices' array"
                )
            if len(item["correct_indices"]) < 1:
                raise ContentValidationError(
                    f"Item {i} (MCQ) must have at least 1 correct index in 'correct_indices'"
                )
            seen_indices: set[int] = set()
            for idx in item["correct_indices"]:
                if not isinstance(idx, int) or not (0 <= idx < len(item["choices"])):
                    raise ContentValidationError(
                        f"Item {i} (MCQ) has invalid entry in 'correct_indices': {idx}"
                    )
                if idx in seen_indices:
                    raise ContentValidationError(
                        f"Item {i} (MCQ) has duplicate index {idx} in 'correct_indices'"
                    )
                seen_indices.add(idx)

        # SHORT_ANSWER: kein correct_index/correct_indices erlaubt
        elif qtype == "SHORT_ANSWER":
            if "correct_index" in item:
                raise ContentValidationError(
                    f"Item {i} (SHORT_ANSWER) must not have 'correct_index'"
                )
            if "correct_indices" in item:
                raise ContentValidationError(
                    f"Item {i} (SHORT_ANSWER) must not have 'correct_indices'"
                )
