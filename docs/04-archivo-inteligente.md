# Archivo inteligente

Documento de decisión (octubre 2026). Impersia promete que la persona escribe como le sale y el sistema archiva solo. Hasta ahora el archivado lo hace `classify.py` con reglas (`source: "rules"`). Eso sirvió para prototipar pantallas y campos, pero **no escala**: cada frase nueva exige un parche. Este documento fija la arquitectura correcta y cómo llega a todos los ejes y módulos sin volver a empezar.

## Decisión

1. **Parar de ampliar reglas** como estrategia principal. Solo se mantienen para lo determinista (fechas, horas, repeticiones, avisos).
2. **El modelo clasifica** eje, módulo, subtipo, título y campos semánticos.
3. **Las correcciones enseñan**: si la persona mueve una entrada de Diario a Tareas del hogar, ese par queda guardado y entra en la siguiente clasificación de esa cuenta.
4. **Las pantallas y tablas ya hechas se conservan**. Cambia el motor de Entrada, no el producto entero.

## Tres capas (escalable)

```
Entrada (texto)
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Extracción determinista (reglas) │  fechas, hora, repite, aviso, split compra
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Clasificador semántico (modelo)  │  eje, módulo, subtipo, título, meta, contenedor
│    + ejemplos de corrección del user │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Validación (esquema fijo)         │  JSON → Pydantic → INSERT en items
└─────────────────────────────────────┘
```

- **Capa 1** no sustituye a la 2: «9 de la tarde» → 21:00 siempre por reglas; «aspiradora» vs «diario reflexivo» siempre por modelo.
- **Capa 3** evita alucinaciones: si el JSON no encaja, reintento o fallback conservador (nota en Diario + aviso en UI), nunca inventar columnas.

## Un solo contrato para los 14 módulos

Todo lo que entra por Entrada devuelve el mismo esqueleto. Los módulos no son tablas distintas: son **variantes de `items`** con `meta` tipado.

| Campo | Quién lo rellena | Notas |
| --- | --- | --- |
| `axis` | modelo | personal, professional, social |
| `module` | modelo | uno de los 14 |
| `kind` | derivado | note, task, event (legacy; el modelo no elige libremente) |
| `title` | modelo + reglas mínimas | núcleo literal de la frase; sin fechas/horas en el título (véase principios arriba) |
| `starts_at`, `repeats`, `time_known`, `alert_minutes_before` | reglas (+ modelo si ambiguo) | |
| `subtype` | modelo | ver catálogo abajo |
| `meta` | modelo | JSON validado por subtipo |
| `container_action` | modelo | `none`, `create`, `attach` |
| `container_hint` | modelo | nombre del proyecto, viaje, espacio… |
| `privacy` | modelo / default | private en v1 |

**`meta` en JSONB** (columna nueva o ampliación progresiva): evita una migración por cada campo nuevo. Lo que ya existe en columnas (`casa_kind`, `agenda_type`…) se sigue leyendo; lo nuevo va a `meta` hasta unificar.

### Aprendizaje de correcciones

Tabla `classification_examples`:

| Columna | Uso |
| --- | --- |
| `user_id` | solo ejemplos de esa cuenta |
| `raw_text` | frase original |
| `label` | JSON correcto (eje, módulo, subtype, meta…) |
| `source` | `correction` (PATCH manual) o `seed` (interno) |
| `created_at` | |

Al archivar:

1. Buscar hasta **8 ejemplos** del usuario (v1: similitud por palabras; v2: embedding con pgvector).
2. Meterlos en el prompt del modelo como «En mi cuenta, esto es así».
3. Cuando la persona **guarda un cambio de módulo o subtipo**, registrar automáticamente un ejemplo si cambió respecto a la propuesta inicial.

Así «Pasar aspiradora a toda la casa» no requiere parche global: basta una corrección tuya.

### Contenedores (proyecto, viaje, espacio)

Muchos módulos comparten la misma lógica: **abrir algo** vs **meter dentro**.

| Contenedor | Módulo dueño | Ejemplo abrir | Ejemplo meter |
| --- | --- | --- | --- |
| Proyecto | proyectos | «Proyecto Capenergy 2026» | «Avanzar foros de Capenergy» |
| Viaje | viajes | «Lisboa 20-24 octubre» | «Reservar hotel en Lisboa» |
| Espacio | espacios | «Boda de Ana, junio» | «Lista de regalos boda Ana» |
| Círculo | circulos | «Reto lectura octubre» | (miembros más adelante) |
| Lista social | listas | «Itinerario Lisboa» | «Añadir museo XYZ al itinerario» |

