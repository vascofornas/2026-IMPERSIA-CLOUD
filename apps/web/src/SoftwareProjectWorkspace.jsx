import { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import { WORKFLOW_OPTIONS } from "./ProjectPieceForm.jsx";

const TASK_COLUMNS = WORKFLOW_OPTIONS.task;
const STATUS_LABELS = Object.fromEntries(Object.values(WORKFLOW_OPTIONS).flat());
const NOTE_LABELS = {
  technical: "Nota técnica",
  decision: "Decisión",
  reference: "Referencia",
  general: "Nota general",
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function relationTargets(relations, itemId, relationType, byId) {
  return relations
    .filter((relation) => relation.from_item_id === itemId && relation.relation_type === relationType)
    .map((relation) => byId[relation.to_item_id])
    .filter(Boolean);
}

function TaskCard({ item, relations, byId, onMove, onEdit, onDelete }) {
  const dependencies = relationTargets(relations, item.id, "depends_on", byId);
  const milestones = relationTargets(relations, item.id, "supports_milestone", byId);
  const deliverables = relationTargets(relations, item.id, "supports_deliverable", byId);
  const roleData = item.project_role_data || {};
  return (
    <article
      className={`software-task-card priority-${item.project_priority || "media"} ${item.project_workflow_status === "blocked" ? "blocked" : ""}`}
      draggable
      onDragStart={(event) => event.dataTransfer.setData("text/project-item", item.id)}
    >
      <div className="software-card-head">
        <span className={`software-priority ${item.project_priority || "media"}`}>{item.project_priority || "media"}</span>
        {roleData.estimate_hours !== undefined && <span>{roleData.estimate_hours} h</span>}
      </div>
      <h4>{item.title}</h4>
      {item.project_description && <p>{item.project_description}</p>}
      <div className="software-card-meta">
        {item.project_due_date && <span>Vence {formatDate(item.project_due_date)}</span>}
        {dependencies.length > 0 && <span>Depende de {dependencies.length}</span>}
      </div>
      {(milestones.length > 0 || deliverables.length > 0) && (
        <div className="software-card-links">
          {milestones.map((row) => <span key={row.id}>Hito · {row.title}</span>)}
          {deliverables.map((row) => <span key={row.id}>Entrega · {row.title}</span>)}
        </div>
      )}
      <select
        aria-label={`Estado de ${item.title}`}
        value={item.project_workflow_status || "pending"}
        onChange={(event) => onMove(item, event.target.value, item.project_sort_order || 0)}
      >
        {TASK_COLUMNS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <div className="software-card-actions">
        <button type="button" className="link" onClick={() => onEdit(item)}><Icon name="editar" /> Abrir</button>
        <button type="button" className="link danger" onClick={() => onDelete(item)}><Icon name="borrar" /> Borrar</button>
      </div>
    </article>
  );
}

function TaskBoard({ tasks, relations, byId, onMove, onEdit, onDelete, onAdd }) {
  return (
    <section className="software-panel">
      <div className="software-panel-heading">
        <div><h3>Tablero de trabajo</h3><p>Arrastra las tarjetas o cambia su estado desde la propia tarea.</p></div>
        <button type="button" onClick={() => onAdd("task")}>+ Nueva tarea</button>
      </div>
      <div className="software-kanban">
        {TASK_COLUMNS.map(([status, label]) => {
          const rows = tasks.filter((item) => (item.project_workflow_status || "pending") === status);
          return (
            <section
              className={`software-kanban-column status-${status}`}
              key={status}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const item = tasks.find((row) => row.id === event.dataTransfer.getData("text/project-item"));
                const nextOrder = rows.reduce((maximum, row) => Math.max(maximum, row.project_sort_order || 0), 0) + 10;
                if (item) onMove(item, status, nextOrder);
              }}
            >
              <header><h4>{label}</h4><span>{rows.length}</span></header>
              <div>
                {rows.map((item) => <TaskCard key={item.id} item={item} relations={relations} byId={byId} onMove={onMove} onEdit={onEdit} onDelete={onDelete} />)}
                {!rows.length && <p className="software-column-empty">Suelta aquí una tarea</p>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function Milestones({ items, progress, relations, byId, onEdit, onDelete, onAdd }) {
  const sorted = [...items].sort((a, b) => String(a.project_due_date || "9999").localeCompare(String(b.project_due_date || "9999")));
  return (
    <section className="software-panel">
      <div className="software-panel-heading">
        <div><h3>Hitos del proyecto</h3><p>Resultados clave con progreso calculado desde sus tareas relacionadas.</p></div>
        <button type="button" onClick={() => onAdd("milestone")}>+ Nuevo hito</button>
      </div>
      {sorted.length ? (
        <div className="software-milestone-rail">
          {sorted.map((item) => {
            const stats = progress[item.id] || { linked: 0, done: 0, percent: 0 };
            const releases = relationTargets(relations, item.id, "supports_deliverable", byId);
            return (
              <article className={`software-milestone status-${item.project_workflow_status || "upcoming"}`} key={item.id}>
                <span className="software-milestone-dot" />
                <p className="software-eyebrow">{STATUS_LABELS[item.project_workflow_status] || "Próximo"} · {formatDate(item.project_due_date) || "Sin fecha"}</p>
                <h4>{item.title}</h4>
                {item.project_role_data?.success_criteria && <p>{item.project_role_data.success_criteria}</p>}
                <div className="project-progress"><i style={{ width: `${stats.percent}%` }} /></div>
                <p className="private">{stats.linked ? `${stats.done} de ${stats.linked} tareas terminadas` : "Sin tareas vinculadas"}</p>
                {releases.map((release) => <span className="software-link-chip" key={release.id}>Entrega · {release.title}</span>)}
                <div className="software-card-actions">
                  <button type="button" className="link" onClick={() => onEdit(item)}><Icon name="editar" /> Editar</button>
                  <button type="button" className="link danger" onClick={() => onDelete(item)}><Icon name="borrar" /> Borrar</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="software-empty">Todavía no hay hitos. Crea el primer resultado importante del proyecto.</p>}
    </section>
  );
}

function Deliverables({ items, progress, relations, byId, project, onEdit, onDelete, onAdd }) {
  const deliverableTypes = project.professional_definition?.deliverables || [];
  const repository = project.project_custom_values?.repositorio;
  return (
    <section className="software-panel">
      <div className="software-panel-heading">
        <div><h3>Entregables y releases</h3><p>Versiones, documentación y demostraciones listas para revisar o publicar.</p></div>
        <button type="button" onClick={() => onAdd("deliverable")}>+ Nuevo entregable</button>
      </div>
      {items.length ? (
        <div className="software-release-grid">
          {items.map((item) => {
            const stats = progress[item.id] || { linked: 0, done: 0, percent: 0 };
            const contributors = relations.filter((relation) => relation.to_item_id === item.id && relation.relation_type === "supports_deliverable").map((relation) => byId[relation.from_item_id]).filter(Boolean);
            return (
              <article className={`software-release-card status-${item.project_workflow_status || "draft"}`} key={item.id}>
                <div className="software-release-top">
                  <span>{deliverableTypes.find((type) => type.key === item.project_deliverable_type)?.label || "Entregable"}</span>
                  <strong>{STATUS_LABELS[item.project_workflow_status] || "Borrador"}</strong>
                </div>
                <h4>{item.title}</h4>
                <p className="software-release-version">{item.project_role_data?.version ? `v${item.project_role_data.version}` : "Sin versión"}{item.project_role_data?.environment ? ` · ${item.project_role_data.environment}` : ""}</p>
                {item.project_description && <p>{item.project_description}</p>}
                <div className="project-progress"><i style={{ width: `${stats.percent}%` }} /></div>
                <p className="private">{contributors.length ? `${stats.done} de ${contributors.length} piezas completadas` : "Sin piezas vinculadas"}</p>
                <div className="software-card-links">{contributors.slice(0, 4).map((row) => <span key={row.id}>{row.title}</span>)}</div>
                <div className="software-card-actions">
                  {repository && <a className="link" href={repository} target="_blank" rel="noreferrer">Repositorio</a>}
                  <button type="button" className="link" onClick={() => onEdit(item)}><Icon name="editar" /> Editar</button>
                  <button type="button" className="link danger" onClick={() => onDelete(item)}><Icon name="borrar" /> Borrar</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="software-empty">Aún no hay entregables. Añade una versión, documentación o demostración.</p>}
    </section>
  );
}

function Notes({ items, relations, byId, onEdit, onDelete, onAdd }) {
  return (
    <section className="software-panel">
      <div className="software-panel-heading">
        <div><h3>Notas y decisiones</h3><p>Contexto técnico recuperable, separado del trabajo ejecutable.</p></div>
        <button type="button" onClick={() => onAdd("note")}>+ Nueva nota</button>
      </div>
      {items.length ? (
        <div className="software-notes-grid">
          {items.map((item) => {
            const documented = relationTargets(relations, item.id, "documents", byId);
            const kind = item.project_role_data?.note_kind || "general";
            return (
              <article className={`software-note-card kind-${kind}`} key={item.id}>
                <p className="software-eyebrow">{NOTE_LABELS[kind]}</p>
                <h4>{item.title}</h4>
                {item.project_description && <p>{item.project_description}</p>}
                {documented.length > 0 && <div className="software-card-links">{documented.map((row) => <span key={row.id}>Sobre · {row.title}</span>)}</div>}
                <div className="software-card-actions">
                  <button type="button" className="link" onClick={() => onEdit(item)}><Icon name="editar" /> Editar</button>
                  <button type="button" className="link danger" onClick={() => onDelete(item)}><Icon name="borrar" /> Borrar</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : <p className="software-empty">Sin notas técnicas ni decisiones registradas.</p>}
    </section>
  );
}

export default function SoftwareProjectWorkspace({
  project,
  pieces,
  relations,
  progress,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}) {
  const [panel, setPanel] = useState("tasks");
  const grouped = useMemo(() => ({
    tasks: pieces.filter((item) => item.project_role === "task"),
    milestones: pieces.filter((item) => item.project_role === "milestone"),
    deliverables: pieces.filter((item) => item.project_role === "deliverable"),
    notes: pieces.filter((item) => item.project_role === "note"),
  }), [pieces]);
  const byId = useMemo(() => Object.fromEntries(pieces.map((item) => [item.id, item])), [pieces]);
  const blocked = grouped.tasks.filter((item) => item.project_workflow_status === "blocked").length;
  const done = grouped.tasks.filter((item) => item.project_workflow_status === "done").length;

  return (
    <div className="software-workspace">
      <section className="software-dashboard">
        <div><span>Tareas</span><strong>{grouped.tasks.length}</strong><small>{done} terminadas</small></div>
        <div className={blocked ? "warn" : ""}><span>Bloqueos</span><strong>{blocked}</strong><small>{blocked ? "Requieren atención" : "Sin bloqueos"}</small></div>
        <div><span>Hitos</span><strong>{grouped.milestones.length}</strong><small>{grouped.milestones.filter((item) => item.project_workflow_status === "reached").length} alcanzados</small></div>
        <div><span>Entregables</span><strong>{grouped.deliverables.length}</strong><small>{grouped.deliverables.filter((item) => item.project_workflow_status === "released").length} publicados</small></div>
      </section>
      <nav className="software-workspace-tabs" aria-label="Espacio de trabajo">
        {[
          ["tasks", "Tablero", grouped.tasks.length],
          ["milestones", "Hitos", grouped.milestones.length],
          ["deliverables", "Entregables", grouped.deliverables.length],
          ["notes", "Notas", grouped.notes.length],
        ].map(([key, label, count]) => (
          <button type="button" key={key} className={panel === key ? "on" : ""} onClick={() => setPanel(key)}>{label}<span>{count}</span></button>
        ))}
      </nav>
      {panel === "tasks" && <TaskBoard tasks={grouped.tasks} relations={relations} byId={byId} onMove={onMove} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />}
      {panel === "milestones" && <Milestones items={grouped.milestones} progress={progress.milestones || {}} relations={relations} byId={byId} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />}
      {panel === "deliverables" && <Deliverables items={grouped.deliverables} progress={progress.deliverables || {}} relations={relations} byId={byId} project={project} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />}
      {panel === "notes" && <Notes items={grouped.notes} relations={relations} byId={byId} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />}
    </div>
  );
}
