const API = "https://api.impersia.cloud";
export const APP_VERSION = "0.1.0";

export function trackScreen(screen) {
  fetch(`${API}/events`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "screen.view",
      product: "admin",
      screen,
      app_version: APP_VERSION,
    }),
  }).catch(() => {});
}
