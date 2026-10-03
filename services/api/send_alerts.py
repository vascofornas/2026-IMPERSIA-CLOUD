#!/usr/bin/env python3
import os
import sys

import psycopg
from psycopg.rows import dict_row

from alerts import run_email_alerts


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL no está definida", file=sys.stderr)
        return 1
    if not os.environ.get("SMTP_HOST"):
        return 0
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        sent = run_email_alerts(conn)
    if sent:
        print(f"Enviados {sent} avisos por correo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
