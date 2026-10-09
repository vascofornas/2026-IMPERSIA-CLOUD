import { parseWeeklyDays } from "./repeats.js";

const FRANJA_LABEL = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
  dia: "Durante el día",
};

const KIND_LABEL = {
  rutina: "Rutina",
  ejercicio: "Ejercicio",
  meditacion: "Meditación",
  lectura: "Lectura",
  sueno: "Sueño",
  medicacion: "Medicación",
  presion: "Tensión",
  glucosa: "Glucosa",
  peso: "Peso",
  sintoma: "Síntoma",
  salud: "Salud",
  otro: "Registro",
};

const HEALTH_SUMMARY_ORDER = ["medicacion", "presion", "glucosa", "peso", "sintoma", "salud", "otro"];

export function habitKindLabel(kind) {
  return KIND_LABEL[kind] || KIND_LABEL.otro;
}

export function franjaLabel(id) {
  return FRANJA_LABEL[id] || FRANJA_LABEL.dia;
}

export function dayKeyFromDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function exceptionFor(item, key) {
  return (item.exceptions || []).find((ex) => ex.day === key);
}

export function isHabitRoutine(item) {
  return item?.module === "habitos" && item.habit_role !== "log";
}

export function isHabitLog(item) {
  return item?.module === "habitos" && item.habit_role === "log";
}

export function habitFranja(item) {
  if (item.starts_at) {
    const h = new Date(item.starts_at).getHours();
    if (h < 12) return "manana";
    if (h < 19) return "tarde";
    return "noche";
  }
  const low = (item.title || "").toLowerCase();
  if (low.includes("noche") || item.habit_kind === "lectura") return "noche";
  if (low.includes("mañana") || low.includes("manana")) return "manana";
  return "dia";
}

export function isRoutineDoneToday(item, dayKey) {
  if (exceptionFor(item, dayKey)?.kind === "done") return true;
  if (!item.repeats && item.status === "done") return true;
  return false;
}

/** ¿Esta rutina toca en la fecha concreta (no solo «hoy»)? */
export function routineDueOnDay(item, dayDate, expandItems, endOfDay) {
  if (!isHabitRoutine(item)) return false;
  const key = dayKeyFromDate(dayDate);
  if (exceptionFor(item, key)?.kind === "skip") return false;

  const weekDays = parseWeeklyDays(item.repeats);
  if (weekDays?.length) {
    return weekDays.includes(dayDate.getDay());
  }
  if (item.repeats === "daily") return true;
  if (item.repeats === "weekly" || item.repeats === "monthly" || item.repeats === "yearly") {
    if (!item.starts_at) return false;
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    return expandItems([item], dayStart, endOfDay(dayStart)).length > 0;
  }
  if (!item.repeats) {
    if (!item.starts_at) return false;
    return dayKeyFromDate(new Date(item.starts_at)) === key;
  }
  return false;
}

export function routineDueToday(item, todayStart, expandItems, endOfDay) {
  return routineDueOnDay(item, todayStart, expandItems, endOfDay);
}

export function routinesForToday(items, todayStart, expandItems, endOfDay) {
  return items
    .filter((item) => routineDueToday(item, todayStart, expandItems, endOfDay))
    .sort((a, b) => {
      const ta = a.starts_at ? new Date(a.starts_at).getTime() : 0;
      const tb = b.starts_at ? new Date(b.starts_at).getTime() : 0;
      return ta - tb || a.title.localeCompare(b.title, "es");
    });
}

