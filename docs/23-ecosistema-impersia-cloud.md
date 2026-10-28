# Ecosistema Impersia.cloud — promesa y v1 en producción

> **Estado (28 oct 2026):** **Superseded** como promesa activa por [doc 24 — Local + agentes IA](./24-pivot-local-agentes-ia.md). Se conserva contexto pyme y benchmark Holded.

**Sustituye** la promesa apuntes/Hoy ([doc 14](./14-promesa-impersia.md) como producto, [doc 22](./22-pivot-sin-apuntes-hoy.md) como corte).  
**Contexto mercado:** [doc 19](./19-vacio-automatizacion-pyme-espana.md), mapa [doc 20](./20-mapa-pyme-y-hoja-de-ruta-v1.md).

---

## En una frase (acordado 27 oct 2026)

**Impersia.cloud** cubre el **vacío** del software pyme en España y sirve de **base para automatizar procesos**, de modo que una pyme pueda tratarlo como su **software de productividad principal — casi el único** para el día a día del negocio: clientes, trabajo, documentos, agenda, facturación operativa e integraciones, **sin** montar Excel + Notion + CRM + cuatro SaaS desconectados.

La **v1 en producción** debe ser el **primer tramo creíble** de ese escritorio único (no un juguete lateral), con **paridad mínima** frente a lo que la mayoría ya usa repartido en varias herramientas.

---

## Software de productividad principal (casi único)

### Qué debe sentir la pyme

- **Abre Impersia** para empezar la jornada (panel, pendientes, calendario, clientes).
- **No mantiene en paralelo** Excel de clientes, Notion de tareas, CRM suelto ni libreta de pendientes **para lo mismo**.
- **Automatiza** desde Impersia (eventos, webhooks, n8n), no desde hojas sueltas.
- **WhatsApp y el correo** pueden seguir existiendo como **canales**, pero lo importante **queda registrado y accionable en Impersia** (mensajes vinculados a contactos, tareas, procesos).

### Prueba de “casi único” (objetivo de producto)

Tras la adopción (meta: **prueba 30 días** para pyme piloto; **7 días** para autónomo Faro):

> *¿Puedo llevar clientes, pendientes, citas, documentos del negocio y al menos un flujo automatizado **sin abrir otra app de productividad** para eso?*

Si la respuesta es no, falta alcance — aunque sigan existiendo gestoría (legal), banco (web) o el propio WhatsApp como **canal de entrada**.

### Qué NO significa “único”

- No sustituir el **banco**, la **AEAT**, ni obligar a dejar de hablar por WhatsApp con el cliente.
- No clonar **Word/Excel** como procesador de textos/hojas generales (sí **datos** de negocio, **PDFs**, **presupuestos**, **adjuntos**).
- No ERP industrial completo en v1; sí **crecer** hacia operaciones por fases.

---

## Qué es el ecosistema

| Pieza | Rol |
|-------|-----|
| **Escritorio web** `impersia.cloud` | Productividad principal: panel, CRM ligero, trabajo, agenda, documentos |
| **Datos y API** | Fuente de verdad del negocio (PostgreSQL propio) |
| **Automatización** | Eventos nativos + n8n / webhooks (referencia para la pyme) |
| **Canales** | Correo y WhatsApp **integrados o importables**, no obligatoriamente reemplazados al 100 % el día 1 |

Código nuevo en **`platform/`** (propuesta). **Cero** OS legacy y **cero** greenfield.

**Hábito de entrega (Modesto):** siempre **cuatro superficies** — web comercial, web app, panel de administración y apps **Flutter**. Detalle: [`platform/docs/cuatro-superficies.md`](../platform/docs/cuatro-superficies.md).

---

## “Paridad con la mayoría” (traducción honesta)

La mayoría no tiene un ERP en la nube; tiene **un mosaico**. Impersia compite con **el mosaico entero** como experiencia, no solo con una celda.

| Hoy repartido en… | Impersia como principal absorbe… |
|-------------------|----------------------------------|
| Excel / libreta | Contactos, listas, seguimiento |
| Notion / Trello suelto | Actividades, procesos, proyectos ligeros |
| CRM barato o ninguno | Pipeline mínimo, historial por contacto |
| Google Calendar aparte | Agenda de negocio ligada a contactos y tareas |
| Drive suelto | Documentos del negocio por cliente/proceso |
| Holded / gestoría solo factura | **Puente de export** (gestoría, Holded, etc.) sin obligar a cambiar su facturación |
| Make / n8n sin datos | Automatizaciones sobre **datos que ya viven en Impersia** |
| ChatGPT suelto | IA **dentro** de flujos (clasificar, proponer tarea, no chat infinito) |

**v1** no iguala a Holded + M365 + Odoo el día del lanzamiento; **sí** debe permitir decir: *“esto ya es mi sitio de trabajo, no un complemento”*.

---

## v1 en producción — alcance mínimo del “escritorio principal”

Primera versión **pública**, usable por **Faro** (autónomo) y comprensible para **Taller Ribera**.

### Bloque A — Escritorio (imprescindible)

| # | Capacidad |
|---|-----------|
| A1 | Cuenta y organización (autónomo / micro) |
| A2 | **Panel** — pendientes, vencidos, próximas citas, actividad reciente |
| A3 | **Contactos** — clientes/proveedores, historial unificado |
| A4 | **Actividades y procesos** — estados, fechas, responsable, enlace a contacto |
| A5 | **Agenda** — vista calendario + lista de lo que toca (negocio, no “app de apuntes”) |
| A6 | **Documentos** — subir/adjuntar por contacto o proceso; buscar por nombre |

### Bloque B — Canales (para ser “casi único” de verdad)

