import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";
import { AXES, findModule, labelOf } from "./structure.js";

const API = "https://api.impersia.cloud";

const LOOKS = [
  { id: "claro", name: "Claro", note: "Gris claro y verde" },
  { id: "papel", name: "Papel", note: "Crema y verde bosque" },
  { id: "mar", name: "Mar", note: "Azul profundo" },
  { id: "cielo", name: "Cielo", note: "Azul claro" },
  { id: "oliva", name: "Oliva", note: "Verde suave" },
  { id: "arena", name: "Arena", note: "Cálido" },
  { id: "violeta", name: "Violeta", note: "Lila suave" },
  { id: "tinta", name: "Tinta", note: "Blanco y negro" },
  { id: "noche", name: "Noche", note: "Oscuro" },
  { id: "grafito", name: "Grafito", note: "Carbón" },
];

function applyLook(look) {
  const name = LOOKS.some((item) => item.id === look) ? look : "claro";
  document.documentElement.dataset.look = name;
  try {
    localStorage.setItem("impersia-look", name);
  } catch {
    /* el aspecto sigue en la cuenta */
  }
}

async function call(path, options = {}) {
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

function readableError(data) {
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const first = Array.isArray(detail) ? detail[0] : null;
  const field = first && Array.isArray(first.loc) ? first.loc.join(".") : "";
  if (field.includes("email")) {
    return "El correo tiene que ser una dirección de verdad, con arroba. Por ejemplo, tu@correo.com";
  }
  if (field.includes("password")) {
    return "La contraseña tiene que tener al menos 8 caracteres";
  }
  return "No se ha podido completar";
}

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    call("/me")
      .then((data) => {
        applyLook(data.look);
        setMe(data);
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="wait">Cargando…</main>;
  if (!me) return <Auth onEnter={(data) => { applyLook(data.look); setMe(data); }} />;
  return (
    <Home
      email={me.email}
      googleEmail={me.google_email || ""}
      look={me.look || "claro"}
      onLook={(look) => setMe({ ...me, look })}
      onLeave={() => setMe(null)}
    />
  );
}

function Auth({ onEnter }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  async function submit(path) {
    setError("");
    try {
      const data = await call(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onEnter(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <a className="mark" href="#hoy"><Logo /></a>
      <h1>Entra en Impersia</h1>
      <p className="lead">La contraseña tiene al menos 8 caracteres. La cuenta es solo tuya.</p>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <span className="secret">
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="secondary" onClick={() => setVisible(!visible)}>
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={() => submit("/auth/register")}>Crear cuenta</button>
        <button type="button" className="secondary" onClick={() => submit("/auth/login")}>Entrar</button>
      </div>
    </main>
  );
}

function Home({ email, googleEmail, look, onLook, onLeave }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [openAxis, setOpenAxis] = useState(null);
  const screen = useHash();
  const current = findModule(screen);
  const shownAxis = AXES.find((axis) => axis.id === (current?.axisId || openAxis));

  useEffect(() => {
    call("/items").then(setItems).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!googleEmail) {
      setGoogleEvents([]);
      return;
    }
    call("/google/events").then(setGoogleEvents).catch((err) => setError(err.message));
  }, [googleEmail]);

  async function archive() {
    setError("");
    try {
      const item = await call("/captures", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setItems([item, ...items]);
      setText("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveEdit() {
    setError("");
    try {
      const item = await call(`/items/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          module: editing.module,
          title: editing.title,
          starts_at: editing.starts_at,
          time_known: Boolean(editing.time_known),
        }),
      });
      setItems(items.map((row) => (row.id === item.id ? item : row)));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function leave() {
    await call("/auth/logout", { method: "POST", body: "{}" });
    onLeave();
  }

  const todayKey = dayKey(new Date());
  const googleDated = googleEvents.filter((event) => event.starts_at).map(asGoogle);
  const dated = [...items.filter((item) => item.starts_at), ...googleDated];
  const byDate = (a, b) => new Date(a.starts_at) - new Date(b.starts_at);
  const todayItems = dated.filter((item) => dayKey(item.starts_at) === todayKey).sort(byDate);
  const laterItems = dated.filter((item) => dayKey(item.starts_at) > todayKey).sort(byDate);

  return (
    <main>
      <header className="top">
        <a className="mark" href="#hoy"><Logo /></a>
        <div className="who">
          <a className={screen === "perfil" ? "session on" : "session"} href="#perfil"><Icon name="perfil" /> <span>{email}</span></a>
          <a className={screen === "apariencia" ? "on" : ""} href="#apariencia"><Icon name="apariencia" /> Apariencia</a>
          <button type="button" className="text" onClick={leave}>Salir</button>
        </div>
      </header>
      <nav className="primary">
        <a className={screen === "hoy" ? "on" : ""} href="#hoy"><Icon name="hoy" /> Hoy</a>
        <a className={screen === "entrada" ? "on" : ""} href="#entrada"><Icon name="entrada" /> Entrada</a>
      </nav>
      <nav className="axes">
        {AXES.map((axis) => (
          <button
            type="button"
            key={axis.id}
            className={shownAxis?.id === axis.id ? "text on" : "text"}
            onClick={() => setOpenAxis(shownAxis?.id === axis.id && !current ? null : axis.id)}
          >
            <Icon name={axis.id} /> {axis.name}
          </button>
        ))}
      </nav>
      {shownAxis && (
        <nav className="modules">
          {shownAxis.modules.map((mod) => (
            <a key={mod.id} className={screen === mod.id ? "on" : ""} href={`#${mod.id}`}><Icon name={mod.id} /> {mod.label}</a>
          ))}
        </nav>
      )}
      {error && <p className="error">{error}</p>}
      {screen === "entrada" && (
        <>
          <h1>Entrada</h1>
          <p className="lead">Escribe lo que tengas en la cabeza. Impersia lo archiva en su eje. Si no es el sitio, lo cambias.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Llamar al taller el viernes" />
          <button type="button" onClick={archive} disabled={!text.trim()}>Dejar</button>
          <h2>Archivado</h2>
          <ItemList items={items} editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
        </>
      )}
      {screen === "hoy" && (
        <>
          <h1>{todayLine()}</h1>
          {todayItems.length ? <ItemList items={todayItems} editing={editing} setEditing={setEditing} saveEdit={saveEdit} /> : <p className="private">Hoy no hay nada con fecha.</p>}
          {laterItems.length > 0 && (
            <>
              <h2>Próximos</h2>
              <ItemList items={laterItems} editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
            </>
          )}
        </>
      )}
      {current && (
        <>
          <p className="private">{current.axis}</p>
          <h1>{current.label}</h1>
          <p className="lead">{current.blurb}</p>
          {current.id === "agenda" && (
            googleEmail ? (
              <p className="private">Google Calendar conectado: {googleEmail}</p>
            ) : (
              <a className="connect" href={`${API}/auth/google/start`}>Conectar Google Calendar</a>
            )
          )}
          <h2>Tuyo</h2>
          {items.some((item) => item.module === current.id) ? (
            <ItemList items={items.filter((item) => item.module === current.id)} editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
          ) : (
            <p className="private">Todavía no hay nada tuyo aquí. Escríbelo en Entrada.</p>
          )}
          {current.id === "agenda" && googleEmail && (
            <>
              <h2>Google</h2>
              {googleDated.length ? (
                <ItemList items={googleDated} editing={null} setEditing={() => {}} saveEdit={() => {}} />
              ) : (
                <p className="private">No hay citas de Google en los próximos sesenta días.</p>
              )}
            </>
          )}
          <h2>Ejemplos</h2>
          <p className="private">Inventados, para ver la forma de esta pantalla. No están en tu cuenta.</p>
          <div className="cards">
            {current.examples.map(([title, note]) => (
              <article className="card" key={title}>
                <p className="mod">Ejemplo</p>
                <p className="when">{note}</p>
                <p className="title">{title}</p>
              </article>
            ))}
          </div>
        </>
      )}
      {screen === "perfil" && (
        <>
          <h1>Perfil</h1>
          <p className="lead">{email}</p>
          <p className="private">El resto de esta pantalla lo vemos más adelante.</p>
        </>
      )}
      {screen === "apariencia" && (
        <>
          <h1>Apariencia</h1>
          <p className="lead">Elige cómo se ve Impersia. Queda guardado en tu cuenta.</p>
          <div className="looks">
            {LOOKS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={look === item.id ? "on" : ""}
                onClick={() => chooseLook(item.id, onLook, setError)}
              >
                <span className={`swatch ${item.id}`}><i /></span>
                <span>
                  <strong>{item.name}</strong>
                  {item.note}
                </span>
                {look === item.id && <em className="chosen">Elegido</em>}
              </button>
            ))}
          </div>
        </>
      )}
      {screen !== "hoy" && screen !== "entrada" && screen !== "apariencia" && screen !== "perfil" && !current && (
        <>
          <h1>Hoy</h1>
          <p className="lead">Esa pantalla no existe. Vuelve a Hoy.</p>
        </>
      )}
    </main>
  );
}

async function chooseLook(id, onLook, setError) {
  applyLook(id);
  onLook(id);
  try {
    await call("/me", { method: "PATCH", body: JSON.stringify({ look: id }) });
  } catch (err) {
    setError(err.message);
  }
}

function Logo() {
  return (
    <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 116" fill="none" role="img" aria-label="Impersia">
      <rect x="8" y="8" width="136" height="100" rx="6" stroke="currentColor" strokeWidth="2.4" />
      <path d="M28 10.2v95.6" stroke="currentColor" strokeWidth="2.4" />
      <text x="40" y="52" fill="currentColor" fontFamily="Plus Jakarta Sans, Segoe UI, sans-serif" fontSize="22" fontWeight="680" letterSpacing="-0.3">Impersia</text>
      <path d="M40 64h72" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="124" cy="92" r="18" fill="#0f5c4c" />
      <circle cx="124" cy="92" r="12.4" stroke="#f3efe6" strokeWidth="1.6" />
    </svg>
  );
}

function ItemList({ items, editing, setEditing, saveEdit }) {
  return (
    <div className="cards">
      {items.map((item) => (
        <article className={editing && editing.id === item.id ? "card editor" : "card"} key={item.id}>
          {editing && editing.id === item.id ? (
            <>
              <label>
                Módulo
                <select value={editing.module} onChange={(e) => setEditing({ ...editing, module: e.target.value })}>
                  {AXES.map((axis) => (
                    <optgroup key={axis.id} label={axis.name}>
                      {axis.modules.map((mod) => (
                        <option key={mod.id} value={mod.id}>{mod.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                Título
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <label>
                Día
                <input
                  type="date"
                  value={datePart(editing.starts_at)}
                  onChange={(e) => setEditing(withWhen(editing, e.target.value, timePart(editing)))}
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={editing.time_known ? timePart(editing) : ""}
                  onChange={(e) => setEditing(withWhen(editing, datePart(editing.starts_at), e.target.value))}
                />
              </label>
              <div className="actions">
                <button type="button" onClick={saveEdit}>Guardar cambio</button>
                <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button>
              </div>
            </>
          ) : (
            <>
              {item.starts_at && <p className="when">{whenLabel(item)}</p>}
              <p className="title">{item.title}</p>
              <p className="meta">
                {item.source === "google" ? (
                  <span>Google</span>
                ) : (
                  <>
                    <span><Icon name={item.module} /> {labelOf(item.module)}</span>
                    <button type="button" className="text" onClick={() => setEditing({ ...item })}>Cambiar</button>
                  </>
                )}
              </p>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function asGoogle(event) {
  return {
    id: `google-${event.id}`,
    title: event.title,
    starts_at: event.starts_at,
    time_known: !event.all_day,
    source: "google",
    module: "agenda",
  };
}

function useHash() {
  const read = () => {
    const hash = window.location.hash.replace("#", "") || "hoy";
    if (hash === "caja") return "entrada";
    if (hash === "aspecto") return "apariencia";
    return hash;
  };
  const [hash, setHash] = useState(read);
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "hoy";
    if (window.location.hash === "#caja") window.location.replace("#entrada");
    if (window.location.hash === "#aspecto") window.location.replace("#apariencia");
    const onChange = () => setHash(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function dayKey(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function datePart(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timePart(proposal) {
  const value = proposal.starts_at;
  if (!value || !proposal.time_known) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function withWhen(proposal, day, time) {
  if (!day) return { ...proposal, starts_at: null, time_known: false };
  if (!time) return { ...proposal, starts_at: day, time_known: false };
  return { ...proposal, starts_at: `${day}T${time}`, time_known: true };
}

function todayLine() {
  return new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function whenLabel(item) {
  const date = new Date(item.starts_at);
  if (!item.time_known) return date.toLocaleDateString("es-ES", { dateStyle: "medium" });
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

