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

# Índices como Date.getDay() en JS (0=domingo, 1=lunes…)
WEEKDAY_JS = {
    "lunes": 1,
    "martes": 2,
    "miércoles": 3,
    "miercoles": 3,
    "jueves": 4,
    "viernes": 5,
    "sábado": 6,
    "sabado": 6,
    "domingo": 0,
}

WEEKDAY_NAME = (
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
)

_DAY_TOKEN = r"(?:lunes|martes|mi[eé]rcoles|miercoles|jueves|viernes|s[aá]bado|sabado|domingo)"

MONTHS = {
    "enero": 1,
    "febrero": 2,
    "marzo": 3,
    "abril": 4,
    "mayo": 5,
    "junio": 6,
    "julio": 7,
    "agosto": 8,
    "septiembre": 9,
    "setiembre": 9,
    "octubre": 10,
    "noviembre": 11,
    "diciembre": 12,
}

MONTH_NAMES = "|".join(MONTHS.keys())
LITERAL_DATE = rf"(?:\bel\s+|\bantes del\s+|\bhasta el\s+|\bpara el\s+|\bvence el\s+)?(\d{{1,2}})\s+de\s+({MONTH_NAMES})\b"

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
    if _is_casa_supply(low):
        module = "casa"
    elif _is_reminder(low):
        module = "agenda"
    medical = module == "agenda" and _is_medical(low)
    family = module == "agenda" and not medical and _is_family(low)
    leisure = module == "agenda" and not medical and not family and _is_leisure(low)
    reminder = module == "agenda" and not medical and not family and not leisure and _is_reminder(low)
    casa = (
        not medical
        and not family
        and not leisure
        and not reminder
        and (module == "casa" or _is_casa(low))
        and module not in {"reuniones", "proyectos", "viajes", "ideas", "memoria"}
    )
    if casa:
        module = "casa"
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
            entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            "familiar",
            medical_fields={},
            family_fields=fam,
            leisure_fields={},
            reminder_fields={},
            casa_fields={},
        )
    if medical:
        meta = _medical_meta(raw, low)
        return _classify_result(
            module,
            entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            "medica",
            medical_fields=meta,
            family_fields={},
            leisure_fields={},
            reminder_fields={},
            casa_fields={},
        )
    if leisure:
        plan = _leisure_meta(raw, low)
        return _classify_result(
            module,
            entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            "ocio",
            medical_fields={},
            family_fields={},
            leisure_fields=plan,
            reminder_fields={},
            casa_fields={},
        )
    if reminder:
        rem = _reminder_meta(raw, low)
        if alert is None and not time_known:
            alert = 10080
        return _classify_result(
            module,
            entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            "recordatorio",
            medical_fields={},
            family_fields={},
            leisure_fields={},
            reminder_fields=rem,
            casa_fields={},
        )
    if module == "agenda" and not medical and not family and not leisure and _is_personal_agenda_reminder(low):
        rem = _reminder_meta(raw, low)
        if alert is None:
            alert = 15 if time_known else 1440
        return _classify_result(
            module,
            entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            "recordatorio",
            medical_fields={},
            family_fields={},
            leisure_fields={},
            reminder_fields=rem,
            casa_fields={},
        )
    if casa:
        home = _casa_meta(raw, low)
        if home.get("casa_kind") == "suministro" and alert is None:
            alert = 10080
        inv_title = home.pop("inventario_title", None)
        return _classify_result(
            module,
            inv_title or entry_title(raw),
            starts,
            time_known,
            repeats,
            alert,
            None,
            medical_fields={},
            family_fields={},
            leisure_fields={},
            reminder_fields={},
            casa_fields=home,
        )
    habit_fields = habit_meta(raw, low) if module == "habitos" else {}
    if module == "habitos" and habit_fields.get("habit_role") == "log":
        repeats = None
    elif module == "habitos" and not repeats and _looks_like_habit_goal(low):
        repeats = "daily"
    travel_fields = {}
    title = entry_title(raw)
    if module == "viajes":
        from travel import travel_meta

        travel_fields = travel_meta(raw, low)
        if travel_fields.get("title_override"):
            title = travel_fields["title_override"]
    return _classify_result(
        module,
        title,
        starts,
        time_known,
        repeats,
        alert,
        None,
        medical_fields={},
        family_fields={},
        leisure_fields={},
        reminder_fields={},
        casa_fields={},
        habit_fields=habit_fields,
        travel_fields=travel_fields,
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
    casa_fields: dict,
    habit_fields: dict | None = None,
    health_control: dict | None = None,
    travel_fields: dict | None = None,
) -> dict:
    habit = habit_fields or {}
    travel = travel_fields or {}
    out = {
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
        "casa_kind": casa_fields.get("casa_kind"),
        "casa_place": casa_fields.get("casa_place"),
        "casa_notes": casa_fields.get("casa_notes"),
        "supply_kind": casa_fields.get("supply_kind"),
        "habit_role": habit.get("habit_role"),
        "habit_kind": habit.get("habit_kind"),
        "habit_notes": habit.get("habit_notes"),
        "travel_role": travel.get("travel_role"),
        "travel_place": travel.get("travel_place"),
        "travel_end": travel.get("travel_end"),
        "travel_trip_id": travel.get("travel_trip_id"),
        "source": "rules",
    }
    if health_control:
        out["health_control"] = health_control
    return out


