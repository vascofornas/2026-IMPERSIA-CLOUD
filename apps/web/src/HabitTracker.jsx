import { Icon } from "./icons.jsx";
import { habitKindLabel, trackingWeek } from "./habitos.js";
import { repeatLabel } from "./repeats.js";

function cellState(day) {
  if (!day.due) return "off";
  if (day.done) return "done";
  if (day.isToday) return "today";
  return "miss";
}

export default function HabitTracker({ item, todayStart, expandItems, endOfDay, onEdit, onRemove, onMarkDone, editingId }) {
  const { days, dueCount, doneCount } = trackingWeek(item, todayStart, expandItems, endOfDay);
  const schedule = repeatLabel(item.repeats, item.starts_at);
  const kind = habitKindLabel(item.habit_kind);

  const today = days.find((d) => d.isToday);

  return (
    <article className={["habitos-track-card", editingId === item.id ? "editing" : ""].filter(Boolean).join(" ")}>
      <header className="habitos-track-head">
        <div>
          <p className="habitos-track-kind">{kind}</p>
          <p className="habitos-track-title">{item.title}</p>
          {(schedule || item.habit_notes) && (
            <p className="habitos-track-schedule">
              {[schedule, item.habit_notes].filter(Boolean).join(" · ")}
            </p>
          )}
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
          {days.map((day) => {
            const state = cellState(day);
            const canToggle = day.isToday && day.due && onMarkDone;
            const Tag = canToggle ? "button" : "span";
            return (
              <Tag
                key={day.key}
                type={canToggle ? "button" : undefined}
                className={["habitos-track-cell", state, day.isToday ? "is-today" : "", canToggle ? "clickable" : ""]
                  .filter(Boolean)
                  .join(" ")}
                title={
                  !day.due
                    ? `${day.key}: no tocaba`
                    : day.done
                      ? `${day.key}: hecho`
                      : day.isToday && onMarkDone
                        ? `${day.key}: pulsa para marcar`
                        : `${day.key}: pendiente`
                }
                aria-hidden={!day.due}
                onClick={canToggle ? () => onMarkDone(item, day.key, day.done) : undefined}
              >
                {!day.due ? "" : day.done ? "✓" : day.isToday ? "·" : ""}
              </Tag>
            );
          })}
        </div>
      </div>
      {today?.due && onMarkDone && (
        <p className="habitos-track-today-hint private">
          {today.done ? "Hecho hoy." : "Hoy toca: pulsa la casilla de hoy o el botón."}
        </p>
      )}
      {(onEdit || onRemove) && (
        <footer className="habitos-track-foot">
          {today?.due && onMarkDone && (
            <button type="button" className="link" onClick={() => onMarkDone(item, today.key, today.done)}>
              {today.done ? "Reabrir hoy" : "Marcar hecho hoy"}
            </button>
          )}
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
