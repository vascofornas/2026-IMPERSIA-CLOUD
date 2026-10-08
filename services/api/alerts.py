from __future__ import annotations

from datetime import datetime, timedelta
from email.message import EmailMessage
import os
import smtplib
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

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

MODULE_COLORS = {
    "agenda": "#0f766e",
    "casa": "#c2410c",
    "habitos": "#4d7c0f",
    "viajes": "#0369a1",
    "diario": "#78716c",
    "deseos": "#e11d48",
    "proyectos": "#4338ca",
    "reuniones": "#1d4ed8",
    "memoria": "#7c3aed",
    "ideas": "#d97706",
    "muro": "#a21caf",
    "listas": "#0891b2",
    "circulos": "#db2777",
    "espacios": "#15803d",
}

MARK = "#0f5c4c"
SITE_URL = "https://impersia.cloud"
APP_URL = f"{SITE_URL}/app"
LOGO_URL = f"{SITE_URL}/logo-email.png"
PRIVACY_URL = f"{SITE_URL}/privacidad.html"
PROFILE_URL = f"{APP_URL}/#perfil"
CONTACT_EMAIL = "impersia@impersia.cloud"


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
    if item["repeats"] == "yearly":
        return _yearly(item, exceptions, from_dt, to_dt)
    return []


def _yearly(item, exceptions, from_dt, to_dt):
    anchor = _as_madrid(item["starts_at"])
    if anchor is None:
        return []
    anchor_day = day_start(anchor)
    out = []
    year = max(anchor.year, from_dt.year)
    while year <= to_dt.year + 1:
        try:
            at = anchor.replace(year=year)
        except ValueError:
            at = anchor.replace(year=year, day=28)
        if at > to_dt:
            break
        if at >= from_dt and at >= anchor_day:
            occ = _apply_occurrence(item, exceptions, at)
            if occ:
                out.append(occ)
        year += 1
    return out


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
    when = _when_label(occ)
    module = MODULE_LABELS.get(occ["module"], occ["module"])
    subject = occ["title"]
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = os.environ.get("SMTP_FROM", "impersia@impersia.cloud")
    msg["To"] = to
    msg.set_content(_email_plain(occ, when, module))
    msg.add_alternative(_email_html(occ, when, module), subtype="html")
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


def _module_link(module: str) -> str:
    return f"{APP_URL}/#{module}"


def _alert_note(occ: dict) -> str:
    minutes = occ.get("alert_minutes_before")
    if minutes is None:
        return ""
    if minutes == 0:
        return "Aviso a la hora"
    if minutes == 15:
        return "Aviso 15 minutos antes"
    if minutes == 60:
        return "Aviso 1 hora antes"
    if minutes == 1440:
        return "Aviso 1 día antes"
    if minutes < 60:
        return f"Aviso {minutes} minutos antes"
    if minutes % 1440 == 0:
        return f"Aviso {minutes // 1440} días antes"
    if minutes % 60 == 0:
        return f"Aviso {minutes // 60} horas antes"
    return f"Aviso {minutes} minutos antes"


def _email_plain(occ: dict, when: str, module: str) -> str:
    note = _alert_note(occ)
    lines = [
        "Impersia",
        "",
        occ["title"],
        when,
        module,
    ]
    if note:
        lines.append(note)
    lines.extend(["", f"Ver en Impersia: {_module_link(occ['module'])}", ""])
    lines.extend(_email_legal_plain())
    return "\n".join(lines) + "\n"


def _email_legal_plain() -> list[str]:
    return [
        "---",
        "Aviso de servicio, no publicidad.",
        "Recibes este correo porque activaste los avisos por correo en tu perfil de Impersia.",
        f"Desactivar avisos: {PROFILE_URL}",
        f"Privacidad: {PRIVACY_URL}",
        f"Contacto: {CONTACT_EMAIL}",
        "Responsable: Impersia (impersia.cloud).",
        "Tratamos tu correo para enviarte recordatorios de entradas tuyas con fecha y hora.",
        "Base legal: tu consentimiento (RGPD art. 6.1.a), retirable en Perfil.",
        "Puedes ejercer acceso, rectificación, supresión y otros derechos escribiendo al contacto.",
        "© Impersia 2026",
    ]


def _email_html(occ: dict, when: str, module: str) -> str:
    color = MODULE_COLORS.get(occ["module"], MARK)
    link = _module_link(occ["module"])
    note = _alert_note(occ)
    note_row = (
        f'<tr><td style="padding:10px 0 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#6b7280;">{note}</td></tr>'
        if note
        else ""
    )
    title = _html_escape(occ["title"])
    module_label = _html_escape(module.upper())
    when_text = _html_escape(when)
    return f"""<!doctype html>
<html lang="es">
<head>
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff">
    <tr>
      <td align="center" style="padding:12px 16px 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="max-width:440px;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
          <tr>
            <td bgcolor="#f3efe6" style="padding:16px 18px 14px;border-bottom:3px solid {MARK};">
              <a href="{SITE_URL}" style="text-decoration:none;">
                <img src="{LOGO_URL}" width="140" height="97" alt="Impersia" style="display:block;border:0;max-width:140px;height:auto;">
              </a>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="border-left:4px solid {color};padding:18px 18px 16px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:5px 11px;border:1px solid {color};border-radius:999px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1;font-weight:700;letter-spacing:0.05em;">
                    <font color="{color}"><span style="color:{color};">{module_label}</span></font>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;">
                <tr>
                  <td style="font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:21px;line-height:1.35;font-weight:700;color:#111827;">{title}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0 0;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#374151;">{when_text}</td>
                </tr>
                {note_row}
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:0 18px 18px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border:2px solid {MARK};border-radius:999px;">
                    <a href="{link}" style="display:inline-block;padding:11px 18px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1;font-weight:700;text-decoration:none;">
                      <font color="{MARK}"><span style="color:{MARK};">Ver en Impersia</span></font>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#f9fafb" style="padding:14px 18px;font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.55;color:#6b7280;border-top:1px solid #e5e7eb;">
              {_email_legal_html()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _email_legal_html() -> str:
    return f"""<strong style="color:#374151;">Aviso de servicio, no publicidad.</strong><br><br>
Recibes este correo porque activaste los avisos por correo en tu perfil de Impersia y tienes una entrada con fecha y hora.<br><br>
<strong style="color:#374151;">Responsable:</strong> Impersia (impersia.cloud)<br>
<strong style="color:#374151;">Contacto:</strong> <a href="mailto:{CONTACT_EMAIL}" style="color:{MARK};text-decoration:underline;">{CONTACT_EMAIL}</a><br><br>
<strong style="color:#374151;">Datos personales (RGPD):</strong> usamos tu correo solo para estos recordatorios. Base legal: tu consentimiento (art. 6.1.a), que puedes retirar en <a href="{PROFILE_URL}" style="color:{MARK};text-decoration:underline;">Perfil</a> → Desactivar avisos por correo.<br><br>
<a href="{PRIVACY_URL}" style="color:{MARK};text-decoration:underline;">Política de privacidad</a><br><br>
© Impersia 2026"""


def _html_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _when_label(occ: dict) -> str:
    start = occ["starts_at"]
    date_part = _format_date_es(start)
    if occ["time_known"]:
        return f"{date_part}, {start.strftime('%H:%M')}"
    return date_part


def _format_date_es(value: datetime) -> str:
    weekdays = ("lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo")
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
