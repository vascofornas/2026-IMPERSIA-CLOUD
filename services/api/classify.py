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
MODULES = {
    "agenda": "personal",
    "casa": "personal",
    "habitos": "personal",
    "viajes": "personal",
    "diario": "personal",
    "deseos": "personal",
    "proyectos": "professional",
    "reuniones": "professional",
    "memoria": "professional",
    "ideas": "professional",
    "muro": "social",
    "listas": "social",
    "circulos": "social",
    "espacios": "social",
}

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
    starts, time_known = _when(low)
    module = _module(low)
    return {
        "axis": MODULES[module],
        "module": module,
        "kind": legacy_kind(module),
        "title": _title(raw),
        "starts_at": starts,
        "time_known": time_known,
        "source": "rules",
    }


def legacy_kind(module: str) -> str:
    if module in {"agenda", "reuniones", "viajes"}:
        return "event"
    if module in {"proyectos", "casa", "habitos"}:
        return "task"
    return "note"


def _module(low: str) -> str:
    if any(word in low for word in ("en abierto", "en el muro", "publicar")):
        return "muro"
    if any(word in low for word in ("círculo", "circulo")):
        return "circulos"
    if any(word in low for word in ("con mi pareja", "juntos", "compartido con")):
        return "espacios"
    if any(word in low for word in ("lista pública", "lista publica")):
        return "listas"
    if any(word in low for word in ("reunión", "reunion", "acta", "cliente", "socio")):
        return "reuniones"
    if any(word in low for word in ("idea de", "emprend", "modelo de negocio")):
        return "ideas"
    if any(word in low for word in ("resumen", "artículo", "articulo", "documentación", "documentacion", "apuntes")):
        return "memoria"
    if any(word in low for word in ("proyecto", "hito", "entregable")):
        return "proyectos"
    if any(word in low for word in ("vuelo", "hotel", "viaje", "maleta", "itinerario")):
        return "viajes"
    if any(word in low for word in ("lista de la compra", "comprar", "suministro", "taller", "avería", "averia")):
        return "casa"
    if any(word in low for word in ("hábito", "habito", "ejercicio", "meditación", "meditacion", "rutina")):
        return "habitos"
    if any(word in low for word in ("deseo", "quiero ir", "película", "pelicula", "restaurante")):
        return "deseos"
    if any(word in low for word in ("cita", "médico", "medico", "dentista", "cumpleaños", "cumpleanos")):
        return "agenda"
    if any(word in low for word in ("he dormido", "me siento", "diario", "ánimo", "animo")):
        return "diario"
    if re.search(r"\ba las \d", low) or _explicit_day(low):
        return "agenda"
    if _is_task(low):
        return "proyectos"
    return "diario"


def _title(raw: str) -> str:
    text = raw
    cuts = (
        r"\bpasado mañana\b",
        r"\bpasado manana\b",
        r"\besta mañana\b",
        r"\besta manana\b",
        r"\bpor la mañana\b",
        r"\bpor la manana\b",
        r"\bpor la tarde\b",
        r"\bpor la noche\b",
        r"\bal mediodía\b",
        r"\bal mediodia\b",
        r"\ba las \d{1,2}(?::\d{2})?\b",
        r"\b(?:el |la )?(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?: \d{1,2})?\b",
        r"\bmañana\b",
        r"\bmanana\b",
        r"\bhoy\b",
    )
    for pattern in cuts:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    text = " ".join(text.replace(",", " ").split()).strip(" .;:-")
    if not text:
        text = raw
    return (text[0].upper() + text[1:])[:140]


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
        named = _weekday_number(low, now)
        if named is not None:
            day = named
        else:
            for name, index in WEEKDAYS.items():
                if re.search(rf"\b{name}\b", low):
                    ahead = (index - now.weekday()) % 7
                    if ahead == 0:
                        ahead = 7
                    day = (now + timedelta(days=ahead)).date()
                    break
    hour, minute = _clock(low)
    time_known = hour is not None
    if not time_known:
        part = _daypart(low)
        if part is not None:
            hour, minute = part
            time_known = True
    if day is None and not time_known:
        return None, False
    if day is None:
        day = now.date()
    if hour is None:
        hour, minute = 0, 0
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=MADRID), time_known


def _weekday_number(low: str, now: datetime):
    match = re.search(
        r"\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\b",
        low,
    )
    if not match:
        return None
    number = int(match.group(2))
    if number < 1 or number > 31:
        return None
    weekday = WEEKDAYS[match.group(1)]
    year, month = now.year, now.month
    for _ in range(18):
        try:
            candidate = datetime(year, month, number, tzinfo=MADRID).date()
        except ValueError:
            candidate = None
        if candidate and candidate.weekday() == weekday and candidate >= now.date():
            return candidate
        month += 1
        if month == 13:
            month = 1
            year += 1
    return None


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
