import HabitRegistro, { HoySleepSnippet } from "./HabitRegistro.jsx";
import HealthControlsPanel, { HoyHealthControls } from "./HealthControlsPanel.jsx";
import HabitTracker from "./HabitTracker.jsx";
import { isHabitRoutine, latestSleepLog, routinesForToday } from "./habitos.js";

function openHabitRoutines(items) {
  return items
    .filter((item) => isHabitRoutine(item))
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export function HoyBienestar({
  items,
  healthControls,
  registerReading,
  onHealthReadingSaved,
  setError,
  todayStart,
  expandItems,
  endOfDay,
  onMarkDone,
  onEdit,
  askRemove,
  editingId,
}) {
  const dueToday = routinesForToday(items, todayStart, expandItems, endOfDay);
  const sleep = latestSleepLog(items);
  const hasRoutines = items.some(isHabitRoutine);
  const hasControls = (healthControls?.length || 0) > 0;
  if (!dueToday.length && !sleep && !hasRoutines && !hasControls) return null;

  return (
    <div className="hoy-bienestar">
      <div className="hoy-zone-head">
        <h2 id="hoy-bienestar-heading">Bienestar</h2>
        <a className="hoy-zone-link" href="#habitos">
          Ver todo
        </a>
      </div>
      {dueToday.length > 0 ? (
        <div className="habitos-track-grid habitos-track-grid-compact">
          {dueToday.map((item) => (
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
              hoyFocus
            />
          ))}
        </div>
      ) : hasRoutines ? (
        <p className="hoy-empty hoy-empty-inline">Hoy no toca ninguna rutina guardada.</p>
      ) : null}
      {sleep && <HoySleepSnippet items={items} />}
      <HoyHealthControls
        controls={healthControls}
        registerReading={registerReading}
        onReadingSaved={onHealthReadingSaved}
        setError={setError}
      />
    </div>
  );
}

export default function HabitosBoard({
  items,
  healthControls,
  createControl,
  registerReading,
  onControlCreated,
  onHealthReadingSaved,
  setError,
  todayStart,
  expandItems,
  endOfDay,
  onMarkDone,
  startEdit,
  askRemove,
  editingId,
}) {
  const openRoutines = openHabitRoutines(items);

  if (!items.some((item) => item.module === "habitos") && !(healthControls?.length > 0)) {
    return (
      <p className="private">
        Todavía no hay rutinas ni registros aquí. En Entrada: «Cada mañana medito 10 min» o «Anoche dormí 7 horas». Los
        controles de salud se añaden con <strong>Añadir control</strong> en esta pantalla.
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

      <HealthControlsPanel
        controls={healthControls}
        createControl={createControl}
        registerReading={registerReading}
        onControlCreated={onControlCreated}
        onReadingSaved={onHealthReadingSaved}
        setError={setError}
      />

      <section className="habitos-section habitos-section-registro">
        <h2>Registro</h2>
        <HabitRegistro items={items} startEdit={startEdit} askRemove={askRemove} editingId={editingId} />
      </section>
    </div>
  );
}
