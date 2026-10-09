"""Diario: fichas privadas, filtros y resúmenes periódicos opcionales."""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import llm

MADRID = ZoneInfo("Europe/Madrid")
JOURNAL_KINDS = frozenset({"entrada", "animo", "reflexion", "gratitud"})
DETAIL_FIELDS = (
    "content",
    "journal_kind",
    "occurred_on",
    "mood",
    "energy",
    "guided_happened",
    "guided_grateful",
    "guided_need",
    "tags",
)


def title_from_content(content: str) -> str:
    compact = " ".join(content.strip().split())
    if not compact:
        return "Entrada de diario"
    first = compact.split(". ", 1)[0]
    return first if len(first) <= 90 else f"{first[:87]}…"


def normalize_tags(values) -> list[str]:
    if isinstance(values, str):
        values = values.split(",")
    result = []
    seen = set()
    for value in values or []:
        tag = " ".join(str(value).strip().lower().split())[:40]
        if tag and tag not in seen:
            seen.add(tag)
            result.append(tag)
    return result[:12]


def _date_value(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if value:
        return date.fromisoformat(str(value)[:10])
    return datetime.now(MADRID).date()


def normalize_payload(data: dict, *, existing: dict | None = None, fields_set: set[str] | None = None) -> dict:
    current = existing or {}
    payload = {}
    for field in DETAIL_FIELDS:
        if fields_set is not None and field not in fields_set:
            payload[field] = current.get(field)
        else:
            payload[field] = data.get(field)

    content = str(payload.get("content") or "").strip()
    if not content:
        raise ValueError("Escribe algo antes de guardar")
    payload["content"] = content[:50_000]
    kind = str(payload.get("journal_kind") or "entrada").strip().lower()
    if kind not in JOURNAL_KINDS:
        raise ValueError("Tipo de entrada de Diario no válido")
    payload["journal_kind"] = kind
    payload["occurred_on"] = _date_value(payload.get("occurred_on"))
    for field in ("mood", "energy"):
        value = payload.get(field)
        payload[field] = int(value) if value not in (None, "") else None
        if payload[field] is not None and payload[field] not in range(1, 6):
            raise ValueError(f"{field} tiene que estar entre 1 y 5")
    for field in ("guided_happened", "guided_grateful", "guided_need"):
        value = payload.get(field)
        payload[field] = str(value).strip()[:10_000] or None if value is not None else None
    payload["tags"] = normalize_tags(payload.get("tags"))
    return payload


def fetch_details(cur, item_ids: list[str]) -> dict[str, dict]:
    if not item_ids:
        return {}
    cur.execute(
        """
        SELECT item_id, content, journal_kind, occurred_on, mood, energy,
               guided_happened, guided_grateful, guided_need, tags, updated_at
        FROM journal_entries
        WHERE item_id = ANY(%s::uuid[])
        """,
        (item_ids,),
    )
    return {str(row["item_id"]): dict(row) for row in cur.fetchall()}


def upsert_details(cur, item_id: str, payload: dict) -> None:
    cur.execute(
        """
        INSERT INTO journal_entries
            (item_id, content, journal_kind, occurred_on, mood, energy,
             guided_happened, guided_grateful, guided_need, tags)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (item_id) DO UPDATE
        SET content = EXCLUDED.content,
            journal_kind = EXCLUDED.journal_kind,
            occurred_on = EXCLUDED.occurred_on,
            mood = EXCLUDED.mood,
            energy = EXCLUDED.energy,
            guided_happened = EXCLUDED.guided_happened,
            guided_grateful = EXCLUDED.guided_grateful,
            guided_need = EXCLUDED.guided_need,
            tags = EXCLUDED.tags,
            updated_at = now()
        """,
        (
            item_id,
            payload["content"],
            payload["journal_kind"],
            payload["occurred_on"],
            payload["mood"],
            payload["energy"],
            payload["guided_happened"],
            payload["guided_grateful"],
            payload["guided_need"],
            payload["tags"],
        ),
    )


def public_fields(row: dict) -> dict:
    occurred = row.get("occurred_on")
    return {
        "journal_content": row.get("content"),
        "journal_kind": row.get("journal_kind"),
        "journal_occurred_on": occurred.isoformat() if hasattr(occurred, "isoformat") else (str(occurred) if occurred else None),
        "journal_mood": row.get("mood"),
        "journal_energy": row.get("energy"),
        "journal_happened": row.get("guided_happened"),
        "journal_grateful": row.get("guided_grateful"),
        "journal_need": row.get("guided_need"),
        "journal_tags": list(row.get("tags") or []),
    }


def list_entries(cur, user_id: str, *, month: str | None = None, mood: int | None = None, kind: str | None = None, tag: str | None = None):
    where = ["i.user_id = %s", "i.module = 'diario'"]
    params: list = [user_id]
    if month:
        start = date.fromisoformat(f"{month}-01")
        next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        where.extend(["j.occurred_on >= %s", "j.occurred_on < %s"])
        params.extend([start, next_month])
    if mood is not None:
        where.append("j.mood = %s")
        params.append(mood)
    if kind:
        where.append("j.journal_kind = %s")
        params.append(kind)
    if tag:
        where.append("%s = ANY(j.tags)")
        params.append(tag.strip().lower())
    cur.execute(
        f"""
        SELECT i.id
        FROM items i
        LEFT JOIN journal_entries j ON j.item_id = i.id
        WHERE {" AND ".join(where)}
        ORDER BY COALESCE(j.occurred_on, i.created_at::date) DESC, i.created_at DESC
        LIMIT 1000
        """,
        params,
    )
    return [str(row["id"]) for row in cur.fetchall()]


def _period_entries(cur, user_id: str, start: date, end: date) -> list[dict]:
    cur.execute(
        """
        SELECT j.content, j.journal_kind, j.occurred_on, j.mood, j.energy,
               j.guided_happened, j.guided_grateful, j.guided_need, j.tags, j.updated_at
        FROM journal_entries j
        JOIN items i ON i.id = j.item_id
        WHERE i.user_id = %s AND j.occurred_on BETWEEN %s AND %s
        ORDER BY j.occurred_on, i.created_at
        """,
        (user_id, start, end),
    )
    return [dict(row) for row in cur.fetchall()]


def _public_summary(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "period_type": row["period_type"],
        "period_start": row["period_start"].isoformat(),
        "period_end": row["period_end"].isoformat(),
        "entry_count": row["entry_count"],
        "mood_average": float(row["mood_average"]) if row.get("mood_average") is not None else None,
        "themes": list(row.get("themes") or []),
        "summary_text": row["summary_text"],
        "reflection_questions": list(row.get("reflection_questions") or []),
        "model": row["model"],
        "updated_at": row["updated_at"].isoformat(),
    }


def list_summaries(cur, user_id: str, limit: int = 12) -> list[dict]:
    cur.execute(
        """
        SELECT id, period_type, period_start, period_end, entry_count, mood_average,
               themes, summary_text, reflection_questions, model, updated_at
        FROM journal_summaries
        WHERE user_id = %s
        ORDER BY period_start DESC, period_type
        LIMIT %s
        """,
        (user_id, max(1, min(limit, 50))),
    )
    return [_public_summary(row) for row in cur.fetchall()]


def generate_summary(cur, user_id: str, period_type: str, start: date, end: date) -> dict | None:
    entries = _period_entries(cur, user_id, start, end)
    if len(entries) < 2:
        return None
    source_updated = max(row["updated_at"] for row in entries)
    cur.execute(
        """
        SELECT id, period_type, period_start, period_end, entry_count, mood_average,
               themes, summary_text, reflection_questions, model, source_updated_at, updated_at
        FROM journal_summaries
        WHERE user_id = %s AND period_type = %s AND period_start = %s
        """,
        (user_id, period_type, start),
    )
    existing = cur.fetchone()
    if existing and existing["source_updated_at"] >= source_updated and existing["entry_count"] == len(entries):
        return _public_summary(existing)

    available, _, settings = llm.can_use_llm(cur)
    if not available:
        return _public_summary(existing) if existing else None
    excerpts = []
    for row in entries:
        parts = [f"Fecha: {row['occurred_on'].isoformat()}", f"Texto: {row['content']}"]
        if row.get("mood"):
            parts.append(f"Ánimo declarado: {row['mood']}/5")
        if row.get("energy"):
            parts.append(f"Energía declarada: {row['energy']}/5")
        if row.get("tags"):
            parts.append(f"Etiquetas: {', '.join(row['tags'])}")
        excerpts.append("\n".join(parts))
    user_content = "\n\n---\n\n".join(excerpts)
    if len(user_content) > 30_000:
        user_content = user_content[-30_000:]
    messages = [
        {
            "role": "system",
            "content": (
                "Analizas un diario personal en español con respeto y prudencia. Resume solo lo escrito, "
                "señala temas repetidos y propone preguntas de reflexión. No diagnostiques, no des consejos "
                "médicos y no afirmes emociones que la persona no haya expresado. Responde JSON con "
                "summary (texto), themes (lista de hasta 6 textos) y questions (lista de hasta 3 preguntas)."
            ),
        },
        {"role": "user", "content": user_content},
    ]
    success = False
    error = None
    input_tokens = output_tokens = latency_ms = 0
    parsed = {}
    try:
        content, input_tokens, output_tokens, latency_ms = llm.openrouter_chat(
            model=settings["model"],
            messages=messages,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(content)
        success = bool(str(parsed.get("summary") or "").strip())
        if not success:
            error = "Resumen JSON incompleto"
    except Exception as exc:
        error = str(exc)[:500]
    cost = llm.compute_cost(input_tokens, output_tokens, settings)
    llm.log_usage(
        cur,
        user_id=user_id,
        capture_id=None,
        provider=settings["provider"],
        model=settings["model"],
        purpose="journal_summary",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        latency_ms=latency_ms or None,
        success=success,
        error_message=error,
        fallback_used=False,
    )
    if not success:
        return _public_summary(existing) if existing else None

    moods = [row["mood"] for row in entries if row.get("mood")]
    mood_average = round(sum(moods) / len(moods), 2) if moods else None
    themes = [str(value).strip()[:120] for value in (parsed.get("themes") or []) if str(value).strip()][:6]
    questions = [str(value).strip()[:300] for value in (parsed.get("questions") or []) if str(value).strip()][:3]
    cur.execute(
        """
        INSERT INTO journal_summaries
            (user_id, period_type, period_start, period_end, source_updated_at, entry_count,
             mood_average, themes, summary_text, reflection_questions, model)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
        ON CONFLICT (user_id, period_type, period_start) DO UPDATE
        SET period_end = EXCLUDED.period_end,
            source_updated_at = EXCLUDED.source_updated_at,
            entry_count = EXCLUDED.entry_count,
            mood_average = EXCLUDED.mood_average,
            themes = EXCLUDED.themes,
            summary_text = EXCLUDED.summary_text,
            reflection_questions = EXCLUDED.reflection_questions,
            model = EXCLUDED.model,
            updated_at = now()
        RETURNING id, period_type, period_start, period_end, entry_count, mood_average,
                  themes, summary_text, reflection_questions, model, updated_at
        """,
        (
            user_id,
            period_type,
            start,
            end,
            source_updated,
            len(entries),
            mood_average,
            json.dumps(themes, ensure_ascii=False),
            str(parsed["summary"]).strip()[:5000],
            json.dumps(questions, ensure_ascii=False),
            settings["model"],
        ),
    )
    return _public_summary(cur.fetchone())


def ensure_current_summaries(cur, user_id: str) -> list[dict]:
    today = datetime.now(MADRID).date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    generate_summary(cur, user_id, "week", week_start, today)
    generate_summary(cur, user_id, "month", month_start, today)
    return list_summaries(cur, user_id)
