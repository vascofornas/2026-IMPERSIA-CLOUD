import { useState } from "react";
import {
  BOOKING_STATUS_OPTIONS,
  CURRENCY_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  TRAVEL_ROLE_OPTIONS,
  TRAVEL_SUBTYPES,
} from "./travel.js";

const DETAIL_FIELDS = [
  "travel_subtype",
  "travel_starts_at",
  "travel_ends_at",
  "travel_provider",
  "travel_reference",
  "travel_address",
  "travel_contact_name",
  "travel_contact_phone",
  "travel_contact_email",
  "travel_booking_status",
  "travel_amount",
  "travel_currency",
  "travel_payment_status",
  "travel_quantity",
  "travel_url",
  "travel_notes",
];

function localDateTime(value) {
  return typeof value === "string" ? value.slice(0, 16) : "";
}

function initialDraft(role, initial) {
  const draft = {
    travel_role: role,
    title: "",
    ...initial,
  };
  return {
    ...draft,
    travel_subtype: initial?.travel_subtype || TRAVEL_SUBTYPES[role]?.[0]?.[0] || "otro",
    travel_booking_status: initial?.travel_booking_status || (["reserva", "experiencia"].includes(role) ? "pending" : ""),
    travel_payment_status: initial?.travel_payment_status || (["reserva", "plan", "experiencia"].includes(role) ? "pending" : ""),
    travel_currency: initial?.travel_currency || "EUR",
    travel_quantity: initial?.travel_quantity || (role === "equipaje" ? 1 : ""),
    travel_address: initial?.travel_address || initial?.travel_place || "",
    travel_starts_at: localDateTime(initial?.travel_starts_at),
    travel_ends_at: localDateTime(initial?.travel_ends_at),
  };
}

function cleanPayload(draft) {
  const payload = {
    travel_role: draft.travel_role,
    title: draft.title.trim(),
  };
  for (const field of DETAIL_FIELDS) {
    let value = draft[field];
    if (typeof value === "string") value = value.trim();
    payload[field] = value === "" ? null : value;
  }
  if (payload.travel_amount !== null) payload.travel_amount = Number(payload.travel_amount);
  if (payload.travel_quantity !== null) payload.travel_quantity = Number(payload.travel_quantity);
  return payload;
}

