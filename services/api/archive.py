"""Archivado v2: reglas temporales + modelo OpenRouter + fallback a classify."""

from __future__ import annotations

import json
import re
from typing import Any

from classify import (
    LITERAL_DATE,
    HABIT_KINDS,
    HABIT_ROLES,
    MODULES,
    _looks_like_habit_goal,
    _is_birthday_preparation,
    _is_casa_supply,
    _is_personal_agenda_reminder,
    _supply_kind,
    classify,
    entry_title,
    habit_meta,
    legacy_kind,
    looks_like_habit_log,
    split_compra_titles,
)
import llm

AGENDA_TYPES = {"medica", "familiar", "ocio", "recordatorio", "general"}
CASA_KINDS = {"compra", "inventario", "domestica", "mantenimiento", "suministro", "otro"}
FAMILY_KIND = {"cumpleanos", "aniversario", "boda", "bautizo", "comunion", "comida", "otro"}
LEISURE_KIND = {"cine", "restaurante", "concierto", "teatro", "deporte", "excursion", "quedar", "otro"}
REMINDER_KIND = {"itv", "seguro", "impuesto", "documento", "hogar", "otro"}
SUPPLY_KIND = {"luz", "agua", "gas", "internet", "otro"}

TEMPORAL_KEYS = (
    "starts_at",
    "time_known",
    "repeats",
    "alert_minutes_before",
)

AGENDA_FIELD_KEYS = (
    "agenda_type",
    "medical_for",
    "medical_name",
    "medical_place",
    "medical_notes",
    "family_kind",
    "family_for",
    "family_name",
    "family_place",
    "family_notes",
    "leisure_kind",
    "leisure_with",
    "leisure_name",
    "leisure_place",
    "leisure_notes",
    "reminder_kind",
    "reminder_place",
    "reminder_notes",
)

CASA_FIELD_KEYS = ("casa_kind", "casa_place", "casa_notes", "supply_kind")
HABIT_FIELD_KEYS = ("habit_role", "habit_kind", "habit_notes")

SYSTEM_PROMPT = """Eres el archivador de Impersia OS. Clasifica la frase del usuario en español.

Responde SOLO JSON válido con una clave "items": lista de 1 a 4 objetos. Cada objeto puede incluir:
- module: uno de agenda, casa, habitos, viajes, diario, deseos, proyectos, reuniones, memoria, ideas, muro, listas, circulos, espacios
- agenda_type: medica|familiar|ocio|recordatorio|general|null (solo si module=agenda)
- casa_kind: compra|inventario|domestica|mantenimiento|suministro|otro|null (solo si module=casa)
- family_kind, leisure_kind, reminder_kind, supply_kind cuando aplique
- medical_for, medical_place, family_for, family_name, family_place, leisure_with, leisure_place, casa_place, casa_notes, reminder_notes, family_notes: texto o null
- role (opcional): "task" | "birthday_event" — task = aviso/tarea con la fecha principal de la frase; birthday_event = cumpleaños anual en la fecha literal mencionada (9 nov…)

Reglas:
- Fechas y horas de la cita las resuelve el servidor en campos temporales, no en title.
- Comprar productos → casa.compra. Quedan N en casa → casa.inventario.
- Casa.domestica = tareas del hogar rutinarias: limpiar, fregar, aspirar, cristales, basura, lavadora, platos, orden.
- Casa.mantenimiento = arreglar averías, reparaciones, fontanero, electricista, cambiar pieza/filtro, pintar, caldera.
- Casa.suministro = facturas y contratos de luz, agua, gas, internet (Iberdrola, Naturgy, Movistar…). Aunque haya fecha de vencimiento, sigue siendo casa.suministro, NO agenda.
- ITV, seguro, IBI, impuestos, pasaporte → agenda.recordatorio (no suministro).
- Cumpleaños, aniversario, boda, bautizo, comida familiar → agenda.familiar (no ocio).
- Pensar/comprar/elegir regalo de cumpleaños con fecha (mañana, el lunes…) → agenda.recordatorio (tarea personal), NO familiar ni «cada año».
- «Tengo que / hay que …» con mañana o día concreto → agenda.recordatorio, no cita general.
- Plan con amigos/pareja (cena, concierto, quedar) → agenda.ocio.
- Cada lunes/día + yoga, gimnasio, meditar, correr → habitos (no ocio).
- habit_role: routine (repetición) | log (sueño, medicación tomada, tensión, glucosa, peso, síntoma). habit_kind: rutina|ejercicio|meditacion|lectura|sueno|medicacion|presion|glucosa|peso|sintoma|salud|otro.
- Los planes de control de salud (tensión diaria, peso, etc.) NO se crean por Entrada; el usuario los añade en Bienestar. Una lectura suelta («Tensión 120/80») sigue siendo habitos log.
- «Anoche dormí N horas», peso, tensión → habitos log (no diario si es dato).
- Comida o reunión de empresa/trabajo con fecha → reuniones.
- Cita médica → agenda.medica.
- Reflexión o ánimo sin tarea → diario.
- Varios hechos distintos (p. ej. separados por «;», «y también», dos fechas con dos acciones) → varios objetos en items.
- «Mañana pensar regalo… cumple 54 el 9 de noviembre» → UN item recordatorio (role task); fecha de noviembre en reminder_notes, NO segundo item salvo que pidan guardar el cumple anual.
- Si piden explícitamente recordar el cumple cada año el 9 nov → segundo item familiar cumpleanos (role birthday_event)."""

