"""API Impersia platform — escritorio pyme (doc 23). Sin imports del OS legacy."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import psycopg
from fastapi import FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from psycopg.rows import dict_row
from pydantic import BaseModel, EmailStr, Field

app = FastAPI(title="Impersia Platform API")
COOKIE = "impersia_platform_session"


def db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split(":")
    digest = hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1
    )
    return hmac.compare_digest(digest.hex(), digest_hex)


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _unb64(raw: str) -> bytes:
    pad = "=" * (-len(raw) % 4)
    return base64.urlsafe_b64decode(raw + pad)


def make_token(user_id: str) -> str:
    secret = os.environ["JWT_SECRET"].encode()
    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(
        json.dumps({"sub": user_id, "exp": int(time.time()) + 14 * 86400}).encode()
    )
    signature = _b64(
        hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{signature}"


def read_token(token: str) -> str | None:
    try:
        header, payload, signature = token.split(".")
    except ValueError:
        return None
    secret = os.environ["JWT_SECRET"].encode()
    expected = _b64(
        hmac.new(secret, f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    if not hmac.compare_digest(expected, signature):
        return None
    data = json.loads(_unb64(payload))
    if data.get("exp", 0) < time.time():
        return None
    return data.get("sub")


def set_session(response: Response, user_id: str) -> None:
    response.set_cookie(
        COOKIE,
        make_token(user_id),
        max_age=14 * 86400,
        httponly=True,
        secure=os.environ.get("PLATFORM_COOKIE_SECURE", "0") == "1",
        samesite="lax",
        path="/",
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


def current_user_id(request: Request) -> str:
    user_id = read_token(request.cookies.get(COOKIE, ""))
    if not user_id:
        raise HTTPException(status_code=401, detail="Entra primero")
    return user_id


def primary_org(user_id: str) -> dict:
    with db() as conn:
        row = conn.execute(
            """
            SELECT o.id, o.name, o.tax_id, m.role
            FROM platform.org_members m
            JOIN platform.organizations o ON o.id = m.org_id
            WHERE m.user_id = %s
            ORDER BY (m.role = 'owner') DESC, m.joined_at ASC
            LIMIT 1
            """,
            (user_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="Sin organización")
    return row


def iso(dt) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).isoformat()
    return str(dt)


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "PLATFORM_CORS", "https://impersia.cloud"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    org_name: str = Field(default="Mi negocio", min_length=1, max_length=120)
    display_name: str | None = Field(default=None, max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    kind: str = Field(default="client", pattern="^(client|supplier|both)$")
    legal_name: str | None = None
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None


class ContactPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    kind: str | None = Field(default=None, pattern="^(client|supplier|both)$")
    legal_name: str | None = None
    tax_id: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    archived: bool | None = None


class ActivityIn(BaseModel):
    kind: str = Field(default="task", pattern="^(task|call|meeting|email_log|note)$")
    title: str = Field(min_length=1, max_length=300)
    body: str | None = None
    contact_id: UUID | None = None
    process_id: UUID | None = None
    due_at: datetime | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None


class ActivityPatch(BaseModel):
    kind: str | None = Field(default=None, pattern="^(task|call|meeting|email_log|note)$")
    title: str | None = Field(default=None, min_length=1, max_length=300)
    body: str | None = None
    contact_id: UUID | None = None
    status: str | None = Field(default=None, pattern="^(pending|done|cancelled)$")
    due_at: datetime | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None


def contact_row(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "kind": row["kind"],
        "name": row["name"],
        "legal_name": row["legal_name"],
        "tax_id": row["tax_id"],
        "email": row["email"],
        "phone": row["phone"],
        "notes": row["notes"],
        "created_at": iso(row["created_at"]),
        "updated_at": iso(row["updated_at"]),
        "archived_at": iso(row["archived_at"]),
    }


def activity_row(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "kind": row["kind"],
        "title": row["title"],
        "body": row["body"],
        "status": row["status"],
        "contact_id": str(row["contact_id"]) if row["contact_id"] else None,
        "process_id": str(row["process_id"]) if row["process_id"] else None,
        "due_at": iso(row["due_at"]),
        "start_at": iso(row["start_at"]),
        "end_at": iso(row["end_at"]),
        "completed_at": iso(row["completed_at"]),
        "created_at": iso(row["created_at"]),
        "updated_at": iso(row["updated_at"]),
    }


@app.get("/health")
def health():
    try:
        with db() as conn:
            conn.execute("SELECT 1 FROM platform.organizations LIMIT 1")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": "ok" if db_ok else "error"}


@app.post("/auth/register")
def register(body: RegisterIn, response: Response):
    with db() as conn:
        exists = conn.execute(
            "SELECT 1 FROM platform.users WHERE email = %s", (body.email.lower(),)
        ).fetchone()
        if exists:
            raise HTTPException(status_code=409, detail="Ese correo ya existe")
        user = conn.execute(
            """
            INSERT INTO platform.users (email, password_hash, display_name)
            VALUES (%s, %s, %s)
            RETURNING id, email, display_name, created_at
            """,
            (
                body.email.lower(),
                hash_password(body.password),
                body.display_name or body.email.split("@")[0],
            ),
        ).fetchone()
        org = conn.execute(
            """
            INSERT INTO platform.organizations (name)
            VALUES (%s)
            RETURNING id, name, tax_id, created_at
            """,
            (body.org_name.strip(),),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO platform.org_members (org_id, user_id, role)
            VALUES (%s, %s, 'owner')
            """,
            (org["id"], user["id"]),
        )
        conn.commit()
    set_session(response, str(user["id"]))
    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "display_name": user["display_name"],
        },
        "organization": {
            "id": str(org["id"]),
            "name": org["name"],
        },
    }


