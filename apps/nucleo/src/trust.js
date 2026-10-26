const WHERE = {
  agenda: "tu agenda",
  casa: "lo de casa",
  habitos: "tus rutinas",
  viajes: "un viaje",
  diario: "tu diario",
  deseos: "tus deseos",
  proyectos: "tu trabajo",
  reuniones: "una reunión",
  memoria: "tus apuntes",
  ideas: "tus ideas",
  muro: "tu muro",
  listas: "una lista",
  circulos: "un círculo",
  espacios: "un espacio compartido",
};

function whereOf(module) {
  return WHERE[module] || "tu espacio";
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

/** Confirmación humana tras guardar (docs/14). */
export function trustLineForItem(item, now = new Date()) {
  const place = whereOf(item.module);
  const title = (item.title || "Lo que acabas de soltar").trim();
  const shortTitle = title.length > 72 ? `${title.slice(0, 69)}…` : title;

  if (!item.starts_at) {
    return {
      title: shortTitle,
      detail: `Recogido en ${place}. Cuando lo necesites, estará ahí — no hace falta apuntarlo en otro sitio.`,
    };
  }

  const sameDay = dayKey(item.starts_at) === dayKey(now);
  const when = whenShort(item);

  if (sameDay) {
    return {
      title: shortTitle,
      detail: `Recogido en ${place}. Hoy te lo devolvemos (${when}).`,
    };
  }

  const future = new Date(item.starts_at) >= now;
  if (future) {
    return {
      title: shortTitle,
      detail: `Recogido en ${place}. Te lo devolvemos el ${when}.`,
    };
  }

  return {
    title: shortTitle,
    detail: `Recogido en ${place}. Fecha: ${when}.`,
  };
}
