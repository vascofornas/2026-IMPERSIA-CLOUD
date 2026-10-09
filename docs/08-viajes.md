# Viajes y experiencias — v1 (eje A)

Octubre 2026. Módulo `viajes`: **carpeta de viaje**, no agencia ni presupuesto.

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
3. **+ Añadir** dentro del viaje: reserva, plan, equipaje, experiencia, nota.

## Desvíos

- Cita con hora («cena en Lisboa viernes 21:00») → **Agenda** ocio.
- «Quiero ir a Lisboa algún día» sin viaje → **Deseos** (futuro).

## API

- `POST /travel-trips` — crea viaje.
- `POST /travel-trips/{id}/pieces` — pieza dentro del viaje.
- Entrada sigue en `POST /captures` (clasificador + `travel.py`).

## Fuera de v1

Presupuesto, mapas, billetes PDF, tabla genérica `containers`, compartir (Espacios), enlace con Deseos.
