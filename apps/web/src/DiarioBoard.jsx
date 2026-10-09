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
