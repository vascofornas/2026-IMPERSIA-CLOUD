# Entorno de trabajo — VPS (preferencia Modesto)

**Acuerdo:** probar y ejecutar Impersia **siempre en el VPS IONOS**, no en Docker/local del Mac como hábito. Cada cierre con código: **subir a GitHub y aplicar en el VPS** (pull + migraciones + comprobación).

---

## Acceso

| Dato | Valor |
|------|--------|
| Servidor | `root@217.76.158.141` |
| Clave SSH (Mac) | `~/.ssh/impersia_ionos` |
| Código desplegado | `/opt/impersia-os` |
| Variables API legacy | `/etc/impersia/api.env` (incluye `DATABASE_URL`) |

Conectar:

```bash
ssh -i ~/.ssh/impersia_ionos root@217.76.158.141
cd /opt/impersia-os
```

---

## Flujo habitual

1. **Código** — se escribe en el repo (Mac + agente) y sube a **GitHub** (`main`).
2. **VPS** — actualizar el clon y aplicar lo que toque:

```bash
cd /opt/impersia-os
git fetch origin && git reset --hard origin/main
```

3. **Migraciones `platform/`** (esquema separado del OS legacy):

```bash
set -a && source /etc/impersia/api.env && set +a
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f platform/services/api/migrations/001_core.sql
```

4. **Comprobar** — según fase: health de API, URL pública, consultas `psql` al esquema `platform`.

El Mac **no** es el sitio donde hay que tener Postgres levantado para validar el producto nuevo.

---

## Producto activo vs legacy

| Área | En VPS hoy | Notas |
|------|------------|--------|
| OS legacy | `services/api`, `apps/web` | Congelado; no ampliar |
| **platform** | `platform/` | Escritorio pyme (doc 23); migraciones en `platform/services/api/migrations/` |

Cuando exista API `platform`, conviene **servicio systemd propio** o puerto distinto; hasta entonces solo SQL en el mismo PostgreSQL con esquema `platform`.

---

## n8n y otros

Subdominios y n8n siguen en el mismo VPS; las automatizaciones (bloque C) apuntarán a la API `platform` cuando esté publicada.

---

*27 octubre 2026 — preferencia «trabajar siempre en el VPS».*
