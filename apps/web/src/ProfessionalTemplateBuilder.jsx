import { useEffect, useState } from "react";

const FIELD_TYPES = [
  ["text", "Texto"],
  ["number", "Número"],
  ["date", "Fecha"],
  ["select", "Selección"],
  ["multiselect", "Selección múltiple"],
  ["boolean", "Sí / no"],
  ["url", "Enlace"],
];

function blankTemplate() {
  return {
    name: "Nueva plantilla",
    terminology: { project: "Proyecto", projects: "Proyectos", client: "Cliente" },
    definition: {
      stages: [{ key: "inicio", label: "Inicio" }, { key: "en_curso", label: "En curso" }, { key: "cerrado", label: "Cerrado" }],
      work_types: [{ key: "general", label: "General" }],
      deliverables: [{ key: "entrega", label: "Entrega" }],
      fields: [],
    },
  };
}

function draftFrom(template) {
  const source = template || blankTemplate();
  return {
    name: source.name,
    terminology: { ...source.terminology },
    definition: {
      stages: (source.definition?.stages || []).map((item) => ({ ...item })),
      work_types: (source.definition?.work_types || []).map((item) => ({ ...item })),
      deliverables: (source.definition?.deliverables || []).map((item) => ({ ...item })),
      fields: (source.definition?.fields || []).map((item) => ({ ...item, options_text: (item.options || []).join(", ") })),
    },
  };
}

