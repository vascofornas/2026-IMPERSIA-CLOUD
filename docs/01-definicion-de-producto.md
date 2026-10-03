# Definición de producto

Impersia OS es el sitio donde una persona deja lo que tiene en la cabeza y lo recupera ordenado, sin abrir cinco aplicaciones ni decidir antes en cuál va cada cosa.

El problema que resuelve es la fragmentación: notas, agenda, tareas, diario, listas y proyectos viven hoy en herramientas distintas, y la vida personal, el trabajo y las aficiones quedan partidos aunque sean la misma persona.

## Cómo se usa

1. La persona escribe, y más adelante dicta o adjunta una imagen, en un único campo.
2. La IA, en el servidor, archiva esa entrada en el eje y el módulo que le corresponden, en privado.
3. Aparece ya guardada en su sitio.
4. Más tarde la persona puede editar lo que haga falta: el módulo, el título, la fecha o la privacidad. También puede borrar una entrada, con confirmación.

No hay un paso de confirmar antes de guardar. El PDF lo llama entrada de fricción cero. Si el archivo queda mal, se corrige después, sin volver a escribir la frase.

La persona no aprende palabras para elegir el cajón. Escribe como le sale e Impersia adivina. Si ella nombra uno, por ejemplo «en la agenda», se respeta. Si no lo nombra, no se le pide que lo nombre.

Una compra con día y hora sigue siendo Casa. Si tiene fecha, sale en Hoy y también en el mes. Agenda es el cajón de las citas. Si el cajón queda mal, se cambia después.

Personal, profesional y social son destino y permiso de cada elemento. La persona ve un solo flujo. Esas tres palabras organizan el almacenamiento y quién puede verlo. No son tres aplicaciones dentro de Impersia.

**Agenda vive en Vida personal, no en Social.** Todas las citas y planes con fecha — médicos, celebraciones, ocio con amigos, pareja o familia — se archivan en Agenda (eje personal). El eje social sirve para compartir: muro, listas, círculos y espacios. No es un calendario ni sustituye a Agenda.

Entrada es siempre el inicio. Decide qué hacer con cada frase: abrir algo nuevo o meterlo dentro de algo que ya existe. «Proyecto Capenergy 2026» abre el proyecto. «Avanzar en los foros de Capenergy» entra dentro. Abrir Proyectos sirve para verlo y para corregirlo, no para armarlo a mano. Lo mismo para un viaje, un hábito o un deseo.

Dentro de Agenda (Vida personal), las variantes perfeccionadas son la **cita médica**, la **celebración** (cumpleaños de cualquiera — familiar o amigo —, aniversario, boda, bautizo, comida…), el **plan de ocio** (cine, restaurante, concierto, deporte, quedar…) y el **recordatorio** (ITV, seguro, impuestos, documentos, trámites del hogar). Familia y amistades comparten el mismo calendario privado; no hace falta elegir eje. Cumpleaños y aniversarios se repiten cada año.

La **cita médica** incluye: título (especialidad o consulta), fecha, hora, aviso, para quién es (yo, hijo/a, padre o madre, abuelo/a, sobrino/a u otra persona con nombre), lugar y notas. Son citas de interés para la persona, no solo las suyas propias. Se archivan desde Entrada y se ven y editan en Agenda con ese detalle.

Agenda puede mostrar, además, un calendario que la persona ya tenga. El primero es Google Calendar, y solo si ella lo conecta. Impersia lo lee y lo junta en Agenda y en Hoy con lo que entró por Entrada. Lo de Google se distingue. Lo escrito en Impersia no se copia a Google en esta versión.

Las entradas con hora pueden llevar aviso. Se cambia al editar la entrada, en el campo Aviso. Las repetidas comparten el mismo aviso para toda la serie.

En Agenda el calendario se abre en el mes. También se puede ver la semana o un solo día. Cada día muestra lo que tiene fecha, venga del eje que venga, más Google si está conectado. Si la frase dice «cada lunes», «cada día» o «cada mes», la entrada se repite y sale en todos esos días, como en un calendario normal. Al cambiar o borrar desde un día concreto, la persona elige si afecta solo a ese día o a toda la serie. Cada cajón tiene su color y su icono. El mismo icono, con el mismo color, encabeza la pantalla de ese módulo y cada ficha. Una acción lleva siempre icono y texto; el texto solo no basta, porque no se distingue de un rótulo. Un calendario ajeno, hoy Google, lleva su propia marca. La entrada sigue en su sitio. Pasar de día, de semana o de mes no la mueve. Arrastrar un día llega más adelante.

Impersia se registra una vez en Google, con la cuenta del producto `impersia@impersia.cloud`, no con la personal de quien lo lleva. Cada persona solo acepta que se lea su calendario.

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
- **Cita.** Título, inicio y fin. El recordatorio se guarda. Si la frase lleva hora, Impersia pone aviso quince minutos antes, salvo que diga otra cosa («avísame a la hora», «sin aviso», «una hora antes»). Hay tres canales, activados en Perfil: aviso del navegador con la web abierta; correo a la cuenta (aunque no haya nada abierto); push en el móvil con las apps Flutter, más adelante. El correo lleva el logo, deja claro que es un aviso de servicio (no publicidad), enlace a desactivarlo, contacto del responsable y enlace a la política de privacidad.

La pantalla de inicio se llama **Hoy**: lo del día. **Entrada** es donde se escribe. Debajo, en cada módulo, lo archivado.

Cuentas con correo y contraseña. Una persona, sus datos, en la web app.

## Qué espera

Cada módulo siguiente se añade cuando Hoy ya se usa a diario. El orden está en la ruta de desarrollo.

- Voz e imagen en Entrada.
- Diario con estado de ánimo, hábitos, casa, viajes, deseos y segunda memoria.
- Banco de ideas y proyectos con hitos.
- Enlaces compartidos y círculos cerrados.
- Muro público y build in public.
- Búsqueda semántica. La base llevará `pgvector` desde el día uno; la función se enciende más tarde.

Quedan fuera del producto, también a largo plazo: copiar el Drive o el correo entero del usuario, y convertir Impersia en la fuente de verdad de los archivos del cliente. Impersia guarda lo que la persona le confía por Entrada.

## Para quién es la primera versión

Para una persona que quiere dejar de repartir su día entre notas, calendario y tareas. El primer usuario es quien construye el producto. La web comercial existe para explicar esa promesa, no para vender módulos que aún no están.

## Cómo se sabe que la versión 1 funciona

- Una entrada de texto queda archivada sola en su eje y su módulo, sin elegir antes.
- Si el archivo queda mal, se edita después y el elemento queda en su sitio.
- Hoy muestra el día sin mezclar datos de otra cuenta.
- Un elemento nuevo es privado hasta que la persona cambie ese nivel.
- La misma cuenta funciona en la web app y, cuando exista, en Flutter, contra la misma API.
