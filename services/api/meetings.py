"""Reuniones: ficha profesional y enlace a un proyecto de la misma cuenta."""

from __future__ import annotations

import re

MEETING_KINDS = frozenset({"cita", "seguimiento"})
GENERIC_PROJECT_WORDS = frozenset({
    "proyecto",
    "proyectos",
    "reunion",
    "reunión",
    "cliente",
    "llamada",
    "seguimiento",
})
WEEKDAYS = (
    "lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo"
)


def meta_from_text(text: str) -> dict:
    raw = text or ""
    low = raw.lower()
    url_match = re.search(r"https?://\S+", raw, re.IGNORECASE)
    url = url_match.group(0).rstrip(".,)") if url_match else None
    client = _after(raw, r"\bcliente\s+")
    participants = _participants(raw)
    return {
        "meeting_kind": "seguimiento" if re.search(r"\bseguimiento\b", low) else "cita",
        "client_name": client,
        "participants": participants,
        "place": _place(raw),
        "url": url,
        "outcome": None,
    }


def named_project_id(cur, user_id: str, text: str) -> str | None:
    cur.execute(
        """
        SELECT i.id, i.title
        FROM items i
        JOIN project_details pd ON pd.item_id = i.id
        WHERE i.user_id = %s
          AND i.module = 'proyectos'
          AND pd.project_role = 'project'
          AND i.status = 'open'
        ORDER BY char_length(i.title) DESC, i.created_at DESC
        """,
        (user_id,),
    )
    low = (text or "").lower()
    for row in cur.fetchall():
        title = str(row["title"]).strip().lower()
        if title and title in low:
            return str(row["id"])
        for part in re.split(r"\s+", title):
            if len(part) >= 6 and part not in GENERIC_PROJECT_WORDS and part in low:
                return str(row["id"])
    return None


def owned_project_id(cur, user_id: str, project_id: str | None) -> str | None:
    if not project_id:
        return None
    cur.execute(
        """
        SELECT i.id
        FROM items i
        JOIN project_details pd ON pd.item_id = i.id
        WHERE i.id = %s
          AND i.user_id = %s
          AND i.module = 'proyectos'
          AND pd.project_role = 'project'
        """,
        (project_id, user_id),
    )
    row = cur.fetchone()
    if not row:
        raise ValueError("Ese proyecto no está en tu cuenta")
    return str(row["id"])


def payload_from_text(cur, user_id: str, text: str, suggestion: dict | None = None) -> dict:
    suggestion = suggestion or {}
    fallback = meta_from_text(text)
    hint = suggestion.get("meeting_project_hint") or ""
    url = suggestion.get("meeting_url") or fallback["url"]
    if url and not re.match(r"^https?://", str(url), re.IGNORECASE):
        url = fallback["url"]
    return normalize_payload(
        {
            "meeting_kind": suggestion.get("meeting_kind") or fallback["meeting_kind"],
            "client_name": suggestion.get("meeting_client") or fallback["client_name"],
            "project_id": named_project_id(cur, user_id, f"{text} {hint}"),
            "participants": suggestion.get("meeting_participants") or fallback["participants"],
            "place": suggestion.get("meeting_place") or fallback["place"],
            "url": url,
            "outcome": None,
        }
    )


def normalize_payload(data: dict) -> dict:
    kind = str(data.get("meeting_kind") or "cita").strip().lower()
    if kind not in MEETING_KINDS:
        raise ValueError("El tipo de reunión tiene que ser cita o seguimiento")
    url = _text(data.get("url"), 1000)
    if url and not re.match(r"^https?://", url, re.IGNORECASE):
        raise ValueError("El enlace tiene que empezar por http:// o https://")
    return {
        "meeting_kind": kind,
        "client_name": _text(data.get("client_name"), 240),
        "project_id": data.get("project_id") or None,
        "participants": _text(data.get("participants"), 1000),
        "place": _text(data.get("place"), 300),
        "url": url,
        "outcome": _text(data.get("outcome"), 5000),
    }


