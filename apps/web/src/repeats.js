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
