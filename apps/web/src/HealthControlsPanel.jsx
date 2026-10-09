import { useState } from "react";
import { controlKindLabel, controlScheduleLabel, pendingControls } from "./healthControls.js";

function ReadingForm({ control, registerReading, onSaved, onError }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [mg, setMg] = useState("");
  const [kg, setKg] = useState("");

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
      }
      const item = await registerReading(control.id, body);
      onSaved(item, control.id);
      setOpen(false);
      setSys("");
      setDia("");
      setMg("");
      setKg("");
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
      {control.kind === "medicacion" && <p className="private habitos-control-med-hint">Confirma que ya tomaste la dosis de hoy.</p>}
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

export function HealthControlsGuide() {
  return (
    <div className="habitos-controls-guide">
      <p className="habitos-controls-guide-lead">
        <strong>Cómo funciona</strong> (tres pasos)
      </p>
      <ol className="habitos-controls-steps">
        <li>
          <strong>Entrada, una sola vez:</strong> «Quiero controlarme la tensión cada día a las 8», «Quiero revisar mi
          peso cada día a las 8» (o glucosa, medicación).
        </li>
        <li>
          <strong>Cada día, aquí:</strong> cuando toque, pulsa <em>Registrar ahora</em> y pon el dato (o confirma la
          pastilla).
        </li>
        <li>
          <strong>Registro, abajo:</strong> revisa el mes entero. También puedes seguir apuntando en Entrada si prefieres.
        </li>
      </ol>
      <p className="private habitos-controls-disclaimer">Cuaderno personal. No sustituye al médico.</p>
    </div>
  );
}

export default function HealthControlsPanel({ controls, registerReading, onReadingSaved, setError, compact }) {
  const list = compact ? pendingControls(controls) : controls || [];
  if (!list.length && compact) return null;

  function handleSaved(item, controlId) {
    onReadingSaved(item, controlId);
  }

  return (
    <section className="habitos-section habitos-section-controls" aria-labelledby="habitos-controls-heading">
      <h3 id="habitos-controls-heading" className="habitos-subheading">
        Controles de salud
      </h3>
      {!compact && <HealthControlsGuide />}
      {!list.length ? (
        <p className="private habitos-registro-empty">
          Aún no tienes controles. Escríbelo en Entrada con «quiero controlarme…» y aparecerán aquí.
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
