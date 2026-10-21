# Propuesta Impersia Builder

**Documento único para estudio y decisión**

| | |
| --- | --- |
| **Proyecto** | Impersia OS → apuesta *Impersia Builder* |
| **Versión del documento** | 1.0 |
| **Fecha** | 21 de octubre de 2026 |
| **Estado** | Propuesta. No es la definición de producto vigente hasta que se apruebe. |
| **Cliente cero** | Ingeniero de software que construye Impersia (Modesto Vasco) |
| **Repositorio de referencia** | `https://github.com/vascofornas/2026-IMPERSIA-CLOUD` |

**Cómo imprimir:** abre este archivo en el visor de Markdown del editor o en GitHub, imprime (A4, márgenes normales). Las secciones están ordenadas para lectura lineal; al final hay una hoja de decisión.

---

## Resumen ejecutivo (una página)

Impersia hoy es un **archivador inteligente muy completo**: Entrada, módulos de vida personal, Proyectos configurables, Reuniones, etc. Eso compite con Notion, Obsidian y decenas de “second brains”. El avance es real técnicamente, pero **el diferencial en el mercado es débil** y **el coste de mantener todos los módulos es alto**.

Esta propuesta **no borra el trabajo hecho**. Cambia la **tesis del producto**:

> **Impersia deja de centrarse en “escribe una vez y archiva” y pasa a “conecta señales reales de tu trabajo (repo, CI, reuniones, despliegues) y ejecuta automatizaciones con IA bajo tu control explícito”.**

Nombre de la apuesta: **Impersia Builder** (modo o línea de producto dentro de la marca Impersia).

- **Cliente ideal v1:** ingeniero de software que lleva producto propio o varios encargos, usa GitHub, tiene reuniones con clientes y **odia mantener el tablero al día**.
- **Promesa:** el estado del proyecto se **deriva de la realidad**; tú **apruebas** las acciones propuestas; todo queda **auditado** y puede vivir en **tu VPS**.
- **MVP:** webhook GitHub + cola de acciones propuestas + tres playbooks + Proyecto Impersia como único caso de estudio obligatorio.

Si apruebas esta propuesta, el siguiente paso de ingeniería es el **Sprint 1** (señales + Cola + playbook post-merge), no más módulos de catálogo.

---

## 1. Por qué la insatisfacción es coherente

### 1.1 Lo que Impersia hace bien hoy

- **Entrada sin fricción** y archivado híbrido (reglas + modelo).
- **Eje personal** operativo: Agenda, Casa, Hábitos, Viajes, Diario, Deseos.
- **Eje profesional** avanzado: plantillas sectoriales, conversación al crear proyecto, workspace Software (tablero, hitos, releases, relaciones, versiones).
- **Reuniones** con calendario laboral y enlace a proyecto.
- **Infraestructura** seria: API, PostgreSQL, despliegue en VPS, privacidad por cuenta.

### 1.2 Lo que el mercado ya resuelve “suficiente”

| Necesidad | Competencia habitual |
| --- | --- |
| Notas y organización | Notion, Obsidian, Apple Notes |
| Tareas y proyectos | Linear, Jira, GitHub Projects |
| Calendario | Google, Apple, Cal.com |
| IA sobre texto | ChatGPT, Notion AI, copilotos genéricos |
| Automatización sin inteligencia | Zapier, n8n |

Añadir **otro cajón** (Memoria, Ideas, Social…) mejora el PDF original pero **no abre un hueco claro** para quien paga o adopta un producto nuevo.

### 1.3 Lo que un ingeniero de software echa en falta

1. **Desfase** entre git/CI/deploy y el estado del “proyecto” en la herramienta.
2. **Trabajo administrativo repetido**: cerrar tareas, actualizar releases, volcar reuniones a tickets.
3. **Desconfianza** hacia agentes que “hacen todo solos” sin evidencia ni aprobación.
4. **Fragmentación** entre IDE, GitHub, calendario, notas y tablero — aunque Impersia unifique notas, **no cierra el loop de acción**.

**Conclusión:** el producto actual es un **life OS + filing** excelente; no es aún un **sistema operativo de acción para builders**.

