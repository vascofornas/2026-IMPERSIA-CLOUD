import { Icon } from "./icons.jsx";
import {
  habitKindLabel,
  logWhenLabel,
  sleepHoursFromLog,
  sleepLogDisplay,
  sleepLogs,
  recentHabitLogs,
} from "./habitos.js";

function sleepQualityClass(hours) {
  if (hours == null) return "";
  if (hours >= 7) return "good";
  if (hours >= 6) return "ok";
  return "low";
}

export function SleepLogCard({ item, compact, onEdit, onRemove }) {
  const { hours, note } = sleepLogDisplay(item);
  const displayHours = hours ?? sleepHoursFromLog(item);
  const when = logWhenLabel(item.created_at);

  return (
    <article className={["habitos-sleep-card", compact ? "compact" : "", sleepQualityClass(displayHours)]
      .filter(Boolean)
      .join(" ")}>
      <header className="habitos-sleep-head">
        <p className="habitos-sleep-kicker">Sueño</p>
        <time className="habitos-sleep-when" dateTime={item.created_at}>
          {when}
        </time>
      </header>
      {displayHours != null ? (
        <p className="habitos-sleep-hours" aria-label={`${displayHours} horas`}>
          <span className="habitos-sleep-hours-num">{Number.isInteger(displayHours) ? displayHours : displayHours.toString().replace(".", ",")}</span>
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

function HealthLogRow({ item }) {
  return (
    <li className="habitos-health-row">
      <span className="habitos-health-kind">{habitKindLabel(item.habit_kind)}</span>
      <div className="habitos-health-body">
        <p className="habitos-health-title">{item.title}</p>
        {item.habit_notes && item.habit_notes !== item.title && (
          <p className="private habitos-health-notes">{item.habit_notes}</p>
        )}
      </div>
      <time className="private habitos-health-when">{logWhenLabel(item.created_at)}</time>
    </li>
  );
}

export default function HabitRegistro({ items, startEdit, askRemove }) {
  const sleeps = sleepLogs(items);
  const others = recentHabitLogs(items);

  if (!sleeps.length && !others.length) {
    return (
      <p className="private">Peso, sueño o tensión: apúntalo en Entrada cuando quieras.</p>
    );
  }

  return (
    <>
      {sleeps.length > 0 && (
        <section className="habitos-section habitos-section-sleep" aria-labelledby="habitos-sleep-heading">
          <h3 id="habitos-sleep-heading" className="habitos-subheading">
            Sueño
          </h3>
          <div className="habitos-sleep-grid">
            {sleeps.map((item) => (
              <SleepLogCard key={item.id} item={item} onEdit={startEdit} onRemove={askRemove} />
            ))}
          </div>
        </section>
      )}
      {others.length > 0 && (
        <section className="habitos-section habitos-section-health" aria-labelledby="habitos-health-heading">
          <h3 id="habitos-health-heading" className="habitos-subheading">
            Salud y otros
          </h3>
          <ul className="habitos-health-list">
            {others.map((item) => (
              <HealthLogRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
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