export default function TravelDetailForm({
  role,
  initial = {},
  allowRoleChange = false,
  busy = false,
  submitLabel = "Guardar",
  onSubmit,
  onCancel,
}) {
  const [draft, setDraft] = useState(() => initialDraft(role, initial));
  const activeRole = draft.travel_role;
  const hasSchedule = ["reserva", "plan", "experiencia"].includes(activeRole);
  const hasBooking = ["reserva", "experiencia"].includes(activeRole);
  const hasProvider = ["reserva", "experiencia"].includes(activeRole);
  const hasMoney = ["reserva", "plan", "experiencia"].includes(activeRole);
  const hasContact = ["reserva", "experiencia"].includes(activeRole);
  const hasAddress = activeRole !== "equipaje";
  const hasLink = activeRole !== "equipaje";

  function set(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function changeRole(nextRole) {
    setDraft((current) => ({
      ...current,
      travel_role: nextRole,
      travel_subtype: TRAVEL_SUBTYPES[nextRole]?.[0]?.[0] || "otro",
      travel_quantity: nextRole === "equipaje" ? current.travel_quantity || 1 : "",
      travel_booking_status: ["reserva", "experiencia"].includes(nextRole) ? current.travel_booking_status || "pending" : "",
      travel_payment_status: ["reserva", "plan", "experiencia"].includes(nextRole) ? current.travel_payment_status || "pending" : "",
    }));
  }

  function submit(e) {
    e.preventDefault();
    onSubmit(cleanPayload(draft));
  }

  return (
    <form className="travel-detail-form" onSubmit={submit}>
      <div className="travel-form-grid">
        {allowRoleChange && (
          <label>
            Apartado
            <select value={activeRole} onChange={(e) => changeRole(e.target.value)}>
              {TRAVEL_ROLE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="travel-field-wide">
          Título
          <input required autoFocus value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </label>
        <label>
          Tipo
          <select value={draft.travel_subtype || "otro"} onChange={(e) => set("travel_subtype", e.target.value)}>
            {(TRAVEL_SUBTYPES[activeRole] || []).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        {activeRole === "equipaje" && (
          <label>
            Cantidad
            <input
              type="number"
              min="1"
              max="999"
              value={draft.travel_quantity ?? ""}
              onChange={(e) => set("travel_quantity", e.target.value)}
            />
          </label>
        )}
      </div>

      {hasSchedule && (
        <fieldset>
          <legend>Cuándo</legend>
          <div className="travel-form-grid">
            <label>
              Inicio
              <input type="datetime-local" value={draft.travel_starts_at || ""} onChange={(e) => set("travel_starts_at", e.target.value)} />
            </label>
            <label>
              Fin
              <input type="datetime-local" value={draft.travel_ends_at || ""} onChange={(e) => set("travel_ends_at", e.target.value)} />
            </label>
          </div>
        </fieldset>
      )}

      {(hasProvider || hasAddress || hasBooking) && (
        <fieldset>
          <legend>Reserva y lugar</legend>
          <div className="travel-form-grid">
            {hasProvider && (
              <label>
                Proveedor
                <input value={draft.travel_provider || ""} placeholder="Hotel, aerolínea, agencia…" onChange={(e) => set("travel_provider", e.target.value)} />
              </label>
            )}
            {hasBooking && (
              <label>
                Localizador
                <input value={draft.travel_reference || ""} onChange={(e) => set("travel_reference", e.target.value)} />
              </label>
            )}
            {hasAddress && (
              <label className="travel-field-wide">
                Lugar o dirección
                <input value={draft.travel_address || ""} onChange={(e) => set("travel_address", e.target.value)} />
              </label>
            )}
            {hasBooking && (
              <label>
                Estado
                <select value={draft.travel_booking_status || "pending"} onChange={(e) => set("travel_booking_status", e.target.value)}>
                  {BOOKING_STATUS_OPTIONS.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </fieldset>
      )}

      {hasMoney && (
        <fieldset>
          <legend>Importe y pago</legend>
          <div className="travel-form-grid travel-money-grid">
            <label>
              Importe
              <input type="number" min="0" step="0.01" value={draft.travel_amount ?? ""} onChange={(e) => set("travel_amount", e.target.value)} />
            </label>
            <label>
              Moneda
              <select value={draft.travel_currency || "EUR"} onChange={(e) => set("travel_currency", e.target.value)}>
                {CURRENCY_OPTIONS.map((currency) => <option key={currency}>{currency}</option>)}
              </select>
            </label>
            <label>
              Pago
              <select value={draft.travel_payment_status || "pending"} onChange={(e) => set("travel_payment_status", e.target.value)}>
                {PAYMENT_STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {hasContact && (
        <fieldset>
          <legend>Contacto</legend>
          <div className="travel-form-grid">
            <label>
              Nombre
              <input value={draft.travel_contact_name || ""} onChange={(e) => set("travel_contact_name", e.target.value)} />
            </label>
            <label>
              Teléfono
              <input type="tel" value={draft.travel_contact_phone || ""} onChange={(e) => set("travel_contact_phone", e.target.value)} />
            </label>
            <label className="travel-field-wide">
              Correo
              <input type="email" value={draft.travel_contact_email || ""} onChange={(e) => set("travel_contact_email", e.target.value)} />
            </label>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend>Información adicional</legend>
        <div className="travel-form-grid">
          {hasLink && (
            <label className="travel-field-wide">
              Enlace a reserva, billete o información
              <input type="url" value={draft.travel_url || ""} placeholder="https://…" onChange={(e) => set("travel_url", e.target.value)} />
            </label>
          )}
          <label className="travel-field-wide">
            Notas
            <textarea rows="3" value={draft.travel_notes || ""} onChange={(e) => set("travel_notes", e.target.value)} />
          </label>
        </div>
      </fieldset>

      <div className="viajes-form-actions">
        <button type="submit" className="primary" disabled={busy}>{submitLabel}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
      </div>
    </form>
  );
}
