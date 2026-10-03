export const PERSON_FOR = [
  ["self", "Yo"],
  ["child", "Hijo/a"],
  ["parent", "Padre o madre"],
  ["grandparent", "Abuelo/a"],
  ["nephew", "Sobrino/a"],
  ["other", "Otra persona"],
];

export const MEDICAL_FOR = PERSON_FOR;

export const CELEBRATION_FOR = [
  ["self", "Yo"],
  ["child", "Hijo/a"],
  ["parent", "Padre o madre"],
  ["grandparent", "Abuelo/a"],
  ["nephew", "Sobrino/a"],
  ["friend", "Amigo/a"],
  ["other", "Otra persona"],
];

export const FAMILY_KIND = [
  ["cumpleanos", "Cumpleaños"],
  ["aniversario", "Aniversario"],
  ["boda", "Boda"],
  ["bautizo", "Bautizo"],
  ["comunion", "Comunión"],
  ["comida", "Comida o reunión"],
  ["otro", "Otro"],
];

export const LEISURE_KIND = [
  ["cine", "Cine"],
  ["restaurante", "Restaurante"],
  ["concierto", "Concierto"],
  ["teatro", "Teatro"],
  ["deporte", "Deporte"],
  ["excursion", "Excursión o cultura"],
  ["quedar", "Quedar / tomar algo"],
  ["otro", "Otro"],
];

export const LEISURE_WITH = [
  ["solo", "Solo/a"],
  ["partner", "Pareja"],
  ["friends", "Amigos/as"],
  ["family", "Familia"],
  ["other", "Otra persona"],
];

const PERSON_FOR_LABEL = Object.fromEntries([...PERSON_FOR, ...CELEBRATION_FOR]);
const FAMILY_KIND_LABEL = Object.fromEntries(FAMILY_KIND);
const LEISURE_KIND_LABEL = Object.fromEntries(LEISURE_KIND);
const LEISURE_WITH_LABEL = Object.fromEntries(LEISURE_WITH);

export function personForLabel(forKey, name) {
  if (!forKey || forKey === "self") return "Para mí";
  const role = PERSON_FOR_LABEL[forKey] || "Persona";
  if (name) return `Para ${name} (${role.toLowerCase()})`;
  return `Para ${role.toLowerCase()}`;
}

export const medicalForLabel = personForLabel;
export const familyForLabel = personForLabel;

export function leisureWithLabel(withKey, name) {
  if (!withKey || withKey === "solo") return "Solo/a";
  const role = LEISURE_WITH_LABEL[withKey] || "Con alguien";
  if (name) return `Con ${name}`;
  return role;
}

export function familyKindLabel(kind) {
  return FAMILY_KIND_LABEL[kind] || "Celebración";
}

export function celebrationForLabel(forKey, name) {
  if (!forKey || forKey === "self") return "Mío/a";
  if (forKey === "friend") return name ? `De ${name} (amigo/a)` : "De un amigo/a";
  return personForLabel(forKey, name).replace("Para ", "De ");
}

export function leisureKindLabel(kind) {
  return LEISURE_KIND_LABEL[kind] || "Plan";
}

export function isMedicalItem(item) {
  return item?.agenda_type === "medica";
}

export function isFamilyItem(item) {
  return item?.agenda_type === "familiar";
}

export function isLeisureItem(item) {
  return item?.agenda_type === "ocio";
}

export function familyEventLine(item) {
  const kind = familyKindLabel(item.family_kind);
  const who = celebrationForLabel(item.family_for, item.family_name);
  return `${kind} · ${who}`;
}

export function leisureEventLine(item) {
  const kind = leisureKindLabel(item.leisure_kind);
  const who = leisureWithLabel(item.leisure_with, item.leisure_name);
  return `${kind} · ${who}`;
}
