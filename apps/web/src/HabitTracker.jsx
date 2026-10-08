import { Icon } from "./icons.jsx";
import { habitKindLabel, trackingWeek } from "./habitos.js";
import { repeatLabel } from "./repeats.js";

function cellState(day) {
  if (!day.due) return "off";
  if (day.done) return "done";
  if (day.isToday) return "today";
  return "miss";
}

export default function HabitTracker({ item, todayStart, expandItems, endOfDay, onEdit, onRemove }) {
  const { days, dueCount, doneCount } = trackingWeek(item, todayStart, expandItems, endOfDay);
  const schedule = repeatLabel(item.repeats, item.starts_at);
  const kind = habitKindLabel(item.habit_kind);

  return (
    <article className="habitos-track-card">
      <header className="habitos-track-head">
        <div>
          <p className="habitos-track-kind">{kind}</p>
          <p className="habitos-track-title">{item.title}</p>
          {schedule && <p className="habitos-track-schedule">{schedule}</p>}
        </div>
        <div className="habitos-track-score" aria-label={`${doneCount} de ${dueCount} días cumplidos esta semana`}>
          <span className="habitos-track-score-num">
            {doneCount}/{dueCount || "—"}
          </span>
          <span className="private">esta semana</span>
        </div>
      </header>
      <div className="habitos-track-table" role="img" aria-label={`Seguimiento de ${item.title}`}>
        <div className="habitos-track-row habitos-track-labels">
          {days.map((day) => (
            <span key={`${day.key}-l`} className={day.isToday ? "today" : ""}>
              {day.label}
            </span>
          ))}
        </div>
        <div className="habitos-track-row habitos-track-cells">
          {days.map((day) => (
            <span
              key={day.key}
              className={["habitos-track-cell", cellState(day), day.isToday ? "is-today" : ""].filter(Boolean).join(" ")}
              title={
                !day.due
                  ? `${day.key}: no tocaba`
                  : day.done
                    ? `${day.key}: hecho`
                    : `${day.key}: pendiente`
              }
              aria-hidden={!day.due}
            >
              {!day.due ? "" : day.done ? "✓" : day.isToday ? "·" : ""}
            </span>
          ))}
        </div>
      </div>
      {(onEdit || onRemove) && (
        <footer className="habitos-track-foot">
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
