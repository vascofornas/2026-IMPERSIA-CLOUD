"""Panel de administración LLM: coste, límites y configuración. Solo ADMIN_EMAIL."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

import llm

router = APIRouter(prefix="/admin/llm", tags=["admin-llm"])


class LlmSettingsPatch(BaseModel):
    enabled: bool | None = None
    provider: str | None = Field(default=None, max_length=40)
    model: str | None = Field(default=None, max_length=120)
    input_price_per_mtok: float | None = Field(default=None, ge=0, le=1000)
    output_price_per_mtok: float | None = Field(default=None, ge=0, le=1000)
    daily_budget_usd: float | None = Field(default=None, ge=0, le=10000)
    monthly_budget_usd: float | None = Field(default=None, ge=0, le=100000)
    use_preset_prices: bool = True


def require_admin(request: Request) -> tuple[str, str]:
    from main import current_user, read_user_email

    if not llm.admin_email():
        raise HTTPException(status_code=503, detail="Falta ADMIN_EMAIL en el servidor")
    try:
        llm.assert_admin_network(request)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    user_id = current_user(request)
    email = read_user_email(user_id)
    if not llm.is_admin_email(email):
        raise HTTPException(status_code=403, detail="Acceso restringido")
    return user_id, email


@router.get("/overview")
def llm_overview(request: Request):
    from main import db

    require_admin(request)
    with db() as conn:
        with conn.cursor() as cur:
            return llm.overview(cur)


@router.get("/settings")
def llm_settings(request: Request):
    from main import db

    require_admin(request)
    with db() as conn:
        with conn.cursor() as cur:
            settings = llm.get_settings(cur)
            spend = llm.spend_summary(cur)
            return {"settings": settings, "spend": spend, "operational": llm.operational_status(settings, spend)}


@router.patch("/settings")
def patch_llm_settings(body: LlmSettingsPatch, request: Request):
    from main import db

    user_id, _ = require_admin(request)
    patch = body.model_dump(exclude_unset=True)
    if body.monthly_budget_usd is not None and body.daily_budget_usd is not None:
        if body.daily_budget_usd > body.monthly_budget_usd:
            raise HTTPException(status_code=422, detail="El presupuesto diario no puede superar el mensual")
    with db() as conn:
        with conn.cursor() as cur:
            settings = llm.update_settings(cur, patch)
            spend = llm.spend_summary(cur)
        conn.commit()
    return {"settings": settings, "spend": spend, "changed_by": user_id}


@router.get("/usage")
def llm_usage(request: Request, limit: int = 50, offset: int = 0):
    from main import db

    require_admin(request)
    with db() as conn:
        with conn.cursor() as cur:
            rows, total = llm.list_usage(cur, limit=limit, offset=offset)
            spend = llm.spend_summary(cur)
    return {"items": rows, "total": total, "spend": spend}


@router.post("/test")
def llm_test(request: Request):
    from main import db

    user_id, _ = require_admin(request)
    with db() as conn:
        with conn.cursor() as cur:
            try:
                result = llm.run_health_test(cur, user_id=user_id)
            except RuntimeError as exc:
                conn.commit()
                raise HTTPException(status_code=502, detail=str(exc)) from exc
        conn.commit()
    return result
