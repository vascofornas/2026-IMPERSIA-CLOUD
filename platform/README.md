# platform — escritorio pyme SaaS (congelado 28 oct 2026)

> Promesa activa: [doc 24](../docs/24-pivot-local-agentes-ia.md). No ampliar; despliegue VPS histórico.

Código del experimento SaaS ([doc 23](../docs/23-ecosistema-impersia-cloud.md)). **Sin** importar ni reutilizar `apps/web`, `services/api` legacy, ni `greenfield/`.

## Cuatro superficies (siempre)

Comercial (`apps/comercial/`) + **web app** + **admin** + **Flutter** → [docs/cuatro-superficies.md](./docs/cuatro-superficies.md). Rutas previstas: `platform/apps/web`, `platform/apps/admin`, `platform/apps/mobile`.

## Contenido

| Ruta | Qué es |
|------|--------|
| [docs/modelo-datos.md](./docs/modelo-datos.md) | Entidades, relaciones y mapa a bloques A–D |
| `services/api/` | API FastAPI (`/health`, auth, panel, contactos, actividades) |
| `apps/web/` | Web app → `https://impersia.cloud/app/` |
| `services/api/migrations/` | SQL (esquema `platform`) |

API pública: `https://api.impersia.cloud/platform/` (cookie de sesión).

## Entorno

**Trabajar y probar en el VPS**, no en local. Guía: [docs/entorno-vps.md](./docs/entorno-vps.md).

## Aplicar migraciones (en el VPS)

Misma instancia PostgreSQL que la API legacy; esquema **`platform`** aislado:

```bash
set -a && source /etc/impersia/api.env && set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f platform/services/api/migrations/001_core.sql
```

Variables y API vendrán en fases posteriores; la fase 0 es solo **modelo de datos**.

## Norte

Paridad mínima con el día a día (referencia [Holded](../docs/23-ecosistema-impersia-cloud.md#competidor-de-referencia-paridad-v1)); facturación legal vía **export** al software del cliente (bloque D).
