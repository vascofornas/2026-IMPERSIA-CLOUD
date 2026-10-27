# Mapa del software pyme (España) y hoja de ruta hasta v1 en producción

## ¿Conviene empezar por el alcance de lo que ya hay?

**Sí**, con un matiz: no hace falta un catálogo infinito de apps. Hace falta un **mapa por capas** (qué usa la pyme hoy y qué promete cada tipo de herramienta) para decidir **dónde entra Impersia** y **qué debe hacer la primera versión en producción** para ser atractiva.

Sin ese mapa, el riesgo es:

- Copiar un ERP (demasiado tarde, demasiado grande).
- Añadir módulos que Holded/Odoo ya cubren bien.
- Lanzar otra app de notas sin ciclo de confianza (refuerza el 79 % “digitalizados” vs 9 % sólidos del [doc 19](./19-vacio-automatizacion-pyme-espana.md)).

Con el mapa, la v1 puede decir: **“esto lo hacemos mejor que WhatsApp + Excel + ChatGPT suelto; lo demás lo integramos o viene después”**.

Este documento es el **plan de acción** para ese mapa y la **hoja de ruta** del producto nuevo (`greenfield/`, promesa en [doc 14](./14-promesa-impersia.md)). No sustituye [doc 03](./03-roadmap.md) (Impersia OS legacy congelado).

---

## Paso 1 — Mapa en capas (1–2 sesiones, no un mes de estudio)

Rellenar una fila por **capa**, no por cada competidor. Máximo **2–3 ejemplos** por celda.

| Capa | Qué resuelve la pyme | Quién suele usarlo en España | Hueco habitual (doc 19) |
|------|----------------------|------------------------------|-------------------------|
| **Ofimática / correo** | Email, Word/Excel, reuniones | Microsoft 365, Google Workspace | Ya resuelto; no competir aquí |
| **Mensajería / clientes** | Pedidos, urgencias, fotos | WhatsApp Business, a veces Instagram | Nada archivado, nada “vuelve el jueves” |
| **Captura personal** | Apuntes, listas | Notes, Keep, Notion suelto | Plan B en segunda app |
| **Facturación / Verifactu** | Facturas legales | Holded, Contasimple, Sage, gestoría | Bien para legal; mal como “cerebro del día” |
| **ERP / operaciones** | Stock, compras, fabricación | Odoo, Business Central, Sage | 9 % en nube; implementación pesada |
| **CRM / ventas** | Leads, pipeline | HubSpot, Holded CRM, Excel | 12 % en nube |
| **RR. HH.** | Nóminas, fichaje | Factorial, gestoría | 11 % en nube |
| **Automatización** | Conectar apps | Power Automate, Make, Zapier, n8n | IA suelta, flujos sin datos ordenados |
| **IA genérica** | Preguntar, redactar | ChatGPT, Gemini, Copilot gratis | No integrado en el negocio |

**Entregable:** una página (esta tabla ampliada con notas tuyas) + subrayado de **una capa objetivo** para v1.

**Capa objetivo acordada para Impersia (greenfield):** captura + **devolución cuando toca** (Entrada → archivar / fechas → Hoy), encima del vacío WhatsApp/Excel/Notes, **sin** ser gestoría ni ERP en v1.

---

## Paso 2 — “Competidor real” de la v1 (no solo software)

La v1 compite contra **conducta**, no solo contra Holded:

1. **WhatsApp + memoria**
2. **Excel / papel**
3. **Bloc + Notes / Keep**
4. **ChatGPT abierto en pestaña** (sin guardar en el negocio)

La v1 es atractiva si gana en:

| Criterio | Competidor actual | Impersia v1 (objetivo) |
|----------|-------------------|-------------------------|
| Un solo sitio para soltar texto | Repartido | Entrada |
| Saber que no se perdió | Dudas | Feedback + Guardado / Hoy |
| Ver lo de **hoy** sin buscar | Scroll infinito | Columna Hoy |
| Fecha en lenguaje natural | Manual | `return_days`, varios días |
| Segunda app “por si acaso” | Muy común | Promesa doc 14 |

No hace falta ganar en facturación ni nóminas en v1.

---

## Paso 3 — Alcance mínimo “atractivo en producción”

