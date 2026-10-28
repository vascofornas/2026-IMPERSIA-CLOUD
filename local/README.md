# Impersia local — producto cliente (doc 24)

App web que corre **en el Mac/PC del cliente**: API + UI en `localhost`, IA vía **Ollama** (por defecto `llama3.2:3b`).

## Requisitos

- [Ollama](https://ollama.com) con **Cloud desactivado** y modelos en disco (p. ej. `/Volumes/ssd_modes/ollama-models-impersia`).
- Python 3.11+ y Node 20+ (solo para desarrollo / arranque).

## Arrancar (Mac)

```bash
./local/run-mac.sh
```

Abre **http://127.0.0.1:5174** — ajustes Ollama, agentes y chat.

Datos SQLite: `local/data/impersia.db` (no se sube a git).

## Estructura

| Ruta | Rol |
|------|-----|
| `services/api/` | FastAPI, SQLite, proxy chat Ollama |
| `apps/web/` | UI Vite + React |
| `run-mac.sh` | Levanta API (8765) y web (5174) |

Sin imports de `platform/`, OS legacy ni `greenfield/`.