Tabla `containers` (fase posterior al clasificador v1):

- `id`, `user_id`, `module`, `title`, `status`, `meta`, `created_at`
- `items.container_id` nullable

El modelo devuelve `container_action` + `container_hint`; el servidor resuelve fuzzy contra contenedores abiertos del usuario.

---

## Catálogo por eje y módulo

Referencia para el prompt del modelo y para validación. **Subtipo** = variant perfeccionada (como `casa_kind` o `agenda_type` hoy).

### Vida personal

| Módulo | Subtipos | meta principal | Patrón de UI |
| --- | --- | --- | --- |
| **agenda** | medica, familiar, ocio, recordatorio, general | persona, lugar, notas, tipo festivo/ocio… | calendario + ficha (hecho) |
| **casa** | compra, inventario, domestica, mantenimiento, suministro | cantidad, dónde, supply_kind, shopping_list… | checklist / lista / secciones (hecho) |
| **habitos** | rutina, ejercicio, sueno, lectura, otro | objetivo, frecuencia, recordatorio | checklist + racha (futuro) |
| **viajes** | plan, reserva, equipaje, nota | fechas viaje, destino, container_id | dentro de contenedor viaje |
| **diario** | entrada, animo, reflexion | mood, tags | línea temporal, sin checklist |
| **deseos** | lugar, cosa, experiencia, otro | sin fecha obligatoria | lista suelta, enlazable desde ocio |

**Desambiguación clave**

- Con **fecha/hora concreta** y cita social → **agenda** (ocio/familiar), no módulo social.
- **Comprar X** → casa.compra; **quedan N X** → casa.inventario; **aspirar, basura, lavadora** → casa.domestica.
- **He dormido mal, me siento…** → diario; **tarea doméstica** no es diario aunque no lleve fecha.
- **Quiero ir al restaurante X** sin fecha → deseos; con fecha → agenda.ocio.

### Profesional

| Módulo | Subtipos | meta principal | Patrón de UI |
| --- | --- | --- | --- |
| **proyectos** | contenedor, tarea, hito, entrega | proyecto_nombre, deadline, prioridad | lista bajo proyecto (contenedor) |
| **reuniones** | cita, acta, seguimiento | participantes, lugar, enlace | agenda compartida + notas post |
| **memoria** | apunte, lectura, guia, referencia | fuente, tags, embedding_id | búsqueda semántica (pgvector) |
| **ideas** | borrador, propuesta, hipotesis | sin contenedor obligatorio | inbox ligero → promover a proyecto |

**Desambiguación**

- «Llamada con proveedor martes 11:00» → reuniones.cita (eje professional), no agenda personal.
- «Nota sobre búsqueda semántica» → memoria; «Idea: Impersia entra por…» → ideas.
- Si menciona **proyecto concreto** → attach/create contenedor proyectos.

### Social

| Módulo | Subtipos | meta principal | Patrón de UI |
| --- | --- | --- | --- |
| **muro** | avance, lectura, hito | visibilidad futura public | borrador privado |
| **listas** | itinerario, regalos, checklist_compartida | container, compartido | lista (como compra, compartible) |
| **circulos** | reto, habito_grupo | miembros (futuro) | grupo pequeño |
| **espacios** | viaje_conjunto, evento, trabajo_equipo | coorganizadores | contenedor compartido |

**Regla de producto:** Social **no es calendario**. Plan con fecha va a Agenda (personal). Social es **compartir** listas, espacios y muro.

---

## Qué no hace falta repetir por módulo

| Necesidad | Solución única |
| --- | --- |
| Clasificar texto | Un endpoint, un prompt, catálogo arriba |
| Aprender | Una tabla `classification_examples` |
| Fechas en español | Una lib de extracción temporal |
| Listas con checks | Un componente `CasaChecklist` reutilizable (compra, domestica, hábitos, listas sociales) |
| Contenedores | Una tabla `containers` + `container_id` en items |
| Privacidad | Tres niveles ya en esquema; el modelo propone, default private |

