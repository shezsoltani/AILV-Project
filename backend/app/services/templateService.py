# app/services/template_service.py
from sqlalchemy import cast
from sqlalchemy.orm import Session
from jinja2 import Environment, StrictUndefined, UndefinedError, TemplateSyntaxError
from ..models.sql_models import PromptTemplate
from ..exceptions import PromptTemplateNotFound, TemplateRenderError

jinja_env = Environment(undefined=StrictUndefined)

def get_template_by_stage(db: Session, stage: str, language: str = "de") -> str:
    if stage is None:
        raise PromptTemplateNotFound(stage=stage, language=language)

    stage_norm = stage.strip()
    lang_norm = (language or "de").strip()

    # case-insensitive Vergleich 
    tmpl_obj = (
        db.query(PromptTemplate)
        .filter(PromptTemplate.stage == stage,
        PromptTemplate.language == language)
        .first()  
    )

    if tmpl_obj is None:
        raise PromptTemplateNotFound(stage=stage, language=language)

    value = getattr(tmpl_obj, "template", None)
    if value is None:
        raise PromptTemplateNotFound(stage=stage, language=language)

    # defensive: ensure string and trim leading CRLF/Whitespace
    if not isinstance(value, str):
        value = str(value)

    value = value.lstrip("\r\n")  # entfernt führende CR/LF; behält inneren Zeilenumbruch
    return value


def render_template(template_text: str, context: dict) -> str:
    try:
        tmpl = jinja_env.from_string(template_text)
        return tmpl.render(**context)
    except (UndefinedError, TemplateSyntaxError) as e:
        raise TemplateRenderError(str(e))
    except Exception as e:
        raise TemplateRenderError(str(e))
