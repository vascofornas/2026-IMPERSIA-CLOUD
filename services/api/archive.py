"""Archivado v2: reglas temporales + modelo OpenRouter + fallback a classify."""

from __future__ import annotations

import json
import re
from typing import Any

from classify import MODULES, _is_birthday_preparation, _is_casa_supply, _supply_kind, classify, legacy_kind
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

SYSTEM_PROMPT = """Eres el archivador de Impersia OS. Clasifica la frase del usuario en español.

Responde SOLO JSON válido con estas claves:
- module: uno de agenda, casa, habitos, viajes, diario, deseos, proyectos, reuniones, memoria, ideas, muro, listas, circulos, espacios
- title: título limpio, sin fechas ni horas
- agenda_type: medica|familiar|ocio|recordatorio|general|null (solo si module=agenda)
- casa_kind: compra|inventario|domestica|mantenimiento|suministro|otro|null (solo si module=casa)
- family_kind, leisure_kind, reminder_kind, supply_kind cuando aplique
- medical_for, medical_place, family_for, family_place, leisure_with, leisure_place, casa_place, casa_notes: texto o null

Reglas:
- Fechas y horas las resuelve el servidor; no las copies al title.
- Comprar productos → casa.compra. Quedan N en casa → casa.inventario.
- Casa.domestica = tareas del hogar rutinarias: limpiar, fregar, aspirar, cristales, basura, lavadora, platos, orden.
- Casa.mantenimiento = arreglar averías, reparaciones, fontanero, electricista, cambiar pieza/filtro, pintar, caldera.
- Casa.suministro = facturas y contratos de luz, agua, gas, internet (Iberdrola, Naturgy, Movistar…). Aunque haya fecha de vencimiento, sigue siendo casa.suministro, NO agenda.
- ITV, seguro, IBI, impuestos, pasaporte → agenda.recordatorio (no suministro).
- Cumpleaños, aniversario, boda, bautizo, comida familiar → agenda.familiar (no ocio).
- Pensar/comprar/elegir regalo de cumpleaños con fecha (mañana, el lunes…) → agenda.general: tarea puntual, NO familiar ni «cada año».
- Plan con amigos/pareja (cena, concierto, quedar) → agenda.ocio.
- Cada lunes/día + yoga, gimnasio, meditar, correr → habitos (no ocio).
- Comida o reunión de empresa/trabajo con fecha → reuniones.
- Cita médica → agenda.medica.
- Reflexión o ánimo sin tarea → diario."""

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

    if _looks_like_habit(low):
        result["module"] = "habitos"
        _sync_module_fields(result)
        _clear_agenda_fields(result)
        _clear_casa_fields(result)
        return result

    if _is_birthday_preparation(low) and result.get("module") == "agenda":
        result["agenda_type"] = "general"
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
        if result.get("alert_minutes_before") == 1440 and not re.search(
            r"\b\d+\s*d[ií]as?\s*antes\b", low
        ):
            result["alert_minutes_before"] = baseline.get("alert_minutes_before")
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


def _apply_llm(baseline: dict, parsed: dict, raw: str) -> dict:
    module = parsed.get("module")
    if module not in MODULES:
        raise ValueError("módulo no válido")
    out = dict(baseline)
    for key in TEMPORAL_KEYS:
        out[key] = baseline.get(key)
    out["module"] = module
    out["axis"] = MODULES[module]
    out["kind"] = legacy_kind(module)
    title = (parsed.get("title") or "").strip()
    if title:
        out["title"] = title[:200]
    out["source"] = "llm"

    if module == "agenda":
        _clear_casa_fields(out)
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
        ck = parsed.get("casa_kind")
        if ck not in CASA_KINDS:
            ck = baseline.get("casa_kind")
        out["casa_kind"] = _refine_casa_kind(raw, ck if ck in CASA_KINDS else None)
        for key in ("casa_place", "casa_notes"):
            val = parsed.get(key)
            if val is not None and str(val).strip():
                out[key] = str(val).strip()[:200]
        if parsed.get("supply_kind") in SUPPLY_KIND:
            out["supply_kind"] = parsed["supply_kind"]
    else:
        _clear_agenda_fields(out)
        _clear_casa_fields(out)
        out["agenda_type"] = None

    return out


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


def archive(
    cur,
    user_id: str,
    text: str,
    *,
    capture_id: str | None = None,
) -> dict:
    raw = " ".join(text.strip().split())
    baseline = classify(raw)
    available, reason, settings = llm.can_use_llm(cur)
    if not available:
        baseline["source"] = baseline.get("source") or "rules"
        return _post_refine(baseline, raw, baseline)

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
    try:
        content, input_tokens, output_tokens, latency_ms = llm.openrouter_chat(
            model=settings["model"],
            messages=messages,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(content)
        result = _apply_llm(baseline, parsed, raw)
        success = True
    except Exception as exc:
        error = str(exc)[:500]
        result = dict(baseline)
        result["source"] = "rules"

    result = _post_refine(result, raw, baseline)

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
    if success:
        result["source"] = "llm"
    return result


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
