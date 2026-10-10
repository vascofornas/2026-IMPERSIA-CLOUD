"""Proyectos profesionales configurables por plantilla."""

from __future__ import annotations

import json
import re
import unicodedata
from datetime import date

PROJECT_ROLES = frozenset({"project", "task", "milestone", "deliverable", "note"})
PRIORITIES = frozenset({"baja", "media", "alta"})
FIELD_TYPES = frozenset({"text", "number", "date", "select", "multiselect", "boolean", "url"})

STARTERS = (
    {
        "key": "software",
        "name": "Software",
        "terminology": {"project": "Proyecto", "projects": "Proyectos", "client": "Cliente"},
        "definition": {
            "stages": [("planificacion", "Planificación"), ("desarrollo", "Desarrollo"), ("pruebas", "Pruebas"), ("despliegue", "Despliegue")],
            "work_types": [("producto", "Producto"), ("web", "Web"), ("movil", "Aplicación móvil"), ("infraestructura", "Infraestructura")],
            "deliverables": [("release", "Versión"), ("documentacion", "Documentación"), ("demo", "Demostración")],
            "fields": [
                {"key": "repositorio", "label": "Repositorio", "type": "url"},
                {"key": "stack", "label": "Stack tecnológico", "type": "text"},
                {"key": "entorno", "label": "Entorno", "type": "select", "options": ["Desarrollo", "Pruebas", "Producción"]},
            ],
        },
    },
    {
        "key": "legal",
        "name": "Jurídico",
        "terminology": {"project": "Expediente", "projects": "Expedientes", "client": "Cliente"},
        "definition": {
            "stages": [("analisis", "Análisis"), ("redaccion", "Redacción"), ("presentacion", "Presentación"), ("vista", "Vista"), ("cerrado", "Cerrado")],
            "work_types": [("asesoria", "Asesoría"), ("contrato", "Contrato"), ("procedimiento", "Procedimiento"), ("recurso", "Recurso")],
            "deliverables": [("escrito", "Escrito"), ("contrato", "Contrato"), ("informe", "Informe jurídico")],
            "fields": [
                {"key": "jurisdiccion", "label": "Jurisdicción", "type": "text"},
                {"key": "numero_expediente", "label": "N.º de expediente", "type": "text"},
                {"key": "contraparte", "label": "Contraparte", "type": "text"},
            ],
        },
    },
    {
        "key": "economy",
        "name": "Economía y consultoría",
        "terminology": {"project": "Encargo", "projects": "Encargos", "client": "Cliente"},
        "definition": {
            "stages": [("alcance", "Alcance"), ("datos", "Datos"), ("analisis", "Análisis"), ("recomendacion", "Recomendación"), ("entrega", "Entrega")],
            "work_types": [("consultoria", "Consultoría"), ("estudio", "Estudio"), ("valoracion", "Valoración"), ("planificacion", "Planificación")],
            "deliverables": [("informe", "Informe"), ("modelo", "Modelo"), ("presentacion", "Presentación")],
            "fields": [
                {"key": "periodo", "label": "Periodo analizado", "type": "text"},
                {"key": "fuentes", "label": "Fuentes", "type": "text"},
                {"key": "escenario", "label": "Escenario", "type": "select", "options": ["Base", "Optimista", "Conservador"]},
            ],
        },
    },
    {
        "key": "custom",
        "name": "Personalizada",
        "terminology": {"project": "Proyecto", "projects": "Proyectos", "client": "Cliente"},
        "definition": {
            "stages": [("inicio", "Inicio"), ("en_curso", "En curso"), ("revision", "Revisión"), ("cerrado", "Cerrado")],
            "work_types": [("general", "General")],
            "deliverables": [("entrega", "Entrega")],
            "fields": [],
        },
    },
)

DETAIL_FIELDS = (
    "template_id",
    "parent_project_id",
    "project_role",
    "work_type",
    "work_types",
    "deliverable_type",
    "stage",
    "priority",
    "due_date",
    "client_name",
    "description",
    "custom_values",
)


