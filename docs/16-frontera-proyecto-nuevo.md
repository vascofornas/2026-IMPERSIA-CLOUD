# Frontera: proyecto nuevo vs Impersia OS

Modesto notó que, aunque la pantalla se sienta nueva, **seguía siendo trabajo sobre el Impersia anterior**. Esta nota fija la línea para no confundirnos.

## Dos cosas distintas en el mismo repo

| | **Impersia OS** (congelado) | **Proyecto nuevo** (activo) |
|---|---|---|
| Código UI | `apps/web/` | `apps/nucleo/` |
| URL | `/os/` (antes `/app/`) | `/nucleo/` — **impersia.cloud abre aquí** |
| Datos al escribir | `captures` → `items` (Agenda, Casa, Proyectos…) | `nucleo_releases` |
| Archivador | `archive.py`, clasificador, módulos | **No se usa** |
| Regla | Solo mantenimiento crítico | Aquí crece la promesa (`docs/14`) |

Compartido a propósito (invisible): servidor, PostgreSQL, tabla `users`, login con correo. Eso es **infra**, no el producto viejo.

## Qué implica “desde cero”

1. Lo que sueltas en `/nucleo/` **no rellena** Proyectos, Reuniones ni el resto del OS.
2. **Hoy**, clasificar y devolver se **construyen otra vez** sobre `nucleo_releases`, no copiando pantallas de `/app/`.
3. Issues y mejoras de producto nuevas → `apps/nucleo` + `/nucleo/*` en la API. No “un módulo más” en el OS.

## Si vuelve la sensación de parche

Pregunta útil: *¿esto escribe o lee del OS legacy (`items`, `archive`)?*  
Si sí → no va al producto nuevo salvo migración explícita acordada.
