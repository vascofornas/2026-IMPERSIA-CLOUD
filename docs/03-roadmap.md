# Ruta de desarrollo

Orden para una persona construyendo Impersia OS. Las semanas son ritmo, no un contrato: cada fase se cierra cuando se cumple su resultado, y la siguiente no empieza para tapar un hueco de la anterior.

El corte es deliberado. El PDF describe el producto completo. Esta ruta construye primero Entrada, Hoy, y las tres superficies que has pedido. Los demás módulos entran de uno en uno, cuando el núcleo ya se usa.

## Lo que se ve, en orden

Entrada es siempre el inicio. Abrir un eje o un módulo sirve para ver y corregir.

El esqueleto de las pantallas ya está, con ejemplos. A partir de aquí se perfecciona eje por eje. Dentro de cada eje, cada grupo recibe lo que le es propio.

1. **Vida personal.** Agenda, Casa, Hábitos, Viajes, Diario, Deseos.
2. **Profesional.** Proyectos, Reuniones, Segunda memoria, Ideas.
3. **Social.** Muro, Listas y rutas, Círculos, Espacios.

El primero es Agenda. Junta lo que entra por Entrada con Google Calendar, si la persona lo conecta. Impersia lee ese calendario y lo muestra en Agenda y en Hoy, marcado como Google. Lo escrito en Entrada se queda en Impersia. Escribir de vuelta en Google llega cuando esta lectura ya se use. La vista de Agenda es un mes. Entra cualquier entrada con fecha, de cualquier eje, más Google. En el día se lee el cajón. Hoy sigue siendo la lista del día.

Cuando un grupo necesita partes dentro, como un viaje, un proyecto o un hábito, Entrada decide si la frase abre algo nuevo o entra en lo que ya existe. Eso se hace al llegar a ese grupo.

Voz, imagen y compartir llegan cuando los tres ejes ya se usan. Las apps móviles siguen para más tarde.

## Fase 0 — Servidor vacío que responde

Duración orientativa: 1 semana.

- Cuenta IONOS, VPS con 4 vCPU y 8 GB, Ubuntu 24.04, usuario sin root para el día a día, SSH por clave.
- DNS de la web comercial, `app` y `api`.
- Compose con Caddy, PostgreSQL y una API que responde `GET /health`.
- Copia nocturna de la base y un restore probado.
- Carpetas del monorepo creadas, aunque las apps aún no tengan producto.

**Listo cuando:** `https://api.<dominio>/health` responde, la base no es accesible desde fuera y existe una copia restaurada con éxito.

## Fase 1 — Cuenta y Entrada

Duración orientativa: 2 semanas.

- Registro e inicio de sesión.
- Un campo de texto.
- El modelo archiva solo: eje, módulo, título, fecha si la hay, y privacidad.
- El elemento queda en PostgreSQL, privado, sin un paso de confirmar.
- Después se puede editar el módulo, el título, la fecha y la privacidad.

**Listo cuando:** diez frases de prueba quedan archivadas solas en su módulo, y una clasificación mala se cambia después sin volver a escribir la frase.

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
- Entrada, edición y Hoy en iOS y Android.
- El token de refresco en el almacenamiento seguro del teléfono.

**Listo cuando:** una captura hecha en el móvil aparece en la web, y una tarea cerrada en la web desaparece de Hoy en el móvil.

## Fase 5 — Voz e imagen

Duración orientativa: 2 semanas.

- Audio e imagen entran por la misma Entrada.
- El servidor transcribe o describe, y a partir de ahí el flujo es el de la fase 1.
- Archivos en almacenamiento de objetos, no en el disco del sistema.

**Listo cuando:** un audio de una cita y una foto de una nota quedan archivados, igual que un texto.

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
