#!/usr/bin/env python3
"""
Apuntes de prueba: tensión, glucosa, peso y medicación (ago–oct 2026).

En el VPS:
  set -a; source /etc/impersia/api.env; set +a
  cd /opt/impersia-os/services/api
  python3 scripts/seed_health_clinical_demo.py
  python3 scripts/seed_health_clinical_demo.py --clear   # borra solo datos seed_health_demo
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

MAD = ZoneInfo("Europe/Madrid")
SOURCE = "seed_health_demo"
START = date(2026, 8, 1)
END = date(2026, 10, 9)


def db():
    return psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row)


def admin_user_id(cur) -> str:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not email:
        raise SystemExit("Falta ADMIN_EMAIL en el entorno")
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    if not row:
        raise SystemExit(f"No hay usuario con email {email}")
    return str(row["id"])


def clear_seed(cur, user_id: str) -> int:
    cur.execute(
        """
        DELETE FROM items
        WHERE user_id = %s AND archived_source = %s
        RETURNING id
        """,
        (user_id, SOURCE),
    )
    rows = cur.fetchall()
    return len(rows)


def at_morning(d: date, hour: int, minute: int) -> datetime:
    return datetime.combine(d, time(hour, minute), tzinfo=MAD)


def insert_log(
    cur,
    user_id: str,
    when: datetime,
    *,
    title: str,
    habit_kind: str,
    habit_notes: str | None,
) -> None:
    cur.execute(
        """
        INSERT INTO captures
            (user_id, raw_text, suggested_kind, suggested_title, suggested_starts_at, source, status)
        VALUES (%s, %s, 'task', %s, %s, %s, 'filed')
        RETURNING id
        """,
        (user_id, title, title, when, SOURCE),
    )
    capture_id = str(cur.fetchone()["id"])
    cur.execute(
        """
        INSERT INTO items
            (user_id, capture_id, kind, axis, module, title, starts_at, repeats, time_known,
             habit_role, habit_kind, habit_notes, privacy, archived_source, created_at)
        VALUES (%s, %s, 'task', 'personal', 'habitos', %s, %s, NULL, false,
                'log', %s, %s, 'private', %s, %s)
        """,
        (user_id, capture_id, title, when, habit_kind, habit_notes, SOURCE, when),
    )


def daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def generate_entries(rng: random.Random) -> list[tuple[datetime, str, str, str | None]]:
    out: list[tuple[datetime, str, str, str | None]] = []
    weight_kg = 73.4
    day_idx = 0

    for d in daterange(START, END):
        day_idx += 1
        wd = d.weekday()  # 0=lun

        # Medicación casi a diario (8:00)
        if rng.random() > 0.12:
            titles = [
                "Tomé la pastilla de la tensión a las 8",
                "Pastilla de la tensión y statina en el desayuno",
                "Medicación de la mañana: enalapril y atorvastatina",
            ]
            title = titles[day_idx % len(titles)]
            out.append((at_morning(d, 8, rng.randint(5, 25)), title, "medicacion", None))

        # Tensión lun/mié/vie (7:45)
        if wd in (0, 2, 4):
            sys = int(122 + rng.gauss(0, 4) + (day_idx * 0.02))
            dia = int(76 + rng.gauss(0, 3))
            sys = max(112, min(138, sys))
            dia = max(68, min(92, dia))
            notes = f"{sys}/{dia} mmHg"
            title = f"Tensión {sys}/{dia} en reposo, brazo izquierdo"
            out.append((at_morning(d, 7, min(59, 45 + rng.randint(0, 14))), title, "presion", notes))

        # Glucosa en ayunas mar/jue/sáb (7:30)
        if wd in (1, 3, 5):
            mg = int(108 + rng.gauss(0, 12) + 8 * rng.random())
            mg = max(92, min(148, mg))
            notes = f"{mg} mg/dL"
            title = f"Glucosa {mg} en ayunas antes del desayuno"
            out.append((at_morning(d, 7, 30 + rng.randint(0, 15)), title, "glucosa", notes))

        # Peso domingos (8:10), ligera bajada
        if wd == 6:
            weight_kg = round(weight_kg - 0.08 + rng.gauss(0, 0.15), 1)
            weight_kg = max(71.2, min(74.0, weight_kg))
            notes = f"{weight_kg} kg"
            title = f"Peso {str(weight_kg).replace('.', ',')} kg en báscula de casa"
            out.append((at_morning(d, 8, 10 + rng.randint(0, 10)), title, "peso", notes))

    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clear", action="store_true", help="Borrar apuntes demo previos")
    args = parser.parse_args()

    rng = random.Random(20260801)

    with db() as conn:
        with conn.cursor() as cur:
            user_id = admin_user_id(cur)
            if args.clear:
                n = clear_seed(cur, user_id)
                conn.commit()
                print(f"Borrados {n} ítems con archived_source={SOURCE}")
                return

            removed = clear_seed(cur, user_id)
            if removed:
                print(f"Reemplazo: {removed} apuntes demo anteriores")

            entries = generate_entries(rng)
            for when, title, kind, notes in entries:
                insert_log(cur, user_id, when, title=title, habit_kind=kind, habit_notes=notes)
        conn.commit()

    by_kind: dict[str, int] = {}
    for _, _, k, _ in entries:
        by_kind[k] = by_kind.get(k, 0) + 1
    print(f"Listo: {len(entries)} apuntes ({START} → {END})")
    for k in ("medicacion", "presion", "glucosa", "peso"):
        print(f"  · {k}: {by_kind.get(k, 0)}")


if __name__ == "__main__":
    main()
