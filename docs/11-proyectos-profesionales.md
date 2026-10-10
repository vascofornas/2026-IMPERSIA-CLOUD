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
2. **Proyectos** permite crear y completar la ficha manualmente.

La primera pantalla es un índice de tarjetas. Cada tarjeta muestra sector, cliente o asunto, fase, fecha objetivo, piezas y progreso. La ficha completa contiene:

- datos principales y campos definidos por la plantilla;
- flujo ordenado de fases;
- tareas;
- hitos;
- entregables con su tipo;
- notas.

Las piezas se pueden completar, editar, mover de fase y borrar. Cerrar un proyecto no elimina su contenido.

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

`project_details` conserva plantilla, padre, rol, fase, prioridad, vencimiento, cliente, descripción, tipo de trabajo, tipo de entregable y valores personalizados. Los proyectos antiguos se migran como contenedores bajo Personalizada, sin alterar título, fecha ni estado.

Toda consulta y mutación comprueba `user_id`. Una cuenta no puede usar plantillas ni proyectos padre de otra.

## Alcance siguiente

Esta entrega cierra Proyectos y la base adaptable del eje Profesional. Después:

- Reuniones reutilizará cliente, proyecto y vocabulario.
- Segunda memoria incorporará recuperación semántica.
- Ideas podrá promoverse a proyecto escogiendo plantilla.

No forman parte de esta versión los permisos por equipo, automatizaciones ni un constructor no-code completo.
