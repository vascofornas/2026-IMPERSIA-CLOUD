# platform — producto Impersia.cloud (activo)

Código **nuevo** del escritorio pyme ([doc 23](../docs/23-ecosistema-impersia-cloud.md)). **Sin** importar ni reutilizar `apps/web`, `services/api` legacy, ni `greenfield/`.

## Contenido (fase 0)

| Ruta | Qué es |
|------|--------|
| [docs/modelo-datos.md](./docs/modelo-datos.md) | Entidades, relaciones y mapa a bloques A–D |
| `services/api/migrations/` | SQL aplicable en PostgreSQL (esquema `platform`) |

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
