from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import hashlib
import hmac
import json
import re
import os
import base64
import time
import urllib.error
import urllib.parse
import urllib.request

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import psycopg
from psycopg.rows import dict_row

from admin_events import router as admin_events_router
from admin_llm import router as admin_llm_router
import archive
import dedup
import health_controls
from classify import (
    HABIT_KINDS,
    HABIT_ROLES,
    MODULES,
    classify,
    compra_store_name,
    habit_meta,
    legacy_kind,
    looks_like_habit_log,
    split_compra_titles,
)
import events
import llm

app = FastAPI(title="Impersia API")
app.include_router(admin_llm_router)
app.include_router(admin_events_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://impersia.cloud",
        "https://admin.impersia.cloud",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)

KINDS = {"note", "task", "event"}
PERSON_FOR = {"self", "child", "parent", "grandparent", "nephew", "other"}
CELEBRATION_FOR = PERSON_FOR | {"friend"}
FAMILY_KIND = {"cumpleanos", "aniversario", "boda", "bautizo", "comunion", "comida", "otro"}
LEISURE_KIND = {"cine", "restaurante", "concierto", "teatro", "deporte", "excursion", "quedar", "otro"}
LEISURE_WITH = {"solo", "partner", "friends", "family", "other"}
REMINDER_KIND = {"itv", "seguro", "impuesto", "documento", "hogar", "otro"}
CASA_KIND = {"compra", "mantenimiento", "suministro", "domestica", "inventario", "otro"}
SUPPLY_KIND = {"luz", "agua", "gas", "internet", "otro"}
LOOKS = {"claro", "papel", "mar", "cielo", "oliva", "arena", "violeta", "tinta", "noche", "grafito"}
COOKIE = "impersia_session"

ITEM_SELECT = """
    id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
    agenda_type, medical_for, medical_name, medical_place, medical_notes,
    family_kind, family_for, family_name, family_place, family_notes,
    leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
    reminder_kind, reminder_place, reminder_notes,
    casa_kind, casa_place, casa_notes, supply_kind,
    habit_role, habit_kind, habit_notes, health_control_id,
    shopping_list_id, status, privacy, created_at
"""


def db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split(":")
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return hmac.compare_digest(digest.hex(), digest_hex)


def make_token(user_id: str) -> str:
    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + 14 * 86400}).encode())
    secret = os.environ["JWT_SECRET"].encode()
    signature = _b64(hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def read_token(token: str) -> str | None:
    try:
        header, payload, signature = token.split(".")
    except ValueError:
        return None
    secret = os.environ["JWT_SECRET"].encode()
    expected = _b64(hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, signature):
        return None
    data = json.loads(_unb64(payload))
    if data.get("exp", 0) < time.time():
        return None
    return data.get("sub")


def current_user(request: Request) -> str:
    user_id = read_token(request.cookies.get(COOKIE, ""))
    if not user_id:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return user_id


def optional_user(request: Request) -> tuple[str | None, str | None]:
    user_id = read_token(request.cookies.get(COOKIE, ""))
    if not user_id:
        return None, None
    try:
        return user_id, read_user_email(user_id)
    except HTTPException:
        return None, None


def read_user_email(user_id: str) -> str:
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return row["email"]


def public_account(user_id: str, email: str, look: str, alert_email: bool = False) -> dict:
    account = _account(user_id, email, look, alert_email)
    if not llm.is_admin_email(email):
        account.pop("is_admin", None)
    return account


def set_session(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE,
        make_token(user_id),
        max_age=14 * 86400,
        httponly=True,
        secure=True,
        samesite="lax",
        domain=".impersia.cloud",
        path="/",
    )


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class CaptureIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ConfirmIn(BaseModel):
    kind: str
    title: str = Field(min_length=1, max_length=200)
    starts_at: str | None = None
    time_known: bool = False


class ItemPatch(BaseModel):
    module: str
    title: str = Field(min_length=1, max_length=200)
    starts_at: str | None = None
    time_known: bool = False
    alert_minutes_before: int | None = None
    agenda_type: str | None = None
    medical_for: str | None = None
    medical_name: str | None = None
    medical_place: str | None = None
    medical_notes: str | None = None
    family_kind: str | None = None
    family_for: str | None = None
    family_name: str | None = None
    family_place: str | None = None
    family_notes: str | None = None
    leisure_kind: str | None = None
    leisure_with: str | None = None
    leisure_name: str | None = None
    leisure_place: str | None = None
    leisure_notes: str | None = None
    reminder_kind: str | None = None
    reminder_place: str | None = None
    reminder_notes: str | None = None
    casa_kind: str | None = None
    casa_place: str | None = None
    casa_notes: str | None = None
    supply_kind: str | None = None
    habit_role: str | None = None
    habit_kind: str | None = None
    habit_notes: str | None = None
    repeats: str | None = None


class HealthReadingIn(BaseModel):
    systolic: int | None = None
    diastolic: int | None = None
    mg_dl: int | None = None
    kg: float | None = None
    taken: bool | None = True
    note: str | None = None


class StatusIn(BaseModel):
    status: str


class ExceptionIn(BaseModel):
    kind: str
    title: str | None = None
    module: str | None = None
    starts_at: str | None = None
    time_known: bool | None = None


class ShoppingListPatch(BaseModel):
    store_name: str | None = None


class MePatch(BaseModel):
    look: str | None = None
    alert_email: bool | None = None


class ClientEventIn(BaseModel):
    action: str = Field(max_length=80)
    product: str = Field(max_length=40)
    screen: str | None = Field(default=None, max_length=120)
    app_version: str | None = Field(default=None, max_length=40)
    meta: dict = Field(default_factory=dict)


@app.get("/health")
def health(response: Response):
    try:
        with db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
    except Exception:
        response.status_code = 503
        return {"status": "error", "database": "error"}
    return {"status": "ok", "database": "ok"}


def _account(user_id: str, email: str, look: str, alert_email: bool = False) -> dict:
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT google_email FROM google_links WHERE user_id = %s", (user_id,))
            link = cur.fetchone()
    return {
        "email": email,
        "look": look if look in LOOKS else "claro",
        "alert_email": bool(alert_email),
        "google_email": link["google_email"] if link else None,
        "is_admin": llm.is_admin_email(email),
    }


@app.post("/auth/register", status_code=201)
def register(body: Credentials, response: Response, request: Request):
    if llm.registration_locked():
        events.log_from_request(
            request,
            "auth.register.denied",
            email=body.email.lower(),
            success=False,
            meta={"reason": "locked"},
        )
        raise HTTPException(status_code=403, detail="Registro cerrado")
    email = body.email.lower()
    try:
        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                    (email, hash_password(body.password)),
                )
                user_id = str(cur.fetchone()["id"])
            conn.commit()
    except psycopg.errors.UniqueViolation:
        events.log_from_request(
            request,
            "auth.register.denied",
            email=email,
            success=False,
            meta={"reason": "duplicate"},
        )
        raise HTTPException(status_code=409, detail="Ese correo ya tiene cuenta")
    set_session(response, user_id)
    events.log_from_request(
        request,
        "auth.register.success",
        user_id=user_id,
        email=email,
    )
    return public_account(user_id, email, "claro", False)