---

## 2. Nueva tesis de producto

### 2.1 En una frase

**Impersia Builder conecta señales reales de tu trabajo y convierte hechos en estado de proyecto y acciones, con IA y con aprobación explícita del usuario.**

### 2.2 En tres ideas

1. **La realidad manda** (commits, merges, CI, deploys, reuniones cerradas).
2. **La IA propone; la persona dispone** (cola de acciones, no autonomía ciega).
3. **Playbooks reutilizables** sustituyen la proliferación de módulos como estrategia de crecimiento.

### 2.3 Qué NO es

- No sustituye a Cursor, Copilot ni al IDE.
- No es Zapier con un chat encima.
- No es “Devin” ni agente autónomo que programa sin supervisión.
- No es otro Linear con IA generando descripciones.
- No obliga a abandonar el eje personal: queda como **modo secundario** o en mantenimiento hasta que Builder funcione para el cliente cero.

---

## 3. Cliente ideal y problema que paga (o adopta)

### 3.1 Perfil: ingeniero de software (como tú)

- Construye producto propio (Impersia) y/o trabaja con clientes (p. ej. Faro.red).
- Repo en GitHub, despliegue en VPS o cloud, CI conocido.
- Reuniones de alcance y seguimiento; necesita trazabilidad sin burocracia.
- Valora **privacidad**, **control** y **auditoría** más que mil integraciones superficiales.

### 3.2 Jobs to be done (JTBD)

| Cuando… | Quiero… | Para… |
| --- | --- | --- |
| Hago merge a `main` y el deploy está verde | Que el proyecto refleje release y tareas cerradas | No abrir el tablero otra vez |
| Termino una reunión | Que los acuerdos pasen a tareas enlazadas a release | No reescribir lo mismo en tres sitios |
| Escribo una intención en Entrada | Que se dispare un playbook acotado | No rellenar fichas a mano |
| Alguien pregunta “¿por qué decidimos X?” | Recuperar decisión + señal (reunión, commit, nota) | Tener memoria técnica accionable |

### 3.3 Anti-cliente v1

- Equipos grandes con procesos Jira rígidos y compliance externo.
- Usuarios que solo quieren agenda y lista de la compra (ya lo tienen en el ecosistema Apple/Google).
- Quien busca un chat generalista sin anclaje a repo ni despliegue.

---

## 4. Propuesta rompedora frente al mercado

### 4.1 Diferenciadores defendibles

| # | Diferenciador | Por qué importa |
| --- | --- | --- |
| 1 | **Estado del proyecto derivado del repo y CI** | Linear/Jira asumen actualización manual; aquí el tablero es vista + excepciones |
| 2 | **Cola de acciones con aprobación** | Confianza de ingeniero; evita el hype del “agente autónomo” |
| 3 | **Playbooks** (recetas) en lugar de infinitos módulos | Escalar producto sin multiplicar pantallas |
| 4 | **Auditoría** (señal → propuesta → modelo → cambio) | Depuración, costes, responsabilidad |
| 5 | **Self-host / VPS** como ciudadano de primera clase | Alineado con Impersia actual (IONOS) |
| 6 | **Un write, muchas consecuencias controladas** | Entrada sigue; el valor es el **efecto**, no el cajón |

### 4.2 Posicionamiento en una línea

**Impersia Builder es el copiloto operativo del builder solitario: conecta repo, reuniones y despliegues, y convierte hechos en estado de proyecto — con aprobación explícita y datos en tu servidor.**

Comparaciones rápidas:

- Frente a **Notion AI** → actúa sobre **tu stack real**, no solo resume notas.
- Frente a **Linear** → el **repo manda**; el tablero no miente si tú no quieres.
- Frente a **agentes autónomos** → **tú apruebas** cada paso visible.

---

## 5. Arquitectura de producto (conceptual)

