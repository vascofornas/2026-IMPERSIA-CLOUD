import { useState } from "react";
import {
  CONTROL_DEFAULT_TITLE,
  CONTROL_KIND_OPTIONS,
  controlKindLabel,
  controlScheduleLabel,
  pendingControls,
} from "./healthControls.js";

function ReadingForm({ control, registerReading, onSaved, onError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [mg, setMg] = useState("");
  const [kg, setKg] = useState("");
  const [hours, setHours] = useState("");
  const [sleepNote, setSleepNote] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    onError("");
    try {
      let body = {};
      if (control.kind === "presion") {
        body = { systolic: Number(sys), diastolic: Number(dia) };
      } else if (control.kind === "glucosa") {
        body = { mg_dl: Number(mg) };
      } else if (control.kind === "peso") {
        body = { kg: Number(String(kg).replace(",", ".")) };
      } else if (control.kind === "medicacion") {
        body = { taken: true };
      } else if (control.kind === "sueno") {
        body = {
          hours: Number(String(hours).replace(",", ".")),
          note: sleepNote.trim() || null,
        };
      }
      const item = await registerReading(control.id, body);
      onSaved(item, control.id);
      setOpen(false);
      setSys("");
      setDia("");
      setMg("");
      setKg("");
      setHours("");
      setSleepNote("");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="primary habitos-control-register" onClick={() => setOpen(true)}>
        Registrar ahora
      </button>
    );
  }

  return (
    <form className="habitos-control-form" onSubmit={submit}>
      {control.kind === "presion" && (
        <div className="habitos-control-fields">
          <label>
            Sistólica
            <input type="number" inputMode="numeric" required value={sys} onChange={(e) => setSys(e.target.value)} />
          </label>
          <label>
            Diastólica
            <input type="number" inputMode="numeric" required value={dia} onChange={(e) => setDia(e.target.value)} />
          </label>
        </div>
      )}
      {control.kind === "glucosa" && (
        <label>
          mg/dL
          <input type="number" inputMode="numeric" required value={mg} onChange={(e) => setMg(e.target.value)} />
        </label>
      )}
      {control.kind === "peso" && (
        <label>
          Peso (kg)
          <input type="text" inputMode="decimal" required value={kg} onChange={(e) => setKg(e.target.value)} />
        </label>
      )}
      {control.kind === "medicacion" && (
        <p className="private habitos-control-med-hint">Confirma que ya tomaste la dosis de hoy.</p>
      )}
      {control.kind === "sueno" && (
        <>
          <label>
            Horas dormidas
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="7 o 7,5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </label>
          <label>
            Nota (opcional)
            <input type="text" value={sleepNote} onChange={(e) => setSleepNote(e.target.value)} placeholder="Me desperté una vez" />
          </label>
        </>
      )}
      <div className="habitos-control-form-actions">
        <button type="submit" className="primary" disabled={busy}>
          Guardar
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ControlCard({ control, registerReading, onSaved, onError }) {
  const kind = controlKindLabel(control.kind);
  const done = control.done_today;
  return (
    <article className={["habitos-control-card", done ? "done" : "pending"].join(" ")}>
      <header className="habitos-control-head">
        <p className="habitos-control-kind">{kind}</p>
        <h4 className="habitos-control-title">{control.title}</h4>
        <p className="private habitos-control-when">{controlScheduleLabel(control)}</p>
      </header>
      {done ? (
        <p className="habitos-control-done-msg" role="status">
          Hecho hoy. Mañana volverá a salir aquí.
        </p>
      ) : (
        <ReadingForm control={control} registerReading={registerReading} onSaved={onSaved} onError={onError} />
      )}
    </article>
  );
}

function AddControlForm({ createControl, onCreated, setError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("presion");
  const [repeats, setRepeats] = useState("daily");
  const [reminderTime, setReminderTime] = useState("08:00");
  const [title, setTitle] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const control = await createControl({
        kind,
        repeats,
        reminder_time: reminderTime,
        title: title.trim() || CONTROL_DEFAULT_TITLE[kind],
      });
      onCreated(control);
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
      <button type="button" className="secondary habitos-control-add-btn" onClick={() => setOpen(true)}>
        + Añadir control
      </button>
    );
  }

  return (
    <form className="habitos-control-add card editor" onSubmit={submit}>
      <h4 className="habitos-control-add-title">Nuevo control de salud</h4>
      <label>
        Qué quieres controlar
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          {CONTROL_KIND_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nombre (opcional)
        <input
          type="text"
          value={title}
          placeholder={CONTROL_DEFAULT_TITLE[kind]}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Frecuencia
        <select value={repeats} onChange={(e) => setRepeats(e.target.value)}>
          <option value="daily">Cada día</option>
          <option value="weekly">Cada domingo (peso u otro)</option>
        </select>
      </label>
      <label>
        Hora habitual
        <input type="time" required value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
      </label>
      <div className="habitos-control-form-actions">
        <button type="submit" className="primary" disabled={busy}>
          Crear control
        </button>
        <button type="button" className="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function HealthControlsGuide({ compact }) {
  if (compact) {
    return (
      <p className="private habitos-controls-guide-compact">
        Añade un control, elige hora y frecuencia. Cada día pulsa <strong>Registrar ahora</strong> (también en Hoy).
      </p>
    );
  }
  return (
    <div className="habitos-controls-guide">
      <p className="habitos-controls-guide-lead">
        <strong>Cómo funciona</strong>
      </p>
      <ol className="habitos-controls-steps">
        <li>
          Pulsa <strong>Añadir control</strong>, elige tipo (tensión, glucosa, peso, sueño o medicación), frecuencia y hora.
        </li>
        <li>
          <strong>Cada día</strong> (o cada domingo, si lo elegiste) usa <em>Registrar ahora</em> aquí o en <strong>Hoy</strong>.
        </li>
        <li>El historial del mes está en <strong>Registro</strong>, a la izquierda.</li>
      </ol>
      <p className="private habitos-controls-disclaimer">Cuaderno personal. No sustituye al médico.</p>
    </div>
  );
}

export default function HealthControlsPanel({
  controls,
  createControl,
  registerReading,
  onControlCreated,
  onReadingSaved,
  setError,
  compact,
  aside,
}) {
  const list = compact ? pendingControls(controls) : controls || [];
  if (!list.length && compact) return null;

  function handleSaved(item, controlId) {
    onReadingSaved(item, controlId);
  }

  return (
    <section
      className={["habitos-section habitos-section-controls", aside ? "habitos-section-controls-aside" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="habitos-controls-heading"
    >
      <div className="habitos-controls-head-row">
        <h2 id="habitos-controls-heading" className={aside ? "habitos-controls-aside-title" : "habitos-subheading"}>
          Controles de salud
        </h2>
        {!compact && <AddControlForm createControl={createControl} onCreated={onControlCreated} setError={setError} />}
      </div>
      {!compact && <HealthControlsGuide compact={aside} />}
      {!list.length ? (
        <p className="private habitos-registro-empty">
          Todavía no tienes controles. Pulsa <strong>Añadir control</strong> arriba.
        </p>
      ) : (
        <div className="habitos-control-grid">
          {list.map((control) => (
            <ControlCard
              key={control.id}
              control={control}
              registerReading={registerReading}
              onSaved={handleSaved}
              onError={setError}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function HoyHealthControls({ controls, registerReading, onReadingSaved, setError }) {
  const pending = pendingControls(controls);
  if (!pending.length) return null;
  return (
    <div className="hoy-health-controls">
      <p className="hoy-health-controls-lead">Controles de hoy</p>
      <div className="habitos-control-grid habitos-control-grid-compact">
        {pending.map((control) => (
          <ControlCard
            key={control.id}
            control={control}
            registerReading={registerReading}
            onSaved={onReadingSaved}
            onError={setError}
          />
        ))}
      </div>
    </div>
  );
}
