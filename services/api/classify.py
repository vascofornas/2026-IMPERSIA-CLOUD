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

MORNING_PHRASES = (
    "esta mañana",
    "esta manana",
    "pasado mañana",
    "pasado manana",
    "por la mañana",
    "por la manana",
    "de la mañana",
    "de la manana",
)


def classify(text: str) -> dict:
    raw = " ".join(text.strip().split())
    low = raw.lower()
    starts, time_known = _when(low)
    module = _module(low)
    if _is_reminder(low):
        module = "agenda"
    medical = module == "agenda" and _is_medical(low)
    family = module == "agenda" and not medical and _is_family(low)
    leisure = module == "agenda" and not medical and not family and _is_leisure(low)
    reminder = module == "agenda" and not medical and not family and not leisure and _is_reminder(low)
    alert = _alert_minutes_before(low, time_known)
    if medical and alert == 15:
        alert = 30
    repeats = _repeat(low)
    if family:
        fam = _family_meta(raw, low)
        if not repeats and fam.get("family_kind") in {"cumpleanos", "aniversario"}:
            repeats = "yearly"
        if alert is None and fam.get("family_kind") in {"cumpleanos", "aniversario"} and not time_known:
            alert = 1440
        return _classify_result(
            module,
            _family_title(raw, low, fam.get("family_kind")),
            starts,
            time_known,
            repeats,
            alert,
            "familiar",
            medical_fields={},
            family_fields=fam,
            leisure_fields={},
            reminder_fields={},
        )
    if medical:
        meta = _medical_meta(raw, low)
        return _classify_result(
            module,
            _medical_title(raw, low),
            starts,
            time_known,
            repeats,
            alert,
            "medica",
            medical_fields=meta,
            family_fields={},
            leisure_fields={},
            reminder_fields={},
        )
    if leisure:
        plan = _leisure_meta(raw, low)
        return _classify_result(
            module,
            _leisure_title(raw, low, plan.get("leisure_kind")),
            starts,
            time_known,
            repeats,
            alert,
            "ocio",
            medical_fields={},
            family_fields={},
            leisure_fields=plan,
            reminder_fields={},
        )
    if reminder:
        rem = _reminder_meta(raw, low)
        if alert is None and not time_known:
            alert = 10080
        return _classify_result(
            module,
            _reminder_title(raw, low, rem.get("reminder_kind")),
            starts,
            time_known,
            repeats,
            alert,
            "recordatorio",
            medical_fields={},
            family_fields={},
            leisure_fields={},
            reminder_fields=rem,
        )
    return _classify_result(
        module,
        _title(raw),
        starts,
        time_known,
        repeats,
        alert,
        None,
        medical_fields={},
        family_fields={},
        leisure_fields={},
        reminder_fields={},
    )


