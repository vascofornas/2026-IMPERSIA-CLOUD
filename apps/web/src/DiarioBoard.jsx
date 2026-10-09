import { useEffect, useMemo, useState } from "react";
import JournalEntryForm, { JOURNAL_KINDS, MOOD_LABELS } from "./JournalEntryForm.jsx";
import { Icon } from "./icons.jsx";

function entryDate(item) {
  return item.journal_occurred_on || String(item.created_at || "").slice(0, 10);
}

function kindLabel(value) {
  return JOURNAL_KINDS.find(([key]) => key === value)?.[1] || "Entrada del día";
}

function longDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function periodLabel(summary) {
  const start = new Date(`${summary.period_start}T12:00:00`);
  const end = new Date(`${summary.period_end}T12:00:00`);
  const from = start.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const to = end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return `${summary.period_type === "week" ? "Semana" : "Mes"} · ${from} – ${to}`;
}

function SummaryPanel({ enabled, summaries, loading, onRefresh, onDelete }) {
  if (!enabled) {
    return (
      <section className="journal-insights card">
        <h3>Lectura del periodo</h3>
        <p className="private">El análisis automático está desactivado. Puedes activarlo en Perfil cuando quieras.</p>
        <a href="#perfil">Ir a Perfil</a>
      </section>
    );
  }
  return (
    <section className="journal-insights">
      <div className="journal-section-head">
        <div>
          <h3>Lectura del periodo</h3>
          <p className="private">Una mirada prudente a los temas que has escrito, nunca un diagnóstico.</p>
        </div>
        <button type="button" className="secondary" onClick={onRefresh} disabled={loading}>
          {loading ? "Analizando…" : "Actualizar"}
        </button>
      </div>
      {summaries.length ? (
        <div className="journal-summary-grid">
          {summaries.slice(0, 2).map((summary) => (
            <article className="journal-summary-card" key={summary.id}>
              <p className="journal-summary-period">{periodLabel(summary)}</p>
              <p>{summary.summary_text}</p>
              {summary.themes.length > 0 && (
                <div className="journal-tags">
                  {summary.themes.map((theme) => <span key={theme}>{theme}</span>)}
                </div>
              )}
              {summary.reflection_questions.length > 0 && (
                <ul>
                  {summary.reflection_questions.map((question) => <li key={question}>{question}</li>)}
                </ul>
              )}
              <button type="button" className="link danger" onClick={() => onDelete(summary.id)}>Borrar resumen</button>
            </article>
          ))}
        </div>
      ) : (
        <p className="private">Escribe al menos dos entradas en el periodo para crear una lectura.</p>
      )}
    </section>
  );
}

