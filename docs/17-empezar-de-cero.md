# Empezar de cero (acuerdo 26 oct 2026)

Modesto quiere **un proyecto nuevo de verdad**, no otra pantalla dentro del Impersia OS ni un “Núcleo” que comparta cuentas, base de datos de usuarios, API de archivado y marca.

## Qué queda archivado (no es el trabajo activo)

- Todo **`apps/web/`** (Impersia OS).
- **`apps/nucleo/`** — intento de separar UI; **se abandona** como estrategia.
- **`services/api/`** salvo lo imprescindible para que `/os/` no se caiga.
- Propuestas Builder, módulos, `archive.py`, `items`, etc.

Este repositorio pasa a ser **legado + infra congelada**, no el sitio donde crece el producto nuevo.

## Dónde se construye de cero

Carpeta **`greenfield/`** en la raíz (mismo disco por ahora; **repo Git nuevo** cuando Modesto diga).

| | Legado (congelado) | De cero (`greenfield/`) |
|---|---|---|
| Código | `apps/web`, `apps/nucleo`, `services/api` | Solo `greenfield/**` |
| Usuarios | Tabla `users` del OS | Tabla **`suelta_users`** (vacía al inicio) |
| Datos al escribir | `items`, `captures`, `nucleo_releases` | **`suelta_notes`** (solo texto y fecha) |
| Marca en UI | Impersia OS | Nombre de trabajo **Suelta** (provisional) |
| Promesa de producto | `docs/14-promesa-impersia.md` sigue siendo el norte | Se cumple aquí, sin copiar pantallas viejas |

## Regla para el asistente

Si la tarea **importa, lee o escribe** el OS legacy o `nucleo_releases` / `archive.py` → **parar** y mover la idea a `greenfield/`.

## Próximo paso humano

Abrir **`greenfield/`** como si fuera otro proyecto (otra ventana de Cursor o foco mental). Entrar con **cuenta nueva** en Suelta cuando esté desplegado; no reutilizar el correo del OS salvo que tú lo elijas expresamente.