@app.post("/auth/login")
def login(body: Credentials, response: Response, request: Request):
    email = body.email.lower()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash, look, alert_email FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        events.log_from_request(
            request,
            "auth.login.failed",
            email=email,
            success=False,
        )
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    user_id = str(row["id"])
    set_session(response, user_id)
    events.log_from_request(
        request,
        "auth.login.success",
        user_id=user_id,
        email=email,
        meta={"admin": llm.is_admin_email(email)},
    )
    return public_account(user_id, email, row["look"], row.get("alert_email", False))


@app.post("/auth/logout")
def logout(response: Response, request: Request):
    user_id, email = optional_user(request)
    response.delete_cookie(COOKIE, domain=".impersia.cloud", path="/")
    events.log_from_request(
        request,
        "auth.logout",
        user_id=user_id,
        email=email,
    )
    return {"ok": True}


@app.post("/events", status_code=202)
def ingest_event(body: ClientEventIn, request: Request):
    if body.action not in events.CLIENT_ACTIONS:
        raise HTTPException(status_code=422, detail="Acción no permitida")
    if body.product not in events.PRODUCTS:
        raise HTTPException(status_code=422, detail="Producto no válido")
    user_id, email = optional_user(request)
    events.log_from_request(
        request,
        body.action,
        product=body.product,
        screen=body.screen,
        user_id=user_id,
        email=email,
        app_version=body.app_version,
        meta=body.meta,
    )
    return {"ok": True}


