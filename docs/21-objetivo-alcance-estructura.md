# Impersia (producto nuevo) — objetivo, alcance y estructura

> **⚠️ Superseded (27 oct 2026):** Modesto deja de querer Impersia como apuntes/Hoy y congela greenfield. **Manda:** [doc 22](./22-pivot-sin-apuntes-hoy.md). Este doc queda como referencia del intento anterior.

**Documento rector.** Antes de ampliar código, esto manda. Si algo contradice este texto, sobra o hay que cambiarlo.

---

## 0. Proyecto 100 % nuevo (qué significa y qué no)

**Impersia el producto = solo lo que se construye en `greenfield/`.** Es código, base de datos y cuentas **nuevos**, escrito desde cero. **No se reutiliza** el Impersia OS anterior.

| | ¿Se usa para el producto nuevo? |
|---|--------------------------------|
| `apps/web/` (OS legacy) | **No** — congelado |
| `apps/nucleo/` | **No** — abandonado |
| `services/api/` + `archive.py` + tablas `items`, `users` del OS | **No** |
| Pantallas, módulos, Agenda, Reuniones, Hoy del OS | **No** — no portar UI ni lógica |
| **`greenfield/apps/web`** + **`greenfield/services/api`** + tablas **`suelta_*`** | **Sí** — único producto activo |

**Lo que sí se comparte (y no convierte esto en “parche”):**

- **Mismo repositorio Git** en el Mac por comodidad hoy; puede pasarse a **repo aparte** cuando tú quieras.
- **Mismo VPS** puede alojar el despliegue del producto nuevo; es **infra**, no herencia de código.
- **Docs 14, 19, 20** — son **decisiones de producto y mercado**, no código reutilizado. La promesa se **vuelve a implementar** en greenfield, no se “engancha” al OS.

**Regla dura:** ningún import, copia de componente, migración de datos de usuario OS → greenfield, ni “un módulo más del OS”, salvo que **tú lo pidas explícitamente** (p. ej. migración puntual de datos).

El código greenfield ya declara en la API: *sin imports del Impersia OS*.

---

Documentos relacionados (detalle, no duplicar aquí):

| Doc | Para qué |
|-----|----------|
| [14-promesa-impersia.md](./14-promesa-impersia.md) | Promesa de producto (norte ético y de UX) |
| [19-vacio-automatizacion-pyme-espana.md](./19-vacio-automatizacion-pyme-espana.md) | Por qué hay hueco en el mercado (datos públicos) |
| [20-mapa-pyme-y-hoja-de-ruta-v1.md](./20-mapa-pyme-y-hoja-de-ruta-v1.md) | Pymes de referencia y fases hasta v1 en producción |
| [18-greenfield-fase1-ciclo.md](./18-greenfield-fase1-ciclo.md) | Qué hace hoy el código de fase 1 |

---

## 1. Objetivo del proyecto

### Qué es Impersia

Un **producto web** para personas y microempresas (autónomos incluidos) que hoy reparten **lo que tienen en la cabeza** entre WhatsApp, Excel, Notes, ChatGPT suelto y la memoria.

**Objetivo:** que **escriban una vez** en un solo sitio (**Entrada**) y **confíen** en que **volverá a aparecer cuando toque** (**Hoy** y archivo claro), **sin** tener una segunda app “por si acaso”.

No compite como “otra app de notas”. Compite contra el **hábito** de duplicar apuntes.

### Para quién (referencias acordadas)

| Perfil | Rol |
|--------|-----|
| **Faro.red** | Autónomo (Modesto): día a día real, proyectos de desarrollo |
| **La Sombra** | Proyecto propio (contenido / automatizaciones): piloto de la prueba 7 días |
| **Taller Ribera** *(ficticio)* | Contraste: pyme no digital (WhatsApp, citas); comprueba que la propuesta no es solo para developers |

### Qué problema de mercado toca (sin inventar cifras)

Según [doc 19](./19-vacio-automatizacion-pyme-espana.md): hay mucha nube básica y prueba de IA, pero **pocos procesos críticos conectados**. Impersia entra en la capa **captura + devolución temporal**, no en sustituir Holded/Odoo en la primera versión.

### Objetivo medible (v1)

