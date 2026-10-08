#!/usr/bin/env python3
"""Ejemplos seed para el prompt (cuenta ADMIN_EMAIL). Ejecutar una vez en VPS."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

import psycopg
from psycopg.rows import dict_row

from archive import record_correction

HINTS: list[tuple[str, dict]] = [
    (
        "Factura de la luz Iberdrola vence el 20 de cada mes",
        {"module": "casa", "casa_kind": "suministro", "supply_kind": "luz", "title": "Factura de la luz Iberdrola"},
    ),
    (
        "Recibo del gas Naturgy antes del 25 de octubre",
        {"module": "casa", "casa_kind": "suministro", "supply_kind": "gas", "title": "Recibo del gas Naturgy"},
    ),
    (
        "Contrato internet Movistar renovar en diciembre",
        {"module": "casa", "casa_kind": "suministro", "supply_kind": "internet", "title": "Contrato internet Movistar"},
    ),
    (
        "Aniversario de bodas con Marta el 20 de octubre, cena en restaurante",
        {"module": "agenda", "agenda_type": "familiar", "family_kind": "aniversario", "title": "Aniversario de bodas con Marta"},
    ),
    (
        "Cada lunes yoga a las 7 de la mañana en el gimnasio",
        {"module": "habitos", "title": "Yoga"},
    ),
    (
        "Comida de empresa Navidad 19 de diciembre a las 14",
        {"module": "reuniones", "title": "Comida de empresa Navidad"},
    ),
    (
        "Limpiar cristales del comedor",
        {"module": "casa", "casa_kind": "domestica", "title": "Limpiar cristales del comedor", "casa_place": "Comedor"},
    ),
    (
        "Arreglar la gotera del grifo del baño",
        {"module": "casa", "casa_kind": "mantenimiento", "title": "Gotera del grifo del baño"},
    ),
]


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not email:
        raise SystemExit("Falta ADMIN_EMAIL")
    with psycopg.connect(os.environ["DATABASE_URL"], row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            row = cur.fetchone()
            if not row:
                raise SystemExit(f"Sin usuario {email}")
            user_id = str(row["id"])
            cur.execute(
                "DELETE FROM classification_examples WHERE user_id = %s AND source = 'seed'",
                (user_id,),
            )
            for raw, label in HINTS:
                cur.execute(
                    """
                    INSERT INTO classification_examples (user_id, raw_text, label, source)
                    VALUES (%s, %s, %s::jsonb, 'seed')
                    """,
                    (user_id, raw, json.dumps(label, ensure_ascii=False)),
                )
        conn.commit()
    print(f"Insertados {len(HINTS)} ejemplos seed para {email}")


if __name__ == "__main__":
    main()