def legacy_kind(module: str) -> str:
    if module in {"agenda", "reuniones", "viajes"}:
        return "event"
    if module in {"proyectos", "casa", "habitos"}:
        return "task"
    return "note"


HABIT_ROLES = {"routine", "log"}
HABIT_KINDS = {
    "rutina",
    "ejercicio",
    "meditacion",
    "lectura",
    "sueno",
    "medicacion",
    "presion",
    "glucosa",
    "peso",
    "sintoma",
    "salud",
    "otro",
}


HEALTH_SYMPTOM_HINTS = (
    "resfriado",
    "constipado",
    "gripe",
    "gripa",
    "catarro",
    "fiebre",
    "tos",
    "dolor de",
    "dolor en",
    "migraña",
    "migrana",
    "mareo",
    "mareos",
    "enfermo",
    "enferma",
    "enfermedad",
    "anginas",
    "covid",
    "garganta",
    "mocos",
)


def looks_like_health_symptom(low: str) -> bool:
    if any(word in low for word in HEALTH_SYMPTOM_HINTS):
        return True
    if re.search(r"\bmal\b", low) and any(w in low for w in ("cuerpo", "físico", "fisico", "estómago", "estomago", "cabeza")):
        return True
    return False


def looks_like_medication_log(low: str) -> bool:
    if any(w in low for w in ("insulina", "inyect", "inyección", "inyeccion", "comprimido", "cápsula", "capsula")):
        if any(w in low for w in ("tomé", "tome", "he tomado", "tomada", "tomado", "puse", "me puse")):
            return True
    if not any(w in low for w in ("tomé", "tome", "he tomado", "tomada", "tomado la", "tomado el", "tomado")):
        return False
    return any(
        w in low
        for w in (
            "pastilla",
            "pastillas",
            "medic",
            "medicación",
            "medicacion",
            "fármaco",
            "farmaco",
            "dosis",
            "paracetamol",
            "omeprazol",
            "insulina",
        )
    )


def looks_like_glucose_log(low: str) -> bool:
    if any(w in low for w in ("glucosa", "glicemia", "azúcar en sangre", "azucar en sangre")):
        return True
    if ("azúcar" in low or "azucar" in low) and re.search(r"\d", low):
        return True
    return False


def looks_like_blood_pressure_log(low: str) -> bool:
    if re.search(r"\d{2,3}\s*/\s*\d{2,3}", low):
        return True
    return any(w in low for w in ("tensión", "tension", "presión arterial", "presion arterial", " presión", " presion"))


HEALTH_READING_KINDS = frozenset({"presion", "glucosa", "medicacion", "peso", "sueno"})


def looks_like_control_reading_log(low: str) -> bool:
    """Lectura numérica de control (tensión, glucosa…): no archivar por Entrada."""
    if not looks_like_habit_log(low):
        return False
    return _habit_log_kind(low) in HEALTH_READING_KINDS


def looks_like_habit_log(low: str) -> bool:
    if re.search(r"\banoche\b", low) and re.search(r"dorm", low):
        return True
    if re.search(r"dorm[ií]", low) and re.search(r"\d+\s*h", low):
        return True
    if looks_like_medication_log(low):
        return True
    if looks_like_glucose_log(low):
        return True
    if looks_like_blood_pressure_log(low):
        return True
    if re.search(r"\bpeso\b", low) and re.search(r"\d", low):
        return True
    if looks_like_health_symptom(low):
        return True
    return False


def _habit_routine_kind(low: str) -> str:
    if any(w in low for w in ("meditar", "meditación", "meditacion", "respiración", "respiracion")):
        return "meditacion"
    if any(
        w in low
        for w in (
            "correr",
            "gym",
            "gimnasio",
            "yoga",
            "caminar",
            "pasos",
            "ejercicio",
            "entrenar",
            "remo",
            "máquina",
            "maquina",
        )
    ):
        return "ejercicio"
    if any(w in low for w in ("leer", "lectura", "libro")):
        return "lectura"
    return "rutina"


