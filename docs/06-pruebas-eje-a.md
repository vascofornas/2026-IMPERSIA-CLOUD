# Pruebas eje A — Agenda, Casa y Bienestar

**Agenda + Casa (8 oct 2026):** **cerrado para uso diario**. Entrada + archivado IA + pantallas Agenda/Casa/Hoy validados por Modesto.

**Bienestar y salud (9 oct 2026):** **cerrado v1 para producción**. Rutinas y seguimiento 7 días; Registro del mes (sueño, salud, medias y gráficas); controles de salud (tensión, glucosa, peso, medicación, sueño) solo desde Bienestar; Hoy con pendientes; aviso por correo si falta lectura (Perfil). Validado en impersia.cloud con datos reales y email de tensión. Detalle en [07-habitos.md](07-habitos.md). Fuera de v1: hero mañanera, franjas Mañana/Tarde/Noche, elegir minutos de aviso en UI, correo resumen único.

**Mantenimiento:** en estos tres bloques solo **bugs** de pantalla, archivado grave o alertas; no nueva ronda de parches de palabras. Siguiente producto eje A: Viajes, Diario, Deseos u otro módulo del roadmap.

**Diario (9 oct 2026):** escritura libre y guiada, texto largo, fecha vivida, ánimo, energía, etiquetas, filtros y línea temporal. Análisis semanal/mensual solo con consentimiento en Perfil. Casos frontera obligatorios: reflexión emocional → Diario; síntoma o medida física → Bienestar; acción pendiente → módulo operativo; idea desarrollable → Ideas. Detalle en [09-diario.md](09-diario.md).

**Cierre Diario (9 oct 2026):** comprobar que la línea temporal agrupa por mes y día; las cuatro preguntas guiadas se guardan y editan; los días sin ánimo o energía no aparecen como valores bajos; un resumen borrado no reaparece al abrir Diario, pulsar Actualizar ni ejecutar el proceso periódico; otra cuenta no puede leer, editar o borrar entradas ni resúmenes ajenos.

Frases cargadas con `services/api/scripts/seed_axis_a_entries.py` (archivado real con IA si está activa).

## Agenda y citas (20)

| # | Frase (resumen) | Objetivo |
| --- | --- | --- |
| 1 | Dentista martes 9:30 | médica |
| 2 | Pediatra Sofía viernes 11 | médica + aviso |
| 3 | Cardiólogo mamá 15 nov | médica + tercero |
| 4 | Fisioterapia jueves 18 | médica |
| 5 | Cumpleaños papá 3 dic | familiar |
| 6 | Aniversario Marta 20 oct | familiar |
| 7 | Bautizo Lucía sábado 12 | familiar |
| 8 | Comida familiar domingo | familiar |
| 9 | Cena Laura viernes 21:00 | ocio |
| 10 | Concierto Coldplay | ocio |
| 11 | Café con Miguel sábado | ocio |
| 12 | Partido Madrid domingo | ocio |
| 13 | ITV coche antes 30 nov | recordatorio |
| 14 | Seguro hogar 1 dic | recordatorio |
| 15 | IBI 15 enero | recordatorio |
| 16 | Pasaporte comisaría miércoles | recordatorio |
| 17 | Cada lunes yoga 7:00 | repetición |
| 18 | Urologo 10 oct aviso 30 min | médica |
| 19 | Comida empresa Navidad | ocio/familiar |
| 20 | Vacuna gripe abuelo | médica/recordatorio |

## Logística doméstica — Casa (20)

| # | Frase (resumen) | Objetivo |
| --- | --- | --- |
| 1 | Leche, huevos, pan, tomates Mercadona | compra multi |
| 2 | Detergente y papel higiénico | compra |
| 3 | Arroz y garbanzos | compra |
| 4 | Champú y gel | compra |
| 5 | Cerveza y patatas partido | compra |
| 6 | 2 garrafas aceite despensa | inventario |
| 7 | 6 latas atún trastero | inventario |
| 8 | 3 rollos papel cocina | inventario |
| 9 | 4 cartuchos tinta | inventario |
| 10 | Aspiradora toda la casa | domestica |
| 11 | Sacar basura noche | domestica |
| 12 | Lavadora 20:00 | domestica + hora |
| 13 | Cristales comedor | domestica |
| 14 | Fregar cocina | domestica |
| 15 | Gotera grifo baño | mantenimiento |
| 16 | Filtro aire acondicionado | mantenimiento |
| 17 | Persiana dormitorio | mantenimiento |
| 18 | Luz Iberdrola vence 20 | suministro |
| 19 | Gas Naturgy 25 oct | suministro |
| 20 | Internet Movistar diciembre | suministro |

Revisar en la web app: **Agenda**, **Casa**, **Hoy** y en admin **IA y costes** / **Actividad**.
