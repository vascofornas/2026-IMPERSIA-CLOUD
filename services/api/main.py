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

from classify import MODULES, classify, legacy_kind

app = FastAPI(title="Impersia API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://impersia.cloud"],
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
LOOKS = {"claro", "papel", "mar", "cielo", "oliva", "arena", "violeta", "tinta", "noche", "grafito"}
COOKIE = "impersia_session"


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


class ExceptionIn(BaseModel):
    kind: str
    title: str | None = None
    module: str | None = None
    starts_at: str | None = None
    time_known: bool | None = None


class MePatch(BaseModel):
    look: str | None = None
    alert_email: bool | None = None


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
    }


@app.post("/auth/register", status_code=201)
def register(body: Credentials, response: Response):
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
        raise HTTPException(status_code=409, detail="Ese correo ya tiene cuenta")
    set_session(response, user_id)
    return {"email": email, "look": "claro", "alert_email": False, "google_email": None}


@app.post("/auth/login")
def login(body: Credentials, response: Response):
    email = body.email.lower()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash, look, alert_email FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    set_session(response, str(row["id"]))
    return _account(str(row["id"]), email, row["look"], row.get("alert_email", False))


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, domain=".impersia.cloud", path="/")
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
    return _account(user_id, row["email"], row["look"], row["alert_email"])


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
    return _account(user_id, row["email"], row["look"], row["alert_email"])


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


@app.post("/captures", status_code=201)
def create_capture(body: CaptureIn, request: Request):
    user_id = current_user(request)
    suggestion = classify(body.text)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO captures
                    (user_id, raw_text, suggested_kind, suggested_title, suggested_starts_at, source, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'filed')
                RETURNING id
                """,
                (
                    user_id,
                    body.text.strip(),
                    suggestion["kind"],
                    suggestion["title"],
                    suggestion["starts_at"],
                    suggestion["source"],
                ),
            )
            capture_id = str(cur.fetchone()["id"])
            cur.execute(
                """
                INSERT INTO items
                    (user_id, capture_id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
                     agenda_type, medical_for, medical_name, medical_place, medical_notes,
                     family_kind, family_for, family_name, family_place, family_notes,
                     leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
                     reminder_kind, reminder_place, reminder_notes, privacy)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'private')
                RETURNING id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
                    agenda_type, medical_for, medical_name, medical_place, medical_notes,
                    family_kind, family_for, family_name, family_place, family_notes,
                    leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
                    reminder_kind, reminder_place, reminder_notes, privacy, created_at
                """,
                (
                    user_id,
                    capture_id,
                    suggestion["kind"],
                    suggestion["axis"],
                    suggestion["module"],
                    suggestion["title"],
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
                ),
            )
            item = cur.fetchone()
        conn.commit()
    return _public_item(item)


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


@app.patch("/items/{item_id}")
def patch_item(item_id: str, body: ItemPatch, request: Request):
    user_id = current_user(request)
    if body.module not in MODULES:
        raise HTTPException(status_code=422, detail="Ese módulo no existe")
    extra = _agenda_fields(body)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE items
                SET module = %s, axis = %s, kind = %s, title = %s, starts_at = %s, time_known = %s,
                    alert_minutes_before = %s, agenda_type = %s, medical_for = %s, medical_name = %s,
                    medical_place = %s, medical_notes = %s, family_kind = %s, family_for = %s,
                    family_name = %s, family_place = %s, family_notes = %s, leisure_kind = %s,
                    leisure_with = %s, leisure_name = %s, leisure_place = %s, leisure_notes = %s,
                    reminder_kind = %s, reminder_place = %s, reminder_notes = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
                    agenda_type, medical_for, medical_name, medical_place, medical_notes,
                    family_kind, family_for, family_name, family_place, family_notes,
                    leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
                    reminder_kind, reminder_place, reminder_notes, privacy, created_at
                """,
                (
                    body.module,
                    MODULES[body.module],
                    legacy_kind(body.module),
                    body.title.strip(),
                    _when_saving(body.starts_at, body.time_known),
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
                    item_id,
                    user_id,
                ),
            )
            item = cur.fetchone()
            if item:
                cur.execute("DELETE FROM item_exceptions WHERE item_id = %s", (item_id,))
                item = _fetch_item(cur, item_id, user_id)
        conn.commit()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    return item


@app.put("/items/{item_id}/days/{day}")
def put_item_day(item_id: str, day: str, body: ExceptionIn, request: Request):
    user_id = current_user(request)
    if body.kind not in {"skip", "override"}:
        raise HTTPException(status_code=422, detail="La excepción tiene que ser omitir o cambiar")
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
    return {"ok": True}


@app.get("/items")
def list_items(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
                    agenda_type, medical_for, medical_name, medical_place, medical_notes,
                    family_kind, family_for, family_name, family_place, family_notes,
                    leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
                    reminder_kind, reminder_place, reminder_notes, privacy, created_at
                FROM items
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 30
                """,
                (user_id,),
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
        """
        SELECT id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
            agenda_type, medical_for, medical_name, medical_place, medical_notes,
            family_kind, family_for, family_name, family_place, family_notes,
            leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
            reminder_kind, reminder_place, reminder_notes, privacy, created_at
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


def _public_item(row: dict, exceptions: list | None = None) -> dict:
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
        "privacy": row["privacy"],
        "created_at": row["created_at"].isoformat(),
        "exceptions": [_public_exception(row) for row in (exceptions or [])],
    }
