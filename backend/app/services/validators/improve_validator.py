from ...core.exceptions import ImproveValidationError

def validate_improve(improved, original):
    if not isinstance(improved, list):
        raise ImproveValidationError("Improved content must be a JSON array")

    if len(improved) != len(original):
        raise ImproveValidationError(
            "Improved content must have same number of items as original"
        )

    for i, (new, old) in enumerate(zip(improved, original)):
        if not isinstance(new, dict):
            raise ImproveValidationError(f"Item {i} is not an object")

        # Keys dürfen nicht fehlen
        missing_keys = set(old.keys()) - set(new.keys())
        if missing_keys:
            raise ImproveValidationError(
                f"Item {i} missing keys after improve: {sorted(missing_keys)}"
            )

        # Typ, Difficulty & ID dürfen sich nicht ändern
        for key in ("id", "type", "difficulty"):
            if new.get(key) != old.get(key):
                raise ImproveValidationError(
                    f"Item {i} field '{key}' must not change during improve"
                )

        # Grundlegende Textfelder prüfen
        if "stem" in new and not isinstance(new["stem"], str):
            raise ImproveValidationError(
                f"Item {i} field 'stem' must be string"
            )

        if "rationale" in new and not isinstance(new["rationale"], str):
            raise ImproveValidationError(
                f"Item {i} field 'rationale' must be string"
            )

        # correct_indices bei MCQ-Typen prüfen: muss Liste bleiben, darf sich ändern (Verbesserung erlaubt)
        if old.get("type") == "MCQ" and "correct_indices" in new:
            if not isinstance(new["correct_indices"], list):
                raise ImproveValidationError(
                    f"Item {i} field 'correct_indices' must be a list"
                )

        # correct_index bei SCQ/TRUE_FALSE prüfen: muss Integer bleiben
        if old.get("type") in ("SCQ", "TRUE_FALSE") and "correct_index" in new:
            if not isinstance(new["correct_index"], int):
                raise ImproveValidationError(
                    f"Item {i} field 'correct_index' must be an integer"
                )
