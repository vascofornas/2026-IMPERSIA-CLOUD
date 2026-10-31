# Oferta — Participación en ferias

30 oct 2026. Modesto da el ok. Este producto entra en la oferta de Impersia.cloud. El detalle de la casa de productos está en el [doc 25](./25-impersia-casa-de-productos.md).

Capenergy es el cliente de partida. El producto es de Impersia.

---

## En una frase

La empresa que va a una feria tiene una ficha propia de esa participación: la prepara, la usa en el stand y se lleva los contactos a la siguiente. La web y la app de la feria siguen siendo del organizador.

---

## Para quién

Empresas que participan en ferias nacionales e internacionales, como expositor o como visitante. El primer caso real es Capenergy.

---

## Apartados de cada participación

| Apartado | Qué guarda |
| --- | --- |
| Feria | Nombre, edición, web, ciudad, país, fechas, nacional o internacional |
| Participación | Expositor o visitante, para qué vamos, stand (pabellón, número, metros) |
| Equipo | Quién va, qué hace, viaje, hotel, acreditación |
| Material y logística | Equipos de demostración, catálogos, gráfica, envío, aduana, qué vuelve |
| Tareas | Lo que hay que hacer antes, con fecha |
| Agenda | Reuniones y turnos del stand |
| Contactos | Persona, empresa, interés, qué se prometió, estado del seguimiento |
| Gastos | Presupuesto y gasto real |
| Cierre | Qué salió, qué no, cuántos contactos siguen abiertos |

Lo que justifica el producto es Tareas, Contactos y Cierre. El resto ordena el viaje.

---

## Perfiles

| Perfil | Quién | Qué puede hacer |
| --- | --- | --- |
| Administrador | Quien organiza la participación | Toda la ficha |
| Equipo | Quien está en el stand | Agenda, contactos y seguimiento |
| Visitante | Quien llega al stand | Solo la página pública de esa feria |

En el stand se publica un QR a la página del visitante: qué se enseña, dejar sus datos y pedir hora. Eso crea un contacto. El panel interno no se enseña en el stand.

El formulario del visitante pide consentimiento para guardar los datos. La página es corta y usable en el móvil.

---

## Qué espera la versión 1

Una participación real de Capenergy, con los nueve apartados y los tres perfiles. El visitante deja un contacto de prueba desde el móvil y el equipo lo ve en la ficha.

El código irá en `productos/`. Los agentes de `local/` se enganchan cuando la ficha ya se usa. La web comercial no se cambia hasta que esta ficha exista.

Congresos, seminarios y cursos quedan fuera de esta versión.
