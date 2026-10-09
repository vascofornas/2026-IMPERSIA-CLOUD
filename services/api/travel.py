"""Viajes: viaje contenedor (ítem) + piezas enlazadas."""

from __future__ import annotations

import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

TRAVEL_ROLES = frozenset({"trip", "reserva", "plan", "equipaje", "nota", "experiencia"})
CHECKLIST_ROLES = frozenset({"plan", "equipaje", "experiencia"})
BOOKING_STATUSES = frozenset({"idea", "pending", "confirmed", "cancelled"})
PAYMENT_STATUSES = frozenset({"pending", "partial", "paid", "refunded"})

TRAVEL_DETAIL_FIELDS = (
    "travel_subtype",
    "travel_starts_at",
    "travel_ends_at",
    "travel_provider",
    "travel_reference",
    "travel_address",
    "travel_contact_name",
    "travel_contact_phone",
    "travel_contact_email",
    "travel_booking_status",
    "travel_amount",
    "travel_currency",
    "travel_payment_status",
    "travel_quantity",
    "travel_url",
    "travel_notes",
    "travel_budget",
)

DETAIL_DATE_FIELDS = frozenset({"travel_starts_at", "travel_ends_at"})
DETAIL_NUMBER_FIELDS = frozenset({"travel_amount", "travel_quantity", "travel_budget"})

ROLE_LABELS = {
    "trip": "Viaje",
    "reserva": "Reserva",
    "plan": "Por hacer",
    "equipaje": "Equipaje",
    "nota": "Nota",
    "experiencia": "Experiencia",
}


def travel_meta(raw: str, low: str) -> dict:
    if looks_like_new_trip(low):
        place = extract_travel_place(raw, low)
        end = parse_travel_end(low)
        title = trip_title(raw, place)
        return {
            "travel_role": "trip",
            "travel_place": place,
            "travel_end": end,
            "travel_trip_id": None,
            "title_override": title,
        }
    role = infer_piece_role(low)
    place = extract_travel_place(raw, low)
    return {
        "travel_role": role,
        "travel_place": place,
        "travel_end": None,
        "travel_trip_id": None,
    }


def looks_like_new_trip(low: str) -> bool:
    if re.search(r"\bviaje\b", low):
        return True
    if re.search(r"\b(del|de)\s+\d{1,2}\b.*\b(al|a)\s+\d{1,2}\b", low):
        return True
    if re.search(r"\b\d{1,2}\s*[-–]\s*\d{1,2}\s+de\s+", low):
        return True
    return False


def infer_piece_role(low: str) -> str:
    if any(w in low for w in ("vuelo", "hotel", "airbnb", "tren", "ferry", "coche de alquiler", "reserva de")):
        return "reserva"
    if any(w in low for w in ("maleta", "equipaje", "meter en la maleta", "mochila")):
        return "equipaje"
    if any(
        w in low
        for w in (
            "museo",
            "visitar",
            "excurs",
            "experiencia",
            "tour",
            "degustación",
            "degustacion",
            "spa ",
            "show ",
            "concierto en",
        )
    ):
        return "experiencia"
    if any(w in low for w in ("reservar", "sacar", "contratar", "comprar billete", "recordar")):
        return "plan"
    return "nota"


def extract_travel_place(raw: str, low: str) -> str | None:
    m = re.search(r"\bviaje\s+a\s+([a-záéíóúñü\s-]{2,40})", low)
    if m:
        return m.group(1).strip().title()[:80]
    m = re.search(r"\b(?:en|a)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñü]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñü]+)?)\b", raw)
    if m:
        name = m.group(1).strip()
        if name.lower() not in {"el", "la", "los", "las", "octubre", "noviembre", "enero"}:
            return name[:80]
    return None


def parse_travel_end(low: str) -> date | None:
    m = re.search(r"\b(?:al|a)\s+(\d{1,2})\s+de\s+([a-záéíóúñ]+)", low)
    if m:
        return _date_from_day_month(int(m.group(1)), m.group(2))
    m = re.search(r"\b(\d{1,2})\s*[-–]\s*(\d{1,2})\s+de\s+([a-záéíóúñ]+)", low)
    if m:
        return _date_from_day_month(int(m.group(2)), m.group(3))
    return None


def _date_from_day_month(day: int, month_name: str) -> date | None:
    from classify import MONTHS

    key = month_name.lower().strip()
    month = MONTHS.get(key)
    if not month:
        for name, num in MONTHS.items():
            if key.startswith(name[:4]):
                month = num
                break
    if not month:
        return None
    year = datetime.now(MADRID).year
    try:
        return date(year, month, day)
    except ValueError:
        return None


