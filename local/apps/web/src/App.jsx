import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

export default function App() {
  const [tab, setTab] = useState("chat");
  const [settings, setSettings] = useState(null);
  const [ollama, setOllama] = useState(null);
  const [agents, setAgents] = useState([]);
  const [agentId, setAgentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const [s, a, o] = await Promise.all([
      api("/settings"),
      api("/agents"),
      api("/ollama/status"),
    ]);
    setSettings(s);
    setAgents(a.items);
    setOllama(o);
    if (!agentId && a.items.length) setAgentId(a.items[0].id);
  }, [agentId]);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  useEffect(() => {
    if (!agentId) return;
    api(`/agents/${agentId}/messages`)
      .then((d) => setMessages(d.items))
      .catch((e) => setError(e.message));
  }, [agentId]);

  async function saveSettings(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api("/settings", {
      method: "PATCH",
      body: JSON.stringify({
        ollama_base: fd.get("ollama_base"),
        ollama_model: fd.get("ollama_model"),
      }),
    });
    await reload();
  }

  async function send(e) {
    e.preventDefault();
    if (!agentId || !input.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/agents/${agentId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: input.trim() }),
      });
      setInput("");
      const d = await api(`/agents/${agentId}/messages`);
      setMessages(d.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const agent = agents.find((a) => a.id === agentId);

  return (
    <div className="shell">
      <header>
        <p className="brand">Impersia local</p>
        <nav>
          {["chat", "ajustes"].map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? "active" : ""}
              onClick={() => setTab(t)}
            >
              {t === "chat" ? "Chat" : "Ajustes Ollama"}
            </button>
          ))}
        </nav>
        {ollama && (
          <span className={`pill ${ollama.ok ? "ok" : "bad"}`}>
            {ollama.ok ? "Ollama conectado" : "Ollama no responde"}
          </span>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      {tab === "ajustes" && settings && (
        <form className="card" onSubmit={saveSettings}>
          <h2>Motor Ollama</h2>
          <label>
            URL base
            <input name="ollama_base" defaultValue={settings.ollama_base} />
          </label>
          <label>
            Modelo por defecto
            <input name="ollama_model" defaultValue={settings.ollama_model} />
          </label>
          {ollama?.models?.length > 0 && (
            <p className="hint">Instalados: {ollama.models.join(", ")}</p>
          )}
          <button type="submit">Guardar</button>
        </form>
      )}

      {tab === "chat" && (
        <div className="chat">
          <div className="chat-head">
            <select
              value={agentId ?? ""}
              onChange={(e) => setAgentId(Number(e.target.value))}
            >
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {agent?.system_prompt && (
              <p className="hint">{agent.system_prompt.slice(0, 120)}…</p>
            )}
          </div>
          <ul className="msgs">
            {messages.map((m) => (
              <li key={m.id} className={m.role}>
                <span className="role">{m.role === "user" ? "Tú" : "IA"}</span>
                {m.content}
              </li>
            ))}
          </ul>
          <form className="composer" onSubmit={send}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje…"
              disabled={busy}
            />
            <button type="submit" disabled={busy}>
              {busy ? "…" : "Enviar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
