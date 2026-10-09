#!/usr/bin/env python3
"""
Rellena historial de lecturas para controles activos (ago 1 → ayer). No toca hoy.

VPS:
  set -a; source /etc/impersia/api.env; set +a
  cd /opt/impersia-os/services/api
  python3 scripts/seed_health_control_history.py
  python3 scripts/seed_health_control_history.py --clear
"""

from __future__ import annotations

import argparse
import os
import random
import sys
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

import psycopg
from psycopg.rows import dict_row

import health_controls

MAD = ZoneInfo("Europe/Madrid")
SOURCE = "seed_control_backfill"
START = date(2026, 8, 1)


def db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def admin_user_id(cur) -> str:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not email:
        raise SystemExit("Falta ADMIN_EMAIL")
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"No usuario {email}")
    return str(row["id"])


def yesterday_local() -> date:
    return datetime.now(MAD).date() - timedelta(days=1)


def clear_backfill(cur, user_id: str) -> int:
    cur.execute(
        """
        DELETE FROM items
        WHERE user_id = %s AND archived_source = %s
        RETURNING id
        """,
        (user_id, SOURCE),
    )
    return len(cur.fetchall())


def at_time(day: date, t: time) -> datetime:
    return datetime.combine(day, t, tzinfo=MAD)


def payload_peso_trend(day: date, end: date, start_kg: float = 74.8, end_kg: float = 73.5, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random(0)
    total = max(1, (end - START).days)
    elapsed = (day - START).days
    t = elapsed / total
    kg = round(start_kg + (end_kg - start_kg) * t + rng.gauss(0, 0.12), 1)
    return {"kg": kg}


def payload_for_kind(kind: str, rng: random.Random, day_idx: int, *, day: date | None = None, end: date | None = None) -> dict:
    if kind == "presion":
        sys = int(128 + rng.gauss(0, 5) - day_idx * 0.015)
        dia = int(78 + rng.gauss(0, 4))
        sys = max(112, min(145, sys))
        dia = max(68, min(95, dia))
        return {"systolic": sys, "diastolic": dia}
    if kind == "glucosa":
        mg = int(108 + rng.gauss(0, 11))
        return {"mg_dl": max(90, min(150, mg))}
    if kind == "peso" and day and end:
        return payload_peso_trend(day, end, rng=rng)
    if kind == "peso":
        kg = round(73.2 - day_idx * 0.015 + rng.gauss(0, 0.12), 1)
        return {"kg": max(71.0, min(75.0, kg))}
    return {"taken": True}


def insert_backfill(cur, user_id: str, control: dict, when: datetime, payload: dict) -> None:
    notes = health_controls._habit_notes_for_reading(control["kind"], payload)
    title = health_controls._title_for_reading(control, payload, notes)
    cur.execute(
        """
        INSERT INTO items
            (user_id, kind, axis, module, title, starts_at, repeats, time_known,
             habit_role, habit_kind, habit_notes, health_control_id, privacy,
             archived_source, created_at)
        VALUES (%s, 'task', 'personal', 'habitos', %s, %s, NULL, true,
                'log', %s, %s, %s, 'private', %s, %s)
        """,
        (
            user_id,
            title,
            when,
            control["kind"],
            notes,
            str(control["id"]),
            SOURCE,
            when,
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true")
    parser.add_argument("--fill-missing", action="store_true", help="Solo días sin lectura; no borra backfill previo")
    args = parser.parse_args()
    end = yesterday_local()
    if end < START:
        raise SystemExit("Rango vacío (¿fecha del servidor?)")

    rng = random.Random(20260801)

    with db() as conn:
        with conn.cursor() as cur:
            user_id = admin_user_id(cur)
            if args.clear:
                n = clear_backfill(cur, user_id)
                conn.commit()
                print(f"Borrados {n} apuntes {SOURCE}")
                return

            if not args.fill_missing:
                clear_backfill(cur, user_id)
            controls = [dict(c) for c in health_controls.list_controls(cur, user_id)]
            if not controls:
                raise SystemExit("No hay controles activos")

            total = 0
            day_idx = 0
            d = START
            while d <= end:
                for control in controls:
                    cid = str(control["id"])
                    if health_controls.logs_for_day(cur, user_id, cid, d):
                        continue
                    if not health_controls.control_due_on_day(control, d, has_log=False):
                        continue
                    rt = control["reminder_time"]
                    if not hasattr(rt, "hour"):
                        rt = time(8, 0)
                    when = at_time(d, rt)
                    payload = payload_for_kind(control["kind"], rng, day_idx, day=d, end=end)
                    insert_backfill(cur, user_id, control, when, payload)
                    total += 1
                d += timedelta(days=1)
                day_idx += 1
        conn.commit()

    print(f"Listo: {total} apuntes ({START} → {end}) para {len(controls)} controles")


if __name__ == "__main__":
    main()
