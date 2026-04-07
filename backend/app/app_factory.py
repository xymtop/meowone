from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import include_api_routers
from app.bootstrap.lifespan import app_lifespan


def create_app() -> FastAPI:
    app = FastAPI(title="MeowOne", version="0.1.0", lifespan=app_lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    include_api_routers(app)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
