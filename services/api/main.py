from datetime import datetime
from zoneinfo import ZoneInfo
import hashlib
import hmac
import json
import os
import base64
import time

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
import psycopg
from psycopg.rows import dict_row

from classify import classify

app = FastAPI(title="Impersia API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://impersia.cloud"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

KINDS = {"note", "task", "event"}
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
    return {"email": email}


@app.post("/auth/login")
def login(body: Credentials, response: Response):
    email = body.email.lower()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    set_session(response, str(row["id"]))
    return {"email": email}


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, domain=".impersia.cloud", path="/")
    return {"ok": True}


@app.get("/me")
def me(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Necesitas entrar")
    return {"email": row["email"]}


@app.post("/captures", status_code=201)
def create_capture(body: CaptureIn, request: Request):
    user_id = current_user(request)
    suggestion = classify(body.text)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO captures
                    (user_id, raw_text, suggested_kind, suggested_title, suggested_starts_at, source)
                VALUES (%s, %s, %s, %s, %s, %s)
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
        conn.commit()
    return {"id": capture_id, **_public_suggestion(suggestion)}


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
                INSERT INTO items (user_id, capture_id, kind, title, starts_at, privacy)
                VALUES (%s, %s, %s, %s, %s, 'private')
                RETURNING id, kind, title, starts_at, privacy, created_at
                """,
                (user_id, capture_id, body.kind, body.title.strip(), _as_madrid(body.starts_at)),
            )
            item = cur.fetchone()
            cur.execute("UPDATE captures SET status = 'confirmed' WHERE id = %s", (capture_id,))
        conn.commit()
    return _public_item(item)


@app.get("/items")
def list_items(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, kind, title, starts_at, privacy, created_at
                FROM items
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 30
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return [_public_item(row) for row in rows]


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
        "privacy": "private",
    }


def _public_item(row: dict) -> dict:
    starts = row["starts_at"]
    return {
        "id": str(row["id"]),
        "kind": row["kind"],
        "title": row["title"],
        "starts_at": starts.isoformat() if starts else None,
        "privacy": row["privacy"],
        "created_at": row["created_at"].isoformat(),
    }