@app.get("/me")
def me(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, look, alert_email FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return public_account(user_id, row["email"], row["look"], row["alert_email"])


@app.patch("/me")
def patch_me(body: MePatch, request: Request):
    user_id = current_user(request)
    if body.look is None and body.alert_email is None:
        raise HTTPException(status_code=422, detail="Nada que cambiar")
    if body.look is not None and body.look not in LOOKS:
        raise HTTPException(status_code=400, detail="Esa apariencia no existe")
    updates = []
    params = []
    if body.look is not None:
        updates.append("look = %s")
        params.append(body.look)
    if body.alert_email is not None:
        updates.append("alert_email = %s")
        params.append(body.alert_email)
    params.append(user_id)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s RETURNING email, look, alert_email",
                params,
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    events.log_from_request(
        request,
        "profile.update",
        user_id=user_id,
        email=row["email"],
        meta={"look": body.look, "alert_email": body.alert_email},
    )
    return public_account(user_id, row["email"], row["look"], row["alert_email"])


APP_HOME = "https://impersia.cloud/app/#agenda"
MADRID = ZoneInfo("Europe/Madrid")


def _google_state(user_id: str) -> str:
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + 600}).encode())
    secret = os.environ["JWT_SECRET"].encode()
    signature = _b64(hmac.new(secret, payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{signature}"


def _read_google_state(state: str) -> str | None:
    try:
        payload, signature = state.split(".")
    except ValueError:
        return None
    secret = os.environ["JWT_SECRET"].encode()
    expected = _b64(hmac.new(secret, payload.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(expected, signature):
        return None
    data = json.loads(_unb64(payload))
    if data.get("exp", 0) < time.time():
        return None
    return data.get("sub")


def _google_post(fields: dict) -> dict:
    body = urllib.parse.urlencode(fields).encode()
    request = urllib.request.Request("https://oauth2.googleapis.com/token", data=body, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def _google_get(url: str, access_token: str) -> dict:
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {access_token}"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def _access_token(refresh_token: str) -> str:
    data = _google_post({
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    })
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Google no ha devuelto acceso")
    return token


@app.get("/auth/google/start")
def google_start(request: Request):
    try:
        user_id = current_user(request)
    except HTTPException:
        return RedirectResponse("https://impersia.cloud/app/#hoy")
    query = urllib.parse.urlencode(
        {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
            "response_type": "code",
            "scope": "openid email https://www.googleapis.com/auth/calendar.readonly",
            "access_type": "offline",
            "prompt": "consent select_account",
            "include_granted_scopes": "true",
            "state": _google_state(user_id),
        },
        quote_via=urllib.parse.quote,
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}")


@app.get("/auth/google/callback")
def google_callback(code: str = "", state: str = ""):
    user_id = _read_google_state(state)
    if not user_id or not code:
        return RedirectResponse(APP_HOME)
    try:
        tokens = _google_post({
            "code": code,
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": os.environ["GOOGLE_REDIRECT_URI"],
            "grant_type": "authorization_code",
        })
        refresh = tokens.get("refresh_token")
        access = tokens.get("access_token")
        granted = tokens.get("scope") or ""
        if not access or "calendar.readonly" not in granted:
            return RedirectResponse("https://impersia.cloud/app/?google=permiso#agenda")
        profile = _google_get("https://www.googleapis.com/oauth2/v2/userinfo", access)
        email = profile.get("email")
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, KeyError):
        return RedirectResponse(APP_HOME)
    with db() as conn:
        with conn.cursor() as cur:
            if refresh:
                cur.execute(
                    """
                    INSERT INTO google_links (user_id, google_email, refresh_token)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) DO UPDATE
                        SET google_email = EXCLUDED.google_email,
                            refresh_token = EXCLUDED.refresh_token
                    """,
                    (user_id, email, refresh),
                )
            else:
                cur.execute(
                    "UPDATE google_links SET google_email = %s WHERE user_id = %s",
                    (email, user_id),
                )
        conn.commit()
    return RedirectResponse(APP_HOME)


@app.get("/google/events")
def google_events(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT refresh_token FROM google_links WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        return []
    try:
        access = _access_token(row["refresh_token"])
        start = datetime.now(MADRID).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=60)
        query = urllib.parse.urlencode({
            "timeMin": start.isoformat(),
            "timeMax": end.isoformat(),
            "singleEvents": "true",
            "orderBy": "startTime",
            "maxResults": "50",
        })
        data = _google_get(
            f"https://www.googleapis.com/calendar/v3/calendars/primary/events?{query}",
            access,
        )
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, HTTPException):
        raise HTTPException(status_code=502, detail="No se ha podido leer Google Calendar")
    events = []
    for event in data.get("items", []):
        start_at = event.get("start", {})
        end_at = event.get("end", {})
        all_day = "date" in start_at and "dateTime" not in start_at
        events.append({
            "id": event.get("id"),
            "title": event.get("summary") or "(sin título)",
            "starts_at": _google_when(start_at, all_day),
            "ends_at": _google_when(end_at, all_day),
            "all_day": all_day,
            "source": "google",
        })
    return events


def _google_when(value: dict, all_day: bool) -> str | None:
    if value.get("dateTime"):
        return value["dateTime"]
    if value.get("date"):
        return f"{value['date']}T00:00:00"
    return None


def _ensure_active_shopping_list(cur, user_id: str) -> dict:
    cur.execute(
        """
        SELECT id, store_name, store_lat, store_lng, status
        FROM shopping_lists
        WHERE user_id = %s AND status = 'active'
        """,
        (user_id,),
    )
    row = cur.fetchone()
    if row:
        return row
    cur.execute(
        """
        INSERT INTO shopping_lists (user_id, status)
        VALUES (%s, 'active')
        RETURNING id, store_name, store_lat, store_lng, status
        """,
        (user_id,),
    )
    return cur.fetchone()


def _public_shopping_list(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "store_name": row.get("store_name"),
        "store_lat": row.get("store_lat"),
        "store_lng": row.get("store_lng"),
        "status": row.get("status") or "active",
    }


def _insert_item(cur, user_id: str, capture_id: str, suggestion: dict, *, title: str | None = None, shopping_list_id: str | None = None, casa_place: str | None = None) -> dict:
    cur.execute(
        f"""
        INSERT INTO items
            (user_id, capture_id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
             agenda_type, medical_for, medical_name, medical_place, medical_notes,
             family_kind, family_for, family_name, family_place, family_notes,
             leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
             reminder_kind, reminder_place, reminder_notes,
             casa_kind, casa_place, casa_notes, supply_kind,
             habit_role, habit_kind, habit_notes,
             shopping_list_id, privacy, archived_source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'private', %s)
        RETURNING {ITEM_SELECT}
        """,
        (
            user_id,
            capture_id,
            suggestion["kind"],
            suggestion["axis"],
            suggestion["module"],
            title or suggestion["title"],
            suggestion["starts_at"],
            suggestion.get("repeats"),
            suggestion["time_known"],
            suggestion.get("alert_minutes_before"),
            suggestion.get("agenda_type"),
            suggestion.get("medical_for"),
            suggestion.get("medical_name"),
            suggestion.get("medical_place"),
            suggestion.get("medical_notes"),
            suggestion.get("family_kind"),
            suggestion.get("family_for"),
            suggestion.get("family_name"),
            suggestion.get("family_place"),
            suggestion.get("family_notes"),
            suggestion.get("leisure_kind"),
            suggestion.get("leisure_with"),
            suggestion.get("leisure_name"),
            suggestion.get("leisure_place"),
            suggestion.get("leisure_notes"),
            suggestion.get("reminder_kind"),
            suggestion.get("reminder_place"),
            suggestion.get("reminder_notes"),
            suggestion.get("casa_kind"),
            casa_place if casa_place is not None else suggestion.get("casa_place"),
            suggestion.get("casa_notes"),
            suggestion.get("supply_kind"),
            suggestion.get("habit_role"),
            suggestion.get("habit_kind"),
            suggestion.get("habit_notes"),
            shopping_list_id,
            suggestion.get("source"),
        ),
    )
    return cur.fetchone()


def _file_suggestion(
    cur,
    user_id: str,
    capture_id: str,
    suggestion: dict,
    *,
    title: str | None = None,
    shopping_list_id: str | None = None,
    casa_place: str | None = None,
    batch_seen: set[tuple] | None = None,
) -> tuple[dict | None, bool]:
    title_val = (title or suggestion.get("title") or "").strip()
    probe = dict(suggestion)
    if shopping_list_id:
        probe["shopping_list_id"] = shopping_list_id
    fp = dedup.fingerprint(probe, title=title_val)
    if batch_seen is not None:
        if fp in batch_seen:
            return None, True
        batch_seen.add(fp)

    existing = dedup.find_duplicate(cur, user_id, probe, title=title_val)
    if existing:
        row = dedup.merge_existing(cur, user_id, capture_id, suggestion, existing)
        item = _public_item(row)
        item["dedupe_action"] = "merged"
        return item, True

    row = _insert_item(
        cur,
        user_id,
        capture_id,
        suggestion,
        title=title,
        shopping_list_id=shopping_list_id,
        casa_place=casa_place,
    )
    return _public_item(row), False


@app.get("/shopping-lists/active")
def get_active_shopping_list(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            row = _ensure_active_shopping_list(cur, user_id)
        conn.commit()
    return _public_shopping_list(row)


@app.patch("/shopping-lists/active")
def patch_active_shopping_list(body: ShoppingListPatch, request: Request):
    user_id = current_user(request)
    store_name = (body.store_name or "").strip() or None
    with db() as conn:
        with conn.cursor() as cur:
            list_row = _ensure_active_shopping_list(cur, user_id)
            cur.execute(
                """
                UPDATE shopping_lists
                SET store_name = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, store_name, store_lat, store_lng, status
                """,
                (store_name, list_row["id"], user_id),
            )
            row = cur.fetchone()
        conn.commit()
    return _public_shopping_list(row)


@app.post("/captures", status_code=201)
def create_capture(body: CaptureIn, request: Request):
    user_id = current_user(request)
    raw = body.text.strip()
    with db() as conn:
        with conn.cursor() as cur:
            suggestions = archive.archive_items(cur, user_id, raw)
            primary = suggestions[0]
            cur.execute(
                """
                INSERT INTO captures
                    (user_id, raw_text, suggested_kind, suggested_title, suggested_starts_at, source, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'filed')
                RETURNING id
                """,
                (
                    user_id,
                    raw,
                    primary["kind"],
                    primary["title"],
                    primary["starts_at"],
                    primary["source"],
                ),
            )
            capture_id = str(cur.fetchone()["id"])
            list_row = None
            created = []
            created_controls = []
            batch_seen: set[tuple] = set()
            deduped = 0
            for suggestion in suggestions:
                if suggestion.get("health_control"):
                    row = health_controls.insert_control(
                        cur, user_id, capture_id, suggestion["health_control"]
                    )
                    today = datetime.now(ZoneInfo("Europe/Madrid")).date()
                    done = health_controls.logs_for_day(cur, user_id, str(row["id"]), today)
                    created_controls.append(health_controls.public_control(row, done_today=done))
                    continue
                shopping_list_id = None
                casa_place = None
                title_override = None
                if suggestion.get("module") == "casa" and suggestion.get("casa_kind") == "compra":
                    if list_row is None:
                        list_row = _ensure_active_shopping_list(cur, user_id)
                        store = compra_store_name(raw) or suggestion.get("casa_place")
                        if store and not list_row.get("store_name"):
                            cur.execute(
                                """
                                UPDATE shopping_lists
                                SET store_name = %s
                                WHERE id = %s
                                RETURNING id, store_name, store_lat, store_lng, status
                                """,
                                (store, list_row["id"]),
                            )
                            list_row = cur.fetchone()
                    shopping_list_id = str(list_row["id"])
                    title_override = suggestion.get("title")
                item, was_deduped = _file_suggestion(
                    cur,
                    user_id,
                    capture_id,
                    suggestion,
                    title=title_override,
                    shopping_list_id=shopping_list_id,
                    casa_place=casa_place,
                    batch_seen=batch_seen,
                )
                if item is None:
                    deduped += 1
                    continue
                if was_deduped:
                    deduped += 1
                created.append(item)
        conn.commit()
    email = read_user_email(user_id)
    events.log_from_request(
        request,
        "capture.create",
        user_id=user_id,
        email=email,
        meta={
            "capture_id": capture_id,
            "module": primary.get("module"),
            "kind": primary.get("kind"),
            "items": len(created),
            "deduped": deduped,
            "source": primary.get("source"),
        },
    )
    return {"items": created, "health_controls": created_controls, "deduped": deduped}


@app.get("/health-controls")
def list_health_controls(request: Request):
    user_id = current_user(request)
    today = datetime.now(ZoneInfo("Europe/Madrid")).date()
    with db() as conn:
        with conn.cursor() as cur:
            rows = health_controls.list_controls(cur, user_id)
            out = []
            for row in rows:
                cid = str(row["id"])
                done = health_controls.logs_for_day(cur, user_id, cid, today)
                out.append(health_controls.public_control(row, done_today=done))
    return out


@app.post("/health-controls/{control_id}/readings", status_code=201)
def create_health_reading(control_id: str, body: HealthReadingIn, request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, kind, title, repeats, reminder_time, alert_minutes_before, status, created_at
                FROM health_controls
                WHERE id = %s AND user_id = %s AND status = 'active'
                """,
                (control_id, user_id),
            )
            control = cur.fetchone()
            if not control:
                raise HTTPException(status_code=404, detail="No encontramos ese control de salud")
            control = dict(control)
            kind = control["kind"]
            payload = body.model_dump()
            if kind == "presion":
                if body.systolic is None or body.diastolic is None:
                    raise HTTPException(status_code=422, detail="Indica sistólica y diastólica")
            elif kind == "glucosa":
                if body.mg_dl is None:
                    raise HTTPException(status_code=422, detail="Indica la glucosa en mg/dL")
            elif kind == "peso":
                if body.kg is None:
                    raise HTTPException(status_code=422, detail="Indica el peso en kg")
            row = health_controls.insert_reading(cur, user_id, control, payload)
            item = _fetch_item(cur, str(row["id"]), user_id)
        conn.commit()
    return item


@app.post("/captures/{capture_id}/confirm", status_code=201)
def confirm_capture(capture_id: str, body: ConfirmIn, request: Request):
    user_id = current_user(request)
    if body.kind not in KINDS:
        raise HTTPException(status_code=422, detail="El tipo tiene que ser nota, tarea o cita")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM captures
                WHERE id = %s AND user_id = %s AND status = 'pending'
                """,
                (capture_id, user_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Esa propuesta ya no está pendiente")
            cur.execute(
                """
                INSERT INTO items (user_id, capture_id, kind, axis, module, title, starts_at, time_known, privacy)
                VALUES (%s, %s, %s, 'personal', 'diario', %s, %s, %s, 'private')
                RETURNING id, kind, axis, module, title, starts_at, time_known, privacy, created_at
                """,
                (
                    user_id,
                    capture_id,
                    body.kind,
                    body.title.strip(),
                    _when_saving(body.starts_at, body.time_known),
                    body.time_known,
                ),
            )
            item = cur.fetchone()
            cur.execute("UPDATE captures SET status = 'confirmed' WHERE id = %s", (capture_id,))
        conn.commit()
    return _public_item(item)


def _agenda_fields(body: ItemPatch) -> dict:
    empty = {
        "agenda_type": None,
        "medical_for": None,
        "medical_name": None,
        "medical_place": None,
        "medical_notes": None,
        "family_kind": None,
        "family_for": None,
        "family_name": None,
        "family_place": None,
        "family_notes": None,
        "leisure_kind": None,
        "leisure_with": None,
        "leisure_name": None,
        "leisure_place": None,
        "leisure_notes": None,
        "reminder_kind": None,
        "reminder_place": None,
        "reminder_notes": None,
    }
    if body.module != "agenda":
        return empty
    agenda_type = body.agenda_type if body.agenda_type in {"medica", "familiar", "ocio", "recordatorio"} else None
    if agenda_type == "medica":
        medical_for = body.medical_for if body.medical_for in PERSON_FOR else "self"
        medical_name = (body.medical_name or "").strip() or None
        if medical_for == "self":
            medical_name = None
        return {
            **empty,
            "agenda_type": "medica",
            "medical_for": medical_for,
            "medical_name": medical_name,
            "medical_place": (body.medical_place or "").strip() or None,
            "medical_notes": (body.medical_notes or "").strip() or None,
        }
    if agenda_type == "familiar":
        family_for = body.family_for if body.family_for in CELEBRATION_FOR else "self"
        family_name = (body.family_name or "").strip() or None
        if family_for == "self":
            family_name = None
        return {
            **empty,
            "agenda_type": "familiar",
            "family_kind": body.family_kind if body.family_kind in FAMILY_KIND else "otro",
            "family_for": family_for,
            "family_name": family_name,
            "family_place": (body.family_place or "").strip() or None,
            "family_notes": (body.family_notes or "").strip() or None,
        }
    if agenda_type == "ocio":
        leisure_with = body.leisure_with if body.leisure_with in LEISURE_WITH else "solo"
        leisure_name = (body.leisure_name or "").strip() or None
        if leisure_with in {"solo", "partner", "family"}:
            leisure_name = None
        return {
            **empty,
            "agenda_type": "ocio",
            "leisure_kind": body.leisure_kind if body.leisure_kind in LEISURE_KIND else "otro",
            "leisure_with": leisure_with,
            "leisure_name": leisure_name,
            "leisure_place": (body.leisure_place or "").strip() or None,
            "leisure_notes": (body.leisure_notes or "").strip() or None,
        }
    if agenda_type == "recordatorio":
        return {
            **empty,
            "agenda_type": "recordatorio",
            "reminder_kind": body.reminder_kind if body.reminder_kind in REMINDER_KIND else "otro",
            "reminder_place": (body.reminder_place or "").strip() or None,
            "reminder_notes": (body.reminder_notes or "").strip() or None,
        }
    return empty


def _habit_fields(body: ItemPatch) -> dict:
    empty = {"habit_role": None, "habit_kind": None, "habit_notes": None}
    if body.module != "habitos":
        return empty
    role = body.habit_role if body.habit_role in HABIT_ROLES else "routine"
    kind = body.habit_kind if body.habit_kind in HABIT_KINDS else "otro"
    return {
        "habit_role": role,
        "habit_kind": kind,
        "habit_notes": (body.habit_notes or "").strip() or None,
    }


def _casa_fields(body: ItemPatch) -> dict:
    empty = {"casa_kind": None, "casa_place": None, "casa_notes": None, "supply_kind": None}
    if body.module != "casa":
        return empty
    kind = body.casa_kind if body.casa_kind != "limpieza" else "domestica"
    supply = None
    if kind == "suministro":
        supply = body.supply_kind if body.supply_kind in SUPPLY_KIND else "otro"
    return {
        "casa_kind": kind if kind in CASA_KIND else "otro",
        "casa_place": (body.casa_place or "").strip() or None,
        "casa_notes": (body.casa_notes or "").strip() or None,
        "supply_kind": supply,
    }


@app.patch("/items/{item_id}")
def patch_item(item_id: str, body: ItemPatch, request: Request):
    user_id = current_user(request)
    if body.module not in MODULES:
        raise HTTPException(status_code=422, detail="Ese módulo no existe")
    extra = _agenda_fields(body)
    casa = _casa_fields(body)
    habit = _habit_fields(body)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT capture_id, {ITEM_SELECT}
                FROM items
                WHERE id = %s AND user_id = %s
                """,
                (item_id, user_id),
            )
            before = cur.fetchone()
            if not before:
                raise HTTPException(status_code=404, detail="No está en tu cuenta")
            raw_text = before["title"]
            if before.get("capture_id"):
                cur.execute(
                    "SELECT raw_text FROM captures WHERE id = %s AND user_id = %s",
                    (before["capture_id"], user_id),
                )
                cap = cur.fetchone()
                if cap and cap.get("raw_text"):
                    raw_text = cap["raw_text"]
            repeats = before["repeats"]
            if "repeats" in body.model_fields_set:
                repeats = body.repeats or None
            cur.execute(
                f"""
                UPDATE items
                SET module = %s, axis = %s, kind = %s, title = %s, starts_at = %s, repeats = %s, time_known = %s,
                    alert_minutes_before = %s, agenda_type = %s, medical_for = %s, medical_name = %s,
                    medical_place = %s, medical_notes = %s, family_kind = %s, family_for = %s,
                    family_name = %s, family_place = %s, family_notes = %s, leisure_kind = %s,
                    leisure_with = %s, leisure_name = %s, leisure_place = %s, leisure_notes = %s,
                    reminder_kind = %s, reminder_place = %s, reminder_notes = %s,
                    casa_kind = %s, casa_place = %s, casa_notes = %s, supply_kind = %s,
                    habit_role = %s, habit_kind = %s, habit_notes = %s
                WHERE id = %s AND user_id = %s
                RETURNING {ITEM_SELECT}
                """,
                (
                    body.module,
                    MODULES[body.module],
                    legacy_kind(body.module),
                    body.title.strip(),
                    _when_saving(body.starts_at, body.time_known),
                    repeats,
                    body.time_known,
                    body.alert_minutes_before,
                    extra["agenda_type"],
                    extra["medical_for"],
                    extra["medical_name"],
                    extra["medical_place"],
                    extra["medical_notes"],
                    extra["family_kind"],
                    extra["family_for"],
                    extra["family_name"],
                    extra["family_place"],
                    extra["family_notes"],
                    extra["leisure_kind"],
                    extra["leisure_with"],
                    extra["leisure_name"],
                    extra["leisure_place"],
                    extra["leisure_notes"],
                    extra["reminder_kind"],
                    extra["reminder_place"],
                    extra["reminder_notes"],
                    casa["casa_kind"],
                    casa["casa_place"],
                    casa["casa_notes"],
                    casa["supply_kind"],
                    habit["habit_role"],
                    habit["habit_kind"],
                    habit["habit_notes"],
                    item_id,
                    user_id,
                ),
            )
            item = cur.fetchone()
            if item:
                cur.execute("DELETE FROM item_exceptions WHERE item_id = %s", (item_id,))
                item = _fetch_item(cur, item_id, user_id)
                archive.maybe_learn_from_patch(cur, user_id, raw_text=raw_text, before=before, after=item)
        conn.commit()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    events.log_from_request(
        request,
        "item.update",
        user_id=user_id,
        email=read_user_email(user_id),
        meta={"item_id": item_id, "module": body.module, "kind": item.get("kind")},
    )
    return item


@app.patch("/items/{item_id}/status")
def patch_item_status(item_id: str, body: StatusIn, request: Request):
    user_id = current_user(request)
    if body.status not in {"open", "done"}:
        raise HTTPException(status_code=422, detail="El estado tiene que ser pendiente o hecho")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE items
                SET status = %s
                WHERE id = %s AND user_id = %s AND kind = 'task'
                RETURNING id
                """,
                (body.status, item_id, user_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="No está en tu cuenta o no es una tarea")
            item = _fetch_item(cur, item_id, user_id)
        conn.commit()
    events.log_from_request(
        request,
        "item.status",
        user_id=user_id,
        email=read_user_email(user_id),
        meta={"item_id": item_id, "status": body.status},
    )
    return item


@app.put("/items/{item_id}/days/{day}")
def put_item_day(item_id: str, day: str, body: ExceptionIn, request: Request):
    user_id = current_user(request)
    if body.kind not in {"skip", "override", "done"}:
        raise HTTPException(status_code=422, detail="La excepción tiene que ser omitir, cambiar o hecho")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise HTTPException(status_code=422, detail="El día no es válido")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, repeats FROM items WHERE id = %s AND user_id = %s",
                (item_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No está en tu cuenta")
            if not row["repeats"]:
                raise HTTPException(status_code=422, detail="Esta entrada no se repite")
            if body.kind == "skip":
                cur.execute(
                    """
                    INSERT INTO item_exceptions (item_id, user_id, day, kind)
                    VALUES (%s, %s, %s, 'skip')
                    ON CONFLICT (item_id, day) DO UPDATE SET kind = 'skip',
                        title = NULL, module = NULL, axis = NULL, item_kind = NULL,
                        starts_at = NULL, time_known = NULL
                    """,
                    (item_id, user_id, day),
                )
            elif body.kind == "done":
                cur.execute(
                    """
                    INSERT INTO item_exceptions (item_id, user_id, day, kind)
                    VALUES (%s, %s, %s, 'done')
                    ON CONFLICT (item_id, day) DO UPDATE SET kind = 'done',
                        title = NULL, module = NULL, axis = NULL, item_kind = NULL,
                        starts_at = NULL, time_known = NULL
                    """,
                    (item_id, user_id, day),
                )
            else:
                if not body.title or not body.module or body.module not in MODULES:
                    raise HTTPException(status_code=422, detail="Faltan datos para cambiar este día")
                cur.execute(
                    """
                    INSERT INTO item_exceptions
                        (item_id, user_id, day, kind, title, module, axis, item_kind, starts_at, time_known)
                    VALUES (%s, %s, %s, 'override', %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (item_id, day) DO UPDATE SET
                        kind = 'override',
                        title = EXCLUDED.title,
                        module = EXCLUDED.module,
                        axis = EXCLUDED.axis,
                        item_kind = EXCLUDED.item_kind,
                        starts_at = EXCLUDED.starts_at,
                        time_known = EXCLUDED.time_known
                    """,
                    (
                        item_id,
                        user_id,
                        day,
                        body.title.strip(),
                        body.module,
                        MODULES[body.module],
                        legacy_kind(body.module),
                        _when_saving(body.starts_at, bool(body.time_known)),
                        bool(body.time_known),
                    ),
                )
            item = _fetch_item(cur, item_id, user_id)
        conn.commit()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    return item


@app.delete("/items/{item_id}/days/{day}")
def delete_item_day(item_id: str, day: str, request: Request):
    user_id = current_user(request)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise HTTPException(status_code=422, detail="El día no es válido")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM item_exceptions
                WHERE item_id = %s AND user_id = %s AND day = %s
                """,
                (item_id, user_id, day),
            )
            item = _fetch_item(cur, item_id, user_id)
        conn.commit()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    return item


@app.delete("/items/{item_id}")
def delete_item(item_id: str, request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM items WHERE id = %s AND user_id = %s RETURNING id",
                (item_id, user_id),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    events.log_from_request(
        request,
        "item.delete",
        user_id=user_id,
        email=read_user_email(user_id),
        meta={"item_id": item_id},
    )
    return {"ok": True}


@app.get("/items")
def list_items(request: Request, limit: int = 500):
    user_id = current_user(request)
    cap = max(1, min(int(limit), 2000))
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {ITEM_SELECT}
                FROM items
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user_id, cap),
            )
            rows = cur.fetchall()
            exceptions = _fetch_exceptions(cur, user_id, [str(row["id"]) for row in rows])
    return [_public_item(row, exceptions.get(str(row["id"]), [])) for row in rows]


def _when_saving(value: str | None, time_known: bool):
    parsed = _as_madrid(value)
    if parsed is None or time_known:
        return parsed
    return parsed.replace(hour=0, minute=0, second=0, microsecond=0)


def _as_madrid(value: str | None):
    if not value or not value.strip():
        return None
    parsed = datetime.fromisoformat(value.strip())
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=ZoneInfo("Europe/Madrid"))
    return parsed


def _public_suggestion(suggestion: dict) -> dict:
    starts = suggestion["starts_at"]
    return {
        "kind": suggestion["kind"],
        "title": suggestion["title"],
        "starts_at": starts.isoformat() if starts else None,
        "time_known": bool(suggestion.get("time_known")),
        "privacy": "private",
    }


def _fetch_exceptions(cur, user_id: str, item_ids: list[str]) -> dict[str, list]:
    if not item_ids:
        return {}
    cur.execute(
        """
        SELECT item_id, day, kind, title, module, starts_at, time_known
        FROM item_exceptions
        WHERE user_id = %s AND item_id = ANY(%s::uuid[])
        """,
        (user_id, item_ids),
    )
    grouped: dict[str, list] = {}
    for row in cur.fetchall():
        key = str(row["item_id"])
        grouped.setdefault(key, []).append(row)
    return grouped


def _fetch_item(cur, item_id: str, user_id: str) -> dict | None:
    cur.execute(
        f"""
        SELECT {ITEM_SELECT}
        FROM items
        WHERE id = %s AND user_id = %s
        """,
        (item_id, user_id),
    )
    row = cur.fetchone()
    if not row:
        return None
    exceptions = _fetch_exceptions(cur, user_id, [item_id])
    return _public_item(row, exceptions.get(item_id, []))


def _public_exception(row: dict) -> dict:
    out = {"day": row["day"].isoformat(), "kind": row["kind"]}
    if row["kind"] == "override":
        starts = row["starts_at"]
        out.update(
            {
                "title": row["title"],
                "module": row["module"],
                "starts_at": starts.isoformat() if starts else None,
                "time_known": bool(row["time_known"]),
            }
        )
    return out


def _normalize_habit_fields(row: dict) -> None:
    if row.get("module") != "habitos":
        return
    title = row.get("title") or ""
    low = title.lower()
    if row.get("habit_role") not in HABIT_ROLES:
        row["habit_role"] = "log" if looks_like_habit_log(low) else "routine"
    if row.get("habit_kind") not in HABIT_KINDS:
        meta = habit_meta(title, low)
        row["habit_kind"] = meta.get("habit_kind") or "otro"


def _public_item(row: dict, exceptions: list | None = None) -> dict:
    row = dict(row)
    _normalize_habit_fields(row)
    starts = row["starts_at"]
    return {
        "id": str(row["id"]),
        "kind": row["kind"],
        "axis": row.get("axis") or "personal",
        "module": row.get("module") or "diario",
        "title": row["title"],
        "starts_at": starts.isoformat() if starts else None,
        "repeats": row.get("repeats"),
        "time_known": bool(row.get("time_known")),
        "alert_minutes_before": row.get("alert_minutes_before"),
        "agenda_type": row.get("agenda_type"),
        "medical_for": row.get("medical_for"),
        "medical_name": row.get("medical_name"),
        "medical_place": row.get("medical_place"),
        "medical_notes": row.get("medical_notes"),
        "family_kind": row.get("family_kind"),
        "family_for": row.get("family_for"),
        "family_name": row.get("family_name"),
        "family_place": row.get("family_place"),
        "family_notes": row.get("family_notes"),
        "leisure_kind": row.get("leisure_kind"),
        "leisure_with": row.get("leisure_with"),
        "leisure_name": row.get("leisure_name"),
        "leisure_place": row.get("leisure_place"),
        "leisure_notes": row.get("leisure_notes"),
        "reminder_kind": row.get("reminder_kind"),
        "reminder_place": row.get("reminder_place"),
        "reminder_notes": row.get("reminder_notes"),
        "casa_kind": row.get("casa_kind"),
        "casa_place": row.get("casa_place"),
        "casa_notes": row.get("casa_notes"),
        "supply_kind": row.get("supply_kind"),
        "habit_role": row.get("habit_role"),
        "habit_kind": row.get("habit_kind"),
        "habit_notes": row.get("habit_notes"),
        "health_control_id": str(row["health_control_id"]) if row.get("health_control_id") else None,
        "shopping_list_id": str(row["shopping_list_id"]) if row.get("shopping_list_id") else None,
        "status": row.get("status") or "open",
        "privacy": row["privacy"],
        "created_at": row["created_at"].isoformat(),
        "exceptions": [_public_exception(row) for row in (exceptions or [])],
    }
