import HabitTracker from "./HabitTracker.jsx";
import {
  habitKindLabel,
  isHabitRoutine,
  latestSleepLine,
  recentHabitLogs,
} from "./habitos.js";

function openHabitRoutines(items) {
  return items
    .filter((item) => isHabitRoutine(item))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export function HoyBienestar({
  items,
  todayStart,
  expandItems,
  endOfDay,
  onMarkDone,
  onEdit,
  askRemove,
  editingId,
}) {
  const routines = openHabitRoutines(items);
  const sleep = latestSleepLine(items);
  if (!routines.length && !sleep) return null;

  return (
    <section className="hoy-bienestar">
      <h2>Bienestar</h2>
      {routines.length > 0 && (
        <div className="habitos-track-grid habitos-track-grid-compact">
          {routines.map((item) => (
            <HabitTracker
              key={item.id}
              item={item}
              todayStart={todayStart}
              expandItems={expandItems}
              endOfDay={endOfDay}
              onEdit={onEdit}
              onRemove={askRemove}
              onMarkDone={onMarkDone}
              editingId={editingId}
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
  const logs = recentHabitLogs(items);
  const openRoutines = openHabitRoutines(items);

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
      {openRoutines.length > 0 && (
        <section className="habitos-section habitos-section-track">
          <h2>Seguimiento</h2>
          <p className="private habitos-section-lead">
            Misma vista que en Hoy. Verde = hecho el día que tocaba. La franja gris = ese día no entra en tu rutina (p. ej.
            remo solo martes y jueves; pasos cada día).
          </p>
          <div className="habitos-track-grid">
            {openRoutines.map((item) => (
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
