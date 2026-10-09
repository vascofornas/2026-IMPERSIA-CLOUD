export const ALERT_OPTIONS = [
  { value: "", label: "Sin aviso" },
  { value: "0", label: "A la hora" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 día antes" },
];

export function dayLabel(value) {
  const raw = new Date(value).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function datePart(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function timePart(proposal) {
  const value = proposal.starts_at;
  if (!value || !proposal.time_known) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function allowsAlertMinutes(editing) {
  if (!editing?.starts_at) return false;
  if (editing.time_known) return true;
  if (editing.module === "casa") return true;
  if (editing.module === "agenda") return true;
  return false;
}

export function withWhen(proposal, day, time) {
  if (!day) return { ...proposal, starts_at: null, time_known: false, alert_minutes_before: null };
  if (!time) {
    const alert =
      proposal.alert_minutes_before ??
      (proposal.module === "agenda" && proposal.agenda_type === "recordatorio" ? 1440 : null);
    return { ...proposal, starts_at: day, time_known: false, alert_minutes_before: alert };
  }
  return {
    ...proposal,
    starts_at: `${day}T${time}`,
    time_known: true,
    alert_minutes_before: proposal.alert_minutes_before ?? 15,
  };
}

export function alertValue(item) {
  const value = item.alert_minutes_before;
  return value == null ? "" : String(value);
}

export function parseAlert(value) {
  if (value === "") return null;
  return Number(value);
}