Demostrar en **producción**, en **2 minutos**:

> *Escribo → me dicen qué pasó → lo veo en Hoy o Guardado el día que toca → no lo copio en Notes.*

Después, **prueba de 7 días** ([doc 14](./14-promesa-impersia.md)): mismo flujo sin plan B para lo que cae en Entrada.

### Objetivo a largo plazo (después de v1, no ahora)

Acercarse a la promesa completa del doc 14: **archivar** en ejes/módulos sin elegir cajón, **corregir** sin reescribir, **integrar** automatizaciones (n8n, etc.) cuando ya haya **datos y confianza**. Primero confianza; después amplitud.

---

## 2. Alcance

### 2.1 Dentro del producto nuevo (sí hacemos)

Todo lo siguiente vive **solo** en **`greenfield/`** (cuenta y base **`suelta_*`**, sin `archive.py` ni `items` del OS).

| Fase | Alcance | Estado orientativo |
|------|---------|-------------------|
| **Fase 1 — Ciclo mínimo** | Entrada, guardar, feedback, Hoy / Guardado, fechas en español (varios días), UI clara | En código; falta estabilidad prod. y corrección |
| **Fase 1 cierre** | Despliegue público, editar día/texto, mensaje “qué es / qué no es” | Pendiente |
| **Fase 2 — Confianza** | Prueba 7 días, menos tentación de plan B (ver doc 14 causas de fallo) | Pendiente |
| **Fase 3 — Archivo inteligente** | Clasificar en módulos/ejes **sin** elegir antes — **diseño nuevo** en greenfield (ideas del doc 04 solo como referencia, **cero** código del OS) | No empezar hasta Fase 2 verde |
| **Fase 4 — Integraciones** | Export, webhook, n8n; gestoría/facturación **al lado**, no dentro | No empezar hasta ciclo cerrado |

### 2.2 Fuera de alcance (no hacemos en v1 ni prometemos)

- ERP, stock, fabricación, nóminas, Verifactu / facturación legal completa  
- Sustituir **WhatsApp**, email o el IDE  
- Calendario tipo Google (rejilla de días) — **lista Hoy**, no calendario UI  
- Reanimar **Impersia OS** (`apps/web/`, `/os/`) ni **Núcleo** (`apps/nucleo/`) como producto activo  
- Competir módulo a módulo con Odoo/Holded  
- “IA” como chat suelto sin flujo (clasificar y fechas sí; chatbot genérico no)

### 2.3 Legado en el monorepo (no es el producto)

Vive en el mismo disco/Git **solo como archivo** del intento anterior. **No alimenta** greenfield.

| Qué | Dónde | Regla |
|-----|-------|--------|
| Impersia OS | `apps/web/`, `services/api` legacy, `/os/` | Solo mantenimiento si se cae; **no copiar** |
| Núcleo | `apps/nucleo/` | Abandonado ([doc 17](./17-empezar-de-cero.md)) |
| Docs roadmap viejo | [doc 03](./03-roadmap.md) | Histórico; **no** guía el producto nuevo |

**Regla:** si la tarea lee o escribe `items`, `archive.py`, módulos del OS → **parar**; la funcionalidad se **reescribe** en `greenfield/` o no se hace.

### 2.4 Promesa doc 14 vs realidad hoy (honesto)

| Promesa doc 14 | Greenfield hoy |
|----------------|----------------|
| Archivar en eje/módulo sin elegir | **No** — solo texto + fechas (`return_days`) |
| Calendario / pantalla del módulo | **No** — Hoy + Guardado |
| Corregir módulo/fecha | **Parcial / pendiente** |
| Entrada única + devolver en Hoy | **Sí** (núcleo fase 1) |

El objetivo del proyecto **no** es fingir que la promesa entera ya está cumplida; es ** llegar** a ella por fases sin otro parche legacy.

### 2.5 ¿El proyecto de hoy cabe en `greenfield/`? (oct 2026)

**Sí, para la Fase 1 que acordamos.** Greenfield **es** la implementación de ese primer tramo, no un prototipo del OS.

