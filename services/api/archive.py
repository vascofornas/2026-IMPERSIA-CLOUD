"""Archivado v2: reglas temporales + modelo OpenRouter + fallback a classify."""

from __future__ import annotations

import json
import re
from typing import Any

from classify import MODULES, classify, legacy_kind
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
- Comprar productos → casa.compra. Quedan N en casa → casa.inventario. Aspiradora, basura, lavadora → casa.domestica.
- Cita con fecha → agenda (ocio/familiar/medica/recordatorio), no diario.
- Reflexión o ánimo sin tarea → diario.
- Trabajo/reuniones → reuniones o proyectos según contexto."""


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


def _apply_llm(baseline: dict, parsed: dict) -> dict:
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
        out["casa_kind"] = ck if ck in CASA_KINDS else (baseline.get("casa_kind") or "otro")
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
        return baseline

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
        result = _apply_llm(baseline, parsed)
        success = True
    except Exception as exc:
        error = str(exc)[:500]
        result = dict(baseline)
        result["source"] = "rules"

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
    if before.get("module") == after.get("module") and before.get("agenda_type") == after.get("agenda_type"):
        if before.get("casa_kind") == after.get("casa_kind"):
            return
    label = _label_from_suggestion(after)
    label["corrected_from"] = {
        "module": before.get("module"),
        "agenda_type": before.get("agenda_type"),
        "casa_kind": before.get("casa_kind"),
    }
    record_correction(cur, user_id, raw_text, label)
