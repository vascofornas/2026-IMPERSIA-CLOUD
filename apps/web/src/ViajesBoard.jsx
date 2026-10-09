import { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import {
  CHECKLIST_ROLES,
  orphanTravelPieces,
  piecesForTrip,
  travelTrips,
  tripIsUpcoming,
  tripRangeLabel,
  TRAVEL_ROLE_OPTIONS,
} from "./travel.js";

const TRAVEL_SECTIONS = [
  {
    role: "reserva",
    title: "Reservas",
    hint: "Transporte y alojamiento: vuelos, trenes, hotel o coche.",
    addLabel: "Añadir reserva",
    placeholder: "Ej.: Hotel en Taüll · reserva 4582",
  },
  {
    role: "plan",
    title: "Itinerario y por hacer",
    hint: "Lugares, actividades y gestiones que quieres organizar.",
    addLabel: "Añadir al itinerario",
    placeholder: "Ej.: Día 1 · paseo por Aigüestortes",
  },
  {
    role: "experiencia",
    title: "Experiencias",
    hint: "Museos, excursiones, restaurantes, tours y planes especiales.",
    addLabel: "Añadir experiencia",
    placeholder: "Ej.: Excursión guiada al Estany Llong",
  },
  {
    role: "equipaje",
    title: "Equipaje",
    hint: "Lista de cosas que no quieres olvidar.",
    addLabel: "Añadir al equipaje",
    placeholder: "Ej.: Botas de montaña",
  },
  {
    role: "nota",
    title: "Notas",
    hint: "Direcciones, teléfonos y cualquier información útil.",
    addLabel: "Añadir nota",
    placeholder: "Ej.: El hotel guarda las maletas desde las 10:00",
  },
];

function AddTripForm({ createTrip, onCreated, setError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const item = await createTrip({
        title: title.trim(),
        travel_place: place.trim() || null,
        starts_at: starts || null,
        travel_end: ends || null,
      });
      onCreated(item);
      setOpen(false);
      setTitle("");
      setPlace("");
      setStarts("");
      setEnds("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="primary viajes-add-trip" onClick={() => setOpen(true)}>
        + Nuevo viaje
      </button>
    );
  }

  return (
    <form className="viajes-form card editor" onSubmit={submit}>
      <h3 className="viajes-form-title">Nuevo viaje</h3>
      <p className="private viajes-form-hint">Primero el viaje (destino y fechas). Después añades reservas, experiencias y equipaje dentro.</p>
      <label>
        Título
        <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Viaje a Lisboa" />
      </label>
      <label>
        Destino (opcional)
        <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Lisboa" />
      </label>
      <label>
        Ida (opcional)
        <input type="date" value={starts} onChange={(e) => setStarts(e.target.value)} />
      </label>
      <label>
        Vuelta (opcional)
        <input type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
      </label>
      <div className="viajes-form-actions">
        <button type="submit" className="primary" disabled={busy}>
          Crear
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function AddPieceForm({ tripId, role, addLabel, placeholder, createPiece, onCreated, setError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const item = await createPiece(tripId, {
        travel_role: role,
        title: title.trim(),
        travel_place: place.trim() || null,
      });
      onCreated(item);
      setOpen(false);
      setTitle("");
      setPlace("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="secondary viajes-add-piece" onClick={() => setOpen(true)}>
        + {addLabel}
      </button>
    );
  }

  return (
    <form className="viajes-form viajes-form-inline" onSubmit={submit}>
      <label className="viajes-piece-input">
        Qué quieres guardar
        <input type="text" required autoFocus placeholder={placeholder} value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="viajes-piece-place">
        Lugar o proveedor (opcional)
        <input type="text" placeholder="Ej.: Taüll, Renfe, Hotel…" value={place} onChange={(e) => setPlace(e.target.value)} />
      </label>
      <button type="submit" className="primary" disabled={busy}>
        Guardar
      </button>
      <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
        Cancelar
      </button>
    </form>
  );
}

function dateInputValue(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function TravelEditForm({ editing, setEditing, saveEdit }) {
  const isTrip = editing.travel_role === "trip";

  function submit(e) {
    e.preventDefault();
    saveEdit();
  }

  return (
    <form className="viajes-edit-form" onSubmit={submit}>
      <h4>{isTrip ? "Editar viaje" : "Editar contenido"}</h4>
      {!isTrip && (
        <label>
          Apartado
          <select value={editing.travel_role || "nota"} onChange={(e) => setEditing({ ...editing, travel_role: e.target.value })}>
            {TRAVEL_ROLE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        Título
        <input required value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
      </label>
      <label>
        {isTrip ? "Destino (opcional)" : "Lugar o proveedor (opcional)"}
        <input
          value={editing.travel_place || ""}
          onChange={(e) => setEditing({ ...editing, travel_place: e.target.value })}
        />
      </label>
      {isTrip && (
        <div className="viajes-edit-dates">
          <label>
            Ida (opcional)
            <input
              type="date"
              value={dateInputValue(editing.starts_at)}
              onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null, time_known: false })}
            />
          </label>
          <label>
            Vuelta (opcional)
            <input
              type="date"
              value={dateInputValue(editing.travel_end)}
              onChange={(e) => setEditing({ ...editing, travel_end: e.target.value || null })}
            />
          </label>
        </div>
      )}
      <div className="viajes-form-actions">
        <button type="submit" className="primary">Guardar cambios</button>
        <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button>
      </div>
    </form>
  );
}

function PieceRow({ item, onToggleStatus, startEdit, askRemove }) {
  const checklist = CHECKLIST_ROLES.has(item.travel_role);
  const done = item.status === "done";
  return (
    <li className={["viajes-piece", done ? "done" : ""].filter(Boolean).join(" ")}>
      {checklist ? (
        <button
          type="button"
          className="viajes-check"
          aria-label={done ? "Marcar pendiente" : "Marcar hecho"}
          onClick={() => onToggleStatus(item)}
        >
          {done ? "✓" : "○"}
        </button>
      ) : (
        <span className="viajes-check-placeholder" aria-hidden />
      )}
      <span className="viajes-piece-title">{item.title}</span>
      <span className="viajes-piece-actions">
        <button type="button" className="link" onClick={() => startEdit(item)}>
          <Icon name="editar" /> Cambiar
        </button>
        <button type="button" className="link danger" onClick={() => askRemove(item)}>
          <Icon name="borrar" /> Borrar
        </button>
      </span>
    </li>
  );
}

function TripDetail({
  trip,
  items,
  createPiece,
  onPieceCreated,
  setError,
  onToggleStatus,
  editing,
  setEditing,
  startEdit,
  saveEdit,
  askRemove,
}) {
  const pieces = piecesForTrip(items, trip.id);
  const pending = pieces.filter((p) => CHECKLIST_ROLES.has(p.travel_role) && p.status !== "done").length;

  return (
    <article className="viajes-detail">
      <header className="viajes-detail-head">
        <div>
          <h3 className="viajes-detail-title">{trip.title}</h3>
          <p className="viajes-detail-meta">
            {tripRangeLabel(trip)}
            {pending > 0 && (
              <span className="viajes-detail-pending">
                {" "}
                · {pending} pendiente{pending === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <button type="button" className="link" onClick={() => startEdit(trip)}>
          <Icon name="editar" /> Editar viaje
        </button>
      </header>
      {editing?.module === "viajes" && (editing.id === trip.id || pieces.some((piece) => piece.id === editing.id)) && (
        <TravelEditForm editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
      )}
      <p className="private viajes-detail-help">Guarda cada cosa en su apartado. Pulsa «Añadir» en la sección que necesites.</p>
      <div className="viajes-sections">
        {TRAVEL_SECTIONS.map((section) => {
          const sectionItems = pieces.filter((item) => item.travel_role === section.role);
          return (
            <section key={section.role} className="viajes-role-block">
              <div className="viajes-role-head">
                <div>
                  <h4 className="viajes-role-heading">{section.title}</h4>
                  <p className="private viajes-role-hint">{section.hint}</p>
                </div>
                <AddPieceForm
                  tripId={trip.id}
                  role={section.role}
                  addLabel={section.addLabel}
                  placeholder={section.placeholder}
                  createPiece={createPiece}
                  onCreated={onPieceCreated}
                  setError={setError}
                />
              </div>
              {sectionItems.length > 0 ? (
                <ul className="viajes-piece-list">
                  {sectionItems.map((item) => (
                <PieceRow
                  key={item.id}
                  item={item}
                  onToggleStatus={onToggleStatus}
                  startEdit={startEdit}
                  askRemove={askRemove}
                />
              ))}
                </ul>
              ) : (
                <p className="private viajes-section-empty">Todavía no has añadido nada.</p>
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}

export default function ViajesBoard({
  items,
  createTrip,
  createPiece,
  setError,
  onItemCreated,
  onToggleStatus,
  editing,
  setEditing,
  startEdit,
  saveEdit,
  askRemove,
}) {
  const trips = travelTrips(items);
  const orphans = orphanTravelPieces(items);
  const upcoming = useMemo(() => trips.filter(tripIsUpcoming), [trips]);
  const [selectedId, setSelectedId] = useState(null);
  const activeId = selectedId || upcoming[0]?.id || trips[0]?.id || null;
  const activeTrip = trips.find((t) => t.id === activeId) || null;

  function handleCreated(item) {
    onItemCreated(item);
    if (item.travel_role === "trip") setSelectedId(item.id);
  }

  if (!trips.length && !orphans.length) {
    return (
      <div className="viajes-board">
        <p className="lead viajes-lead">
          Carpeta de viaje: fechas, reservas, equipaje y <strong>experiencias</strong> (museos, tours…). También puedes abrir
          un viaje en Entrada: «Viaje a Lisboa del 20 al 24 de octubre».
        </p>
        <AddTripForm createTrip={createTrip} onCreated={handleCreated} setError={setError} />
      </div>
    );
  }

  return (
    <div className="viajes-board">
      <div className="viajes-head-row">
        <p className="private viajes-lead-compact">
          Reservas, tareas, equipaje y experiencias dentro de cada viaje. Con fecha concreta de cita → Agenda.
        </p>
        <AddTripForm createTrip={createTrip} onCreated={handleCreated} setError={setError} />
      </div>
      <div className={["viajes-layout", trips.length === 1 ? "single" : ""].filter(Boolean).join(" ")}>
        {trips.length > 1 && (
          <aside className="viajes-trip-list" aria-label="Lista de viajes">
            {trips.map((trip) => (
              <button
                key={trip.id}
                type="button"
                className={["viajes-trip-card", trip.id === activeId ? "on" : "", !tripIsUpcoming(trip) ? "past" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setSelectedId(trip.id)}
              >
                <span className="viajes-trip-card-title">{trip.title}</span>
                <span className="private viajes-trip-card-dates">{tripRangeLabel(trip)}</span>
              </button>
            ))}
          </aside>
        )}
        <div className="viajes-main">
          {activeTrip ? (
            <TripDetail
              trip={activeTrip}
              items={items}
              createPiece={createPiece}
              onPieceCreated={handleCreated}
              setError={setError}
              onToggleStatus={onToggleStatus}
              editing={editing}
              setEditing={setEditing}
              startEdit={startEdit}
              saveEdit={saveEdit}
              askRemove={askRemove}
            />
          ) : (
            <p className="private">Elige un viaje.</p>
          )}
          {orphans.length > 0 && (
            <section className="viajes-orphans">
              <h3 className="viajes-subheading">Sin viaje asignado</h3>
              <p className="private">Enlázalos editando el ítem o crea un viaje y vuelve a archivar en Entrada.</p>
              <ul className="viajes-piece-list">
                {orphans.map((item) => (
                  <PieceRow
                    key={item.id}
                    item={item}
                    onToggleStatus={onToggleStatus}
                    startEdit={startEdit}
                    askRemove={askRemove}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
