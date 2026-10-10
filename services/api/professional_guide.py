"""Entrevista conversacional para crear proyectos profesionales."""

from __future__ import annotations

import json
from typing import Any

import llm
import professional


def _template(templates: list[dict], template_id: str | None) -> dict:
    return next((item for item in templates if str(item["id"]) == str(template_id)), None) or next(
        (item for item in templates if item.get("is_default")),
        templates[0],
    )


def _fallback_template(templates: list[dict], text: str) -> dict:
    low = text.lower()
    key = "custom"
    if any(word in low for word in ("software", "web", "app", "aplicación", "api", "programa", "plataforma")):
        key = "software"
    elif any(word in low for word in ("juríd", "abog", "expediente", "contrato", "demanda", "recurso")):
        key = "legal"
    elif any(word in low for word in ("econom", "consult", "valoración", "financ", "estudio")):
        key = "economy"
    return next((item for item in templates if item.get("starter_key") == key), _template(templates, None))


def _extract_initial(cur, user_id: str, templates: list[dict], text: str) -> tuple[dict, str]:
    chosen = _fallback_template(templates, text)
    fallback = {
        "template_id": str(chosen["id"]),
        "title": text.strip()[:200],
        "work_types": [],
        "description": text.strip()[:5000],
        "custom_values": {},
    }
    available, _, settings = llm.can_use_llm(cur)
    if not available:
        return fallback, "He preparado un primer borrador con lo que me has contado."
    catalog = [
        {
            "id": str(item["id"]),
            "name": item["name"],
            "terminology": item["terminology"],
            "definition": item["definition"],
        }
        for item in templates
    ]
    messages = [
        {
            "role": "system",
            "content": (
                "Eres el agente profesional de Impersia. Extrae un borrador de proyecto a partir del mensaje. "
                "Elige una plantilla del catálogo, sin inventar claves. Un proyecto puede tener VARIOS work_types. "
                "No inventes cliente, fecha ni campos. Responde solo JSON con template_id, title, work_types, "
                "client_name, description, due_date, priority, custom_values y acknowledgement. "
                "acknowledgement es una frase breve y natural en español, sin afirmar datos no dichos."
            ),
        },
        {"role": "user", "content": f"Catálogo: {json.dumps(catalog, ensure_ascii=False)}\nMensaje: {text}"},
    ]
    success = False
    error = None
    input_tokens = output_tokens = latency_ms = 0
    try:
        content, input_tokens, output_tokens, latency_ms = llm.openrouter_chat(
            model=settings["model"],
            messages=messages,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(content)
        selected = _template(templates, parsed.get("template_id"))
        allowed_types = {item["key"] for item in selected["definition"].get("work_types", [])}
        draft = {
            **fallback,
            "template_id": str(selected["id"]),
            "title": str(parsed.get("title") or fallback["title"]).strip()[:200],
            "work_types": [value for value in parsed.get("work_types", []) if value in allowed_types],
            "client_name": str(parsed.get("client_name") or "").strip()[:240] or None,
            "description": str(parsed.get("description") or text).strip()[:5000],
            "due_date": str(parsed.get("due_date") or "")[:10] or None,
            "priority": parsed.get("priority") if parsed.get("priority") in professional.PRIORITIES else "media",
            "custom_values": {},
        }
        acknowledgement = str(parsed.get("acknowledgement") or "").strip()[:300] or "He entendido la idea. Vamos a darle forma."
        success = True
    except Exception as exc:
        draft, acknowledgement = fallback, "He preparado un primer borrador con lo que me has contado."
        error = str(exc)[:500]
    llm.log_usage(
        cur,
        user_id=user_id,
        capture_id=None,
        provider=settings["provider"],
        model=settings["model"],
        purpose="project_guide",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=llm.compute_cost(input_tokens, output_tokens, settings),
        latency_ms=latency_ms or None,
        success=success,
        error_message=error,
        fallback_used=not success,
    )
    return draft, acknowledgement


def _apply_answer(draft: dict, key: str, answer: Any, templates: list[dict]) -> dict:
    result = dict(draft or {})
    if answer == "__skip__":
        if key == "work_types":
            result[key] = []
        elif key.startswith("custom."):
            custom = dict(result.get("custom_values") or {})
            custom.pop(key.split(".", 1)[1], None)
            result["custom_values"] = custom
        else:
            result[key] = None
        return result
    if key == "template_id":
        selected = _template(templates, str(answer))
        result.update(
            template_id=str(selected["id"]),
            work_types=[],
            stage=selected["definition"].get("stages", [{}])[0].get("key"),
            custom_values={},
        )
    elif key == "work_types":
        result[key] = answer if isinstance(answer, list) else [answer]
    elif key.startswith("custom."):
        custom = dict(result.get("custom_values") or {})
        custom[key.split(".", 1)[1]] = answer
        result["custom_values"] = custom
    else:
        result[key] = answer
    return result


def _question(key: str, template: dict) -> dict:
    terms = template["terminology"]
    definition = template["definition"]
    if key == "template_id":
        raise ValueError("La pregunta de plantilla necesita el catálogo")
    if key == "title":
        return {"key": key, "type": "text", "label": f"¿Cómo quieres llamar a este {terms['project'].lower()}?", "required": True}
    if key == "work_types":
        return {
            "key": key,
            "type": "multiple",
            "label": "¿Qué tipos de trabajo incluye? Puedes elegir varios.",
            "options": definition.get("work_types", []),
            "required": False,
        }
    if key == "client_name":
        return {"key": key, "type": "text", "label": f"¿Para qué {terms['client'].lower()} o destinatario es?", "required": False}
    if key == "description":
        return {"key": key, "type": "textarea", "label": "¿Qué resultado quieres conseguir?", "required": False}
    if key == "due_date":
        return {"key": key, "type": "date", "label": "¿Hay una fecha objetivo?", "required": False}
    if key == "priority":
        return {
            "key": key,
            "type": "single",
            "label": "¿Qué prioridad tiene?",
            "options": [{"key": "baja", "label": "Baja"}, {"key": "media", "label": "Media"}, {"key": "alta", "label": "Alta"}],
            "required": True,
        }
    field_key = key.split(".", 1)[1]
    field = next(item for item in definition.get("fields", []) if item["key"] == field_key)
    kind = "multiple" if field["type"] == "multiselect" else "single" if field["type"] in {"select", "boolean"} else field["type"]
    options = [{"key": value, "label": value} for value in field.get("options", [])]
    if field["type"] == "boolean":
        options = [{"key": True, "label": "Sí"}, {"key": False, "label": "No"}]
    return {
        "key": key,
        "type": kind,
        "label": f"{field['label']}:",
        "options": options,
        "required": bool(field.get("required")),
    }


def guide_step(
    cur,
    user_id: str,
    *,
    draft: dict,
    answered_keys: list[str],
    question_key: str,
    answer: Any,
) -> dict:
    templates = professional.list_templates(cur, user_id)
    answered = list(dict.fromkeys(answered_keys or []))
    acknowledgement = "Perfecto."
    if question_key == "project_idea":
        next_draft, acknowledgement = _extract_initial(cur, user_id, templates, str(answer or ""))
    else:
        next_draft = _apply_answer(draft, question_key, answer, templates)
    if question_key not in answered:
        answered.append(question_key)
    selected = _template(templates, next_draft.get("template_id"))
    next_draft["template_id"] = str(selected["id"])
    next_draft.setdefault("stage", selected["definition"].get("stages", [{}])[0].get("key"))
    next_draft.setdefault("priority", "media")
    sequence = ["template_id", "title", "work_types", "client_name", "description", "due_date"]
    sequence.extend(f"custom.{field['key']}" for field in selected["definition"].get("fields", []))
    sequence.append("priority")
    next_key = next((key for key in sequence if key not in answered), None)
    if not next_key:
        return {"reply": "Ya tengo lo necesario. Revisa la ficha antes de crearla.", "draft": next_draft, "answered_keys": answered, "ready": True}
    if next_key == "template_id":
        question = {
            "key": next_key,
            "type": "single",
            "label": "¿Qué enfoque profesional encaja mejor?",
            "options": [{"key": str(item["id"]), "label": item["name"]} for item in templates],
            "required": True,
        }
    else:
        question = _question(next_key, selected)
    return {"reply": acknowledgement, "draft": next_draft, "answered_keys": answered, "question": question, "ready": False}