def slug(value: str, fallback: str = "campo") -> str:
    raw = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower()
    result = re.sub(r"[^a-z0-9]+", "_", raw).strip("_")
    return (result or fallback)[:50]


def _named_entries(values, *, limit: int = 20) -> list[dict]:
    result = []
    seen = set()
    for index, value in enumerate(values or []):
        if isinstance(value, dict):
            label = str(value.get("label") or "").strip()
            key = slug(value.get("key") or label, f"valor_{index + 1}")
        elif isinstance(value, (list, tuple)) and len(value) >= 2:
            key = slug(value[0], f"valor_{index + 1}")
            label = str(value[1]).strip()
        else:
            label = str(value).strip()
            key = slug(label, f"valor_{index + 1}")
        if label and key not in seen:
            result.append({"key": key, "label": label[:120]})
            seen.add(key)
        if len(result) >= limit:
            break
    return result


def normalize_template(name: str, terminology: dict | None, definition: dict | None) -> dict:
    title = " ".join(str(name or "").strip().split())[:120]
    if not title:
        raise ValueError("Escribe un nombre para la plantilla")
    terms = dict(terminology or {})
    normalized_terms = {
        "project": str(terms.get("project") or "Proyecto").strip()[:60],
        "projects": str(terms.get("projects") or "Proyectos").strip()[:60],
        "client": str(terms.get("client") or "Cliente").strip()[:60],
    }
    source = dict(definition or {})
    stages = _named_entries(source.get("stages"), limit=12)
    if not stages:
        stages = [{"key": "inicio", "label": "Inicio"}, {"key": "en_curso", "label": "En curso"}, {"key": "cerrado", "label": "Cerrado"}]
    work_types = _named_entries(source.get("work_types"), limit=20)
    deliverables = _named_entries(source.get("deliverables"), limit=20)
    fields = []
    seen = set()
    for index, field in enumerate(source.get("fields") or []):
        if not isinstance(field, dict):
            continue
        label = str(field.get("label") or "").strip()[:120]
        key = slug(field.get("key") or label, f"campo_{index + 1}")
        field_type = str(field.get("type") or "text").strip().lower()
        if not label or key in seen or field_type not in FIELD_TYPES:
            continue
        item = {"key": key, "label": label, "type": field_type, "required": bool(field.get("required"))}
        if field_type in {"select", "multiselect"}:
            item["options"] = [str(option).strip()[:120] for option in (field.get("options") or []) if str(option).strip()][:30]
        fields.append(item)
        seen.add(key)
        if len(fields) >= 24:
            break
    return {
        "name": title,
        "terminology": normalized_terms,
        "definition": {
            "stages": stages,
            "work_types": work_types,
            "deliverables": deliverables,
            "fields": fields,
        },
    }


