"""API Impersia local — Ollama + agentes (doc 24)."""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
import ollama_client

app = FastAPI(title="Impersia Local API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "IMPERSIA_LOCAL_CORS", "http://127.0.0.1:5174,http://localhost:5174"
    ).split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


def get_settings() -> dict[str, str]:
    with db.connect() as conn:
        rows = conn.execute("SELECT key, value FROM settings").fetchall()
    return {r["key"]: r["value"] for r in rows}


class SettingsPatch(BaseModel):
    ollama_base: str | None = None
    ollama_model: str | None = None


class AgentIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    system_prompt: str = ""
    model: str | None = None


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=32000)


@app.get("/health")
def health():
    return {"status": "ok", "database": str(db.DB_PATH)}


@app.get("/settings")
def settings_get():
    return get_settings()


@app.patch("/settings")
def settings_patch(body: SettingsPatch):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que cambiar")
    with db.connect() as conn:
        for key, val in updates.items():
            conn.execute(
                """
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, val.strip() if isinstance(val, str) else val),
            )
        conn.commit()
    return get_settings()


@app.get("/ollama/status")
async def ollama_status():
    s = get_settings()
    base = s["ollama_base"]
    try:
        models = await ollama_client.list_models(base)
        return {"ok": True, "base": base, "models": models}
    except Exception as exc:
        return {"ok": False, "base": base, "error": str(exc), "models": []}


def agent_row(row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "system_prompt": row["system_prompt"],
        "model": row["model"],
        "created_at": row["created_at"],
    }


@app.get("/agents")
def agents_list():
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM agents ORDER BY id").fetchall()
    return {"items": [agent_row(r) for r in rows]}


@app.post("/agents")
def agents_create(body: AgentIn):
    with db.connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO agents (name, system_prompt, model)
            VALUES (?, ?, ?)
            """,
            (body.name.strip(), body.system_prompt, body.model),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM agents WHERE id = ?", (cur.lastrowid,)
        ).fetchone()
    return agent_row(row)


@app.get("/agents/{agent_id}/messages")
def messages_list(agent_id: int):
    with db.connect() as conn:
        if not conn.execute(
            "SELECT 1 FROM agents WHERE id = ?", (agent_id,)
        ).fetchone():
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        rows = conn.execute(
            """
            SELECT id, role, content, created_at FROM messages
            WHERE agent_id = ? ORDER BY id
            """,
            (agent_id,),
        ).fetchall()
    return {
        "items": [
            {
                "id": r["id"],
                "role": r["role"],
                "content": r["content"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
    }


@app.post("/agents/{agent_id}/chat")
async def chat(agent_id: int, body: ChatIn):
    s = get_settings()
    with db.connect() as conn:
        agent = conn.execute(
            "SELECT * FROM agents WHERE id = ?", (agent_id,)
        ).fetchone()
        if not agent:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        model = agent["model"] or s["ollama_model"]
        history = conn.execute(
            """
            SELECT role, content FROM messages
            WHERE agent_id = ? ORDER BY id
            """,
            (agent_id,),
        ).fetchall()
        conn.execute(
            "INSERT INTO messages (agent_id, role, content) VALUES (?, 'user', ?)",
            (agent_id, body.message.strip()),
        )
        conn.commit()

    ollama_messages: list[dict[str, str]] = []
    if agent["system_prompt"]:
        ollama_messages.append({"role": "system", "content": agent["system_prompt"]})
    for h in history:
        if h["role"] in ("user", "assistant"):
            ollama_messages.append({"role": h["role"], "content": h["content"]})
    ollama_messages.append({"role": "user", "content": body.message.strip()})

    try:
        reply = await ollama_client.chat(s["ollama_base"], model, ollama_messages)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama: {exc}") from exc

    with db.connect() as conn:
        conn.execute(
            "INSERT INTO messages (agent_id, role, content) VALUES (?, 'assistant', ?)",
            (agent_id, reply),
        )
        conn.commit()

    return {"reply": reply, "model": model}
