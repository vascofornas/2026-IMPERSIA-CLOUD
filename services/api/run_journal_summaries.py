#!/usr/bin/env python3
import os
import sys

import psycopg
from psycopg.rows import dict_row

import journal


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL no está definida", file=sys.stderr)
        return 1
    generated = 0
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE journal_ai_enabled")
            user_ids = [str(row["id"]) for row in cur.fetchall()]
        for user_id in user_ids:
            try:
                with conn.cursor() as cur:
                    before = len(journal.list_summaries(cur, user_id))
                    journal.ensure_current_summaries(cur, user_id)
                    after = len(journal.list_summaries(cur, user_id))
                    generated += max(after - before, 0)
                conn.commit()
            except Exception as exc:
                conn.rollback()
                print(f"No se pudo resumir Diario de {user_id}: {exc}", file=sys.stderr)
    if generated:
        print(f"Generados {generated} resúmenes de Diario")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
