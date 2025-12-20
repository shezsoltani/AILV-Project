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
