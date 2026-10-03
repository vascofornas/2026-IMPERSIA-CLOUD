"""Consulta del registro de actividad. Solo administrador."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import events
from admin_llm import require_admin

router = APIRouter(prefix="/admin/events", tags=["admin-events"])


class EventsQuery(BaseModel):
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    action: str | None = None
    category: str | None = None
    product: str | None = None
    email: str | None = None
    q: str | None = Field(default=None, max_length=200)
    from_ts: str | None = None
    to_ts: str | None = None
    success: bool | None = None


@router.get("")
def list_events(
    request: Request,
    limit: int = 50,
    offset: int = 0,
    action: str | None = None,
    category: str | None = None,
    product: str | None = None,
    email: str | None = None,
    q: str | None = None,
    from_ts: str | None = None,
    to_ts: str | None = None,
    success: bool | None = None,
):
    require_admin(request)
    try:
        items, total = events.search_events(
            limit=limit,
            offset=offset,
            action=action,
            category=category,
            product=product,
            email=email,
            q=q,
            from_ts=from_ts,
            to_ts=to_ts,
            success=success,
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Registro de actividad no disponible") from exc
    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/facets")
def event_facets(request: Request):
    require_admin(request)
    try:
        return events.list_facets()
    except Exception:
        return {"actions": [], "products": [], "categories": []}
