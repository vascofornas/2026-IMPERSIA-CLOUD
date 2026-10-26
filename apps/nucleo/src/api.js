const API = "https://api.impersia.cloud";

function readableError(data) {
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const first = Array.isArray(detail) ? detail[0] : null;
  const field = first && Array.isArray(first.loc) ? first.loc.join(".") : "";
  if (field.includes("email")) {
    return "El correo tiene que ser una dirección de verdad, con arroba.";
  }
  if (field.includes("password")) {
    return "La contraseña tiene que tener al menos 8 caracteres.";
  }
  return "No se ha podido completar";
}

export async function call(path, options = {}) {
  const response = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readableError(data));
  }
  return data;
}

export function normalizeCaptureResult(result) {
  if (result && Array.isArray(result.items)) {
    return { items: result.items, deduped: Number(result.deduped) || 0 };
  }
  return { items: [], deduped: 0 };
}
