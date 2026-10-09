# Definición de producto

Impersia OS es el sitio donde una persona deja lo que tiene en la cabeza y lo recupera ordenado, sin abrir cinco aplicaciones ni decidir antes en cuál va cada cosa.

El problema que resuelve es la fragmentación: notas, agenda, tareas, diario, listas y proyectos viven hoy en herramientas distintas, y la vida personal, el trabajo y las aficiones quedan partidos aunque sean la misma persona.

## Cómo se usa

1. La persona escribe, y más adelante dicta o adjunta una imagen, en un único campo.
2. La IA, en el servidor, archiva esa entrada en el eje y el módulo que le corresponden, en privado. El motor es híbrido: reglas solo para fechas y repeticiones; el modelo para módulo, subtipo y campos; las correcciones de la persona enseñan al sistema (véase [Archivo inteligente](04-archivo-inteligente.md)).
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

Dentro de **Casa** (Vida personal, la antigua logística doméstica del PDF), las variantes perfeccionadas son la **lista de la compra**, el **mantenimiento del hogar**, el **control de suministros** (luz, agua, gas, internet…), las **tareas del hogar** (limpieza, basuras, lavadora…) y el **inventario personal** (despensa, stock, repuestos). Cada entrada lleva título, tipo, dónde (tienda, habitación, compañía…) y notas; los suministros indican además el tipo de recibo. Si la frase trae fecha, sale en Hoy y en el calendario, pero sigue siendo Casa. Los suministros con fecha llevan aviso 7 días antes por defecto. Se puede marcar como hecha; en Casa lo pendiente se ve por secciones y lo hecho aparte.

La **lista de la compra** es una lista activa por cuenta: «comprar leche y pan» se parte en varias líneas; cada una se marca hecha con un check. Lo pendiente se ve siempre; lo comprado queda oculto bajo «Mostrar N comprados» y se puede quitar de la lista para que no crezca sin límite. La tienda es opcional y va en la lista (no en cada producto), pensada para geofence en las apps móviles más adelante. Por ahora hay una sola lista; varias listas y compartir llegarán después.

El **inventario personal** es lo contrario: lo que ya hay en casa (despensa, congelador, repuestos). «Quedan 2 cartuchos en la despensa» guarda producto, cantidad y dónde. No es lo que falta comprar; eso sigue yendo a la lista de la compra. Más adelante, un aviso de stock bajo podrá pasar a la lista con un clic.

Las **tareas del hogar** (basuras, lavadora, limpieza…) se ven en checklist: marcar hecho, horario o repetición visible si la frase lo trae, hechas colapsadas como en la compra.

Dentro de **Bienestar y Hábitos** (PDF; módulo `habitos`), tres piezas: **rutinas diarias** (ejercicio, meditación, lectura… con repetición y check del día), **seguimiento** (cómo vas cumpliendo en los últimos días) y **registro de salud/sueño** (anotaciones puntuales: horas dormidas, peso, tensión…). La pantalla no copia Agenda ni Casa: prioriza frecuencia, checks y un registro reciente. Reflexión de ánimo sin dato («he dormido mal») sigue yendo al **Diario**, no aquí. Detalle en [07-habitos.md](07-habitos.md).

Dentro de **Diario**, la persona escribe de forma libre o con preguntas opcionales de reflexión. Cada entrada conserva texto largo, fecha vivida, tipo, ánimo, energía y etiquetas opcionales; se recupera en una línea temporal privada con filtros. Si la cuenta lo activa expresamente, Impersia genera lecturas semanales y mensuales con temas y preguntas, sin diagnósticos. Solo se envían al modelo las entradas del periodo analizado. Detalle en [09-diario.md](09-diario.md).

Dentro de **Deseos**, la persona guarda posibilidades todavía sin fecha: cosas, lugares o experiencias. Puede ordenarlas en varias listas privadas, completar motivo, lugar, enlace, precio, prioridad y notas, y conservar aparte las que ya se cumplieron. Entrada las deja primero en «Mis deseos»; organizar no añade fricción a la captura. Detalle en [10-deseos.md](10-deseos.md).

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
