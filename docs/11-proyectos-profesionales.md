# Proyectos profesionales configurables

Estado: versión 1 terminada en octubre de 2026.

## Decisión

Proyectos no presupone una profesión. Todas las cuentas usan el mismo motor y pueden combinar plantillas distintas en una misma cartera. Perfil incluye cuatro bases editables:

- Software.
- Jurídico.
- Economía y consultoría.
- Personalizada.

Cada plantilla define cómo se llama el contenedor (Proyecto, Expediente, Encargo…), cómo se llama el cliente o destinatario, sus fases, tipos de trabajo, tipos de entregable y campos propios. Los campos admiten texto, número, fecha, selección, sí/no y enlace.

La plantilla predeterminada se elige en Perfil, pero la elección final se hace al crear cada proyecto. Editar una plantilla actualiza las fichas asociadas sin crear tablas o aplicaciones distintas por sector.

## Uso

Hay dos puertas de entrada:

1. **Entrada** interpreta el texto. Puede abrir un proyecto o añadirle una tarea, hito, entregable o nota.
2. **Proyectos** abre una entrevista guiada con el agente de Impersia.

Al crear, la persona explica con sus palabras qué quiere sacar adelante. La IA propone la plantilla y prepara un borrador; después pregunta una cosa cada vez. Las respuestas pueden ser libres, de elección única o de selección múltiple. Por ejemplo, un proyecto de Software puede ser a la vez Web, Aplicación móvil e Infraestructura. Los campos configurables también admiten selección múltiple.

La ficha se actualiza a la vista durante la conversación. Se puede omitir lo que todavía no se sabe y nada se guarda hasta revisar el resumen y pulsar «Crear proyecto». El formulario convencional queda para editar posteriormente datos concretos, no como puerta principal.

La primera pantalla es un índice de tarjetas. Cada tarjeta muestra sector, cliente o asunto, fase, fecha objetivo, piezas y progreso. La ficha completa contiene:

- datos principales y campos definidos por la plantilla;
- flujo ordenado de fases;
- tareas;
- hitos;
- entregables con su tipo;
- notas.

Las piezas se pueden completar, editar, mover de fase y borrar. Cerrar un proyecto no elimina su contenido.

## Workspace de Software

Los proyectos que usan la plantilla inicial Software tienen un espacio de trabajo propio. No son cuatro listas iguales:

- **Tareas:** tablero por estados Pendiente, En curso, En revisión, Bloqueada y Terminada. Las tarjetas se mueven arrastrando en escritorio o con el selector en móvil. Admiten estimación, criterios de aceptación y dependencias.
- **Hitos:** línea temporal con fecha, estado y progreso calculado a partir de las tareas relacionadas.
- **Entregables:** tarjetas de release, documentación o demostración con versión, entorno, estado de publicación y progreso de las piezas vinculadas.
- **Notas:** panel documental sin checklist, con notas técnicas, decisiones y referencias enlazables a tareas, hitos o entregables.

La parte superior resume tareas terminadas, bloqueos, hitos alcanzados y entregables publicados. Al abrir o crear una pieza aparece un panel lateral; en pantallas pequeñas ocupa el ancho completo.

Las relaciones disponibles son dependencia entre tareas, tarea → hito, tarea/hito → entregable y nota → pieza. Siempre se validan dentro del mismo proyecto y la misma cuenta. No hay asignaciones de equipo en esta versión.

## Entrada y fronteras

- Trabajo con un resultado y partes relacionadas → Proyectos.
- Cita, llamada o acta → Reuniones.
- Nota técnica o conocimiento recuperable → Segunda memoria.
- Posibilidad todavía sin compromiso → Ideas.

Al añadir una pieza, el servidor resuelve solo proyectos abiertos de esa cuenta. Si hay uno único puede usarlo; si el texto nombra uno, busca ese título. El modelo recibe únicamente la captura actual y la definición del proyecto resuelto, nunca su historial.

## Datos

La migración `022_proyectos_profesionales.sql` añade:

- `professional_templates`;
- `users.default_professional_template_id`;
- `project_details`, ficha uno a uno sobre `items`.

`project_details` conserva plantilla, padre, rol, fase, prioridad, vencimiento, cliente, descripción, varios tipos de trabajo, tipo de entregable y valores personalizados. Los proyectos antiguos se migran como contenedores bajo Personalizada, sin alterar título, fecha ni estado.

La migración `024_workspace_software.sql` añade estado de flujo, orden y datos específicos del rol. `project_relations` guarda los enlaces entre piezas y los elimina en cascada al borrar contenido.

Toda consulta y mutación comprueba `user_id`. Una cuenta no puede usar plantillas ni proyectos padre de otra.

## Alcance siguiente

Esta entrega cierra Proyectos y la base adaptable del eje Profesional. Después:

- Reuniones reutilizará cliente, proyecto y vocabulario.
- Segunda memoria incorporará recuperación semántica.
- Ideas podrá promoverse a proyecto escogiendo plantilla.

No forman parte de esta versión los permisos por equipo, automatizaciones ni un constructor no-code completo.