@app.post("/auth/login")
def login(body: LoginIn, response: Response):
    with db() as conn:
        user = conn.execute(
            """
            SELECT id, email, password_hash, display_name
            FROM platform.users WHERE email = %s
            """,
            (body.email.lower(),),
        ).fetchone()
    if not user or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    set_session(response, str(user["id"]))
    org = primary_org(str(user["id"]))
    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "display_name": user["display_name"],
        },
        "organization": {"id": str(org["id"]), "name": org["name"]},
    }


@app.post("/auth/logout")
def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@app.get("/me")
def me(request: Request):
    user_id = current_user_id(request)
    with db() as conn:
        user = conn.execute(
            """
            SELECT id, email, display_name, created_at
            FROM platform.users WHERE id = %s
            """,
            (user_id,),
        ).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    org = primary_org(user_id)
    return {
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "display_name": user["display_name"],
        },
        "organization": {
            "id": str(org["id"]),
            "name": org["name"],
            "tax_id": org["tax_id"],
            "role": org["role"],
        },
    }


@app.get("/panel")
def panel(request: Request):
    user_id = current_user_id(request)
    org = primary_org(user_id)
    org_id = org["id"]
    now = datetime.now(timezone.utc)
    with db() as conn:
        pending = conn.execute(
            """
            SELECT COUNT(*) AS n FROM platform.activities
            WHERE org_id = %s AND status = 'pending'
            """,
            (org_id,),
        ).fetchone()["n"]
        overdue = conn.execute(
            """
            SELECT COUNT(*) AS n FROM platform.activities
            WHERE org_id = %s AND status = 'pending'
              AND due_at IS NOT NULL AND due_at < %s
            """,
            (org_id, now),
        ).fetchone()["n"]
        upcoming = conn.execute(
            """
            SELECT COUNT(*) AS n FROM platform.activities
            WHERE org_id = %s AND status = 'pending'
              AND start_at IS NOT NULL AND start_at >= %s
              AND start_at < %s
            """,
            (org_id, now, now + timedelta(days=7)),
        ).fetchone()["n"]
        recent = conn.execute(
            """
            SELECT * FROM platform.activities
            WHERE org_id = %s
            ORDER BY created_at DESC
            LIMIT 8
            """,
            (org_id,),
        ).fetchall()
        contacts_n = conn.execute(
            "SELECT COUNT(*) AS n FROM platform.contacts WHERE org_id = %s AND archived_at IS NULL",
            (org_id,),
        ).fetchone()["n"]
    return {
        "counts": {
            "contacts": contacts_n,
            "pending_activities": pending,
            "overdue": overdue,
            "upcoming_week": upcoming,
        },
        "recent_activities": [activity_row(r) for r in recent],
    }


