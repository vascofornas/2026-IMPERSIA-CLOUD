export const CASA_KIND = [
  ["compra", "Compra"],
  ["mantenimiento", "Mantenimiento"],
  ["suministro", "Suministro"],
  ["limpieza", "Limpieza"],
  ["otro", "Otro"],
];

const CASA_KIND_LABEL = Object.fromEntries(CASA_KIND);

export function casaKindLabel(kind) {
  return CASA_KIND_LABEL[kind] || "Casa";
}

export function isCasaItem(item) {
  return item?.module === "casa" && Boolean(item?.casa_kind);
}

export function casaEventLine(item) {
  return casaKindLabel(item.casa_kind);
}
