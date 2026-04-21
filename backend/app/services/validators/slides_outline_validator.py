from ...core.exceptions import SlideOutlineValidationError

def validate_slide_outline(data, expected_count: int) -> None:
    if not isinstance(data, list):
        raise SlideOutlineValidationError("Outline must be a JSON array.")

    if len(data) != expected_count:
        raise SlideOutlineValidationError(
            f"Expected {expected_count} slides, got {len(data)}."
        )

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SlideOutlineValidationError(f"Item {i} is not an object.")

        for key in ("position", "slide_type", "title"):
            if key not in item:
                raise SlideOutlineValidationError(
                    f"Item {i} missing field '{key}'."
                )

        if not isinstance(item["title"], str) or not item["title"].strip():
            raise SlideOutlineValidationError(
                f"Item {i} has an empty or invalid title."
            )

    # erste Folie muss title sein
    if data[0]["slide_type"] != "title":
        raise SlideOutlineValidationError(
            f"First slide must have slide_type 'title', got '{data[0]['slide_type']}'."
        )

    # Letzte Folie muss closing sein
    if data[-1]["slide_type"] != "closing":
        raise SlideOutlineValidationError(
            f"Last slide must have slide_type 'closing', got '{data[-1]['slide_type']}'."
        )

    # Mittlere Folien müssen content sein
    for i, item in enumerate(data[1:-1], start=1):
        if item["slide_type"] != "content":
            raise SlideOutlineValidationError(
                f"Slide at position {i + 1} must have slide_type 'content', "
                f"got '{item['slide_type']}'."
            )

    # Positionen müssen aufsteigend und lückenlos sein
    for i, item in enumerate(data):
        expected_pos = i + 1
        if item["position"] != expected_pos:
            raise SlideOutlineValidationError(
                f"Slide {i} has position {item['position']}, expected {expected_pos}."
            )