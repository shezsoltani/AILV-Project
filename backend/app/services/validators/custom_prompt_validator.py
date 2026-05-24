from ...core.exceptions import TemplateRenderError

REQUIRED_PLACEHOLDERS: dict[str, list[str]] = {
    "CONTENT":        ["{{skeleton_data}}"],
    "IMPROVE":        ["{{questions_raw}}"],
    "SLIDES_CONTENT": ["{{outline_data}}"],
    "SLIDES_IMPROVE": ["{{slides_raw}}"],
}

VALID_STAGE_KEYS = {
    "SKELETON",
    "CONTENT",
    "IMPROVE",
    "SLIDES_OUTLINE",
    "SLIDES_CONTENT",
    "SLIDES_IMPROVE",
}


def validate_custom_prompt(stage: str, custom_prompt: str) -> None:
    required = REQUIRED_PLACEHOLDERS.get(stage, [])
    missing = [p for p in required if p not in custom_prompt]
    if missing:
        raise TemplateRenderError(
            f"Custom Prompt für Stage '{stage}' fehlen Pflicht-Platzhalter: {missing}"
        )


def validate_custom_prompts_dict(custom_prompts: dict[str, str]) -> None:
    unknown = [k for k in custom_prompts if k not in VALID_STAGE_KEYS]
    if unknown:
        raise TemplateRenderError(
            f"Unbekannte Stage-Keys in custom_prompts: {sorted(unknown)}. "
            f"Erlaubt: {sorted(VALID_STAGE_KEYS)}"
        )