def _habit_log_kind(low: str) -> str:
    if re.search(r"dorm", low) and not looks_like_health_symptom(low):
        return "sueno"
    if looks_like_medication_log(low):
        return "medicacion"
    if looks_like_glucose_log(low):
        return "glucosa"
    if looks_like_blood_pressure_log(low):
        return "presion"
    if re.search(r"\bpeso\b", low):
        return "peso"
    if looks_like_health_symptom(low):
        return "sintoma"
    return "otro"


def _habit_log_notes(low: str, kind: str) -> str | None:
    if kind == "sueno":
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*h(?:oras)?", low)
        if m and "dorm" in low:
            return f"{m.group(1).replace(',', '.')} h"
    if kind == "presion":
        m = re.search(r"(\d{2,3})\s*/\s*(\d{2,3})", low)
        if m:
            return f"{m.group(1)}/{m.group(2)} mmHg"
    if kind == "glucosa":
        m = re.search(r"(?:glucosa|glicemia|azúcar|azucar)[^\d]{0,20}(\d{2,3}(?:[.,]\d+)?)", low)
        if m:
            return f"{m.group(1).replace(',', '.')} mg/dL"
        m = re.search(r"(\d{2,3}(?:[.,]\d+)?)\s*(?:mg\s*/?\s*dl|mgdl)", low)
        if m:
            return f"{m.group(1).replace(',', '.')} mg/dL"
        m = re.search(r"(\d{2,3}(?:[.,]\d+)?)", low)
        if m:
            return f"{m.group(1).replace(',', '.')} mg/dL"
    if kind == "peso":
        m = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:kg|kilos)?", low)
        if m:
            val = m.group(1).replace(",", ".")
            return f"{val} kg"
    return None


def parse_health_control_setup(raw: str, low: str) -> dict | None:
    """Plan de control (Entrada una vez), no una lectura suelta."""
    if re.search(r"\b\d{2,3}\s*/\s*\d{2,3}\b", low):
        return None
    if re.search(r"\b(?:glucosa|az[uú]car)\s+\d{2,3}\b", low):
        return None
    if re.search(r"\bpeso\s+\d", low):
        return None
    setup = re.search(
        r"\b("
        r"controlarme|controlar(?:me)?|quiero control|necesito control|"
        r"seguir(?:me)?(?: la| el| mi)?|medirme (?:la |el |mi )?|"
        r"revisar(?:me)?(?: la| el| mi)?|comprobar(?:me)?(?: la| el| mi)?|"
        r"pesarme|"
        r"cada d[ií]a (?:medir|tomar|controlar|pesarme|revisar)|"
        r"recordar(?:me)? (?:para|de) (?:medir|tomar|pesarme|revisar)"
        r")\b",
        low,
    )
    plan_phrase = re.search(
        r"\bcontrol de (?:la |el |mi )?(?:tensi[oó]n|glucosa|peso|medicaci[oó]n)\b",
        low,
    )
    quiero_plan = re.search(
        r"\bquiero (?:control|medir|revisar|comprobar|seguir)\b",
        low,
    ) and re.search(r"\bcada\b", low)
    if not setup and not plan_phrase and not quiero_plan:
        return None
    kind = None
    if re.search(r"tensi[oó]n|presi[oó]n arterial|\bpa\b", low):
        kind = "presion"
    elif re.search(r"glucosa|az[uú]car(?: en sangre)?", low):
        kind = "glucosa"
    elif re.search(r"medicaci[oó]n|pastilla|pastillas|tomar (?:la|el|mis)", low):
        kind = "medicacion"
    elif re.search(r"\bpeso\b|pesarme", low):
        kind = "peso"
    if not kind:
        return None
    titles = {
        "presion": "Control de tensión arterial",
        "glucosa": "Control de glucosa",
        "medicacion": "Control de medicación",
        "peso": "Control de peso",
    }
    title = titles[kind]
    hour, minute = _clock(low)
    reminder_time = f"{hour:02d}:{minute:02d}" if hour is not None else "08:00"
    repeats = "daily"
    if re.search(r"\b(?:domingo|semanal|cada semana)\b", low):
        repeats = "weekly"
    elif kind == "peso" and not re.search(r"\bcada d[ií]a\b", low):
        repeats = "weekly"
    alert = _alert_minutes_before(low, hour is not None)
    return {
        "kind": kind,
        "title": title,
        "repeats": repeats,
        "reminder_time": reminder_time,
        "alert_minutes_before": alert,
    }


