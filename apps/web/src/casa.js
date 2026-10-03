export const CASA_KIND = [
  ["compra", "Lista de la compra"],
  ["mantenimiento", "Mantenimiento del hogar"],
  ["suministro", "Control de suministros"],
  ["domestica", "Tareas del hogar"],
  ["otro", "Otro"],
];

const CASA_KIND_LABEL = Object.fromEntries(CASA_KIND);

export function casaKindLabel(kind) {
  if (kind === "limpieza") return "Tareas del hogar";
  return CASA_KIND_LABEL[kind] || "Casa";
}

export function isCasaItem(item) {
  return item?.module === "casa" && Boolean(item?.casa_kind);
}

export function casaEventLine(item) {
  return casaKindLabel(item.casa_kind);
}
