import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

const VIEWS = { panel: "Panel", contacts: "Contactos", activities: "Actividades" };

function AuthScreen({ onDone }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("Mi negocio");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
      } else {
        await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, org_name: orgName }),
        });
      }
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <p className="brand">Impersia</p>
        <h1>{mode === "login" ? "Entra en tu escritorio" : "Crea tu cuenta"}</h1>
        <form onSubmit={submit}>
          <label>
            Correo
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {mode === "register" && (
            <label>
              Nombre del negocio
              <input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>
        <button
          type="button"
          className="linkish"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
        </button>
      </div>
    </div>
  );
}

function PanelView({ data }) {
  if (!data) return <p className="muted">Cargando panel…</p>;
  const c = data.counts;
  return (
    <div className="panel-grid">
      <div className="stat">
        <span className="stat-n">{c.contacts}</span>
        <span className="stat-l">Contactos</span>
      </div>
      <div className="stat">
        <span className="stat-n">{c.pending_activities}</span>
        <span className="stat-l">Pendientes</span>
      </div>
      <div className="stat warn">
        <span className="stat-n">{c.overdue}</span>
        <span className="stat-l">Vencidas</span>
      </div>
      <div className="stat">
        <span className="stat-n">{c.upcoming_week}</span>
        <span className="stat-l">Esta semana</span>
      </div>
      <section className="recent">
        <h2>Actividad reciente</h2>
        {data.recent_activities.length === 0 ? (
          <p className="muted">Aún no hay actividades.</p>
        ) : (
          <ul>
            {data.recent_activities.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <span className="chip">{a.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ContactsView({ refreshKey }) {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await api("/contacts");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load, refreshKey]);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/contacts", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Nombre del contacto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button type="submit">Añadir</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {items.map((c) => (
          <li key={c.id}>
            <strong>{c.name}</strong>
            {c.email && <span className="muted"> · {c.email}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivitiesView({ contacts, refreshKey }) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = await api("/activities?status=pending");
    setItems(data.items);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load, refreshKey]);

  async function add(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/activities", {
        method: "POST",
        body: JSON.stringify({
          title,
          contact_id: contactId || null,
        }),
      });
      setTitle("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function done(id) {
    await api(`/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "done" }),
    });
    await load();
  }

  return (
    <div>
      <form className="inline-form" onSubmit={add}>
        <input
          placeholder="Nueva tarea o seguimiento"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
          <option value="">Sin contacto</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit">Añadir</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {items.map((a) => (
          <li key={a.id}>
            <strong>{a.title}</strong>
            <button type="button" className="small" onClick={() => done(a.id)}>
              Hecho
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("panel");
  const [panel, setPanel] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [tick, setTick] = useState(0);

  const refreshSession = useCallback(async () => {
    try {
      const me = await api("/me");
      setSession(me);
      const [p, c] = await Promise.all([api("/panel"), api("/contacts")]);
      setPanel(p);
      setContacts(c.items);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession, tick]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setSession(null);
  }

  if (!session) {
    return <AuthScreen onDone={() => setTick((t) => t + 1)} />;
  }

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="brand">Impersia</p>
          <p className="org">{session.organization.name}</p>
        </div>
        <nav>
          {Object.entries(VIEWS).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={view === id ? "nav active" : "nav"}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button type="button" className="linkish" onClick={logout}>
          Salir
        </button>
      </header>
      <main>
        {view === "panel" && <PanelView data={panel} />}
        {view === "contacts" && <ContactsView refreshKey={tick} />}
        {view === "activities" && (
          <ActivitiesView contacts={contacts} refreshKey={tick} />
        )}
      </main>
    </div>
  );
}
