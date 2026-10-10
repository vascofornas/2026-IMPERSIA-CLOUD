import { useState } from "react";
import { CustomField } from "./ProjectForm.jsx";

export const PROJECT_ROLES = [
  ["task", "Tarea"],
  ["milestone", "Hito"],
  ["deliverable", "Entregable"],
  ["note", "Nota"],
];

export const WORKFLOW_OPTIONS = {
  task: [["pending", "Pendiente"], ["in_progress", "En curso"], ["review", "En revisión"], ["blocked", "Bloqueada"], ["done", "Terminada"]],
  milestone: [["upcoming", "Próximo"], ["at_risk", "En riesgo"], ["reached", "Alcanzado"]],
  deliverable: [["draft", "Borrador"], ["in_progress", "En preparación"], ["review", "En revisión"], ["ready", "Listo"], ["released", "Publicado"]],
  note: [["active", "Activa"], ["archived", "Archivada"]],
};

const DEFAULT_WORKFLOW = { task: "pending", milestone: "upcoming", deliverable: "draft", note: "active" };

function RelationChoices({ title, relationType, candidates, selected, onChange }) {
  if (!candidates.length) return null;
  return (
    <fieldset className="project-multiple project-relations-field">
      <legend>{title}</legend>
      {candidates.map((item) => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={selected.some((relation) => relation.relation_type === relationType && relation.target_item_id === item.id)}
            onChange={(event) => onChange(event.target.checked
              ? [...selected, { relation_type: relationType, target_item_id: item.id }]
              : selected.filter((relation) => !(relation.relation_type === relationType && relation.target_item_id === item.id)))}
          />
          {item.title}
        </label>
      ))}
    </fieldset>
  );
}

export default function ProjectPieceForm({
  project,
  initial,
  initialRole = "task",
  busy,
  onSubmit,
  onCancel,
  workspacePieces = [],
  relations = [],
  software = false,
}) {
  const definition = project.professional_definition || {};
  const initialRelations = initial
    ? relations.filter((relation) => relation.from_item_id === initial.id).map((relation) => ({
      relation_type: relation.relation_type,
      target_item_id: relation.to_item_id,
    }))
    : [];
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
    workflow_status: initial?.project_workflow_status || DEFAULT_WORKFLOW[initial?.project_role || initialRole],
    sort_order: initial?.project_sort_order || 0,
    role_data: { ...(initial?.project_role_data || {}) },
    relations: initialRelations,
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
      workflow_status: draft.workflow_status,
      sort_order: draft.sort_order,
      role_data: draft.role_data,
      relations: draft.relations,
    });
  }

  function changeRole(role) {
    setDraft({
      ...draft,
      project_role: role,
      workflow_status: DEFAULT_WORKFLOW[role],
      deliverable_type: "",
      role_data: {},
      relations: [],
    });
  }

  const tasks = workspacePieces.filter((item) => item.project_role === "task" && item.id !== initial?.id);
  const milestones = workspacePieces.filter((item) => item.project_role === "milestone" && item.id !== initial?.id);
  const deliverables = workspacePieces.filter((item) => item.project_role === "deliverable" && item.id !== initial?.id);
  const documentable = workspacePieces.filter((item) => item.project_role !== "note" && item.id !== initial?.id);
  const roleLabel = Object.fromEntries(PROJECT_ROLES)[draft.project_role]?.toLowerCase() || "pieza";

  return (
    <form className={`project-form project-piece-form card editor ${software ? "software-piece-editor" : ""}`} onSubmit={submit}>
      <h3>{initial ? `Editar ${roleLabel}` : `Nueva ${roleLabel}`}</h3>
      <div className="project-form-grid">
        <label className="project-wide">
          Título
          <input autoFocus required maxLength="200" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          Tipo
          <select value={draft.project_role} disabled={Boolean(initial)} onChange={(event) => changeRole(event.target.value)}>
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
        {software && draft.project_role !== "project" && (
          <label>
            Estado
            <select value={draft.workflow_status} onChange={(event) => setDraft({ ...draft, workflow_status: event.target.value })}>
              {(WORKFLOW_OPTIONS[draft.project_role] || []).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}
        <label>
          Vencimiento
          <input type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} />
        </label>
        {!software && (definition.fields || []).map((field) => (
          <CustomField
            key={field.key}
            field={field}
            value={draft.custom_values[field.key] ?? ""}
            onChange={(value) => setDraft({ ...draft, custom_values: { ...draft.custom_values, [field.key]: value } })}
          />
        ))}
        {software && draft.project_role === "task" && (
          <>
            <label>
              Estimación (horas)
              <input type="number" min="0" step="0.5" value={draft.role_data.estimate_hours ?? ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, estimate_hours: event.target.value } })} />
            </label>
            <label className="project-wide">
              Criterios de aceptación
              <textarea rows="3" value={draft.role_data.acceptance_criteria || ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, acceptance_criteria: event.target.value } })} />
            </label>
            <RelationChoices title="Depende de" relationType="depends_on" candidates={tasks} selected={draft.relations} onChange={(value) => setDraft({ ...draft, relations: value })} />
            <RelationChoices title="Contribuye al hito" relationType="supports_milestone" candidates={milestones} selected={draft.relations} onChange={(value) => setDraft({ ...draft, relations: value })} />
            <RelationChoices title="Forma parte del entregable" relationType="supports_deliverable" candidates={deliverables} selected={draft.relations} onChange={(value) => setDraft({ ...draft, relations: value })} />
          </>
        )}
        {software && draft.project_role === "milestone" && (
          <>
            <label className="project-wide">
              Criterio para considerar alcanzado el hito
              <textarea rows="3" value={draft.role_data.success_criteria || ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, success_criteria: event.target.value } })} />
            </label>
            <RelationChoices title="Se refleja en el entregable" relationType="supports_deliverable" candidates={deliverables} selected={draft.relations} onChange={(value) => setDraft({ ...draft, relations: value })} />
          </>
        )}
        {software && draft.project_role === "deliverable" && (
          <>
            <label>
              Versión
              <input placeholder="Ej.: 1.0.0" value={draft.role_data.version || ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, version: event.target.value } })} />
            </label>
            <label>
              Entorno de publicación
              <input placeholder="Producción, App Store…" value={draft.role_data.environment || ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, environment: event.target.value } })} />
            </label>
            <label className="project-wide">
              Criterios de aceptación
              <textarea rows="3" value={draft.role_data.acceptance_criteria || ""} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, acceptance_criteria: event.target.value } })} />
            </label>
          </>
        )}
        {software && draft.project_role === "note" && (
          <>
            <label>
              Clase de nota
              <select value={draft.role_data.note_kind || "general"} onChange={(event) => setDraft({ ...draft, role_data: { ...draft.role_data, note_kind: event.target.value } })}>
                <option value="technical">Nota técnica</option>
                <option value="decision">Decisión</option>
                <option value="reference">Referencia</option>
                <option value="general">General</option>
              </select>
            </label>
            <RelationChoices title="Documenta estas piezas" relationType="documents" candidates={documentable} selected={draft.relations} onChange={(value) => setDraft({ ...draft, relations: value })} />
          </>
        )}
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