function NamedListEditor({ title, items, onChange }) {
  function update(index, value) {
    onChange(items.map((item, position) => position === index ? { ...item, label: value } : item));
  }
  function move(index, direction) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  return (
    <fieldset className="professional-builder-list">
      <legend>{title}</legend>
      {items.map((item, index) => (
        <div key={`${item.key}-${index}`}>
          <input value={item.label} onChange={(event) => update(index, event.target.value)} />
          <button type="button" className="link" aria-label="Subir" onClick={() => move(index, -1)}>↑</button>
          <button type="button" className="link" aria-label="Bajar" onClick={() => move(index, 1)}>↓</button>
          <button type="button" className="link danger" onClick={() => onChange(items.filter((_, position) => position !== index))}>Quitar</button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() => onChange([...items, { key: `nuevo_${items.length + 1}`, label: "Nuevo" }])}
      >
        + Añadir
      </button>
    </fieldset>
  );
}

function TemplateForm({ initial, busy, onSubmit, onCancel }) {
  const [draft, setDraft] = useState(() => draftFrom(initial));

  function setTerm(key, value) {
    setDraft((current) => ({ ...current, terminology: { ...current.terminology, [key]: value } }));
  }
  function setDefinition(key, value) {
    setDraft((current) => ({ ...current, definition: { ...current.definition, [key]: value } }));
  }
  function updateField(index, key, value) {
    setDefinition("fields", draft.definition.fields.map((field, position) => position === index ? { ...field, [key]: value } : field));
  }
  function submit(event) {
    event.preventDefault();
    onSubmit({
      name: draft.name.trim(),
      terminology: draft.terminology,
      definition: {
        ...draft.definition,
        fields: draft.definition.fields.map(({ options_text, ...field }) => ({
          ...field,
          options: field.type === "select" || field.type === "multiselect"
            ? String(options_text || "").split(",").map((value) => value.trim()).filter(Boolean)
            : undefined,
        })),
      },
    });
  }

  return (
    <form className="professional-template-form card" onSubmit={submit}>
      <h3>{initial ? `Editar ${initial.name}` : "Nueva plantilla profesional"}</h3>
      <div className="professional-template-grid">
        <label>
          Nombre del sector o forma de trabajo
          <input required maxLength="120" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </label>
        <label>
          Nombre de cada contenedor
          <input required value={draft.terminology.project} onChange={(event) => setTerm("project", event.target.value)} />
        </label>
        <label>
          Nombre en plural
          <input required value={draft.terminology.projects} onChange={(event) => setTerm("projects", event.target.value)} />
        </label>
        <label>
          Cómo llamas al cliente o destinatario
          <input required value={draft.terminology.client} onChange={(event) => setTerm("client", event.target.value)} />
        </label>
      </div>

      <div className="professional-builder-columns">
        <NamedListEditor title="Fases" items={draft.definition.stages} onChange={(value) => setDefinition("stages", value)} />
        <NamedListEditor title="Tipos de trabajo" items={draft.definition.work_types} onChange={(value) => setDefinition("work_types", value)} />
        <NamedListEditor title="Tipos de entregable" items={draft.definition.deliverables} onChange={(value) => setDefinition("deliverables", value)} />
      </div>

      <fieldset className="professional-custom-fields">
        <legend>Campos de la ficha</legend>
        {draft.definition.fields.map((field, index) => (
          <div className="professional-custom-field" key={`${field.key}-${index}`}>
            <input
              aria-label="Nombre del campo"
              placeholder="Nombre del campo"
              value={field.label}
              onChange={(event) => updateField(index, "label", event.target.value)}
            />
            <select value={field.type} onChange={(event) => updateField(index, "type", event.target.value)}>
              {FIELD_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            {(field.type === "select" || field.type === "multiselect") && (
              <input
                aria-label="Opciones"
                placeholder="Opciones separadas por comas"
                value={field.options_text || ""}
                onChange={(event) => updateField(index, "options_text", event.target.value)}
              />
            )}
            <label className="professional-required">
              <input type="checkbox" checked={Boolean(field.required)} onChange={(event) => updateField(index, "required", event.target.checked)} />
              Obligatorio
            </label>
            <button type="button" className="link danger" onClick={() => setDefinition("fields", draft.definition.fields.filter((_, position) => position !== index))}>Quitar</button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => setDefinition("fields", [...draft.definition.fields, { key: `campo_${draft.definition.fields.length + 1}`, label: "Nuevo campo", type: "text", required: false }])}
        >
          + Añadir campo
        </button>
      </fieldset>

      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar plantilla"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function ProfessionalTemplateBuilder({
  loadTemplates,
  createTemplate,
  updateTemplate,
  cloneTemplate,
  deleteTemplate,
  setDefaultTemplate,
  setError,
}) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [replacementId, setReplacementId] = useState("");

  async function reload() {
    const data = await loadTemplates();
    setTemplates(data.items || []);
  }

  useEffect(() => {
    reload().catch((error) => setError(error.message));
  }, [loadTemplates, setError]);

  async function save(payload) {
    setBusy(true);
    setError("");
    try {
      if (editing) await updateTemplate(editing.id, payload);
      else await createTemplate(payload);
      await reload();
      setEditing(null);
      setAdding(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(template) {
    setBusy(true);
    try {
      await setDefaultTemplate(template.id);
      await reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function clone(template) {
    setBusy(true);
    try {
      const created = await cloneTemplate(template.id);
      await reload();
      setEditing(created);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteTemplate(deleting.id, replacementId || null);
      await reload();
      setDeleting(null);
      setReplacementId("");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="professional-settings">
      <div className="professional-settings-head">
        <div>
          <h2>Adaptación profesional</h2>
          <p className="lead">Define cómo se llaman y qué necesitan tus proyectos según cada sector.</p>
        </div>
        {!adding && !editing && <button type="button" onClick={() => setAdding(true)}>+ Nueva plantilla</button>}
      </div>

      {(adding || editing) && (
        <TemplateForm initial={editing} busy={busy} onSubmit={save} onCancel={() => { setAdding(false); setEditing(null); }} />
      )}

      <div className="professional-template-cards">
        {templates.map((template) => (
          <article className="professional-template-card" key={template.id}>
            <p className="private">{template.starter_key ? "Plantilla inicial editable" : "Plantilla personalizada"}</p>
            <h3>{template.name}</h3>
            <p>{template.terminology.project} · {template.definition.stages?.length || 0} fases · {template.definition.fields?.length || 0} campos</p>
            <p className="private">{template.project_count} proyecto{template.project_count === 1 ? "" : "s"}</p>
            {template.is_default && <span className="professional-default">Predeterminada</span>}
            <div className="actions">
              {!template.is_default && <button type="button" disabled={busy} onClick={() => makeDefault(template)}>Usar por defecto</button>}
              <button type="button" className="secondary" onClick={() => setEditing(template)}>Editar</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => clone(template)}>Clonar</button>
              <button type="button" className="link danger" onClick={() => setDeleting(template)}>Borrar</button>
            </div>
          </article>
        ))}
      </div>

      {deleting && (
        <div className="professional-delete card">
          <h3>Borrar «{deleting.name}»</h3>
          <p className="private">Si se utiliza o es la predeterminada, elige antes una sustituta.</p>
          <select value={replacementId} onChange={(event) => setReplacementId(event.target.value)}>
            <option value="">Sin sustituta</option>
            {templates.filter((item) => item.id !== deleting.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="actions">
            <button type="button" className="danger" disabled={busy} onClick={remove}>Borrar plantilla</button>
            <button type="button" className="secondary" onClick={() => setDeleting(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </section>
  );
}
