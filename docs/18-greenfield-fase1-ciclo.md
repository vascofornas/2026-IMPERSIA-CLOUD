# Greenfield — fase 1 (ciclo mínimo)

Acordado tras la promesa (`docs/14`): antes de la prueba de 7 días hace falta **cerrar el ciclo**, no escribir al vacío.

## Qué hace esta fase (solo `greenfield/`)

1. **Entrada** — escribes arriba.
2. **Qué pasó** — tras guardar, texto claro (ej. «Recibido. Ya lo tienes en Hoy.» o «Saldrá en Hoy el viernes…»). Sin nombres de módulos del OS.
3. **Tres columnas** (pantalla ancha): **Entrada** | **Hoy** | **Guardado**. En móvil, una debajo de otra. No calendario ni rejilla.

Si el texto lleva día («mañana», «el viernes», «20/11»), **aparece en Hoy ese día**, no antes.

## Qué no es

- No usa `archive.py`, `items`, ni pantallas del OS en `/os/`.
- No es la prueba de 7 días todavía; es el **mínimo** para que la prueba tenga sentido.
