#!/usr/bin/env python3
"""
Carga frases de prueba de Agenda y Casa usando archive() (OpenRouter si IA activa).

En el VPS:
  set -a; source /etc/impersia/api.env; set +a
  cd /opt/impersia-os/services/api && python3 scripts/seed_axis_a_entries.py
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(API_DIR))

import psycopg
from psycopg.rows import dict_row

import archive
from classify import compra_store_name, split_compra_titles
from main import _ensure_active_shopping_list, _insert_item

AGENDA_PHRASES = [
    "Dentista el martes a las 9:30 en Clínica DentalPlus",
    "Pediatra de Sofía el viernes a las 11, avísame una hora antes",
    "Revisión cardiólogo mamá el 15 de noviembre a las 10:00 Hospital La Paz",
    "Fisioterapia rodilla el jueves a las 18 en Centro Médico",
    "Cumpleaños de papá el 3 de diciembre, comida en casa",
    "Aniversario de bodas con Marta el 20 de octubre, cena en restaurante",
    "Bautizo de Lucía el sábado a las 12 en la parroquia de San Miguel",
    "Comida familiar domingo a las 14 en casa de los suegros",
    "Cena con Laura el viernes a las 21:00 en Casa Lucio",
    "Concierto de Coldplay el 12 de junio a las 20:30 en el Bernabéu",
    "Quedar con Miguel para tomar un café el sábado a las 11",
    "Partido del Madrid el domingo a las 16:00 en el estadio",
    "ITV del coche antes del 30 de noviembre",
    "Renovar seguro del hogar antes del 1 de diciembre",
    "Pagar el IBI antes del 15 de enero",
    "Recoger pasaporte en comisaría el miércoles a las 10",
    "Cada lunes yoga a las 7 de la mañana en el gimnasio",
    "Cita urologo el 10 de octubre a las 8:30, aviso 30 minutos antes",
    "Comida de empresa Navidad 19 de diciembre a las 14 en hotel",
    "Recordatorio vacuna gripe abuelo el martes por la tarde",
]

CASA_PHRASES = [
    "Comprar leche, huevos, pan y tomates en Mercadona",
    "Hace falta detergente y papel higiénico",
    "Comprar arroz y garbanzos",
    "Necesito champú y gel de ducha",
    "Comprar cerveza y patatas fritas para el partido",
    "Quedan 2 garrafas de aceite en la despensa",
    "Tenemos 6 latas de atún en el trastero",
    "Quedan 3 rollos de papel de cocina bajo el fregadero",
    "Stock de 4 cartuchos de tinta en el despacho",
    "Pasar aspiradora a toda la casa",
    "Sacar la basura esta noche",
    "Poner una lavadora a las 20:00",
    "Limpiar cristales del comedor",
    "Fregar la cocina después de comer",
    "Arreglar la gotera del grifo del baño",
    "Cambiar filtro del aire acondicionado del salón",
    "Reparar la persiana del dormitorio que no sube",
    "Factura de la luz Iberdrola vence el 20 de cada mes",
    "Recibo del gas Naturgy antes del 25 de octubre",
    "Contrato internet Movistar renovar en diciembre",
]


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


def file_one(cur, user_id: str, raw: str) -> dict:
    suggestion = archive.archive(cur, user_id, raw)
    cur.execute(
        """
        INSERT INTO captures
            (user_id, raw_text, suggested_kind, suggested_title, suggested_starts_at, source, status)
        VALUES (%s, %s, %s, %s, %s, %s, 'filed')
        RETURNING id
        """,
        (
            user_id,
            raw,
            suggestion["kind"],
            suggestion["title"],
            suggestion["starts_at"],
            suggestion.get("source", "rules"),
        ),
    )
    capture_id = str(cur.fetchone()["id"])
    count = 0
    if suggestion.get("module") == "casa" and suggestion.get("casa_kind") == "compra":
        list_row = _ensure_active_shopping_list(cur, user_id)
        store = compra_store_name(raw) or suggestion.get("casa_place")
        if store and not list_row.get("store_name"):
            cur.execute(
                "UPDATE shopping_lists SET store_name = %s WHERE id = %s",
                (store, list_row["id"]),
            )
        titles = split_compra_titles(raw)
        for title in titles:
            _insert_item(
                cur,
                user_id,
                capture_id,
                suggestion,
                title=title,
                shopping_list_id=str(list_row["id"]),
                casa_place=None,
            )
            count += 1
    else:
        _insert_item(cur, user_id, capture_id, suggestion)
        count = 1
    return {
        "raw": raw,
        "module": suggestion.get("module"),
        "agenda_type": suggestion.get("agenda_type"),
        "casa_kind": suggestion.get("casa_kind"),
        "title": suggestion.get("title"),
        "source": suggestion.get("source"),
        "items": count,
    }


def run_batch(cur, user_id: str, label: str, phrases: list[str], pause_s: float = 0.3) -> list[dict]:
    out = []
    print(f"\n=== {label} ({len(phrases)} frases) ===")
    for i, raw in enumerate(phrases, 1):
        row = file_one(cur, user_id, raw)
        out.append(row)
        print(
            f"{i:2}. [{row['source']}] {row['module']}"
            f"{('/' + str(row['agenda_type'])) if row.get('agenda_type') else ''}"
            f"{('/' + str(row['casa_kind'])) if row.get('casa_kind') else ''}"
            f" · {row['title'][:50]}"
            + (f" · {row['items']} ítems" if row["items"] > 1 else "")
        )
        time.sleep(pause_s)
    return out


def main() -> None:
    with db() as conn:
        with conn.cursor() as cur:
            user_id = admin_user_id(cur)
            agenda = run_batch(cur, user_id, "Agenda y citas", AGENDA_PHRASES)
            casa = run_batch(cur, user_id, "Logística doméstica (Casa)", CASA_PHRASES)
        conn.commit()
    print(f"\nListo: {len(agenda)} entradas Agenda + {len(casa)} Casa (vía archive/IA).")


if __name__ == "__main__":
    main()
