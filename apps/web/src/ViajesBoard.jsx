import { useState } from "react";
import { Icon } from "./icons.jsx";
import TravelDetailForm from "./TravelDetailForm.jsx";
import {
  BOOKING_STATUS_OPTIONS,
  CHECKLIST_ROLES,
  orphanTravelPieces,
  PAYMENT_STATUS_OPTIONS,
  piecesForTrip,
  travelStatusLabel,
  travelSubtypeLabel,
  travelTrips,
  tripIsUpcoming,
  tripRangeLabel,
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
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("EUR");

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
        travel_budget: budget === "" ? null : Number(budget),
        travel_currency: currency,
      });
      onCreated(item);
      setOpen(false);
      setTitle("");
      setPlace("");
      setStarts("");
      setEnds("");
      setBudget("");
      setCurrency("EUR");
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
      <label>
        Presupuesto (opcional)
        <input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
      <label>
        Moneda
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option>EUR</option>
          <option>USD</option>
          <option>GBP</option>
          <option>CHF</option>
        </select>
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

  async function submit(payload) {
    setBusy(true);
    setError("");
    try {
      const item = await createPiece(tripId, payload);
      onCreated(item);
      setOpen(false);
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
    <div className="viajes-add-detail">
      <p className="private viajes-detail-example">{placeholder}</p>
      <TravelDetailForm
        role={role}
        busy={busy}
        onSubmit={submit}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

function dateInputValue(value) {
  return typeof value === "string" ? value.slice(0, 10) : "";
}

function TripEditForm({ editing, setEditing, saveEdit }) {

  function submit(e) {
    e.preventDefault();
    saveEdit();
  }

  return (
    <form className="viajes-edit-form" onSubmit={submit}>
      <h4>Editar viaje</h4>
      <label>
        Título
        <input required value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
      </label>
      <label>
        Destino (opcional)
        <input
          value={editing.travel_place || ""}
          onChange={(e) => setEditing({ ...editing, travel_place: e.target.value })}
        />
      </label>
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
      <label>
        Presupuesto (opcional)
        <input
          type="number"
          min="0"
          step="0.01"
          value={editing.travel_budget ?? ""}
          onChange={(e) => setEditing({ ...editing, travel_budget: e.target.value })}
        />
      </label>
      <label>
        Moneda
        <select value={editing.travel_currency || "EUR"} onChange={(e) => setEditing({ ...editing, travel_currency: e.target.value })}>
          <option>EUR</option>
          <option>USD</option>
          <option>GBP</option>
          <option>CHF</option>
        </select>
      </label>
      <div className="viajes-form-actions">
        <button type="submit" className="primary">Guardar cambios</button>
        <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancelar</button>
      </div>
    </form>
  );
}

function formatTravelDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTravelSchedule(item) {
  const start = formatTravelDateTime(item.travel_starts_at);
  const end = formatTravelDateTime(item.travel_ends_at);
  if (start && end) return `${start} — ${end}`;
  return start || end;
}

function formatMoney(amount, currency = "EUR") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
}

function PieceRow({ item, onToggleStatus, startEdit, askRemove }) {
  const checklist = CHECKLIST_ROLES.has(item.travel_role);
  const done = item.status === "done";
  const schedule = formatTravelSchedule(item);
  const subtype = travelSubtypeLabel(item.travel_role, item.travel_subtype);
  const booking = travelStatusLabel(BOOKING_STATUS_OPTIONS, item.travel_booking_status);
  const payment = travelStatusLabel(PAYMENT_STATUS_OPTIONS, item.travel_payment_status);
  const amount = item.travel_amount !== null && item.travel_amount !== undefined
    ? formatMoney(item.travel_amount, item.travel_currency || "EUR")
    : "";
  const contact = [item.travel_contact_name, item.travel_contact_phone, item.travel_contact_email].filter(Boolean).join(" · ");

  return (
    <li className={["viajes-piece", done ? "done" : ""].filter(Boolean).join(" ")}>
      <div className="viajes-piece-main">
        {checklist && (
          <button
            type="button"
            className="viajes-check"
            aria-label={done ? "Marcar pendiente" : "Marcar hecho"}
            onClick={() => onToggleStatus(item)}
          >
            {done ? "✓" : "○"}
          </button>
        )}
        <div>
          <div className="viajes-piece-title-row">
            <span className="viajes-piece-title">{item.title}</span>
            {subtype && <span className="viajes-piece-badge">{subtype}</span>}
          </div>
          <div className="viajes-piece-facts">
            {schedule && <span>{schedule}</span>}
            {item.travel_provider && <span><strong>Proveedor:</strong> {item.travel_provider}</span>}
            {item.travel_reference && <span><strong>Localizador:</strong> {item.travel_reference}</span>}
            {(item.travel_address || item.travel_place) && <span>{item.travel_address || item.travel_place}</span>}
            {item.travel_quantity && <span>Cantidad: {item.travel_quantity}</span>}
            {booking && <span>{booking}</span>}
            {amount && <span><strong>{amount}</strong></span>}
            {payment && <span>{payment}</span>}
          </div>
          {contact && <p className="viajes-piece-contact"><strong>Contacto:</strong> {contact}</p>}
          {item.travel_notes && <p className="viajes-piece-notes">{item.travel_notes}</p>}
          {item.travel_url && (
            <a className="viajes-piece-link" href={item.travel_url} target="_blank" rel="noreferrer">
              Abrir enlace
            </a>
          )}
        </div>
      </div>
      <div className="viajes-piece-actions">
        <button type="button" className="link" onClick={() => startEdit(item)}>
          <Icon name="editar" /> Cambiar
        </button>
        <button type="button" className="link danger" onClick={() => askRemove(item)}>
          <Icon name="borrar" /> Borrar
        </button>
      </div>
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
  const totals = pieces.reduce((sum, piece) => {
    const amount = Number(piece.travel_amount);
    if (!Number.isFinite(amount)) return sum;
    const currency = piece.travel_currency || "EUR";
    sum[currency] = (sum[currency] || 0) + amount;
    return sum;
  }, {});
  const totalLabels = Object.entries(totals).map(([currency, amount]) => formatMoney(amount, currency));
  const budgetCurrency = trip.travel_currency || "EUR";
  const budget = trip.travel_budget !== null && trip.travel_budget !== undefined
    ? formatMoney(trip.travel_budget, budgetCurrency)
    : "";
  const spentInBudgetCurrency = totals[budgetCurrency] !== undefined
    ? formatMoney(totals[budgetCurrency], budgetCurrency)
    : "";

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
      {(budget || totalLabels.length > 0) && (
        <div className="viajes-budget-summary">
          {budget && <span><strong>Presupuesto:</strong> {budget}</span>}
          {spentInBudgetCurrency && <span><strong>Registrado:</strong> {spentInBudgetCurrency}</span>}
          {!spentInBudgetCurrency && totalLabels.length > 0 && <span><strong>Registrado:</strong> {totalLabels.join(" · ")}</span>}
        </div>
      )}
      {editing?.module === "viajes" && (editing.id === trip.id || pieces.some((piece) => piece.id === editing.id)) && (
        editing.id === trip.id ? (
          <TripEditForm editing={editing} setEditing={setEditing} saveEdit={saveEdit} />
        ) : (
          <TravelDetailForm
            key={editing.id}
            role={editing.travel_role || "nota"}
            initial={editing}
            allowRoleChange
            submitLabel="Guardar cambios"
            onSubmit={(payload) => saveEdit(payload)}
            onCancel={() => setEditing(null)}
          />
        )
      )}
      <p className="private viajes-detail-help">Guarda cada cosa en su apartado. Pulsa «Añadir» en la sección que necesites.</p>
      <div className="viajes-sections">
        {TRAVEL_SECTIONS.map((section) => {
          const sectionItems = pieces
            .filter((item) => item.travel_role === section.role)
            .sort((a, b) => String(a.travel_starts_at || "").localeCompare(String(b.travel_starts_at || "")));
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

function TripOverviewCard({ trip, items, onOpen }) {
  const pieces = piecesForTrip(items, trip.id);
  const reservations = pieces.filter((item) => item.travel_role === "reserva").length;
  const experiences = pieces.filter((item) => item.travel_role === "experiencia").length;
  const itinerary = pieces.filter((item) => item.travel_role === "plan").length;
  const pending = pieces.filter((item) => CHECKLIST_ROLES.has(item.travel_role) && item.status !== "done").length;

  return (
    <button
      type="button"
      className={["viajes-overview-card", !tripIsUpcoming(trip) ? "past" : ""].filter(Boolean).join(" ")}
      onClick={onOpen}
    >
      <span className="viajes-overview-card-top">
        <strong>{trip.title}</strong>
        <span>{tripRangeLabel(trip)}</span>
      </span>
      {trip.travel_place && <span className="viajes-overview-place">{trip.travel_place}</span>}
      <span className="viajes-overview-counts">
        <span>{reservations} reserva{reservations === 1 ? "" : "s"}</span>
        <span>{itinerary} en itinerario</span>
        <span>{experiences} experiencia{experiences === 1 ? "" : "s"}</span>
        {pending > 0 && <span>{pending} pendiente{pending === 1 ? "" : "s"}</span>}
      </span>
      <span className="viajes-overview-open">Abrir ficha completa →</span>
    </button>
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
  const [selectedId, setSelectedId] = useState(null);
  const activeTrip = trips.find((trip) => trip.id === selectedId) || null;

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

  if (activeTrip) {
    return (
      <div className="viajes-board">
        <div className="viajes-back-row">
          <button
            type="button"
            className="link"
            onClick={() => {
              setSelectedId(null);
              setEditing(null);
            }}
          >
            ← Todos los viajes
          </button>
        </div>
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
      </div>
    );
  }

  return (
    <div className="viajes-board">
      <div className="viajes-head-row">
        <h2 className="viajes-overview-title">Mis viajes</h2>
        <AddTripForm createTrip={createTrip} onCreated={handleCreated} setError={setError} />
      </div>
      <div className="viajes-overview-grid">
        {trips.map((trip) => (
          <TripOverviewCard key={trip.id} trip={trip} items={items} onOpen={() => setSelectedId(trip.id)} />
        ))}
      </div>
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
  );
}
