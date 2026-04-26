from ...core.exceptions import SlidesImproveValidationError

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

        for j, bullet in enumerate(new_bullets):
            if not isinstance(bullet, str) or not bullet.strip():
                raise SlidesImproveValidationError(
                    f"Item {i}, bullet {j} is empty or invalid."
                )
            if bullet.strip().lower() in PLACEHOLDER_STRINGS:
                raise SlidesImproveValidationError(
                    f"Item {i}, bullet {j} looks like a placeholder: '{bullet}'."
                )
