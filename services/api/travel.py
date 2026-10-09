"""Viajes: viaje contenedor (ítem) + piezas enlazadas."""

from __future__ import annotations

import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

TRAVEL_ROLES = frozenset({"trip", "reserva", "plan", "equipaje", "nota", "experiencia"})
CHECKLIST_ROLES = frozenset({"plan", "equipaje", "experiencia"})

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
