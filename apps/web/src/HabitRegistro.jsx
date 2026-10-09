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

export default function HabitRegistro({ items, startEdit, askRemove, editingId }) {
  const sleeps = sleepLogs(items);
  const others = recentHabitLogs(items);

  return (
    <>
      <section className="habitos-section habitos-section-sleep" aria-labelledby="habitos-sleep-heading">
        <h3 id="habitos-sleep-heading" className="habitos-subheading">
          Sueño
        </h3>
        {sleeps.length > 0 ? (
          <div className="habitos-sleep-grid">
            {sleeps.map((item) => (
              <SleepLogCard key={item.id} item={item} onEdit={startEdit} onRemove={askRemove} editingId={editingId} />
            ))}
          </div>
        ) : (
          <p className="private habitos-registro-empty">
            Anótalo en Entrada: «Anoche dormí 7 horas» o «Me desperté a las 3».
          </p>
        )}
      </section>
      <section className="habitos-section habitos-section-health" aria-labelledby="habitos-health-heading">
        <h3 id="habitos-health-heading" className="habitos-subheading">
          Salud
        </h3>
        {others.length > 0 ? (
          <ul className="habitos-health-list">
            {others.map((item) => (
              <HealthLogRow key={item.id} item={item} onEdit={startEdit} onRemove={askRemove} editingId={editingId} />
            ))}
          </ul>
        ) : (
          <p className="private habitos-registro-empty">
            Peso, tensión u otros datos puntuales: «Peso 72,4» o «Tensión 120/80 esta mañana».
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
