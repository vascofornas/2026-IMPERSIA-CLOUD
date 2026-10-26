"""API Suelta — sin imports del Impersia OS."""

import base64
import hashlib
import hmac
import json
import os
import time

import psycopg
from psycopg import errors as pg_errors
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="Suelta API")
COOKIE = "suelta_session"

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("SUELTA_CORS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def db():
    return psycopg.connect(os.environ["SUELTA_DATABASE_URL"], row_factory=dict_row)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split(":")
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return hmac.compare_digest(digest.hex(), digest_hex)


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def make_token(user_id: str) -> str:
    secret = os.environ["SUELTA_JWT_SECRET"].encode()
    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + 14 * 86400}).encode())
    signature = _b64(hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def read_token(token: str) -> str | None:
    try:
        header, payload, signature = token.split(".")
    except ValueError:
        return None
    secret = os.environ["SUELTA_JWT_SECRET"].encode()
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
        raise HTTPException(status_code=401, detail="Entra primero")
    return user_id


def set_session(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE,
        make_token(user_id),
        max_age=14 * 86400,
        httponly=True,
        secure=os.environ.get("SUELTA_COOKIE_SECURE", "0") == "1",
        samesite="lax",
        path="/",
    )


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class NoteIn(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


@app.get("/health")
def health():
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
    return {"status": "ok"}


@app.get("/me")
def me(request: Request):
    user_id = current_user(request)
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM suelta_users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Entra primero")
    return {"email": row["email"]}


@app.post("/auth/register")
def register(body: Credentials, response: Response):
    email = body.email.lower()
    try:
        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO suelta_users (email, password_hash) VALUES (%s, %s) RETURNING id",
                    (email, hash_password(body.password)),
                )
                user_id = str(cur.fetchone()["id"])
            conn.commit()
    except pg_errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="Ese correo ya existe aquí") from None
    set_session(response, user_id)
    return {"email": email}


@app.post("/auth/login")
def login(body: Credentials, response: Response):
    email = body.email.lower()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, password_hash FROM suelta_users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
    if not row or not check_password(body.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    user_id = str(row["id"])
    set_session(response, user_id)
    return {"email": email}


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.post("/notes", status_code=201)
def create_note(body: NoteIn, request: Request):
    user_id = current_user(request)
    text = body.body.strip()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO suelta_notes (user_id, body) VALUES (%s, %s) RETURNING id, body, created_at",
                (user_id, text),
            )
            row = cur.fetchone()
        conn.commit()
    return {
        "id": str(row["id"]),
        "body": row["body"],
        "created_at": row["created_at"].isoformat(),
    }
