import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMark, Icon } from "./icons.jsx";
import {
  CELEBRATION_FOR,
  FAMILY_KIND,
  familyEventLine,
  familyForLabel,
  isFamilyItem,
  isLeisureItem,
  isMedicalItem,
  isReminderItem,
  LEISURE_KIND,
  LEISURE_WITH,
  leisureEventLine,
  leisureWithLabel,
  REMINDER_KIND,
  reminderEventLine,
  MEDICAL_FOR,
  medicalForLabel,
} from "./agenda.js";
import { CASA_KIND, casaEventLine, groupCasaItems, isCasaItem, SUPPLY_KIND } from "./casa.js";
import HabitEditPanel, { editorFromRepeats, HabitLogEditPanel } from "./HabitEditPanel.jsx";
import HabitosBoard, { HoyBienestar } from "./HabitosBoard.jsx";
import { pendingControls } from "./healthControls.js";
import { hasHoyBienestarContent, isHabitRoutine } from "./habitos.js";
import { ensureAlertWorker, postBrowserNotification } from "./notifications.js";
import { trackScreen } from "./events.js";
import ItemEditForm from "./ItemEditForm.jsx";
import { dayLabel } from "./itemEditHelpers.js";
import { isSeriesEdit } from "./seriesEdit.js";
import {
  collapseRepeatingSeries,
  nextOccurrenceWhenLabel,
  repeatLabel,
  taskRepeatEditorState,
  taskRepeatsFromEditor,
} from "./repeats.js";
import { AXES, findModule, labelOf } from "./structure.js";

const API = "https://api.impersia.cloud";

const LOOKS = [
  { id: "claro", name: "Claro", note: "Gris claro y verde" },
  { id: "papel", name: "Papel", note: "Crema y verde bosque" },
  { id: "mar", name: "Mar", note: "Azul profundo" },
  { id: "cielo", name: "Cielo", note: "Azul claro" },
  { id: "oliva", name: "Oliva", note: "Verde suave" },
  { id: "arena", name: "Arena", note: "Cálido" },
  { id: "violeta", name: "Violeta", note: "Lila suave" },
  { id: "tinta", name: "Tinta", note: "Blanco y negro" },
  { id: "noche", name: "Noche", note: "Oscuro" },
  { id: "grafito", name: "Grafito", note: "Carbón" },
];

function applyLook(look) {
  const name = LOOKS.some((item) => item.id === look) ? look : "claro";
  document.documentElement.dataset.look = name;
  try {
    localStorage.setItem("impersia-look", name);
  } catch {
    /* el aspecto sigue en la cuenta */
  }
}

function normalizeCaptureResult(result) {
  if (result && Array.isArray(result.items)) {
    return {
      items: result.items,
      deduped: Number(result.deduped) || 0,
    };
  }
  if (Array.isArray(result)) {
    return { items: result, deduped: 0 };
  }
  if (result && result.id) {
    const deduped = result.dedupe_action === "merged" ? 1 : 0;
    return { items: [result], deduped };
  }
  return { items: [], deduped: 0 };
}

async function call(path, options = {}) {
  const response = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readableError(data));
  }
  return data;
}

function readableError(data) {
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  const first = Array.isArray(detail) ? detail[0] : null;
  const field = first && Array.isArray(first.loc) ? first.loc.join(".") : "";
  if (field.includes("email")) {
    return "El correo tiene que ser una dirección de verdad, con arroba. Por ejemplo, tu@correo.com";
  }
  if (field.includes("password")) {
    return "La contraseña tiene que tener al menos 8 caracteres";
  }
  return "No se ha podido completar";
}

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    call("/me")
      .then((data) => {
        applyLook(data.look);
        setMe(data);
      })
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <main className="gate">Cargando…</main>;
  if (!me) return <Auth onEnter={(data) => { applyLook(data.look); setMe(data); }} />;
  return (
    <Home
      email={me.email}
      googleEmail={me.google_email || ""}
      look={me.look || "claro"}
      alertEmail={Boolean(me.alert_email)}
      onLook={(look) => setMe({ ...me, look })}
      onAlertEmail={(alertEmail) => setMe({ ...me, alert_email: alertEmail })}
      onLeave={() => setMe(null)}
    />
  );
}

