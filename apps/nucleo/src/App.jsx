import { useEffect, useRef, useState } from "react";
import { call, normalizeCaptureResult } from "./api.js";
import { trustLineForItem } from "./trust.js";

function Mark() {
  return (
    <p className="mark" aria-label="Impersia">
      Impersia
    </p>
  );
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
  const [saved, setSaved] = useState([]);
  const areaRef = useRef(null);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  async function release() {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError("");
    setSaved([]);
    try {
      const result = await call("/captures", {
        method: "POST",
        body: JSON.stringify({ text: raw }),
      });
      const { items, deduped } = normalizeCaptureResult(result);
      setSaved(items.map((item) => trustLineForItem(item)));
      setText("");
      if (deduped > 0 && items.length === 0) {
        setError("Eso ya lo teníamos. No hace falta repetirlo en otro sitio.");
      }
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

        {saved.length > 0 && (
          <section className="echo" aria-live="polite">
            <p className="echo-title">Recogido</p>
            <ul>
              {saved.map((line, i) => (
                <li key={i}>
                  <span className="echo-head">{line.title}</span>
                  <span className="echo-body">{line.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
