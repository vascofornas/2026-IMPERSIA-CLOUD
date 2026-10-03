"""Motor LLM: configuración, presupuestos, registro de uso y cliente OpenRouter."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

MODEL_PRESETS: dict[str, dict[str, float]] = {
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "google/gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "deepseek/deepseek-chat": {"input": 0.15, "output": 0.60},
    "qwen/qwen-2.5-72b-instruct": {"input": 0.15, "output": 0.40},
    "anthropic/claude-3.5-haiku": {"input": 1.00, "output": 5.00},
    "mistralai/mistral-small-3.1-24b-instruct": {"input": 0.15, "output": 0.60},
}

SETTINGS_SELECT = """
    enabled, provider, model, input_price_per_mtok, output_price_per_mtok,
    daily_budget_usd, monthly_budget_usd, updated_at
"""


def admin_email() -> str:
    return os.environ.get("ADMIN_EMAIL", "").strip().lower()


def is_admin_email(email: str) -> bool:
    target = admin_email()
    if not target:
        return False
    return email.strip().lower() == target


def api_key_configured() -> bool:
    return bool(os.environ.get("OPENROUTER_API_KEY", "").strip())


def _decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def compute_cost(input_tokens: int, output_tokens: int, settings: dict) -> Decimal:
    in_rate = _decimal(settings["input_price_per_mtok"]) / Decimal(1_000_000)
    out_rate = _decimal(settings["output_price_per_mtok"]) / Decimal(1_000_000)
    return (Decimal(input_tokens) * in_rate) + (Decimal(output_tokens) * out_rate)


def _public_settings(row: dict) -> dict:
    return {
        "enabled": bool(row["enabled"]),
        "provider": row["provider"],
        "model": row["model"],
        "input_price_per_mtok": float(row["input_price_per_mtok"]),
        "output_price_per_mtok": float(row["output_price_per_mtok"]),
        "daily_budget_usd": float(row["daily_budget_usd"]),
        "monthly_budget_usd": float(row["monthly_budget_usd"]),
        "updated_at": row["updated_at"].isoformat(),
    }


def ensure_settings(cur) -> dict:
    cur.execute(
        f"""
        INSERT INTO llm_settings (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
        RETURNING {SETTINGS_SELECT}
        """
    )
    row = cur.fetchone()
    if row:
        return row
    cur.execute(f"SELECT {SETTINGS_SELECT} FROM llm_settings WHERE id = 1")
    return cur.fetchone()


def get_settings(cur) -> dict:
    return _public_settings(ensure_settings(cur))


def apply_preset(model: str, settings: dict) -> dict:
    preset = MODEL_PRESETS.get(model)
    if not preset:
        return settings
    settings = dict(settings)
    settings["model"] = model
    settings["input_price_per_mtok"] = preset["input"]
    settings["output_price_per_mtok"] = preset["output"]
    return settings


def update_settings(cur, patch: dict) -> dict:
    current = ensure_settings(cur)
    merged = dict(current)
    for key in (
        "enabled",
        "provider",
        "model",
        "input_price_per_mtok",
        "output_price_per_mtok",
        "daily_budget_usd",
        "monthly_budget_usd",
    ):
        if key in patch and patch[key] is not None:
            merged[key] = patch[key]
    if patch.get("model") and patch.get("use_preset_prices", True):
        merged = apply_preset(patch["model"], merged)
    cur.execute(
        """
        UPDATE llm_settings
        SET enabled = %s,
            provider = %s,
            model = %s,
            input_price_per_mtok = %s,
            output_price_per_mtok = %s,
            daily_budget_usd = %s,
            monthly_budget_usd = %s,
            updated_at = now()
        WHERE id = 1
        RETURNING enabled, provider, model, input_price_per_mtok, output_price_per_mtok,
                  daily_budget_usd, monthly_budget_usd, updated_at
        """,
        (
            bool(merged["enabled"]),
            str(merged["provider"])[:40],
            str(merged["model"])[:120],
            float(merged["input_price_per_mtok"]),
            float(merged["output_price_per_mtok"]),
            float(merged["daily_budget_usd"]),
            float(merged["monthly_budget_usd"]),
        ),
    )
    return _public_settings(cur.fetchone())


def _period_bounds(now: datetime | None = None) -> tuple[datetime, datetime, datetime, datetime]:
    now = now or datetime.now(MADRID)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return day_start, now, month_start, now


def spend_summary(cur, settings: dict | None = None) -> dict:
    settings = settings or ensure_settings(cur)
    day_start, _, month_start, _ = _period_bounds()
    cur.execute(
        """
        SELECT
            COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= %s), 0) AS today_usd,
            COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= %s), 0) AS month_usd,
            COUNT(*) FILTER (WHERE created_at >= %s) AS calls_today,
            COUNT(*) FILTER (WHERE created_at >= %s) AS calls_month,
            COUNT(*) FILTER (WHERE created_at >= %s AND success) AS ok_today,
            AVG(latency_ms) FILTER (WHERE created_at >= %s AND success) AS avg_latency_today
        FROM llm_usage
        """,
        (day_start, month_start, day_start, month_start, day_start, day_start),
    )
    row = cur.fetchone()
    today = float(row["today_usd"] or 0)
    month = float(row["month_usd"] or 0)
    daily_budget = float(settings["daily_budget_usd"])
    monthly_budget = float(settings["monthly_budget_usd"])
    calls_today = int(row["calls_today"] or 0)
    ok_today = int(row["ok_today"] or 0)
    success_rate = round((ok_today / calls_today) * 100, 1) if calls_today else 100.0
    return {
        "today_usd": round(today, 6),
        "month_usd": round(month, 6),
        "daily_remaining_usd": round(max(daily_budget - today, 0), 6),
        "monthly_remaining_usd": round(max(monthly_budget - month, 0), 6),
        "daily_budget_exhausted": today >= daily_budget,
        "monthly_budget_exhausted": month >= monthly_budget,
        "calls_today": calls_today,
        "calls_month": int(row["calls_month"] or 0),
        "success_rate_today": success_rate,
        "avg_latency_ms_today": round(float(row["avg_latency_today"]), 1) if row["avg_latency_today"] is not None else None,
    }


def operational_status(settings: dict, spend: dict) -> dict:
    if not settings["enabled"]:
        return {"llm_available": False, "reason": "disabled"}
    if not api_key_configured():
        return {"llm_available": False, "reason": "no_key"}
    if spend["daily_budget_exhausted"]:
        return {"llm_available": False, "reason": "daily_budget"}
    if spend["monthly_budget_exhausted"]:
        return {"llm_available": False, "reason": "monthly_budget"}
    return {"llm_available": True, "reason": "ok"}


def can_use_llm(cur) -> tuple[bool, str, dict]:
    settings_row = ensure_settings(cur)
    settings = _public_settings(settings_row)
    spend = spend_summary(cur, settings_row)
    status = operational_status(settings, spend)
    return status["llm_available"], status["reason"], settings


def log_usage(
    cur,
    *,
    user_id: str | None,
    capture_id: str | None,
    provider: str,
    model: str,
    purpose: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: Decimal | float,
    latency_ms: int | None,
    success: bool,
    error_message: str | None = None,
    fallback_used: bool = False,
) -> dict:
    cur.execute(
        """
        INSERT INTO llm_usage
            (user_id, capture_id, provider, model, purpose, input_tokens, output_tokens,
             cost_usd, latency_ms, success, error_message, fallback_used)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, provider, model, purpose, input_tokens, output_tokens, cost_usd,
                  latency_ms, success, error_message, fallback_used, created_at
        """,
        (
            user_id,
            capture_id,
            provider[:40],
            model[:120],
            purpose[:40],
            max(input_tokens, 0),
            max(output_tokens, 0),
            float(cost_usd),
            latency_ms,
            success,
            (error_message or "")[:500] or None,
            fallback_used,
        ),
    )
    row = cur.fetchone()
    return _public_usage(row)


def _public_usage(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "provider": row["provider"],
        "model": row["model"],
        "purpose": row["purpose"],
        "input_tokens": row["input_tokens"],
        "output_tokens": row["output_tokens"],
        "cost_usd": float(row["cost_usd"]),
        "latency_ms": row["latency_ms"],
        "success": bool(row["success"]),
        "error_message": row.get("error_message"),
        "fallback_used": bool(row.get("fallback_used")),
        "created_at": row["created_at"].isoformat(),
    }


def list_usage(cur, *, limit: int = 50, offset: int = 0) -> tuple[list[dict], int]:
    limit = max(1, min(limit, 200))
    offset = max(0, offset)
    cur.execute("SELECT COUNT(*) AS total FROM llm_usage")
    total = int(cur.fetchone()["total"])
    cur.execute(
        """
        SELECT id, provider, model, purpose, input_tokens, output_tokens, cost_usd,
               latency_ms, success, error_message, fallback_used, created_at
        FROM llm_usage
        ORDER BY created_at DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    )
    return [_public_usage(row) for row in cur.fetchall()], total


