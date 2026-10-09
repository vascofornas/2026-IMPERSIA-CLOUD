import { isHabitRoutine } from "./habitos.js";
import { taskRepeatEditorState } from "./repeats.js";

/** Edición de toda la serie (un solo ítem en cuenta, muchas fechas en pantalla). */
export function isSeriesEdit(editing) {
  if (!editing || editing.editScope !== "all") return false;
  if (isHabitRoutine(editing)) return false;
  const preset = editing.repeatPreset ?? taskRepeatEditorState(editing.repeats).preset;
  return Boolean(editing.repeats) || preset !== "none";
}