| Lo que definimos (doc 21 + 18) | ¿Está en greenfield? |
|--------------------------------|----------------------|
| Proyecto nuevo, cuentas `suelta_*`, sin legacy | **Sí** |
| Entrada + guardar + feedback | **Sí** |
| Hoy + Guardado (listas, no calendario rejilla) | **Sí** (tres columnas en UI ancha) |
| Fechas en español, varios días (`return_days`) | **Sí** |
| Estable en producción, editar apunte | **No** — pendiente Fase 1 cierre |
| Archivar en módulos / ejes (doc 14 completo) | **No** — Fase 3, diseño nuevo |
| ERP, facturación, WhatsApp, IA chat | **No** — fuera de alcance |

**Conclusión:** no hace falta tirar greenfield ni “empezar otra carpeta”. Hace falta **no confundir** “Impersia completo” con “lo que greenfield ya hace”: hoy es **solo el ciclo captura → devolver en Hoy**, que es exactamente la **v1** del mapa pyme (capa captura + fechas).

Si en el futuro el producto se desviara hacia ERP o copia del OS, **ahí sí** no cabría; con el doc 21 actual, **greenfield es el sitio correcto**.

---

## 3. Estructura necesaria

### 3.1 En el repositorio (monorepo)

```
IMPERSIA CLOUD 2026/
├── greenfield/              ← ÚNICO producto activo
│   ├── apps/web/            React (Vite), UI Impersia
│   ├── services/api/        FastAPI, tablas suelta_*
│   │   └── migrations/      SQL versionado
│   ├── docker-compose.yml   Postgres local (dev)
│   └── README.md
├── apps/web/                Legacy OS (congelado)
├── apps/nucleo/             Abandonado
├── services/api/            API legacy (congelado)
├── docs/                    Documentación (21 manda en objetivo/alcance)
├── infra/                   nginx, VPS (compartido al desplegar)
└── REGISTRO.txt             Diario de decisiones
```

### 3.2 Datos y cuentas

| Elemento | Producto nuevo | Legacy (no mezclar) |
|----------|----------------|---------------------|
| Usuarios | `suelta_users` | `users` |
| Apuntes | `suelta_notes` (+ `returns_at`, `return_days`) | `items`, `captures`, … |
| Sesión web | cookie `suelta_session` | cookies OS / núcleo |
| Cuenta | **Nueva** en greenfield | Cuenta OS opcional aparte |

### 3.3 Runtime (desarrollo)

| Pieza | Puerto / ruta |
|-------|----------------|
| Web dev | `localhost:5173` (proxy `/api` → API) |
| API dev | `localhost:8010` |
| Postgres dev | `suelta` en Docker/local |

### 3.4 Runtime (producción — objetivo acordado)

| Pieza | Notas |
|-------|--------|
| VPS IONOS | Clon `/opt/impersia-os` (mismo repo hoy) |
| API greenfield | Servicio propio, env aparte, migraciones `greenfield/services/api/migrations/` |
| Web greenfield | Build `greenfield/apps/web/dist`, URL **a acordar** (dominio principal o subdominio; greenfield aún no desplegado como producto público) |
| Legacy | `/os/` u otras rutas **sin** mezclar tráfico del producto nuevo |

### 3.5 Equipo y proceso

- **Producto / decisión:** Modesto  
- **Implementación:** código en Mac; GitHub copia buena; VPS solo despliega  
- **Antes de features nuevas:** comprobar encaje con **sección 2** de este doc  
- **Cierre de paso con código visible:** `REGISTRO.txt` + commit + push + despliegue cuando toque producción ([reglas repo](../.cursor/rules/como-trabajar.mdc))

---

## 4. Orden de trabajo (no desarrollar por encima de esto)

1. **Estabilizar** fase 1 (API al día, prod. o staging, pantalla no vacía).  
2. **Corregir** apunte (fecha/texto) — mínimo viable.  
3. **Publicar** mensaje claro: qué es Impersia y qué no es.  
4. **Prueba 7 días** (La Sombra o Faro).  
5. Solo entonces: archivo por módulos, integraciones, más columnas/módulos.

---

## 5. Una frase para recordar

**Impersia greenfield = confianza en capturar y devolver; no un ERP con IA pegada.**

---

*Última revisión: 27 octubre 2026. Cambios de objetivo o alcance → editar este archivo y una línea en `REGISTRO.txt`.*