def openrouter_chat(
    *,
    model: str,
    messages: list[dict],
    response_format: dict | None = None,
    timeout: float = 45.0,
) -> tuple[str, int, int, int]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Falta OPENROUTER_API_KEY en el servidor")
    base = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    body: dict = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
    }
    if response_format:
        body["response_format"] = response_format
    payload = json.dumps(body).encode()
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.environ.get("OPENROUTER_SITE_URL", "https://impersia.cloud"),
        "X-Title": os.environ.get("OPENROUTER_APP_NAME", "Impersia OS"),
    }
    started = time.perf_counter()
    request = urllib.request.Request(f"{base}/chat/completions", data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        raise RuntimeError(f"OpenRouter {exc.code}: {detail[:300]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenRouter sin conexión: {exc.reason}") from exc
    latency_ms = int((time.perf_counter() - started) * 1000)
    usage = raw.get("usage") or {}
    input_tokens = int(usage.get("prompt_tokens") or 0)
    output_tokens = int(usage.get("completion_tokens") or 0)
    choices = raw.get("choices") or []
    if not choices:
        raise RuntimeError("OpenRouter devolvió una respuesta vacía")
    content = choices[0].get("message", {}).get("content") or ""
    return content, input_tokens, output_tokens, latency_ms


def run_health_test(cur, *, user_id: str | None) -> dict:
    settings_row = ensure_settings(cur)
    settings = _public_settings(settings_row)
    if not api_key_configured():
        raise RuntimeError("Configura OPENROUTER_API_KEY en el servidor")
    messages = [
        {
            "role": "system",
            "content": (
                "Eres el clasificador de Impersia. Responde solo JSON válido con las claves "
                'module, axis y title. axis es personal, professional o social.'
            ),
        },
        {
            "role": "user",
            "content": 'Frase: "comprar leche y pan". Responde en json.',
        },
    ]
    started_reason = None
    try:
        content, input_tokens, output_tokens, latency_ms = openrouter_chat(
            model=settings["model"],
            messages=messages,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(content)
        success = bool(parsed.get("module") and parsed.get("title"))
        error = None if success else "JSON incompleto"
    except Exception as exc:
        content = ""
        input_tokens = 0
        output_tokens = 0
        latency_ms = 0
        parsed = {}
        success = False
        error = str(exc)
        started_reason = error
    cost = compute_cost(input_tokens, output_tokens, settings_row)
    row = log_usage(
        cur,
        user_id=user_id,
        capture_id=None,
        provider=settings["provider"],
        model=settings["model"],
        purpose="health_test",
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cost_usd=cost,
        latency_ms=latency_ms,
        success=success,
        error_message=error,
    )
    if not success:
        raise RuntimeError(started_reason or "La prueba falló")
    return {
        "ok": True,
        "sample": parsed,
        "usage": row,
        "cost_usd": float(cost),
    }


def overview(cur) -> dict:
    settings_row = ensure_settings(cur)
    settings = _public_settings(settings_row)
    spend = spend_summary(cur, settings_row)
    status = operational_status(settings, spend)
    return {
        "settings": settings,
        "presets": [{"model": key, **value} for key, value in MODEL_PRESETS.items()],
        "access": {
            "api_key_configured": api_key_configured(),
            "admin_email_set": bool(admin_email()),
        },
        "spend": spend,
        "operational": status,
    }
