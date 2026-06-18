from ...core.exceptions import SkeletonValidationError

ALLOWED_TYPES = {"SCQ", "MCQ", "SHORT_ANSWER", "TRUE_FALSE"}
ALLOWED_DIFFICULTIES = {"easy", "medium", "hard"}

def validate_skeleton(data, expected_count: int, difficulty_distribution: dict | None = None):
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

    # Alte Prozentsummen-Prüfung schlug bei kleinen Batches regelmäßig fehl; jetzt absolute Toleranz ±1.
    if difficulty_distribution and expected_count >= 3:
        for diff, target_pct in difficulty_distribution.items():
            if diff not in ALLOWED_DIFFICULTIES:
                continue
            target_count = (target_pct / 100) * expected_count
            actual_count = difficulty_counts.get(diff, 0)
            tolerance = 1  # ±1 für kleine Batches
            if abs(actual_count - target_count) > tolerance + 0.5:
                raise SkeletonValidationError(
                    f"Difficulty '{diff}': expected ~{target_count:.1f} items "
                    f"(±{tolerance}), got {actual_count} "
                    f"(distribution: {difficulty_counts})"
                )

