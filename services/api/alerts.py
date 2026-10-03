from __future__ import annotations

from datetime import datetime, timedelta
from email.message import EmailMessage
import os
import smtplib
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")
APP_HOME = "https://impersia.cloud/app/#hoy"

MODULE_LABELS = {
    "agenda": "Agenda",
    "casa": "Casa",
    "habitos": "Hábitos",
    "viajes": "Viajes",
    "diario": "Diario",
    "deseos": "Deseos",
    "proyectos": "Proyectos",
    "reuniones": "Reuniones",
    "memoria": "Segunda memoria",
    "ideas": "Ideas",
    "muro": "Muro",
    "listas": "Listas y rutas",
    "circulos": "Círculos",
    "espacios": "Espacios",
}


def run_email_alerts(conn) -> int:
    if not os.environ.get("SMTP_HOST"):
        return 0
    now = datetime.now(MADRID)
    from_dt = day_start(now)
    to_dt = end_of_day(from_dt + timedelta(days=1))
    rows = _fetch_candidates(conn)
    if not rows:
        return 0
    item_ids = [str(row["item_id"]) for row in rows]
    exceptions = _fetch_exceptions(conn, item_ids)
    sent = 0
    for row in rows:
        item = _item_row(row)
        ex_list = exceptions.get(str(row["item_id"]), [])
        for occ in expand_item(item, ex_list, from_dt, to_dt):
            if not _should_send(item, occ, now):
                continue
            day = day_key(occ["starts_at"])
            if _already_sent(conn, row["item_id"], day):
                continue
            if _send_email(row["email"], occ):
                _mark_sent(conn, row["item_id"], day)
                sent += 1
    conn.commit()
    return sent


def _fetch_candidates(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                u.email,
                i.id AS item_id,
                i.title,
                i.module,
                i.starts_at,
                i.repeats,
                i.time_known,
                i.alert_minutes_before
            FROM items i
            JOIN users u ON u.id = i.user_id
            WHERE u.alert_email = true
              AND i.alert_minutes_before IS NOT NULL
              AND i.starts_at IS NOT NULL
            """
        )
        return cur.fetchall()


def _fetch_exceptions(conn, item_ids: list[str]) -> dict[str, list]:
    if not item_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT item_id, day, kind, title, module, starts_at, time_known
            FROM item_exceptions
            WHERE item_id = ANY(%s::uuid[])
            """,
            (item_ids,),
        )
        rows = cur.fetchall()
    grouped: dict[str, list] = {}
    for row in rows:
        grouped.setdefault(str(row["item_id"]), []).append(row)
    return grouped


def _item_row(row: dict) -> dict:
    return {
        "id": str(row["item_id"]),
        "title": row["title"],
        "module": row["module"],
        "starts_at": row["starts_at"],
        "repeats": row["repeats"],
        "time_known": bool(row["time_known"]),
        "alert_minutes_before": row["alert_minutes_before"],
    }


def expand_item(item: dict, exceptions: list, from_dt: datetime, to_dt: datetime) -> list[dict]:
    if not item["starts_at"]:
        return []
    if not item["repeats"]:
        at = _as_madrid(item["starts_at"])
        if at is None or at < from_dt or at > to_dt:
            return []
        occ = _apply_occurrence(item, exceptions, at)
        return [occ] if occ else []
    if item["repeats"] == "daily":
        return _daily(item, exceptions, from_dt, to_dt)
    if item["repeats"] == "weekly":
        return _weekly(item, exceptions, from_dt, to_dt)
    if item["repeats"] == "monthly":
        return _monthly(item, exceptions, from_dt, to_dt)
    return []


def _daily(item, exceptions, from_dt, to_dt):
    anchor = _as_madrid(item["starts_at"])
    if anchor is None:
        return []
    anchor_day = day_start(anchor)
    d = day_start(from_dt)
    if d < anchor_day:
        d = anchor_day
    out = []
    while d <= to_dt:
        at = d.replace(hour=anchor.hour, minute=anchor.minute, second=0, microsecond=0)
        occ = _apply_occurrence(item, exceptions, at)
        if occ:
            out.append(occ)
        d += timedelta(days=1)
    return out


