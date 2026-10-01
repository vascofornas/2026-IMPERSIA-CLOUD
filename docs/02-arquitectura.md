# Arquitectura

Un VPS Linux de IONOS concentra el sistema. Las apps Flutter viven en los teléfonos y hablan con ese servidor.

Ese VPS tiene ahora el proyecto anterior `impersia.cloud`: web, base de datos, n8n y panel de administración. No se conserva nada de ese proyecto. Antes de quitarlo se mira qué está corriendo, para no llevarse por delante el sistema, el acceso SSH ni el cortafuegos. Después el servidor queda para Impersia OS.

Capacidad de partida: **4 vCPU y 8 GB de RAM**. Ahí caben la API, PostgreSQL y los dos sitios estáticos con margen para copias y picos cortos del modelo. Con 4 GB solo merece la pena si más adelante se aprieta el presupuesto y los frontales siguen siendo archivos estáticos.

## Qué hay en el VPS

| Pieza | Rol |
| --- | --- |
| Ubuntu 24.04 | Sistema del VPS |
| Caddy | HTTPS y enrutado por dominio. Certificados automáticos |
| API FastAPI | Cuentas, caja, clasificación y elementos |
| PostgreSQL 16 + pgvector | Datos. La extensión queda instalada; la búsqueda semántica no se usa aún |
| Web comercial | Sitio estático (Next.js exportado) |
| Web app | Aplicación estática (Vite, React, TypeScript) |

PostgreSQL no se publica a internet. El cortafuegos de IONOS deja solo 22, 80 y 443. El acceso SSH es por clave.

Docker Compose levanta Caddy, la API y PostgreSQL. Los dos frontales son archivos que Caddy sirve. Así el VPS no corre dos servidores Node además de la API.

## Dominios

Sobre el dominio del producto, tres nombres:

- `impersia.cloud` — web comercial
- `app.impersia.cloud` — web app
- `api.impersia.cloud` — API

El DNS apunta al VPS en IONOS. Si el dominio final es otro, cambian los nombres y no la forma.

## Por qué este stack

FastAPI encaja con la caja: una sola función que devuelve JSON con un esquema fijo (tipo, título, fechas, privacidad, confianza). Python mantiene cerca esa llamada al modelo.

La web comercial pide SEO y páginas quietas. Exportarla y servirla con Caddy basta.

La web app es un cliente más de la API, igual que Flutter. Construirla como SPA estática evita un segundo backend y deja la lógica de negocio en un solo sitio.

Flutter (iOS y Android) consume la misma API. No hay versión web de Flutter: el navegador ya tiene la web app.

El modelo de lenguaje se contrata por API. No corre dentro del VPS. Cada captura envía solo su texto. La respuesta se guarda como sugerencia hasta que la persona confirma.

## Forma del repositorio

```
apps/comercial/     Next.js, export estático
apps/web/           Vite + React + TypeScript
apps/mobile/        Flutter
services/api/       FastAPI
infra/              Compose, Caddyfile, copias
docs/               Definición, arquitectura y ruta
```

Un solo repositorio. Un solo contrato HTTP para web y móvil.

## Datos de la versión 1

- **users** — cuenta, correo, clave hasheada.
- **captures** — texto crudo, sugerencia del modelo, estado (pendiente o confirmada).
- **items** — elemento confirmado: tipo (`note`, `task`, `event`), título, cuerpo, inicio, fin, estado, privacidad (`private`, `shared`, `public`), etiqueta de proyecto opcional, y la captura de origen.

Privacidad y tipo viven en columnas desde el primer esquema. Los valores `shared` y `public` se aceptan y se guardan. Ninguna pantalla los publica hasta la fase de compartir.

## API de la versión 1

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /me`
- `POST /captures` — guarda el texto y devuelve la sugerencia
- `POST /captures/{id}/confirm` — crea el elemento, con los campos corregidos si hace falta
- `GET /items` — filtro por fechas y tipo, para pintar Hoy
- `PATCH /items/{id}`, `DELETE /items/{id}`

La web guarda la sesión en cookie `HttpOnly`. Flutter guarda el refresh token en almacenamiento seguro del sistema y manda el access token en `Authorization`.

## Copias y recuperación

- `pg_dump` cada noche, fuera del disco único del VPS (almacenamiento de objetos o el backup de IONOS).
- Snapshot del VPS antes de cada cambio de sistema.
- Probar un restore en un directorio vacío antes de dar la fase 0 por cerrada.

Los archivos de voz e imagen, cuando existan, van a almacenamiento de objetos (R2 o S3), no al disco del sistema.

## Límites que esta arquitectura acepta

Un solo VPS es un solo punto de fallo. Para la versión 1 es la decisión correcta: menos piezas, un sitio donde mirar los logs, coste previsible. Cuando Hoy tenga usuarios de verdad, lo primero que se separa es PostgreSQL o se añade una réplica. No antes.
