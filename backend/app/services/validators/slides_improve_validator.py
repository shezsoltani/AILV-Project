from ...core.exceptions import SlidesImproveValidationError
from .slides_content_validator import (
    MIN_BULLET_WORDS,
    _word_count,
)

PLACEHOLDER_STRINGS = {"...", "placeholder", "tbd", "todo", "lorem ipsum"}


def validate_slides_improve(data: list, content_slides: list[dict]) -> None:
    if not isinstance(data, list):
        raise SlidesImproveValidationError("Improved slides must be a JSON array.")

    if len(data) != len(content_slides):
        raise SlidesImproveValidationError(
            "Improved slides must have the same number of slides as original content."
        )

    for i, (new_item, old_item) in enumerate(zip(data, content_slides)):
        if not isinstance(new_item, dict):
            raise SlidesImproveValidationError(f"Item {i} is not an object.")

        for key in ("position", "slide_type", "title", "bullets"):
            if key not in new_item:
                raise SlidesImproveValidationError(
                    f"Item {i} missing field '{key}'."
                )

        if new_item["position"] != old_item.get("position"):
            raise SlidesImproveValidationError(
                f"Item {i} changed position from {old_item.get('position')} "
                f"to {new_item['position']}."
            )

        if new_item["slide_type"] != old_item.get("slide_type"):
            raise SlidesImproveValidationError(
                f"Item {i} changed slide_type from '{old_item.get('slide_type')}' "
                f"to '{new_item['slide_type']}'."
            )

        if not isinstance(new_item["title"], str) or not new_item["title"].strip():
            raise SlidesImproveValidationError(
                f"Item {i} has invalid title (must be non-empty string)."
            )

        old_bullets = old_item.get("bullets")
        new_bullets = new_item["bullets"]

        if not isinstance(old_bullets, list):
            raise SlidesImproveValidationError(
                f"Original slide at item {i} has invalid bullets."
            )

        if not isinstance(new_bullets, list):
            raise SlidesImproveValidationError(
                f"Item {i} has invalid 'bullets' (must be array)."
            )

        if abs(len(new_bullets) - len(old_bullets)) > 1:
            raise SlidesImproveValidationError(
                f"Item {i} changed bullet count too much: "
                f"{len(old_bullets)} -> {len(new_bullets)}."
            )

        slide_type = new_item["slide_type"]
        for j, bullet in enumerate(new_bullets):
            if not isinstance(bullet, str) or not bullet.strip():
                raise SlidesImproveValidationError(
                    f"Item {i}, bullet {j} is empty or invalid."
                )
            if bullet.strip().lower() in PLACEHOLDER_STRINGS:
                raise SlidesImproveValidationError(
                    f"Item {i}, bullet {j} looks like a placeholder: '{bullet}'."
                )
            if slide_type not in ("title", "closing"):
                words = _word_count(bullet)
                if words < MIN_BULLET_WORDS:
                    raise SlidesImproveValidationError(
                        f"Item {i}, bullet {j} has only {words} word(s) "
                        f"(min. {MIN_BULLET_WORDS}). Improvement must keep bullets as "
                        f"complete declarative statements, not shorten them to bare "
                        f"keywords. Got: '{bullet}'."
                    )

        old_examples = old_item.get("examples", [])
        new_examples = new_item.get("examples", [])

        if isinstance(old_examples, list) and len(old_examples) >= 1 and len(new_examples) == 0:
            raise SlidesImproveValidationError(
                f"Item {i} removed all examples. The improve stage must preserve "
                f"existing examples (refine wording only, do not delete them)."
            )

        if not isinstance(new_examples, list):
            raise SlidesImproveValidationError(
                f"Item {i} has invalid 'examples' (must be array)."
            )

        if slide_type in ("title", "closing") and len(new_examples) > 0:
            raise SlidesImproveValidationError(
                f"Item {i} ('{slide_type}') must not contain examples. "
                f"Set 'examples' to an empty array []."
            )

        for k, example in enumerate(new_examples):
            if not isinstance(example, str) or not example.strip():
                raise SlidesImproveValidationError(
                    f"Item {i}, example {k} is empty or invalid."
                )
            if example.strip().lower() in PLACEHOLDER_STRINGS:
                raise SlidesImproveValidationError(
                    f"Item {i}, example {k} looks like a placeholder: '{example}'."
                )
