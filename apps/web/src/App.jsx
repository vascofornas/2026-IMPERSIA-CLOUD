import { useEffect, useState } from "react";
import { AXES, findModule, labelOf } from "./structure.js";

const API = "https://api.impersia.cloud";

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
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="wait">Cargando…</main>;
  if (!me) return <Auth onEnter={setMe} />;
  return <Home email={me.email} onLeave={() => setMe(null)} />;
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

function Home({ email, onLeave }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const screen = useHash();
  const current = findModule(screen);

  useEffect(() => {
    call("/items").then(setItems).catch((err) => setError(err.message));
  }, []);

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
  const dated = items.filter((item) => item.starts_at);
  const byDate = (a, b) => new Date(a.starts_at) - new Date(b.starts_at);
  const todayItems = dated.filter((item) => dayKey(item.starts_at) === todayKey).sort(byDate);
  const laterItems = dated.filter((item) => dayKey(item.starts_at) > todayKey).sort(byDate);

  return (
    <main>
      <header>
        <p>{email}</p>
        <button type="button" className="secondary" onClick={leave}>Salir</button>
      </header>
      <nav className="nav">
        <a className={screen === "hoy" ? "on" : ""} href="#hoy">Hoy</a>
        <a className={screen === "caja" ? "on" : ""} href="#caja">Caja</a>
        {AXES.map((axis) => (
          <span className="axis" key={axis.id}>
            <em>{axis.name}</em>
            {axis.modules.map((mod) => (
              <a key={mod.id} className={screen === mod.id ? "on" : ""} href={`#${mod.id}`}>{mod.label}</a>
            ))}
          </span>
        ))}
      </nav>
      {error && <p className="error">{error}</p>}
      {screen === "caja" && (
        <>
          <h1>La caja</h1>
          <p className="lead">Escribe lo que tengas en la cabeza. Impersia lo archiva en su eje. Si no es el sitio, lo cambias.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Llamar al taller el viernes" />
          <button type="button" onClick={archive} disabled={!text.trim()}>Dejar</button>
          <h2>Archivado</h2>
          <ItemList items={items} editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
        </>
      )}
      {screen === "hoy" && (
        <>
          <h1>Hoy</h1>
          <p className="lead">Lo que tiene fecha y cae hoy. Lo demás, con fecha, queda debajo. Todo ha entrado por la caja.</p>
          <h2>Para hoy</h2>
          {todayItems.length ? <ItemList items={todayItems} editing={editing} setEditing={setEditing} saveEdit={saveEdit} /> : <p className="private">Hoy no hay nada con fecha.</p>}
          <h2>Después</h2>
          {laterItems.length ? <ItemList items={laterItems} editing={editing} setEditing={setEditing} saveEdit={saveEdit} /> : <p className="private">No hay nada fechado más adelante.</p>}
        </>
      )}
      {current && (
        <>
          <p className="private">{current.axis}</p>
          <h1>{current.label}</h1>
          <p className="lead">{current.blurb}</p>
          <h2>Tuyo</h2>
          {items.some((item) => item.module === current.id) ? (
            <ItemList items={items.filter((item) => item.module === current.id)} editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
          ) : (
            <p className="private">Todavía no hay nada tuyo aquí. Entra por la caja.</p>
          )}
          <h2>Ejemplos</h2>
          <p className="private">Inventados, para ver la forma de esta pantalla. No están en tu cuenta.</p>
          <ul>
            {current.examples.map(([title, note]) => (
              <li key={title}>
                <strong>Ejemplo</strong>
                <span>{title}</span>
                {note && <span>{note}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {screen !== "hoy" && screen !== "caja" && !current && (
        <>
          <h1>Hoy</h1>
          <p className="lead">Esa pantalla no existe. Vuelve a Hoy.</p>
        </>
      )}
    </main>
  );
}

function ItemList({ items, editing, setEditing, saveEdit }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>
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
              <strong>{labelOf(item.module)}</strong>
              <span>{item.title}</span>
              {item.starts_at && <span>{whenLabel(item)}</span>}
              <button type="button" className="secondary" onClick={() => setEditing({ ...item })}>Cambiar</button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function useHash() {
  const read = () => window.location.hash.replace("#", "") || "hoy";
  const [hash, setHash] = useState(read);
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "hoy";
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

function whenLabel(item) {
  const date = new Date(item.starts_at);
  if (!item.time_known) return date.toLocaleDateString("es-ES", { dateStyle: "medium" });
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

