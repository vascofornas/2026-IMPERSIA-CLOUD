import { useState } from "react";

export const WISH_KINDS = [
  ["lugar", "Lugar"],
  ["cosa", "Cosa"],
  ["experiencia", "Experiencia"],
  ["otro", "Otro"],
];

export const WISH_PRIORITIES = [
  ["alta", "Alta"],
  ["media", "Media"],
  ["baja", "Baja"],
];

function initialDraft(initial, defaultListId) {
  return {
    title: initial?.title || "",
    list_id: initial?.wish_list_id || defaultListId || "",
    wish_kind: initial?.wish_kind || "otro",
    reason: initial?.wish_reason || "",
    place: initial?.wish_place || "",
    url: initial?.wish_url || "",
    estimated_price: initial?.wish_estimated_price || "",
    currency: initial?.wish_currency || "EUR",
    priority: initial?.wish_priority || "media",
    notes: initial?.wish_notes || "",
  };
}

export default function WishForm({ initial = null, lists, defaultListId, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(() => initialDraft(initial, defaultListId));

  function set(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      title: draft.title.trim(),
      list_id: draft.list_id,
      wish_kind: draft.wish_kind,
      reason: draft.reason.trim() || null,
      place: draft.place.trim() || null,
      url: draft.url.trim() || null,
      estimated_price: draft.estimated_price === "" ? null : Number(draft.estimated_price),
      currency: draft.estimated_price === "" ? null : draft.currency.trim().toUpperCase(),
      priority: draft.priority,
      notes: draft.notes.trim() || null,
    });
  }

  return (
    <form className="wish-form" onSubmit={submit}>
      <label className="wish-wide">
        Deseo
        <input
          required
          autoFocus
          maxLength="200"
          value={draft.title}
          placeholder="Qué te gustaría hacer, conocer o tener"
          onChange={(event) => set("title", event.target.value)}
        />
      </label>
      <div className="wish-form-grid">
        <label>
          Lista
          <select required value={draft.list_id} onChange={(event) => set("list_id", event.target.value)}>
            {lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </label>
        <label>
          Tipo
          <select value={draft.wish_kind} onChange={(event) => set("wish_kind", event.target.value)}>
            {WISH_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Prioridad
          <select value={draft.priority} onChange={(event) => set("priority", event.target.value)}>
            {WISH_PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Lugar
          <input value={draft.place} placeholder="Ciudad, tienda o lugar" onChange={(event) => set("place", event.target.value)} />
        </label>
        <label className="wish-wide">
          Por qué te gustaría
          <textarea rows="3" value={draft.reason} onChange={(event) => set("reason", event.target.value)} />
        </label>
        <label className="wish-wide">
          Enlace
          <input type="url" value={draft.url} placeholder="https://…" onChange={(event) => set("url", event.target.value)} />
        </label>
        <label>
          Precio estimado
          <input type="number" min="0" step="0.01" value={draft.estimated_price} onChange={(event) => set("estimated_price", event.target.value)} />
        </label>
        <label>
          Moneda
          <input maxLength="3" value={draft.currency} onChange={(event) => set("currency", event.target.value)} />
        </label>
        <label className="wish-wide">
          Notas
          <textarea rows="4" value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : initial ? "Guardar cambios" : "Guardar deseo"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
