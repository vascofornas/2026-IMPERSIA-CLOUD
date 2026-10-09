import {
  CELEBRATION_FOR,
  FAMILY_KIND,
  LEISURE_KIND,
  LEISURE_WITH,
  REMINDER_KIND,
  MEDICAL_FOR,
} from "./agenda.js";
import { CASA_KIND, SUPPLY_KIND } from "./casa.js";
import { isHabitRoutine } from "./habitos.js";
import {
  ALERT_OPTIONS,
  alertValue,
  allowsAlertMinutes,
  datePart,
  dayLabel,
  parseAlert,
  timePart,
  withWhen,
} from "./itemEditHelpers.js";
import RepeatEditFields from "./RepeatEditFields.jsx";
import { taskRepeatEditorState } from "./repeats.js";
import { AXES } from "./structure.js";

export default function ItemEditForm({ editing, setEditing, saveEdit, onCancel, showRepeat = true }) {
  return (
    <>
      {editing.editScope === "one" && (
        <p className="private">Solo cambias {dayLabel(editing.starts_at)}. El resto de la serie no se mueve.</p>
      )}
              <label>
                Módulo
                <select value={editing.module} onChange={(e) => setEditing({ ...editing, module: e.target.value })}>
                  {AXES.map((axis) => (
                    <optgroup key={axis.id} label={axis.name}>
                      {axis.modules.map((mod) => (
                        <option key={mod.id} value={mod.id}>{mod.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                Título
                <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </label>
              <label>
                Día
                <input
                  type="date"
                  value={datePart(editing.starts_at)}
                  disabled={editing.editScope === "one"}
                  onChange={(e) => setEditing(withWhen(editing, e.target.value, timePart(editing)))}
                />
              </label>
              <label>
                Hora
                <input
                  type="time"
                  value={editing.time_known ? timePart(editing) : ""}
                  onChange={(e) => setEditing(withWhen(editing, datePart(editing.starts_at), e.target.value))}
                />
              </label>
      {showRepeat && editing.editScope !== "one" && !isHabitRoutine(editing) && (
                  <RepeatEditFields
                    preset={editing.repeatPreset ?? taskRepeatEditorState(editing.repeats).preset}
                    weekDays={editing.repeatWeekDays ?? taskRepeatEditorState(editing.repeats).weekDays}
                    onPresetChange={(repeatPreset) => setEditing({ ...editing, repeatPreset })}
                    onWeekDaysChange={(repeatWeekDays) => setEditing({ ...editing, repeatWeekDays, repeatPreset: "weekly_days" })}
                  />
                )}
              {allowsAlertMinutes(editing) && editing.editScope !== "one" && (
                <label>
                  Aviso
                  <select
                    value={alertValue(editing)}
                    onChange={(e) => setEditing({ ...editing, alert_minutes_before: parseAlert(e.target.value) })}
                  >
                    {ALERT_OPTIONS.map((option) => (
                      <option key={option.value || "none"} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {editing.module === "agenda" && editing.editScope !== "one" && (
                <>
                  <label>
                    Tipo en Agenda
                    <select
                      value={editing.agenda_type || ""}
                      onChange={(e) => {
                        const agenda_type = e.target.value || null;
                        setEditing({
                          ...editing,
                          agenda_type,
                          medical_for: agenda_type === "medica" ? editing.medical_for || "self" : null,
                          medical_name: agenda_type === "medica" ? editing.medical_name || "" : "",
                          medical_place: agenda_type === "medica" ? editing.medical_place || "" : "",
                          medical_notes: agenda_type === "medica" ? editing.medical_notes || "" : "",
                          family_kind: agenda_type === "familiar" ? editing.family_kind || "cumpleanos" : null,
                          family_for: agenda_type === "familiar" ? editing.family_for || "other" : null,
                          family_name: agenda_type === "familiar" ? editing.family_name || "" : "",
                          family_place: agenda_type === "familiar" ? editing.family_place || "" : "",
                          family_notes: agenda_type === "familiar" ? editing.family_notes || "" : "",
                          leisure_kind: agenda_type === "ocio" ? editing.leisure_kind || "cine" : null,
                          leisure_with: agenda_type === "ocio" ? editing.leisure_with || "solo" : null,
                          leisure_name: agenda_type === "ocio" ? editing.leisure_name || "" : "",
                          leisure_place: agenda_type === "ocio" ? editing.leisure_place || "" : "",
                          leisure_notes: agenda_type === "ocio" ? editing.leisure_notes || "" : "",
                          reminder_kind: agenda_type === "recordatorio" ? editing.reminder_kind || "itv" : null,
                          reminder_place: agenda_type === "recordatorio" ? editing.reminder_place || "" : "",
                          reminder_notes: agenda_type === "recordatorio" ? editing.reminder_notes || "" : "",
                        });
                      }}
                    >
                      <option value="">Cita general</option>
                      <option value="medica">Cita médica</option>
                      <option value="familiar">Celebración</option>
                      <option value="ocio">Ocio / plan</option>
                      <option value="recordatorio">Recordatorio</option>
                    </select>
                  </label>
                  {editing.agenda_type === "medica" && (
                    <>
                      <label>
                        Para quién
                        <select
                          value={editing.medical_for || "self"}
                          onChange={(e) => setEditing({ ...editing, medical_for: e.target.value })}
                        >
                          {MEDICAL_FOR.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {editing.medical_for !== "self" && (
                        <label>
                          Nombre
                          <input
                            value={editing.medical_name || ""}
                            placeholder="Luis, Ana…"
                            onChange={(e) => setEditing({ ...editing, medical_name: e.target.value })}
                          />
                        </label>
                      )}
                      <label>
                        Lugar
                        <input
                          value={editing.medical_place || ""}
                          placeholder="Hospital, clínica, consulta…"
                          onChange={(e) => setEditing({ ...editing, medical_place: e.target.value })}
                        />
                      </label>
                      <label>
                        Notas
                        <textarea
                          value={editing.medical_notes || ""}
                          placeholder="Llevar analíticas, ayuno, documentación…"
                          onChange={(e) => setEditing({ ...editing, medical_notes: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {editing.agenda_type === "familiar" && (
                    <>
                      <label>
                        Tipo de evento
                        <select
                          value={editing.family_kind || "otro"}
                          onChange={(e) => setEditing({ ...editing, family_kind: e.target.value })}
                        >
                          {FAMILY_KIND.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        De quién es
                        <select
                          value={editing.family_for || "self"}
                          onChange={(e) => setEditing({ ...editing, family_for: e.target.value })}
                        >
                          {CELEBRATION_FOR.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {editing.family_for !== "self" && (
                        <label>
                          Nombre
                          <input
                            value={editing.family_name || ""}
                            placeholder="Ana, Luis…"
                            onChange={(e) => setEditing({ ...editing, family_name: e.target.value })}
                          />
                        </label>
                      )}
                      <label>
                        Lugar
                        <input
                          value={editing.family_place || ""}
                          placeholder="Casa, restaurante, pueblo…"
                          onChange={(e) => setEditing({ ...editing, family_place: e.target.value })}
                        />
                      </label>
                      <label>
                        Notas
                        <textarea
                          value={editing.family_notes || ""}
                          placeholder="Regalo, quién va, qué llevar…"
                          onChange={(e) => setEditing({ ...editing, family_notes: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {editing.agenda_type === "ocio" && (
                    <>
                      <label>
                        Tipo de plan
                        <select
                          value={editing.leisure_kind || "otro"}
                          onChange={(e) => setEditing({ ...editing, leisure_kind: e.target.value })}
                        >
                          {LEISURE_KIND.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Con quién
                        <select
                          value={editing.leisure_with || "solo"}
                          onChange={(e) => setEditing({ ...editing, leisure_with: e.target.value })}
                        >
                          {LEISURE_WITH.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {(editing.leisure_with === "friends" || editing.leisure_with === "other") && (
                        <label>
                          Nombre
                          <input
                            value={editing.leisure_name || ""}
                            placeholder="Ana, Luis…"
                            onChange={(e) => setEditing({ ...editing, leisure_name: e.target.value })}
                          />
                        </label>
                      )}
                      <label>
                        Lugar
                        <input
                          value={editing.leisure_place || ""}
                          placeholder="Cine, bar, estadio…"
                          onChange={(e) => setEditing({ ...editing, leisure_place: e.target.value })}
                        />
                      </label>
                      <label>
                        Notas
                        <textarea
                          value={editing.leisure_notes || ""}
                          placeholder="Entradas, reserva, qué llevar…"
                          onChange={(e) => setEditing({ ...editing, leisure_notes: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                  {editing.agenda_type === "recordatorio" && (
                    <>
                      <label>
                        Tipo
                        <select
                          value={editing.reminder_kind || "otro"}
                          onChange={(e) => setEditing({ ...editing, reminder_kind: e.target.value })}
                        >
                          {REMINDER_KIND.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Lugar o gestoría
                        <input
                          value={editing.reminder_place || ""}
                          placeholder="ITV, aseguradora, banco…"
                          onChange={(e) => setEditing({ ...editing, reminder_place: e.target.value })}
                        />
                      </label>
                      <label>
                        Notas
                        <textarea
                          value={editing.reminder_notes || ""}
                          placeholder="Documentación, matrícula, referencia…"
                          onChange={(e) => setEditing({ ...editing, reminder_notes: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              {editing.module === "casa" && (
                <>
                  <label>
                    Tipo en Casa
                    <select
                      value={editing.casa_kind || "otro"}
                      onChange={(e) => {
                        const casa_kind = e.target.value;
                        setEditing({
                          ...editing,
                          casa_kind,
                          supply_kind: casa_kind === "suministro" ? editing.supply_kind || "luz" : null,
                        });
                      }}
                    >
                      {CASA_KIND.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  {editing.casa_kind === "suministro" && (
                    <label>
                      Suministro
                      <select
                        value={editing.supply_kind || "otro"}
                        onChange={(e) => setEditing({ ...editing, supply_kind: e.target.value })}
                      >
                        {SUPPLY_KIND.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Dónde
                    <input
                      value={editing.casa_place || ""}
                      placeholder={editing.casa_kind === "inventario" ? "Despensa, garaje…" : editing.casa_kind === "suministro" ? "Iberdrola, compañía…" : "Mercadona, cocina…"}
                      onChange={(e) => setEditing({ ...editing, casa_place: e.target.value })}
                    />
                  </label>
                  <label>
                    Notas
                    <textarea
                      value={editing.casa_notes || ""}
                      placeholder={editing.casa_kind === "inventario" ? "Cantidad, referencia…" : "Marca, detalle…"}
                      onChange={(e) => setEditing({ ...editing, casa_notes: e.target.value })}
                    />
                  </label>
                </>
              )}
      <div className="actions">
        <button type="button" onClick={() => saveEdit()}>Guardar cambio</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </>
  );
}