def habit_meta(raw: str, low: str) -> dict:
    if looks_like_habit_log(low):
        kind = _habit_log_kind(low)
        notes = _habit_log_notes(low, kind)
        return {
            "habit_role": "log",
            "habit_kind": kind,
            "habit_notes": notes,
        }
    notes = None
    mins = re.search(r"\b(\d{1,3})\s*minutos?\b", low)
    if mins and not re.search(r"\d+\s*minutos?\s*antes\b", low):
        notes = f"{mins.group(1)} min"
    if not notes:
        steps = re.search(r"\b([\d.\s]{3,9})\s*pasos\b", low)
        if steps:
            num = "".join(steps.group(1).split()).replace(".", "")
            if num.isdigit():
                notes = f"{int(num):,}".replace(",", ".") + " pasos"
    return {
        "habit_role": "routine",
        "habit_kind": _habit_routine_kind(low),
        "habit_notes": notes,
    }


CASA_KINDS = {
    "compra": (
        "comprar",
        "lista de la compra",
        "hace falta",
        "necesito",
        "supermercado",
        "mercadona",
        "carrefour",
        "lidl",
        "aldi",
        "colmena",
    ),
    "mantenimiento": (
        "avería",
        "averia",
        "reparar",
        "arreglar",
        "cambiar el",
        "cambiar la",
        "fontanero",
        "electricista",
        "taller",
        "filtro",
        "grifo",
        "fuga",
        "caldera",
        "calentador",
        "persiana",
        "pintar",
        "gotera",
    ),
    "suministro": (
        "suministro",
        "recibo de la luz",
        "recibo del agua",
        "recibo del gas",
        "factura de la luz",
        "factura del gas",
        "factura del agua",
        "pagar la luz",
        "pagar el gas",
        "pagar el agua",
        "iberdrola",
        "endesa",
        "naturgy",
        "fibra",
        "wifi en casa",
    ),
    "inventario": (
        "inventario",
        "despensa",
        "congelador",
        "almacén",
        "almacen",
        "quedan ",
        "en stock",
        "guardado en",
        "tengo en el",
        "tengo en la",
        "cartuchos",
        "repuesto",
        "botes de",
        "latas de",
        "garrafa",
        "garrafas",
    ),
    "domestica": (
        "limpiar",
        "limpieza",
        "ordenar",
        "lavar",
        "planchar",
        "fregar",
        "aspirar",
        "aspiradora",
        "aspirador",
        "pasar aspiradora",
        "quitar el polvo",
        "basura",
        "basuras",
        "sacar la basura",
        "sacar el contenedor",
        "reciclaje",
        "contenedor",
        "lavadora",
        "lavavajillas",
        "tender",
        "hacer la cama",
        "estirar la cama",
        "barrer",
        "fregado",
        "quitar polvo",
    ),
    "otro": ("en casa", "del hogar", "del piso"),
}


def _is_casa_supply(low: str) -> bool:
    supply_phrases = (
        "factura de la luz",
        "factura del gas",
        "factura del agua",
        "recibo de la luz",
        "recibo del gas",
        "recibo del agua",
        "pagar la luz",
        "pagar el gas",
        "pagar el agua",
    )
    if any(phrase in low for phrase in supply_phrases):
        return True
    return _is_casa(low) and _casa_kind(low) == "suministro"


def _is_stock_count(low: str) -> bool:
    return bool(re.search(r"(?:quedan|queda|tenemos|tengo|hay|nos quedan)\s+\d+\b", low))


def _is_casa(low: str) -> bool:
    if re.search(r"\bcada\b", low):
        return False
    if re.search(r"\b(?:mi|el|en el|en la|a toda la|por toda la|toda la)\s+casa\b|\ben casa\b", low):
        return True
    if _is_stock_count(low):
        return True
    for words in CASA_KINDS.values():
        if any(word in low for word in words):
            return True
    return False


def _casa_kind(low: str) -> str:
    if _is_stock_count(low):
        return "inventario"
    stock_hint = any(
        hint in low
        for hint in ("en stock", "tengo en", "tenemos en", "guardado en")
    )
    if stock_hint or "repuesto" in low or "cartuchos" in low or "garrafa" in low:
        if any(word in low for word in CASA_KINDS["inventario"]):
            return "inventario"
    for kind, words in CASA_KINDS.items():
        if kind == "otro":
            continue
        if any(word in low for word in words):
            return kind
    return "otro"


