import { parseWeeklyDays } from "./repeats.js";

const HABIT_KINDS = [
  ["ejercicio", "Ejercicio"],
  ["rutina", "Rutina"],
  ["meditacion", "Meditación"],
  ["lectura", "Lectura"],
  ["otro", "Bienestar"],
];

const WEEKDAY = [
  [1, "Lu"],
  [2, "Ma"],
  [3, "Mi"],
  [4, "Ju"],
  [5, "Vi"],
  [6, "Sá"],
  [0, "Do"],
];

export function repeatsFromEditor(mode, weekDays) {
  if (mode === "daily") return "daily";
  const days = [...weekDays].sort((a, b) => a - b);
  if (!days.length) return "daily";
  return `weekly:${days.join(",")}`;
}

export function editorFromRepeats(repeats) {
  if (repeats === "daily" || !repeats) {
    return { mode: "daily", weekDays: [] };
  }
  const parsed = parseWeeklyDays(repeats);
  if (parsed?.length) {
    return { mode: "weekly", weekDays: parsed };
  }
  return { mode: "daily", weekDays: [] };
}

export default function HabitEditPanel({ editing, setEditing, onSave, onCancel }) {
  if (!editing || editing.module !== "habitos") return null;

  const mode = editing.habitRepeatMode || editorFromRepeats(editing.repeats).mode;
  const weekDays = editing.habitWeekDays ?? editorFromRepeats(editing.repeats).weekDays;

  function toggleDay(day) {
    const set = new Set(weekDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    setEditing({ ...editing, habitWeekDays: [...set], habitRepeatMode: "weekly" });
  }

  return (
    <article className="habitos-edit-panel card editor">
      <h3>Cambiar hábito</h3>
      <label>
        Título
        <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
      </label>
      <label>
        Tipo
        <select
          value={editing.habit_kind || "ejercicio"}
          onChange={(e) => setEditing({ ...editing, habit_kind: e.target.value, habit_role: "routine" })}
        >
          {HABIT_KINDS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="habitos-edit-repeat">
        <legend>Repetición</legend>
        <label className="habitos-edit-radio">
          <input
            type="radio"
            name="habit-repeat"
            checked={mode === "daily"}
            onChange={() => setEditing({ ...editing, habitRepeatMode: "daily" })}
          />
          Cada día
        </label>
        <label className="habitos-edit-radio">
          <input
            type="radio"
            name="habit-repeat"
            checked={mode === "weekly"}
            onChange={() => setEditing({ ...editing, habitRepeatMode: "weekly", habitWeekDays: weekDays.length ? weekDays : [1, 3, 5] })}
          />
          Días concretos
        </label>
        {mode === "weekly" && (
          <div className="habitos-edit-days" role="group" aria-label="Días de la semana">
            {WEEKDAY.map(([day, label]) => (
              <button
                key={day}
                type="button"
                className={weekDays.includes(day) ? "on" : ""}
                aria-pressed={weekDays.includes(day)}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </fieldset>
      <label>
        Notas <span className="private">(opcional)</span>
        <input
          value={editing.habit_notes || ""}
          placeholder="Meta, material, recordatorio…"
          onChange={(e) => setEditing({ ...editing, habit_notes: e.target.value })}
        />
      </label>
      <div className="actions">
        <button
          type="button"
          onClick={() =>
            onSave({
              repeats: repeatsFromEditor(mode, weekDays),
              habit_role: "routine",
              habit_kind: editing.habit_kind || "ejercicio",
              habit_notes: (editing.habit_notes || "").trim() || null,
            })
          }
        >
          Guardar
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </article>
  );
}
