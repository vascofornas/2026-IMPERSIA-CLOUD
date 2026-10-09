"""Controles de salud: plan creado por Entrada; lecturas diarias como items log."""

from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

CONTROL_KINDS = frozenset({"presion", "glucosa", "medicacion", "peso"})

KIND_DEFAULT_TITLE = {
    "presion": "Control de tensión arterial",
    "glucosa": "Control de glucosa",
    "medicacion": "Control de medicación",
    "peso": "Control de peso",
}


def _parse_time(value: str | time) -> time:
    if isinstance(value, time):
        return value
    raw = (value or "08:00").strip()
    parts = raw.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    return time(hour, minute)


def insert_control(cur, user_id: str, capture_id: str | None, spec: dict) -> dict:
    kind = spec.get("kind")
    if kind not in CONTROL_KINDS:
        kind = "presion"
    title = (spec.get("title") or KIND_DEFAULT_TITLE[kind]).strip()
    repeats = (spec.get("repeats") or "daily").strip() or "daily"
    reminder = _parse_time(spec.get("reminder_time") or "08:00")
    alert = spec.get("alert_minutes_before")
    cur.execute(
        """
        INSERT INTO health_controls
            (user_id, capture_id, kind, title, repeats, reminder_time, alert_minutes_before, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'active')
        RETURNING id, user_id, kind, title, repeats, reminder_time, alert_minutes_before, status, created_at
        """,
        (user_id, capture_id, kind, title, repeats, reminder, alert),
    )
    return dict(cur.fetchone())


def list_controls(cur, user_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT id, user_id, kind, title, repeats, reminder_time, alert_minutes_before, status, created_at
        FROM health_controls
        WHERE user_id = %s AND status = 'active'
        ORDER BY reminder_time ASC, created_at ASC
        """,
        (user_id,),
    )
    return [dict(row) for row in cur.fetchall()]


def control_due_on_day(control: dict, day: date, *, has_log: bool) -> bool:
    if has_log:
        return False
    repeats = (control.get("repeats") or "daily").lower()
    wd = day.weekday()
    if repeats == "daily":
        return True
    if repeats == "weekly" and wd == 6:
        return True
    if repeats.startswith("weekly:"):
        try:
            allowed = {int(x) for x in repeats.split(":", 1)[1].split(",") if x.strip()}
            return wd in allowed
        except ValueError:
            return True
    return repeats == "daily"


def logs_for_day(cur, user_id: str, control_id: str, day: date) -> bool:
    start = datetime.combine(day, time.min, tzinfo=MADRID)
    end = datetime.combine(day, time.max, tzinfo=MADRID)
    cur.execute(
        """
        SELECT 1 FROM items
        WHERE user_id = %s AND health_control_id = %s
          AND created_at >= %s AND created_at <= %s
        LIMIT 1
        """,
        (user_id, control_id, start, end),
    )
    return cur.fetchone() is not None


def _habit_notes_for_reading(kind: str, payload: dict) -> str | None:
    if kind == "presion":
        sys = payload.get("systolic")
        dia = payload.get("diastolic")
        if sys is not None and dia is not None:
            return f"{int(sys)}/{int(dia)} mmHg"
    if kind == "glucosa" and payload.get("mg_dl") is not None:
        return f"{int(payload['mg_dl'])} mg/dL"
    if kind == "peso" and payload.get("kg") is not None:
        kg = payload["kg"]
        return f"{kg} kg".replace(".", ",") if isinstance(kg, str) else f"{kg} kg"
    return payload.get("note")


def _title_for_reading(control: dict, payload: dict, notes: str | None) -> str:
    kind = control["kind"]
    if kind == "presion" and notes:
        return f"Tensión {notes.replace(' mmHg', '')}"
    if kind == "glucosa" and payload.get("mg_dl") is not None:
        return f"Glucosa {payload['mg_dl']} en ayunas"
    if kind == "peso" and payload.get("kg") is not None:
        kg = payload["kg"]
        return f"Peso {kg} kg".replace(".", ",")
    if kind == "medicacion":
        base = control.get("title") or "Medicación"
        return f"{base} — tomada" if payload.get("taken", True) else f"{base} — no tomada"
    return control.get("title") or "Registro de salud"


def insert_reading(cur, user_id: str, control: dict, payload: dict, *, capture_id: str | None = None) -> dict:
    kind = control["kind"]
    notes = _habit_notes_for_reading(kind, payload)
    title = _title_for_reading(control, payload, notes)
    now = datetime.now(MADRID)
    cur.execute(
        """
        INSERT INTO items
            (user_id, capture_id, kind, axis, module, title, starts_at, repeats, time_known,
             habit_role, habit_kind, habit_notes, health_control_id, privacy, archived_source, created_at)
        VALUES (%s, %s, 'task', 'personal', 'habitos', %s, %s, NULL, true,
                'log', %s, %s, %s, 'private', 'health_control_reading', %s)
        RETURNING id
        """,
        (
            user_id,
            capture_id,
            title,
            now,
            kind,
            notes,
            str(control["id"]),
            now,
        ),
    )
    return dict(cur.fetchone())


def public_control(row: dict, *, done_today: bool) -> dict:
    rt = row["reminder_time"]
    return {
        "id": str(row["id"]),
        "kind": row["kind"],
        "title": row["title"],
        "repeats": row.get("repeats") or "daily",
        "reminder_time": rt.strftime("%H:%M") if hasattr(rt, "strftime") else str(rt)[:5],
        "alert_minutes_before": row.get("alert_minutes_before"),
        "status": row.get("status") or "active",
        "done_today": done_today,
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
    }
