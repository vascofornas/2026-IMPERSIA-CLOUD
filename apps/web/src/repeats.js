const WEEKDAY_LABEL = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
};

export function parseWeeklyDays(repeats) {
  if (!repeats?.startsWith("weekly:")) return null;
  return repeats
    .slice(7)
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
}

export function repeatLabel(repeats, startsAt) {
  if (repeats === "daily") return "Cada día";
  if (repeats === "monthly") return "Cada mes";
  if (repeats === "yearly") return "Cada año";
  const days = parseWeeklyDays(repeats);
  if (days?.length) {
    const names = days.map((d) => WEEKDAY_LABEL[d] || "").filter(Boolean);
    if (names.length === 1) return `Cada ${names[0]}`;
    if (names.length === 2) return `Cada ${names[0]} y ${names[1]}`;
    return `Cada ${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
  }
  if (repeats === "weekly" && startsAt) {
    const raw = new Date(startsAt).toLocaleDateString("es-ES", { weekday: "long" });
    return `Cada ${raw}`;
  }
  return "";
}

/** Una fila por serie repetida (la primera aparición en la lista ya ordenada). */
export function collapseRepeatingSeries(sortedItems) {
  const seen = new Set();
  const out = [];
  for (const item of sortedItems) {
    if (!item.repeats) {
      out.push(item);
      continue;
    }
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const { occurrenceKey, ...row } = item;
    out.push(row);
  }
  return out;
}

/** Estado del editor de repetición (tareas con fecha, no rutinas de hábitos). */
export function taskRepeatEditorState(repeats) {
  if (!repeats) return { preset: "none", weekDays: [] };
  if (repeats === "daily") return { preset: "daily", weekDays: [] };
  if (repeats === "weekly") return { preset: "weekly", weekDays: [] };
  if (repeats === "monthly") return { preset: "monthly", weekDays: [] };
  if (repeats === "yearly") return { preset: "yearly", weekDays: [] };
  const parsed = parseWeeklyDays(repeats);
  if (parsed?.length) return { preset: "weekly_days", weekDays: parsed };
  return { preset: "none", weekDays: [] };
}

export function taskRepeatsFromEditor(preset, weekDays = []) {
  if (preset === "none" || !preset) return null;
  if (preset === "daily") return "daily";
  if (preset === "weekly") return "weekly";
  if (preset === "monthly") return "monthly";
  if (preset === "yearly") return "yearly";
  if (preset === "weekly_days") {
    const days = [...weekDays].sort((a, b) => a - b);
    if (!days.length) return "weekly";
    return `weekly:${days.join(",")}`;
  }
  return null;
}

export function nextOccurrenceWhenLabel(item) {
  if (!item?.starts_at) return repeatLabel(item.repeats, item.starts_at);
  const date = new Date(item.starts_at);
  const day = date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  if (item.time_known) {
    const time = date.toLocaleTimeString("es-ES", { timeStyle: "short" });
    return `Próximo: ${day}, ${time}`;
  }
  return `Próximo: ${day}`;
}
