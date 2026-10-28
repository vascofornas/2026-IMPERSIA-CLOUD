# Decisión 27 oct 2026 — Sin OS, sin greenfield, sin modelo apuntes/Hoy

**Modesto (acuerdo en conversación):** ya **no** quiere nada del Impersia OS, **nada** de lo hecho en `greenfield/`, y **ya no** quiere Impersia como producto de **apuntes + Hoy**.

Este documento **manda** sobre [doc 21](./21-objetivo-alcance-estructura.md) y [doc 18](./18-greenfield-fase1-ciclo.md) para **código y producto**.

---

## Qué queda congelado (no borrar sin acuerdo; no seguir desarrollando)

| Área | Ruta | Estado |
|------|------|--------|
| Impersia OS | `apps/web/`, `services/api` legacy, `/os/` | Congelado (ya lo estaba) |
| Greenfield | `greenfield/**` | **Congelado** — no desplegar como producto; no ampliar |
| Modelo Entrada → Hoy → Guardado | UI y API `suelta_*` | **Abandonado** como dirección de producto |
| Promesa [doc 14](./14-promesa-impersia.md) como guía de implementación | — | **Histórica** hasta nueva promesa escrita |

---

## Qué puede seguir sirviendo (solo ideas, no código)

- [doc 19](./19-vacio-automatizacion-pyme-espana.md) — contexto pyme España (datos públicos).
- [doc 20](./20-mapa-pyme-y-hoja-de-ruta-v1.md) — mapa por capas; **revisar** cuando exista nuevo objetivo (La Sombra, Faro, Taller Ribera pueden seguir como perfiles).

---

## Producto activo (actualizado 28 oct 2026)

**Definido en:** [doc 24 — Local + agentes IA](./24-pivot-local-agentes-ia.md). Web comercial en VPS; producto cliente = **app web local** (`local/`, por crear). [Doc 23](./23-ecosistema-impersia-cloud.md) y **`platform/`** quedan **congelados**.

---

## Regla para el asistente

- No proponer Entrada, Hoy, Guardado, `return_days`, ni reutilizar pantallas greenfield.
- No ampliar `platform/` ni SaaS `/app/` como producto principal.
- Desarrollo nuevo: **`local/`** + **`apps/comercial/`** según [doc 24](./24-pivot-local-agentes-ia.md).

---
