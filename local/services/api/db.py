import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.environ.get("IMPERSIA_LOCAL_DATA", ROOT / "data"))
DB_PATH = DATA_DIR / "impersia.db"


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                system_prompt TEXT NOT NULL DEFAULT '',
                model TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            """
        )
        defaults = {
            "ollama_base": "http://127.0.0.1:11434",
            "ollama_model": "llama3.2:3b",
        }
        for k, v in defaults.items():
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v)
            )
        row = conn.execute("SELECT COUNT(*) AS n FROM agents").fetchone()
        if row["n"] == 0:
            conn.execute(
                """
                INSERT INTO agents (name, system_prompt, model)
                VALUES (?, ?, ?)
                """,
                (
                    "Asistente Impersia",
                    "Eres un asistente útil para una pyme española. "
                    "Respondes en español, claro y breve.",
                    None,
                ),
            )
        conn.commit()
