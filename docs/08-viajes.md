# Viajes y experiencias — v1.5 (eje A)

Octubre 2026. Módulo `viajes`: **carpeta y dossier personal del viaje**, no agencia de reservas.

## Qué resuelve

«Tengo un viaje: fechas, reservas, qué hacer allí y qué meter en la maleta.»

## Modelo v1

| `travel_role` | Uso | UI |
| --- | --- | --- |
| **trip** | Contenedor (destino, fechas) | Tarjeta en lista |
| **reserva** | Vuelo, hotel, tren… | Lista |
| **plan** | Por hacer (sacar seguro…) | Checklist |
| **equipaje** | Maleta | Checklist |
| **experiencia** | Museo, tour, plan con alma del viaje | Checklist |
| **nota** | Texto libre | Lista |

Piezas enlazadas con `travel_trip_id` al viaje padre (ítem `trip`).

## Usuario

1. **+ Nuevo viaje** en la pantalla Viajes (título, destino, ida/vuelta).
2. **Entrada** abre viaje («Viaje a Lisboa del 20 al 24 de octubre») o añade piezas («vuelo Lisboa», «visitar museo») al viaje abierto si el destino encaja.
3. La ficha muestra siempre cinco apartados: **Reservas**, **Itinerario y por hacer**, **Experiencias**, **Equipaje** y **Notas**.
4. Cada apartado tiene su propio botón «Añadir» y un ejemplo que explica qué se guarda allí. No hay que elegir el tipo en una lista.
5. La primera pantalla es un índice de tarjetas: una por viaje, con fechas y resumen de contenido. Al pulsar **Abrir ficha completa** se entra en sus reservas, itinerario, experiencias, equipaje y notas.
6. **Editar viaje** cambia título, destino, ida, vuelta, presupuesto y moneda. **Cambiar** en cada contenido permite corregir todos sus datos o moverlo a otro apartado.

## Fichas detalladas

- **Reservas:** tipo, inicio y fin, proveedor, localizador, dirección, estado de confirmación, importe, moneda, pago, contacto, enlace y notas.
- **Itinerario:** tipo de actividad, inicio y fin, lugar, importe, enlace y notas.
- **Experiencias:** tipo, inicio y fin, proveedor, localizador, lugar, confirmación, importe, pago, contacto, enlace y notas.
- **Equipaje:** categoría, cantidad, preparado y notas.
- **Notas:** categoría, dirección, enlace y texto amplio.

La cabecera suma los importes por moneda y los compara con el presupuesto cuando coinciden. Las fichas antiguas de una sola línea siguen siendo válidas y se completan al editarlas.

Los detalles viven en `travel_item_details`, relación 1:1 con `items`. Así no se añaden más columnas específicas a la tabla central. Las fechas detalladas son propias del dossier y no convierten automáticamente la ficha en una cita de Agenda.

## Desvíos

- Cita con hora («cena en Lisboa viernes 21:00») → **Agenda** ocio.
- «Quiero ir a Lisboa algún día» sin viaje → **Deseos** (futuro).

## API

- `POST /travel-trips` — crea viaje.
- `POST /travel-trips/{id}/pieces` — pieza dentro del viaje.
- Entrada sigue en `POST /captures` (clasificador + `travel.py`).

## Fuera de v1

Mapas, subida real de billetes PDF o imágenes a R2/S3, tabla genérica `containers`, compartir (Espacios), enlace con Deseos.
