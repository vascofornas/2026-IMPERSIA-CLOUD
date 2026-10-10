import { useState } from "react";
import { CustomField } from "./ProjectForm.jsx";

export const PROJECT_ROLES = [
  ["task", "Tarea"],
  ["milestone", "Hito"],
  ["deliverable", "Entregable"],
  ["note", "Nota"],
];

export default function ProjectPieceForm({ project, initial, initialRole = "task", busy, onSubmit, onCancel }) {
  const definition = project.professional_definition || {};
  const [draft, setDraft] = useState({
    title: initial?.title || "",
    project_role: initial?.project_role || initialRole,
    work_types: initial?.project_work_types || (initial?.project_work_type ? [initial.project_work_type] : []),
    deliverable_type: initial?.project_deliverable_type || "",
    stage: initial?.project_stage || project.project_stage || definition.stages?.[0]?.key || "",
    priority: initial?.project_priority || "media",
    due_date: initial?.project_due_date || "",
    description: initial?.project_description || "",
    custom_values: { ...(initial?.project_custom_values || {}) },
  });

  function submit(event) {
    event.preventDefault();
    onSubmit({
      title: draft.title.trim(),
      project_role: draft.project_role,
      work_types: draft.work_types,
      deliverable_type: draft.project_role === "deliverable" ? draft.deliverable_type || null : null,
      stage: draft.stage || null,
      priority: draft.priority,
      due_date: draft.due_date || null,
      description: draft.description.trim() || null,
      custom_values: draft.custom_values,
    });
  }

  return (
    <form className="project-form project-piece-form card editor" onSubmit={submit}>
      <h3>{initial ? "Editar pieza" : "Añadir al proyecto"}</h3>
      <div className="project-form-grid">
        <label className="project-wide">
          Título
          <input autoFocus required maxLength="200" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          Tipo
          <select value={draft.project_role} onChange={(event) => setDraft({ ...draft, project_role: event.target.value })}>
            {PROJECT_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {draft.project_role === "deliverable" ? (
          <label>
            Tipo de entregable
            <select value={draft.deliverable_type} onChange={(event) => setDraft({ ...draft, deliverable_type: event.target.value })}>
              <option value="">Sin indicar</option>
              {(definition.deliverables || []).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </label>
        ) : (
          <fieldset className="project-multiple">
            <legend>Tipos de trabajo</legend>
            {(definition.work_types || []).map((item) => (
              <label key={item.key}>
                <input
                  type="checkbox"
                  checked={draft.work_types.includes(item.key)}
                  onChange={(event) => setDraft({
                    ...draft,
                    work_types: event.target.checked
                      ? [...draft.work_types, item.key]
                      : draft.work_types.filter((value) => value !== item.key),
                  })}
                />
                {item.label}
              </label>
            ))}
          </fieldset>
        )}
        <label>
          Fase
          <select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })}>
            {(definition.stages || []).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        <label>
          Prioridad
          <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </label>
        <label>
          Vencimiento
          <input type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} />
        </label>
        {(definition.fields || []).map((field) => (
          <CustomField
            key={field.key}
            field={field}
            value={draft.custom_values[field.key] ?? ""}
            onChange={(value) => setDraft({ ...draft, custom_values: { ...draft.custom_values, [field.key]: value } })}
          />
        ))}
        <label className="project-wide">
          Detalle
          <textarea rows="4" maxLength="5000" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
