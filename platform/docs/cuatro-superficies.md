# Cuatro superficies — hábito de producto (Modesto)

Cada producto Impersia se plantea **siempre** con estas cuatro piezas. No es opcional: es la forma habitual de entregar valor (web pública, trabajo diario, operación interna, móvil).

---

## Las cuatro piezas

| # | Superficie | Quién la usa | Rol |
|---|------------|--------------|-----|
| 1 | **Web comercial** | Visitante, SEO | Explicar promesa, precios, legal, captación |
| 2 | **Web app** | Cliente / pyme | Producto principal en navegador (escritorio pyme, doc 23) |
| 3 | **Panel de administración** | Operador / soporte / tú | Usuarios, orgs, IA y costes, actividad, flags, salud del sistema |
| 4 | **Apps móviles (Flutter)** | Cliente en movimiento | Misma API que la web app; iOS y Android |

Un solo **contrato API** (`platform/services/api`) para web app, admin y Flutter.

---

## Dominios (Impersia.cloud)

| Superficie | Host habitual |
|------------|----------------|
| Comercial | `https://impersia.cloud` |
| Web app | `https://app.impersia.cloud` |
| Admin | `https://admin.impersia.cloud` |
| API | `https://api.impersia.cloud` |

Caddy en el VPS enruta a estáticos (comercial, app, admin) y proxy a la API.

---

## Dónde vive el código (producto **platform** activo)

| Superficie | Ruta en repo | Notas |
|------------|--------------|--------|
| Comercial | [`apps/comercial/`](../../apps/comercial/) | Marca Impersia; logo oficial `logo.svg`. Compartida entre productos |
| Web app | `platform/apps/web/` | **Por crear** (fase 1). Vite + React, como el patrón legacy |
| Admin | `platform/apps/admin/` | **Por crear**. Patrón referencia: `apps/admin/` (OS legacy, congelado) |
| Flutter | `platform/apps/mobile/` | **Por crear**. Patrón doc [02-arquitectura](../02-arquitectura.md): `apps/mobile/` |

Legacy **congelado** (no ampliar como producto): `apps/web/` (OS), `apps/admin/` (OS), `greenfield/`.

---

## Orden de construcción sugerido (platform)

1. API + esquema `platform` (fase 0 hecha)  
2. Web app mínima (login, panel, contactos) — primera pestaña del cliente  
3. Web comercial alineada con doc 23 (mensaje pyme + automatización)  
4. Admin mínimo (orgs, usuarios, actividad)  
5. Flutter cuando la API cubra el mismo núcleo que la web app  

La comercial puede ir en paralelo cuando el mensaje esté claro; la **web app** sigue siendo el criterio de “v1 creíble”.

---

## Regla para el asistente

No proponer “solo una SPA” ni dejar admin o móvil fuera del **mapa**. Si el alcance es pequeño, **recortar funciones**, no **recortar superficies** del diseño: admin y Flutter pueden llegar después, pero el repo y la arquitectura deben preverlas.

---

*27 octubre 2026 — hábito confirmado por Modesto.*
