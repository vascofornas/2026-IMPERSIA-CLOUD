# Diario personal — v1

Octubre de 2026. Diario es el espacio privado para contar lo vivido, ordenar pensamientos y registrar el ánimo. No es una lista de tareas ni un registro clínico.

## Escritura

- **Libre:** texto largo con fecha, tipo, ánimo, energía y etiquetas opcionales.
- **Guiada:** mantiene un texto principal y añade tres preguntas opcionales: qué pasó, qué agradezco y qué necesito.
- También recibe reflexiones escritas en **Entrada**. El texto completo se conserva; el título es solo un extracto.

## Pantalla

- Línea temporal por fecha vivida, no por fecha de creación.
- Ficha resumida que se abre completa.
- Edición y borrado desde la propia línea temporal.
- Filtros por mes, ánimo, tipo y etiqueta.
- Evolución mensual con ánimo y energía declarados, cantidad de entradas por tramos de siete días y etiquetas frecuentes.
- El contenido no aparece en Hoy ni en Agenda.

La evolución es descriptiva. No rellena los días sin valoración, no interpreta los datos y no presenta diagnósticos.

## Límites

- Reflexión, emoción o relato personal → **Diario**.
- Síntoma físico, tensión, glucosa, peso o sueño medido → **Bienestar**.
- Acción pendiente con fecha → **Agenda**, Casa o Proyectos según corresponda.
- Idea que se quiere desarrollar → **Ideas**.
- Información que se quiere recuperar como conocimiento → **Segunda memoria**.

La fecha o franja del relato no lo convierte en cita. «Esta tarde estoy contento porque he comido con Eva y hemos visto una serie» es Diario: cuenta algo ya vivido. «Mañana voy a comer con Eva a las 14» es Agenda/Ocio: es un compromiso futuro.

## Análisis automático

Está desactivado por cuenta hasta aceptarlo en Perfil. Al activarlo:

1. Un proceso diario prepara, cuando hay al menos dos entradas, una lectura de la semana y otra del mes.
2. Solo envía al modelo las entradas del periodo concreto.
3. Devuelve resumen, temas repetidos y hasta tres preguntas de reflexión.
4. No diagnostica, no da consejos médicos y no presenta inferencias como hechos.
5. Cada resumen se puede borrar y se regenera cuando cambian sus entradas.

El uso del modelo queda registrado como `journal_summary` en el control de costes existente.

## Datos

- `journal_entries`: ficha 1:1 con `items`, texto completo y metadatos.
- `journal_summaries`: derivados semanales y mensuales por cuenta.
- `users.journal_ai_enabled`: consentimiento del análisis.
- Migración: `019_diario.sql`.

Las entradas antiguas que solo tienen título siguen apareciendo y se convierten en ficha completa al editarlas.
