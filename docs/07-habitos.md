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
| Registro (puntual) | `log` | `starts_at` = día del registro, sin `repeats`; `habit_kind`: sueno \| salud; `habit_notes` / `meta` (horas, calidad…) |

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

## Fuera de este bloque (futuro)

Rachas largas, gráficos, wearables, círculos de accountability (Social), objetivos numéricos complejos.
