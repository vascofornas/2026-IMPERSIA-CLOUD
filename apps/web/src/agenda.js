export const MEDICAL_FOR = [
  ["self", "Yo"],
  ["child", "Hijo/a"],
  ["parent", "Padre o madre"],
  ["grandparent", "Abuelo/a"],
  ["nephew", "Sobrino/a"],
  ["other", "Otra persona"],
];

const MEDICAL_FOR_LABEL = Object.fromEntries(MEDICAL_FOR);

export function medicalForLabel(forKey, name) {
  if (!forKey || forKey === "self") return "Para mí";
  const role = MEDICAL_FOR_LABEL[forKey] || "Persona";
  if (name) return `Para ${name} (${role.toLowerCase()})`;
  return `Para ${role.toLowerCase()}`;
}

export function isMedicalItem(item) {
  return item?.agenda_type === "medica";
}
