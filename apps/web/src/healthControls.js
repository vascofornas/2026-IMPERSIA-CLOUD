import { habitKindLabel } from "./habitos.js";

export const CONTROL_KINDS = ["presion", "glucosa", "medicacion", "peso"];

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

export function controlCreatedNotice(controls) {
  if (!controls?.length) return null;
  const one = controls[0];
  return `Control creado: ${one.title}. ${controlScheduleLabel(one)}. Cuando toque, regístralo abajo.`;
}
