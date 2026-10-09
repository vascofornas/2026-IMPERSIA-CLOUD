import { useState } from "react";
import { Icon } from "./icons.jsx";
import {
  groupLogsByWeek,
  habitLogsInMonth,
  habitKindLabel,
  logWhenLabel,
  monthLabel,
  registroPeriodSummary,
  shiftMonth,
  sleepHoursFromLog,
  sleepLogDisplay,
  sleepLogs,
} from "./habitos.js";
import RegistroMeasureCharts from "./RegistroMeasureCharts.jsx";

function sleepQualityClass(hours) {
  if (hours == null) return "";
  if (hours >= 7) return "good";
  if (hours >= 6) return "ok";
  return "low";
}

function RegistroMonthBar({ year, month, onPrev, onNext }) {
  const now = new Date();
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  return (
    <div className="habitos-registro-month" aria-label="Periodo del registro">
      <button type="button" className="secondary habitos-registro-month-btn" onClick={onPrev} aria-label="Mes anterior">
        ←
      </button>
      <p className="habitos-registro-month-label">
        {monthLabel(year, month)}
        {isCurrent && <span className="private habitos-registro-month-now"> · mes en curso</span>}
      </p>
      <button
        type="button"
        className="secondary habitos-registro-month-btn"
        onClick={onNext}
        disabled={isCurrent}
        aria-label="Mes siguiente"
      >
        →
      </button>
    </div>
  );
}