def trip_title(raw: str, place: str | None) -> str:
    if place:
        return f"Viaje a {place}"
    t = raw.strip()
    if len(t) <= 80:
        return t[0].upper() + t[1:] if t else "Viaje"
    return t[:77] + "…"


def resolve_trip_id(cur, user_id: str, suggestion: dict) -> str | None:
    if suggestion.get("travel_role") == "trip":
        return None
    explicit = suggestion.get("travel_trip_id")
    if explicit:
        return str(explicit)
    place = (suggestion.get("travel_place") or "").lower()
    trips = list_open_trips(cur, user_id)
    if not trips:
        return None
    if place:
        for row in trips:
            tp = (row.get("travel_place") or row.get("title") or "").lower()
            if place in tp or tp in place:
                return str(row["id"])
    if len(trips) == 1:
        return str(trips[0]["id"])
    return None


def list_open_trips(cur, user_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT id, title, travel_place, starts_at, travel_end, status
        FROM items
        WHERE user_id = %s AND module = 'viajes' AND travel_role = 'trip' AND status = 'open'
        ORDER BY starts_at NULLS LAST, created_at DESC
        """,
        (user_id,),
    )
    return [dict(r) for r in cur.fetchall()]


def public_travel_fields(row: dict) -> dict:
    end = row.get("travel_end")
    return {
        "travel_role": row.get("travel_role"),
        "travel_trip_id": str(row["travel_trip_id"]) if row.get("travel_trip_id") else None,
        "travel_place": row.get("travel_place"),
        "travel_end": end.isoformat() if hasattr(end, "isoformat") else (str(end) if end else None),
    }


def _parse_detail_datetime(value):
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(str(value).strip())
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=MADRID)


def normalize_detail_payload(data: dict, *, existing: dict | None = None, fields_set: set[str] | None = None) -> dict:
    current = existing or {}
    payload = {}
    for field in TRAVEL_DETAIL_FIELDS:
        if fields_set is not None and field not in fields_set:
            payload[field] = current.get(field)
            continue
        value = data.get(field)
        if field in DETAIL_DATE_FIELDS:
            value = _parse_detail_datetime(value)
        elif field not in DETAIL_NUMBER_FIELDS and isinstance(value, str):
            value = value.strip() or None
        payload[field] = value

    currency = payload.get("travel_currency")
    payload["travel_currency"] = str(currency).upper()[:3] if currency else None
    booking = payload.get("travel_booking_status")
    if booking and booking not in BOOKING_STATUSES:
        raise ValueError("Estado de reserva no válido")
    payment = payload.get("travel_payment_status")
    if payment and payment not in PAYMENT_STATUSES:
        raise ValueError("Estado de pago no válido")
    return payload


def fetch_details(cur, item_ids: list[str]) -> dict[str, dict]:
    if not item_ids:
        return {}
    cur.execute(
        f"""
        SELECT item_id, {", ".join(TRAVEL_DETAIL_FIELDS)}
        FROM travel_item_details
        WHERE item_id = ANY(%s::uuid[])
        """,
        (item_ids,),
    )
    return {str(row["item_id"]): dict(row) for row in cur.fetchall()}


def upsert_details(cur, item_id: str, payload: dict) -> None:
    fields = ", ".join(TRAVEL_DETAIL_FIELDS)
    placeholders = ", ".join(["%s"] * len(TRAVEL_DETAIL_FIELDS))
    updates = ", ".join(f"{field} = EXCLUDED.{field}" for field in TRAVEL_DETAIL_FIELDS)
    cur.execute(
        f"""
        INSERT INTO travel_item_details (item_id, {fields})
        VALUES (%s, {placeholders})
        ON CONFLICT (item_id) DO UPDATE
        SET {updates}, updated_at = now()
        """,
        (item_id, *(payload.get(field) for field in TRAVEL_DETAIL_FIELDS)),
    )


def public_detail_fields(row: dict) -> dict:
    result = {}
    for field in TRAVEL_DETAIL_FIELDS:
        value = row.get(field)
        if field in DETAIL_DATE_FIELDS and value is not None:
            value = value.isoformat() if hasattr(value, "isoformat") else str(value)
        elif field in {"travel_amount", "travel_budget"} and value is not None:
            value = str(value)
        result[field] = value
    return result