def fetch_details(cur, item_ids: list[str]) -> dict[str, dict]:
    if not item_ids:
        return {}
    cur.execute(
        """
        SELECT md.item_id, md.meeting_kind,
               md.client_name AS meeting_client_name,
               md.project_id AS meeting_project_id,
               md.participants AS meeting_participants,
               md.place AS meeting_place,
               md.url AS meeting_url,
               md.outcome AS meeting_outcome,
               p.title AS meeting_project_title
        FROM meeting_details md
        LEFT JOIN items p ON p.id = md.project_id
        WHERE md.item_id = ANY(%s::uuid[])
        """,
        (item_ids,),
    )
    return {str(row["item_id"]): dict(row) for row in cur.fetchall()}


def upsert_details(cur, item_id: str, payload: dict) -> None:
    cur.execute(
        """
        INSERT INTO meeting_details
            (item_id, meeting_kind, client_name, project_id, participants, place, url, outcome)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (item_id) DO UPDATE
        SET meeting_kind = EXCLUDED.meeting_kind,
            client_name = EXCLUDED.client_name,
            project_id = EXCLUDED.project_id,
            participants = EXCLUDED.participants,
            place = EXCLUDED.place,
            url = EXCLUDED.url,
            outcome = EXCLUDED.outcome,
            updated_at = now()
        """,
        (
            item_id,
            payload["meeting_kind"],
            payload["client_name"],
            payload["project_id"],
            payload["participants"],
            payload["place"],
            payload["url"],
            payload["outcome"],
        ),
    )


def public_fields(row: dict) -> dict:
    project_id = row.get("meeting_project_id")
    return {
        "meeting_kind": row.get("meeting_kind"),
        "meeting_client_name": row.get("meeting_client_name"),
        "meeting_project_id": str(project_id) if project_id else None,
        "meeting_project_title": row.get("meeting_project_title"),
        "meeting_participants": row.get("meeting_participants"),
        "meeting_place": row.get("meeting_place"),
        "meeting_url": row.get("meeting_url"),
        "meeting_outcome": row.get("meeting_outcome"),
    }


def fill_suggestion(result: dict, raw: str) -> dict:
    if result.get("module") != "reuniones":
        return result
    if result.get("title"):
        result["title"] = re.sub(r"https?://\S+", "", str(result["title"])).strip(" ,.-") or result["title"]
    fallback = meta_from_text(raw)
    if result.get("meeting_kind") not in MEETING_KINDS:
        result["meeting_kind"] = fallback["meeting_kind"]
    for key, source in (
        ("meeting_client", "client_name"),
        ("meeting_participants", "participants"),
        ("meeting_place", "place"),
        ("meeting_url", "url"),
    ):
        value = result.get(key)
        result[key] = _text(value, 5000) or fallback[source]
    hint = result.get("meeting_project_hint")
    result["meeting_project_hint"] = _text(hint, 240)
    return result


def _text(value, limit: int) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    if not cleaned:
        return None
    return cleaned[:limit]


def _after(text: str, pattern: str) -> str | None:
    match = re.search(pattern + r"([^,;]+)", text, re.IGNORECASE)
    if not match:
        return None
    return _cut_when(match.group(1))


def _participants(text: str) -> str | None:
    match = re.search(
        r"\b(?:llamada|reuni[oó]n|cita|seguimiento)\s+con\s+([^,.;]+)",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    chunk = _cut_when(match.group(1))
    if chunk and re.match(r"^el cliente\b", chunk, re.IGNORECASE):
        return None
    return chunk


def _place(text: str) -> str | None:
    match = re.search(
        r"\b(?:por videollamada|en la oficina|en zoom|en meet|en teams)\b",
        text,
        re.IGNORECASE,
    )
    if not match:
        return None
    return match.group(0).strip().capitalize()


def _cut_when(value: str) -> str | None:
    chunk = re.split(
        rf"\b(?:a las|(?:el|la)\s+(?:{WEEKDAYS}|pr[oó]xim[oa])|mañana|manana|hoy|pasado)\b",
        value,
        maxsplit=1,
        flags=re.IGNORECASE,
    )[0]
    cleaned = re.sub(r"\s+", " ", chunk).strip(" .,-")
    return cleaned[:1000] or None
