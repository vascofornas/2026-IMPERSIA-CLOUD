export const CASA_KIND = [
  ["compra", "Lista de la compra"],
  ["mantenimiento", "Mantenimiento del hogar"],
  ["suministro", "Control de suministros"],
  ["domestica", "Tareas del hogar"],
  ["inventario", "Inventario personal"],
  ["otro", "Otro"],
];

export const CASA_SECTIONS = CASA_KIND.filter(([id]) => id !== "otro");

export const SUPPLY_KIND = [
  ["luz", "Luz"],
  ["agua", "Agua"],
  ["gas", "Gas"],
  ["internet", "Internet"],
  ["otro", "Otro"],
];

const CASA_KIND_LABEL = Object.fromEntries(CASA_KIND);
const SUPPLY_KIND_LABEL = Object.fromEntries(SUPPLY_KIND);

export function casaKindLabel(kind) {
  if (kind === "limpieza") return "Tareas del hogar";
  return CASA_KIND_LABEL[kind] || "Casa";
}

export function supplyKindLabel(kind) {
  return SUPPLY_KIND_LABEL[kind] || null;
}

export function isCasaItem(item) {
  return item?.module === "casa" && Boolean(item?.casa_kind);
}

export function casaEventLine(item) {
  const kind = casaKindLabel(item.casa_kind);
  const supply = item.casa_kind === "suministro" ? supplyKindLabel(item.supply_kind) : null;
  if (supply && supply !== "Otro") return `${kind} · ${supply}`;
  return kind;
}

export function groupCasaItems(items, status = "open") {
  const filtered = items.filter(
    (item) => item.module === "casa" && (item.status || "open") === status,
  );
  const groups = new Map(CASA_SECTIONS.map(([id]) => [id, []]));
  groups.set("otro", []);
  filtered.forEach((item) => {
    const key = item.casa_kind && groups.has(item.casa_kind) ? item.casa_kind : "otro";
    groups.get(key).push(item);
  });
  return CASA_SECTIONS
    .map(([id, label]) => ({ id, label, items: groups.get(id) || [] }))
    .concat(groups.get("otro").length ? [{ id: "otro", label: "Otro", items: groups.get("otro") }] : []);
}
