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

function Box({ email, onLeave }) {
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState(null);
  const [fix, setFix] = useState(false);
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
      setFix(false);
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
          time_known: Boolean(proposal.time_known),
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
      <p className="lead">Escribe como te salga. Impersia dice si es nota, tarea o cita. Si está bien, guárdalo. Si no, corrígelo.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Llamar al taller el viernes" />
      <button type="button" onClick={propose} disabled={!text.trim()}>Proponer</button>
      {error && <p className="error">{error}</p>}
      {proposal && (
        <section className="proposal">
          <p className="says">{proposalSentence(proposal)}</p>
          <div className="actions">
            <button type="button" onClick={confirm}>Guardar</button>
            <button type="button" className="secondary" onClick={() => setFix(!fix)}>
              {fix ? "Ocultar" : "Corregir"}
            </button>
          </div>
          {fix && (
            <>
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
              <label>
                Día
                <input
                  type="date"
                  value={datePart(proposal.starts_at)}
                  onChange={(e) => setProposal(withWhen(proposal, e.target.value, timePart(proposal)))}
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={proposal.time_known ? timePart(proposal) : ""}
                  onChange={(e) => setProposal(withWhen(proposal, datePart(proposal.starts_at), e.target.value))}
                />
              </label>
            </>
          )}
        </section>
      )}
      <h2>Guardado</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <strong>{labelOf(item.kind)}</strong>
            <span>{item.title}</span>
            {item.starts_at && <span>{whenLabel(item)}</span>}
          </li>
        ))}
      </ul>
    </main>
  );
}

function labelOf(kind) {
  return KINDS.find(([value]) => value === kind)?.[1] || kind;
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

function proposalSentence(proposal) {
  const kind = labelOf(proposal.kind);
  if (!proposal.starts_at) return `${kind} privada: ${proposal.title}.`;
  const date = new Date(proposal.starts_at);
  const day = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  if (!proposal.time_known) return `${kind} privada, para el ${day}: ${proposal.title}.`;
  const clock = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return `${kind} privada, para el ${day} a las ${clock}: ${proposal.title}.`;
}
