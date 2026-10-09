import HabitRegistro, { HoySleepSnippet } from "./HabitRegistro.jsx";
import HabitTracker from "./HabitTracker.jsx";
import { isHabitRoutine, latestSleepLog } from "./habitos.js";

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
  const sleep = latestSleepLog(items);
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
      {sleep && <HoySleepSnippet items={items} />}
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

      <section className="habitos-section habitos-section-registro">
        <h2>Registro</h2>
        <HabitRegistro items={items} startEdit={startEdit} askRemove={askRemove} />
      </section>
    </div>
  );
}
