import { useEffect, useState } from "react";
import ActivityLog from "./ActivityLog.jsx";
import { trackScreen } from "./events.js";
import Panel from "./Panel.jsx";

const API = "https://api.impersia.cloud";

async function call(path, options = {}) {
  const response = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "No se pudo completar");
  }
  return data;
}

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("activity");

  useEffect(() => {
    call("/me")
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (me?.is_admin) trackScreen(`admin.${tab}`);
  }, [me, tab]);

  if (!ready) {
    return <main className="gate"><p className="private">Cargando…</p></main>;
  }

  if (!me) {
    return <Login onEnter={setMe} />;
  }

  if (!me.is_admin) {
    return (
      <main className="gate">
        <h1>Sin acceso</h1>
        <p className="lead">Esta zona es solo para administración de Impersia.</p>
        <p className="private">Has entrado como {me.email}.</p>
        <div className="actions">
          <a className="button" href="https://impersia.cloud/app/">Ir a la web app</a>
          <button type="button" className="secondary" onClick={() => call("/auth/logout", { method: "POST" }).then(() => setMe(null))}>Salir</button>
        </div>
      </main>
    );
  }

  return (
    <div className="layout">
      <header className="topbar">
        <div>
          <p className="kicker">Impersia OS</p>
          <strong>Panel de administración</strong>
        </div>
        <div className="topbar-actions">
          <span className="private">{me.email}</span>
          <a className="secondary button" href="https://impersia.cloud/app/">Web app</a>
          <button type="button" className="text" onClick={() => call("/auth/logout", { method: "POST" }).then(() => setMe(null))}>Salir</button>
        </div>
      </header>
      <nav className="tabs">
        <button type="button" className={tab === "activity" ? "on" : ""} onClick={() => setTab("activity")}>Actividad</button>
        <button type="button" className={tab === "llm" ? "on" : ""} onClick={() => setTab("llm")}>IA y costes</button>
      </nav>
      {error && <p className="error banner">{error}</p>}
      <main className="content">
        {tab === "activity" ? <ActivityLog setError={setError} /> : <Panel setError={setError} />}
      </main>
    </div>
  );
}

function Login({ onEnter }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      const data = await call("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onEnter(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="gate">
      <p className="kicker">Impersia OS</p>
      <h1>Administración</h1>
      <p className="lead">Entra con tu cuenta de administrador. Separado de la web app de uso diario.</p>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <span className="secret">
          <input type={visible ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" className="secondary" onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button>
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={submit}>Entrar</button>
      </div>
    </main>
  );
}
