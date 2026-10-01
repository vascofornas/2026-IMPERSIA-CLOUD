# Ruta de desarrollo

Orden para una persona construyendo Impersia OS. Las semanas son ritmo, no un contrato: cada fase se cierra cuando se cumple su resultado, y la siguiente no empieza para tapar un hueco de la anterior.

El corte es deliberado. El PDF describe el producto completo. Esta ruta construye primero la caja, Hoy, y las tres superficies que has pedido. Los demás módulos entran de uno en uno, cuando el núcleo ya se usa.

## Fase 0 — Servidor vacío que responde

Duración orientativa: 1 semana.

- Cuenta IONOS, VPS con 4 vCPU y 8 GB, Ubuntu 24.04, usuario sin root para el día a día, SSH por clave.
- DNS de la web comercial, `app` y `api`.
- Compose con Caddy, PostgreSQL y una API que responde `GET /health`.
- Copia nocturna de la base y un restore probado.
- Carpetas del monorepo creadas, aunque las apps aún no tengan producto.

**Listo cuando:** `https://api.<dominio>/health` responde, la base no es accesible desde fuera y existe una copia restaurada con éxito.

## Fase 1 — Cuenta y caja

Duración orientativa: 2 semanas.

- Registro e inicio de sesión.
- Un campo de texto.
- El modelo devuelve tipo, título, fecha y privacidad.
- La pantalla muestra la propuesta y permite corregirla antes de guardar.
- El elemento queda en PostgreSQL, privado.

**Listo cuando:** diez frases de prueba (una cita, una tarea, una nota, y alguna ambigua) acaban en el tipo correcto después de confirmar, y una clasificación mala se corrige sin reescribir el flujo.

## Fase 2 — Hoy en la web app

Duración orientativa: 2 o 3 semanas.

- Web app en `app.<dominio>`: Hoy, detalle, marcar tarea hecha, editar y borrar.
- Citas del día y tareas con fecha.
- Notas recientes.
- Etiqueta de proyecto en una tarea, como texto, sin tablero.

**Listo cuando:** se puede usar Impersia un día entero para notas, tareas y citas propias, sin otra app de tareas al lado.

## Fase 3 — Web comercial

Duración orientativa: 1 semana.

- Una página que dice qué es Impersia, cómo entra la información y qué significa privado por defecto.
- Acceso a la cuenta de la web app.
- Sin listar módulos que aún no existen.

**Listo cuando:** alguien que no ha leído el PDF entiende la promesa y puede crear una cuenta.

## Fase 4 — Flutter

Duración orientativa: 3 semanas.

- Misma cuenta, misma API.
- Caja, confirmación y Hoy en iOS y Android.
- El token de refresco en el almacenamiento seguro del teléfono.

**Listo cuando:** una captura hecha en el móvil aparece en la web, y una tarea cerrada en la web desaparece de Hoy en el móvil.

## Fase 5 — Voz e imagen

Duración orientativa: 2 semanas.

- Audio e imagen entran por la misma caja.
- El servidor transcribe o describe, y a partir de ahí el flujo es el de la fase 1.
- Archivos en almacenamiento de objetos, no en el disco del sistema.

**Listo cuando:** un audio de una cita y una foto de una nota acaban en un elemento confirmado, igual que un texto.

## Fase 6 — Compartir de verdad

Duración orientativa: 2 semanas.

- Pasar un elemento o una lista de `private` a `shared` o `public`.
- Un enlace para un itinerario o una wishlist.
- Un círculo cerrado para una lista o un proyecto pequeño.
- Sigue sin haber muro público.

**Listo cuando:** dos cuentas ven la misma lista compartida, y una tercera no la ve.

## Después, un módulo cada vez

Solo cuando la fase 6 esté en uso. Cada uno se construye sobre `items`, sin nueva arquitectura.

1. Diario (estado de ánimo, entrada del día) separado de la nota genérica.
2. Deseos.
3. Hábitos.
4. Viajes.
5. Segunda memoria, ya con `pgvector`.
6. Casa y suministros.
7. Muro de intenciones y perfil público.

## Qué no se adelanta

- Tableros Kanban, actas de reunión y feed social antes de que Hoy funcione en el móvil.
- Separar la base de datos a otro servidor antes de tener usuarios reales.
- Un segundo backend para la web. Web y Flutter son clientes.
- Enviar al modelo más contexto que el texto de la captura actual.
