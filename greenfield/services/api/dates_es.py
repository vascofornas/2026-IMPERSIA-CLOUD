"""Cuándo debe salir algo en Hoy (solo fecha, sin UI de calendario)."""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Madrid")

WEEKDAYS = {
    "lunes": 0,
    "martes": 1,
    "miércoles": 2,
    "miercoles": 2,
    "jueves": 3,
    "viernes": 4,
    "sábado": 5,
    "sabado": 5,
    "domingo": 6,
}

DAY_NAMES = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
MONTH_NAMES = (
    "",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)


def _fecha_es(d: date) -> str:
    return f"{DAY_NAMES[d.weekday()]} {d.day} de {MONTH_NAMES[d.month]}"


def _next_weekday(from_date: date, weekday: int) -> date:
    days = (weekday - from_date.weekday()) % 7
    if days == 0:
        days = 7
    return from_date + timedelta(days=days)


def _future_date(d: date, today: date) -> date:
    while d < today:
        try:
            d = d.replace(year=d.year + 1)
        except ValueError:
            d = d + timedelta(days=1)
    return d


def hoy_on_dates(text: str, now: datetime | None = None) -> list[date]:
    now = now or datetime.now(TZ)
    today = now.date()
    low = (text or "").lower()
    found: set[date] = set()

    if re.search(r"\bhoy\b", low):
        found.add(today)

    if re.search(r"\bpasado mañana\b|\bpasado manana\b", low):
        found.add(today + timedelta(days=2))

    if re.search(r"\bmañana\b|\bmanana\b", low):
        found.add(today + timedelta(days=1))

    if re.search(r"\b(más tarde|mas tarde|esta tarde|por la tarde)\b", low):
        found.add(today)

    seen_weekday: set[int] = set()
    for name, wd in WEEKDAYS.items():
        if wd in seen_weekday:
            continue
        if re.search(rf"\b{name}\b", low):
            seen_weekday.add(wd)
            found.add(_next_weekday(today, wd))

    if 4 not in seen_weekday and re.search(r"\bviernos\b", low):
        seen_weekday.add(4)
        found.add(_next_weekday(today, 4))

    for m in re.finditer(r"\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b", low):
        day, month = int(m.group(1)), int(m.group(2))
        year = int(m.group(3)) if m.group(3) else today.year
        if year < 100:
            year += 2000
        try:
            d = date(year, month, day)
            if not m.group(3):
                d = _future_date(d, today)
            found.add(d)
        except ValueError:
            continue

    return sorted(found)


def hoy_on_date(text: str, now: datetime | None = None) -> date | None:
    dates = hoy_on_dates(text, now=now)
    return dates[0] if dates else None


def hoy_on_datetime(text: str, now: datetime | None = None) -> datetime | None:
    d = hoy_on_date(text, now=now)
    if d is None:
        return None
    return datetime.combine(d, datetime.min.time(), tzinfo=TZ)


def _dates_from_note(return_days: list[date] | None, returns_at: datetime | None) -> list[date]:
    if return_days:
        return sorted(return_days)
    if returns_at is not None:
        return [returns_at.astimezone(TZ).date()]
    return []


def when_label(
    returns_at: datetime | None,
    now: datetime | None = None,
    return_days: list[date] | None = None,
) -> str:
    now = now or datetime.now(TZ)
    today = now.date()
    dates = _dates_from_note(return_days, returns_at)
    if not dates:
        return "Sin día fijo"

    upcoming = [d for d in dates if d >= today]
    if not upcoming:
        d = dates[-1]
        return f"Pasó en Hoy el {_fecha_es(d)}"

    if len(upcoming) == 1:
        d = upcoming[0]
        if d == today:
            return "En Hoy"
        return f"En Hoy el {_fecha_es(d)}"

    labels = [_fecha_es(d) for d in upcoming]
    return "En Hoy el " + " y el ".join(labels)


def feedback_after_save(
    return_days: list[date] | None,
    returns_at: datetime | None = None,
    now: datetime | None = None,
) -> str:
    dates = _dates_from_note(return_days, returns_at)
    if not dates:
        return "Recibido. Quedó en Sin día. Si pones «hoy» o una fecha, saldrá en Hoy."

    now = now or datetime.now(TZ)
    today = now.date()
    label = when_label(returns_at, now=now, return_days=dates)

    if len(dates) == 1:
        d = dates[0]
        if d == today:
            return "Recibido. Ya lo tienes en Hoy."
        if d == today + timedelta(days=1):
            return "Recibido. Mañana saldrá en Hoy."
        return f"Recibido. Saldrá en Hoy el {_fecha_es(d)}."

    return f"Recibido. Saldrá {label}."
