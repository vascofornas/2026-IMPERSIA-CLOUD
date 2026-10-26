import { useEffect, useState } from "react";

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

  if (me === undefined) return <p className="wait">…</p>;
  if (!me) return <Auth onIn={setMe} />;
  return <Write email={me.email} onOut={() => setMe(null)} />;
}

function Auth({ onIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function go(path) {
    setErr("");
    try {
      const data = await api(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onIn(data);
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <main className="box">
      <h1>Suelta</h1>
      <p className="lead">Proyecto nuevo. Cuenta nueva. Nada que ver con el Impersia de antes.</p>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
      </label>
      <label>
        Contraseña
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
      </label>
      {err && <p className="err">{err}</p>}
      <button type="button" onClick={() => go("/auth/register")}>
        Crear cuenta
      </button>
      <button type="button" className="ghost" onClick={() => go("/auth/login")}>
        Entrar
      </button>
    </main>
  );
}

function Write({ email, onOut }) {
  const [body, setBody] = useState("");
  const [last, setLast] = useState(null);
  const [err, setErr] = useState("");

  async function drop() {
    const text = body.trim();
    if (!text) return;
    setErr("");
    try {
      const row = await api("/notes", { method: "POST", body: JSON.stringify({ body: text }) });
      setLast(row);
      setBody("");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <main className="box wide">
      <header className="top">
        <strong>Suelta</strong>
        <span>{email}</span>
        <button type="button" className="ghost" onClick={() => api("/auth/logout", { method: "POST" }).finally(onOut)}>
          Salir
        </button>
      </header>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Suéltalo aquí…"
        rows={5}
      />
      <button type="button" onClick={drop}>
        Soltar
      </button>
      {err && <p className="err">{err}</p>}
      {last && (
        <p className="ok">
          Guardado {new Date(last.created_at).toLocaleString("es-ES")}. Solo existe en Suelta.
        </p>
      )}
    </main>
  );
}
