export const TRAVEL_ROLE_OPTIONS = [
  ["reserva", "Reserva (vuelo, hotel…)"],
  ["plan", "Por hacer"],
  ["equipaje", "Equipaje"],
  ["experiencia", "Experiencia"],
  ["nota", "Nota"],
];

export const CHECKLIST_ROLES = new Set(["plan", "equipaje", "experiencia"]);

export const TRAVEL_SUBTYPES = {
  reserva: [
    ["vuelo", "Vuelo"],
    ["alojamiento", "Alojamiento"],
    ["tren", "Tren"],
    ["bus", "Autobús"],
    ["coche", "Coche de alquiler"],
    ["ferry", "Ferry"],
    ["restaurante", "Restaurante"],
    ["otro", "Otra reserva"],
  ],
  plan: [
    ["ruta", "Ruta"],
    ["visita", "Visita"],
    ["traslado", "Traslado"],
    ["comida", "Comida"],
    ["gestion", "Gestión pendiente"],
    ["otro", "Otro"],
  ],
  experiencia: [
    ["excursion", "Excursión"],
    ["museo", "Museo"],
    ["tour", "Tour"],
    ["gastronomia", "Gastronomía"],
    ["espectaculo", "Espectáculo"],
    ["bienestar", "Bienestar"],
    ["otro", "Otra experiencia"],
  ],
  equipaje: [
    ["ropa", "Ropa"],
    ["calzado", "Calzado"],
    ["higiene", "Higiene"],
    ["documentos", "Documentos"],
    ["tecnologia", "Tecnología"],
    ["salud", "Salud"],
    ["otro", "Otro"],
  ],
  nota: [
    ["direccion", "Dirección"],
    ["contacto", "Contacto"],
    ["recordatorio", "Recordatorio"],
    ["otro", "Otra nota"],
  ],
};

export const BOOKING_STATUS_OPTIONS = [
  ["idea", "Por decidir"],
  ["pending", "Pendiente de confirmar"],
  ["confirmed", "Confirmado"],
  ["cancelled", "Cancelado"],
];

export const PAYMENT_STATUS_OPTIONS = [
  ["pending", "Pendiente de pago"],
  ["partial", "Pagado en parte"],
  ["paid", "Pagado"],
  ["refunded", "Reembolsado"],
];

export const CURRENCY_OPTIONS = ["EUR", "USD", "GBP", "CHF"];

const ROLE_LABELS = {
  trip: "Viaje",
  reserva: "Reservas",
  plan: "Por hacer",
  equipaje: "Equipaje",
  nota: "Notas",
  experiencia: "Experiencias",
};

export function travelRoleLabel(role) {
  return ROLE_LABELS[role] || role || "Viaje";
}

export function travelSubtypeLabel(role, subtype) {
  return TRAVEL_SUBTYPES[role]?.find(([value]) => value === subtype)?.[1] || subtype || "";
}

export function travelStatusLabel(options, value) {
  return options.find(([key]) => key === value)?.[1] || value || "";
}

export function isTravelItem(item) {
  return item?.module === "viajes";
}

export function travelTrips(items) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return items
    .filter((item) => isTravelItem(item) && item.travel_role === "trip")
    .sort((a, b) => {
      const da = a.starts_at ? new Date(a.starts_at) : new Date(0);
      const db = b.starts_at ? new Date(b.starts_at) : new Date(0);
      const aPast = da < now;
      const bPast = db < now;
      if (aPast !== bPast) return aPast ? 1 : -1;
      return da - db;
    });
}

export function piecesForTrip(items, tripId) {
  return items.filter((item) => isTravelItem(item) && item.travel_trip_id === tripId && item.travel_role !== "trip");
}

export function orphanTravelPieces(items) {
  return items.filter(
    (item) => isTravelItem(item) && item.travel_role && item.travel_role !== "trip" && !item.travel_trip_id,
  );
}

export function groupPiecesByRole(pieces) {
  const order = ["reserva", "plan", "equipaje", "experiencia", "nota"];
  const map = new Map(order.map((r) => [r, []]));
  for (const item of pieces) {
    const role = item.travel_role || "nota";
    if (!map.has(role)) map.set(role, []);
    map.get(role).push(item);
  }
  return order.filter((r) => map.get(r).length).map((r) => ({ role: r, label: travelRoleLabel(r), items: map.get(r) }));
}

function formatShortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function tripRangeLabel(trip) {
  const from = formatShortDate(trip.starts_at);
  const to = formatShortDate(trip.travel_end);
  if (from && to) return `${from} – ${to}`;
  if (from) return `Desde ${from}`;
  if (to) return `Hasta ${to}`;
  return trip.travel_place || "Sin fechas";
}

export function tripIsUpcoming(trip) {
  const end = trip.travel_end || trip.starts_at;
  if (!end) return true;
  const d = new Date(end);
  d.setHours(23, 59, 59, 999);
  return d >= new Date();
}