export function pickHeroRoutine(routines, dayKey) {
  const pending = routines.filter((item) => !isRoutineDoneToday(item, dayKey));
  if (!pending.length) return routines[0] || null;
  const now = new Date();
  const scored = pending.map((item) => {
    let score = 0;
    if (item.starts_at && item.time_known) {
      const at = new Date(item.starts_at);
      const diff = at.getTime() - now.getTime();
      if (diff >= 0 && diff < 3 * 3600000) score += 100;
      if (diff < 0) score += 50;
    }
    if (habitFranja(item) === "manana" && now.getHours() < 12) score += 20;
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].item;
}

export function groupRoutinesByFranja(routines) {
  const order = ["manana", "dia", "tarde", "noche"];
  const map = new Map(order.map((id) => [id, []]));
  routines.forEach((item) => {
    const key = habitFranja(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return order.filter((id) => map.get(id).length).map((id) => ({ id, label: franjaLabel(id), items: map.get(id) }));
}

export function logRecordDate(item) {
  const raw = item?.created_at || item?.starts_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function habitLogsInMonth(items, year, month, filter) {
  return items
    .filter((item) => {
      if (!isHabitLog(item)) return false;
      if (filter === "sueno" && item.habit_kind !== "sueno") return false;
      if (filter === "health" && item.habit_kind === "sueno") return false;
      const d = logRecordDate(item);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function monthLabel(year, month) {
  const raw = new Date(year, month, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = d.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  d.setDate(d.getDate() + diff);
  return d;
}

function weekGroupLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const from = weekStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const to = end.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return `Semana del ${from} al ${to}`;
}

export function groupLogsByWeek(items) {
  const map = new Map();
  for (const item of items) {
    const d = logRecordDate(item);
    if (!d) continue;
    const weekStart = startOfWeekMonday(d);
    const key = dayKeyFromDate(weekStart);
    if (!map.has(key)) map.set(key, { start: weekStart, items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()]
    .sort((a, b) => b.start - a.start)
    .map((block) => ({
      label: weekGroupLabel(block.start),
      items: block.items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    }));
}

export function registroPeriodSummary(sleepEntries, healthEntries) {
  const total = sleepEntries.length + healthEntries.length;
  if (!total) return null;
  const parts = [`${total} apunte${total === 1 ? "" : "s"}`];
  if (sleepEntries.length) parts.push(`${sleepEntries.length} de sueño`);
  if (healthEntries.length) {
    const byKind = {};
    for (const item of healthEntries) {
      const k = item.habit_kind || "otro";
      byKind[k] = (byKind[k] || 0) + 1;
    }
    const detail = HEALTH_SUMMARY_ORDER.filter((k) => byKind[k]).map((k) => {
      const n = byKind[k];
      const label = KIND_LABEL[k] || k;
      return `${n} ${label.toLowerCase()}${n === 1 ? "" : ""}`;
    });
    if (detail.length) parts.push(detail.join(", "));
    else parts.push(`${healthEntries.length} de salud`);
  }
  return parts.join(" · ");
}

export function sleepLogs(items, limit = 8) {
  return items
    .filter((item) => isHabitLog(item) && item.habit_kind === "sueno")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

export function latestSleepLog(items) {
  return sleepLogs(items, 1)[0] || null;
}

export function latestSleepLine(items) {
  const latest = latestSleepLog(items);
  if (!latest) return null;
  const { hours, note } = sleepLogDisplay(latest);
  if (hours != null) return `${formatSleepHours(hours)}${note ? ` · ${note}` : ""}`;
  return latest.habit_notes || latest.title;
}

function formatSleepHours(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (Number.isInteger(n)) return `${n} h`;
  return `${String(n).replace(".", ",")} h`;
}

export function sleepHoursFromLog(item) {
  const notes = item?.habit_notes || "";
  const title = item?.title || "";
  const fromNotes = notes.match(/^([\d.,]+)\s*h(?:oras)?/i);
  if (fromNotes) return Number(fromNotes[1].replace(",", "."));
  const fromTitle = title.match(/(\d+(?:[.,]\d+)?)\s*h(?:oras)?/i);
  if (fromTitle) return Number(fromTitle[1].replace(",", "."));
  return null;
}

export function sleepLogDisplay(item) {
  const hours = sleepHoursFromLog(item);
  let note = (item.title || "").trim();
  note = note.replace(/^(?:anoche\s+)?/i, "");
  note = note.replace(/^he\s+dormido\s+/i, "");
  note = note.replace(/^dorm[ií](?:do)?\s+/i, "");
  note = note.replace(/\d+(?:[.,]\d+)?\s*h(?:oras)?(?:\s+seguidas?)?/gi, " ");
  note = note.replace(/\bsolo\b/gi, " ");
  note = note.split(/\s+/).join(" ").replace(/^[ .,;:-]+|[ .,;:-]+$/g, "");
  if (!note || note.length < 3) note = null;
  if (note && hours != null && note.toLowerCase().includes("seguid")) {
    note = null;
  }
  return { hours, note };
}

export function logWhenLabel(createdAt) {
  if (!createdAt) return "";
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startAt = new Date(at.getFullYear(), at.getMonth(), at.getDate());
  const diffDays = Math.round((startToday - startAt) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays === 2) return "Anteayer";
  return at.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

export function recentHabitLogs(items, limit = 8) {
  return items
    .filter((item) => isHabitLog(item) && item.habit_kind !== "sueno")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);
}

const WEEKDAY_SHORT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

export function trackingWeek(item, todayStart, expandItems, endOfDay, days = 7) {
  const out = [];
  let dueCount = 0;
  let doneCount = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - i);
    const key = dayKeyFromDate(d);
    const due = routineDueOnDay(item, d, expandItems, endOfDay);
    const done = isRoutineDoneToday(item, key);
    if (due) {
      dueCount += 1;
      if (done) doneCount += 1;
    }
    out.push({
      key,
      label: WEEKDAY_SHORT[d.getDay()],
      dayNum: d.getDate(),
      due,
      done,
      isToday: i === 0,
    });
  }
  return { days: out, dueCount, doneCount };
}

export function hasHoyBienestarContent(items, todayStart, expandItems, endOfDay) {
  if (routinesForToday(items, todayStart, expandItems, endOfDay).length) return true;
  if (latestSleepLog(items)) return true;
  if (items.some(isHabitRoutine)) return true;
  return false;
}

export function hasHabitContent(items, todayStart, expandItems, endOfDay) {
  const routines = routinesForToday(items, todayStart, expandItems, endOfDay);
  if (routines.length) return true;
  if (latestSleepLine(items)) return true;
  if (items.some(isHabitLog)) return true;
  return false;
}
