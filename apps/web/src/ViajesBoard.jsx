import { useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import {
  CHECKLIST_ROLES,
  groupPiecesByRole,
  orphanTravelPieces,
  piecesForTrip,
  travelRoleLabel,
  travelTrips,
  tripIsUpcoming,
  tripRangeLabel,
  TRAVEL_ROLE_OPTIONS,
} from "./travel.js";

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

function AddPieceForm({ tripId, createPiece, onCreated, setError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("plan");
  const [title, setTitle] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const item = await createPiece(tripId, { travel_role: role, title: title.trim() });
      onCreated(item);
      setOpen(false);
      setTitle("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="secondary viajes-add-piece" onClick={() => setOpen(true)}>
        + Añadir
      </button>
    );
  }

  return (
    <form className="viajes-form viajes-form-inline" onSubmit={submit}>
      <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Tipo">
        {TRAVEL_ROLE_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input type="text" required placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit" className="primary" disabled={busy}>
        Guardar
      </button>
      <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
        Cancelar
      </button>
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

function TripDetail({ trip, items, createPiece, onPieceCreated, setError, onToggleStatus, startEdit, askRemove }) {
  const pieces = piecesForTrip(items, trip.id);
  const groups = groupPiecesByRole(pieces);
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
        <AddPieceForm tripId={trip.id} createPiece={createPiece} onCreated={onPieceCreated} setError={setError} />
      </header>
      {groups.length === 0 ? (
        <p className="private viajes-empty-inline">
          Nada dentro de este viaje. Añade reservas, experiencias o tareas — o escríbelo en Entrada («vuelo Lisboa», «visitar
          museo»).
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.role} className="viajes-role-block">
            <h4 className="viajes-role-heading">{group.label}</h4>
            <ul className="viajes-piece-list">
              {group.items.map((item) => (
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
        ))
      )}
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
  startEdit,
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
      <div className="viajes-layout">
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
        <div className="viajes-main">
          {activeTrip ? (
            <TripDetail
              trip={activeTrip}
              items={items}
              createPiece={createPiece}
              onPieceCreated={handleCreated}
              setError={setError}
              onToggleStatus={onToggleStatus}
              startEdit={startEdit}
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
