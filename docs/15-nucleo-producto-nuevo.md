# Núcleo: producto nuevo (código viejo congelado)

Decisión **26 oct 2026**, opción acordada con Modesto: **producto nuevo, código viejo congelado**.

## Qué está congelado

- **`apps/web/`** — Impersia OS legacy (Agenda, Casa, Proyectos, Reuniones, etc.).
- URL en producción: **https://impersia.cloud/app/**
- Regla: **solo mantenimiento crítico** (seguridad, caídas). No nuevas funciones ni rediseños ahí.
- La promesa de producto sigue en **`docs/14-promesa-impersia.md`**; la implementación nueva no reutiliza pantallas legacy.

## Qué es Núcleo

- Carpeta: **`apps/nucleo/`**
- URL: **https://impersia.cloud/nucleo/**
- Alcance v1: **Entrada sola** — escribes, archiva con la API existente, ves **dónde quedó** y cuándo saldrá en Hoy. Sin menú de módulos viejos.
- Infra compartida (invisible): auth por cookie, `POST /captures`, PostgreSQL, API en `api.impersia.cloud`.

## Qué viene después (sin fechas rígidas)

1. Pantalla **Hoy** en Núcleo (confianza de devolución).
2. Corregir módulo/fecha sin reescribir.
3. Ampliar solo cuando la prueba de siete días deje de pedir plan B.

## Referencia

- Promesa: `docs/14-promesa-impersia.md`
- Builder y propuestas anteriores: histórico; no mandan sobre Núcleo hasta que se revisen explícitamente.
