import { useCallback, useEffect, useRef, useState } from "react";

function hoyLabel() {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sortHoy(a, b) {
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

function sortKey(item) {
  if (item.return_days?.length) {
    return Math.min(...item.return_days.map((d) => Date.parse(d + "T12:00:00")));
  }
  return item.returns_at ? Date.parse(item.returns_at) : null;
}

function sortGuardado(a, b) {
  const ta = sortKey(a);
  const tb = sortKey(b);
  if (ta === null && tb === null) return Date.parse(b.created_at) - Date.parse(a.created_at);
  if (ta === null) return 1;
  if (tb === null) return -1;
  if (ta !== tb) return ta - tb;
  return Date.parse(b.created_at) - Date.parse(a.created_at);
}

function NoteList({ items, empty, variant }) {
  if (items.length === 0) return <p className={`empty empty--${variant}`}>{empty}</p>;
  return (
    <ul className={`notes notes--${variant}`}>
      {items.map((item) => (
        <li key={item.id} className={`note note--${variant}`}>
          {variant === "guardado" && <p className="note-chip">{item.when_label}</p>}
          <p className="note-body">{item.body}</p>
          {variant === "hoy" && item.when_label !== "En Hoy" && (
            <p className="note-meta">{item.when_label}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Error");
  return data;
}

export default function App() {
  const [me, setMe] = useState(undefined);

  useEffect(() => {
    api("/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) return null;
  if (!me) return <Veil onIn={setMe} />;
  return <Home onOut={() => setMe(null)} />;
}

function Veil({ onIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function enter(create) {
    setErr("");
    try {
      onIn(
        await api(create ? "/auth/register" : "/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        })
      );
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="veil">
      <div className="veil-inner">
        <p className="veil-title">Impersia</p>
        <p className="veil-copy">Cuenta nueva. Nada del OS anterior.</p>
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Clave (8+)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="current-password"
        />
        {err && <p className="err">{err}</p>}
        <p className="veil-actions">
          <span role="button" tabIndex={0} onClick={() => enter(false)}>
            Entrar
          </span>
          <span className="dot">·</span>
          <span role="button" tabIndex={0} onClick={() => enter(true)}>
            Crear
          </span>
        </p>
      </div>
    </div>
  );
}

function Home({ onOut }) {
  const [items, setItems] = useState([]);
  const [loadErr, setLoadErr] = useState(false);
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  const loadFeed = useCallback(async () => {
    try {
      const data = await api("/recientes");
      setItems(data.items || []);
      setLoadErr(false);
    } catch {
      setItems([]);
      setLoadErr(true);
    }
  }, []);

  useEffect(() => {
    loadFeed();
    ref.current?.focus();
  }, [loadFeed]);

  async function save() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const row = await api("/notes", { method: "POST", body: JSON.stringify({ body }) });
      setText("");
      setFeedback(row.feedback || "Recibido.");
      loadFeed();
    } catch {
      setFeedback("No ha podido guardarse.");
    } finally {
      setBusy(false);
      ref.current?.focus();
    }
  }

  const hoyItems = items.filter((i) => i.in_hoy_today).sort(sortHoy);
  const guardadoItems = items.filter((i) => !i.in_hoy_today).sort(sortGuardado);

  return (
    <div className="page">
      <header className="head">
        <p className="brand">Impersia</p>
        <span role="button" tabIndex={0} className="far" onClick={() => api("/auth/logout", { method: "POST" }).finally(onOut)}>
          Cerrar
        </span>
      </header>

      {loadErr && (
        <p className="err shell-err">
          No pude cargar tus apuntes. Usa localhost:5173 con la API en marcha (puerto 8010).
        </p>
      )}

      <div className="shell">
        <section className="col col--entrada" aria-labelledby="entrada-title">
          <header className="col-head col-head--entrada">
            <h2 id="entrada-title">Entrada</h2>
            <p className="col-lead">Suelta aquí. Una sola caja.</p>
          </header>
          <div className="entrada-sheet">
          <textarea
            ref={ref}
            className="main"
            value={text}
            onChange={(e) => {
              setFeedback("");
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            placeholder="Lo que lleves en la cabeza…"
            disabled={busy}
          />
          {feedback && <p className="feedback">{feedback}</p>}
          </div>
          <p className="keys keys--entrada">
            <span role="button" tabIndex={0} className="btn-guardar" onClick={save}>
              Guardar
            </span>
            <span className="hint">⌘↵</span>
          </p>
        </section>

        <section className="col col--hoy" aria-labelledby="hoy-title">
          <header className="col-head col-head--hoy">
            <h2 id="hoy-title">Hoy</h2>
            <p className="col-date">{hoyLabel()}</p>
          </header>
          <div className="col-body col-body--hoy">
            <div className="col-scroll">
              {!loadErr && (
                <NoteList variant="hoy" items={hoyItems} empty="Lo de hoy aparece aquí cuando toque." />
              )}
            </div>
          </div>
        </section>

        <section className="col col--guardado" aria-labelledby="guardado-title">
          <header className="col-head col-head--guardado">
            <h2 id="guardado-title">Guardado</h2>
            <p className="col-lead">Vuelve a Hoy cuando toque la fecha.</p>
          </header>
          <div className="col-scroll">
            {!loadErr && (
              <NoteList
                variant="guardado"
                items={guardadoItems}
                empty={items.length === 0 ? "Aún no hay nada. Escribe y guarda." : "Nada más fuera de Hoy."}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
