from ...core.exceptions import SkeletonValidationError

ALLOWED_TYPES = {"MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}

def validate_skeleton(data, expected_count: int):
    if not isinstance(data, list):
        raise SkeletonValidationError("Skeleton must be a JSON array")

    if len(data) != expected_count:
        raise SkeletonValidationError(
            f"Expected {expected_count} items, got {len(data)}"
        )

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SkeletonValidationError(f"Item {i} is not an object")

        # Pflichtfelder prüfen
        for key in ("id", "type", "difficulty"):
            if key not in item:
                raise SkeletonValidationError(
                    f"Item {i} missing field '{key}'"
                )
            
        # Typ prüfen
        if item["type"] not in ALLOWED_TYPES:
            raise SkeletonValidationError(
                f"Item {i} has invalid type '{item['type']}'. "
                f"Allowed types: {sorted(ALLOWED_TYPES)}"
            )

        # Schwierigkeit prüfen
        if item["difficulty"] not in ALLOWED_DIFFICULTIES:
            raise SkeletonValidationError(
                f"Item {i} has invalid difficulty '{item['difficulty']}'. "
                f"Allowed difficulties: {sorted(ALLOWED_DIFFICULTIES)}"
            )
