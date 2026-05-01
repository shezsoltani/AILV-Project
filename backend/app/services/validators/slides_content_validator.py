import math
from ...core.exceptions import SlidesContentValidationError

PLACEHOLDER_STRINGS = {"...", "placeholder", "tbd", "todo", "lorem ipsum"}

BULLET_RULES = {
    "title":   (1, 2),
    "content": (3, 7),
    "closing": (2, 4),
}

MIN_BULLET_WORDS = 8
EXAMPLE_RATIO = 0.30


def _word_count(text: str) -> int:
    return len(text.strip().split())


def validate_slides_content(data: list, outline: list) -> None:
    if not isinstance(data, list):
        raise SlidesContentValidationError("Content must be a JSON array.")

    if len(data) != len(outline):
        raise SlidesContentValidationError(
            f"Expected {len(outline)} slides, got {len(data)}."
        )

    outline_by_position = {item["position"]: item for item in outline}

    content_slide_count = 0
    content_slides_with_example = 0

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise SlidesContentValidationError(f"Item {i} is not an object.")

        for key in ("position", "slide_type", "title", "bullets"):
            if key not in item:
                raise SlidesContentValidationError(
                    f"Item {i} missing field '{key}'."
                )

        position = item["position"]
        outline_item = outline_by_position.get(position)

        if not outline_item:
            raise SlidesContentValidationError(
                f"Item {i} has position {position} which does not exist in outline."
            )

        if item["title"].strip() != outline_item["title"].strip():
            raise SlidesContentValidationError(
                f"Item at position {position} has title '{item['title']}', "
                f"expected '{outline_item['title']}' from outline."
            )

        if item["slide_type"] != outline_item["slide_type"]:
            raise SlidesContentValidationError(
                f"Item at position {position} has slide_type '{item['slide_type']}', "
                f"expected '{outline_item['slide_type']}' from outline."
            )

        slide_type = item["slide_type"]

        bullets = item["bullets"]
        if not isinstance(bullets, list):
            raise SlidesContentValidationError(
                f"Item at position {position} has invalid 'bullets' (must be array)."
            )

        min_b, max_b = BULLET_RULES[slide_type]
        if not (min_b <= len(bullets) <= max_b):
            raise SlidesContentValidationError(
                f"Slide at position {position} ('{slide_type}') must have "
                f"{min_b}–{max_b} bullets, got {len(bullets)}."
            )

        for j, bullet in enumerate(bullets):
            if not isinstance(bullet, str) or not bullet.strip():
                raise SlidesContentValidationError(
                    f"Slide at position {position}, bullet {j} is empty or invalid."
                )
            if bullet.strip().lower() in PLACEHOLDER_STRINGS:
                raise SlidesContentValidationError(
                    f"Slide at position {position}, bullet {j} looks like a placeholder: '{bullet}'."
                )
            if slide_type not in ("title", "closing"):
                words = _word_count(bullet)
                if words < MIN_BULLET_WORDS:
                    raise SlidesContentValidationError(
                        f"Slide at position {position}, bullet {j} has only {words} word(s) "
                        f"(min. {MIN_BULLET_WORDS}). Bullet must be a complete declarative "
                        f"statement with a verb and a claim, not a bare keyword. "
                        f"Got: '{bullet}'."
                    )

        examples = item.get("examples", [])
        if not isinstance(examples, list):
            raise SlidesContentValidationError(
                f"Slide at position {position} has invalid 'examples' (must be array)."
            )

        for k, example in enumerate(examples):
            if not isinstance(example, str) or not example.strip():
                raise SlidesContentValidationError(
                    f"Slide at position {position}, example {k} is empty or invalid."
                )
            if example.strip().lower() in PLACEHOLDER_STRINGS:
                raise SlidesContentValidationError(
                    f"Slide at position {position}, example {k} looks like a placeholder: '{example}'."
                )

        if slide_type in ("title", "closing") and len(examples) > 0:
            raise SlidesContentValidationError(
                f"Slide at position {position} ('{slide_type}') must not contain examples. "
                f"Set 'examples' to an empty array []."
            )

        if slide_type == "content":
            content_slide_count += 1
            if len(examples) >= 1:
                content_slides_with_example += 1

    if content_slide_count > 0:
        required = math.ceil(content_slide_count * EXAMPLE_RATIO)
        if content_slides_with_example < required:
            raise SlidesContentValidationError(
                f"At least {required} of {content_slide_count} content slide(s) "
                f"({int(EXAMPLE_RATIO * 100)} %, rounded up) must have at least one entry "
                f"in 'examples'. Only {content_slides_with_example} slide(s) do."
            )
