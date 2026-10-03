import { useCallback, useEffect, useState } from "react";

const API = "https://api.impersia.cloud";

async function adminCall(path) {
  const response = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "No se pudo cargar");
  }
  return data;
}

function fmt(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-ES");
}

function metaPreview(meta) {
  if (!meta || !Object.keys(meta).length) return "—";
  try {
    const text = JSON.stringify(meta);
    return text.length > 80 ? `${text.slice(0, 77)}…` : text;
  } catch {
    return "—";
  }
}

export default function ActivityLog({ setError }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [facets, setFacets] = useState({ actions: [], products: [], categories: [] });
  const [filters, setFilters] = useState({
    q: "",
    action: "",
    category: "",
    product: "",
    email: "",
    success: "",
  });
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (filters.q) params.set("q", filters.q);
    if (filters.action) params.set("action", filters.action);
    if (filters.category) params.set("category", filters.category);
    if (filters.product) params.set("product", filters.product);
    if (filters.email) params.set("email", filters.email);
    if (filters.success === "ok") params.set("success", "true");
    if (filters.success === "fail") params.set("success", "false");
    const data = await adminCall(`/admin/events?${params}`);
    setRows(data.items || []);
    setTotal(data.total || 0);
  }, [filters, offset]);

  useEffect(() => {
    adminCall("/admin/events/facets")
      .then(setFacets)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load, setError]);

  function updateFilter(key, value) {
    setOffset(0);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="panel">
      <header className="hero">
        <div>
          <h1>Registro de actividad</h1>
          <p className="lead">Auditoría y uso del producto. Crece con el proyecto; hoy cubre auth, pantallas, entradas e ítems.</p>
        </div>
        <div className="status on">
          <strong>{total.toLocaleString("es-ES")}</strong>
          <span>eventos registrados</span>
        </div>
      </header>

      <section className="block filters">
        <div className="fields">
          <label>
            Buscar
            <input
              type="search"
              placeholder="Acción, pantalla, correo, meta…"
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
            />
          </label>
          <label>
            Acción
            <select value={filters.action} onChange={(e) => updateFilter("action", e.target.value)}>
              <option value="">Todas</option>
              {facets.actions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value)}>
              <option value="">Todas</option>
              {facets.categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Producto
            <select value={filters.product} onChange={(e) => updateFilter("product", e.target.value)}>
              <option value="">Todos</option>
              {facets.products.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Correo
            <input
              type="search"
              placeholder="usuario@…"
              value={filters.email}
              onChange={(e) => updateFilter("email", e.target.value)}
            />
          </label>
          <label>
            Resultado
            <select value={filters.success} onChange={(e) => updateFilter("success", e.target.value)}>
              <option value="">Todos</option>
              <option value="ok">Correcto</option>
              <option value="fail">Fallido</option>
            </select>
          </label>
        </div>
      </section>

      <section className="block">
        {!rows.length ? (
          <p className="private">Sin eventos con estos filtros. Usa la web app o entra de nuevo para generar registros.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cuándo</th>
                  <th>Acción</th>
                  <th>Producto</th>
                  <th>Pantalla</th>
                  <th>Usuario</th>
                  <th>Entorno</th>
                  <th>Meta</th>
                  <th>OK</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={row.success ? "" : "fail"}>
                    <td>{fmt(row.created_at)}</td>
                    <td><code>{row.action}</code></td>
                    <td>{row.product}</td>
                    <td>{row.screen || "—"}</td>
                    <td>{row.email || "—"}</td>
                    <td>
                      {[row.os, row.browser, row.device_type, row.app_version].filter(Boolean).join(" · ") || "—"}
                      {row.ip ? <span className="private"> · {row.ip}</span> : null}
                    </td>
                    <td className="meta">{metaPreview(row.meta)}</td>
                    <td>{row.success ? "Sí" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > limit && (
          <div className="pager">
            <button type="button" className="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
              Anterior
            </button>
            <span className="private">
              {offset + 1}–{Math.min(offset + limit, total)} de {total}
            </span>
            <button type="button" className="secondary" disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)}>
              Siguiente
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