DOMESTICA_HINTS = (
    "limpiar",
    "fregar",
    "aspir",
    "basura",
    "lavadora",
    "platos",
    "ordenar",
    "cristal",
    "polvo",
    "hacer la cama",
    "recoger",
)
MANTENIMIENTO_HINTS = (
    "repar",
    "arregl",
    "avería",
    "averia",
    "fontaner",
    "electric",
    "filtro",
    "caldera",
    "pintar",
    "gotera",
    "fuga",
    "averi",
)

UTILITY_SUPPLY_HINTS = (
    "factura de la luz",
    "factura del gas",
    "factura del agua",
    "factura de la",
    "recibo de la luz",
    "recibo del gas",
    "recibo del agua",
    "recibo del internet",
    "contrato internet",
    "contrato de internet",
    "iberdrola",
    "naturgy",
    "endesa",
    "movistar",
    "vodafone",
    "orange",
    "fibra",
    "wifi",
)

RECORDATORIO_HINTS = (
    "itv",
    "seguro del hogar",
    "seguro de hogar",
    "seguro del coche",
    "ibi",
    "impuesto",
    "pasaporte",
    "documento",
    "hacienda",
)

FAMILY_HINTS = (
    "cumpleaños",
    "cumpleanos",
    "aniversario",
    "boda",
    "bautizo",
    "comunión",
    "comunion",
    "comida familiar",
)

HABIT_ACTIVITY_HINTS = (
    "yoga",
    "meditar",
    "meditación",
    "meditacion",
    "correr",
    "gimnasio",
    "gym",
    "lectura",
    "deporte",
    "pilates",
)


def _looks_like_utility_bill(low: str) -> bool:
    if any(h in low for h in RECORDATORIO_HINTS):
        if not any(
            h in low
            for h in ("luz", "gas", "agua", "internet", "iberdrola", "naturgy", "movistar", "factura", "recibo")
        ):
            return False
    if _is_casa_supply(low):
        return True
    if any(h in low for h in UTILITY_SUPPLY_HINTS):
        return True
    if ("vence" in low or "renovar" in low or "recibo" in low or "factura" in low) and any(
        w in low for w in ("luz", "gas", "agua", "internet", "iberdrola", "naturgy", "movistar", "vodafone")
    ):
        return True
    return False


def _looks_like_habit(low: str) -> bool:
    if not re.search(r"\bcada\b", low):
        return False
    return any(h in low for h in HABIT_ACTIVITY_HINTS)


def _looks_like_family_event(low: str) -> bool:
    if _is_birthday_preparation(low):
        return False
    return any(h in low for h in FAMILY_HINTS)


def _sync_module_fields(out: dict) -> None:
    module = out.get("module")
    if module not in MODULES:
        return
    out["axis"] = MODULES[module]
    out["kind"] = legacy_kind(module)