function Auth({ onEnter }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");

  async function submit(path) {
    setError("");
    try {
      const data = await call(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onEnter(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="gate">
      <a className="mark" href="#hoy"><Logo /></a>
      <h1>Entra en Impersia</h1>
      <p className="lead">La contraseña tiene al menos 8 caracteres. La cuenta es solo tuya.</p>
      <label>
        Correo
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Contraseña
        <span className="secret">
          <input
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="button" className="secondary" onClick={() => setVisible(!visible)}>
            {visible ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={() => submit("/auth/register")}>Crear cuenta</button>
        <button type="button" className="secondary" onClick={() => submit("/auth/login")}>Entrar</button>
      </div>
    </main>
  );
}

function Home({ email, googleEmail, look, alertEmail, onLook, onAlertEmail, onLeave }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [healthControls, setHealthControls] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [shoppingList, setShoppingList] = useState(null);
  const screen = useHash();

  useEffect(() => {
    if (!editing) return;
    const t = window.setTimeout(() => {
      const habitPanel = document.getElementById("habitos-edit-anchor");
      if (habitPanel) {
        habitPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const seriesPanel = document.getElementById("series-edit-anchor");
      if (seriesPanel) {
        seriesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      document.querySelector("main.content .card.editor")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    return () => window.clearTimeout(t);
  }, [editing?.id, editing?.editScope, editing?.occurrenceDay, editing?.habit_role]);

  useEffect(() => {
    trackScreen(screen);
  }, [screen]);
  const current = findModule(screen);

  const checkAlerts = useAlerts(items);

  useEffect(() => {
    if (!("Notification" in window)) return undefined;
    if (Notification.permission === "granted") ensureAlertWorker();
    const sync = () => {
      if (Notification.permission === "granted") {
        ensureAlertWorker();
        checkAlerts();
      }
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [checkAlerts]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "permiso") {
      setError("Google no ha dado permiso para leer el calendario. En su pantalla hay que aceptar ver el calendario.");
    }
    call("/items").then(setItems).catch((err) => setError(err.message));
    call("/health-controls").then(setHealthControls).catch(() => setHealthControls([]));
  }, []);

  useEffect(() => {
    if (screen !== "casa") return;
    call("/shopping-lists/active").then(setShoppingList).catch((err) => setError(err.message));
  }, [screen, items]);

  useEffect(() => {
    if (!googleEmail) {
      setGoogleEvents([]);
      return;
    }
    call("/google/events").then(setGoogleEvents).catch((err) => setError(err.message));
  }, [googleEmail]);

  async function registerHealthReading(controlId, body) {
    return call(`/health-controls/${controlId}/readings`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async function createHealthControl(body) {
    return call("/health-controls", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  function onHealthControlCreated(control) {
    setHealthControls((prev) => [control, ...prev.filter((c) => c.id !== control.id)]);
    setNotice("Control creado. Cuando toque, usa Registrar ahora aquí o en Hoy.");
  }

  function onHealthReadingSaved(item, controlId) {
    setItems((prev) => [item, ...prev.filter((row) => row.id !== item.id)]);
    setHealthControls((prev) =>
      prev.map((c) => (c.id === controlId ? { ...c, done_today: true } : c)),
    );
    setNotice("Registro guardado. Lo verás abajo en Registro del mes.");
  }

  async function archive() {
    if (archiving || !text.trim()) return;
    setError("");
    setNotice("");
    setArchiving(true);
    try {
      const result = await call("/captures", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      const { items: fresh, deduped } = normalizeCaptureResult(result);
      let next = [...items];
      for (const item of fresh) {
        const idx = next.findIndex((row) => row.id === item.id);
        if (idx >= 0) next[idx] = item;
        else next = [item, ...next];
      }
      setItems(next);
      setText("");
      const merged = deduped > 0 || fresh.some((item) => item.dedupe_action === "merged");
      if (merged) {
        setNotice("Ya lo tenías guardado. No se ha creado un duplicado en Agenda ni en el calendario.");
      }
      checkAlerts(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setArchiving(false);
    }
  }

  async function saveEdit(overrides = {}) {
    setError("");
    const draft = { ...editing, ...overrides };
    try {
      let item;
      if (draft.editScope === "one" && draft.occurrenceDay) {
        item = await call(`/items/${draft.id}/days/${draft.occurrenceDay}`, {
          method: "PUT",
          body: JSON.stringify({
            kind: "override",
            module: draft.module,
            title: draft.title,
            starts_at: draft.starts_at,
            time_known: Boolean(draft.time_known),
          }),
        });
      } else {
        const patch = {
          module: draft.module,
          title: draft.title,
          starts_at: draft.starts_at,
          time_known: Boolean(draft.time_known),
          alert_minutes_before: allowsAlertMinutes(draft) ? draft.alert_minutes_before ?? null : null,
          agenda_type: draft.module === "agenda" ? draft.agenda_type || null : null,
          medical_for: draft.agenda_type === "medica" ? draft.medical_for || "self" : null,
          medical_name: draft.agenda_type === "medica" ? draft.medical_name || null : null,
          medical_place: draft.agenda_type === "medica" ? draft.medical_place || null : null,
          medical_notes: draft.agenda_type === "medica" ? draft.medical_notes || null : null,
          family_kind: draft.agenda_type === "familiar" ? draft.family_kind || "otro" : null,
          family_for: draft.agenda_type === "familiar" ? draft.family_for || "self" : null,
          family_name: draft.agenda_type === "familiar" ? draft.family_name || null : null,
          family_place: draft.agenda_type === "familiar" ? draft.family_place || null : null,
          family_notes: draft.agenda_type === "familiar" ? draft.family_notes || null : null,
          leisure_kind: draft.agenda_type === "ocio" ? draft.leisure_kind || "otro" : null,
          leisure_with: draft.agenda_type === "ocio" ? draft.leisure_with || "solo" : null,
          leisure_name: draft.agenda_type === "ocio" ? draft.leisure_name || null : null,
          leisure_place: draft.agenda_type === "ocio" ? draft.leisure_place || null : null,
          leisure_notes: draft.agenda_type === "ocio" ? draft.leisure_notes || null : null,
          reminder_kind: draft.agenda_type === "recordatorio" ? draft.reminder_kind || "otro" : null,
          reminder_place: draft.agenda_type === "recordatorio" ? draft.reminder_place || null : null,
          reminder_notes: draft.agenda_type === "recordatorio" ? draft.reminder_notes || null : null,
          casa_kind: draft.module === "casa" ? draft.casa_kind || "otro" : null,
          casa_place: draft.module === "casa" ? draft.casa_place || null : null,
          casa_notes: draft.module === "casa" ? draft.casa_notes || null : null,
          supply_kind: draft.module === "casa" && draft.casa_kind === "suministro" ? draft.supply_kind || "otro" : null,
        };
        if (draft.module === "habitos") {
          patch.habit_role = draft.habit_role || "routine";
          patch.habit_kind = draft.habit_kind || "ejercicio";
          patch.habit_notes = draft.habit_notes ?? null;
          if (overrides.repeats !== undefined) patch.repeats = overrides.repeats;
        } else if (draft.editScope !== "one") {
          const preset = draft.repeatPreset ?? taskRepeatEditorState(draft.repeats).preset;
          const weekDays = draft.repeatWeekDays ?? taskRepeatEditorState(draft.repeats).weekDays;
          patch.repeats = taskRepeatsFromEditor(preset, weekDays);
        }
        item = await call(`/items/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      }
      setItems(items.map((row) => (row.id === item.id ? item : row)));
      setEditing(null);
      if (draft.editScope === "all" && isSeriesEdit(draft)) {
        setNotice("Serie actualizada: el cambio vale para todos los días de la repetición.");
      } else if (draft.editScope === "one") {
        setNotice("Cambio guardado solo para ese día.");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(item) {
    setError("");
    try {
      const status = item.status === "done" ? "open" : "done";
      const updated = await call(`/items/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems(items.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function habitMarkDone(item, dayKey, currentlyDone) {
    setError("");
    try {
      let updated;
      if (currentlyDone) {
        if (item.repeats) {
          updated = await call(`/items/${item.id}/days/${dayKey}`, { method: "DELETE" });
        } else {
          updated = await call(`/items/${item.id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "open" }),
          });
        }
      } else if (item.repeats) {
        updated = await call(`/items/${item.id}/days/${dayKey}`, {
          method: "PUT",
          body: JSON.stringify({ kind: "done" }),
        });
      } else {
        updated = await call(`/items/${item.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "done" }),
        });
      }
      setItems(items.map((row) => (row.id === updated.id ? updated : row)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearCasaDone(doneItems) {
    if (!doneItems.length) return;
    setError("");
    try {
      await Promise.all(doneItems.map((item) => call(`/items/${item.id}`, { method: "DELETE" })));
      const ids = new Set(doneItems.map((item) => item.id));
      setItems(items.filter((row) => !ids.has(row.id)));
      if (editing && ids.has(editing.id)) setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function withHabitEditFields(row) {
    if (!isHabitRoutine(row)) return row;
    const { mode, weekDays } = editorFromRepeats(row.repeats);
    return {
      ...row,
      habitRepeatMode: mode,
      habitWeekDays: weekDays,
      habit_role: row.habit_role || "routine",
      habit_kind: row.habit_kind || "ejercicio",
    };
  }

  function withTaskRepeatFields(row) {
    if (isHabitRoutine(row)) return row;
    const { preset, weekDays } = taskRepeatEditorState(row.repeats);
    return { ...row, repeatPreset: preset, repeatWeekDays: weekDays };
  }

  function prepareEditRow(base, extra) {
    return withTaskRepeatFields(withHabitEditFields({ ...base, ...extra }));
  }

  function resolveBaseItem(item) {
    return items.find((entry) => entry.id === item.id) || baseItem(item);
  }

  function startEdit(item) {
    setNotice("");
    setEditing(prepareEditRow(resolveBaseItem(item), { editScope: "all" }));
  }

  function startEditOneDay(item) {
    const base = resolveBaseItem(item);
    setEditing(
      prepareEditRow(base, {
        starts_at: item.starts_at,
        time_known: item.time_known,
        occurrenceDay: dayKey(item.starts_at),
        editScope: "one",
      }),
    );
  }

  async function saveHabitEdit(overrides) {
    await saveEdit({ ...overrides, title: editing.title });
  }

  function askRemove(item) {
    setPendingDelete(item);
  }

  async function confirmRemoveAll() {
    if (!pendingDelete) return;
    setError("");
    setDeleting(true);
    try {
      await call(`/items/${pendingDelete.id}`, { method: "DELETE" });
      setItems(items.filter((row) => row.id !== pendingDelete.id));
      if (editing?.id === pendingDelete.id) setEditing(null);
      setPendingDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmRemoveOne() {
    if (!pendingDelete) return;
    setError("");
    setDeleting(true);
    try {
      const item = await call(`/items/${pendingDelete.id}/days/${dayKey(pendingDelete.starts_at)}`, {
        method: "PUT",
        body: JSON.stringify({ kind: "skip" }),
      });
      setItems(items.map((row) => (row.id === item.id ? item : row)));
      if (editing?.id === pendingDelete.id) setEditing(null);
      setPendingDelete(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function leave() {
    await call("/auth/logout", { method: "POST", body: "{}" });
    onLeave();
  }

  const todayStart = dayStart(new Date());
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const horizon = endOfDay(todayStart);
  horizon.setDate(horizon.getDate() + 60);
  const googleDated = googleEvents.filter((event) => event.starts_at).map(asGoogle);
  const datedItems = items.filter((item) => item.starts_at);
  const byDate = (a, b) => new Date(a.starts_at) - new Date(b.starts_at);
  const todayItems = [
    ...expandItems(datedItems, todayStart, endOfDay(todayStart)).filter((item) => !isHabitRoutine(item)),
    ...googleDated.filter((item) => dayKey(item.starts_at) === dayKey(todayStart)),
  ].sort(byDate);
  const laterItems = collapseRepeatingSeries(
    [
      ...expandItems(datedItems, tomorrow, horizon).filter((item) => !isHabitRoutine(item)),
      ...googleDated.filter((item) => dayKey(item.starts_at) > dayKey(todayStart)),
    ].sort(byDate),
  );

  return (
    <div className="shell">
      <aside className="side">
        <a className="mark" href="#hoy"><Logo /></a>
        <nav className="primary">
          <a className={screen === "hoy" ? "on" : ""} href="#hoy"><Icon name="hoy" /> Hoy</a>
          <a className={screen === "entrada" ? "on" : ""} href="#entrada"><Icon name="entrada" /> Entrada</a>
        </nav>
        {AXES.map((axis) => (
          <div key={axis.id}>
            <p className="axis-name"><Icon name={axis.id} /> {axis.name}</p>
            <nav className="modules">
              {axis.modules.map((mod) => (
                <a key={mod.id} className={screen === mod.id ? "on" : ""} href={`#${mod.id}`}><Icon name={mod.id} /> {mod.label}</a>
              ))}
            </nav>
          </div>
        ))}
        <div className="who">
          <a className={screen === "perfil" ? "session on" : "session"} href="#perfil"><Icon name="perfil" /> <span>{email}</span></a>
          <a className={screen === "apariencia" ? "on" : ""} href="#apariencia"><Icon name="apariencia" /> Apariencia</a>
          <button type="button" className="text" onClick={leave}>Salir</button>
        </div>
      </aside>
      <main className="content">
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {editing?.module === "habitos" && editing?.habit_role === "log" && (
        <HabitLogEditPanel
          editing={editing}
          setEditing={setEditing}
          onSave={saveHabitEdit}
          onCancel={() => setEditing(null)}
        />
      )}
      {isSeriesEdit(editing) && (
        <article className="card editor series-edit-panel" id="series-edit-anchor">
          <h3>Cambiar serie repetida</h3>
          <p className="private series-edit-lead">
            En tu cuenta hay <strong>una sola entrada</strong>; en Hoy y Agenda ves muchas fechas, pero es la misma serie.
            Lo que guardes aquí se aplica a <strong>todos los días</strong> de la repetición. Si antes tocaste un solo día, esos
            retoques se quitan al guardar la serie.
          </p>
          <ItemEditForm
            editing={editing}
            setEditing={setEditing}
            saveEdit={saveEdit}
            onCancel={() => setEditing(null)}
            showRepeat
          />
        </article>
      )}
      {editing?.module === "habitos" && editing?.habit_role !== "log" && (
        <HabitEditPanel
          editing={editing}
          setEditing={setEditing}
          onSave={saveHabitEdit}
          onCancel={() => setEditing(null)}
        />
      )}
      {screen === "entrada" && (
        <>
          <h1>Entrada</h1>
          <p className="lead">Escribe lo que tengas en la cabeza. Impersia lo archiva en su eje. Si no es el sitio, lo cambias.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Llamar al taller el viernes"
            disabled={archiving}
            aria-busy={archiving}
          />
          <div className="entrada-actions">
            <button type="button" className={archiving ? "busy" : ""} onClick={archive} disabled={!text.trim() || archiving} aria-busy={archiving}>
              {archiving ? "Archivando…" : "Apuntar"}
            </button>
            {archiving && <p className="private entrada-status">Impersia está archivando. Puede tardar unos segundos con IA.</p>}
          </div>
          {notice && <p className="notice entrada-notice" role="status">{notice}</p>}
          <h2>Archivado</h2>
          <ItemList items={items} editing={editing} setEditing={setEditing} startEdit={startEdit} startEditOneDay={startEditOneDay} saveEdit={saveEdit} askRemove={askRemove} onToggleStatus={toggleStatus} />
        </>
      )}
      {screen === "hoy" && (
        <div className="screen-hoy">
          <header className="hoy-header">
            <p className="hoy-kicker">Hoy</p>
            <h1 className="hoy-date">{todayLine()}</h1>
            <p className="hoy-lead">Rutinas, citas y lo que viene en los próximos días.</p>
          </header>
          <div className="panes hoy-panes">
            <div className="hoy-column">
              {(hasHoyBienestarContent(items, todayStart, expandItems, endOfDay) ||
                pendingControls(healthControls).length > 0) && (
                <section className="hoy-zone hoy-zone-bienestar" aria-labelledby="hoy-bienestar-heading">
                  <HoyBienestar
                    items={items}
                    healthControls={healthControls}
                    registerReading={registerHealthReading}
                    onHealthReadingSaved={onHealthReadingSaved}
                    setError={setError}
                    todayStart={todayStart}
                    expandItems={expandItems}
                    endOfDay={endOfDay}
                    onMarkDone={habitMarkDone}
                    onEdit={startEdit}
                    askRemove={askRemove}
                    editingId={editing?.module === "habitos" ? editing.id : null}
                  />
                </section>
              )}
              <section className="hoy-zone hoy-zone-agenda" aria-labelledby="hoy-para-heading">
                <h2 id="hoy-para-heading">
                  Para hoy
                  {todayItems.length > 0 && <span className="hoy-count">{todayItems.length}</span>}
                </h2>
                {todayItems.length ? (
                  <ItemList items={todayItems} editing={editing} setEditing={setEditing} startEdit={startEdit} startEditOneDay={startEditOneDay} saveEdit={saveEdit} askRemove={askRemove} onToggleStatus={toggleStatus} />
                ) : (
                  <p className="hoy-empty">Nada con fecha para hoy. Apúntalo en Entrada o mira Agenda.</p>
                )}
              </section>
            </div>
            <section className="hoy-zone hoy-zone-later" aria-labelledby="hoy-proximos-heading">
              <h2 id="hoy-proximos-heading">
                Próximos
                {laterItems.length > 0 && <span className="hoy-count">{laterItems.length}</span>}
              </h2>
              {laterItems.length ? (
                <ItemList
                  items={laterItems}
                  editing={editing}
                  setEditing={setEditing}
                  startEdit={startEdit}
                  startEditOneDay={startEditOneDay}
                  saveEdit={saveEdit}
                  askRemove={askRemove}
                  onToggleStatus={toggleStatus}
                  repeatSeries
                />
              ) : (
                <p className="hoy-empty">Sin fechas en los próximos sesenta días.</p>
              )}
            </section>
          </div>
        </div>
      )}
      {current && (
        <>
          <p className="private kicker"><Icon name={current.axisId} /> {current.axis}</p>
          <h1 className={`with-icon m-${current.id}`}><Icon name={current.id} /> {current.label}</h1>
          <p className="lead">{current.blurb}</p>
          {current.id === "agenda" && (
            <>
              {googleEmail && <p className="private">Google Calendar conectado: {googleEmail}</p>}
              <a className="connect" href={`${API}/auth/google/start`}>
                {googleEmail ? "Pedir permiso del calendario" : "Conectar Google Calendar"}
              </a>
              <CalendarBoard
                items={[...items.filter((item) => item.starts_at), ...googleDated]}
                editing={editing}
                setEditing={setEditing}
                startEdit={startEdit}
                startEditOneDay={startEditOneDay}
                saveEdit={saveEdit}
                askRemove={askRemove}
                onToggleStatus={toggleStatus}
              />
            </>
          )}
          {current.id === "casa" ? (
            <CasaBoard
              items={items}
              shoppingList={shoppingList}
              onShoppingListChange={setShoppingList}
              onClearCasaDone={clearCasaDone}
              editing={editing}
              setEditing={setEditing}
              startEdit={startEdit}
              startEditOneDay={startEditOneDay}
              saveEdit={saveEdit}
              askRemove={askRemove}
              onToggleStatus={toggleStatus}
            />
          ) : current.id === "habitos" ? (
            <div className="module-habitos">
              <HabitosBoard
                items={items}
                healthControls={healthControls}
                createControl={createHealthControl}
                registerReading={registerHealthReading}
                onControlCreated={onHealthControlCreated}
                onHealthReadingSaved={onHealthReadingSaved}
                setError={setError}
                todayStart={todayStart}
                expandItems={expandItems}
                endOfDay={endOfDay}
                onMarkDone={habitMarkDone}
                startEdit={startEdit}
                askRemove={askRemove}
                editingId={editing?.module === "habitos" ? editing.id : null}
              />
            </div>
          ) : (
            <div className="panes">
              <section>
                <h2>Tuyo</h2>
                {items.some((item) => item.module === current.id) ? (
                  <ItemList items={items.filter((item) => item.module === current.id)} editing={editing} setEditing={setEditing} startEdit={startEdit} startEditOneDay={startEditOneDay} saveEdit={saveEdit} askRemove={askRemove} onToggleStatus={toggleStatus} />
                ) : (
                  <p className="private">Todavía no hay nada tuyo aquí. Escríbelo en Entrada.</p>
                )}
              </section>
              <section>
                {current.id === "agenda" && googleEmail ? (
                  <>
                    <h2>Google</h2>
                    {googleDated.length ? (
                      <ItemList items={googleDated} editing={null} setEditing={() => {}} saveEdit={() => {}} />
                    ) : (
                      <p className="private">No hay citas de Google en los próximos sesenta días.</p>
                    )}
                  </>
                ) : (
                  <>
                    <h2>Ejemplos</h2>
                    <p className="private">Inventados, para ver la forma de esta pantalla. No están en tu cuenta.</p>
                    <div className="cards">
                      {current.examples.map(([title, note]) => (
                        <article className="card" key={title}>
                          <p className={`mod m-${current.id}`}><Icon name={current.id} /> Ejemplo</p>
                          <p className="when">{note}</p>
                          <p className="title">{title}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
      {screen === "perfil" && (
        <>
          <h1>Perfil</h1>
          <p className="lead">{email}</p>
          <AlertPermission alertEmail={alertEmail} onAlertEmail={onAlertEmail} setError={setError} />
        </>
      )}
      {screen === "apariencia" && (
        <>
          <h1>Apariencia</h1>
          <p className="lead">Elige cómo se ve Impersia. Queda guardado en tu cuenta.</p>
          <div className="looks">
            {LOOKS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={look === item.id ? "on" : ""}
                onClick={() => chooseLook(item.id, onLook, setError)}
              >
                <span className={`swatch ${item.id}`}><i /></span>
                <span>
                  <strong>{item.name}</strong>
                  {item.note}
                </span>
                {look === item.id && <em className="chosen">Elegido</em>}
              </button>
            ))}
          </div>
        </>
      )}
      {screen !== "hoy" && screen !== "entrada" && screen !== "apariencia" && screen !== "perfil" && !current && (
        <>
          <h1>Hoy</h1>
          <p className="lead">Esa pantalla no existe. Vuelve a Hoy.</p>
        </>
      )}
      </main>
      {pendingDelete && (pendingDelete.repeats && pendingDelete.occurrenceKey ? (
        <RepeatScopeDialog
          item={pendingDelete}
          mode="delete"
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onOne={confirmRemoveOne}
          onAll={confirmRemoveAll}
        />
      ) : (
        <ConfirmDialog
          item={pendingDelete}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemoveAll}
        />
      ))}
    </div>
  );
}

function ConfirmDialog({ item, busy, onCancel, onConfirm }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={onCancel}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2 id="confirm-title">Borrar entrada</h2>
        <p className="lead">¿Borrar «{item.title}»? No se puede deshacer.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
          <button type="button" className="danger" onClick={onConfirm} disabled={busy}><Icon name="borrar" /> {busy ? "Borrando…" : "Borrar"}</button>
        </div>
      </div>
    </div>
  );
}

function RepeatScopeDialog({ item, mode, busy, onCancel, onOne, onAll }) {
  const when = dayLabel(item.starts_at);
  const verb = mode === "delete" ? "borrar" : "cambiar";
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="scope-title" onClick={onCancel}>
      <div className="dialog" onClick={(event) => event.stopPropagation()}>
        <h2 id="scope-title">{mode === "delete" ? "Borrar entrada" : "Cambiar entrada"}</h2>
        <p className="lead">«{item.title}» se repite. ¿Qué quieres {verb}?</p>
        <div className="actions stack">
          <button type="button" onClick={onOne} disabled={busy}><Icon name={mode === "delete" ? "borrar" : "editar"} /> Solo {when}</button>
          <button type="button" className={mode === "delete" ? "danger" : ""} onClick={onAll} disabled={busy}>
            <Icon name={mode === "delete" ? "borrar" : "editar"} /> Toda la serie
          </button>
          <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

async function chooseLook(id, onLook, setError) {
  applyLook(id);
  onLook(id);
  try {
    await call("/me", { method: "PATCH", body: JSON.stringify({ look: id }) });
  } catch (err) {
    setError(err.message);
  }
}

function Logo() {
  return (
    <svg className="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 116" fill="none" role="img" aria-label="Impersia">
      <rect x="8" y="8" width="136" height="100" rx="6" stroke="currentColor" strokeWidth="2.4" />
      <path d="M28 10.2v95.6" stroke="currentColor" strokeWidth="2.4" />
      <text x="40" y="52" fill="currentColor" fontFamily="Plus Jakarta Sans, Segoe UI, sans-serif" fontSize="22" fontWeight="680" letterSpacing="-0.3">Impersia</text>
      <path d="M40 64h72" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="124" cy="92" r="18" fill="#0f5c4c" />
      <circle cx="124" cy="92" r="12.4" stroke="#f3efe6" strokeWidth="1.6" />
    </svg>
  );
}

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const CALENDAR_VIEWS = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "mes", label: "Mes" },
];

function CalendarBoard({ items, editing, setEditing, startEdit, startEditOneDay, saveEdit, askRemove, onToggleStatus }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [view, setView] = useState("mes");
  const cells = view === "dia" ? [cursor] : view === "semana" ? weekCells(cursor) : monthCells(cursor);
  const rangeFrom = dayStart(cells[0]);
  const rangeTo = endOfDay(cells[cells.length - 1]);
  const byDay = new Map();
  expandItems(items, rangeFrom, rangeTo).forEach((item) => {
    const key = dayKey(item.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(item);
  });
  byDay.forEach((list) => list.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)));
  const visible = cells.flatMap((date) => byDay.get(dayKey(date)) || []);
  const legend = legendOf(visible);
  const limit = view === "semana" ? 8 : 3;

  function shift(delta) {
    const next = new Date(cursor);
    if (view === "dia") next.setDate(next.getDate() + delta);
    else if (view === "semana") next.setDate(next.getDate() + delta * 7);
    else next.setMonth(next.getMonth() + delta);
    setCursor(next);
  }

  function openDay(date) {
    setCursor(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    setView("dia");
  }

  return (
    <section className="month" aria-label="Calendario">
      <div className="month-bar">
        <button type="button" className="secondary" onClick={() => shift(-1)}>Anterior</button>
        <div className="month-center">
          <p className="month-name">{calendarTitle(view, cursor, cells)}</p>
          <div className="views">
            {CALENDAR_VIEWS.map((item) => (
              <button type="button" key={item.id} className={view === item.id ? "on" : ""} onClick={() => setView(item.id)}>{item.label}</button>
            ))}
          </div>
        </div>
        <button type="button" className="secondary" onClick={() => shift(1)}>Siguiente</button>
      </div>
      {legend.length > 0 && (
        <div className="month-key">
          {legend.map((item) => {
            const id = item.source === "google" ? "google" : item.module;
            return (
              <span className={`key m-${id}`} key={id}>
                {item.source === "google" ? <GoogleMark /> : <Icon name={id} />}
                {item.source === "google" ? "Google" : labelOf(id)}
              </span>
            );
          })}
        </div>
      )}
      {view === "dia" ? (
        <DayColumn
          items={byDay.get(dayKey(cursor)) || []}
          editing={editing}
          setEditing={setEditing}
          startEdit={startEdit}
          startEditOneDay={startEditOneDay}
          saveEdit={saveEdit}
          askRemove={askRemove}
          onToggleStatus={onToggleStatus}
        />
      ) : (
        <div className={`month-grid ${view}`}>
          {WEEKDAYS.map((name) => <p className="dow" key={name}>{name}</p>)}
          {cells.map((date) => {
            const key = dayKey(date);
            const list = byDay.get(key) || [];
            const shown = list.slice(0, limit);
            const classes = ["day"];
            if (view === "mes" && date.getMonth() !== cursor.getMonth()) classes.push("out");
            if (key === dayKey(today)) classes.push("today");
            return (
              <div className={classes.join(" ")} key={key}>
                <button type="button" className="num" onClick={() => openDay(date)}>{date.getDate()}</button>
                {shown.map((item) => <Chip item={item} key={item.occurrenceKey || item.id} onPick={openDay} />)}
                {list.length > shown.length && (
                  <button type="button" className="more" onClick={() => openDay(date)}>+{list.length - shown.length}</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DayColumn({ items, editing, setEditing, startEdit, startEditOneDay, saveEdit, askRemove, onToggleStatus }) {
  if (!items.length) return <p className="private">Este día no hay nada con fecha.</p>;
  return (
    <ItemList
      items={items}
      editing={editing}
      setEditing={setEditing}
      startEdit={startEdit}
      startEditOneDay={startEditOneDay}
      saveEdit={saveEdit}
      askRemove={askRemove}
      onToggleStatus={onToggleStatus}
    />
  );
}

function Chip({ item, onPick }) {
  const className = chipClass(item);
  const title = chipTitle(item);
  const body = (
    <>
      {item.source === "google" ? <GoogleMark /> : <Icon name={item.module || "agenda"} />}
      <span>{chipText(item)}</span>
    </>
  );
  if (onPick) {
    return (
      <button type="button" className={className} title={title} onClick={() => onPick(new Date(item.starts_at))}>
        {body}
      </button>
    );
  }
  return <p className={className} title={title}>{body}</p>;
}

function monthCells(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(new Date(year, month, 1 - (startOffset - i)));
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return cells;
}

function weekCells(cursor) {
  const offset = (cursor.getDay() + 6) % 7;
  const monday = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - offset);
  return Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
}

function calendarTitle(view, cursor, cells) {
  if (view === "dia") {
    const raw = cursor.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  if (view === "semana") {
    const start = cells[0];
    const end = cells[6];
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      const month = end.toLocaleDateString("es-ES", { month: "short" });
      return `${start.getDate()}–${end.getDate()} ${month} ${end.getFullYear()}`;
    }
    const left = start.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    const right = end.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    return `${left} – ${right}`;
  }
  const raw = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function legendOf(items) {
  const present = new Map();
  items.forEach((item) => {
    const id = item.source === "google" ? "google" : item.module;
    if (id && !present.has(id)) present.set(id, item);
  });
  const order = AXES.flatMap((axis) => axis.modules.map((mod) => mod.id));
  order.push("google");
  return order.filter((id) => present.has(id)).map((id) => present.get(id));
}

function chipClass(item) {
  if (item.source === "google") return "chip google m-google";
  return `chip m-${item.module || "agenda"}`;
}

function chipTitle(item) {
  const clock = item.time_known ? `${clockOf(item.starts_at)} ` : "";
  if (item.source === "google") return `${clock}Google. ${item.title}`;
  if (isMedicalItem(item)) return `${clock}Cita médica. ${item.title}. ${medicalForLabel(item.medical_for, item.medical_name)}`;
  if (isFamilyItem(item)) return `${clock}${familyEventLine(item)}. ${item.title}`;
  if (isLeisureItem(item)) return `${clock}${leisureEventLine(item)}. ${item.title}`;
  if (isReminderItem(item)) return `${clock}Recordatorio. ${item.title}`;
  if (isCasaItem(item)) return `${clock}${casaEventLine(item)}. ${item.title}`;
  return `${clock}${labelOf(item.module)}. ${item.title}`;
}

function chipText(item) {
  const clock = item.time_known ? `${clockOf(item.starts_at)} ` : "";
  if (isMedicalItem(item) && item.medical_for !== "self") {
    const who = item.medical_name || medicalForLabel(item.medical_for, null).replace("Para ", "");
    return `${clock}${item.title} · ${who}`;
  }
  if (isFamilyItem(item) && item.family_for !== "self") {
    const who = item.family_name || familyForLabel(item.family_for, null).replace("Para ", "");
    return `${clock}${item.title} · ${who}`;
  }
  if (isLeisureItem(item) && item.leisure_with !== "solo") {
    const who = item.leisure_name || leisureWithLabel(item.leisure_with, null);
    return `${clock}${item.title} · ${who}`;
  }
  return `${clock}${item.title}`;
}

function clockOf(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function CasaBoard({
  items,
  shoppingList,
  onShoppingListChange,
  onClearCasaDone,
  editing,
  setEditing,
  startEdit,
  startEditOneDay,
  saveEdit,
  askRemove,
  onToggleStatus,
}) {
  const pending = groupCasaItems(items, "open");
  const done = groupCasaItems(items, "done");
  const compraPending = pending.find((group) => group.id === "compra")?.items || [];
  const compraDone = done.find((group) => group.id === "compra")?.items || [];
  const domesticaPending = pending.find((group) => group.id === "domestica")?.items || [];
  const domesticaDone = done.find((group) => group.id === "domestica")?.items || [];
  const otherPending = pending.filter((group) => !["compra", "domestica"].includes(group.id) && group.items.length);
  const otherDone = done.filter((group) => !["compra", "domestica"].includes(group.id) && group.items.length);
  const hasDone = otherDone.length > 0;
  const hasOther = otherPending.length > 0 || otherDone.length > 0 || domesticaPending.length || domesticaDone.length;
  const listProps = { editing, setEditing, startEdit, startEditOneDay, saveEdit, askRemove, onToggleStatus };

  return (
    <div className="casa-board">
      <section className="casa-section">
        <h2>Lista de la compra</h2>
        <ShoppingListPanel
          list={shoppingList}
          onListChange={onShoppingListChange}
          pending={compraPending}
          done={compraDone}
          onClearDone={onClearCasaDone}
          doneSingular="comprado"
          donePlural="comprados"
          clearLabel="Quitar comprados de la lista"
          {...listProps}
        />
      </section>
      <section className="casa-section">
        <h2>Tareas del hogar</h2>
        <CasaTaskPanel
          pending={domesticaPending}
          done={domesticaDone}
          onClearDone={onClearCasaDone}
          doneSingular="hecha"
          donePlural="hechas"
          clearLabel="Quitar hechas de la lista"
          emptyMessage="Nada pendiente. Escribe «sacar la basura cada día a las 21:00» en Entrada."
          showSchedule
          {...listProps}
        />
      </section>
      {!compraPending.length && !compraDone.length && !domesticaPending.length && !domesticaDone.length && !hasOther && (
        <p className="private">Más cosas de Casa (mantenimiento, suministros…) se escriben en Entrada.</p>
      )}
      {otherPending.map((group) => (
        <section className="casa-section" key={group.id}>
          <h2>{group.label}</h2>
          {group.id === "inventario" ? (
            <InventarioList items={group.items} {...listProps} />
          ) : (
            <ItemList items={group.items} {...listProps} />
          )}
        </section>
      ))}
      {hasDone && (
        <section className="casa-section casa-done">
          <h2>Hecho</h2>
          {otherDone.map((group) => (
            <div className="casa-done-group" key={group.id}>
              <h3>{group.label}</h3>
              <ItemList items={group.items} {...listProps} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function ShoppingListPanel(props) {
  const { list, onListChange } = props;
  const [storeDraft, setStoreDraft] = useState("");
  const [savingStore, setSavingStore] = useState(false);
  const [storeOpen, setStoreOpen] = useState(Boolean(list?.store_name));

  useEffect(() => {
    setStoreDraft(list?.store_name || "");
    if (list?.store_name) setStoreOpen(true);
  }, [list?.id, list?.store_name]);

  async function saveStore() {
    const store_name = storeDraft.trim();
    if ((list?.store_name || "") === store_name) return;
    setSavingStore(true);
    try {
      const updated = await call("/shopping-lists/active", {
        method: "PATCH",
        body: JSON.stringify({ store_name: store_name || null }),
      });
      onListChange(updated);
    } finally {
      setSavingStore(false);
    }
  }

  const hasStore = Boolean((list?.store_name || storeDraft).trim());

  return (
    <div className="shopping-list">
      {storeOpen ? (
        <div className="shopping-store">
          <p className="private shopping-store-hint">
            Opcional. El sitio donde harás esta compra; más adelante servirá para avisarte al pasar cerca.
          </p>
          <label>
            Tienda
            <input
              value={storeDraft}
              placeholder="Mercadona, Amazon…"
              onChange={(e) => setStoreDraft(e.target.value)}
              onBlur={saveStore}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
          </label>
          {savingStore && <span className="private">Guardando…</span>}
          {!hasStore && (
            <button type="button" className="text shopping-store-hide" onClick={() => setStoreOpen(false)}>
              Ocultar
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="text shopping-store-open" onClick={() => setStoreOpen(true)}>
          Indicar tienda (opcional)
        </button>
      )}
      <CasaTaskPanel
        {...props}
        emptyMessage="Nada pendiente. Escribe «comprar leche y pan» en Entrada."
        showRegistered
      />
    </div>
  );
}

function CasaTaskPanel({
  pending,
  done,
  onClearDone,
  doneSingular,
  donePlural,
  clearLabel,
  emptyMessage,
  showSchedule = false,
  showRegistered = false,
  editing,
  setEditing,
  startEdit,
  saveEdit,
  askRemove,
  onToggleStatus,
}) {
  const [showDone, setShowDone] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!done.length) setShowDone(false);
  }, [done.length]);

  async function clearDone() {
    if (!done.length || clearing) return;
    const label = done.length === 1 ? `1 ${doneSingular}` : `${done.length} ${donePlural}`;
    if (!window.confirm(`¿Quitar ${label} de la lista?`)) return;
    setClearing(true);
    try {
      await onClearDone(done);
      setShowDone(false);
    } finally {
      setClearing(false);
    }
  }

  const doneLabel = done.length === 1 ? `1 ${doneSingular}` : `${done.length} ${donePlural}`;

  return (
    <>
      {pending.length ? (
        <ShoppingChecklist
          items={pending}
          showSchedule={showSchedule}
          showRegistered={showRegistered}
          editing={editing}
          setEditing={setEditing}
          startEdit={startEdit}
          saveEdit={saveEdit}
          askRemove={askRemove}
          onToggleStatus={onToggleStatus}
        />
      ) : (
        <p className="private">{emptyMessage}</p>
      )}
      {done.length > 0 && (
        <div className="shopping-done">
          <button type="button" className="text shopping-done-toggle" onClick={() => setShowDone(!showDone)}>
            {showDone ? `Ocultar ${donePlural}` : `${doneLabel} · mostrar`}
          </button>
          {showDone && (
            <>
              <ShoppingChecklist
                items={done}
                showSchedule={showSchedule}
                showRegistered={showRegistered}
                editing={editing}
                setEditing={setEditing}
                startEdit={startEdit}
                saveEdit={saveEdit}
                askRemove={askRemove}
                onToggleStatus={onToggleStatus}
              />
              <button type="button" className="text shopping-clear-done" onClick={clearDone} disabled={clearing}>
                {clearing ? "Quitando…" : clearLabel}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function InventarioList({ items, editing, setEditing, startEdit, saveEdit, askRemove }) {
  if (!items.length) {
    return <p className="private">Nada apuntado. Escribe «quedan 2 cartuchos en la despensa» en Entrada.</p>;
  }
  return (
    <ul className="inventario-list">
      {items.map((item) => (
        <li
          className={["inventario-row", isEditingRow(item, editing) ? "editing" : ""].filter(Boolean).join(" ")}
          key={item.id}
        >
          {isEditingRow(item, editing) ? (
            <>
              <input
                className="inventario-edit"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
              <input
                className="inventario-edit-qty"
                value={editing.casa_notes || ""}
                placeholder="Cantidad"
                onChange={(e) => setEditing({ ...editing, casa_notes: e.target.value })}
              />
              <input
                className="inventario-edit-where"
                value={editing.casa_place || ""}
                placeholder="Dónde"
                onChange={(e) => setEditing({ ...editing, casa_place: e.target.value })}
              />
              <span className="inventario-actions">
                <button type="button" className="link" onClick={saveEdit}>Guardar</button>
                <button type="button" className="link secondary" onClick={() => setEditing(null)}>Cancelar</button>
              </span>
            </>
          ) : (
            <>
              <span className="inventario-title">{item.title}</span>
              {item.casa_notes && <span className="inventario-qty">{item.casa_notes}</span>}
              {item.casa_place && <span className="inventario-where">{item.casa_place}</span>}
              {item.created_at && (
                <span className="inventario-when">({registeredLabel(item.created_at)})</span>
              )}
              <span className="inventario-actions">
                <button type="button" className="link" onClick={() => startEdit(item)}>Cambiar</button>
                <button type="button" className="link danger" onClick={() => askRemove(item)}>Borrar</button>
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function taskScheduleLabel(item) {
  if (!item.starts_at && !item.repeats) return null;
  const bits = [];
  if (item.repeats === "daily") bits.push("Cada día");
  else if (item.repeats === "weekly" || item.repeats?.startsWith("weekly:")) {
    bits.push(repeatLabel(item.repeats, item.starts_at) || "Cada semana");
  }
  else if (item.repeats === "monthly") bits.push("Cada mes");
  else if (item.repeats === "yearly") bits.push("Cada año");
  if (item.time_known && item.starts_at) bits.push(clockOf(item.starts_at));
  else if (item.starts_at && !item.repeats) bits.push(dayLabel(item.starts_at));
  return bits.length ? bits.join(" · ") : null;
}

function ShoppingChecklist({
  items,
  showSchedule = false,
  showRegistered = false,
  editing,
  setEditing,
  startEdit,
  saveEdit,
  askRemove,
  onToggleStatus,
}) {
  return (
    <ul className="shopping-checklist">
      {items.map((item) => (
        <li
          className={["shopping-row", item.status === "done" ? "done" : "", isEditingRow(item, editing) ? "editing" : ""].filter(Boolean).join(" ")}
          key={item.id}
        >
          {isEditingRow(item, editing) ? (
            <>
              <input
                className="shopping-edit"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveEdit();
                  }
                }}
              />
              <span className="shopping-actions">
                <button type="button" className="link" onClick={saveEdit}>Guardar</button>
                <button type="button" className="link secondary" onClick={() => setEditing(null)}>Cancelar</button>
              </span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="shopping-check"
                aria-label={item.status === "done" ? "Reabrir" : "Marcar hecho"}
                onClick={() => onToggleStatus(item)}
              >
                {item.status === "done" ? "✓" : ""}
              </button>
              <span className="shopping-title">
                {item.title}
                {showSchedule && taskScheduleLabel(item) && (
                  <span className="task-schedule"> · {taskScheduleLabel(item)}</span>
                )}
                {showRegistered && item.created_at && (
                  <span className="shopping-when"> ({registeredLabel(item.created_at)})</span>
                )}
              </span>
              <span className="shopping-actions">
                <button type="button" className="link" onClick={() => startEdit(item)}>Cambiar</button>
                <button type="button" className="link danger" onClick={() => askRemove(item)}>Borrar</button>
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function ItemList({ items, editing, setEditing, startEdit, startEditOneDay, saveEdit, askRemove, onToggleStatus, repeatSeries }) {
  const seriesId = isSeriesEdit(editing) ? editing.id : null;
  return (
    <div className="cards">
      {items.map((item) => (
        <article
          className={[
            isEditingRow(item, editing) ? "card editor" : "card",
            item.status === "done" ? "done" : "",
            seriesId === item.id ? "series-editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={item.occurrenceKey || item.id}
        >
          {isEditingRow(item, editing) ? (
            editing.module === "habitos" && editing.habit_role !== "log" ? (
              <p className="private">Edita el hábito en el panel de arriba.</p>
            ) : (
              <ItemEditForm
                editing={editing}
                setEditing={setEditing}
                saveEdit={saveEdit}
                onCancel={() => setEditing(null)}
                showRepeat={!isSeriesEdit(editing)}
              />
            )
          ) : seriesId === item.id ? (
            <p className="private">Estás editando esta serie en el panel de arriba.</p>
          ) : (
            <>
              {item.starts_at && (
                <p className="when">
                  {repeatSeries && item.repeats ? nextOccurrenceWhenLabel(item) : whenLabel(item)}
                </p>
              )}
              {repeatSeries && item.repeats && (
                <p className="repeat-line">
                  <span className="tag repeat">
                    <Icon name="repetir" /> {repeatLabel(item.repeats, item.starts_at)}
                  </span>
                </p>
              )}
              <p className="title">{item.title}</p>
              {isMedicalItem(item) && (
                <p className="medical-line">
                  <span className="tag medica">Cita médica</span>
                  <span>{medicalForLabel(item.medical_for, item.medical_name)}</span>
                </p>
              )}
              {isMedicalItem(item) && item.medical_place && <p className="private">{item.medical_place}</p>}
              {isMedicalItem(item) && item.medical_notes && <p className="private">{item.medical_notes}</p>}
              {isFamilyItem(item) && (
                <p className="medical-line">
                  <span className="tag familiar">Celebración</span>
                  <span>{familyEventLine(item)}</span>
                </p>
              )}
              {isFamilyItem(item) && item.repeats === "yearly" && (
                <p className="private">Se repite cada año</p>
              )}
              {isFamilyItem(item) && item.family_place && <p className="private">{item.family_place}</p>}
              {isFamilyItem(item) && item.family_notes && <p className="private">{item.family_notes}</p>}
              {isLeisureItem(item) && (
                <p className="medical-line">
                  <span className="tag ocio">Ocio / plan</span>
                  <span>{leisureEventLine(item)}</span>
                </p>
              )}
              {isLeisureItem(item) && item.leisure_place && <p className="private">{item.leisure_place}</p>}
              {isLeisureItem(item) && item.leisure_notes && <p className="private">{item.leisure_notes}</p>}
              {isReminderItem(item) && (
                <p className="medical-line">
                  <span className="tag recordatorio">Recordatorio</span>
                  <span>{reminderEventLine(item)}</span>
                </p>
              )}
              {isReminderItem(item) && item.reminder_place && <p className="private">{item.reminder_place}</p>}
              {isReminderItem(item) && item.reminder_notes && <p className="private">{item.reminder_notes}</p>}
              {isCasaItem(item) && (
                <p className="medical-line">
                  <span className={`tag ${item.casa_kind || "otro"}`}>{casaEventLine(item)}</span>
                </p>
              )}
              {isCasaItem(item) && item.casa_place && <p className="private">{item.casa_place}</p>}
              {isCasaItem(item) && item.casa_notes && <p className="private">{item.casa_notes}</p>}
              <p className="meta">
                {item.source === "google" ? (
                  <span className="tag m-google"><GoogleMark /> Google</span>
                ) : (
                  <>
                    <span className={`tag m-${item.module}`}><Icon name={item.module} /> {labelOf(item.module)}</span>
                    {item.alert_minutes_before != null && (
                      <span className="tag alert"><Icon name="aviso" /> {alertLabel(item.alert_minutes_before)}</span>
                    )}
                    <span className="item-actions">
                      {item.kind === "task" && onToggleStatus && (
                        <button type="button" className="link" onClick={() => onToggleStatus(item)}>
                          <Icon name="editar" /> {item.status === "done" ? "Reabrir" : "Hecho"}
                        </button>
                      )}
                      <button type="button" className="link" onClick={() => startEdit(item)}>
                        <Icon name="editar" /> {item.repeats ? "Cambiar serie" : "Cambiar"}
                      </button>
                      {item.repeats && item.occurrenceKey && startEditOneDay && (
                        <button type="button" className="link secondary" onClick={() => startEditOneDay(item)}>
                          Solo este día
                        </button>
                      )}
                      <button type="button" className="link danger" onClick={() => askRemove(item)}><Icon name="borrar" /> Borrar</button>
                    </span>
                  </>
                )}
              </p>
            </>
          )}
        </article>
      ))}
    </div>
  );
}

function asGoogle(event) {
  return {
    id: `google-${event.id}`,
    title: event.title,
    starts_at: event.starts_at,
    time_known: !event.all_day,
    source: "google",
    module: "agenda",
  };
}

function useHash() {
  const read = () => {
    const hash = window.location.hash.replace("#", "") || "hoy";
    if (hash === "caja") return "entrada";
    if (hash === "aspecto") return "apariencia";
    return hash;
  };
  const [hash, setHash] = useState(read);
  useEffect(() => {
    if (!window.location.hash) window.location.hash = "hoy";
    if (window.location.hash === "#caja") window.location.replace("#entrada");
    if (window.location.hash === "#aspecto") window.location.replace("#apariencia");
    const onChange = () => setHash(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function dayStart(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(value) {
  const date = dayStart(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function expandItems(items, from, to) {
  const out = [];
  items.forEach((item) => {
    out.push(...occurrences(item, from, to));
  });
  return out;
}

function parseWeeklyDays(repeats) {
  if (!repeats?.startsWith("weekly:")) return null;
  return repeats
    .slice(7)
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
}

function occurrences(item, from, to) {
  if (!item.starts_at) return [];
  if (!item.repeats) {
    const at = new Date(item.starts_at);
    return at >= from && at <= to ? [item] : [];
  }
  const weekDays = parseWeeklyDays(item.repeats);
  if (weekDays?.length) return multiWeeklyOccurrences(item, from, to, weekDays);
  if (item.repeats === "daily") return dailyOccurrences(item, from, to);
  if (item.repeats === "weekly") return weeklyOccurrences(item, from, to);
  if (item.repeats === "monthly") return monthlyOccurrences(item, from, to);
  if (item.repeats === "yearly") return yearlyOccurrences(item, from, to);
  return [];
}

function baseItem(item) {
  const { occurrenceKey, ...rest } = item;
  return rest;
}

function isEditingRow(item, editing) {
  if (!editing || editing.id !== item.id) return false;
  if (editing.module === "habitos" && editing.habit_role !== "log" && isHabitRoutine(editing)) {
    return false;
  }
  if (isSeriesEdit(editing)) return false;
  if (editing.editScope === "one") {
    return dayKey(item.starts_at) === editing.occurrenceDay;
  }
  if (editing.editScope === "all") {
    return !item.occurrenceKey;
  }
  return !item.occurrenceKey;
}

function exceptionFor(item, key) {
  return (item.exceptions || []).find((ex) => ex.day === key);
}

function occurrence(item, at) {
  return { ...item, starts_at: at.toISOString(), occurrenceKey: `${item.id}-${dayKey(at)}` };
}

function applyOccurrence(item, at) {
  const ex = exceptionFor(item, dayKey(at));
  if (ex?.kind === "skip") return null;
  if (ex?.kind === "override") {
    return occurrence(
      {
        ...item,
        title: ex.title,
        module: ex.module,
        starts_at: ex.starts_at,
        time_known: ex.time_known,
      },
      new Date(ex.starts_at),
    );
  }
  return occurrence(item, at);
}

function pushOccurrence(results, item, at) {
  const row = applyOccurrence(item, at);
  if (row) results.push(row);
}

function dailyOccurrences(item, from, to) {
  const anchor = new Date(item.starts_at);
  const anchorDay = dayStart(anchor);
  let d = dayStart(from);
  if (d < anchorDay) d = new Date(anchorDay);
  const results = [];
  while (d <= to) {
    const at = new Date(d);
    at.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    pushOccurrence(results, item, at);
    d.setDate(d.getDate() + 1);
  }
  return results;
}

function weeklyOccurrences(item, from, to) {
  const anchor = new Date(item.starts_at);
  const anchorDay = dayStart(anchor);
  let d = dayStart(from);
  while (d.getDay() !== anchor.getDay()) d.setDate(d.getDate() + 1);
  while (d < anchorDay) d.setDate(d.getDate() + 7);
  const results = [];
  while (d <= to) {
    const at = new Date(d);
    at.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    pushOccurrence(results, item, at);
    d.setDate(d.getDate() + 7);
  }
  return results;
}

function multiWeeklyOccurrences(item, from, to, days) {
  const anchor = new Date(item.starts_at);
  const anchorDay = dayStart(anchor);
  const results = [];
  let d = dayStart(from);
  while (d <= to) {
    if (days.includes(d.getDay())) {
      const at = new Date(d);
      at.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
      if (at >= anchorDay) pushOccurrence(results, item, at);
    }
    d.setDate(d.getDate() + 1);
  }
  return results;
}

function monthlyOccurrences(item, from, to) {
  const anchor = new Date(item.starts_at);
  const anchorDay = dayStart(anchor);
  const results = [];
  let year = anchor.getFullYear();
  let month = anchor.getMonth();
  const day = anchor.getDate();
  for (let i = 0; i < 240; i += 1) {
    const last = new Date(year, month + 1, 0).getDate();
    const at = new Date(year, month, Math.min(day, last), anchor.getHours(), anchor.getMinutes(), 0, 0);
    if (at > to) break;
    if (at >= from && at >= anchorDay) pushOccurrence(results, item, at);
    month += 1;
    if (month === 12) {
      month = 0;
      year += 1;
    }
  }
  return results;
}

function yearlyOccurrences(item, from, to) {
  const anchor = new Date(item.starts_at);
  const anchorDay = dayStart(anchor);
  const results = [];
  let year = Math.max(anchor.getFullYear(), from.getFullYear());
  while (year <= to.getFullYear() + 1) {
    const at = new Date(anchor);
    at.setFullYear(year);
    if (at.getMonth() !== anchor.getMonth()) at.setDate(0);
    if (at > to) break;
    if (at >= from && at >= anchorDay) pushOccurrence(results, item, at);
    year += 1;
  }
  return results;
}

function registeredLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function dayKey(value) {
  const date = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function datePart(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timePart(proposal) {
  const value = proposal.starts_at;
  if (!value || !proposal.time_known) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function allowsAlertMinutes(editing) {
  if (!editing?.starts_at) return false;
  if (editing.time_known) return true;
  if (editing.module === "casa") return true;
  if (editing.module === "agenda") return true;
  return false;
}

function withWhen(proposal, day, time) {
  if (!day) return { ...proposal, starts_at: null, time_known: false, alert_minutes_before: null };
  if (!time) {
    const alert =
      proposal.alert_minutes_before ??
      (proposal.module === "agenda" && proposal.agenda_type === "recordatorio" ? 1440 : null);
    return { ...proposal, starts_at: day, time_known: false, alert_minutes_before: alert };
  }
  return {
    ...proposal,
    starts_at: `${day}T${time}`,
    time_known: true,
    alert_minutes_before: proposal.alert_minutes_before ?? 15,
  };
}

function alertValue(item) {
  const value = item.alert_minutes_before;
  return value == null ? "" : String(value);
}

function parseAlert(value) {
  if (value === "") return null;
  return Number(value);
}

function alertLabel(minutes) {
  if (minutes === 0) return "A la hora";
  if (minutes === 5) return "5 min antes";
  if (minutes === 15) return "15 min antes";
  if (minutes === 30) return "30 min antes";
  if (minutes === 60) return "1 h antes";
  if (minutes === 1440) return "1 día antes";
  if (minutes < 60) return `${minutes} min antes`;
  if (minutes % 1440 === 0) return `${minutes / 1440} días antes`;
  if (minutes % 60 === 0) return `${minutes / 60} h antes`;
  return `${minutes} min antes`;
}

const ALERT_LEAD_MS = 60000;
const ALERT_GRACE_MS = 600000;

function alertKey(item) {
  return `impersia-alert-${item.occurrenceKey || item.id}-${item.alert_minutes_before}`;
}

function showBrowserNotification(item, key, fired) {
  if (fired.has(key)) return;
  postBrowserNotification(item.title, `${whenLabel(item)} · ${labelOf(item.module)}`, key)
    .then(() => fired.add(key))
    .catch(() => {});
}

function checkBrowserAlerts(items, fired) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = Date.now();
  const from = dayStart(new Date());
  const to = endOfDay(new Date());
  to.setDate(to.getDate() + 1);
  const dated = items.filter((item) => item.starts_at && item.alert_minutes_before != null && item.source !== "google");
  expandItems(dated, from, to).forEach((item) => {
    const start = new Date(item.starts_at).getTime();
    const alertAt = start - item.alert_minutes_before * 60000;
    if (now < alertAt - ALERT_LEAD_MS || now > start + ALERT_GRACE_MS) return;
    showBrowserNotification(item, alertKey(item), fired);
  });
}

function useAlerts(items) {
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const firedRef = useRef(new Set());

  const checkNow = useCallback((list) => {
    checkBrowserAlerts(list ?? itemsRef.current, firedRef.current);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) return undefined;
    checkNow();
    const id = window.setInterval(checkNow, 5000);
    const wake = () => checkNow();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [checkNow]);

  return checkNow;
}

const TEST_NOTICE =
  "Aviso enviado. Mira arriba a la derecha del Mac. En Ajustes → Notificaciones → Google Chrome, el estilo debe ser «Alertas» o «Banners», no «Ninguno».";

function AlertPermission({ alertEmail, onAlertEmail, setError }) {
  const [browser, setBrowser] = useState(() => ("Notification" in window ? Notification.permission : "unsupported"));
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!("Notification" in window)) return;
    setBrowser(Notification.permission);
    if (Notification.permission === "granted") ensureAlertWorker();
  }, []);

  async function runTest() {
    setError("");
    setNotice("");
    setTesting(true);
    try {
      await postBrowserNotification(
        "Impersia — prueba",
        "Si ves esto, los avisos del navegador funcionan en tu Mac.",
        `impersia-test-${Date.now()}`,
      );
      setNotice(TEST_NOTICE);
    } catch (err) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  }

  async function toggleEmail() {
    setBusy(true);
    setError("");
    try {
      const data = await call("/me", {
        method: "PATCH",
        body: JSON.stringify({ alert_email: !alertEmail }),
      });
      onAlertEmail(Boolean(data.alert_email));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="alert-prefs">
      <section>
        <h2>Navegador</h2>
        {browser === "unsupported" && <p className="private">Este navegador no puede avisarte con la pestaña abierta.</p>}
        {browser === "granted" && (
          <>
            <p className="private"><Icon name="aviso" /> Permiso del sitio: concedido.</p>
            <p className="private">La pestaña debe estar abierta. En Chrome: candado → Notificaciones → Permitir.</p>
            <button type="button" className="secondary" onClick={runTest} disabled={testing}>
              <Icon name="aviso" /> {testing ? "Enviando…" : "Probar notificación"}
            </button>
            {notice && <p className="notice">{notice}</p>}
          </>
        )}
        {browser === "denied" && (
          <p className="private">
            Chrome bloquea impersia.cloud. Pulsa el candado junto a la URL → Notificaciones → Permitir, y recarga.
          </p>
        )}
        {browser === "default" && (
          <>
            <p className="lead">Con la web abierta, Impersia puede avisarte a la hora de tus entradas.</p>
            <button
              type="button"
              onClick={async () => {
                setError("");
                setNotice("");
                const result = await Notification.requestPermission();
                setBrowser(result);
                if (result === "granted") {
                  await ensureAlertWorker();
                  runTest();
                }
              }}
            >
              <Icon name="aviso" /> Activar avisos del navegador
            </button>
          </>
        )}
      </section>
      <section>
        <h2>Correo</h2>
        <p className="lead">Te escribimos a tu cuenta cuando toque, aunque no tengas Impersia abierto.</p>
        {alertEmail ? (
          <>
            <p className="private"><Icon name="aviso" /> Los avisos por correo están activos.</p>
            <button type="button" className="secondary" onClick={toggleEmail} disabled={busy}>
              <Icon name="aviso" /> {busy ? "Guardando…" : "Desactivar correo"}
            </button>
          </>
        ) : (
          <button type="button" onClick={toggleEmail} disabled={busy}>
            <Icon name="aviso" /> {busy ? "Guardando…" : "Activar avisos por correo"}
          </button>
        )}
      </section>
    </div>
  );
}

function todayLine() {
  return new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function whenLabel(item) {
  if (item.repeats && !item.occurrenceKey) {
    const repeat = repeatLabel(item.repeats, item.starts_at);
    if (item.time_known) {
      const time = new Date(item.starts_at).toLocaleTimeString("es-ES", { timeStyle: "short" });
      return `${repeat}, ${time}`;
    }
    return repeat;
  }
  const date = new Date(item.starts_at);
  if (!item.time_known) return date.toLocaleDateString("es-ES", { dateStyle: "medium" });
  return date.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

