const MODULE_LABELS = {
  agenda: "Agenda",
  casa: "Casa",
  habitos: "Bienestar y hábitos",
  viajes: "Viajes y experiencias",
  diario: "Diario",
  deseos: "Deseos",
  proyectos: "Proyectos",
  reuniones: "Reuniones",
  memoria: "Segunda memoria",
  ideas: "Ideas",
  muro: "Muro",
  listas: "Listas",
  circulos: "Círculos",
  espacios: "Espacios",
};

function labelOf(id) {
  return MODULE_LABELS[id] || id;
}

function dayKey(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function whenShort(item) {
  const date = new Date(item.starts_at);
  if (!item.time_known) {
    return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
  }
  return date.toLocaleString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Dónde quedó y cuándo lo verá en Hoy (docs/14). */
export function trustLineForItem(item, now = new Date()) {
  const mod = labelOf(item.module);
  const title = (item.title || "Entrada").trim();
  const shortTitle = title.length > 72 ? `${title.slice(0, 69)}…` : title;

  if (!item.starts_at) {
    return {
      title: shortTitle,
      detail: `Quedó en ${mod}. Sin fecha: lo encuentras en ${mod} cuando lo necesites. Hoy vendrá en Núcleo.`,
    };
  }

  const sameDay = dayKey(item.starts_at) === dayKey(now);
  const when = whenShort(item);

  if (sameDay) {
    return {
      title: shortTitle,
      detail: `Quedó en ${mod}. Lo verás en Hoy hoy (${when}).`,
    };
  }

  const future = new Date(item.starts_at) >= now;
  if (future) {
    return {
      title: shortTitle,
      detail: `Quedó en ${mod}. Aparecerá en Hoy el ${when}.`,
    };
  }

  return {
    title: shortTitle,
    detail: `Quedó en ${mod}. Fecha: ${when}. Revisa Hoy cuando esté listo en Núcleo.`,
  };
}
