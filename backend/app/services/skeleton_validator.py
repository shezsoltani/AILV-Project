from ..core.exceptions import SkeletonValidationError

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

        for key in ("id", "type", "difficulty"):
            if key not in item:
                raise SkeletonValidationError(
                    f"Item {i} missing field '{key}'"
                )
