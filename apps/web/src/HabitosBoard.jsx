import { Icon } from "./icons.jsx";
import { repeatLabel } from "./repeats.js";
import HabitTracker from "./HabitTracker.jsx";
import {
  dayKeyFromDate,
  habitKindLabel,
  isRoutineDoneToday,
  latestSleepLine,
  pickHeroRoutine,
  recentHabitLogs,
  routinesForToday,
} from "./habitos.js";

function RoutineRow({ item, dayKey, onMarkDone, onEdit, onRemove, compact, showSchedule }) {
  const done = isRoutineDoneToday(item, dayKey);
  const schedule = showSchedule ? repeatLabel(item.repeats, item.starts_at) : "";
  return (
    <div className={["habitos-row", done ? "done" : ""].filter(Boolean).join(" ")}>
      {dayKey ? (
        <button
          type="button"
          className="habitos-check"
          aria-label={done ? "Reabrir" : "Marcar hecho"}
          onClick={() => onMarkDone(item, dayKey, done)}
        >
          {done ? "✓" : ""}
        </button>
      ) : (
        <span className="habitos-check habitos-check-static" aria-hidden />
      )}
      <div className="habitos-row-body">
        {item.module === "habitos" && (
          <p className="habitos-row-kind">{habitKindLabel(item.habit_kind)}</p>
        )}
        <p className="title">{item.title}</p>
        {schedule && <p className="when">{schedule}</p>}
        {!compact && item.time_known && item.starts_at && (
          <p className="private">
            {new Date(item.starts_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      {!compact && (
        <span className="habitos-row-actions">
          <button type="button" className="link" onClick={() => onEdit(item)}>
            <Icon name="editar" /> Cambiar
          </button>
          {onRemove && (
            <button type="button" className="link danger" onClick={() => onRemove(item)}>
              <Icon name="borrar" /> Borrar
            </button>
          )}
        </span>
      )}
    </div>
  );
}

export function HoyBienestar({ items, todayStart, expandItems, endOfDay, onMarkDone, onEdit }) {
  const dayKey = dayKeyFromDate(todayStart);
  const routines = routinesForToday(items, todayStart, expandItems, endOfDay);
  const hero = pickHeroRoutine(routines, dayKey);
  const sleep = latestSleepLine(items);
  if (!routines.length && !sleep) return null;

  return (
    <section className="hoy-bienestar">
      <h2>Bienestar</h2>
      {hero && (
        <article className="habitos-hero habitos-hero-compact">
          <p className="habitos-hero-kicker">{habitKindLabel(hero.habit_kind)}</p>
          <p className="habitos-hero-title">{hero.title}</p>
          <button type="button" onClick={() => onMarkDone(hero, dayKey, isRoutineDoneToday(hero, dayKey))}>
            {isRoutineDoneToday(hero, dayKey) ? "Hecho hoy" : "Marcar hecho"}
          </button>
        </article>
      )}
      {routines.length > 1 && (
        <div className="habitos-mini-list">
          {routines
            .filter((item) => !hero || item.id !== hero.id)
            .slice(0, 3)
            .map((item) => (
              <RoutineRow
                key={item.id}
                item={item}
                dayKey={dayKey}
                onMarkDone={onMarkDone}
                onEdit={onEdit}
                compact
              />
            ))}
        </div>
      )}
      {sleep && <p className="private habitos-sleep-line">Sueño: {sleep}</p>}
    </section>
  );
}

export default function HabitosBoard({
  items,
  todayStart,
  expandItems,
  endOfDay,
  onMarkDone,
  startEdit,
  askRemove,
  editingId,
}) {
  const dayKey = dayKeyFromDate(todayStart);
  const routines = routinesForToday(items, todayStart, expandItems, endOfDay);
  const hero = pickHeroRoutine(routines, dayKey);
  const logs = recentHabitLogs(items);
  const openRoutines = items.filter((item) => item.module === "habitos" && item.habit_role !== "log");

  if (!items.some((item) => item.module === "habitos")) {
    return (
      <p className="private">
        Todavía no hay rutinas ni registros aquí. Apúntalo en Entrada: «Cada mañana medito 10 min» o «Anoche dormí 7
        horas».
      </p>
    );
  }

  return (
    <div className="habitos-board">
      {hero && (
        <section className="habitos-hero">
          <p className="habitos-hero-kicker">Siguiente hoy</p>
          <p className="habitos-hero-title">{hero.title}</p>
          <p className="private">{habitKindLabel(hero.habit_kind)}</p>
          <button type="button" onClick={() => onMarkDone(hero, dayKey, isRoutineDoneToday(hero, dayKey))}>
            {isRoutineDoneToday(hero, dayKey) ? "Hecho hoy" : "Marcar hecho"}
          </button>
        </section>
      )}

      {openRoutines.length > 0 && (
        <section className="habitos-section habitos-section-track">
          <h2>Seguimiento</h2>
          <p className="private habitos-section-lead">Últimos 7 días. Verde = hecho el día que tocaba. Gris = ese día no entraba en tu rutina.</p>
          <div className="habitos-track-grid">
            {[...openRoutines]
              .sort((a, b) => a.title.localeCompare(b.title, "es"))
              .map((item) => (
              <HabitTracker
                key={item.id}
                item={item}
                todayStart={todayStart}
                expandItems={expandItems}
                endOfDay={endOfDay}
                onEdit={startEdit}
                onRemove={askRemove}
                onMarkDone={onMarkDone}
                editingId={editingId}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>Registro</h2>
        {!logs.length ? (
          <p className="private">Peso, sueño o tensión: apúntalo en Entrada cuando quieras.</p>
        ) : (
          <ul className="habitos-logs">
            {logs.map((item) => (
              <li key={item.id}>
                <span className="mod m-habitos">{habitKindLabel(item.habit_kind)}</span>
                <span className="title">{item.title}</span>
                {item.habit_notes && <span className="private"> · {item.habit_notes}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}
