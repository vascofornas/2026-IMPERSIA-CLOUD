import { habitKindLabel } from "./habitos.js";

export const CONTROL_KINDS = ["presion", "glucosa", "medicacion", "peso"];

export const CONTROL_KIND_OPTIONS = [
  ["presion", "Tensión arterial"],
  ["glucosa", "Glucosa (azúcar)"],
  ["medicacion", "Medicación (toma diaria)"],
  ["peso", "Peso"],
];

export const CONTROL_DEFAULT_TITLE = {
  presion: "Control de tensión arterial",
  glucosa: "Control de glucosa",
  medicacion: "Control de medicación",
  peso: "Control de peso",
};

export function controlKindLabel(kind) {
  return habitKindLabel(kind);
}

export function controlScheduleLabel(control) {
  const time = control.reminder_time || "08:00";
  const rep = (control.repeats || "daily").toLowerCase();
  if (rep === "weekly") return `Cada domingo · ${time}`;
  return `Cada día · ${time}`;
}

export function pendingControls(controls) {
  return (controls || []).filter((c) => c.status === "active" && !c.done_today);
}