def ensure_templates(cur, user_id: str) -> None:
    for starter in STARTERS:
        normalized = normalize_template(starter["name"], starter["terminology"], starter["definition"])
        cur.execute(
            """
            INSERT INTO professional_templates (user_id, name, terminology, definition, starter_key)
            VALUES (%s, %s, %s::jsonb, %s::jsonb, %s)
            ON CONFLICT (user_id, starter_key) WHERE starter_key IS NOT NULL DO NOTHING
            """,
            (
                user_id,
                normalized["name"],
                json.dumps(normalized["terminology"], ensure_ascii=False),
                json.dumps(normalized["definition"], ensure_ascii=False),
                starter["key"],
            ),
        )
    cur.execute("SELECT default_professional_template_id FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if user and not user.get("default_professional_template_id"):
        cur.execute(
            """
            UPDATE users u SET default_professional_template_id = pt.id
            FROM professional_templates pt
            WHERE u.id = %s AND pt.user_id = u.id AND pt.starter_key = 'custom'
            """,
            (user_id,),
        )


def fetch_template(cur, user_id: str, template_id: str) -> dict | None:
    cur.execute(
        """
        SELECT pt.id, pt.user_id, pt.name, pt.terminology, pt.definition, pt.starter_key,
               pt.created_at, pt.updated_at,
               (u.default_professional_template_id = pt.id) AS is_default
        FROM professional_templates pt
        JOIN users u ON u.id = pt.user_id
        WHERE pt.id = %s AND pt.user_id = %s
        """,
        (template_id, user_id),
    )
    return cur.fetchone()


def default_template(cur, user_id: str) -> dict:
    ensure_templates(cur, user_id)
    cur.execute(
        """
        SELECT pt.id, pt.user_id, pt.name, pt.terminology, pt.definition, pt.starter_key,
               pt.created_at, pt.updated_at, true AS is_default
        FROM users u
        JOIN professional_templates pt ON pt.id = u.default_professional_template_id
        WHERE u.id = %s
        """,
        (user_id,),
    )
    return cur.fetchone()


def list_templates(cur, user_id: str) -> list[dict]:
    ensure_templates(cur, user_id)
    cur.execute(
        """
        SELECT pt.id, pt.name, pt.terminology, pt.definition, pt.starter_key,
               pt.created_at, pt.updated_at,
               (u.default_professional_template_id = pt.id) AS is_default,
               count(pd.item_id) FILTER (WHERE pd.project_role = 'project') AS project_count
        FROM professional_templates pt
        JOIN users u ON u.id = pt.user_id
        LEFT JOIN project_details pd ON pd.template_id = pt.id
        WHERE pt.user_id = %s
        GROUP BY pt.id, u.default_professional_template_id
        ORDER BY is_default DESC, pt.starter_key NULLS LAST, lower(pt.name)
        """,
        (user_id,),
    )
    return [public_template(row) for row in cur.fetchall()]


def public_template(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "terminology": dict(row.get("terminology") or {}),
        "definition": dict(row.get("definition") or {}),
        "starter_key": row.get("starter_key"),
        "is_default": bool(row.get("is_default")),
        "project_count": int(row.get("project_count") or 0),
    }


def _date_value(value):
    if value in (None, ""):
        return None
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value)[:10])


def validate_custom_values(values, template: dict) -> dict:
    source = dict(values or {})
    result = {}
    for field in (template.get("definition") or {}).get("fields", []):
        key = field["key"]
        value = source.get(key)
        if value in (None, ""):
            if field.get("required"):
                raise ValueError(f"Completa {field['label']}")
            continue
        kind = field.get("type")
        if kind == "number":
            try:
                value = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"{field['label']} debe ser un número") from exc
        elif kind == "boolean":
            value = bool(value)
        elif kind == "date":
            value = _date_value(value).isoformat()
        elif kind == "select":
            options = field.get("options") or []
            if str(value) not in options:
                raise ValueError(f"Valor no válido para {field['label']}")
            value = str(value)
        elif kind == "multiselect":
            options = field.get("options") or []
            selected = value if isinstance(value, list) else [value]
            value = [str(item) for item in selected if str(item) in options]
            if not value and field.get("required"):
                raise ValueError(f"Completa {field['label']}")
        else:
            value = str(value).strip()[:2000]
        result[key] = value
    return result