**Producción** aquí = URL pública, cuenta, datos propios, uso diario posible (prueba 7 días del doc 14).

### Incluido en v1 (greenfield fase 1 + cierre)

Basado en [doc 18](./18-greenfield-fase1-ciclo.md) y estado actual:

- [x] Entrada + guardar + feedback claro
- [x] Hoy / Guardado / fechas en español (incl. varios días)
- [ ] Estabilidad (API desplegada, sin pantallas vacías por versión vieja)
- [ ] **Corregir** fecha / día sin reescribir (mínimo: editar o “mover a Hoy”)
- [ ] Mensaje de producto en landing: qué es y qué **no** es (no ERP)

### Explícitamente fuera de v1 (pero nombrado en web/docs)

- Facturación / Verifactu
- CRM completo, stock, nóminas
- Sustituir WhatsApp
- Automatizaciones n8n en producción (solo diseño o integración manual posterior)
- Calendario rejilla / OS legacy (`/os/`)

### “Atractivo” = una frase demostrable

> *“Escribo una vez; sé dónde quedó; me sale en Hoy el día que toca; no copio en Notes.”*

Si eso no se puede enseñar en 2 minutos a una pyme, v1 no está lista.

---

## Paso 4 — Hoja de ruta (orden fijo)

| Fase | Objetivo | Listo cuando |
|------|----------|--------------|
| **A. Mapa** | Tabla capas + competidor conductual | Tres pymes abajo; tú validas ✏️ |
| **B. Ciclo confianza** | greenfield estable local + prod | Entrada→Hoy→Guardado sin fallos; doc 18 cerrado |
| **C. Producción v1** | `impersia.cloud` (o subdominio) solo greenfield | Cuenta, SSL, migraciones, copia BD |
| **D. Prueba 7 días** | Una persona real (tú o pyme piloto) | 7 días sin volver a Notes para lo mismo |
| **E. Corrección** | Editar día / texto | Sin reentrada completa |
| **F. Integración ligera** | Export CSV o webhook | Gestoría / Make / n8n **opcional**, un flujo |
| **G. Ampliación** | Un módulo de negocio | Solo si E y D están verdes (p. ej. clientes o proyectos) |

No saltar a **G** antes de **D**.

---

## Pymes de referencia (acordado)

Tres perfiles para probar el mapa y la v1: **dos reales tuyas** + **una ficticia** de sector distinto al digital (donde el doc 19 marca más hueco: WhatsApp, citas, poco ERP en nube).

**Leyenda:** ✅ confirmado en repo o conversación · ✏️ tú completas / corriges herramienta concreta

### 1. La Sombra

Proyecto propio (contenido / medios / automatizaciones). Equipo muy pequeño o una persona con muchos frentes. Frases reales de prueba: libros, YouTube, automatizaciones, llamadas con fecha.

| Capa | Uso probable hoy | Notas para Impersia v1 |
|------|------------------|-------------------------|
| Ofimática | ✏️ Google o Microsoft | No competir |
| Mensajería | ✏️ WhatsApp, email | Urgencias no sustituidas en v1 |
| Captura | Notes, Impersia greenfield en prueba | **Piloto ideal** doc 14 |
| Facturación | ✏️ autónomo / gestoría | Fuera v1 |
| ERP / ops | ✏️ bajo o Excel | Fuera v1 |
| CRM | Cabeza + WhatsApp | Solo “cliente” implícito en frases |
| RR. HH. | N/A o gestoría | Fuera v1 |
| Automatización | ✅ interés n8n / flujos (La Sombra) | Fase F, no v1 |
| IA genérica | ✅ ChatGPT u otro | Clasificar fechas, no chat suelto |

**Qué debe ganar la v1:** fechas en español, varios días, Hoy/Guardado, confianza sin segundo apunte.

### 2. Faro.red

✅ **Un solo autónomo (tú).** Marca / empresa madre bajo la que cuelgan tus proyectos de desarrollo (p. ej. Impersia en el repo: producto, web, infra). No hay plantilla: mismo perfil que millones de autónomos tech en España — proyectos, plazos, clientes, facturación y cabeza a la vez.

