"""API del producto nuevo (Núcleo). No usa archive.py ni items del OS legacy."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/nucleo", tags=["nucleo"])


class ReleaseIn(BaseModel):
    text: str = Field(min_length=1, max_length=8000)


def _require_nucleo_product(request: Request) -> None:
    product = (request.headers.get("x-impersia-product") or "").strip().lower()
    if product != "nucleo":
        raise HTTPException(status_code=403, detail="Solo desde Núcleo")


@router.post("/releases", status_code=201)
def create_release(body: ReleaseIn, request: Request):
    import events
    import main as app_main

    _require_nucleo_product(request)
    user_id = app_main.current_user(request)
    raw = body.text.strip()
    if not raw:
        raise HTTPException(status_code=422, detail="Escribe algo antes de soltar")

    with app_main.db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO nucleo_releases (user_id, raw_text)
                VALUES (%s, %s)
                RETURNING id, raw_text, created_at
                """,
                (user_id, raw),
            )
            row = cur.fetchone()
        conn.commit()

    email = app_main.read_user_email(user_id)
    events.log_from_request(
        request,
        "nucleo.release.create",
        product="nucleo",
        user_id=user_id,
        email=email,
        meta={"release_id": str(row["id"]), "length": len(raw)},
    )
    return {
        "id": str(row["id"]),
        "text": row["raw_text"],
        "created_at": row["created_at"].isoformat(),
    }