@app.get("/contacts")
def list_contacts(
    request: Request,
    q: str | None = None,
    include_archived: bool = False,
):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    sql = """
        SELECT * FROM platform.contacts
        WHERE org_id = %s
    """
    params: list[Any] = [org_id]
    if not include_archived:
        sql += " AND archived_at IS NULL"
    if q:
        sql += " AND (name ILIKE %s OR email ILIKE %s OR phone ILIKE %s)"
        like = f"%{q.strip()}%"
        params.extend([like, like, like])
    sql += " ORDER BY name ASC LIMIT 200"
    with db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"items": [contact_row(r) for r in rows]}


@app.post("/contacts")
def create_contact(body: ContactIn, request: Request):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    with db() as conn:
        row = conn.execute(
            """
            INSERT INTO platform.contacts (
                org_id, kind, name, legal_name, tax_id, email, phone, notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                org_id,
                body.kind,
                body.name.strip(),
                body.legal_name,
                body.tax_id,
                body.email,
                body.phone,
                body.notes,
            ),
        ).fetchone()
        conn.commit()
    return contact_row(row)


@app.patch("/contacts/{contact_id}")
def patch_contact(contact_id: UUID, body: ContactPatch, request: Request):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nada que cambiar")
    archived = fields.pop("archived", None)
    sets = []
    params: list[Any] = []
    for key, val in fields.items():
        sets.append(f"{key} = %s")
        params.append(val)
    if archived is not None:
        sets.append("archived_at = %s")
        params.append(datetime.now(timezone.utc) if archived else None)
    sets.append("updated_at = now()")
    params.extend([contact_id, org_id])
    with db() as conn:
        row = conn.execute(
            f"""
            UPDATE platform.contacts SET {", ".join(sets)}
            WHERE id = %s AND org_id = %s
            RETURNING *
            """,
            params,
        ).fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    return contact_row(row)


@app.get("/activities")
def list_activities(
    request: Request,
    status: str | None = Query(default=None, pattern="^(pending|done|cancelled)$"),
    contact_id: UUID | None = None,
    limit: int = Query(default=100, le=300),
):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    sql = "SELECT * FROM platform.activities WHERE org_id = %s"
    params: list[Any] = [org_id]
    if status:
        sql += " AND status = %s"
        params.append(status)
    if contact_id:
        sql += " AND contact_id = %s"
        params.append(contact_id)
    sql += " ORDER BY COALESCE(due_at, start_at, created_at) ASC NULLS LAST LIMIT %s"
    params.append(limit)
    with db() as conn:
        rows = conn.execute(sql, params).fetchall()
    return {"items": [activity_row(r) for r in rows]}


@app.post("/activities")
def create_activity(body: ActivityIn, request: Request):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    with db() as conn:
        if body.contact_id:
            ok = conn.execute(
                "SELECT 1 FROM platform.contacts WHERE id = %s AND org_id = %s",
                (body.contact_id, org_id),
            ).fetchone()
            if not ok:
                raise HTTPException(status_code=400, detail="Contacto inválido")
        row = conn.execute(
            """
            INSERT INTO platform.activities (
                org_id, kind, title, body, contact_id, process_id,
                due_at, start_at, end_at, assignee_user_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                org_id,
                body.kind,
                body.title.strip(),
                body.body,
                body.contact_id,
                body.process_id,
                body.due_at,
                body.start_at,
                body.end_at,
                user_id,
            ),
        ).fetchone()
        conn.commit()
    return activity_row(row)


@app.patch("/activities/{activity_id}")
def patch_activity(activity_id: UUID, body: ActivityPatch, request: Request):
    user_id = current_user_id(request)
    org_id = primary_org(user_id)["id"]
    fields = body.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="Nada que cambiar")
    status = fields.pop("status", None)
    sets = []
    params: list[Any] = []
    for key, val in fields.items():
        sets.append(f"{key} = %s")
        params.append(val)
    if status:
        sets.append("status = %s")
        params.append(status)
        if status == "done":
            sets.append("completed_at = now()")
        elif status == "pending":
            sets.append("completed_at = NULL")
    sets.append("updated_at = now()")
    params.extend([activity_id, org_id])
    with db() as conn:
        row = conn.execute(
            f"""
            UPDATE platform.activities SET {", ".join(sets)}
            WHERE id = %s AND org_id = %s
            RETURNING *
            """,
            params,
        ).fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return activity_row(row)
