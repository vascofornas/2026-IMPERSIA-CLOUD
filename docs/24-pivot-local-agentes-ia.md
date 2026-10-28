# Decisión 28 oct 2026 — De cero: local para clientes, comercial en la nube, IA first

**Modesto (acuerdo en conversación):** quiere **empezar de cero por completo** respecto a la dirección [doc 23](./23-ecosistema-impersia-cloud.md) (escritorio pyme SaaS en la nube). El producto que se **entrega al cliente** no es una web app alojada en Impersia, sino una **aplicación web ejecutable en local** (Mac, Windows, Linux). **Prioridad:** uso y **configuración precisa** de **agentes de IA** (modelos **locales** y/o **OpenRouter**).

Este documento **manda** sobre doc 23, [platform/](../platform/) desplegado y el hábito temporal de las [cuatro superficies](../platform/docs/cuatro-superficies.md) para **código y producto activo**.

---

## En una frase

**Impersia.cloud** explica y vende en la **web comercial**; el **cliente trabaja offline/local** con una **web app empaquetada** en su equipo, donde configura y usa **agentes IA** (local + OpenRouter) sobre **sus datos en su máquina**.

---

## Qué construir ahora (solo dos frentes)

| Frente | Dónde | Para quién |
|--------|--------|------------|
| **Web comercial** | VPS → `apps/comercial/`, `https://impersia.cloud` | Público, SEO, descarga / contacto |
| **Web app local** | Nuevo árbol en repo (propuesta **`local/`**) | Cliente final: ejecutable Mac / Windows / Linux |

No hay producto cliente en `app.impersia.cloud` ni Flutter en esta fase.

---

## Qué queda congelado (no borrar sin acuerdo; no seguir desarrollando)

| Área | Ruta | Notas |
|------|------|--------|
| Impersia OS | `apps/web/`, `services/api` legacy | Ya congelado |
| Greenfield | `greenfield/**` | Congelado |
| Platform SaaS (27 oct) | `platform/**`, API en VPS `/platform/`, `/app/` | **Congelado** — fase 1 desplegada; no ampliar como producto |
| Doc 23 promesa cloud pyme | `docs/23-ecosistema-impersia-cloud.md` | **Superseded** como guía de implementación; conservar contexto mercado |
| Apps móviles Flutter | — | **Fuera de alcance** hasta nueva decisión |
| Panel admin en la nube como producto | `apps/admin/` legacy | Congelado; la configuración sensible (IA) vive en la **app local** |

---

## Web app local — qué debe ser

- **Experiencia:** interfaz web (HTML/JS) familiar, pero **no depende** de que Impersia hospede la app.
- **Ejecución:** un solo “programa” que el cliente instala o descomprime: levanta **servidor local** (API + UI) y abre el navegador en `localhost` (o ventana embebida tipo Electron/Tauri — decidir en diseño técnico).
- **Datos:** base en la **máquina del cliente** (p. ej. SQLite o PostgreSQL local embebido); **no** obligar a cuenta en VPS para trabajar.
- **Actualizaciones:** canal de descarga desde comercial o auto-update (fase posterior).

### Plataformas objetivo

macOS, Windows, Linux (paridad razonable en v1; puede priorizarse Mac para Faro).

---

## IA — núcleo del producto

| Modo | Ejemplos | Uso |
|------|----------|-----|
| **Local** | Ollama, LM Studio, servidor OpenAI-compatible en LAN | Privacidad, sin coste por token, offline |
| **OpenRouter** | Modelos en la nube vía API | Potencia, modelos que no caben en local |

La app local debe permitir **configuración explícita**:

- URL base y clave (OpenRouter u otro compatible).
- Perfil **local** (endpoint, modelo por defecto).
- **Agentes** (prompt de sistema, herramientas permitidas, modelo asignado) — definición mínima en v1, extensible.
- **No** enviar datos del cliente al VPS de Impersia por defecto; las llamadas IA van al proveedor que el cliente elija.

Secretos (API keys) **solo en el equipo del cliente**, nunca en el repo ni en GitHub.

### Orden v1 (acordado 28 oct 2026 — Modesto)

1. **Ollama primero** — inferencia en la máquina del cliente; los textos del negocio **no salen** del equipo por defecto. Mejor historia de **seguridad y privacidad** (pyme, gestoría, datos sensibles) y coherente con “producto local”.
2. **OpenRouter después** — conector opcional, activado **a propósito** (aviso claro: los mensajes salen a internet vía terceros). Sirve para modelos grandes o cuando Ollama no basta; no es el camino por defecto en v1.

En código: v1 = pantalla de ajustes Ollama (URL `http://127.0.0.1:11434`, modelo) + **un agente** probado; OpenRouter en v1.1 con toggle y clave en almacén local.

**Nota:** Ollama no es “mágicamente seguro” (malware local, backups, port mal expuesto); la app debe usar solo localhost y no reenviar a Impersia.cloud.

---

## VPS Impersia (rol reducido)

- Servir **web comercial** y assets (logo, legal, descargas cuando existan).
- **Opcional:** analytics, formulario contacto, n8n interno de Impersia — **no** es el runtime del producto cliente.
- API `platform` en producción: **no ampliar**; puede retirarse de `/app/` cuando haya build local publicado (decisión de despliegue aparte).

---

## Propuesta de repo (sin código hasta acuerdo)

```
apps/comercial/          ← activo (marca, promesa local + IA)
local/                   ← producto cliente (nuevo, cero imports OS/platform/greenfield)
  apps/web/              UI
  services/api/          API local + agentes
  packaging/             scripts Mac / Win / Linux (fase 2)
docs/24-...              este documento
```

---

## Criterio de éxito v1 (borrador)

1. Un usuario instala/ejecuta la app en **su Mac** (Faro) sin PostgreSQL en VPS.
2. Configura **Ollama** (o similar) **o** OpenRouter y ejecuta **un agente** con conversación guardada en local.
3. La **web comercial** explica esa promesa en una página clara (local + IA).

---

## Regla para el asistente

- Norte = **local + agentes IA**; comercial en VPS.
- No ampliar `platform/`, OS, greenfield, Flutter, ni SaaS `/app/` como producto principal.
- Código nuevo solo en **`local/`** (nombre acordado) y **`apps/comercial/`** cuando toque mensaje/descarga.

---

*28 octubre 2026 — sustituye doc 23 como promesa activa.*
