"""Deseos: listas privadas y fichas detalladas."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

WISH_KINDS = frozenset({"lugar", "cosa", "experiencia", "otro"})
WISH_PRIORITIES = frozenset({"baja", "media", "alta"})
DETAIL_FIELDS = (
    "list_id",
    "wish_kind",
    "reason",
    "place",
    "url",
    "estimated_price",
    "currency",
    "priority",
    "notes",
)


def infer_kind(text: str) -> str:
    low = text.lower()
    if any(word in low for word in ("libro", "disco", "cámara", "camara", "reloj", "móvil", "movil", "coche", "comprarme")):
        return "cosa"
    if any(word in low for word in ("restaurante", "concierto", "teatro", "curso", "spa", "excursión", "excursion", "probar", "hacer ")):
        return "experiencia"
    if re.search(r"\b(?:ir|viajar|volver)\s+(?:a|al)\b|\b(?:visitar|conocer)\s+", low):
        return "lugar"
    return "otro"


def meta_from_text(text: str) -> dict:
    low = text.lower()
    reason = None
    match = re.search(r"\bporque\s+(.+)$", text, re.IGNORECASE)
    if match:
        reason = match.group(1).strip(" .")[:2000] or None
    return {
        "wish_kind": infer_kind(text),
        "reason": reason,
        "place": None,
        "url": None,
        "estimated_price": None,
        "currency": None,
        "priority": "alta" if re.search(r"\b(mucha ilusión|prioridad alta)\b", low) else "media",
        "notes": None,
    }


def ensure_default_list(cur, user_id: str) -> dict:
    cur.execute(
        """
        SELECT id, user_id, name, description, sort_order, is_default, created_at, updated_at
        FROM wish_lists
        WHERE user_id = %s AND is_default
        """,
        (user_id,),
    )
    row = cur.fetchone()
    if row:
        return row
    cur.execute(
        """
        INSERT INTO wish_lists (user_id, name, description, is_default)
        VALUES (%s, 'Mis deseos', 'Lista general para todo lo que todavía no tiene otra lista.', true)
        RETURNING id, user_id, name, description, sort_order, is_default, created_at, updated_at
        """,
        (user_id,),
    )
    return cur.fetchone()


def fetch_list(cur, user_id: str, list_id: str) -> dict | None:
    cur.execute(
        """
        SELECT id, user_id, name, description, sort_order, is_default, created_at, updated_at
        FROM wish_lists
        WHERE id = %s AND user_id = %s
        """,
        (list_id, user_id),
    )
    return cur.fetchone()


def list_private_lists(cur, user_id: str) -> list[dict]:
    ensure_default_list(cur, user_id)
    cur.execute(
        """
        SELECT wl.id, wl.name, wl.description, wl.sort_order, wl.is_default,
               wl.created_at, wl.updated_at,
               count(wd.item_id) FILTER (WHERE i.status = 'open') AS open_count,
               count(wd.item_id) FILTER (WHERE i.status = 'done') AS done_count
        FROM wish_lists wl
        LEFT JOIN wish_details wd ON wd.list_id = wl.id
        LEFT JOIN items i ON i.id = wd.item_id AND i.user_id = wl.user_id AND i.module = 'deseos'
        WHERE wl.user_id = %s
        GROUP BY wl.id
        ORDER BY wl.is_default DESC, wl.sort_order, lower(wl.name)
        """,
        (user_id,),
    )
    return [public_list(row) for row in cur.fetchall()]


def public_list(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "description": row.get("description"),
        "sort_order": row.get("sort_order") or 0,
        "is_default": bool(row.get("is_default")),
        "open_count": int(row.get("open_count") or 0),
        "done_count": int(row.get("done_count") or 0),
    }


def normalize_payload(data: dict, *, existing: dict | None = None, fields_set: set[str] | None = None) -> dict:
    current = existing or {}
    payload = {}
    for field in DETAIL_FIELDS:
        payload[field] = current.get(field) if fields_set is not None and field not in fields_set else data.get(field)

    kind = str(payload.get("wish_kind") or "otro").strip().lower()
    if kind not in WISH_KINDS:
        raise ValueError("Tipo de deseo no válido")
    payload["wish_kind"] = kind

    priority = str(payload.get("priority") or "media").strip().lower()
    if priority not in WISH_PRIORITIES:
        raise ValueError("Prioridad de deseo no válida")
    payload["priority"] = priority

    for field, limit in (("reason", 2000), ("place", 300), ("url", 1000), ("notes", 5000)):
        value = payload.get(field)
        payload[field] = str(value).strip()[:limit] or None if value is not None else None

    value = payload.get("estimated_price")
    if value in (None, ""):
        payload["estimated_price"] = None
    else:
        try:
            payload["estimated_price"] = Decimal(str(value))
        except (InvalidOperation, ValueError) as exc:
            raise ValueError("Precio estimado no válido") from exc
        if payload["estimated_price"] < 0:
            raise ValueError("El precio estimado no puede ser negativo")

    currency = payload.get("currency")
    payload["currency"] = str(currency).strip().upper()[:3] if currency else None
    if payload["currency"] and len(payload["currency"]) != 3:
        raise ValueError("La moneda debe tener tres letras")
    return payload


def fetch_details(cur, item_ids: list[str]) -> dict[str, dict]:
    if not item_ids:
        return {}
    cur.execute(
        """
        SELECT wd.item_id, wd.list_id, wd.wish_kind, wd.reason, wd.place, wd.url,
               wd.estimated_price, wd.currency, wd.priority, wd.notes,
               wl.name AS wish_list_name
        FROM wish_details wd
        JOIN wish_lists wl ON wl.id = wd.list_id
        WHERE wd.item_id = ANY(%s::uuid[])
        """,
        (item_ids,),
    )
    return {str(row["item_id"]): dict(row) for row in cur.fetchall()}


def upsert_details(cur, item_id: str, payload: dict) -> None:
    cur.execute(
        """
        INSERT INTO wish_details
            (item_id, list_id, wish_kind, reason, place, url, estimated_price, currency, priority, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (item_id) DO UPDATE
        SET list_id = EXCLUDED.list_id,
            wish_kind = EXCLUDED.wish_kind,
            reason = EXCLUDED.reason,
            place = EXCLUDED.place,
            url = EXCLUDED.url,
            estimated_price = EXCLUDED.estimated_price,
            currency = EXCLUDED.currency,
            priority = EXCLUDED.priority,
            notes = EXCLUDED.notes,
            updated_at = now()
        """,
        (
            item_id,
            payload["list_id"],
            payload["wish_kind"],
            payload["reason"],
            payload["place"],
            payload["url"],
            payload["estimated_price"],
            payload["currency"],
            payload["priority"],
            payload["notes"],
        ),
    )


def public_fields(row: dict) -> dict:
    price = row.get("estimated_price")
    return {
        "wish_list_id": str(row["list_id"]) if row.get("list_id") else None,
        "wish_list_name": row.get("wish_list_name"),
        "wish_kind": row.get("wish_kind"),
        "wish_reason": row.get("reason"),
        "wish_place": row.get("place"),
        "wish_url": row.get("url"),
        "wish_estimated_price": str(price) if price is not None else None,
        "wish_currency": row.get("currency"),
        "wish_priority": row.get("priority"),
        "wish_notes": row.get("notes"),
    }