def _module(low: str) -> str:
    if any(word in low for word in ("en abierto", "en el muro", "publicar")):
        return "muro"
    if any(word in low for word in ("círculo", "circulo")):
        return "circulos"
    if any(word in low for word in ("con mi pareja", "juntos", "compartido con")):
        return "espacios"
    if any(word in low for word in ("lista pública", "lista publica")):
        return "listas"
    if any(word in low for word in ("reunión", "reunion", "acta", "cliente", "socio", "proveedor")):
        return "reuniones"
    if any(word in low for word in ("idea de", "emprend", "modelo de negocio")):
        return "ideas"
    if any(word in low for word in ("resumen", "artículo", "articulo", "documentación", "documentacion", "apuntes", "nota sobre")):
        return "memoria"
    if any(word in low for word in ("proyecto", "hito", "entregable")):
        return "proyectos"
    if any(word in low for word in ("vuelo", "hotel", "viaje", "maleta", "itinerario")):
        return "viajes"
    if re.search(r"\bagenda\b", low):
        return "agenda"
    if re.search(r"\bcada\b", low):
        return "habitos"
    if _is_casa(low):
        return "casa"
    if any(word in low for word in ("hábito", "habito", "ejercicio", "meditación", "meditacion", "rutina")):
        return "habitos"
    if _is_leisure(low) and _has_agenda_when(low):
        return "agenda"
    if _is_leisure(low) and not _has_agenda_when(low):
        return "deseos"
    if _is_reminder(low) and _has_agenda_when(low):
        return "agenda"
    if (
        any(word in low for word in ("deseo", "quiero ir", "algún día", "algun dia"))
        or re.search(
            r"\b(?:quiero|me gustaría|me gustaria)\s+"
            r"(?:ir|viajar|visitar|conocer|leer|ver|probar|tener|hacer)\b",
            low,
        )
    ) and not _has_agenda_when(low):
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
    if looks_like_habit_log(low):
        return "habitos"
    if any(word in low for word in ("he dormido", "me siento", "diario", "ánimo", "animo")):
        return "diario"
    if re.search(r"\ba las \d", low) or _explicit_day(low):
        return "agenda"
    if _looks_like_habit_goal(low):
        return "habitos"
    if _is_task(low):
        return "proyectos"
    return "diario"


def weekday_indices_js(low: str) -> list[int]:
    found: list[int] = []
    for name, index in WEEKDAY_JS.items():
        if re.search(rf"\b{name}\b", low) and index not in found:
            found.append(index)
    return sorted(found)


def _is_recurring_weekday_phrase(low: str) -> bool:
    if re.search(r"\bcada\b", low):
        return True
    if re.search(rf"\blos?\s+{_DAY_TOKEN}", low):
        return True
    if re.search(rf"{_DAY_TOKEN}\s+y\s+{_DAY_TOKEN}", low):
        return True
    if re.search(rf"{_DAY_TOKEN}\s*,\s*{_DAY_TOKEN}", low):
        return True
    return False


def _weekly_repeat_from_weekdays(low: str) -> str | None:
    js_days = weekday_indices_js(low)
    if len(js_days) >= 2 and _is_recurring_weekday_phrase(low):
        return "weekly:" + ",".join(str(d) for d in js_days)
    return None


def _py_weekday_from_js(js: int) -> int:
    return 6 if js == 0 else js - 1


def _next_day_among(low: str, now: datetime, js_days: list[int]):
    if not js_days:
        return None
    allowed = {_py_weekday_from_js(d) for d in js_days}
    for offset in range(8):
        candidate = now.date() + timedelta(days=offset)
        if candidate.weekday() in allowed:
            return candidate
    return None


def entry_title(raw: str) -> str:
    """Título de entrada: texto original quitando solo cuándo/cada (fechas literales se conservan)."""
    text = raw
    text = re.sub(
        rf"\bcada\s+{_DAY_TOKEN}(?:\s*,\s*{_DAY_TOKEN})*(?:\s+y\s+{_DAY_TOKEN})?\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        rf"\blos?\s+{_DAY_TOKEN}(?:\s*,\s*{_DAY_TOKEN})*(?:\s+y\s+{_DAY_TOKEN})?\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        rf"\b{_DAY_TOKEN}\s+y\s+{_DAY_TOKEN}\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        rf"^(?:{_DAY_TOKEN}\s*(?:,\s*(?:y\s+)?)?)+",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    cuts = (
        r"\bpasado mañana\b",
        r"\bpasado manana\b",
        r"\besta mañana\b",
        r"\besta manana\b",
        r"\bpor la mañana\b",
        r"\bpor la manana\b",
        r"\bde la mañana\b",
        r"\bde la manana\b",
        r"\bcada\s+(?:d[ií]a|semana|mes|a[nñ]o)\b",
        rf"\b{_DAY_TOKEN}\b",
        r"\btodos los d[ií]as\b",
        r"\btodos los a[nñ]os\b",
        r"\bpor la tarde\b",
        r"\bpor la noche\b",
        r"\bde la tarde\b",
        r"\bde la noche\b",
        r"\bal mediodía\b",
        r"\bal mediodia\b",
        r"\ba las \d{1,2}(?::\d{2})?\s*(?:de la )?(?:tarde|noche|mañana|manana)?\b",
        r"\b\d{1,2}\s+de la (?:tarde|noche|mañana|manana)\b",
        r"\ba las \d{1,2}(?::\d{2})?\b",
        r"\b\d{1,2}:\d{2}\b",
        rf"\b(?:el |la )?{_DAY_TOKEN}(?: \d{{1,2}})?\b",
        r"\bmañana\b",
        r"\bmanana\b",
        r"\bhoy\b",
        r"\bsin (?:aviso|recordatorio|alerta)\b",
        r"\b(?:a la hora|en el momento)\b",
        r"\b\d+\s*(?:minutos?|horas?|d[ií]as?)\s*antes\b",
    )
    for pattern in cuts:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r"^y\s+", "", text, flags=re.IGNORECASE)
    text = " ".join(text.split()).strip(" .;:-,")
    text = re.sub(r"^(?:tengo que|hay que|tengo|necesito)\s+", "", text, flags=re.IGNORECASE)
    if not text:
        text = raw.strip()
    if not text:
        return ""
    return (text[0].upper() + text[1:])[:200]