def _classify_result(
    module: str,
    title: str,
    starts,
    time_known: bool,
    repeats,
    alert,
    agenda_type: str | None,
    medical_fields: dict,
    family_fields: dict,
    leisure_fields: dict,
    reminder_fields: dict,
) -> dict:
    return {
        "axis": MODULES[module],
        "module": module,
        "kind": legacy_kind(module),
        "title": title,
        "starts_at": starts,
        "time_known": time_known,
        "repeats": repeats,
        "alert_minutes_before": alert,
        "agenda_type": agenda_type,
        "medical_for": medical_fields.get("medical_for"),
        "medical_name": medical_fields.get("medical_name"),
        "medical_place": medical_fields.get("medical_place"),
        "medical_notes": medical_fields.get("medical_notes"),
        "family_kind": family_fields.get("family_kind"),
        "family_for": family_fields.get("family_for"),
        "family_name": family_fields.get("family_name"),
        "family_place": family_fields.get("family_place"),
        "family_notes": family_fields.get("family_notes"),
        "leisure_kind": leisure_fields.get("leisure_kind"),
        "leisure_with": leisure_fields.get("leisure_with"),
        "leisure_name": leisure_fields.get("leisure_name"),
        "leisure_place": leisure_fields.get("leisure_place"),
        "leisure_notes": leisure_fields.get("leisure_notes"),
        "reminder_kind": reminder_fields.get("reminder_kind"),
        "reminder_place": reminder_fields.get("reminder_place"),
        "reminder_notes": reminder_fields.get("reminder_notes"),
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
    if re.search(r"\bagenda\b", low):
        return "agenda"
    if any(word in low for word in ("lista de la compra", "comprar", "suministro", "taller", "avería", "averia")):
        return "casa"
    if re.search(r"\bcada\b", low):
        return "habitos"
    if any(word in low for word in ("hábito", "habito", "ejercicio", "meditación", "meditacion", "rutina")):
        return "habitos"
    if _is_leisure(low) and _has_agenda_when(low):
        return "agenda"
    if _is_reminder(low) and _has_agenda_when(low):
        return "agenda"
    if any(word in low for word in ("deseo", "quiero ir")) and not _has_agenda_when(low):
        return "deseos"
    if any(word in low for word in ("película", "pelicula", "restaurante")) and not _has_agenda_when(low):
        return "deseos"
    if any(
        word in low
        for word in (
            "cita",
            "médico",
            "medico",
            "dentista",
            "cumpleaños",
            "cumpleanos",
            "aniversario",
            "boda",
            "bautizo",
            "comunión",
            "comunion",
            "comida familiar",
            "cena familiar",
            "reunión familiar",
            "reunion familiar",
        )
    ):
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
        r"\bde la mañana\b",
        r"\bde la manana\b",
        r"\bcada\b",
        r"\bpor la tarde\b",
        r"\bpor la noche\b",
        r"\bal mediodía\b",
        r"\bal mediodia\b",
        r"\ba las \d{1,2}(?::\d{2})?\b",
        r"\b(?:el |la )?(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?: \d{1,2})?\b",
        r"\bmañana\b",
        r"\bmanana\b",
        r"\bhoy\b",
        r"\bsin (?:aviso|recordatorio|alerta)\b",
        r"\b(?:av[ií]same|recu[eé]rdame|con recordatorio|con aviso)\b",
        r"\b(?:a la hora|en el momento)\b",
        r"\b\d+\s*(?:minutos?|horas?|d[ií]as?)\s*antes\b",
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
    elif _means_tomorrow(low):
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


def _repeat(low: str) -> str | None:
    if re.search(r"\bcada d[ií]a\b", low) or re.search(r"\btodos los d[ií]as\b", low):
        return "daily"
    if re.search(r"\bcada a[nñ]o\b", low) or re.search(r"\btodos los a[nñ]os\b", low):
        return "yearly"
    if re.search(r"\bcada mes\b", low):
        return "monthly"
    if re.search(r"\bcada semana\b", low) or re.search(r"\bcada\b", low):
        return "weekly"
    return None


def _without_morning_phrases(low: str) -> str:
    text = low
    for phrase in MORNING_PHRASES:
        text = text.replace(phrase, " ")
    return text


def _means_tomorrow(low: str) -> bool:
    rest = _without_morning_phrases(low)
    return bool(re.search(r"\bmañana\b", rest) or re.search(r"\bmanana\b", rest))


def _explicit_day(low: str) -> bool:
    rest = _without_morning_phrases(low)
    if _means_tomorrow(rest) or re.search(r"\bhoy\b", rest):
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
    if "de la mañana" in low or "de la manana" in low:
        return 10, 0
    return None


MEDICAL_WORDS = (
    "médico",
    "medico",
    "dentista",
    "hospital",
    "clínica",
    "clinica",
    "pediatra",
    "dermatólogo",
    "dermatologo",
    "traumatólogo",
    "traumatologo",
    "fisioterapeuta",
    "oftalmólogo",
    "oftalmologo",
    "ginecólogo",
    "ginecologo",
    "urólogo",
    "urologo",
    "cardiólogo",
    "cardiologo",
    "psiquiatra",
    "analítica",
    "analitica",
    "radiología",
    "radiologia",
    "revisión médica",
    "revision medica",
    "consulta médica",
    "consulta medica",
    "urgencias",
    "matrona",
    "endocrino",
    "alergólogo",
    "alergologo",
    "otorrino",
    "podólogo",
    "podologo",
)


def _is_medical(low: str) -> bool:
    if any(word in low for word in MEDICAL_WORDS):
        return True
    return bool(re.search(r"\bcita\s+(?:con\s+)?(?:el\s+|la\s+)?(?:dr|dra|doctor|doctora)\b", low))


def _person_for(low: str) -> str:
    if re.search(r"\bmi hijo\b|\bmi hija\b|\bdel hijo\b|\bde mi hijo\b|\bde mi hija\b|\bhijo de\b|\bhija de\b", low):
        return "child"
    if re.search(r"\bmis padres\b|\bmi madre\b|\bmi padre\b|\bmi mamá\b|\bmi mama\b|\bmi papá\b|\bmi papa\b", low):
        return "parent"
    if re.search(r"\b(?:mis|los|las)\s+abuelos\b|\bmi abuela\b|\bmi abuelo\b|\bcon mis abuelos\b", low):
        return "grandparent"
    if re.search(r"\bsobrino\b|\bsobrina\b|\bmi sobrino\b|\bmi sobrina\b", low):
        return "nephew"
    if re.search(r"\bmi amig[oa]\b|\bamig[oa]\s", low):
        return "friend"
    if re.search(r"\bmi hermano\b|\bmi hermana\b|\bhermano de\b|\bhermana de\b", low):
        return "other"
    if re.search(r"\bmi pareja\b|\bmi marido\b|\bmi mujer\b|\bmi esposo\b|\bmi esposa\b", low):
        return "other"
    return "self"


def _person_name(raw: str, low: str) -> str | None:
    match = re.search(r"\bsobrin[oa]\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)\b", raw, flags=re.IGNORECASE)
    if match:
        name = match.group(1).strip()
        return name[0].upper() + name[1:]
    match = re.search(
        r"\b(?:de|del|para|con|llevar a)\s+(?:mi\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)",
        raw,
    )
    if match:
        name = match.group(1).strip()
        if name.lower() not in {"el", "la", "dr", "dra", "mi"} and len(name) > 1:
            return name
    match = re.search(r"\b(?:de|del|para|con|llevar a)\s+(?:mi\s+)?([a-záéíóúñ]+)\b", low)
    if match:
        name = match.group(1).strip()
        skip = {
            "hijo",
            "hija",
            "madre",
            "padre",
            "mamá",
            "mama",
            "papá",
            "papa",
            "abuela",
            "abuelo",
            "abuelos",
            "sobrino",
            "sobrina",
            "médico",
            "medico",
            "dentista",
            "pediatra",
            "mis",
            "los",
            "las",
            "mi",
        }
        if name not in skip:
            return name[0].upper() + name[1:]
    return None


def _medical_place(low: str) -> str | None:
    match = re.search(r"\b(?:en|del|de la)\s+(?:el\s+|la\s+)?([a-z0-9áéíóúñ .-]{4,40})", low)
    if not match:
        return None
    place = " ".join(match.group(1).split()).strip(" .")
    if any(word in place for word in ("martes", "miércoles", "jueves", "viernes", "lunes", "mañana", "manana")):
        return None
    return place[0].upper() + place[1:]


def _medical_meta(raw: str, low: str) -> dict:
    medical_for = _person_for(low)
    if medical_for == "self" and "pediatra" in low:
        medical_for = "child"
    name = _person_name(raw, low)
    if medical_for == "self":
        name = None
    return {
        "medical_for": medical_for,
        "medical_name": name,
        "medical_place": _medical_place(low),
        "medical_notes": None,
    }


FAMILY_KINDS = {
    "cumpleanos": ("cumpleaños", "cumpleanos"),
    "aniversario": ("aniversario",),
    "boda": ("boda", "casamiento"),
    "bautizo": ("bautizo",),
    "comunion": ("comunión", "comunion", "confirmación", "confirmacion"),
    "comida": ("comida familiar", "cena familiar", "reunión familiar", "reunion familiar"),
}


def _is_family(low: str) -> bool:
    for words in FAMILY_KINDS.values():
        if any(word in low for word in words):
            return True
    return bool(re.search(r"\bcelebraci[oó]n familiar\b", low))


def _family_kind(low: str) -> str:
    for kind, words in FAMILY_KINDS.items():
        if any(word in low for word in words):
            return kind
    return "otro"


def _family_meta(raw: str, low: str) -> dict:
    family_for = _person_for(low)
    name = _person_name(raw, low)
    if family_for == "self" and name:
        family_for = "other"
    if family_for == "self":
        name = None
    kind = _family_kind(low)
    if kind == "cumpleanos" and name and family_for == "self":
        family_for = "friend" if re.search(r"\bamig[oa]\b", low) else "other"
    if family_for == "grandparent":
        name = None
    return {
        "family_kind": kind,
        "family_for": family_for,
        "family_name": name,
        "family_place": _medical_place(low),
        "family_notes": None,
    }


def _has_agenda_when(low: str) -> bool:
    return bool(
        _explicit_day(low)
        or re.search(r"\ba las \d", low)
        or "hoy" in low
        or _means_tomorrow(low)
        or re.search(r"\bpasado mañana\b|\bpasado manana\b", low)
    )


LEISURE_KINDS = {
    "cine": ("cine", "película", "pelicula"),
    "restaurante": ("restaurante", "cenar", "cena en", "comer fuera", "tapas"),
    "concierto": ("concierto", "recital"),
    "teatro": ("teatro", "obra de teatro", "musical"),
    "deporte": ("partido", "fútbol", "futbol", "baloncesto", "tenis", "pádel", "padel", "gym", "gimnasio"),
    "excursion": ("excursión", "excursion", "ruta", "senderismo", "museo", "exposición", "exposicion"),
    "quedar": ("quedar con", "tomar algo", "copas", "café", "cafe", "vernos"),
    "otro": ("plan", "ocio", "salir"),
}


def _is_leisure(low: str) -> bool:
    for words in LEISURE_KINDS.values():
        if any(word in low for word in words):
            return True
    return False


def _leisure_kind(low: str) -> str:
    for kind, words in LEISURE_KINDS.items():
        if kind == "otro":
            continue
        if any(word in low for word in words):
            return kind
    return "otro"


def _leisure_with(low: str) -> str:
    if re.search(r"\bsolo\b|\bir solo\b", low):
        return "solo"
    if re.search(r"\bcon mi pareja\b|\bcon pareja\b|\bcon mi novi[oa]\b", low):
        return "partner"
    if re.search(r"\bcon amigos\b|\bcon amigas\b|\bquedar con\b", low):
        return "friends"
    if re.search(r"\ben familia\b|\bcon la familia\b|\bcon familia\b", low):
        return "family"
    if re.search(r"\bquedar con\b|\bcon [A-ZÁÉÍÓÚÑa-z]", low):
        return "friends"
    return "solo"


def _leisure_name(raw: str, low: str) -> str | None:
    match = re.search(r"\bquedar con\s+(?:mis amigos?|mis amigas?)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)", raw)
    if match:
        return match.group(1)
    match = re.search(r"\bquedar con\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)", raw)
    if match:
        name = match.group(1)
        if name.lower() not in {"mis", "los", "las", "mi"}:
            return name
    match = re.search(r"\bquedar con\s+([a-záéíóúñ]+)\b", low)
    if match:
        name = match.group(1)
        if name not in {"mis", "los", "las", "mi", "amigos", "amigas", "pareja"}:
            return name[0].upper() + name[1:]
    return None


def _leisure_meta(raw: str, low: str) -> dict:
    leisure_with = _leisure_with(low)
    name = _leisure_name(raw, low)
    if leisure_with in {"solo", "partner", "family"}:
        name = None
    return {
        "leisure_kind": _leisure_kind(low),
        "leisure_with": leisure_with,
        "leisure_name": name,
        "leisure_place": _medical_place(low),
        "leisure_notes": None,
    }


def _leisure_title(raw: str, low: str, kind: str | None) -> str:
    labels = {
        "cine": "Cine",
        "restaurante": "Restaurante",
        "concierto": "Concierto",
        "teatro": "Teatro",
        "deporte": "Deporte",
        "excursion": "Excursión",
        "quedar": "Quedar",
        "otro": "Plan",
    }
    label = labels.get(kind or "otro", "Plan")
    cleaned = _title(raw)
    for word in LEISURE_KINDS.get(kind or "otro", ()):
        if word in low and word in cleaned.lower():
            return cleaned
    if cleaned.lower().startswith(label.lower()):
        return cleaned
    if kind == "cine" and "cine" not in cleaned.lower():
        return f"Cine · {cleaned}" if cleaned else "Cine"
    return cleaned or label


REMINDER_KINDS = {
    "itv": ("itv", "pasar la itv", "inspección técnica", "inspeccion tecnica", "revisión del coche", "revision del coche"),
    "seguro": ("seguro", "renovar seguro", "renovar el seguro", "vencimiento del seguro", "póliza", "poliza"),
    "impuesto": ("impuesto", "hacienda", "renta", "declaración", "declaracion", "irpf", "tasas"),
    "documento": ("dni", "pasaporte", "carnet", "permiso de conducir", "caduca el", "renovar dni"),
    "hogar": ("recibo", "factura", "suministro", "contrato", "alquiler"),
}


def _is_reminder(low: str) -> bool:
    if re.search(r"\brecordatorio\b", low):
        return True
    for words in REMINDER_KINDS.values():
        if any(word in low for word in words):
            return True
    return False


def _reminder_kind(low: str) -> str:
    for kind, words in REMINDER_KINDS.items():
        if any(word in low for word in words):
            return kind
    return "otro"


def _reminder_meta(raw: str, low: str) -> dict:
    return {
        "reminder_kind": _reminder_kind(low),
        "reminder_place": _medical_place(low),
        "reminder_notes": None,
    }


def _reminder_title(raw: str, low: str, kind: str | None) -> str:
    labels = {
        "itv": "ITV",
        "seguro": "Seguro",
        "impuesto": "Impuestos",
        "documento": "Documento",
        "hogar": "Trámite del hogar",
        "otro": "Recordatorio",
    }
    label = labels.get(kind or "otro", "Recordatorio")
    cleaned = _title(raw)
    if cleaned.lower().startswith(label.lower()):
        return cleaned
    if kind and kind != "otro" and label.lower() not in cleaned.lower():
        return f"{label} · {cleaned}" if cleaned else label
    return cleaned or label


def _family_title(raw: str, low: str, kind: str | None) -> str:
    name = _person_name(raw, low)
    labels = {
        "cumpleanos": "Cumpleaños",
        "aniversario": "Aniversario",
        "boda": "Boda",
        "bautizo": "Bautizo",
        "comunion": "Comunión",
        "comida": "Comida familiar",
        "otro": "Evento familiar",
    }
    label = labels.get(kind or "otro", "Evento familiar")
    if name:
        return f"{label} de {name}"
    cleaned = _title(raw)
    if cleaned.lower().startswith(label.lower()):
        return cleaned
    return cleaned or label


def _medical_title(raw: str, low: str) -> str:
    for word in MEDICAL_WORDS:
        if word in low:
            label = word.replace("ologo", "ólogo").replace("medico", "médico")
            if label == "médico":
                continue
            return label[0].upper() + label[1:]
    cleaned = _title(raw)
    if cleaned.lower().startswith("cita "):
        return cleaned[5:].strip() or cleaned
    return cleaned


def _alert_minutes_before(low: str, time_known: bool) -> int | None:
    if re.search(r"\bsin (?:aviso|recordatorio|alerta)\b", low):
        return None
    match = re.search(r"(\d+)\s*minutos?\s*antes", low)
    if match:
        return int(match.group(1))
    match = re.search(r"(\d+)\s*horas?\s*antes", low)
    if match:
        return int(match.group(1)) * 60
    match = re.search(r"(\d+)\s*d[ií]as?\s*antes", low)
    if match:
        return int(match.group(1)) * 1440
    if re.search(r"\b(?:a la hora|en el momento)\b", low):
        return 0
    if re.search(r"\b(?:av[ií]same|recu[eé]rdame|con recordatorio|con aviso|recordatorio)\b", low):
        return 15
    if time_known:
        return 15
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
