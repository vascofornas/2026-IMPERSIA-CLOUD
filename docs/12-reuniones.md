# Reuniones

Reuniones es el calendario laboral. Una cita de trabajo no pasa a la Agenda personal: sigue en el eje profesional y la Agenda solo muestra el hueco de ese día.

## Ficha

Cada reunión guarda:

- título, día y hora;
- tipo: cita o seguimiento;
- estado: prevista o hecha;
- cliente;
- proyecto de la misma cuenta, si corresponde;
- participantes, lugar y enlace;
- lo que quedó dicho.

El enlace, si existe, tiene que empezar por `http://` o `https://`. Con hora, el aviso queda a quince minutos. No hay series repetidas, invitaciones ni escritura en Google.

## Calendario

La pantalla abre el mes y también permite ver la semana o un día. Solo entran reuniones. Pulsar una cita abre su ficha. Las que llegaron sin día quedan en «Sin día» hasta que se les ponga fecha.

La Agenda, Hoy y los avisos siguen viendo esa cita porque tiene fecha. El cajón y el color siguen siendo los de Reuniones.

## Entrada

«Llamada con el proveedor el martes a las 11:00» se archiva como reunión. El servidor completa tipo, participantes, cliente, lugar y enlace solo cuando el texto los dice. Si nombra un proyecto abierto de esa cuenta, lo enlaza. No usa un proyecto solo porque sea el único.

## Datos

La migración `025_reuniones.sql` añade `meeting_details`, uno a uno con `items`. El proyecto vinculado se borra del enlace si desaparece el proyecto; la reunión permanece. Una cuenta no puede enlazar un proyecto de otra.

## Fuera de esta versión

Actas formales, calendario compartido y repeticiones. El trabajo con partes sigue en Proyectos; el conocimiento reutilizable, en Segunda memoria.
