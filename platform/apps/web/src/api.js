const API =
  import.meta.env.VITE_API_BASE || "https://api.impersia.cloud/platform";

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }
  if (!res.ok) {
    const msg = data?.detail || res.statusText || "Error";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}
