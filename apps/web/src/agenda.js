export const PERSON_FOR = [
  ["self", "Yo"],
  ["child", "Hijo/a"],
  ["parent", "Padre o madre"],
  ["grandparent", "Abuelo/a"],
  ["nephew", "Sobrino/a"],
  ["other", "Otra persona"],
];

export const MEDICAL_FOR = PERSON_FOR;

export const FAMILY_KIND = [
  ["cumpleanos", "Cumpleaños"],
  ["aniversario", "Aniversario"],
  ["boda", "Boda"],
  ["bautizo", "Bautizo"],
  ["comunion", "Comunión"],
  ["comida", "Comida o reunión"],
  ["otro", "Otro"],
];

const PERSON_FOR_LABEL = Object.fromEntries(PERSON_FOR);
const FAMILY_KIND_LABEL = Object.fromEntries(FAMILY_KIND);

export function personForLabel(forKey, name) {
  if (!forKey || forKey === "self") return "Para mí";
  const role = PERSON_FOR_LABEL[forKey] || "Persona";
  if (name) return `Para ${name} (${role.toLowerCase()})`;
  return `Para ${role.toLowerCase()}`;
}

export const medicalForLabel = personForLabel;
export const familyForLabel = personForLabel;

export function familyKindLabel(kind) {
  return FAMILY_KIND_LABEL[kind] || "Evento familiar";
}

export function isMedicalItem(item) {
  return item?.agenda_type === "medica";
}

export function isFamilyItem(item) {
  return item?.agenda_type === "familiar";
}

export function familyEventLine(item) {
  const kind = familyKindLabel(item.family_kind);
  const who = personForLabel(item.family_for, item.family_name);
  return `${kind} · ${who}`;
}