function MonthEvolution({ entries }) {
  const availableMonths = useMemo(
    () => [...new Set(entries.map((item) => entryDate(item).slice(0, 7)).filter(Boolean))].sort().reverse(),
    [entries],
  );
  const [selectedMonth, setSelectedMonth] = useState(() => availableMonths[0] || new Date().toISOString().slice(0, 7));
  useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);
  const monthEntries = useMemo(
    () => entries.filter((item) => entryDate(item).startsWith(selectedMonth)),
    [entries, selectedMonth],
  );
  const evolution = useMemo(() => {
    const daily = new Map();
    const weeks = [];
    const tagCounts = new Map();
    const daysInMonth = new Date(Number(selectedMonth.slice(0, 4)), Number(selectedMonth.slice(5, 7)), 0).getDate();
    for (let start = 1; start <= daysInMonth; start += 7) {
      weeks.push({ label: `${start}–${Math.min(start + 6, daysInMonth)}`, count: 0 });
    }
    monthEntries.forEach((item) => {
      const day = Number(entryDate(item).slice(8, 10));
      if (!daily.has(day)) daily.set(day, { mood: [], energy: [] });
      const values = daily.get(day);
      if (item.journal_mood) values.mood.push(Number(item.journal_mood));
      if (item.journal_energy) values.energy.push(Number(item.journal_energy));
      weeks[Math.floor((day - 1) / 7)].count += 1;
      (item.journal_tags || []).forEach((value) => {
        tagCounts.set(value, (tagCounts.get(value) || 0) + 1);
      });
    });
    const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const days = [...daily.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, values]) => ({ day, mood: average(values.mood), energy: average(values.energy) }));
    const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
    return { days, weeks, tags, daysInMonth };
  }, [monthEntries, selectedMonth]);

  const width = 640;
  const height = 180;
  const left = 34;
  const right = 14;
  const top = 14;
  const bottom = 28;
  const x = (day) => left + ((day - 1) / Math.max(1, evolution.daysInMonth - 1)) * (width - left - right);
  const y = (value) => top + ((5 - value) / 4) * (height - top - bottom);
  const series = [
    { key: "mood", label: "Ánimo", className: "mood" },
    { key: "energy", label: "Energía", className: "energy" },
  ];
  const maxWeek = Math.max(1, ...evolution.weeks.map((week) => week.count));

  return (
    <section className="journal-evolution card">
      <div className="journal-section-head">
        <div>
          <h3>Evolución del mes</h3>
          <p className="private">Una vista descriptiva de lo que has registrado, sin interpretar ni diagnosticar.</p>
        </div>
        <select aria-label="Mes de la evolución" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
          {availableMonths.length
            ? availableMonths.map((value) => <option key={value} value={value}>{value}</option>)
            : <option value={selectedMonth}>{selectedMonth}</option>}
        </select>
      </div>

      {monthEntries.length ? (
        <div className="journal-evolution-content">
          <div className="journal-chart-block">
            <div className="journal-chart-legend">
              {series.map((item) => <span className={item.className} key={item.key}>{item.label}</span>)}
            </div>
            {evolution.days.some((day) => day.mood || day.energy) ? (
              <svg className="journal-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ánimo y energía registrados durante el mes">
                {[1, 2, 3, 4, 5].map((value) => (
                  <g key={value}>
                    <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} />
                    <text x={left - 12} y={y(value) + 4}>{value}</text>
                  </g>
                ))}
                <text className="journal-chart-axis-label" x={left} y={height - 5}>Día 1</text>
                <text className="journal-chart-axis-label journal-chart-axis-end" x={width - right} y={height - 5}>Día {evolution.daysInMonth}</text>
                {series.map((item) => {
                  const points = evolution.days.filter((day) => day[item.key]);
                  return (
                    <g className={item.className} key={item.key}>
                      {points.slice(1).map((point, index) => {
                        const previous = points[index];
                        return point.day - previous.day === 1
                          ? <line className="journal-data-line" key={`${previous.day}-${point.day}`} x1={x(previous.day)} y1={y(previous[item.key])} x2={x(point.day)} y2={y(point[item.key])} />
                          : null;
                      })}
                      {points.map((point) => (
                        <circle key={point.day} cx={x(point.day)} cy={y(point[item.key])} r="5">
                          <title>{`${item.label}, día ${point.day}: ${point[item.key].toFixed(1)} de 5`}</title>
                        </circle>
                      ))}
                    </g>
                  );
                })}
              </svg>
            ) : (
              <p className="private journal-chart-empty">Este mes aún no has indicado ánimo o energía. Las entradas sin valoración no se cuentan como valores bajos.</p>
            )}
          </div>

          <div className="journal-month-details">
            <div>
              <h4>Entradas por tramo del mes</h4>
              <div className="journal-week-bars">
                {evolution.weeks.map((week) => (
                  <div key={week.label}>
                    <span>Días {week.label}</span>
                    <div><i style={{ width: `${(week.count / maxWeek) * 100}%` }} /></div>
                    <strong>{week.count}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4>Etiquetas frecuentes</h4>
              {evolution.tags.length
                ? <div className="journal-tags">{evolution.tags.map(([value, count]) => <span key={value}>{value} · {count}</span>)}</div>
                : <p className="private">No hay etiquetas en este mes.</p>}
            </div>
          </div>
        </div>
      ) : (
        <p className="private journal-chart-empty">No hay entradas en este mes.</p>
      )}
    </section>
  );
}

function JournalCard({ item, expanded, onExpand, onEdit, onDelete }) {
  const content = item.journal_content || item.title;
  const preview = !expanded && content.length > 320 ? `${content.slice(0, 317)}…` : content;
  const tags = item.journal_tags || [];
  return (
    <article className="journal-entry-card">
      <div className="journal-entry-top">
        <div>
          <p className="journal-entry-date">{longDate(entryDate(item))}</p>
          <div className="journal-entry-labels">
            <span>{kindLabel(item.journal_kind)}</span>
            {item.journal_mood && <span>Ánimo {item.journal_mood}/5 · {MOOD_LABELS[item.journal_mood]}</span>}
            {item.journal_energy && <span>Energía {item.journal_energy}/5</span>}
          </div>
        </div>
        <div className="journal-entry-actions">
          <button type="button" className="link" onClick={onEdit}><Icon name="editar" /> Cambiar</button>
          <button type="button" className="link danger" onClick={onDelete}><Icon name="borrar" /> Borrar</button>
        </div>
      </div>
      <p className="journal-entry-content">{preview}</p>
      {expanded && (
        <div className="journal-guided-read">
          {item.journal_happened && <p><strong>Qué pasó</strong><br />{item.journal_happened}</p>}
          {item.journal_grateful && <p><strong>Qué agradezco</strong><br />{item.journal_grateful}</p>}
          {item.journal_need && <p><strong>Qué necesito</strong><br />{item.journal_need}</p>}
        </div>
      )}
      {tags.length > 0 && <div className="journal-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      {(content.length > 320 || item.journal_happened || item.journal_grateful || item.journal_need) && (
        <button type="button" className="link journal-read-more" onClick={onExpand}>
          {expanded ? "Cerrar ficha" : "Leer completa"}
        </button>
      )}
    </article>
  );
}