| # | Capacidad |
|---|-----------|
| B1 | **Correo conectado** (lectura mínima o reenvío a Impersia) → tarea/contacto |
| B2 | **WhatsApp** — al menos registro manual o webhook de “pegar conversación” → contacto; integración API cuando toque |
| B3 | **Entrada única** — texto libre que **crea** contacto/tarea/cita (no modelo “Hoy” de apuntes) |

### Bloque C — Automatización (vacío doc 19)

| # | Capacidad |
|---|-----------|
| C1 | Eventos del sistema |
| C2 | Webhooks + documentación |
| C3 | Plantillas n8n (≥2) |
| C4 | IA acotada en flujos |

### Bloque D — Facturación (puente, no sustituto obligatorio)

**Decisión (Modesto, 27 oct 2026):** en v1 **no** imponemos emitir factura legal dentro de Impersia. Cada cliente puede **seguir con su software de facturación** (Holded, gestoría, Contasimple…). Impersia prepara el **trabajo comercial** (contacto, líneas, importes, adjuntos) y **exporta** o enlaza sin romper el escritorio.

| # | Capacidad |
|---|-----------|
| D1 | Presupuestos / borradores comerciales en Impersia + **export** (CSV, PDF resumen, plantilla Holded/gestoría cuando exista) |
| D2 | Registro “facturado fuera” (referencia externa, enlace, fecha) ligado al contacto/proceso |
| D3 | Campos útiles para España (NIF, conceptos, IVA en borrador); **Verifactu / emisión legal** en fase posterior o en la herramienta que ya use el cliente |

**Más adelante (opcional):** emisión legal dentro de Impersia para quien quiera unificar del todo; no bloquea v1.

### Fuera de v1 (pero no contradictorio con “principal”)

- Nóminas completas, stock industrial, fabricación  
- Marketplace masivo de módulos  
- Sustituir redacción general tipo Word  
- Código **OS**, **greenfield**, apuntes/Hoy  

---

## Criterio “v1 en producción”

1. **Faro** puede trabajar **una semana** con Impersia como **primera pestaña** (contactos + tareas + agenda + un doc + una automatización).  
2. **No hace falta Excel paralelo** para clientes ni pendientes de ese trabajo.  
3. Demo **10 min**: escritorio, contacto, tarea, cita, documento, disparar plantilla.  
4. Mensaje claro: **productividad principal en crecimiento**, no “addon”.

---

## Hoja de ruta (hacia “casi único” completo)

| Fase | Entrega |
|------|---------|
| **0** | Modelo de datos — **[`platform/docs/modelo-datos.md`](../platform/docs/modelo-datos.md)** + migración `001_core.sql` |
| **1** | Escritorio A1–A6 |
| **2** | Canales B1–B3 (mínimo viable) |
| **3** | Automatización C + producción pública |
| **4** | Facturación D + piloto La Sombra / Taller Ribera |
| **5** | Profundizar canales, informes, roles si hay equipo |

---

## Referencias pyme

- **Faro.red** — autónomo; criterio “semana casi única”.  
- **La Sombra** — automatizaciones y contenido.  
- **Taller Ribera** — ficticio; validar escritorio sin jerga dev.

---

## Competidor de referencia (paridad v1)

Para *“al menos lo mismo que una herramienta actual”* en España, la referencia principal es **[Holded](https://www.holded.com/es/funcionalidades)** — ERP en la nube para autónomos y pymes, muy usado como **software casi único** (facturación + CRM + proyectos + equipo + normativa española). No es el único (Contasimple, Sage, Odoo…), pero es el **patrón a batir** para *“todo el negocio en un sitio”*.

### Qué copiar como **mínimo** (no todo Holded el día 1)

Impersia v1 debe cubrir el **núcleo del día a día** que la pyme usa en Holded **antes** de contabilidad avanzada:

| Área Holded | Equivalente Impersia v1 |
|-------------|-------------------------|
| Contactos / ficha cliente | Contactos + historial |
| Actividades (llamada, reunión) | Actividades / procesos |
| Calendario integrado | Agenda de negocio |
| Notas en oportunidad | Notas en contacto/proceso |
| Presupuestos → factura | Borrador + export a su facturación (bloque D); paridad Holded en CRM/agenda, no clonar emisión legal v1 |
| Panel / inbox de trabajo | Panel (bloque A) |
| Automatizaciones desde ajustes | Eventos + n8n + plantillas (**más fuerte** que Holded genérico) |

### Qué Holded tiene y Impersia **pospone** (pero no contradice el norte)

| Holded | Impersia |
|--------|----------|
| Conciliación 300 bancos | Fase posterior o integración |
| Contabilidad / modelos IVA-IRPF completos | Gestoría + export; iterar Verifactu |
| Inventario / almacenes | Fase operaciones |
| Nóminas / RR. HH. | Fuera hasta fase equipo |
| OCR gastos, TicketBAI, SII | Iterativo según prioridad legal |

### Diferenciación (por qué no es clon)

Impersia gana siendo **referencia de automatización de procesos** (n8n, webhooks, eventos) sobre **datos unificados**, no solo otra factura+CRM. La paridad es **funcional en el escritorio diario**; la ventaja es **conectar y automatizar** lo que Holded deja en “integraciones” genéricas.

**Plan de benchmark:** cuenta de prueba Holded 14 días — recorrer contacto → actividad → presupuesto → factura → informe; checklist contra bloques A–D de este doc.

---

## Regla para el asistente

- Norte = **productividad principal casi única**, no apuntes/Hoy ni hub mini.  
- v1 = bloques A–D en §5; ampliar solo en orden de §7.  
- Sin código en OS / greenfield.

---

*Última revisión: 27 octubre 2026 (productividad principal; bloque D = export a gestoría/software).*
