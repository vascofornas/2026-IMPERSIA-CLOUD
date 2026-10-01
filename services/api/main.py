import os

import psycopg
from fastapi import FastAPI, Response

app = FastAPI(title="Impersia API")


@app.get("/health")
def health(response: Response):
    try:
        with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=3) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
    except Exception:
        response.status_code = 503
        return {"status": "error", "database": "error"}
    return {"status": "ok", "database": "ok"}
