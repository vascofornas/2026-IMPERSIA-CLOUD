import { useCallback, useEffect, useState } from "react";
import { Icon } from "./icons.jsx";

const API = "https://api.impersia.cloud";

const REASON_LABEL = {
  ok: "Listo para archivar con IA",
  disabled: "Motor apagado",
  no_key: "Falta la clave OpenRouter en el servidor",
  daily_budget: "Presupuesto diario agotado",
  monthly_budget: "Presupuesto mensual agotado",
};

async function adminCall(path, options = {}) {
  const response = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "No se pudo completar");
  }
  return data;
}

function money(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 4 }).format(value || 0);
}

function pct(spent, budget) {
  if (!budget) return 0;
  return Math.min(100, Math.round((spent / budget) * 100));
}

export default function AdminMotor({ setError }) {
  const [data, setData] = useState(null);
  const [usage, setUsage] = useState([]);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const [overview, history] = await Promise.all([
      adminCall("/admin/llm/overview"),
      adminCall("/admin/llm/usage?limit=30"),
    ]);
    setData(overview);
    setDraft(overview.settings);
    setUsage(history.items || []);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
    const timer = window.setInterval(() => {
      load().catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, setError]);

  if (!data || !draft) {
    return <p className="private">Cargando motor…</p>;
  }

  const { spend, operational, access, presets } = data;
  const dailyPct = pct(spend.today_usd, draft.daily_budget_usd);
  const monthPct = pct(spend.month_usd, draft.monthly_budget_usd);

  async function save() {
    setBusy(true);
    setSaved("");
    setError("");
    try {
      const result = await adminCall("/admin/llm/settings", {
        method: "PATCH",
        body: JSON.stringify({
          enabled: draft.enabled,
          model: draft.model,
          daily_budget_usd: Number(draft.daily_budget_usd),
          monthly_budget_usd: Number(draft.monthly_budget_usd),
          input_price_per_mtok: Number(draft.input_price_per_mtok),
          output_price_per_mtok: Number(draft.output_price_per_mtok),
          use_preset_prices: true,
        }),
      });
      setDraft(result.settings);
      setSaved("Guardado");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setError("");
    try {
      await adminCall("/admin/llm/test", { method: "POST" });
      setSaved("Prueba correcta");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  function pickPreset(model) {
    const preset = presets.find((item) => item.model === model);
    setDraft({
      ...draft,
      model,
      input_price_per_mtok: preset?.input ?? draft.input_price_per_mtok,
      output_price_per_mtok: preset?.output ?? draft.output_price_per_mtok,
    });
  }

  return (
    <div className="motor-admin">
      <header className="motor-hero">
        <div>
          <p className="private kicker"><Icon name="motor" /> Administración</p>
          <h1>Motor LLM</h1>
          <p className="lead">Coste, límites y encendido del archivado con IA. Solo tú ves esta pantalla.</p>
        </div>
        <div className={`motor-status ${operational.llm_available ? "on" : "off"}`}>
          <strong>{operational.llm_available ? "Activo" : "Inactivo"}</strong>
          <span>{REASON_LABEL[operational.reason] || operational.reason}</span>
        </div>
      </header>

      <div className="motor-grid">
        <section className="motor-card">
          <h2>Hoy</h2>
          <p className="motor-big">{money(spend.today_usd)}</p>
          <div className="motor-bar"><i style={{ width: `${dailyPct}%` }} /></div>
          <p className="private">De {money(draft.daily_budget_usd)} · {spend.calls_today} llamadas</p>
        </section>
        <section className="motor-card">
          <h2>Este mes</h2>
          <p className="motor-big">{money(spend.month_usd)}</p>
          <div className="motor-bar"><i style={{ width: `${monthPct}%` }} /></div>
          <p className="private">De {money(draft.monthly_budget_usd)} · {spend.calls_month} llamadas</p>
        </section>
        <section className="motor-card">
          <h2>Calidad hoy</h2>
          <p className="motor-big">{spend.success_rate_today}%</p>
          <p className="private">
            {spend.avg_latency_ms_today != null ? `${spend.avg_latency_ms_today} ms de media` : "Sin llamadas aún"}
          </p>
          <p className="private">{access.api_key_configured ? "Clave OpenRouter configurada" : "Sin clave en el servidor"}</p>
        </section>
      </div>

      <section className="motor-panel">
        <div className="motor-row">
          <label className="motor-toggle">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
            />
            <span>Motor encendido</span>
          </label>
          <div className="motor-actions">
            <button type="button" className="secondary" onClick={testConnection} disabled={testing || !access.api_key_configured}>
              {testing ? "Probando…" : "Probar conexión"}
            </button>
            <button type="button" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
            {saved && <em className="motor-saved">{saved}</em>}
          </div>
        </div>

        <label>
          Modelo (OpenRouter)
          <select value={draft.model} onChange={(e) => pickPreset(e.target.value)}>
            {presets.map((item) => (
              <option key={item.model} value={item.model}>{item.model}</option>
            ))}
          </select>
        </label>

        <div className="motor-fields">
          <label>
            Presupuesto diario (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.daily_budget_usd}
              onChange={(e) => setDraft({ ...draft, daily_budget_usd: e.target.value })}
            />
          </label>
          <label>
            Presupuesto mensual (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.monthly_budget_usd}
              onChange={(e) => setDraft({ ...draft, monthly_budget_usd: e.target.value })}
            />
          </label>
          <label>
            Precio entrada / 1M tokens
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.input_price_per_mtok}
              onChange={(e) => setDraft({ ...draft, input_price_per_mtok: e.target.value })}
            />
          </label>
          <label>
            Precio salida / 1M tokens
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.output_price_per_mtok}
              onChange={(e) => setDraft({ ...draft, output_price_per_mtok: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="motor-panel">
        <h2>Últimas llamadas</h2>
        {!usage.length ? (
          <p className="private">Todavía no hay llamadas registradas.</p>
        ) : (
          <div className="motor-table-wrap">
            <table className="motor-table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Modelo</th>
                  <th>Uso</th>
                  <th>Tokens</th>
                  <th>Coste</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((row) => (
                  <tr key={row.id} className={row.success ? "" : "fail"}>
                    <td>{new Date(row.created_at).toLocaleString("es-ES")}</td>
                    <td>{row.model}</td>
                    <td>{row.purpose}</td>
                    <td>{row.input_tokens} / {row.output_tokens}</td>
                    <td>{money(row.cost_usd)}</td>
                    <td>{row.success ? "OK" : "Error"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
