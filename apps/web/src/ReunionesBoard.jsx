import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";

const KINDS = [
  ["cita", "Cita"],
  ["seguimiento", "Seguimiento"],
];

function blankDraft() {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return {
    title: "",
    day: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
    time: "",
    meeting_kind: "cita",
    client_name: "",
    project_id: "",
    participants: "",
    place: "",
    url: "",
    outcome: "",
    status: "open",
  };
}

function draftFrom(item) {
  const when = splitWhen(item.starts_at, item.time_known);
  return {
    title: item.title || "",
    day: when.day,
    time: when.time,
    meeting_kind: item.meeting_kind || "cita",
    client_name: item.meeting_client_name || "",
    project_id: item.meeting_project_id || "",
    participants: item.meeting_participants || "",
    place: item.meeting_place || "",
    url: item.meeting_url || "",
    outcome: item.meeting_outcome || "",
    status: item.status === "done" ? "done" : "open",
  };
}

function splitWhen(value, timeKnown) {
  if (!value) return { day: "", time: "" };
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return {
    day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: timeKnown ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "",
  };
}

function payloadOf(draft) {
  return {
    title: draft.title.trim(),
    day: draft.day,
    time: draft.time || null,
    meeting_kind: draft.meeting_kind,
    client_name: draft.client_name.trim() || null,
    project_id: draft.project_id || null,
    participants: draft.participants.trim() || null,
    place: draft.place.trim() || null,
    url: draft.url.trim() || null,
    outcome: draft.outcome.trim() || null,
    status: draft.status,
  };
}

export default function ReunionesBoard({
  items,
  projects,
  createMeeting,
  updateMeeting,
  updateStatus,
  askRemove,
  setError,
  renderCalendar,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const selected = items.find((item) => item.id === selectedId) || null;
  const undated = items.filter((item) => !item.starts_at);
  const openCount = items.filter((item) => item.status !== "done").length;

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) setSelectedId(null);
  }, [items, selectedId]);

  function openItem(item) {
    setCreating(false);
    setSelectedId(item.id);
  }

  async function save(draft, item) {
    setError("");
    setBusy(true);
    try {
      const saved = item ? await updateMeeting(item.id, payloadOf(draft)) : await createMeeting(payloadOf(draft));
      setCreating(false);
      setSelectedId(saved.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item) {
    setError("");
    try {
      const saved = await updateStatus(item.id, item.status === "done" ? "open" : "done");
      setSelectedId(saved.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="reuniones-layout">
      <div>
        <div className="reuniones-tools">
          <p className="private">{openCount === 1 ? "1 prevista" : `${openCount} previstas`}</p>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setCreating(true);
            }}
          >
            <Icon name="editar" /> Nueva reunión
          </button>
        </div>
        {renderCalendar(openItem)}
        {undated.length > 0 && (
          <section className="reuniones-undated">
            <h2>Sin día</h2>
            <div className="cards">
              {undated.map((item) => (
                <article className="card" key={item.id}>
                  <p className="title">{item.title}</p>
                  <button type="button" className="secondary" onClick={() => openItem(item)}>
                    <Icon name="editar" /> Abrir ficha
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
      {(creating || selected) && (
        <MeetingForm
          key={selected?.id || "nueva"}
          item={creating ? null : selected}
          projects={projects}
          busy={busy}
          onSubmit={(draft) => save(draft, creating ? null : selected)}
          onToggle={selected ? () => toggle(selected) : null}
          onDelete={selected ? () => askRemove(selected) : null}
          onClose={() => {
            setCreating(false);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}

function MeetingForm({ item, projects, busy, onSubmit, onToggle, onDelete, onClose }) {
  const [draft, setDraft] = useState(() => (item ? draftFrom(item) : blankDraft()));
  const projectChoices = [...projects];
  if (item?.meeting_project_id && !projectChoices.some((project) => project.id === item.meeting_project_id)) {
    projectChoices.push({ id: item.meeting_project_id, title: item.meeting_project_title || "Proyecto vinculado" });
  }

  useEffect(() => {
    if (!item) return;
    setDraft((current) => ({ ...current, status: item.status === "done" ? "done" : "open" }));
  }, [item]);

  function set(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <form
      className="project-form reuniones-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <div className="reuniones-form-head">
        <h2>{item ? "Ficha de la reunión" : "Nueva reunión"}</h2>
        <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
      </div>
      <div className="project-form-grid">
        <label className="project-wide">
          Título
          <input required maxLength="200" value={draft.title} placeholder="Llamada con el proveedor" onChange={(event) => set("title", event.target.value)} />
        </label>
        <label>
          Día
          <input required type="date" value={draft.day} onChange={(event) => set("day", event.target.value)} />
        </label>
        <label>
          Hora
          <input type="time" value={draft.time} onChange={(event) => set("time", event.target.value)} />
        </label>
        <label>
          Tipo
          <select value={draft.meeting_kind} onChange={(event) => set("meeting_kind", event.target.value)}>
            {KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Estado
          <select value={draft.status} onChange={(event) => set("status", event.target.value)}>
            <option value="open">Prevista</option>
            <option value="done">Hecha</option>
          </select>
        </label>
        <label>
          Cliente
          <input maxLength="240" value={draft.client_name} placeholder="Faro.red" onChange={(event) => set("client_name", event.target.value)} />
        </label>
        <label>
          Proyecto
          <select value={draft.project_id} onChange={(event) => set("project_id", event.target.value)}>
            <option value="">Sin proyecto</option>
            {projectChoices.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label className="project-wide">
          Participantes
          <input maxLength="1000" value={draft.participants} placeholder="Ana, Luis" onChange={(event) => set("participants", event.target.value)} />
        </label>
        <label>
          Lugar
          <input maxLength="300" value={draft.place} placeholder="Oficina o videollamada" onChange={(event) => set("place", event.target.value)} />
        </label>
        <label>
          Enlace
          <input maxLength="1000" type="url" value={draft.url} placeholder="https://" onChange={(event) => set("url", event.target.value)} />
        </label>
        <label className="project-wide">
          Lo que quedó dicho
          <textarea maxLength="5000" rows="5" value={draft.outcome} placeholder="Acuerdos, pendientes y la siguiente cita" onChange={(event) => set("outcome", event.target.value)} />
        </label>
      </div>
      <div className="actions">
        <button type="submit" disabled={busy}><Icon name="editar" /> {busy ? "Guardando…" : "Guardar"}</button>
        {onToggle && (
          <button type="button" className="secondary" onClick={onToggle}>
            {item.status === "done" ? "Volver a prevista" : "Marcar hecha"}
          </button>
        )}
        {onDelete && (
          <button type="button" className="danger" onClick={onDelete}><Icon name="borrar" /> Borrar</button>
        )}
      </div>
    </form>
  );
}
