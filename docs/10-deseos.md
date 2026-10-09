# Deseos privados por listas — v1

Octubre de 2026. Deseos guarda posibilidades que todavía no tienen fecha ni son una acción inmediata. Es privado y admite varias listas, por ejemplo «Libros», «Regalos» o «Viajes futuros».

## Cómo se organiza

- «Mis deseos» es la lista general y siempre existe.
- Se pueden crear, renombrar y borrar otras listas privadas.
- Si se borra una lista, sus deseos pasan a «Mis deseos»; no se pierde contenido.
- Cada ficha incluye tipo, motivo, lugar, enlace, precio estimado, moneda, prioridad y notas.
- Los deseos cumplidos quedan recogidos y se pueden devolver a pendientes.

## Entrada

Entrada archiva automáticamente en «Mis deseos». Después se puede completar la ficha o moverla a otra lista.

- Aspiración sin fecha: «Quiero conocer Japón algún día» → **Deseos / lugar**.
- Experiencia sin compromiso: «Me gustaría probar el restaurante Noma» → **Deseos / experiencia**.
- Objeto o lectura futura: «Quiero leer Al este del Edén» → **Deseos / cosa**.

El clasificador no inventa precio, lugar, motivo ni prioridad.

## Límites

- Plan con fecha u hora → **Agenda/Ocio**.
- Viaje ya organizado, con fechas → **Viajes y experiencias**.
- Compra que se quiere hacer ahora → **Casa/Lista de la compra**.
- Idea que se quiere desarrollar → **Ideas**.
- Experiencia ya vivida → **Diario**.

Deseos no aparece en Hoy ni en Agenda porque no tiene fecha operativa.

## Privacidad y alcance

Todas las listas y fichas son privadas en esta versión. Quedan fuera compartir mediante enlace, imágenes, recomendaciones automáticas y convertir un deseo directamente en Viaje, Agenda o Compra.

## Datos y API

- `wish_lists`: listas privadas de cada cuenta.
- `wish_details`: ficha 1:1 enlazada con `items`.
- `GET/POST/PATCH/DELETE /wish-lists`
- `POST/PATCH /wish-items`
- `PATCH /wish-items/{id}/status`
- Migración: `021_deseos.sql`.