### 5.1 Tres pilares

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  SEÑALES    │────▶│  MOTOR + IA      │────▶│  COLA DE ACCIONES   │
│  (hechos)   │     │  (playbooks)     │     │  (aprobar/rechazar) │
└─────────────┘     └──────────────────┘     └─────────────────────┘
       │                      │                         │
       │                      ▼                         ▼
       │              ┌──────────────────┐     ┌─────────────────────┐
       └─────────────▶│ PROYECTO VIVO    │◀────│  AUDITORÍA + COSTE  │
                      │ (Software WS)    │     │  (registro)         │
                      └──────────────────┘     └─────────────────────┘
```

#### Pilar A — Señales (Signals)

Eventos normalizados que entran al sistema:

| Fuente | Ejemplos de señal | Prioridad MVP |
| --- | --- | --- |
| GitHub | push a `main`, PR merged, release, check failed | **Alta** |
| Impersia Reuniones | reunión marcada *hecha* + campo “lo dicho” | **Alta** |
| Entrada | texto con intención de trabajo / playbook manual | **Alta** |
| CI/CD (vía GitHub Actions) | deploy OK / fallo en VPS | Media |
| Google Calendar | cita (solo lectura, ya parcial) | Baja en Builder |
| Futuro | Sentry, Slack, uptime | Después |

Cada señal: timestamp, tipo, payload JSON, proyecto/repo asociado, idempotencia.

#### Pilar B — Cola de acciones (Action Inbox)

Pantalla principal del modo Builder (puede convivir con **Hoy**):

- Lista de **propuestas** agrupadas por señal (“Merge `abc123`: 3 acciones”).
- Cada propuesta muestra: **qué cambiará**, **evidencia**, **coste estimado de IA** (si aplica).
- Acciones: **Aprobar**, **Editar y aprobar**, **Rechazar**, **Aprobar regla similar en el futuro** (auto-aprobación acotada).
- **v1:** ningún cambio en GitHub ni en BD de proyecto sin aprobación, salvo reglas explícitas de bajo riesgo.

#### Pilar C — Proyecto vivo (Living Project)

El workspace Software actual, con semántica nueva:

- **Release (entregable)** sigue siendo la **única dueña de la versión**.
- **Tareas** se cierran por señal + enlace commit/PR en datos del rol.
- **Hitos** avanzan por reglas (p. ej. tareas vinculadas done + release released).
- **Notas** = decisiones técnicas (ADR ligeras), alimentadas por reuniones y merges relevantes.
- **Kanban** = control manual cuando la realidad no alcanza o hay conflicto.

### 5.2 Playbooks (recetas)

Un playbook es una secuencia declarative + pasos IA acotados:

| Playbook | Disparador | Efecto típico (propuesto) |
| --- | --- | --- |
| **Post-merge `main`** | push/merge + CI verde | Cerrar tareas referenciadas, actualizar release, nota opcional |
| **Post-reunión hecha** | status done + outcome | Extraer acuerdos → tareas; enlazar release objetivo |
| **Intención en Entrada** | clasificación profesional | Crear/ampliar piezas en proyecto nombrado |
| **CI rojo en `main`** | check failed | Marcar tarea bloqueada, aviso en Hoy |
| **Resumen semanal** (después) | cron viernes | Borrador desde git + reuniones de la semana |

Los playbooks **reemplazan** la estrategia de “un módulo nuevo cada mes” como motor de valor.

---

## 6. Historia de uso (día concreto)

**Contexto:** acabas de publicar Reuniones v1 en producción.

1. Haces commit y push; GitHub Actions termina en verde; el VPS sirve el nuevo `index-*.js`.
2. Impersia recibe señales `push.main` y `deploy.success` (o un solo evento compuesto configurado).
3. En la **Cola** aparece:  
   - Marcar tarea *Reuniones v1* como hecha.  
   - Poner entregable *Reuniones v1* en *released* con versión `2026.10.12`.  
   - Marcar hito *Calendario laboral operativo* como alcanzado.  
   - Crear nota de decisión: “La reunión no se copia a Agenda; solo el hueco.”
4. Revisas evidencia (commit, health check, diff de archivos si hace falta). **Apruebas en lote** en menos de un minuto.
5. Proyecto Impersia queda coherente **sin abrir el tablero Kanban**.
6. El jueves escribes en Entrada: “Demo de Segunda memoria para Faro la semana que viene”.
7. Playbook de intención propone reunión + tarea + hito; editas y guardas.

Ningún organizador personal genérico cierra este loop con **tu repo** y **tu VPS**.

---

## 7. Relación con Impersia OS actual

### 7.1 Reutilizar y potenciar

| Activo actual | Rol en Builder |
| --- | --- |
| Entrada + archivador | Disparo manual + clasificación inicial |
| `items` + API + auth | Base de datos de elementos y permisos |
| Proyectos Software + relaciones + releases | **Proyecto vivo** |
| Reuniones + enlace proyecto | Señal “reunión hecha” |
| OpenRouter + presupuestos | Pasos IA dentro de playbooks |
| `pgvector` (futuro cercano) | “¿Por qué decidimos X?” sobre decisiones + señales |
| VPS + despliegue actual | Confianza y dogfooding |

### 7.2 Congelar o simplificar (hasta que Builder funcione 1 semana seguida para ti)

| Ámbito | Decisión propuesta |
| --- | --- |
| Plantillas Jurídico / Economía / Personalizada | Mantener código; no invertir UX |
| Viajes, Deseos (pulido extra) | Mantenimiento mínimo |
| Eje Social (muro, círculos…) | Fuera de roadmap Builder |
| Nuevos módulos del PDF “por completar catálogo” | **Stop** |
| Perfeccionar Kanban por encima de la Cola | **Invertir prioridad** |

### 7.3 Modos de producto (opción de UX)

- **Modo Builder** (por defecto para tu cuenta): Cola + Señales + Proyectos + Reuniones + Entrada.
- **Modo Vida** (opcional): Agenda, Casa, Diario, etc., como hoy.

Un solo backend; dos **experiencias de inicio** para no mezclar promesas en marketing.

---

## 8. MVP rompedor (Sprint 1 y siguientes)

### 8.1 Definición de “listo” (MVP Builder)

- Un **deploy real** en Impersia actualiza release y tareas **sin** drag & drop manual.
- Una **reunión hecha** genera propuestas de tareas **visibles en Cola** y aplicables con aprobación.
- **Proyecto Impersia** es el único proyecto obligatorio de dogfooding; si falla el loop, no se añaden features de vida personal.
- **Auditoría:** cada cambio aplicado tiene señal origen + timestamp + usuario aprobador.

### 8.2 Sprint 1 (propuesto, ~2–3 semanas)

| Entrega | Descripción |
| --- | --- |
| Migración SQL | Tablas `signals`, `action_proposals`, `action_runs` (nombres orientativos) |
| Webhook GitHub | Repo `2026-IMPERSIA-CLOUD` ↔ Proyecto Impersia |
| API | Ingesta de señales, generación de propuestas, approve/reject |
| Playbook 1 | Post-merge / push a `main` (reglas + IA mínima) |
| UI **Cola** | Lista, detalle, aprobar en lote |
| Registro | Entrada en `REGISTRO.txt`; despliegue en VPS |

### 8.3 Sprint 2 (orientativo)

- Playbook **post-reunión hecha** (Reuniones → tareas).
- Playbook **Entrada** con proyecto nombrado.
- Reglas de **auto-aprobación** acotadas (p. ej. cerrar tarea si el mensaje de commit incluye id acordado).

### 8.4 Sprint 3 (orientativo)

- Resumen semanal borrador.
- Búsqueda semántica sobre notas de decisión (`pgvector`).
- Primera narrativa pública (build in public) **solo** si el loop es creíble en demo.

---

## 9. Modelo de confianza, privacidad y costes

### 9.1 Principios

- **Privado por defecto** (sin cambio).
- El modelo recibe **solo** el fragmento necesario para el paso del playbook (no historial completo).
- **Presupuesto diario/mensual** OpenRouter ya existente; cada propuesta puede mostrar coste estimado.
- **Nada escribe en GitHub** (comentarios, issues) en v1 sin aprobación explícita por acción.

### 9.2 Auditoría mínima

Por cada acción aplicada:

- id de señal(es);
- playbook y versión;
- propuesta (JSON antes/después);
- aprobador y fecha;
- modelo y tokens (si hubo paso IA).

---

## 10. Métricas de éxito (cliente cero, no inversores)

| Métrica | Objetivo |
| --- | --- |
| Tiempo semanal manteniendo Proyecto Impersia a mano | **< 5 minutos** |
| Cierres de tarea/hito originados en señal + Cola | **> 80 %** |
| Conflictos tablero vs git sin explicación en Cola | **0** |
| Semanas seguidas usando Cola como primera pantalla profesional | **≥ 4** antes de ampliar marketing |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Webhook ruidoso (muchos pushes) | Agrupar por ventana; ignorar ramas que no sean `main` |
| IA propone acciones incorrectas | Cola obligatoria; evidencia visible; editar antes de aprobar |
| Abandono del eje personal en producto | Modo Vida congelado pero no roto; comunicación honesta |
| Complejidad técnica | Un repo, un proyecto, tres playbooks; no generalizar a N clientes en MVP |
| “Otro integrador más” | Enfoque en **estado de proyecto**, no en 500 conectores |

---

## 12. Qué pasa si decides NO

Si rechazas Builder y mantienes la tesis “life OS + archivado”:

- El roadmap vuelve a Memoria, Ideas, Social según `docs/03-roadmap.md`.
- Impersia compite por **completitud** y **UX de módulos**, no por automatización de repo.
- Proyecto Impersia sigue siendo ejemplo manual (como ahora).
- Es una decisión válida si tu prioridad es **producto personal integral**, no **herramienta para builders**.

Este documento **no sustituye** `docs/01-definicion-de-producto.md` hasta que marques la decisión en la sección 13.

---

## 13. Hoja de decisión (imprimible)

Marca y fecha cuando estudies el documento.

### 13.1 Decisión principal

- [ ] **A — Apruebo Impersia Builder** como nueva tesis de producto y prioridad de ingeniería.  
- [ ] **B — Rechazo Builder**; mantengo Impersia OS como archivador / life OS y el roadmap anterior.  
- [ ] **C — Híbrido acotado**: solo Sprint 1 (GitHub + Cola) sin renombrar producto ni congelar módulos.

**Mi elección:** A / B / C (tachar lo que no proceda)

**Fecha:** ___________________

**Firma / iniciales:** ___________________

### 13.2 Preguntas para reflexionar antes de firmar

1. ¿Estoy dispuesto a usar la **Cola** como primera pantalla profesional durante un mes?
2. ¿Acepto **congelar** inversión en módulos Social y en pulido de Viajes/Deseos?
3. ¿GitHub en `2026-IMPERSIA-CLOUD` puede ser la **única** fuente de señal git en MVP?
4. ¿Me basta con **aprobar** acciones (sin auto-merge a GitHub) en los primeros 90 días?
5. ¿El cliente Faro.red entra en v2 o solo Impersia en v1?

### 13.3 Si elijo A — compromisos concretos

- [ ] Crear `docs/01-definicion-de-producto.md` v2 o anexo Builder aprobado.
- [ ] Actualizar `docs/03-roadmap.md` con Builder primero.
- [ ] Ejecutar Sprint 1 (señales + Cola + post-merge).
- [ ] Dogfood exclusivo en Proyecto Impersia hasta cumplir métricas de §10.

### 13.4 Próximo paso inmediato (solo si A o C)

1. Redactar esquema SQL de señales y propuestas.  
2. Registrar app GitHub / webhook en repo Impersia.  
3. Implementar Cola en web (pantalla mínima usable).  
4. Anotar en `REGISTRO.txt` y desplegar en VPS.

---

## 14. Referencias internas

| Documento | Contenido |
| --- | --- |
| `docs/01-definicion-de-producto.md` | Definición vigente (archivador / life OS) |
| `docs/03-roadmap.md` | Roadmap anterior |
| `docs/11-proyectos-profesionales.md` | Workspace Software |
| `docs/12-reuniones.md` | Calendario laboral |
| `REGISTRO.txt` | Diario de cambios desplegados |

---

*Fin del documento — Propuesta Impersia Builder v1.0*
