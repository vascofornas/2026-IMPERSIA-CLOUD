import { useMemo, useState } from "react";

export function fieldValue(item, key) {
  return item?.project_custom_values?.[key] ?? "";
}

export function CustomField({ field, value, onChange }) {
  if (field.type === "boolean") {
    return (
      <label className="project-checkbox">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
        {field.label}{field.required ? " *" : ""}
      </label>
    );
  }
  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="project-multiple">
        <legend>{field.label}{field.required ? " *" : ""}</legend>
        {(field.options || []).map((option) => (
          <label key={option}>
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={(event) => onChange(event.target.checked
                ? [...selected, option]
                : selected.filter((item) => item !== option))}
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }
  if (field.type === "select") {
    return (
      <label>
        {field.label}{field.required ? " *" : ""}
        <select required={field.required} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Sin indicar</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label>
      {field.label}{field.required ? " *" : ""}
      <input
        required={field.required}
        type={field.type === "number" || field.type === "date" || field.type === "url" ? field.type : "text"}
        step={field.type === "number" ? "any" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function itemDraft(item, template) {
  return {
    title: item?.title || "",
    template_id: item?.professional_template_id || template?.id || "",
    work_types: item?.project_work_types || (item?.project_work_type ? [item.project_work_type] : []),
    stage: item?.project_stage || template?.definition?.stages?.[0]?.key || "",
    priority: item?.project_priority || "media",
    due_date: item?.project_due_date || "",
    client_name: item?.project_client_name || "",
    description: item?.project_description || "",
    custom_values: { ...(item?.project_custom_values || {}) },
  };
}

export default function ProjectForm({ templates, initial, busy, onSubmit, onCancel }) {
  const initialTemplate = templates.find((item) => item.id === initial?.professional_template_id)
    || templates.find((item) => item.is_default)
    || templates[0];
  const [draft, setDraft] = useState(() => itemDraft(initial, initialTemplate));
  const template = useMemo(
    () => templates.find((item) => item.id === draft.template_id) || initialTemplate,
    [draft.template_id, initialTemplate, templates],
  );
  const terms = template?.terminology || {};
  const definition = template?.definition || {};

  function chooseTemplate(templateId) {
    const selected = templates.find((item) => item.id === templateId);
    setDraft((current) => ({
      ...current,
      template_id: templateId,
      stage: selected?.definition?.stages?.[0]?.key || "",
      work_types: [],
      custom_values: {},
    }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({
      title: draft.title.trim(),
      template_id: draft.template_id,
      work_types: draft.work_types,
      stage: draft.stage || null,
      priority: draft.priority,
      due_date: draft.due_date || null,
      client_name: draft.client_name.trim() || null,
      description: draft.description.trim() || null,
      custom_values: draft.custom_values,
    });
  }

  return (
    <form className="project-form card editor" onSubmit={submit}>
      <h3>{initial ? `Editar ${terms.project || "proyecto"}` : `Nuevo ${String(terms.project || "proyecto").toLowerCase()}`}</h3>
      <div className="project-form-grid">
        <label className="project-wide">
          Nombre
          <input autoFocus required maxLength="200" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </label>
        <label>
          Plantilla
          <select value={draft.template_id} onChange={(event) => chooseTemplate(event.target.value)} disabled={Boolean(initial)}>
            {templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>
          {terms.client || "Cliente"}
          <input maxLength="240" value={draft.client_name} onChange={(event) => setDraft({ ...draft, client_name: event.target.value })} />
        </label>
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
          Fecha objetivo
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
          Descripción y contexto
          <textarea rows="5" maxLength="5000" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
