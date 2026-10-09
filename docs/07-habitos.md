# Bienestar y Hábitos — decisión de producto y plan (eje A)

Referencia PDF (eje Vida personal): **«Rutinas diarias (ejercicio, meditación, lectura), seguimiento de hábitos y registro de salud/sueño.»**

Octubre 2026. Pantalla **distinta** de Agenda (calendario/citas) y Casa (logística del hogar).

## Tres piezas del módulo (documento padre)

| Pieza | Qué es | Entrada (ejemplos) | En pantalla |
| --- | --- | --- | --- |
| **1. Rutinas diarias** | Prácticas que **repites** (con frecuencia u hora) | «Cada día meditar 10 min», «Yoga lunes y miércoles 7:00», «Leer antes de dormir» | Bloque **Hoy** + **Tus rutinas**; check del día |
| **2. Seguimiento de hábitos** | Ver si **cumples** esas rutinas en el tiempo | (no suele ser una frase nueva; nace del check diario) | Bloque **Seguimiento**: últimos días / semana por hábito (v1 simple; rachas después) |
| **3. Registro salud / sueño** | **Anotación puntual** de un día (dato o nota breve) | «Anoche dormí 6 horas», «Me desperté 3 veces», «Peso 72,4 hoy», «Tensión 120/80» | Bloque **Registro**: línea temporal reciente (sueño, salud) |

No confundir con **Diario**: reflexión de ánimo sin síntoma físico («me siento triste», «estoy agotado emocionalmente») → **diario**. **Registro** en habitos: sueño con dato o mención clara, peso/tensión, y **malestar físico** (resfriado, gripa, fiebre, dolor…) aunque sea en prosa.

## Desambiguación con Agenda y Casa

| Frase | Destino |
| --- | --- |
| Cada lunes yoga 7:00 | habitos · rutina/ejercicio |
| Clase de yoga el lunes 14 | agenda · ocio |
| Sacar basura cada noche | casa · doméstica |
| Anoche 7 h de sueño | habitos · registro sueño |
| Hoy estoy hecho polvo (ánimo, sin síntoma) | diario |
| Me desperté con un resfriado fuerte | habitos · registro salud |

## Referencia visual (app bienestar — onboarding + dashboard)

Modesto comparte un mock de **dashboard holístico** (hero de rutina, tareas de hoy, sueño/pasos). Encaja con el espíritu del módulo; la integración en Impersia **no copia** esa app ni su navegación inferior.

| Idea del mock | En Impersia | Cuándo |
| --- | --- | --- |
| Onboarding 3 pasos (intereses, «día ideal», Apple Health) | **No** wizard inicial. Lo mismo vía **Entrada** («medito a las 7, leo a las 22») + archivado. Intereses opcionales en **Perfil** más adelante. | v1 Entrada; v2 preferencias |
| Rutina **mañana / día / noche** | Agrupar rutinas por **franja** (mañana, tarde, noche) según hora ancla. | v1 UI |
| **Hero** «Rutina mañanera activada» | Tarjeta destacada: la **siguiente rutina** de la franja actual (o la más urgente por hora). Botón **Marcar hecho**. | v1 Hábitos + eco en **Hoy** |
| **Tareas de hoy** (checks) | Lista checklist del día (ejercicio, meditación, agua…). | v1 |
| Progreso **3/8 vasos** | Hábito con **meta numérica** en `meta` (contador). | v1.1 |
| Gráficos sueño / pasos | Bloque **Registro** + resumen compacto (última noche, 7 días simple). Sync **Apple Health / Health Connect** → roadmap. | v1 texto; v2 sync |
| Pestaña aparte **Salud** | **No**: salud/sueño viven **dentro de Hábitos** (PDF). Impersia ya tiene **Hoy**, **Entrada**, ejes en lateral. | — |
| **Inicio / Contenido** | **Hoy** = inicio del día (citas + rutinas). Contenido editorial fuera de alcance. | — |

Principio: **menos fricción que el mock** (sin configurar antes de usar), **misma claridad visual** (hero + lista + datos de bienestar).

## Identidad de pantalla

Metáfora: **dashboard de bienestar del día**, no calendario ni logística del hogar.

### Layout `HabitosBoard`