def _weekly(item, exceptions, from_dt, to_dt):
    anchor = _as_madrid(item["starts_at"])
    if anchor is None:
        return []
    anchor_day = day_start(anchor)
    d = day_start(from_dt)
    while d.weekday() != anchor.weekday():
        d += timedelta(days=1)
    while d < anchor_day:
        d += timedelta(days=7)
    out = []
    while d <= to_dt:
        at = d.replace(hour=anchor.hour, minute=anchor.minute, second=0, microsecond=0)
        occ = _apply_occurrence(item, exceptions, at)
        if occ:
            out.append(occ)
        d += timedelta(days=7)
    return out


def _monthly(item, exceptions, from_dt, to_dt):
    anchor = _as_madrid(item["starts_at"])
    if anchor is None:
        return []
    anchor_day = day_start(anchor)
    out = []
    year, month = anchor.year, anchor.month
    day = anchor.day
    for _ in range(240):
        last = (datetime(year, month + 1, 1, tzinfo=MADRID) - timedelta(days=1)).day
        at = datetime(year, month, min(day, last), anchor.hour, anchor.minute, tzinfo=MADRID)
        if at > to_dt:
            break
        if at >= from_dt and at >= anchor_day:
            occ = _apply_occurrence(item, exceptions, at)
            if occ:
                out.append(occ)
        month += 1
        if month == 13:
            month = 1
            year += 1
    return out


def _apply_occurrence(item, exceptions, at: datetime) -> dict | None:
    key = day_key(at)
    ex = next((row for row in exceptions if row["day"].isoformat() == key), None)
    if ex and ex["kind"] == "skip":
        return None
    if ex and ex["kind"] == "override":
        starts = _as_madrid(ex["starts_at"])
        if starts is None:
            return None
        return {
            "item_id": item["id"],
            "title": ex["title"],
            "module": ex["module"],
            "starts_at": starts,
            "time_known": bool(ex["time_known"]),
            "alert_minutes_before": item["alert_minutes_before"],
        }
    return {
        "item_id": item["id"],
        "title": item["title"],
        "module": item["module"],
        "starts_at": at,
        "time_known": item["time_known"],
        "alert_minutes_before": item["alert_minutes_before"],
    }


def _should_send(item: dict, occ: dict, now: datetime) -> bool:
    start = occ["starts_at"]
    alert_at = start - timedelta(minutes=occ["alert_minutes_before"])
    if now < alert_at:
        return False
    if now > start + timedelta(minutes=5):
        return False
    return True


def _already_sent(conn, item_id, day: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM alert_deliveries
            WHERE item_id = %s AND occurrence_day = %s AND channel = 'email'
            """,
            (item_id, day),
        )
        return cur.fetchone() is not None


def _mark_sent(conn, item_id, day: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO alert_deliveries (item_id, occurrence_day, channel)
            VALUES (%s, %s, 'email')
            ON CONFLICT DO NOTHING
            """,
            (item_id, day),
        )


def _send_email(to: str, occ: dict) -> bool:
    subject = f"Impersia: {occ['title']}"
    body = _email_body(occ)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ.get("SMTP_FROM", "impersia@impersia.cloud")
    msg["To"] = to
    msg.set_content(body)
    host = os.environ["SMTP_HOST"]
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.ehlo()
        if user:
            smtp.login(user, password)
        smtp.send_message(msg)
    return True


def _email_body(occ: dict) -> str:
    when = _when_label(occ)
    module = MODULE_LABELS.get(occ["module"], occ["module"])
    return (
        "Impersia\n"
        "\n"
        f"{occ['title']}\n"
        f"{when}\n"
        f"{module}\n"
        "\n"
        f"Ver en Impersia: {APP_HOME}\n"
    )


def _when_label(occ: dict) -> str:
    start = occ["starts_at"]
    date_part = _format_date_es(start)
    if occ["time_known"]:
        return f"{date_part}, {start.strftime('%H:%M')}"
    return date_part


def _format_date_es(value: datetime) -> str:
    weekdays = ("lunes", "martes", "miércoles", "jueves", "vieres", "sábado", "domingo")
    months = (
        "enero",
        "febrero",
        "marzo",
        "abril",
        "mayo",
        "junio",
        "julio",
        "agosto",
        "septiembre",
        "octubre",
        "noviembre",
        "diciembre",
    )
    name = weekdays[value.weekday()]
    return f"{name.capitalize()}, {value.day} de {months[value.month - 1]} de {value.year}"


def day_start(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def end_of_day(value: datetime) -> datetime:
    return value.replace(hour=23, minute=59, second=59, microsecond=999999)


def day_key(value: datetime) -> str:
    return value.date().isoformat()


def _as_madrid(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=MADRID)
    return parsed.astimezone(MADRID)
