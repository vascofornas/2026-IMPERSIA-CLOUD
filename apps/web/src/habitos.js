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
  salud: "Salud",
  otro: "Bienestar",
};

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

export function routineDueToday(item, todayStart, expandItems, endOfDay) {
  if (!isHabitRoutine(item)) return false;
  const key = dayKeyFromDate(todayStart);
  if (exceptionFor(item, key)?.kind === "skip") return false;
  if (item.repeats && item.starts_at) {
    return expandItems([item], todayStart, endOfDay(todayStart)).length > 0;
  }
  if (item.repeats === "daily") return true;
  if (!item.repeats) {
    if (!item.starts_at) return true;
    return dayKeyFromDate(new Date(item.starts_at)) === key;
  }
  if (item.repeats && !item.starts_at) return true;
  return false;
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

export function latestSleepLine(items) {
  const logs = items
    .filter((item) => isHabitLog(item) && item.habit_kind === "sueno")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = logs[0];
  if (!latest) return null;
  const detail = latest.habit_notes || latest.title;
  return detail;
}

export function recentHabitLogs(items, limit = 8) {
  return items
    .filter(isHabitLog)
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
    const due = routineDueToday(item, d, expandItems, endOfDay);
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

export function hasHabitContent(items, todayStart, expandItems, endOfDay) {
  const routines = routinesForToday(items, todayStart, expandItems, endOfDay);
  if (routines.length) return true;
  if (latestSleepLine(items)) return true;
  if (items.some(isHabitLog)) return true;
  return false;
}
