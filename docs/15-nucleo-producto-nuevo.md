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
- Alcance v1: **soltar y confiar** — una pantalla de escritura, confirmación humana al guardar. Sin menú, sin nombres de módulos del OS viejo en la UI.
- Infra compartida (invisible): auth por cookie, `POST /captures`, PostgreSQL, API en `api.impersia.cloud`. El usuario **no** debe ver enlaces, badges ni textos del producto congelado.

## Reglas de experiencia (anti-parche)

- Prohibido en la interfaz: «app anterior», «Núcleo» como etiqueta, «Entrada/Archivar», logo del cuaderno legacy, «la misma cuenta que antes».
- Lenguaje del producto nuevo: **soltar**, **recogido**, **te lo devolvemos**.
- Legacy solo en documentación interna y en `/app/` para quien entre a mano; no se promociona desde Núcleo.

## Qué viene después (sin fechas rígidas)

1. Pantalla **Hoy** en Núcleo (confianza de devolución).
2. Corregir módulo/fecha sin reescribir.
3. Ampliar solo cuando la prueba de siete días deje de pedir plan B.

## Referencia

- Promesa: `docs/14-promesa-impersia.md`
- Builder y propuestas anteriores: histórico; no mandan sobre Núcleo hasta que se revisen explícitamente.
