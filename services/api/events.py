"""Registro de actividad: auditoría y telemetría de producto. Crece con el proyecto."""

from __future__ import annotations

import json
import os
from typing import Any

import psycopg
from psycopg.rows import dict_row

PRODUCTS = frozenset({"web_app", "admin", "comercial", "api", "ios", "android"})
CLIENT_ACTIONS = frozenset({"screen.view", "session.start"})


def category_for(action: str) -> str:
    if action.startswith("auth."):
        return "auth"
    if action.startswith("screen.") or action.startswith("session."):
        return "navigation"
    if action.startswith("capture."):
        return "capture"
    if action.startswith("item."):
        return "item"
    if action.startswith("profile."):
        return "profile"
    if action.startswith("admin."):
        return "admin"
    if action.startswith("llm."):
        return "llm"
    return action.split(".", 1)[0] if "." in action else "general"


def client_ip(request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return ""


def parse_user_agent(ua: str) -> dict[str, str]:
    text = ua or ""
    lower = text.lower()
    os_name = "desconocido"
    if "iphone" in lower or "ipad" in lower:
        os_name = "iOS"
    elif "android" in lower:
        os_name = "Android"
    elif "mac os" in lower or "macintosh" in lower:
        os_name = "macOS"
    elif "windows" in lower:
        os_name = "Windows"
    elif "linux" in lower:
        os_name = "Linux"

    browser = "desconocido"
    if "firefox/" in lower:
        browser = "Firefox"
    elif "edg/" in lower:
        browser = "Edge"
    elif "chrome/" in lower:
        browser = "Chrome"
    elif "safari/" in lower:
        browser = "Safari"

    device = "escritorio"
    if "ipad" in lower or "tablet" in lower:
        device = "tablet"
    elif "mobile" in lower or "iphone" in lower or "android" in lower:
        device = "móvil"

    return {"os": os_name, "browser": browser, "device_type": device}


def _db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def _clean_meta(meta: dict[str, Any] | None) -> dict[str, Any]:
    if not meta:
        return {}
    try:
        return json.loads(json.dumps(meta, default=str))
    except (TypeError, ValueError):
        return {"raw": str(meta)}


def insert_event(
    *,
    action: str,
    product: str,
    request=None,
    screen: str | None = None,
    user_id: str | None = None,
    email: str | None = None,
    session_id: str | None = None,
    app_version: str | None = None,
    success: bool = True,
    meta: dict[str, Any] | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    if product not in PRODUCTS:
        product = "api"
    ua = user_agent or (request.headers.get("user-agent", "") if request else "")
    parsed = parse_user_agent(ua)
    addr = ip or (client_ip(request) if request else "")
    addr = addr or None

    try:
        with _db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO events (
                        action, category, product, screen, user_id, email, session_id,
                        ip, os, browser, device_type, user_agent, app_version, success, meta
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        NULLIF(%s, '')::inet, %s, %s, %s, %s, %s, %s, %s::jsonb
                    )
                    """,
                    (
                        action,
                        category_for(action),
                        product,
                        screen,
                        user_id,
                        email,
                        session_id,
                        addr,
                        parsed["os"],
                        parsed["browser"],
                        parsed["device_type"],
                        ua[:500] if ua else None,
                        app_version,
                        success,
                        json.dumps(_clean_meta(meta)),
                    ),
                )
            conn.commit()
    except Exception:
        pass


def log_from_request(
    request,
    action: str,
    *,
    product: str = "api",
    screen: str | None = None,
    user_id: str | None = None,
    email: str | None = None,
    app_version: str | None = None,
    success: bool = True,
    meta: dict[str, Any] | None = None,
) -> None:
    insert_event(
        action=action,
        product=product,
        request=request,
        screen=screen,
        user_id=user_id,
        email=email,
        app_version=app_version,
        success=success,
        meta=meta,
    )


def search_events(
    *,
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    category: str | None = None,
    product: str | None = None,
    email: str | None = None,
    q: str | None = None,
    from_ts: str | None = None,
    to_ts: str | None = None,
    success: bool | None = None,
) -> tuple[list[dict], int]:
    clauses = ["1=1"]
    params: list[Any] = []

    if action:
        clauses.append("action = %s")
        params.append(action)
    if category:
        clauses.append("category = %s")
        params.append(category)
    if product:
        clauses.append("product = %s")
        params.append(product)
    if email:
        clauses.append("email ILIKE %s")
        params.append(f"%{email.strip()}%")
    if from_ts:
        clauses.append("created_at >= %s::timestamptz")
        params.append(from_ts)
    if to_ts:
        clauses.append("created_at <= %s::timestamptz")
        params.append(to_ts)
    if success is not None:
        clauses.append("success = %s")
        params.append(success)
    if q:
        like = f"%{q.strip()}%"
        clauses.append(
            "(action ILIKE %s OR screen ILIKE %s OR email ILIKE %s OR meta::text ILIKE %s)"
        )
        params.extend([like, like, like, like])

    where = " AND ".join(clauses)
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS total FROM events WHERE {where}", params)
            total = int(cur.fetchone()["total"])
            cur.execute(
                f"""
                SELECT
                    id, created_at, action, category, product, screen,
                    user_id, email, ip::text AS ip, country, city,
                    os, browser, device_type, app_version, success, meta
                FROM events
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                [*params, limit, offset],
            )
            rows = cur.fetchall()
    return rows, total


def list_facets() -> dict[str, list[str]]:
    with _db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT action FROM events ORDER BY action LIMIT 200"
            )
            actions = [row["action"] for row in cur.fetchall()]
            cur.execute(
                "SELECT DISTINCT product FROM events ORDER BY product"
            )
            products = [row["product"] for row in cur.fetchall()]
            cur.execute(
                "SELECT DISTINCT category FROM events ORDER BY category"
            )
            categories = [row["category"] for row in cur.fetchall()]
    return {"actions": actions, "products": products, "categories": categories}
