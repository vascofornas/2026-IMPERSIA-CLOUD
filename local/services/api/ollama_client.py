import httpx


async def list_models(base: str) -> list[str]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{base.rstrip('/')}/api/tags")
        r.raise_for_status()
        data = r.json()
    return [m["name"] for m in data.get("models", [])]


async def chat(
    base: str,
    model: str,
    messages: list[dict[str, str]],
) -> str:
    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.post(
            f"{base.rstrip('/')}/api/chat",
            json={"model": model, "messages": messages, "stream": False},
        )
        r.raise_for_status()
        data = r.json()
    return data["message"]["content"]
