"""Evitar ítems duplicados al archivar una Entrada."""

from __future__ import annotations

import re
from datetime import datetime
from zoneinfo import ZoneInfo

MADRID = ZoneInfo("Europe/Madrid")

NOTE_FIELDS = (
    "medical_notes",
    "family_notes",
    "leisure_notes",
    "reminder_notes",
    "casa_notes",
    "habit_notes",
)


def norm_title(value: str | None) -> str:
    if not value:
        return ""
    text = value.lower().strip()
    text = re.sub(r"[^\w\sáéíóúñ]", " ", text, flags=re.IGNORECASE)
    return " ".join(text.split())


def _tokens(value: str) -> set[str]:
    return {w for w in norm_title(value).split() if len(w) > 2}


def titles_match(a: str, b: str) -> bool:
    na, nb = norm_title(a), norm_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return False
    overlap = len(ta & tb) / len(ta | tb)
    return overlap >= 0.82


def _day_in_madrid(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=MADRID)
    else:
        parsed = parsed.astimezone(MADRID)
    return parsed.date().isoformat()


def _month_day(value) -> tuple[int, int] | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=MADRID)
    else:
        parsed = parsed.astimezone(MADRID)
    return parsed.month, parsed.day


def fingerprint(suggestion: dict, *, title: str | None = None) -> tuple:
    title_val = title or suggestion.get("title") or ""
    module = suggestion.get("module") or ""
    casa_kind = suggestion.get("casa_kind") or ""
    agenda_type = suggestion.get("agenda_type") or ""
    day = _day_in_madrid(suggestion.get("starts_at"))
    return (
        module,
        casa_kind,
        agenda_type,
        suggestion.get("family_kind") or "",
        norm_title(suggestion.get("family_name") or ""),
        suggestion.get("supply_kind") or "",
        suggestion.get("shopping_list_id") or "",
        norm_title(title_val),
        day or "",
        suggestion.get("repeats") or "",
    )


def _matches(existing: dict, suggestion: dict, *, title: str) -> bool:
    module = suggestion.get("module")
    if existing.get("module") != module:
        return False
    if existing.get("status") == "done":
        return False

    if module == "casa" and suggestion.get("casa_kind") == "compra":
        if existing.get("casa_kind") != "compra":
            return False
        list_id = suggestion.get("shopping_list_id")
        if list_id and str(existing.get("shopping_list_id")) != str(list_id):
            return False
        return titles_match(existing.get("title") or "", title)

    if module == "casa" and suggestion.get("casa_kind") == "suministro":
        if existing.get("casa_kind") != "suministro":
            return False
        if suggestion.get("supply_kind") and existing.get("supply_kind") != suggestion.get("supply_kind"):
            return False
        if suggestion.get("casa_place") and existing.get("casa_place"):
            if norm_title(existing["casa_place"]) != norm_title(suggestion["casa_place"]):
                return False
        return titles_match(existing.get("title") or "", title) or (
            suggestion.get("supply_kind") and suggestion.get("supply_kind") == existing.get("supply_kind")
        )

    if module == "agenda" and suggestion.get("agenda_type") == "familiar":
        if existing.get("agenda_type") != "familiar":
            return False
        if suggestion.get("family_kind") and existing.get("family_kind") != suggestion.get("family_kind"):
            return False
        name_a = norm_title(suggestion.get("family_name") or "")
        name_b = norm_title(existing.get("family_name") or "")
        if name_a and name_b and name_a != name_b:
            return False
        if suggestion.get("repeats") == "yearly" or existing.get("repeats") == "yearly":
            md_new = _month_day(suggestion.get("starts_at"))
            md_old = _month_day(existing.get("starts_at"))
            if md_new and md_old:
                return md_new == md_old
        return titles_match(existing.get("title") or "", title) or (name_a and name_a == name_b)

    if module == "agenda":
        day_new = _day_in_madrid(suggestion.get("starts_at"))
        day_old = _day_in_madrid(existing.get("starts_at"))
        if day_new and day_old and day_new != day_old:
            return False
        if day_new is None and day_old is None:
            return titles_match(existing.get("title") or "", title)
        if day_new and day_old and day_new == day_old:
            if suggestion.get("agenda_type") and existing.get("agenda_type"):
                if suggestion.get("agenda_type") != existing.get("agenda_type"):
                    return False
            return titles_match(existing.get("title") or "", title)
        return False

    return titles_match(existing.get("title") or "", title)


def find_duplicate(cur, user_id: str, suggestion: dict, *, title: str) -> dict | None:
    module = suggestion.get("module") or "diario"
    cur.execute(
        """
        SELECT id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
               agenda_type, medical_for, medical_name, medical_place, medical_notes,
               family_kind, family_for, family_name, family_place, family_notes,
               leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
               reminder_kind, reminder_place, reminder_notes,
               casa_kind, casa_place, casa_notes, supply_kind,
               habit_role, habit_kind, habit_notes,
               shopping_list_id, status, privacy, created_at
        FROM items
        WHERE user_id = %s AND module = %s AND status = 'open'
        ORDER BY created_at DESC
        LIMIT 120
        """,
        (user_id, module),
    )
    rows = cur.fetchall()
    for row in rows:
        if _matches(row, suggestion, title=title):
            return row
    return None


def _append_note(old: str | None, new: str | None) -> str | None:
    if not new or not str(new).strip():
        return old
    new_clean = str(new).strip()[:2000]
    if not old or not str(old).strip():
        return new_clean
    if new_clean in old:
        return old
    return f"{old.strip()}\n{new_clean}"[:4000]


def merge_existing(
    cur,
    user_id: str,
    capture_id: str,
    suggestion: dict,
    existing: dict,
) -> dict:
    updates: dict[str, str | None] = {}
    for field in NOTE_FIELDS:
        merged = _append_note(existing.get(field), suggestion.get(field))
        if merged != existing.get(field):
            updates[field] = merged

    sets = ["capture_id = %s"]
    params: list = [capture_id]
    for field, value in updates.items():
        sets.append(f"{field} = %s")
        params.append(value)

    params.extend([existing["id"], user_id])
    cur.execute(
        f"""
        UPDATE items
        SET {", ".join(sets)}
        WHERE id = %s AND user_id = %s
        RETURNING id, kind, axis, module, title, starts_at, repeats, time_known, alert_minutes_before,
                  agenda_type, medical_for, medical_name, medical_place, medical_notes,
                  family_kind, family_for, family_name, family_place, family_notes,
                  leisure_kind, leisure_with, leisure_name, leisure_place, leisure_notes,
                  reminder_kind, reminder_place, reminder_notes,
                  casa_kind, casa_place, casa_notes, supply_kind,
                  habit_role, habit_kind, habit_notes,
                  shopping_list_id, status, privacy, created_at
        """,
        params,
    )
    return cur.fetchone()