def normalize_detail(data: dict, template: dict, *, existing: dict | None = None, fields_set: set[str] | None = None) -> dict:
    current = existing or {}
    payload = {}
    for field in DETAIL_FIELDS:
        payload[field] = current.get(field) if fields_set is not None and field not in fields_set else data.get(field)
    payload["template_id"] = str(template["id"])
    role = str(payload.get("project_role") or "project").strip().lower()
    if role not in PROJECT_ROLES:
        raise ValueError("Tipo de contenido profesional no válido")
    payload["project_role"] = role
    priority = str(payload.get("priority") or "media").strip().lower()
    if priority not in PRIORITIES:
        raise ValueError("Prioridad no válida")
    payload["priority"] = priority
    stage_items = template["definition"].get("stages", [])
    stages = {item["key"] for item in stage_items}
    stage = str(payload.get("stage") or "").strip() or (stage_items[0]["key"] if stage_items else None)
    if stage and stage not in stages:
        raise ValueError("Fase no válida para esta plantilla")
    payload["stage"] = stage
    work_types = {item["key"] for item in template["definition"].get("work_types", [])}
    selected_work_types = payload.get("work_types")
    if not isinstance(selected_work_types, list):
        selected_work_types = [payload.get("work_type")] if payload.get("work_type") else []
    selected_work_types = list(dict.fromkeys(str(value).strip() for value in selected_work_types if str(value).strip()))
    if any(value not in work_types for value in selected_work_types):
        raise ValueError("Tipo de trabajo no válido")
    payload["work_types"] = selected_work_types
    payload["work_type"] = selected_work_types[0] if selected_work_types else None
    deliverables = {item["key"] for item in template["definition"].get("deliverables", [])}
    deliverable_type = str(payload.get("deliverable_type") or "").strip() or None
    if deliverable_type and deliverable_type not in deliverables:
        raise ValueError("Tipo de entregable no válido")
    payload["deliverable_type"] = deliverable_type if role == "deliverable" else None
    payload["due_date"] = _date_value(payload.get("due_date"))
    for field, limit in (("client_name", 240), ("description", 5000)):
        value = payload.get(field)
        payload[field] = str(value).strip()[:limit] or None if value is not None else None
    parent = payload.get("parent_project_id")
    payload["parent_project_id"] = str(parent) if parent else None
    if fields_set is not None and "custom_values" not in fields_set:
        payload["custom_values"] = dict(current.get("custom_values") or {})
    else:
        payload["custom_values"] = validate_custom_values(payload.get("custom_values"), template)
    return payload


def reconcile_template_details(cur, template: dict) -> None:
    """Conserva las fichas utilizables después de editar o sustituir su plantilla."""
    definition = template.get("definition") or {}
    stages = [item["key"] for item in definition.get("stages", [])]
    work_types = [item["key"] for item in definition.get("work_types", [])]
    deliverables = [item["key"] for item in definition.get("deliverables", [])]
    cur.execute(
        """
        UPDATE project_details
        SET stage = CASE WHEN stage = ANY(%s::text[]) THEN stage ELSE %s END,
            work_type = CASE WHEN work_type = ANY(%s::text[]) THEN work_type ELSE NULL END,
            work_types = ARRAY(
                SELECT value FROM unnest(work_types) AS value WHERE value = ANY(%s::text[])
            ),
            deliverable_type = CASE
                WHEN project_role = 'deliverable' AND deliverable_type = ANY(%s::text[])
                THEN deliverable_type ELSE NULL
            END,
            updated_at = now()
        WHERE template_id = %s
        """,
        (stages, stages[0] if stages else None, work_types, work_types, deliverables, template["id"]),
    )


def fetch_details(cur, item_ids: list[str]) -> dict[str, dict]:
    if not item_ids:
        return {}
    cur.execute(
        """
        SELECT pd.item_id, pd.template_id, pd.parent_project_id, pd.project_role,
               pd.work_type, pd.work_types, pd.deliverable_type, pd.stage, pd.priority, pd.due_date, pd.client_name,
               pd.description, pd.custom_values, pt.name AS professional_template_name,
               pt.terminology AS professional_terminology,
               pt.definition AS professional_definition
        FROM project_details pd
        JOIN professional_templates pt ON pt.id = pd.template_id
        WHERE pd.item_id = ANY(%s::uuid[])
        """,
        (item_ids,),
    )
    return {str(row["item_id"]): dict(row) for row in cur.fetchall()}