1. **Hero (prioridad 1)** — Rutina de la franja actual o la siguiente; progreso opcional; CTA marcar hecho.
2. **Tareas de hoy** — Checklist de rutinas que tocan hoy, agrupadas Mañana · Tarde · Noche si hay hora.
3. **Seguimiento** — Mini rejilla 7 días por hábito (como el mock pero sobrio, color Impersia).
4. **Registro** — Sueño y salud recientes (tarjetas, no hospital); en v1 sin gráficos pesados.

Estilo: `.habitos-board`, verde `#4d7c0f`, tarjetas con aire; iconografía del módulo.

### Hoy (pantalla global)

- Cabecera con la fecha y tres **zonas** en tarjeta: **Bienestar** (solo rutinas que tocan hoy + último sueño; enlace «Ver todo» al módulo), **Para hoy** (citas con fecha), **Próximos**.
- En Bienestar no se repite la rejilla de 7 días; el seguimiento completo está en **Bienestar y hábitos**.

## Datos y archivado

Dos formas de ítem en `module = habitos`:

| Tipo lógico | `habit_role` | Campos clave |
| --- | --- | --- |
| Rutina (seguimiento) | `routine` | `repeats`, `starts_at`, `time_known`, `habit_kind`: rutina \| ejercicio \| meditacion \| lectura \| otro |
| Registro (puntual) | `log` | `starts_at` = día del registro, sin `repeats`; `habit_kind`: sueno \| medicacion \| presion \| glucosa \| peso \| sintoma \| salud \| otro; `habit_notes` (horas, mmHg, mg/dL, kg…) |

El **seguimiento** no es un tercer ítem: son **marcas por día** sobre rutinas (excepciones/hecho, mismo motor que series).

- Título: **`entry_title()`**.
- Archivado: prompt + `_post_refine`; ejemplos seed; desvío «cada + actividad» → routine; «dormí N horas / peso / tensión» → log.

## Plan de trabajo

| Paso | Entrega |
| --- | --- |
| 1 | Migración: `habit_kind`, `habit_role`, `habit_notes` (o `meta` tipado) |
| 2 | Archivado + frases de prueba (rutinas + registros + casos Diario/Agenda) |
| 3 | **HabitosBoard** (3 bloques) + estilos |
| 4 | Seguimiento 7 días + checks en **Hoy** |
| 5 | Pruebas y cierre del bloque |

## Frases de prueba

**Rutinas:** cada día caminar 30 min; yoga lunes y miércoles 7:00; leer 20 min cada noche.  
**Registro:** anoche dormí 6 horas; peso 72,4 esta mañana; me desperté a las 3.  
**No Hábitos:** clase pilates viernes 10:00 (Agenda); he dormido fatal (Diario).

## Vista por periodo (salud y sueño)

Pregunta de producto: «¿Cómo he estado de salud este mes?» No es Agenda ni Diario: son **registros puntuales** (`habit_role = log`) que, juntos, cuentan una historia en el tiempo.

### Qué hay hoy

- **Registro → Salud / Sueño**: selector de **mes**, resumen del periodo y listas por **semana**.
- Archivado: Entrada natural clasifica sueño, medicación, tensión, glucosa, peso y síntomas en `habit_kind` fino; lo genérico queda en `salud` u `otro`.

### Principios

1. **Un registro = un momento** (dormí 7 h, resfriado, peso 72,4). No inventar días sin dato.
2. **Salud** (síntomas, peso, tensión, notas físicas) y **sueño** comparten la idea de «línea temporal», pero **bloques separados** en pantalla (como ahora).
3. **Diario** sigue fuera: ánimo/reflexión sin síntoma físico no entra en esta vista.
4. Tono **personal**, no clínico: ayuda a repasar, no a diagnosticar.

### v1 — «Este mes» (web, oct 2026)

Dentro de **Bienestar y hábitos → Registro**:

| Elemento | Comportamiento |
| --- | --- |
| **Selector de periodo** | «Este mes» por defecto; flechas mes anterior / siguiente (calendario natural, no últimos 30 días sueltos). |
| **Resumen arriba** | Una línea: p. ej. «12 apuntes · 4 de sueño · resfriado del 3 al 8 oct». Heurística simple sobre títulos/`habit_kind`, sin IA en v1. |
| **Lista agrupada** | Entradas del mes agrupadas por **semana** (Semana del 7 oct…) o lista continua con fechas claras. |
| **Vacío** | «Nada apuntado en octubre. Escríbelo en Entrada.» |
| **Hoy** | Sin cambiar la lógica: último sueño + rutinas; enlace «Ver todo» al módulo con el mes actual ya seleccionado. |