def _title(raw: str) -> str:
    return entry_title(raw)


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
        recurring_days = _weekly_repeat_from_weekdays(low)
        if recurring_days:
            day = None
        elif re.search(r"\bcada\b", low):
            js_days = weekday_indices_js(low)
            if len(js_days) >= 2:
                day = _next_day_among(low, now, js_days)
            else:
                day = None
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
                if day is None:
                    day = _literal_day(low, now)
    hour, minute = _clock(low)
    time_known = hour is not None
    if time_known:
        hour = _evening_hour(low, hour)
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


def _literal_day(low: str, now: datetime):
    match = re.search(LITERAL_DATE, low)
    if not match:
        return None
    day_num = int(match.group(1))
    month = MONTHS[match.group(2)]
    if day_num < 1 or day_num > 31:
        return None
    year = now.year
    for _ in range(2):
        try:
            candidate = datetime(year, month, day_num, tzinfo=MADRID).date()
        except ValueError:
            return None
        if candidate >= now.date():
            return candidate
        year += 1
    return None


def _has_literal_date(low: str) -> bool:
    return bool(re.search(LITERAL_DATE, low))


def _weekday_number(low: str, now: datetime):
    match = re.search(
        r"\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})(?!:\d)\b",
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


HABIT_GOAL_HINTS = (
    "pasos",
    "caminar",
    "correr",
    "remo",
    "gimnasio",
    "ejercicio",
    "meditar",
    "meditación",
    "meditacion",
    "yoga",
    "leer",
    "agua",
)


def _looks_like_habit_goal(low: str) -> bool:
    if re.search(r"\bcada\b", low):
        return True
    if "al menos" in low and any(h in low for h in HABIT_GOAL_HINTS):
        return True
    if "tengo que" in low or "hay que" in low:
        return any(h in low for h in HABIT_GOAL_HINTS)
    if re.search(r"\d+\s*minutos", low) and any(h in low for h in ("ejercicio", "remo", "yoga", "correr", "caminar")):
        return True
    return False


def _is_task(low: str) -> bool:
    words = [word for word in TASK_WORDS if word != "hacer"]
    if any(word in low for word in words):
        return True
    return bool(re.search(r"\bhacer\b", low)) and not re.search(r"\bqu[eé] hacer\b", low)


def _repeat(low: str) -> str | None:
    if re.search(r"\bcada d[ií]a\b", low) or re.search(r"\btodos los d[ií]as\b", low):
        return "daily"
    if re.search(r"\bcada ma[nñ]ana\b", low) or re.search(r"\bcada noche\b", low) or re.search(r"\bcada tarde\b", low):
        return "daily"
    if re.search(r"\bcada a[nñ]o\b", low) or re.search(r"\btodos los a[nñ]os\b", low):
        return "yearly"
    if re.search(r"\bcada mes\b", low):
        return "monthly"
    if re.search(r"\bcada semana\b", low):
        return "weekly"
    weekly = _weekly_repeat_from_weekdays(low)
    if weekly:
        return weekly
    if re.search(r"\bcada\b", low):
        js_days = weekday_indices_js(low)
        if len(js_days) >= 2:
            return "weekly:" + ",".join(str(d) for d in js_days)
        if len(js_days) == 1:
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


def _is_birthday_preparation(low: str) -> bool:
    """Tarea sobre el regalo/preparación, no el cumpleaños como evento anual."""
    if not re.search(r"\bcumple", low):
        return False
    if re.search(r"\bregalo\b", low):
        return True
    if re.search(r"\bpensar\b", low):
        return True
    if re.search(r"\b(?:comprar|elegir|buscar|preparar|encargar)\b", low) and re.search(
        r"\b(?:regalo|detalle|sorpresa)\b", low
    ):
        return True
    return False


def _is_personal_agenda_reminder(low: str) -> bool:
    """Tarea personal con fecha (mañana, el lunes…), no cita ni celebración."""
    if _is_birthday_preparation(low):
        return True
    if not _is_task(low) or not _has_agenda_when(low):
        return False
    if _is_medical(low) or _is_family(low) or _is_leisure(low):
        return False
    return True


def _is_family(low: str) -> bool:
    if _is_birthday_preparation(low):
        return False
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
        or _has_literal_date(low)
        or re.search(r"\ba las \d", low)
        or re.search(r"\b\d{1,2}:\d{2}\b", low)
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


def _evening_hour(low: str, hour: int) -> int:
    if hour < 12 and re.search(r"\b(?:de la |por la )?(?:tarde|noche)\b", low):
        return hour + 12
    return hour


def _clock(low: str) -> tuple[int, int] | tuple[None, None]:
    match = re.search(r"\ba las (\d{1,2})(?::(\d{2}))?", low)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
    else:
        match = re.search(r"\b(\d{1,2})\s+de la (?:tarde|noche|mañana|manana)\b", low)
        if match:
            hour = int(match.group(1))
            minute = 0
        else:
            match = re.search(r"\b(\d{1,2}):(\d{2})\b", low)
            if not match:
                return None, None
            hour = int(match.group(1))
            minute = int(match.group(2))
    if hour > 23 or minute > 59:
        return None, None
    return hour, minute


def _casa_place(low: str) -> str | None:
    match = re.search(
        r"\b(?:en|del)\s+(?:el\s+|la\s+)?([a-z0-9áéíóúñ .-]{3,40})",
        low,
    )
    if not match:
        match = re.search(
            r"\b(?:baño|bano|salón|salon|cocina|garaje|dormitorio|terraza|despensa|congelador|trastero|armario|almacén|almacen)\b",
            low,
        )
        if match:
            return match.group(0)[0].upper() + match.group(0)[1:]
        return None
    place = " ".join(match.group(1).split()).strip(" .")
    skip = (
        "martes",
        "miércoles",
        "miercoles",
        "jueves",
        "viernes",
        "lunes",
        "sábado",
        "sabado",
        "domingo",
        "mañana",
        "manana",
        "hoy",
    )
    if any(word in place for word in skip):
        return None
    return place[0].upper() + place[1:]


SUPPLY_KINDS = {
    "luz": ("luz", "iberdrola", "endesa", "electricidad", "recibo de la luz", "factura de la luz", "pagar la luz"),
    "agua": ("agua", "factura del agua", "recibo del agua", "pagar el agua", "canal de isabel", "agbar"),
    "gas": ("gas", "naturgy", "factura del gas", "recibo del gas", "pagar el gas"),
    "internet": ("fibra", "internet", "wifi", "movistar", "vodafone", "orange"),
}


def _supply_kind(low: str) -> str:
    for kind, words in SUPPLY_KINDS.items():
        if any(word in low for word in words):
            return kind
    return "otro"


def _inventario_fields(raw: str, low: str) -> dict:
    text = " ".join(raw.strip().split())
    notes = None
    title = None
    packed = re.search(
        r"^(?:quedan|queda|tenemos|tengo|hay|nos quedan)\s+(\d+)\s+"
        r"(?:garrafas?|botes?|botellas?|latas?|unidades?|paquetes?|cartuchos?)\s+de\s+(.+)$",
        text,
        flags=re.IGNORECASE,
    )
    if packed:
        notes = packed.group(1)
        title = packed.group(2).strip(" .")
    if not notes:
        qty = re.search(
            r"(?:quedan|queda|tenemos|tengo|hay|nos quedan)\s+(\d+)\b",
            low,
        )
        if qty:
            notes = qty.group(1)
    if not notes:
        lead = re.match(r"^(\d+)\s+", text)
        if lead:
            notes = lead.group(1)
    cleaned = text
    if not title:
        cleaned = re.sub(
            r"^(?:quedan|queda|tenemos|tengo|hay|nos quedan)\s+(?:\d+\s+)?",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(r"^\d+\s+", "", cleaned)
    cleaned = re.sub(
        r"\s+(?:en stock|guardado en|guardados en)\s+.+$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"\s+en\s+(?:el|la|los|las)\s+.+$", "", cleaned, flags=re.IGNORECASE)
    if not title:
        cleaned = re.sub(r"\s+en\s+(?:despensa|congelador|garaje|baño|baño|armario|trastero|cocina)\s*$", "", cleaned, flags=re.IGNORECASE)
        cleaned = " ".join(cleaned.split()).strip(" .")
        cleaned = re.sub(
            r"^(?:garrafas?|botes?|botellas?|latas?|unidades?|paquetes?|cartuchos?)\s+(?:de\s+)?",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip(" .")
        title = cleaned
    title = title[0].upper() + title[1:] if len(title) > 1 else title.upper() if title else _title(raw)
    place = _casa_place(low)
    if not place:
        spot = re.search(
            r"\ben (?:el |la |los |las )?(despensa|congelador|garaje|baño|bano|armario|trastero|cocina|almacén|almacen)\b",
            low,
        )
        if spot:
            word = spot.group(1)
            if word in {"bano", "almacen"}:
                word = "Baño" if word == "bano" else "Almacén"
            else:
                word = word[0].upper() + word[1:]
            place = word
    return {"title": title, "casa_place": place, "casa_notes": notes}


def _casa_meta(raw: str, low: str) -> dict:
    kind = _casa_kind(low)
    meta = {
        "casa_kind": kind,
        "casa_place": _casa_place(low),
        "casa_notes": None,
        "supply_kind": None,
    }
    if kind == "suministro":
        meta["supply_kind"] = _supply_kind(low)
    if kind == "inventario":
        inv = _inventario_fields(raw, low)
        meta["casa_place"] = inv["casa_place"] or meta["casa_place"]
        meta["casa_notes"] = inv["casa_notes"]
        meta["inventario_title"] = inv["title"]
    return meta


def _compra_store(raw: str, low: str) -> str | None:
    match = re.search(r"\ben\s+(?:el\s+|la\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ0-9 .-]{2,40})", raw)
    if match:
        place = match.group(1).strip(" .")
        if place.lower() not in {"la", "el", "los", "las", "mi", "casa"}:
            return place
    match = re.search(r"\ben\s+(mercadona|carrefour|lidl|aldi|dia|eroski|alcampo|hipercor|colmena)\b", low)
    if match:
        return match.group(1)[0].upper() + match.group(1)[1:]
    return None


def split_compra_titles(raw: str) -> list[str]:
    text = " ".join(raw.strip().split())
    low = text.lower()
    store = _compra_store(text, low)
    if store:
        text = re.sub(r"\s+en\s+(?:el\s+|la\s+)?" + re.escape(store) + r"\s*$", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(
            r"\s+en\s+(?:el\s+|la\s+)?(?:mercadona|carrefour|lidl|aldi|dia|eroski|alcampo|hipercor|colmena)\s*$",
            "",
            text,
            flags=re.IGNORECASE,
        ).strip()
    text = re.sub(
        r"^(?:comprar|compra de|hay que comprar|hace falta|necesito(?: comprar)?|añadir a la lista(?: de la compra)?)\s+",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()
    if not text:
        return [_title(raw)]
    parts = re.split(r"\s*,\s*|\s+y\s+|\s+e\s+", text)
    titles = []
    for part in parts:
        cleaned = " ".join(part.split()).strip(" .")
        if not cleaned:
            continue
        titles.append(cleaned[0].upper() + cleaned[1:] if len(cleaned) > 1 else cleaned.upper())
    return titles or [_title(raw)]


def compra_store_name(raw: str) -> str | None:
    return _compra_store(raw, raw.lower())


def _casa_title(raw: str, low: str, kind: str | None) -> str:
    labels = {
        "compra": "Compra",
        "mantenimiento": "Mantenimiento",
        "suministro": "Suministro",
        "domestica": "Tareas del hogar",
        "inventario": "Inventario",
        "otro": "Casa",
    }
    label = labels.get(kind or "otro", "Casa")
    cleaned = _title(raw)
    if kind == "compra":
        cleaned = re.sub(
            r"^(?:comprar|compra de|hay que comprar|hace falta|necesito(?: comprar)?)\s+",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if cleaned:
            return cleaned[0].upper() + cleaned[1:]
    if kind == "mantenimiento":
        cleaned = re.sub(r"^(?:hay que |tengo que )?(?:arreglar|reparar|cambiar)\s+(?:el |la )?", "", cleaned, flags=re.IGNORECASE)
        if cleaned:
            return cleaned[0].upper() + cleaned[1:]
    if kind == "domestica":
        cleaned = re.sub(r"^(?:hay que |tengo que )", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(
            r"\s+(?:todos los d[ií]as|todos los dias|cada d[ií]a|cada dia|cada semana|cada mes)(?:\s+a las .+|\s+por la (?:mañana|tarde|noche)|\s+de la (?:mañana|tarde|noche))?$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(
            r"\s+(?:a las \d[\d:]*|por la (?:mañana|tarde|noche)|de la (?:mañana|tarde|noche))$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        )
        cleaned = re.sub(
            r"\s+(?:a toda la casa|por toda la casa|en toda la casa|toda la casa)$",
            "",
            cleaned,
            flags=re.IGNORECASE,
        ).strip()
        if cleaned:
            return cleaned[0].upper() + cleaned[1:]
    if cleaned.lower().startswith(label.lower()):
        return cleaned
    if kind and kind != "otro" and label.lower() not in cleaned.lower():
        return f"{label} · {cleaned}" if cleaned else label
    return cleaned or label
