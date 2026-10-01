import { useEffect, useState } from "react";

const API = "https://api.impersia.cloud";
const KINDS = [
  ["note", "Nota"],
  ["task", "Tarea"],
  ["event", "Cita"],
];

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
  return <Box email={me.email} onLeave={() => setMe(null)} />;
}

function Auth({ onEnter }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={() => submit("/auth/register")}>Crear cuenta</button>
        <button type="button" className="secondary" onClick={() => submit("/auth/login")}>Entrar</button>
      </div>
    </main>
  );
}

function Box({ email, onLeave }) {
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    call("/items").then(setItems).catch((err) => setError(err.message));
  }, []);

  async function propose() {
    setError("");
    try {
      const data = await call("/captures", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setProposal(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirm() {
    setError("");
    try {
      const item = await call(`/captures/${proposal.id}/confirm`, {
        method: "POST",
        body: JSON.stringify({
          kind: proposal.kind,
          title: proposal.title,
          starts_at: proposal.starts_at,
        }),
      });
      setItems([item, ...items]);
      setProposal(null);
      setText("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function leave() {
    await call("/auth/logout", { method: "POST", body: "{}" });
    onLeave();
  }

  return (
    <main>
      <header>
        <p>{email}</p>
        <button type="button" className="secondary" onClick={leave}>Salir</button>
      </header>
      <h1>La caja</h1>
      <p className="lead">Escribe una frase. Impersia propone qué es. Tú confirmas o lo corriges. Se guarda en privado.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Llamar al taller el viernes" />
      <button type="button" onClick={propose} disabled={!text.trim()}>Proponer</button>
      {error && <p className="error">{error}</p>}
      {proposal && (
        <section className="proposal">
          <label>
            Tipo
            <select value={proposal.kind} onChange={(e) => setProposal({ ...proposal, kind: e.target.value })}>
              {KINDS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Título
            <input value={proposal.title} onChange={(e) => setProposal({ ...proposal, title: e.target.value })} />
          </label>
          <p className="private">Privado. Solo tú lo ves.</p>
          <button type="button" onClick={confirm}>Guardar</button>
        </section>
      )}
      <h2>Guardado</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{labelOf(item.kind)}</strong>
            <span>{item.title}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}

function labelOf(kind) {
  return KINDS.find(([value]) => value === kind)?.[1] || kind;
}
