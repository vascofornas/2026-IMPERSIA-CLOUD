import { useEffect, useState } from "react";
import { call, normalizeCaptureResult } from "./api.js";
import { trustLineForItem } from "./trust.js";

function Logo() {
  return (
    <img src="/nucleo/logo.svg" alt="" width="120" height="83" className="logo" />
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

  if (!ready) return <main className="shell">Cargando…</main>;
  if (!me) return <Auth onEnter={setMe} />;
  return <Entrada email={me.email} onLeave={() => setMe(null)} />;
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
    <main className="shell narrow">
      <Logo />
      <h1>Entra en Impersia</h1>
      <p className="lead">Núcleo: un solo sitio para soltar lo que piensas. La misma cuenta que antes.</p>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>
        Contraseña
        <span className="secret">
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="button" className="ghost" onClick={() => setVisible(!visible)}>
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={() => submit("/auth/login")}>
          Entrar
        </button>
        <button type="button" className="ghost" onClick={() => submit("/auth/register")}>
          Crear cuenta
        </button>
      </div>
    </main>
  );
}

function Entrada({ email, onLeave }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState([]);

  async function archive() {
    const raw = text.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError("");
    setLast([]);
    try {
      const result = await call("/captures", {
        method: "POST",
        body: JSON.stringify({ text: raw }),
      });
      const { items, deduped } = normalizeCaptureResult(result);
      setLast(items.map((item) => trustLineForItem(item)));
      setText("");
      if (deduped > 0 && items.length === 0) {
        setError("Ya estaba archivado; no hace falta un segundo apunte.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="top">
        <Logo />
        <div className="who">
          <span className="badge">Núcleo</span>
          <span className="email">{email}</span>
          <button type="button" className="ghost" onClick={() => call("/auth/logout", { method: "POST" }).finally(onLeave)}>
            Salir
          </button>
        </div>
      </header>

      <section className="hero">
        <h1>Entrada</h1>
        <p className="lead">
          Escribe aquí lo que antes repartirías entre apuntes. Impersia lo archiva. No hace falta un plan B en Notes.
        </p>
      </section>

      <label className="capture">
        <span className="sr-only">Qué tienes en mente</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Lo que sea: cita, compra, tarea, idea…"
          rows={5}
          disabled={busy}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="button" onClick={archive} disabled={busy || !text.trim()}>
          {busy ? "Archivando…" : "Archivar"}
        </button>
      </div>

      {last.length > 0 && (
        <section className="trust" aria-live="polite">
          <h2>Dónde quedó</h2>
          <ul>
            {last.map((line, i) => (
              <li key={i}>
                <strong>{line.title}</strong>
                <span>{line.detail}</span>
              </li>
            ))}
          </ul>
          <p className="hint">Para ver o corregir el detalle, de momento usa la app anterior (congelada).</p>
        </section>
      )}

      <footer className="foot">
        <a href="/app/">Impersia anterior (congelada)</a>
      </footer>
    </main>
  );
}