export function SleepLogCard({ item, compact, onEdit, onRemove, editingId }) {
  const { hours, note } = sleepLogDisplay(item);
  const displayHours = hours ?? sleepHoursFromLog(item);
  const when = logWhenLabel(item.created_at);

  return (
    <article
      className={[
        "habitos-sleep-card",
        compact ? "compact" : "",
        sleepQualityClass(displayHours),
        editingId === item.id ? "editing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="habitos-sleep-head">
        <p className="habitos-sleep-kicker">Sueño</p>
        <time className="habitos-sleep-when" dateTime={item.created_at}>
          {when}
        </time>
      </header>
      {displayHours != null ? (
        <p className="habitos-sleep-hours" aria-label={`${displayHours} horas`}>
          <span className="habitos-sleep-hours-num">
            {Number.isInteger(displayHours) ? displayHours : displayHours.toString().replace(".", ",")}
          </span>
          <span className="habitos-sleep-hours-unit">h</span>
        </p>
      ) : (
        <p className="habitos-sleep-fallback">{item.title}</p>
      )}
      {note && <p className="habitos-sleep-note">{note}</p>}
      {(onEdit || onRemove) && !compact && (
        <footer className="habitos-sleep-foot">
          {onEdit && (
            <button type="button" className="link" onClick={() => onEdit(item)}>
              <Icon name="editar" /> Cambiar
            </button>
          )}
          {onRemove && (
            <button type="button" className="link danger" onClick={() => onRemove(item)}>
              <Icon name="borrar" /> Borrar
            </button>
          )}
        </footer>
      )}
    </article>
  );
}

function HealthLogRow({ item, onEdit, onRemove, editingId }) {
  return (
    <li className={["habitos-health-row", editingId === item.id ? "editing" : ""].filter(Boolean).join(" ")}>
      <span className="habitos-health-kind">{habitKindLabel(item.habit_kind)}</span>
      <div className="habitos-health-body">
        <p className="habitos-health-title">{item.title}</p>
        {item.habit_notes && item.habit_notes !== item.title && (
          <p className="private habitos-health-notes">{item.habit_notes}</p>
        )}
      </div>
      <time className="private habitos-health-when">{logWhenLabel(item.created_at)}</time>
      {(onEdit || onRemove) && (
        <span className="habitos-health-actions">
          {onEdit && (
            <button type="button" className="link" onClick={() => onEdit(item)}>
              <Icon name="editar" /> Cambiar
            </button>
          )}
          {onRemove && (
            <button type="button" className="link danger" onClick={() => onRemove(item)}>
              <Icon name="borrar" /> Borrar
            </button>
          )}
        </span>
      )}
    </li>
  );
}

function WeekBlock({ label, children }) {
  return (
    <div className="habitos-registro-week">
      <h4 className="habitos-registro-week-label">{label}</h4>
      {children}
    </div>
  );
}

export default function HabitRegistro({ items, startEdit, askRemove, editingId }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const sleeps = habitLogsInMonth(items, cursor.year, cursor.month, "sueno");
  const health = habitLogsInMonth(items, cursor.year, cursor.month, "health");
  const summary = registroPeriodSummary(sleeps, health);
  const sleepWeeks = groupLogsByWeek(sleeps);
  const healthWeeks = groupLogsByWeek(health);
  const monthName = monthLabel(cursor.year, cursor.month);

  function goPrev() {
    setCursor(shiftMonth(cursor.year, cursor.month, -1));
  }

  function goNext() {
    const nowInner = new Date();
    const next = shiftMonth(cursor.year, cursor.month, 1);
    if (next.year > nowInner.getFullYear() || (next.year === nowInner.getFullYear() && next.month > nowInner.getMonth())) {
      return;
    }
    setCursor(next);
  }

  return (
    <>
      <RegistroMonthBar year={cursor.year} month={cursor.month} onPrev={goPrev} onNext={goNext} />
      {summary ? (
        <p className="habitos-registro-summary" role="status">
          {summary}
        </p>
      ) : (
        <p className="private habitos-registro-summary habitos-registro-summary-empty">
          Nada apuntado en {monthName}. Escríbelo en Entrada cuando pase.
        </p>
      )}

      <RegistroMeasureCharts items={items} year={cursor.year} month={cursor.month} />

      <section className="habitos-section habitos-section-sleep" aria-labelledby="habitos-sleep-heading">
        <h3 id="habitos-sleep-heading" className="habitos-subheading">
          Sueño
        </h3>
        {sleeps.length > 0 ? (
          sleepWeeks.map((week) => (
            <WeekBlock key={week.label} label={week.label}>
              <div className="habitos-sleep-grid">
                {week.items.map((item) => (
                  <SleepLogCard key={item.id} item={item} onEdit={startEdit} onRemove={askRemove} editingId={editingId} />
                ))}
              </div>
            </WeekBlock>
          ))
        ) : (
          <p className="private habitos-registro-empty">
            En {monthName} no hay sueño registrado. «Anoche dormí 7 horas» en Entrada.
          </p>
        )}
      </section>

      <section className="habitos-section habitos-section-health" aria-labelledby="habitos-health-heading">
        <h3 id="habitos-health-heading" className="habitos-subheading">
          Salud y medicación
        </h3>
        <p className="private habitos-registro-health-lead">
          Síntomas y notas sueltas (resfriado, dolor…). Si usas un control programado, las lecturas también aparecen aquí.
          Cuaderno personal; no sustituye al médico.
        </p>
        {health.length > 0 ? (
          healthWeeks.map((week) => (
            <WeekBlock key={week.label} label={week.label}>
              <ul className="habitos-health-list">
                {week.items.map((item) => (
                  <HealthLogRow key={item.id} item={item} onEdit={startEdit} onRemove={askRemove} editingId={editingId} />
                ))}
              </ul>
            </WeekBlock>
          ))
        ) : (
          <p className="private habitos-registro-empty">
            En {monthName} no hay salud registrada. Peso, tensión o síntomas en Entrada.
          </p>
        )}
      </section>
    </>
  );
}

export function HoySleepSnippet({ items }) {
  const latest = sleepLogs(items, 1)[0];
  if (!latest) return null;
  return (
    <div className="hoy-sleep-snippet">
      <SleepLogCard item={latest} compact />
    </div>
  );
}
