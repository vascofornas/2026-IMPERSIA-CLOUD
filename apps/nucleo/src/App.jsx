import { useEffect, useRef, useState } from "react";
import { call } from "./api.js";

function Mark() {
  return (
    <p className="mark" aria-label="Impersia">
      Impersia
    </p>
  );
}

function formatWhen(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    call("/me")
      .then((data) => setMe(data))
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="wait">Un momento…</div>;
  if (!me) return <Auth onEnter={setMe} />;
  return <Suelta email={me.email} onLeave={() => setMe(null)} />;
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
    <div className="page auth">
      <Mark />
      <h1>Un sitio para lo que no quieres perder.</h1>
      <p className="sub">Escribe una vez. Nosotros lo recogemos y te lo devolvemos cuando toca.</p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          submit("/auth/login");
        }}
      >
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label>
          Contraseña
          <span className="secret">
            <input
              type={visible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={8}
            />
            <button type="button" className="linkish" onClick={() => setVisible(!visible)}>
              {visible ? "Ocultar" : "Ver"}
            </button>
          </span>
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary">
          Entrar
        </button>
        <button type="button" className="linkish block" onClick={() => submit("/auth/register")}>
          Crear cuenta
        </button>
      </form>
    </div>
  );
}

function Suelta({ email, onLeave }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const areaRef = useRef(null);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  async function release() {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError("");
    setSaved(null);
    try {
      const row = await call("/nucleo/releases", {
        method: "POST",
        body: JSON.stringify({ text: raw }),
      });
      setSaved(row);
      setText("");
      areaRef.current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      release();
    }
  }

  return (
    <div className="page write">
      <header className="bar">
        <Mark />
        <div className="bar-end">
          <span className="you">{email}</span>
          <button
            type="button"
            className="linkish"
            onClick={() => call("/auth/logout", { method: "POST" }).finally(onLeave)}
          >
            Salir
          </button>
        </div>
      </header>

      <div className="stage">
        <p className="fresh">Producto nuevo · lo de aquí no va al OS antiguo</p>
        <p className="prompt">¿Qué llevas en la cabeza?</p>
        <textarea
          ref={areaRef}
          className="sheet"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Una frase basta. Cita, compra, idea, pendiente…"
          rows={6}
          disabled={busy}
          aria-label="Lo que quieres soltar"
        />
        <div className="row">
          <button type="button" className="primary" onClick={release} disabled={busy || !text.trim()}>
            {busy ? "Guardando…" : "Soltar"}
          </button>
          <span className="tip">⌘↵ o Ctrl↵</span>
        </div>
        {error && <p className="error">{error}</p>}

        {saved && (
          <section className="echo" aria-live="polite">
            <p className="echo-title">Recogido</p>
            <p className="echo-head">{saved.text}</p>
            <p className="echo-body">
              Queda contigo aquí, {formatWhen(saved.created_at)}. Te lo devolveremos cuando toque — sin tener que
              apuntarlo en otro sitio.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
