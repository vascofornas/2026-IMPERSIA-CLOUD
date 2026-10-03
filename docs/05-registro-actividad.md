# Registro de actividad

Sistema vivo de auditoría y uso del producto. Crece con cada fase; no bloquea el desarrollo principal.

## Qué registra hoy (v0.1)

| Acción | Origen | Producto |
| --- | --- | --- |
| `auth.login.success` / `auth.login.failed` | API | api |
| `auth.logout` | API | api |
| `auth.register.success` / `auth.register.denied` | API | api |
| `screen.view` | Cliente web app / admin | web_app / admin |
| `capture.create` | API | api |
| `item.update` / `item.delete` / `item.status` | API | api |
| `profile.update` | API | api |
| `admin.llm.settings` / `admin.llm.test` | API | admin |

## Cómo ampliarlo

1. **Servidor:** llamar a `events.log_from_request(...)` en el endpoint nuevo.
2. **Cliente:** enviar `POST /events` con una acción de `CLIENT_ACTIONS` en `events.py`.
3. **Catálogo:** añadir la fila a la tabla de arriba y al panel admin si hace falta filtro propio.

Productos previstos: `comercial`, `web_app`, `admin`, `api`, `ios`, `android`.

## Privacidad

No se guarda el texto de entradas ni notas. Solo metadatos (ids, módulo, pantalla, resultado).

Ubicación: IP + SO/navegador. País/ciudad llegará cuando se active GeoIP.

## Retención

Por ahora sin límite automático. Más adelante: borrado por antigüedad y agregados mensuales.

## Panel

`admin.impersia.cloud` → pestaña **Actividad**. Filtros, búsqueda libre y paginación.
