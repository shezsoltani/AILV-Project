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

    difficulty_counts = {d: 0 for d in ALLOWED_DIFFICULTIES}

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SkeletonValidationError(f"Item {i} is not an object")

        # Pflichtfelder prüfen
        for key in ("type", "difficulty"):
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
        difficulty = item["difficulty"]
        if difficulty not in ALLOWED_DIFFICULTIES:
            raise SkeletonValidationError(
                f"Item {i} has invalid difficulty '{difficulty}'. "
                f"Allowed difficulties: {sorted(ALLOWED_DIFFICULTIES)}"
            )

        difficulty_counts[difficulty] += 1

    # Prozentuale Difficulty-Distribution berechnen
    percentages = {}
    total_percentage = 0

    for difficulty, count in difficulty_counts.items():
        percentage = (count / expected_count) * 100
        percentages[difficulty] = percentage
        total_percentage += percentage

    # Floating-Point-Toleranz vermeiden
    if round(total_percentage, 6) != 100:
        raise SkeletonValidationError(
            f"Difficulty distribution must sum to 100%, got {total_percentage:.2f}% "
            f"(distribution: {percentages})"
        )
