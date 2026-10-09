import { useEffect, useMemo, useState } from "react";
import { Icon } from "./icons.jsx";
import WishForm, { WISH_KINDS, WISH_PRIORITIES } from "./WishForm.jsx";

function kindLabel(value) {
  return WISH_KINDS.find(([key]) => key === value)?.[1] || "Otro";
}

function priorityLabel(value) {
  return WISH_PRIORITIES.find(([key]) => key === value)?.[1] || "Media";
}

function wishesInList(items, list) {
  return items.filter(
    (item) => item.module === "deseos"
      && (item.wish_list_id === list.id || (!item.wish_list_id && list.is_default)),
  );
}

function WishCard({ item, busy, onEdit, onDelete, onStatus }) {
  return (
    <article className={`wish-card ${item.status === "done" ? "done" : ""}`}>
      <div className="wish-card-head">
        <div>
          <div className="wish-badges">
            <span>{kindLabel(item.wish_kind)}</span>
            <span>Prioridad {priorityLabel(item.wish_priority).toLowerCase()}</span>
            {item.status === "done" && <span>Cumplido</span>}
          </div>
          <h4>{item.title}</h4>
        </div>
        <div className="wish-card-actions">
          <button type="button" className="link" onClick={onEdit}><Icon name="editar" /> Cambiar</button>
          <button type="button" className="link danger" onClick={onDelete}><Icon name="borrar" /> Borrar</button>
        </div>
      </div>
      {(item.wish_reason || item.wish_place || item.wish_estimated_price || item.wish_notes || item.wish_url) && (
        <div className="wish-card-details">
          {item.wish_reason && <p><strong>Por qué</strong><br />{item.wish_reason}</p>}
          {item.wish_place && <p><strong>Lugar</strong><br />{item.wish_place}</p>}
          {item.wish_estimated_price && (
            <p><strong>Precio estimado</strong><br />{item.wish_estimated_price} {item.wish_currency || ""}</p>
          )}
          {item.wish_notes && <p className="wish-wide"><strong>Notas</strong><br />{item.wish_notes}</p>}
          {item.wish_url && (
            <p className="wish-wide">
              <a href={item.wish_url} target="_blank" rel="noreferrer">Abrir enlace</a>
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        className={item.status === "done" ? "secondary" : ""}
        disabled={busy}
        onClick={onStatus}
      >
        {busy ? "Guardando…" : item.status === "done" ? "Volver a pendientes" : "Marcar como cumplido"}
      </button>
    </article>
  );
}

function ListEditor({ initial, busy, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  return (
    <form
      className="wish-list-editor card"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name: name.trim(), description: description.trim() || null });
      }}
    >
      <h3>{initial ? "Editar lista" : "Nueva lista"}</h3>
      <label>
        Nombre
        <input required autoFocus maxLength="120" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Descripción
        <textarea rows="3" maxLength="1000" value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar lista"}</button>
        <button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}

export default function DeseosBoard({
  items,
  loadLists,
  createList,
  updateList,
  deleteList,
  createWish,
  updateWish,
  updateWishStatus,
  askRemove,
  setError,
}) {
  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(null);
  const [addingList, setAddingList] = useState(false);
  const [editingList, setEditingList] = useState(null);
  const [confirmingListDelete, setConfirmingListDelete] = useState(false);
  const [addingWish, setAddingWish] = useState(false);
  const [editingWish, setEditingWish] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);
  const [kind, setKind] = useState("");
  const [priority, setPriority] = useState("");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    let live = true;
    loadLists()
      .then((data) => {
        if (live) setLists(data.items || []);
      })
      .catch((error) => setError(error.message));
    return () => {
      live = false;
    };
  }, [loadLists, setError]);

  const selectedList = lists.find((list) => list.id === selectedListId) || null;
  const listItems = selectedList ? wishesInList(items, selectedList) : [];
  const filtered = useMemo(
    () => listItems
      .filter((item) => !kind || (item.wish_kind || "otro") === kind)
      .filter((item) => !priority || (item.wish_priority || "media") === priority)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
    [listItems, kind, priority],
  );
  const pending = filtered.filter((item) => item.status !== "done");
  const done = filtered.filter((item) => item.status === "done");

  async function saveList(payload) {
    setBusy(true);
    setError("");
    try {
      if (editingList) {
        const saved = await updateList(editingList.id, payload);
        setLists((current) => current.map((list) => list.id === saved.id ? { ...list, ...saved } : list));
        setEditingList(null);
      } else {
        const saved = await createList(payload);
        setLists((current) => [...current, saved]);
        setAddingList(false);
        setSelectedListId(saved.id);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeList() {
    setBusy(true);
    setError("");
    try {
      await deleteList(selectedList.id);
      setLists((current) => current.filter((list) => list.id !== selectedList.id));
      setSelectedListId(null);
      setConfirmingListDelete(false);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveWish(payload) {
    setBusy(true);
    setError("");
    try {
      if (editingWish) {
        await updateWish(editingWish.id, payload);
        setEditingWish(null);
      } else {
        await createWish(payload);
        setAddingWish(false);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(item) {
    setBusyItemId(item.id);
    setError("");
    try {
      await updateWishStatus(item.id, item.status === "done" ? "open" : "done");
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyItemId(null);
    }
  }

  if (!selectedList) {
    return (
      <div className="wishes-board">
        <div className="wish-hero">
          <div>
            <h2>Tus listas privadas</h2>
            <p className="private">Guarda posibilidades sin fecha y ordénalas cuando quieras.</p>
          </div>
          {!addingList && <button type="button" onClick={() => setAddingList(true)}>+ Nueva lista</button>}
        </div>
        {addingList && <ListEditor busy={busy} onSubmit={saveList} onCancel={() => setAddingList(false)} />}
        {lists.length ? (
          <div className="wish-list-grid">
            {lists.map((list) => {
              const own = wishesInList(items, list);
              const openCount = own.filter((item) => item.status !== "done").length;
              const doneCount = own.filter((item) => item.status === "done").length;
              return (
                <article className="wish-list-card" key={list.id}>
                  <p className="wish-list-kicker">{list.is_default ? "Lista general" : "Lista privada"}</p>
                  <h3>{list.name}</h3>
                  <p>{list.description || "Sin descripción."}</p>
                  <div className="wish-list-counts">
                    <span>{openCount} pendiente{openCount === 1 ? "" : "s"}</span>
                    <span>{doneCount} cumplido{doneCount === 1 ? "" : "s"}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedListId(list.id)}>Abrir lista completa</button>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="private">Preparando tu lista general…</p>
        )}
      </div>
    );
  }

  return (
    <div className="wishes-board">
      <button type="button" className="link wish-back" onClick={() => setSelectedListId(null)}>← Todas las listas</button>
      <div className="wish-hero">
        <div>
          <p className="wish-list-kicker">{selectedList.is_default ? "Lista general" : "Lista privada"}</p>
          <h2>{selectedList.name}</h2>
          <p className="private">{selectedList.description || "Sin descripción."}</p>
        </div>
        <div className="wish-hero-actions">
          <button type="button" onClick={() => { setEditingWish(null); setAddingWish(true); }}>+ Añadir deseo</button>
          <button type="button" className="secondary" onClick={() => setEditingList(selectedList)}>Editar lista</button>
          {!selectedList.is_default && (
            <button type="button" className="secondary danger" onClick={() => setConfirmingListDelete(true)}>Borrar lista</button>
          )}
        </div>
      </div>

      {editingList && <ListEditor initial={editingList} busy={busy} onSubmit={saveList} onCancel={() => setEditingList(null)} />}
      {confirmingListDelete && (
        <section className="wish-delete-list card">
          <p><strong>¿Borrar «{selectedList.name}»?</strong></p>
          <p className="private">Sus deseos no se perderán: pasarán a «Mis deseos».</p>
          <div className="actions">
            <button type="button" className="danger" disabled={busy} onClick={removeList}>Sí, borrar lista</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setConfirmingListDelete(false)}>Cancelar</button>
          </div>
        </section>
      )}
      {addingWish && (
        <section className="wish-editor card">
          <h3>Nuevo deseo</h3>
          <WishForm lists={lists} defaultListId={selectedList.id} busy={busy} onSubmit={saveWish} onCancel={() => setAddingWish(false)} />
        </section>
      )}
      {editingWish && (
        <section className="wish-editor card">
          <h3>Editar deseo</h3>
          <WishForm key={editingWish.id} initial={editingWish} lists={lists} defaultListId={selectedList.id} busy={busy} onSubmit={saveWish} onCancel={() => setEditingWish(null)} />
        </section>
      )}

      <div className="wish-section-head">
        <div>
          <h3>Pendientes</h3>
          <p className="private">{pending.length} deseo{pending.length === 1 ? "" : "s"}</p>
        </div>
        <div className="wish-filters">
          <select aria-label="Tipo" value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">Todos los tipos</option>
            {WISH_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select aria-label="Prioridad" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">Todas las prioridades</option>
            {WISH_PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {pending.length ? (
        <div className="wish-card-list">
          {pending.map((item) => (
            <WishCard
              key={item.id}
              item={item}
              busy={busyItemId === item.id}
              onEdit={() => { setAddingWish(false); setEditingWish(item); }}
              onDelete={() => askRemove(item)}
              onStatus={() => toggleStatus(item)}
            />
          ))}
        </div>
      ) : (
        <p className="private wish-empty">No hay deseos pendientes con estos filtros.</p>
      )}

      <section className="wish-done">
        <button type="button" className="link" onClick={() => setShowDone(!showDone)}>
          {showDone ? "Ocultar" : "Mostrar"} {done.length} cumplido{done.length === 1 ? "" : "s"}
        </button>
        {showDone && (
          <div className="wish-card-list">
            {done.map((item) => (
              <WishCard
                key={item.id}
                item={item}
                busy={busyItemId === item.id}
                onEdit={() => { setAddingWish(false); setEditingWish(item); }}
                onDelete={() => askRemove(item)}
                onStatus={() => toggleStatus(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
