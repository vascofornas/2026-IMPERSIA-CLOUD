const WEEKDAY = [
  [1, "Lu"],
  [2, "Ma"],
  [3, "Mi"],
  [4, "Ju"],
  [5, "Vi"],
  [6, "Sá"],
  [0, "Do"],
];

const PRESETS = [
  ["none", "No se repite"],
  ["daily", "Cada día"],
  ["weekly", "Cada semana (día de la fecha)"],
  ["weekly_days", "Días concretos"],
  ["monthly", "Cada mes"],
  ["yearly", "Cada año"],
];

export default function RepeatEditFields({ preset, weekDays, onPresetChange, onWeekDaysChange }) {
  const days = weekDays ?? [];

  function toggleDay(day) {
    const set = new Set(days);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onWeekDaysChange([...set]);
  }

  return (
    <fieldset className="habitos-edit-repeat item-edit-repeat">
      <legend>Repetición</legend>
      <label className="item-edit-repeat-select">
        Periodicidad
        <select value={preset || "none"} onChange={(e) => onPresetChange(e.target.value)}>
          {PRESETS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {preset === "weekly_days" && (
        <div className="habitos-edit-days" role="group" aria-label="Días de la semana">
          {WEEKDAY.map(([day, label]) => (
            <button
              key={day}
              type="button"
              className={days.includes(day) ? "on" : ""}
              aria-pressed={days.includes(day)}
              onClick={() => toggleDay(day)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