Implementación: filtrar ítems `habit_kind ∈ {sueno, salud, …}` por `created_at` (o día del registro) en el mes; sin API nueva si el cliente ya tiene todos los ítems.

### v1.1 — Métricas que se repiten

Cuando el archivado deja **número** en `habit_notes` (peso, horas de sueño, tensión):

- **Sueño**: mini gráfica de barras o puntos **7–31 días** (horas por noche).
- **Peso / tensión**: misma idea solo si hay **≥3** valores numéricos en el mes; si no, solo lista.

### v2 (futuro, doc 07 ya apuntaba)

Wearables, rachas largas, correlaciones (sueño vs síntomas). No bloquear v1.

### Registro «clínico ligero» (mayores, crónicos — decisión oct 2026)

**Sí, encaja en Impersia**, con límites claros: cuaderno personal y línea temporal, **no** historia clínica ni sustituto del médico/farmacia.

| Tipo | Entrada (Ejemplos) | Modelo |
| --- | --- | --- |
| **Medicación (toma hecha)** | «Tomé la pastilla de la tensión», «Insulina 8 unidades antes de cenar» | `log` · `habit_kind`: **medicacion** · notas = dosis/nombre si se detecta |
| **Presión arterial** | «Tensión 128/82 esta mañana», «PA 130/85 en reposo» | `log` · **presion** · `habit_notes` = «128/82 mmHg» |
| **Glucosa / azúcar** | «Glucosa 142 después de comer», «Azúcar 95 en ayunas» | `log` · **glucosa** · número en notas |
| **Peso** | «Peso 72,4 hoy» | `log` · **peso** |
| **Síntoma / malestar** | resfriado, dolor, fiebre (ya cubierto) | `log` · **sintoma** (hoy agrupado como `salud`) |
| **Pauta recurrente** | «Cada mañana tomar omeprazol a las 8» | **rutina** (`repeats`), no log; aviso opcional en Agenda si lleva hora |

**Principios UX (edad, enfermedad):**

- Seguir **Entrada en lenguaje natural**; etiquetas visibles grandes en Registro (Pastilla, Tensión, Azúcar…).
- En la vista **mes**: resumen por tipo («14 tomas · 22 tensiones · 8 glucosas») y filtros opcionales, sin pantallas hospitalarias.
- **Medicación**: distinguir *«ya la tomé»* (log) de *«tengo que tomarla cada día»* (rutina + Hoy).
- Disclaimer breve en Registro: datos personales; llevar al médico lo importante.

**v1.2 (hecho):** `HABIT_KINDS` ampliado; reglas en `classify.py`; etiquetas y resumen mensual por subtipo en Registro; edición manual del tipo en el panel de log.

**v1.1 gráficas (hecho):** en Registro, bloque **Medias del mes** (tensión media sist/diast, peso, glucosa, sueño; ≥1 lectura) y «Gráficas del mes» si hay ≥2 lecturas numéricas.

### Controles de salud (v1.3 — plan activo)

**Tipos permitidos (lista cerrada):** `presion`, `glucosa`, `medicacion`, `peso`, `sueno` (horas dormidas). Fuera: diagnósticos, recetas, informes hospitalarios.

**Usuario (sin Entrada para el plan):**

1. **Bienestar → Añadir control:** tipo, frecuencia (cada día / domingos), hora.
2. **Registrar ahora** en Bienestar o **Hoy** cuando toque.
3. **Registro:** historial del mes. Entrada solo para apuntes sueltos («Tensión 120/80»), no para crear el plan.

**Datos:** `health_controls`; lecturas en `items.health_control_id`. API: `POST/GET /health-controls`, `POST …/readings`.

### Fuera de alcance

Informes PDF para el sistema sanitario, recetas electrónicas, interacciones entre fármacos, compartir con terceros, pestaña «Salud» aparte del módulo habitos.

## Fuera de este bloque (futuro)

Rachas largas, gráficos avanzados, wearables, círculos de accountability (Social), objetivos numéricos complejos.