Cada módulo nuevo = **entrada en el catálogo** + **pantalla** que consume `items` filtrados; no un nuevo `if "aspiradora" in low".

---

## Principios de Entrada (decisión de producto)

Tres reglas que el archivado debe cumplir; hoy solo la compra cumple parte del punto 2.

### 1. Título fiel al texto

- El **título** guardado debe ser la **frase útil de la persona**, no un resumen inventado por reglas o por el modelo.
- Las reglas **solo quitan** ruido temporal («mañana», «a las 18», «cada lunes») y espacios; **no reescriben** («Cumpleaños de Eva», «Recordatorio · …») salvo que el usuario lo haya dicho casi igual.
- Lo demás (edad, fecha del cumple real, sitio) va a **notas / meta**, no al título.
- El prompt del modelo debe pedir **copiar el núcleo literal**, no «titular de prensa».

### 2. Una Entrada → varios registros

- Una sola captura puede crear **varios `items`**, todos con el mismo `capture_id`.
- Ejemplo: *«Mañana recuérdame pensar el regalo de Eva; cumple 54 el 9 de noviembre»* puede ser:
  - **Recordatorio** (9 oct): pensar el regalo, con notas «Cumple 54 el 9 nov».
  - Opcional **Celebración** (9 nov, anual): cumpleaños de Eva — **solo si** la frase pide guardar el cumple, no por mencionar la fecha en contexto.
- Hoy: varios ítems solo en **lista de la compra** (`split_compra_titles`). Falta generalizar el contrato del modelo a **lista de acciones** en JSON.

### 3. Sin duplicados

- Antes de insertar, el servidor (con ayuda del modelo o búsqueda en BD) **comprueba** si ya existe algo equivalente para esa cuenta: mismo asunto + misma fecha / misma persona / mismo suministro.
- Si hay duplicado: **no crear otro**; enlazar a la captura actual, actualizar notas o avisar en UI. Si la persona repite a propósito, debe quedar claro (p. ej. segundo ítem con fecha distinta).
- Las correcciones en `classification_examples` enseñan clasificación; la **deduplicación** es otra capa (consulta + criterio), no sustituir una por otra.

**Estado actual (oct 2026):** **varios ítems** por captura; **títulos literales**; **dedup** en `dedup.py` antes de INSERT (mismo módulo, título/fecha/persona/suministro/compra).

---

## Plan de implementación

### Paso A — Archivado v2 (prioridad)

- [x] Títulos fieles: `entry_title()` + servidor ignora title del modelo (oct 2026)
- [x] Multi-ítem: `archive_items()`, prompt `items[]`, split por segmentos (oct 2026)
- [x] Anti-duplicados: `dedup.find_duplicate` + fusión de notas (oct 2026)
- [x] Columna `items.meta` JSONB + tabla `classification_examples` (v0.1)
- [x] Servicio `archive.py`: híbrido reglas + OpenRouter + fallback `classify.py`
- [x] Registrar corrección al PATCH de módulo/subtipo (v0.1)
- [x] `classify.py` como fallback si IA apagada, sin key o error
- [x] Capa `_post_refine` tras IA: suministros, familiar, hábitos, casa domestica/mantenimiento
- [x] Ejemplos `seed` en cuenta admin (`scripts/seed_archive_hints.py`)
- [ ] Métricas: % acierto, correcciones por semana

**Listo cuando:** 20 frases de prueba (incluidas las que hoy fallan) archivan bien sin añadir reglas, y una corrección tuya mejora la siguiente frase similar.

### Paso B — Congelar UI de módulos existentes

- Casa, Agenda: no más parches de palabras; solo bugs de pantalla.
- Mantenimiento y Suministros: UI mínima con componentes ya hechos, **después** del paso A.

### Paso C — Contenedores

- Proyectos y viajes primero (mayor valor profesional/personal).
- Entrada distingue abrir vs meter dentro.

### Paso D — pgvector

- Segunda memoria y búsqueda de ejemplos de corrección por similitud.
- No antes de que A esté estable.

---

## Reglas que se quedan (para siempre)

- Literales de fecha y hora en español
- «Cada lunes / cada día / cada mes»
- Avisos («15 minutos antes», «sin aviso»)
- Split de lista de la compra en varias líneas (puede ser regla o modelo; si el modelo falla, regla de respaldo)
- Validación de esquema antes de guardar

## Reglas que se jubilan

- Listas de palabras por módulo (`CASA_KINDS`, parches «aspiradora», «garrafa»…)
- Default «si no encaja → Diario» (sustituir por: modelo + fallback explícito a nota/diario con baja confianza registrada)

---

## Relación con el roadmap

La **Fase 1** del roadmap («el modelo archiva solo») **no está cerrada** mientras el motor sea solo reglas. El trabajo de Casa y Agenda en pantallas **sí cuenta** para Fase 2; el siguiente hito crítico es **Paso A** de este documento, no pulir más secciones con parches.

Cuando el archivado v2 funcione, los módulos pendientes (Hábitos, Viajes, Proyectos, Social…) entran **uno por uno en UI**, reutilizando el mismo clasificador y catálogo — no reimplementando un cerebro por módulo.