| Capa | Uso probable hoy | Notas para Impersia v1 |
|------|------------------|-------------------------|
| Ofimática | ✏️ Google o Microsoft | Integración futura |
| Mensajería | Email, ✏️ WhatsApp con clientes | Entrada no sustituye |
| Captura | GitHub + ✏️ Notes/Notion + cabeza | Impersia = **lo suelto** que no es código |
| Facturación | ✏️ gestoría / app facturación autónomo | Fuera v1 |
| ERP / ops | Repos y VPS, no ERP | Ampliación G = “Proyectos” más adelante |
| CRM | ✏️ Excel o nada | v1 no CRM |
| RR. HH. | N/A (autónomo) | Fuera v1 |
| Automatización | ✅ n8n en infra propia (subdominio) | Fase F |
| IA genérica | ✅ ChatGPT / Copilot en el día a día | Mismo hueco doc 19 |

**Qué debe ganar la v1:** ciclo Entrada → Hoy → Guardado para **no mezclar** tareas de Faro, La Sombra e Impersia en cuatro sitios; demostrable a un **cliente tuyo** sin prometer ERP.

### 3. Taller Ribera *(ficticia, sector servicios)*

**Sector elegido:** taller mecánico / automoción (3–8 empleados). Muy habitual en España, **poco ERP en nube** en el barómetro Gigas, mucha **cita por WhatsApp** y “llamar el jueves”. Contrasta con Faro/La Sombra (digital).

| Capa | Uso habitual en este perfil | Notas para Impersia v1 |
|------|----------------------------|-------------------------|
| Ofimática | WhatsApp + llamadas; a veces Gmail gratuito | Entrada complementa, no sustituye |
| Mensajería | **WhatsApp Business** con clientes | Competidor conductual #1 |
| Captura | Papel, libreta, móvil del jefe | **Usuario tipo doc 19** |
| Facturación | Contasimple / gestoría / FacturaDirecta | Fuera v1; export después |
| ERP / ops | Programa taller ✏️ o ninguno | No clonar en v1 |
| CRM | Libreta de clientes + matrículas | v1: solo texto libre |
| RR. HH. | Gestoría nóminas | Fuera v1 |
| Automatización | Casi ninguna | Anuncio YouTube = este hueco |
| IA genérica | Prueba suelta en móvil | Sin flujo |

**Qué debe ganar la v1:** “el jueves y viernes llamar…”, “pasado mañana pedir pieza”, **Hoy** en el taller sin formación IT.

### Síntesis para la hoja de ruta

| Pyme | Rol en el plan |
|------|----------------|
| **La Sombra** | Piloto 7 días (doc 14); frases reales |
| **Faro.red** | Autónomo real: v1 usable para **tu** día a día y enseñable a un cliente |
| **Taller Ribera** | Comprobar que la propuesta **no es solo para developers** |

Si una fila ✏️ no cuadra con tu stack real, corrige solo esa celda; el mapa sigue siendo útil.

---

## Paso 5 — Plan de acción inmediato (checklist)

1. ~~**Completar mapa:** tres pymes de referencia~~ (La Sombra, Faro.red, Taller Ribera — **revisar celdas ✏️**).
2. **Benchmark rápido (2 h):** probar solo **Holded** (facturas) + **Notion/Keep** (captura) — anotar qué hace cada uno en el primer minuto.
3. **Cerrar greenfield B:** despliegue + URL acordada; anotar en `REGISTRO.txt`.
4. **Redactar página “Qué no es Impersia”** (3 viñetas) para no confundir con ERP.
5. **Definir piloto 7 días:** reglas, éxito = cero plan B en otra app.

---

## Cómo se actualiza

- Tras cada fase completada: una línea en `REGISTRO.txt`.
- Si el mapa cambia (nueva ley Verifactu, etc.): actualizar tabla capas, no reescribir todo el repo.

---

## Relación con otros documentos

| Doc | Rol |
|-----|-----|
| [19](./19-vacio-automatizacion-pyme-espana.md) | Por qué hay oportunidad (datos) |
| [14](./14-promesa-impersia.md) | Qué promete el producto |
| [18](./18-greenfield-fase1-ciclo.md) | Qué hace el código hoy |
| [17](./17-empezar-de-cero.md) | OS legacy congelado; producto en greenfield |
