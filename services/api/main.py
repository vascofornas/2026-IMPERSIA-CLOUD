from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import hashlib
import hmac
import json
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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

KINDS = {"note", "task", "event"}
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


class LookIn(BaseModel):
    look: str


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


def _account(user_id: str, email: str, look: str) -> dict:
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT google_email FROM google_links WHERE user_id = %s", (user_id,))
            link = cur.fetchone()
    return {
        "email": email,
        "look": look if look in LOOKS else "claro",
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
    return {"email": email, "look": "claro", "google_email": None}


@app.post("/auth/login")
def login(body: Credentials, response: Response):
    email = body.email.lower()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash, look FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    set_session(response, str(row["id"]))
    return _account(str(row["id"]), email, row["look"])


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, domain=".impersia.cloud", path="/")
    return {"ok": True}


@app.get("/me")
def me(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, look FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return _account(user_id, row["email"], row["look"])


@app.patch("/me")
def patch_me(body: LookIn, request: Request):
    user_id = current_user(request)
    if body.look not in LOOKS:
        raise HTTPException(status_code=400, detail="Esa apariencia no existe")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET look = %s WHERE id = %s RETURNING email, look",
                (body.look, user_id),
            )
            row = cur.fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return _account(user_id, row["email"], row["look"])


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
                    (user_id, capture_id, kind, axis, module, title, starts_at, repeats, time_known, privacy)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'private')
                RETURNING id, kind, axis, module, title, starts_at, repeats, time_known, privacy, created_at
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


@app.patch("/items/{item_id}")
def patch_item(item_id: str, body: ItemPatch, request: Request):
    user_id = current_user(request)
    if body.module not in MODULES:
        raise HTTPException(status_code=422, detail="Ese módulo no existe")
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE items
                SET module = %s, axis = %s, kind = %s, title = %s, starts_at = %s, time_known = %s
                WHERE id = %s AND user_id = %s
                RETURNING id, kind, axis, module, title, starts_at, repeats, time_known, privacy, created_at
                """,
                (
                    body.module,
                    MODULES[body.module],
                    legacy_kind(body.module),
                    body.title.strip(),
                    _when_saving(body.starts_at, body.time_known),
                    body.time_known,
                    item_id,
                    user_id,
                ),
            )
            item = cur.fetchone()
        conn.commit()
    if not item:
        raise HTTPException(status_code=404, detail="No está en tu cuenta")
    return _public_item(item)


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
                SELECT id, kind, axis, module, title, starts_at, repeats, time_known, privacy, created_at
                FROM items
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 30
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return [_public_item(row) for row in rows]


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


def _public_item(row: dict) -> dict:
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
        "privacy": row["privacy"],
        "created_at": row["created_at"].isoformat(),
    }