def upsert_details(cur, item_id: str, payload: dict) -> None:
    cur.execute(
        """
        INSERT INTO project_details
            (item_id, template_id, parent_project_id, project_role, work_type, work_types, deliverable_type, stage,
             priority, due_date, client_name, description, custom_values)
        VALUES (%s, %s, %s, %s, %s, %s::text[], %s, %s, %s, %s, %s, %s, %s::jsonb)
        ON CONFLICT (item_id) DO UPDATE
        SET template_id = EXCLUDED.template_id,
            parent_project_id = EXCLUDED.parent_project_id,
            project_role = EXCLUDED.project_role,
            work_type = EXCLUDED.work_type,
            work_types = EXCLUDED.work_types,
            deliverable_type = EXCLUDED.deliverable_type,
            stage = EXCLUDED.stage,
            priority = EXCLUDED.priority,
            due_date = EXCLUDED.due_date,
            client_name = EXCLUDED.client_name,
            description = EXCLUDED.description,
            custom_values = EXCLUDED.custom_values,
            updated_at = now()
        """,
        (
            item_id,
            payload["template_id"],
            payload["parent_project_id"],
            payload["project_role"],
            payload["work_type"],
            payload["work_types"],
            payload["deliverable_type"],
            payload["stage"],
            payload["priority"],
            payload["due_date"],
            payload["client_name"],
            payload["description"],
            json.dumps(payload["custom_values"], ensure_ascii=False),
        ),
    )


def public_fields(row: dict) -> dict:
    due = row.get("due_date")
    return {
        "professional_template_id": str(row["template_id"]) if row.get("template_id") else None,
        "professional_template_name": row.get("professional_template_name"),
        "professional_terminology": dict(row.get("professional_terminology") or {}),
        "professional_definition": dict(row.get("professional_definition") or {}),
        "project_parent_id": str(row["parent_project_id"]) if row.get("parent_project_id") else None,
        "project_role": row.get("project_role"),
        "project_work_type": row.get("work_type"),
        "project_work_types": list(row.get("work_types") or ([row["work_type"]] if row.get("work_type") else [])),
        "project_deliverable_type": row.get("deliverable_type"),
        "project_stage": row.get("stage"),
        "project_priority": row.get("priority"),
        "project_due_date": due.isoformat() if hasattr(due, "isoformat") else (str(due) if due else None),
        "project_client_name": row.get("client_name"),
        "project_description": row.get("description"),
        "project_custom_values": dict(row.get("custom_values") or {}),
    }


def infer_role(text: str) -> str:
    low = text.lower()
    if any(word in low for word in ("hito", "milestone")):
        return "milestone"
    if any(word in low for word in ("entregable", "entrega", "informe final", "release")):
        return "deliverable"
    if any(word in low for word in ("nota", "apunte")):
        return "note"
    if re.search(r"\bproyecto\b|\bexpediente\b|\bencargo\b", low) and not re.search(r"\b(avanzar|hacer|revisar|terminar|preparar|enviar)\b", low):
        return "project"
    return "task"


def resolve_parent(cur, user_id: str, text: str, explicit: str | None = None) -> str | None:
    if explicit:
        cur.execute(
            """
            SELECT i.id FROM items i JOIN project_details pd ON pd.item_id = i.id
            WHERE i.id = %s AND i.user_id = %s AND i.module = 'proyectos' AND pd.project_role = 'project'
            """,
            (explicit, user_id),
        )
        row = cur.fetchone()
        return str(row["id"]) if row else None
    cur.execute(
        """
        SELECT i.id, i.title
        FROM items i JOIN project_details pd ON pd.item_id = i.id
        WHERE i.user_id = %s AND i.module = 'proyectos' AND pd.project_role = 'project' AND i.status = 'open'
        ORDER BY i.created_at DESC
        """,
        (user_id,),
    )
    projects = cur.fetchall()
    low = text.lower()
    for row in projects:
        title = str(row["title"]).lower()
        if title in low or any(part in low for part in title.split() if len(part) >= 5):
            return str(row["id"])
    return str(projects[0]["id"]) if len(projects) == 1 else None
