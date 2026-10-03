const ICON = "https://impersia.cloud/logo-email.png";

let swReady;

export function browserAlertsSupported() {
  return "Notification" in window;
}

export async function ensureAlertWorker() {
  if (!("serviceWorker" in navigator) || Notification.permission !== "granted") {
    return null;
  }
  if (!swReady) {
    swReady = navigator.serviceWorker
      .register("/app/sw.js", { scope: "/app/" })
      .then(() => navigator.serviceWorker.ready)
      .catch(() => null);
  }
  return swReady;
}

export async function postBrowserNotification(title, body, tag) {
  if (!browserAlertsSupported()) {
    throw new Error("Este navegador no admite avisos.");
  }
  if (Notification.permission !== "granted") {
    throw new Error(`Permiso del sitio: ${Notification.permission}. Actívalo en el candado de la barra de Chrome.`);
  }

  const options = {
    body,
    tag: tag || `impersia-${Date.now()}`,
    requireInteraction: true,
    icon: ICON,
  };

  const reg = await ensureAlertWorker();
  if (reg) {
    await reg.showNotification(title, options);
    return "worker";
  }

  return new Promise((resolve, reject) => {
    try {
      const notice = new Notification(title, options);
      notice.onshow = () => resolve("window");
      notice.onerror = () => reject(new Error("Chrome rechazó el aviso. Revisa el permiso de impersia.cloud en Ajustes del sitio."));
      window.setTimeout(() => resolve("window-silent"), 2500);
    } catch (err) {
      reject(err);
    }
  });
}