def _post_refine(out: dict, raw: str, baseline: dict) -> dict:
    """Capa determinista tras reglas o IA: corrige casos frecuentes del eje A."""
    low = raw.lower()
    result = dict(out)
    result["title"] = entry_title(raw)
    for key in TEMPORAL_KEYS:
        if baseline.get(key) is not None or key not in result:
            result[key] = baseline.get(key)

    if _looks_like_utility_bill(low):
        result["module"] = "casa"
        _sync_module_fields(result)
        _clear_agenda_fields(result)
        result["casa_kind"] = "suministro"
        result["supply_kind"] = _supply_kind(low)
        if result.get("starts_at") and result.get("alert_minutes_before") is None:
            result["alert_minutes_before"] = 10080
        return result

    if _looks_like_habit_goal(low):
        result["module"] = "habitos"
        _sync_module_fields(result)
        _clear_agenda_fields(result)
        _clear_casa_fields(result)
        _apply_habit_fields(result, raw)
        return result

    if looks_like_habit_log(low):
        result["module"] = "habitos"
        _sync_module_fields(result)
        _clear_agenda_fields(result)
        _clear_casa_fields(result)
        _apply_habit_fields(result, raw)
        return result

    if _looks_like_habit(low):
        result["module"] = "habitos"
        _sync_module_fields(result)
        _clear_agenda_fields(result)
        _clear_casa_fields(result)
        _apply_habit_fields(result, raw)
        return result

    if result.get("module") == "habitos":
        _clear_agenda_fields(result)
        _clear_casa_fields(result)
        _apply_habit_fields(result, raw)
        return result

    if _is_personal_agenda_reminder(low) and result.get("module") == "agenda":
        result["agenda_type"] = "recordatorio"
        if not result.get("reminder_kind"):
            result["reminder_kind"] = "otro"
        for key in (
            "family_kind",
            "family_for",
            "family_name",
            "family_place",
            "family_notes",
        ):
            result[key] = None
        if not re.search(r"\bcada a[nñ]o\b|\btodos los a[nñ]os\b", low):
            result["repeats"] = None
        if result.get("alert_minutes_before") is None:
            result["alert_minutes_before"] = baseline.get("alert_minutes_before")
        if result.get("alert_minutes_before") is None and result.get("starts_at"):
            result["alert_minutes_before"] = 1440 if not baseline.get("time_known") else 15
        note = _birthday_context_note(raw)
        if note and not result.get("reminder_notes"):
            result["reminder_notes"] = note
        return result

    if _looks_like_family_event(low) and result.get("module") == "agenda":
        result["agenda_type"] = "familiar"
        if "aniversario" in low:
            result["family_kind"] = "aniversario"
        elif "cumple" in low:
            result["family_kind"] = "cumpleanos"
        elif "boda" in low:
            result["family_kind"] = "boda"
        elif "bautizo" in low:
            result["family_kind"] = "bautizo"
        elif "comunion" in low or "comunión" in low:
            result["family_kind"] = "comunion"
        elif "comida familiar" in low:
            result["family_kind"] = "comida"
        return result

    if result.get("module") == "casa":
        ck = result.get("casa_kind")
        result["casa_kind"] = _refine_casa_kind(raw, ck if ck in CASA_KINDS else None)
        if result["casa_kind"] == "suministro" and not result.get("supply_kind"):
            result["supply_kind"] = _supply_kind(low)

    if "comida de empresa" in low or "comida empresa" in low or "evento de empresa" in low:
        if result.get("module") in {"agenda", "proyectos", "ideas"}:
            result["module"] = "reuniones"
            _sync_module_fields(result)
            _clear_agenda_fields(result)
            _clear_casa_fields(result)

    return result


def _refine_casa_kind(raw: str, kind: str | None) -> str:
    low = raw.lower()
    chore = any(h in low for h in DOMESTICA_HINTS)
    repair = any(h in low for h in MANTENIMIENTO_HINTS)
    if chore and not repair:
        return "domestica"
    if repair and not chore:
        return "mantenimiento"
    if kind in CASA_KINDS:
        return kind
    return "otro"


def _token_set(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-záéíóúñ0-9]+", text.lower()) if len(w) > 2}


def _score_example(query: str, candidate: str) -> int:
    q = _token_set(query)
    c = _token_set(candidate)
    if not q or not c:
        return 0
    return len(q & c)


