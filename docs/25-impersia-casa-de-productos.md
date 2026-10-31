# Decisión 30 oct 2026 — Impersia.cloud es la casa de los productos

**Modesto (acuerdo en conversación):** Impersia.cloud es el propietario de los proyectos de software que salgan de aquí. En la oferta entran **Participación en ferias** ([doc 26](./26-participacion-en-ferias.md)), **Congresos** ([doc 27](./27-congresos.md)), **Seminarios** ([doc 28](./28-seminarios.md)) y **Cursos** ([doc 29](./29-cursos.md)). Capenergy es el cliente de partida, no el dueño del producto.

Del Impersia anterior no se continúa nada. Solo se conservan los **agentes de IA**.

Este documento manda sobre el [doc 24](./24-pivot-local-agentes-ia.md) y sobre todo lo anterior, salvo la pieza de agentes que el doc 24 ya dejó probada.

---

## En una frase

Impersia.cloud hace productos de software. En la oferta están **Participación en ferias**, **Congresos**, **Seminarios** y **Cursos**. Los agentes de IA que ya funcionan con Ollama se quedan y servirán a esos productos.

---

## Qué se conserva

El motor de agentes ya probado en el Mac (28 oct 2026):

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| Agente | `local/services/api` | Nombre, prompt, modelo, chat guardado en SQLite |
| Motor | Ollama en local | `llama3.2:3b`, URL `http://127.0.0.1:11434` |
| Pantalla de prueba | `local/apps/web` | Ajustes, lista de agentes y chat |

OpenRouter sigue pospuesto. No se amplía esa pantalla como centro personal ni como app de pyme.

---

## Qué se deja

No se borra sin acuerdo. No se sigue desarrollando.

Entrada, ejes, viajes, reuniones, hábitos, archivo inteligente, platform, greenfield, la app en el VPS, Flutter y la promesa de «centro de control personal». Los docs 01–24 y las carpetas `apps/` (salvo la web comercial), `platform/`, `greenfield/` y `services/` quedan como historia.

La web comercial (`apps/comercial/`, impersia.cloud) sigue siendo la cara pública de Impersia. El texto de esa web aún cuenta el producto anterior; se cambia cuando haya un producto nuevo que enseñar.

---

## Oferta actual

| Producto | Estado | Documento |
| --- | --- | --- |
| Participación en ferias | En la oferta. Versión 1 por hacer | [doc 26](./26-participacion-en-ferias.md) |
| Congresos | En la oferta. Se construye después de la ficha de ferias | [doc 27](./27-congresos.md) |
| Seminarios | En la oferta. Se construye después de la ficha de ferias | [doc 28](./28-seminarios.md) |
| Cursos | En la oferta. Se construye después de la ficha de ferias | [doc 29](./29-cursos.md) |

El código nuevo irá en `productos/`, no dentro de `local/` ni de `platform/`.

---

## Qué espera la versión 1

La del [doc 26](./26-participacion-en-ferias.md): una participación real de Capenergy, con los apartados de la ficha y los perfiles Administrador, Equipo y Visitante.

Hasta que esa ficha exista, no se reescribe la web comercial ni se empaqueta la app.

---

## Regla para el asistente

- Norte = Impersia.cloud como casa de productos. Oferta actual: Participación en ferias (doc 26), Congresos (doc 27), Seminarios (doc 28) y Cursos (doc 29). La primera ficha a construir es la de ferias.
- Conservar y reutilizar los agentes de `local/`. No ampliar el resto de Impersia.
- Código nuevo de producto en `productos/`.
- No borrar `platform/`, OS, greenfield ni `local/` sin acuerdo.
