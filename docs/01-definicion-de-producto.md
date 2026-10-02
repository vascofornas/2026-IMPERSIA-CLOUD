# Definición de producto

Impersia OS es el sitio donde una persona deja lo que tiene en la cabeza y lo recupera ordenado, sin abrir cinco aplicaciones ni decidir antes en cuál va cada cosa.

El problema que resuelve es la fragmentación: notas, agenda, tareas, diario, listas y proyectos viven hoy en herramientas distintas, y la vida personal, el trabajo y las aficiones quedan partidos aunque sean la misma persona.

## Cómo se usa

1. La persona escribe, y más adelante dicta o adjunta una imagen, en un único campo.
2. La IA, en el servidor, archiva esa entrada en el eje y el módulo que le corresponden, en privado.
3. Aparece ya guardada en su sitio.
4. Más tarde la persona puede editar lo que haga falta: el módulo, el título, la fecha o la privacidad.

No hay un paso de confirmar antes de guardar. El PDF lo llama entrada de fricción cero. Si el archivo queda mal, se corrige después, sin volver a escribir la frase.

Personal, profesional y social son destino y permiso de cada elemento. La persona ve un solo flujo. Esas tres palabras organizan el almacenamiento y quién puede verlo. No son tres aplicaciones dentro de Impersia.

La caja solo archiva la frase en su módulo. No adivina si esa frase crea un proyecto o si entra dentro de uno que ya existe. Esa relación se hace después, al abrir Proyectos. Lo mismo para un viaje, un hábito o un deseo: la estructura interna del módulo no se deduce de la frase.

## Privacidad

Privado por defecto. Público solo si la persona lo elige.

| Nivel | Quién lo ve | Ejemplos |
| --- | --- | --- |
| Privado | Solo esa cuenta | Diario, salud, borradores, trabajo confidencial |
| Compartido | Un círculo concreto | Lista de la compra, viaje con acompañantes, proyecto con un socio |
| Público | Quien tenga el enlace o el perfil | Wishlist de un evento, guía de viaje terminada, avance en abierto |

En la versión 1 todo se crea como privado. Los otros dos niveles existen en el dato desde el principio, para no migrar después, y se activan en la interfaz cuando exista con quién compartir.

Lo que se envía al modelo es el texto de esa entrada, no el diario completo ni el historial. El modelo no es la base de datos.

## Qué entra en la versión 1

Tres tipos de elemento, y una pantalla:

- **Nota.** Texto libre. Cubre el diario y la nota rápida hasta que el diario merezca módulo propio.
- **Tarea.** Título, estado (pendiente o hecha) y fecha opcional. Un proyecto es solo una etiqueta de la tarea, no un tablero.
- **Cita.** Título, inicio y fin. El recordatorio se guarda; la notificación push llega con las apps móviles.

La pantalla de inicio se llama **Hoy**: la caja de entrada, las citas del día y las tareas pendientes o fechadas para hoy. Debajo, las notas recientes.

Cuentas con correo y contraseña. Una persona, sus datos, en la web app.

## Qué espera

Cada módulo siguiente se añade cuando Hoy ya se usa a diario. El orden está en la ruta de desarrollo.

- Voz e imagen en la caja.
- Diario con estado de ánimo, hábitos, casa, viajes, deseos y segunda memoria.
- Banco de ideas y proyectos con hitos.
- Enlaces compartidos y círculos cerrados.
- Muro público y build in public.
- Búsqueda semántica. La base llevará `pgvector` desde el día uno; la función se enciende más tarde.

Quedan fuera del producto, también a largo plazo: copiar el Drive o el correo entero del usuario, y convertir Impersia en la fuente de verdad de los archivos del cliente. Impersia guarda lo que la persona le confía por la caja.

## Para quién es la primera versión

Para una persona que quiere dejar de repartir su día entre notas, calendario y tareas. El primer usuario es quien construye el producto. La web comercial existe para explicar esa promesa, no para vender módulos que aún no están.

## Cómo se sabe que la versión 1 funciona

- Una entrada de texto queda archivada sola en su eje y su módulo, sin elegir antes.
- Si el archivo queda mal, se edita después y el elemento queda en su sitio.
- Hoy muestra el día sin mezclar datos de otra cuenta.
- Un elemento nuevo es privado hasta que la persona cambie ese nivel.
- La misma cuenta funciona en la web app y, cuando exista, en Flutter, contra la misma API.