def fetch_examples(cur, user_id: str, raw_text: str, limit: int = 8) -> list[dict]:
    cur.execute(
        """
        SELECT raw_text, label
        FROM classification_examples
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 40
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    ranked = sorted(rows, key=lambda row: _score_example(raw_text, row["raw_text"]), reverse=True)
    return ranked[:limit]


def record_correction(cur, user_id: str, raw_text: str, label: dict[str, Any]) -> None:
    text = raw_text.strip()
    if not text:
        return
    cur.execute(
        """
        INSERT INTO classification_examples (user_id, raw_text, label, source)
        VALUES (%s, %s, %s::jsonb, 'correction')
        """,
        (user_id, text[:2000], json.dumps(label, default=str)),
    )


def _clear_agenda_fields(target: dict) -> None:
    for key in AGENDA_FIELD_KEYS:
        target[key] = None


def _clear_casa_fields(target: dict) -> None:
    for key in CASA_FIELD_KEYS:
        target[key] = None


def _clear_habit_fields(target: dict) -> None:
    for key in HABIT_FIELD_KEYS:
        target[key] = None


def _apply_habit_fields(result: dict, raw: str) -> None:
    meta = habit_meta(raw, raw.lower())
    role = meta.get("habit_role")
    kind = meta.get("habit_kind")
    result["habit_role"] = role if role in HABIT_ROLES else "routine"
    result["habit_kind"] = kind if kind in HABIT_KINDS else "otro"
    result["habit_notes"] = meta.get("habit_notes")
    if result["habit_role"] == "log":
        result["repeats"] = None


def _birthday_context_note(raw: str) -> str | None:
    match = re.search(r",?\s*que cumple[^.]+", raw, flags=re.IGNORECASE)
    if match:
        return match.group(0).lstrip(", ").strip()[:200]
    match = re.search(rf"cumple\s+\d+\s+el\s+{LITERAL_DATE}", raw, flags=re.IGNORECASE)
    if match:
        return match.group(0).strip()[:200]
    return None


def _split_segments(raw: str) -> list[str]:
    parts = re.split(r"\s*;\s*|\s+\.\s+", raw)
    if len(parts) <= 1:
        parts = re.split(r"\s+y también\s+|\s+además\s+", raw, flags=re.IGNORECASE)
    cleaned = [p.strip() for p in parts if len(p.strip()) >= 10]
    if len(cleaned) <= 1:
        return [raw]
    return cleaned


def _normalize_llm_specs(parsed: dict) -> list[dict]:
    items = parsed.get("items")
    if isinstance(items, list) and items:
        specs = [spec for spec in items if isinstance(spec, dict) and spec.get("module") in MODULES]
        if specs:
            return specs
    if parsed.get("module") in MODULES:
        return [parsed]
    return []


def _birthday_event_phrase(full_raw: str, spec: dict) -> str | None:
    match = re.search(LITERAL_DATE, full_raw, flags=re.IGNORECASE)
    if not match:
        return None
    date_part = f"{match.group(1)} de {match.group(2)}"
    name = (spec.get("family_name") or "").strip()
    if not name:
        name_match = re.search(
            r"(?:cumpleaños|regalo)[^,.]*?(?:de|para)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)",
            full_raw,
            flags=re.IGNORECASE,
        )
        if name_match:
            name = name_match.group(1)
    if name:
        return f"Cumpleaños de {name} el {date_part}"
    return f"Cumpleaños el {date_part}"


def _baseline_for_spec(full_raw: str, spec: dict, primary_baseline: dict, index: int) -> dict:
    role = (spec.get("role") or "").strip().lower()
    if index == 0 and role != "birthday_event":
        return primary_baseline
    if role == "birthday_event" or (
        index > 0
        and spec.get("agenda_type") == "familiar"
        and spec.get("family_kind") in {"cumpleanos", "aniversario"}
    ):
        phrase = _birthday_event_phrase(full_raw, spec)
        if phrase:
            return classify(phrase)
    segment = (spec.get("segment") or spec.get("source_text") or "").strip()
    if segment and segment != full_raw:
        return classify(segment)
    return primary_baseline


def _title_for_spec(full_raw: str, spec: dict, index: int, segment: str | None) -> str:
    if segment and segment != full_raw:
        return entry_title(segment)
    if index == 0:
        return entry_title(full_raw)
    role = (spec.get("role") or "").strip().lower()
    if role == "birthday_event":
        phrase = _birthday_event_phrase(full_raw, spec)
        if phrase:
            return entry_title(phrase)
    return entry_title(full_raw)


def _apply_llm_spec(baseline: dict, parsed: dict, title_raw: str) -> dict:
    module = parsed.get("module")
    if module not in MODULES:
        raise ValueError("módulo no válido")
    out = dict(baseline)
    for key in TEMPORAL_KEYS:
        out[key] = baseline.get(key)
    out["module"] = module
    out["axis"] = MODULES[module]
    out["kind"] = legacy_kind(module)
    out["title"] = entry_title(title_raw)
    out["source"] = "llm"

    if module == "agenda":
        _clear_casa_fields(out)
        _clear_habit_fields(out)
        at = parsed.get("agenda_type")
        out["agenda_type"] = at if at in AGENDA_TYPES else (baseline.get("agenda_type") or "general")
        for key in AGENDA_FIELD_KEYS:
            if key == "agenda_type":
                continue
            val = parsed.get(key)
            if val is not None and str(val).strip():
                out[key] = str(val).strip()[:200]
        if parsed.get("family_kind") in FAMILY_KIND:
            out["family_kind"] = parsed["family_kind"]
        if parsed.get("leisure_kind") in LEISURE_KIND:
            out["leisure_kind"] = parsed["leisure_kind"]
        if parsed.get("reminder_kind") in REMINDER_KIND:
            out["reminder_kind"] = parsed["reminder_kind"]
    elif module == "casa":
        _clear_agenda_fields(out)
        _clear_habit_fields(out)
        ck = parsed.get("casa_kind")
        if ck not in CASA_KINDS:
            ck = baseline.get("casa_kind")
        out["casa_kind"] = _refine_casa_kind(title_raw, ck if ck in CASA_KINDS else None)
        for key in ("casa_place", "casa_notes"):
            val = parsed.get(key)
            if val is not None and str(val).strip():
                out[key] = str(val).strip()[:200]
        if parsed.get("supply_kind") in SUPPLY_KIND:
            out["supply_kind"] = parsed["supply_kind"]
    elif module == "habitos":
        _clear_agenda_fields(out)
        _clear_casa_fields(out)
        out["agenda_type"] = None
        role = parsed.get("habit_role")
        kind = parsed.get("habit_kind")
        if role in HABIT_ROLES:
            out["habit_role"] = role
        if kind in HABIT_KINDS:
            out["habit_kind"] = kind
        val = parsed.get("habit_notes")
        if val is not None and str(val).strip():
            out["habit_notes"] = str(val).strip()[:200]
        if not out.get("habit_role"):
            _apply_habit_fields(out, title_raw)
    else:
        _clear_agenda_fields(out)
        _clear_casa_fields(out)
        _clear_habit_fields(out)
        out["agenda_type"] = None

    return out


def _archive_rules_only(raw: str) -> dict:
    baseline = classify(raw)
    baseline["source"] = "rules"
    return _post_refine(baseline, raw, baseline)


def _expand_compra(raw: str, items: list[dict]) -> list[dict]:
    expanded: list[dict] = []
    for item in items:
        if item.get("module") == "casa" and item.get("casa_kind") == "compra":
            for title in split_compra_titles(raw):
                copy = dict(item)
                copy["title"] = title
                expanded.append(copy)
        else:
            expanded.append(item)
    return expanded or items


def _build_items_from_llm(parsed: dict, full_raw: str, primary_baseline: dict) -> list[dict]:
    specs = _normalize_llm_specs(parsed)
    if not specs:
        fallback = dict(primary_baseline)
        fallback["source"] = "rules"
        return [_post_refine(fallback, full_raw, primary_baseline)]
    built: list[dict] = []
    for index, spec in enumerate(specs):
        segment = (spec.get("segment") or spec.get("source_text") or "").strip() or None
        title_raw = segment if segment else full_raw
        role = (spec.get("role") or "").strip().lower()
        baseline = _baseline_for_spec(full_raw, spec, primary_baseline, index)
        merged = _apply_llm_spec(baseline, spec, title_raw)
        refine_raw = full_raw
        if segment:
            refine_raw = segment
        elif role == "birthday_event":
            refine_raw = _birthday_event_phrase(full_raw, spec) or full_raw
        merged["title"] = _title_for_spec(full_raw, spec, index, segment)
        refined = _post_refine(merged, refine_raw, baseline)
        built.append(refined)
    return built


def _temporal_hint(baseline: dict) -> str:
    parts = []
    if baseline.get("starts_at"):
        parts.append(f"starts_at={baseline['starts_at']}")
    if baseline.get("time_known"):
        parts.append("time_known=true")
    if baseline.get("repeats"):
        parts.append(f"repeats={baseline['repeats']}")
    if baseline.get("alert_minutes_before") is not None:
        parts.append(f"alert_minutes={baseline['alert_minutes_before']}")
    return ", ".join(parts) or "sin fecha detectada"


def _label_from_suggestion(suggestion: dict) -> dict:
    keys = ("module", "axis", "kind", "title", "agenda_type", *AGENDA_FIELD_KEYS, *CASA_FIELD_KEYS)
    return {key: suggestion.get(key) for key in keys if suggestion.get(key) is not None}


def archive_items(
    cur,
    user_id: str,
    text: str,
    *,
    capture_id: str | None = None,
) -> list[dict]:
    raw = " ".join(text.strip().split())
    segments = _split_segments(raw)
    if len(segments) > 1:
        items = [_archive_rules_only(segment) for segment in segments]
        return _expand_compra(raw, items)

    baseline = classify(raw)
    available, _, settings = llm.can_use_llm(cur)
    if not available:
        baseline["source"] = baseline.get("source") or "rules"
        single = _post_refine(baseline, raw, baseline)
        return _expand_compra(raw, [single])

    examples = fetch_examples(cur, user_id, raw)
    user_parts = [f'Frase: "{raw}"', f"Temporal (reglas, no cambies): {_temporal_hint(baseline)}"]
    if examples:
        user_parts.append("Ejemplos de esta cuenta:")
        for row in examples:
            user_parts.append(f'- "{row["raw_text"]}" → {json.dumps(row["label"], ensure_ascii=False)}')
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "\n".join(user_parts)},
    ]

    success = False
    error = None
    input_tokens = output_tokens = latency_ms = 0
    parsed: dict = {}
    items: list[dict] = []
    try:
        content, input_tokens, output_tokens, latency_ms = llm.openrouter_chat(
            model=settings["model"],
            messages=messages,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(content)
        items = _build_items_from_llm(parsed, raw, baseline)
        success = True
    except Exception as exc:
        error = str(exc)[:500]
        fallback = dict(baseline)
        fallback["source"] = "rules"
        items = [_post_refine(fallback, raw, baseline)]

    if success:
        for item in items:
            item["source"] = "llm"

    cost = llm.compute_cost(input_tokens, output_tokens, settings)
    llm.log_usage(
        cur,
        user_id=user_id,
        capture_id=capture_id,
        provider=settings["provider"],
        model=settings["model"],
        purpose="archive",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        latency_ms=latency_ms or None,
        success=success,
        error_message=error,
        fallback_used=not success,
    )
    return _expand_compra(raw, items)


def archive(
    cur,
    user_id: str,
    text: str,
    *,
    capture_id: str | None = None,
) -> dict:
    items = archive_items(cur, user_id, text, capture_id=capture_id)
    return items[0]


def maybe_learn_from_patch(
    cur,
    user_id: str,
    *,
    raw_text: str,
    before: dict,
    after: dict,
) -> None:
    if (
        before.get("module") == after.get("module")
        and before.get("agenda_type") == after.get("agenda_type")
        and before.get("casa_kind") == after.get("casa_kind")
        and before.get("supply_kind") == after.get("supply_kind")
    ):
        return
    label = _label_from_suggestion(after)
    label["corrected_from"] = {
        "module": before.get("module"),
        "agenda_type": before.get("agenda_type"),
        "casa_kind": before.get("casa_kind"),
    }
    record_correction(cur, user_id, raw_text, label)
