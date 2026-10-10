import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import ProjectForm from "./ProjectForm.jsx";
import ProjectPieceForm, { PROJECT_ROLES } from "./ProjectPieceForm.jsx";

const ROLE_LABELS = Object.fromEntries(PROJECT_ROLES);
const PRIORITY_LABELS = { baja: "Baja", media: "Media", alta: "Alta" };

function named(items, key) {
  return (items || []).find((item) => item.key === key)?.label || "";
}

function projectItems(items) {
  return items.filter((item) => item.module === "proyectos");
}

function projectsFrom(items) {
  return projectItems(items).filter((item) => !item.project_role || item.project_role === "project");
}

function piecesFor(items, projectId) {
  return projectItems(items).filter((item) => item.project_parent_id === projectId);
}

function progressFor(pieces) {
  const measurable = pieces.filter((item) => item.project_role !== "note");
  const done = measurable.filter((item) => item.status === "done").length;
  return { done, total: measurable.length, percent: measurable.length ? Math.round((done / measurable.length) * 100) : 0 };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function ProjectCard({ project, pieces, onOpen }) {
  const definition = project.professional_definition || {};
  const terms = project.professional_terminology || {};
  const progress = progressFor(pieces);
  return (
    <article className={`project-card ${project.status === "done" ? "done" : ""}`}>
      <div className="project-card-top">
        <span>{project.professional_template_name || terms.project || "Proyecto"}</span>
        <span className={`project-priority ${project.project_priority || "media"}`}>{PRIORITY_LABELS[project.project_priority] || "Media"}</span>
      </div>
      <h3>{project.title}</h3>
      <p className="project-card-client">{project.project_client_name || `Sin ${String(terms.client || "cliente").toLowerCase()}`}</p>
      <div className="project-card-facts">
        <span>{named(definition.stages, project.project_stage) || "Sin fase"}</span>
        {project.project_due_date && <span>Objetivo: {formatDate(project.project_due_date)}</span>}
        <span>{pieces.length} pieza{pieces.length === 1 ? "" : "s"}</span>
      </div>
      <div className="project-progress" aria-label={`${progress.percent}% completado`}>
        <i style={{ width: `${progress.percent}%` }} />
      </div>
      <p className="private">{progress.total ? `${progress.done} de ${progress.total} completadas` : "Sin tareas ni entregables todavía"}</p>
      <button type="button" onClick={onOpen}>Abrir ficha completa</button>
    </article>
  );
}

function Value({ field, value }) {
  if (field.type === "boolean") return value ? "Sí" : "No";
  if (field.type === "url" && value) return <a href={value} target="_blank" rel="noreferrer">Abrir enlace</a>;
  return String(value ?? "");
}

function PieceRow({ item, project, busy, onStatus, onEdit, onDelete }) {
  const definition = project.professional_definition || {};
  const subtype = item.project_role === "deliverable"
    ? named(definition.deliverables, item.project_deliverable_type)
    : named(definition.work_types, item.project_work_type);
  return (
    <li className={`project-piece ${item.status === "done" ? "done" : ""}`}>
      <button
        type="button"
        className="project-piece-check"
        disabled={busy}
        aria-label={item.status === "done" ? "Marcar pendiente" : "Marcar completado"}
        onClick={onStatus}
      >
        {item.status === "done" ? "✓" : "○"}
      </button>
      <div className="project-piece-body">
        <div className="project-piece-title">
          <strong>{item.title}</strong>
          <span>{ROLE_LABELS[item.project_role] || "Pieza"}</span>
          {subtype && <span>{subtype}</span>}
          <span>{named(definition.stages, item.project_stage) || "Sin fase"}</span>
        </div>
        <div className="project-piece-meta">
          <span>Prioridad {PRIORITY_LABELS[item.project_priority]?.toLowerCase() || "media"}</span>
          {item.project_due_date && <span>Vence {formatDate(item.project_due_date)}</span>}
        </div>
        {item.project_description && <p>{item.project_description}</p>}
      </div>
      <div className="project-piece-actions">
        <button type="button" className="link" onClick={onEdit}><Icon name="editar" /> Cambiar</button>
        <button type="button" className="link danger" onClick={onDelete}><Icon name="borrar" /> Borrar</button>
      </div>
    </li>
  );
}

export default function ProyectosBoard({
  items,
  loadTemplates,
  createProject,
  createPiece,
  updateItem,
  updateStatus,
  askRemove,
  setError,
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [addingProject, setAddingProject] = useState(false);
  const [editingProject, setEditingProject] = useState(false);
  const [addingPieceRole, setAddingPieceRole] = useState(null);
  const [editingPiece, setEditingPiece] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);
  const [templateFilter, setTemplateFilter] = useState("");
  const [showClosed, setShowClosed] = useState(false);

  useEffect(() => {
    let live = true;
    loadTemplates()
      .then((data) => { if (live) setTemplates(data.items || []); })
      .catch((error) => setError(error.message));
    return () => { live = false; };
  }, [loadTemplates, setError]);

  const projects = useMemo(
    () => projectsFrom(items)
      .filter((item) => !templateFilter || item.professional_template_id === templateFilter)
      .filter((item) => showClosed || item.status !== "done")
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [items, showClosed, templateFilter],
  );
  const selected = projectsFrom(items).find((item) => item.id === selectedId) || null;
  const pieces = selected ? piecesFor(items, selected.id) : [];

  async function run(action, done) {
    setBusy(true);
    setError("");
    try {
      const item = await action();
      done?.(item);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(item) {
    setBusyItemId(item.id);
    setError("");
    try {
      await updateStatus(item.id, item.status === "done" ? "open" : "done");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyItemId(null);
    }
  }

  if (!selected) {
    return (
      <div className="projects-board">
        <div className="projects-hero">
          <div>
            <h2>Trabajo profesional, a tu manera</h2>
            <p className="private">Cada tarjeta usa su propia plantilla sectorial. Abre una para ver toda la ficha y su trabajo relacionado.</p>
          </div>
          {!addingProject && <button type="button" onClick={() => setAddingProject(true)}>+ Nuevo proyecto</button>}
        </div>
        {addingProject && templates.length > 0 && (
          <ProjectForm
            templates={templates}
            busy={busy}
            onCancel={() => setAddingProject(false)}
            onSubmit={(payload) => run(() => createProject(payload), (item) => {
              setAddingProject(false);
              setSelectedId(item.id);
            })}
          />
        )}
        <div className="projects-filters">
          <select aria-label="Plantilla" value={templateFilter} onChange={(event) => setTemplateFilter(event.target.value)}>
            <option value="">Todos los sectores</option>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
          <label><input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} /> Mostrar cerrados</label>
        </div>
        {projects.length ? (
          <div className="project-card-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} pieces={piecesFor(items, project.id)} onOpen={() => setSelectedId(project.id)} />
            ))}
          </div>
        ) : (
          <p className="private projects-empty">No hay proyectos con estos filtros. Puedes crear uno aquí o escribirlo en Entrada.</p>
        )}
      </div>
    );
  }

  const definition = selected.professional_definition || {};
  const terms = selected.professional_terminology || {};
  const progress = progressFor(pieces);
  const grouped = Object.fromEntries(PROJECT_ROLES.map(([role]) => [role, pieces.filter((item) => item.project_role === role)]));

  return (
    <div className="projects-board project-detail">
      <button type="button" className="link project-back" onClick={() => setSelectedId(null)}>← Todos los proyectos</button>
      <header className="project-detail-head">
        <div>
          <p className="project-kicker">{selected.professional_template_name} · {terms.project || "Proyecto"}</p>
          <h2>{selected.title}</h2>
          <p className="private">{selected.project_client_name ? `${terms.client || "Cliente"}: ${selected.project_client_name}` : `Sin ${String(terms.client || "cliente").toLowerCase()}`}</p>
        </div>
        <div className="project-head-actions">
          <button type="button" onClick={() => { setAddingPieceRole("task"); setEditingPiece(null); }}>+ Añadir pieza</button>
          <button type="button" className="secondary" onClick={() => setEditingProject(true)}>Editar ficha</button>
          <button type="button" className="secondary" disabled={busyItemId === selected.id} onClick={() => toggleStatus(selected)}>
            {selected.status === "done" ? "Reabrir" : "Cerrar proyecto"}
          </button>
          <button type="button" className="link danger" onClick={() => askRemove(selected)}>Borrar</button>
        </div>
      </header>

      {editingProject && (
        <ProjectForm
          templates={templates}
          initial={selected}
          busy={busy}
          onCancel={() => setEditingProject(false)}
          onSubmit={(payload) => run(() => updateItem(selected.id, payload), () => setEditingProject(false))}
        />
      )}

      <section className="project-summary">
        <div><span>Fase</span><strong>{named(definition.stages, selected.project_stage) || "Sin fase"}</strong></div>
        <div><span>Tipo</span><strong>{named(definition.work_types, selected.project_work_type) || "Sin indicar"}</strong></div>
        <div><span>Prioridad</span><strong>{PRIORITY_LABELS[selected.project_priority] || "Media"}</strong></div>
        <div><span>Fecha objetivo</span><strong>{formatDate(selected.project_due_date) || "Sin fecha"}</strong></div>
        <div><span>Progreso</span><strong>{progress.percent}%</strong></div>
      </section>

      <section className="project-stage-flow">
        <h3>Flujo de trabajo</h3>
        <div>
          {(definition.stages || []).map((stage, index) => (
            <button
              type="button"
              key={stage.key}
              className={selected.project_stage === stage.key ? "on" : ""}
              onClick={() => run(() => updateItem(selected.id, { stage: stage.key }))}
            >
              <span>{index + 1}</span>{stage.label}
            </button>
          ))}
        </div>
      </section>

      {(selected.project_description || (definition.fields || []).some((field) => selected.project_custom_values?.[field.key] !== undefined)) && (
        <section className="project-information">
          <h3>Datos de la ficha</h3>
          <div className="project-information-grid">
            {(definition.fields || []).filter((field) => selected.project_custom_values?.[field.key] !== undefined).map((field) => (
              <p key={field.key}><span>{field.label}</span><strong><Value field={field} value={selected.project_custom_values[field.key]} /></strong></p>
            ))}
          </div>
          {selected.project_description && <p className="project-description">{selected.project_description}</p>}
        </section>
      )}

      {(addingPieceRole || editingPiece) && (
        <ProjectPieceForm
          key={editingPiece?.id || addingPieceRole}
          project={selected}
          initial={editingPiece}
          initialRole={addingPieceRole || "task"}
          busy={busy}
          onCancel={() => { setAddingPieceRole(null); setEditingPiece(null); }}
          onSubmit={(payload) => run(
            () => editingPiece ? updateItem(editingPiece.id, payload) : createPiece(selected.id, payload),
            () => { setAddingPieceRole(null); setEditingPiece(null); },
          )}
        />
      )}

      <div className="project-piece-sections">
        {PROJECT_ROLES.map(([role, label]) => (
          <section className="project-piece-section" key={role}>
            <div className="project-piece-section-head">
              <div><h3>{role === "task" ? "Tareas" : role === "milestone" ? "Hitos" : role === "deliverable" ? "Entregables" : "Notas"}</h3><p className="private">{grouped[role].length} {label.toLowerCase()}{grouped[role].length === 1 ? "" : "s"}</p></div>
              <button type="button" className="secondary" onClick={() => { setEditingPiece(null); setAddingPieceRole(role); }}>+ Añadir</button>
            </div>
            {grouped[role].length ? (
              <ul className="project-piece-list">
                {grouped[role].map((item) => (
                  <PieceRow
                    key={item.id}
                    item={item}
                    project={selected}
                    busy={busyItemId === item.id}
                    onStatus={() => toggleStatus(item)}
                    onEdit={() => { setAddingPieceRole(null); setEditingPiece(item); }}
                    onDelete={() => askRemove(item)}
                  />
                ))}
              </ul>
            ) : <p className="private project-section-empty">Todavía no hay contenido.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
