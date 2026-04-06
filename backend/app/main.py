from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.db.database import init_db
from app.api.sessions import router as sessions_router
from app.api.messages import router as messages_router
from app.api.chat import router as chat_router
from app.capability.registry import registry
from app.capability.tools.card_builder import CardBuilderCapability


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    registry.register(CardBuilderCapability())
    yield


app = FastAPI(title="MeowOne", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions_router)
app.include_router(messages_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
