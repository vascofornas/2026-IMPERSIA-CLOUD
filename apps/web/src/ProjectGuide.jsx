import { useEffect, useMemo, useRef, useState } from "react";

const FIRST_QUESTION = {
  key: "project_idea",
  type: "textarea",
  label: "Cuéntame qué quieres sacar adelante. Puedes escribirlo con tus palabras.",
  required: true,
};

function draftValue(draft, key) {
  if (key.startsWith("custom.")) return draft.custom_values?.[key.split(".", 2)[1]] ?? "";
  if (key === "work_types") return draft.work_types || [];
  return draft[key] ?? "";
}

function displayAnswer(question, answer) {
  if (answer === "__skip__") return "Prefiero dejarlo para después";
  if (Array.isArray(answer)) {
    return answer.map((value) => question.options?.find((item) => item.key === value)?.label || value).join(", ");
  }
  return question.options?.find((item) => item.key === answer)?.label || String(answer);
}

function AnswerControl({ question, value, onChange }) {
  if (question.type === "single") {
    return (
      <div className="project-guide-options single">
        {(question.options || []).map((option) => (
          <button
            type="button"
            key={String(option.key)}
            className={value === option.key ? "on" : ""}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }
  if (question.type === "multiple") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="project-guide-options multiple">
        {(question.options || []).map((option) => (
          <button
            type="button"
            key={String(option.key)}
            className={selected.includes(option.key) ? "on" : ""}
            onClick={() => onChange(selected.includes(option.key)
              ? selected.filter((item) => item !== option.key)
              : [...selected, option.key])}
          >
            <span>{selected.includes(option.key) ? "✓" : "+"}</span>{option.label}
          </button>
        ))}
      </div>
    );
  }
  if (question.type === "textarea") {
    return <textarea autoFocus rows="4" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }
  return (
    <input
      autoFocus
      type={["date", "number", "url"].includes(question.type) ? question.type : "text"}
      step={question.type === "number" ? "any" : undefined}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter" && question.type !== "textarea") event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

function DraftPreview({ draft, templates }) {
  const template = templates.find((item) => item.id === draft.template_id);
  const definition = template?.definition || {};
  const workLabels = (draft.work_types || []).map(
    (key) => definition.work_types?.find((item) => item.key === key)?.label || key,
  );
  return (
    <aside className="project-guide-preview">
      <p className="project-kicker">Ficha en preparación</p>
      <h3>{draft.title || "Nuevo proyecto"}</h3>
      <dl>
        <div><dt>Plantilla</dt><dd>{template?.name || "Por decidir"}</dd></div>
        <div><dt>{template?.terminology?.client || "Cliente"}</dt><dd>{draft.client_name || "Sin indicar"}</dd></div>
        <div><dt>Tipos</dt><dd>{workLabels.join(", ") || "Sin indicar"}</dd></div>
        <div><dt>Fecha objetivo</dt><dd>{draft.due_date || "Sin fecha"}</dd></div>
        <div><dt>Prioridad</dt><dd>{draft.priority || "Media"}</dd></div>
      </dl>
      {draft.description && <p className="project-guide-description">{draft.description}</p>}
      {(definition.fields || []).some((field) => draft.custom_values?.[field.key] !== undefined) && (
        <div className="project-guide-custom">
          {(definition.fields || []).filter((field) => draft.custom_values?.[field.key] !== undefined).map((field) => (
            <p key={field.key}><strong>{field.label}</strong><br />{Array.isArray(draft.custom_values[field.key]) ? draft.custom_values[field.key].join(", ") : String(draft.custom_values[field.key])}</p>
          ))}
        </div>
      )}
    </aside>
  );
}

export default function ProjectGuide({ templates, busy: creating, guideStep, onCreate, onCancel, setError }) {
  const [draft, setDraft] = useState({});
  const [answeredKeys, setAnsweredKeys] = useState([]);
  const [question, setQuestion] = useState(FIRST_QUESTION);
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Vamos a crear el proyecto juntos. No necesitas saber de antemano qué campos completar." }]);
  const [ready, setReady] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    setAnswer(draftValue(draft, question?.key || ""));
  }, [question?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const panel = messagesRef.current;
    if (!panel) return undefined;
    const frame = window.requestAnimationFrame(() => {
      panel.scrollTo({ top: panel.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, thinking]);

  const canContinue = useMemo(() => {
    if (!question) return false;
    if (!question.required) return true;
    if (Array.isArray(answer)) return answer.length > 0;
    return answer !== "" && answer !== null && answer !== undefined;
  }, [answer, question]);

  async function sendAnswer(value) {
    if (!question || thinking) return;
    setThinking(true);
    setError("");
    const shown = displayAnswer(question, value);
    setMessages((current) => [...current, { role: "user", text: shown }]);
    try {
      const result = await guideStep({
        draft,
        answered_keys: answeredKeys,
        question_key: question.key,
        answer: value,
      });
      setDraft(result.draft || {});
      setAnsweredKeys(result.answered_keys || []);
      setReady(Boolean(result.ready));
      setQuestion(result.question || null);
      setMessages((current) => [
        ...current,
        { role: "assistant", text: result.reply },
        ...(result.question ? [{ role: "assistant", text: result.question.label, question: true }] : []),
      ]);
    } catch (error) {
      setError(error.message);
    } finally {
      setThinking(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    if (canContinue) sendAnswer(answer);
  }

  function skip() {
    sendAnswer("__skip__");
  }

  return (
    <section className="project-guide">
      <div className="project-guide-main">
        <div className="project-guide-heading">
          <div>
            <p className="project-kicker">Creación guiada por IA</p>
            <h3>Conversa con Impersia</h3>
          </div>
          <button type="button" className="link" onClick={onCancel}>Cancelar</button>
        </div>
        <div ref={messagesRef} className="project-guide-messages" aria-live="polite">
          {messages.map((message, index) => (
            <p key={`${message.role}-${index}`} className={`project-guide-message ${message.role} ${message.question ? "question" : ""}`}>{message.text}</p>
          ))}
          {thinking && <p className="project-guide-message assistant thinking">Estoy ordenando la información…</p>}
        </div>
        {!ready && question && (
          <div className="project-guide-answer">
            {question === FIRST_QUESTION && <p className="project-guide-question">{question.label}</p>}
            <form onSubmit={submit}>
              <AnswerControl question={question} value={answer} onChange={setAnswer} />
              <div className="actions">
                <button type="submit" disabled={!canContinue || thinking}>{thinking ? "Pensando…" : "Continuar"}</button>
                {!question.required && <button type="button" className="secondary" disabled={thinking} onClick={skip}>Ahora no</button>}
              </div>
            </form>
          </div>
        )}
        {ready && (
          <div className="project-guide-ready">
            <p><strong>La ficha está lista.</strong> Nada se guardará hasta que pulses crear.</p>
            <div className="actions">
              <button type="button" disabled={creating} onClick={() => onCreate(draft)}>{creating ? "Creando…" : "Crear proyecto"}</button>
              <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
      <DraftPreview draft={draft} templates={templates} />
    </section>
  );
}