export default function DiarioBoard({
  items,
  createEntry,
  updateEntry,
  askRemove,
  setError,
  journalAIEnabled,
  loadSummaries,
  refreshSummaries,
  deleteSummary,
}) {
  const entries = items.filter((item) => item.module === "diario");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [month, setMonth] = useState("");
  const [mood, setMood] = useState("");
  const [kind, setKind] = useState("");
  const [tag, setTag] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setSummaryLoading(true);
    loadSummaries()
      .then((data) => {
        if (live) setSummaries(data.items || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (live) setSummaryLoading(false);
      });
    return () => {
      live = false;
    };
  }, [journalAIEnabled, loadSummaries, setError]);

  const months = useMemo(
    () => [...new Set(entries.map((item) => entryDate(item).slice(0, 7)).filter(Boolean))].sort().reverse(),
    [entries],
  );
  const tags = useMemo(
    () => [...new Set(entries.flatMap((item) => item.journal_tags || []))].sort(),
    [entries],
  );
  const filtered = entries
    .filter((item) => !month || entryDate(item).startsWith(month))
    .filter((item) => !mood || String(item.journal_mood) === mood)
    .filter((item) => !kind || (item.journal_kind || "entrada") === kind)
    .filter((item) => !tag || (item.journal_tags || []).includes(tag))
    .sort((a, b) => entryDate(b).localeCompare(entryDate(a)) || String(b.created_at).localeCompare(String(a.created_at)));

  async function saveNew(payload) {
    setBusy(true);
    setError("");
    try {
      await createEntry(payload);
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(payload) {
    setBusy(true);
    setError("");
    try {
      await updateEntry(editing.id, payload);
      setEditing(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setSummaryLoading(true);
    try {
      const data = await refreshSummaries();
      setSummaries(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function removeSummary(id) {
    try {
      await deleteSummary(id);
      setSummaries((current) => current.filter((summary) => summary.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="journal-board">
      <div className="journal-hero">
        <div>
          <h2>Tu espacio privado</h2>
          <p className="private">Escribe libremente o déjate acompañar por unas preguntas. Solo tú puedes verlo.</p>
        </div>
        {!adding && !editing && <button type="button" onClick={() => setAdding(true)}>+ Escribir en Diario</button>}
      </div>

      {adding && (
        <article className="journal-editor card">
          <h3>Nueva entrada</h3>
          <JournalEntryForm busy={busy} onSubmit={saveNew} onCancel={() => setAdding(false)} />
        </article>
      )}
      {editing && (
        <article className="journal-editor card">
          <h3>Editar entrada</h3>
          <JournalEntryForm key={editing.id} initial={editing} busy={busy} onSubmit={saveEdit} onCancel={() => setEditing(null)} />
        </article>
      )}

      <SummaryPanel
        enabled={journalAIEnabled}
        summaries={summaries}
        loading={summaryLoading}
        onRefresh={refresh}
        onDelete={removeSummary}
      />

      <MonthEvolution entries={entries} />

      <section className="journal-timeline">
        <div className="journal-section-head">
          <div>
            <h3>Tu Diario</h3>
            <p className="private">{filtered.length} entrada{filtered.length === 1 ? "" : "s"}</p>
          </div>
          <div className="journal-filters">
            <select aria-label="Mes" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="">Todos los meses</option>
              {months.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select aria-label="Ánimo" value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="">Todos los ánimos</option>
              {Object.entries(MOOD_LABELS).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}
            </select>
            <select aria-label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Todos los tipos</option>
              {JOURNAL_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select aria-label="Etiqueta" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">Todas las etiquetas</option>
              {tags.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
        </div>
        {filtered.length ? (
          <div className="journal-entry-list">
            {filtered.map((item) => (
              <JournalCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onEdit={() => {
                  setAdding(false);
                  setEditing(item);
                }}
                onDelete={() => askRemove(item)}
              />
            ))}
          </div>
        ) : (
          <p className="private journal-empty">No hay entradas con estos filtros.</p>
        )}
      </section>
    </div>
  );
}
