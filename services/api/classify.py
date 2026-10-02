import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

TASK_WORDS = (
    "llamar",
    "comprar",
    "enviar",
    "pagar",
    "hacer",
    "recordar",
    "revisar",
    "escribir",
    "tengo que",
    "hay que",
)
EVENT_WORDS = (
    "cita",
    "reunión",
    "reunion",
    "médico",
    "medico",
    "dentista",
    "cumpleaños",
    "cumpleanos",
    "vuelo",
)
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


def classify(text: str) -> dict:
    raw = " ".join(text.strip().split())
    low = raw.lower()
    starts = _when(low)
    timed = bool(re.search(r"\ba las \d", low))
    task = _is_task(low)
    planned = _daypart(low) is not None and _explicit_day(low) and not task
    if any(word in low for word in EVENT_WORDS) or timed or planned:
        kind = "event"
    elif task:
        kind = "task"
    else:
        kind = "note"
    return {
        "kind": kind,
        "title": raw[:140],
        "starts_at": starts,
        "source": "rules",
    }


def _when(low: str) -> datetime | None:
    now = datetime.now(MADRID)
    day = None
    if "esta mañana" in low or "esta manana" in low:
        day = now.date()
    elif "pasado mañana" in low or "pasado manana" in low:
        day = (now + timedelta(days=2)).date()
    elif "mañana" in low or "manana" in low:
        day = (now + timedelta(days=1)).date()
    elif "hoy" in low:
        day = now.date()
    else:
        for name, index in WEEKDAYS.items():
            if re.search(rf"\b{name}\b", low):
                ahead = (index - now.weekday()) % 7
                if ahead == 0:
                    ahead = 7
                day = (now + timedelta(days=ahead)).date()
                break
    hour, minute = _clock(low)
    if hour is None:
        part = _daypart(low)
        if part is not None:
            hour, minute = part
    if day is None and hour is None:
        return None
    if day is None:
        day = now.date()
    if hour is None:
        hour, minute = 9, 0
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=MADRID)


def _is_task(low: str) -> bool:
    words = [word for word in TASK_WORDS if word != "hacer"]
    if any(word in low for word in words):
        return True
    return bool(re.search(r"\bhacer\b", low)) and not re.search(r"\bqu[eé] hacer\b", low)


def _explicit_day(low: str) -> bool:
    rest = low.replace("esta mañana", " ").replace("esta manana", " ")
    if any(piece in rest for piece in ("pasado mañana", "pasado manana", "mañana", "manana", "hoy")):
        return True
    return any(re.search(rf"\b{name}\b", rest) for name in WEEKDAYS)


def _daypart(low: str) -> tuple[int, int] | None:
    if "por la tarde" in low:
        return 18, 0
    if "por la noche" in low:
        return 21, 0
    if "al mediodía" in low or "al mediodia" in low:
        return 14, 0
    if "por la mañana" in low or "por la manana" in low:
        return 10, 0
    return None


def _clock(low: str) -> tuple[int, int] | tuple[None, None]:
    match = re.search(r"\ba las (\d{1,2})(?::(\d{2}))?", low)
    if not match:
        return None, None
    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    if hour > 23 or minute > 59:
        return None, None
    return hour, minute
