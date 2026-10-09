import { useState } from "react";

export const JOURNAL_KINDS = [
  ["entrada", "Entrada del día"],
  ["animo", "Estado de ánimo"],
  ["reflexion", "Reflexión"],
  ["gratitud", "Gratitud"],
];

export const MOOD_LABELS = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Neutro",
  4: "Bien",
  5: "Muy bien",
};

function todayValue() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function initialDraft(initial) {
  return {
    content: initial?.journal_content || initial?.title || "",
    journal_kind: initial?.journal_kind || "entrada",
    occurred_on: initial?.journal_occurred_on || todayValue(),
    mood: initial?.journal_mood || "",
    energy: initial?.journal_energy || "",
    guided_happened: initial?.journal_happened || "",
    guided_grateful: initial?.journal_grateful || "",
    guided_need: initial?.journal_need || "",
    tags: (initial?.journal_tags || []).join(", "),
  };
}

export default function JournalEntryForm({ initial = null, busy = false, onSubmit, onCancel }) {
  const [mode, setMode] = useState(
    initial?.journal_happened || initial?.journal_grateful || initial?.journal_need ? "guided" : "free",
  );
  const [draft, setDraft] = useState(() => initialDraft(initial));

  function set(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({
      content: draft.content.trim(),
      journal_kind: draft.journal_kind,
      occurred_on: draft.occurred_on,
      mood: draft.mood === "" ? null : Number(draft.mood),
      energy: draft.energy === "" ? null : Number(draft.energy),
      guided_happened: mode === "guided" ? draft.guided_happened.trim() || null : null,
      guided_grateful: mode === "guided" ? draft.guided_grateful.trim() || null : null,
      guided_need: mode === "guided" ? draft.guided_need.trim() || null : null,
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    });
  }

  return (
    <form className="journal-form" onSubmit={submit}>
      <div className="journal-mode-switch" aria-label="Forma de escritura">
        <button type="button" className={mode === "free" ? "on" : ""} onClick={() => setMode("free")}>Escritura libre</button>
        <button type="button" className={mode === "guided" ? "on" : ""} onClick={() => setMode("guided")}>Reflexión guiada</button>
      </div>

      <label className="journal-content-field">
        {mode === "free" ? "Escribe con libertad" : "Lo principal que quieres guardar"}
        <textarea
          required
          autoFocus
          rows="8"
          value={draft.content}
          placeholder="Qué ha pasado, qué tienes en la cabeza, cómo estás…"
          onChange={(e) => set("content", e.target.value)}
        />
      </label>

      {mode === "guided" && (
        <fieldset className="journal-guided-fields">
          <legend>Preguntas opcionales</legend>
          <label>
            ¿Qué pasó?
            <textarea rows="3" value={draft.guided_happened} onChange={(e) => set("guided_happened", e.target.value)} />
          </label>
          <label>
            ¿Qué agradeces?
            <textarea rows="3" value={draft.guided_grateful} onChange={(e) => set("guided_grateful", e.target.value)} />
          </label>
          <label>
            ¿Qué necesitas ahora?
            <textarea rows="3" value={draft.guided_need} onChange={(e) => set("guided_need", e.target.value)} />
          </label>
        </fieldset>
      )}

      <div className="journal-form-grid">
        <label>
          Fecha
          <input type="date" required value={draft.occurred_on} onChange={(e) => set("occurred_on", e.target.value)} />
        </label>
        <label>
          Tipo
          <select value={draft.journal_kind} onChange={(e) => set("journal_kind", e.target.value)}>
            {JOURNAL_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Ánimo (opcional)
          <select value={draft.mood} onChange={(e) => set("mood", e.target.value)}>
            <option value="">Sin indicar</option>
            {Object.entries(MOOD_LABELS).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}
          </select>
        </label>
        <label>
          Energía (opcional)
          <select value={draft.energy} onChange={(e) => set("energy", e.target.value)}>
            <option value="">Sin indicar</option>
            <option value="1">1 · Muy baja</option>
            <option value="2">2 · Baja</option>
            <option value="3">3 · Normal</option>
            <option value="4">4 · Alta</option>
            <option value="5">5 · Muy alta</option>
          </select>
        </label>
        <label className="journal-wide">
          Etiquetas (opcional, separadas por comas)
          <input value={draft.tags} placeholder="familia, trabajo, descanso…" onChange={(e) => set("tags", e.target.value)} />
        </label>
      </div>

      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : initial ? "Guardar cambios" : "Guardar en Diario"}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
      </div>
    </form>
  );
}
