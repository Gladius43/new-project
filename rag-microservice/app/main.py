from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.db import Database
from app.schemas import IngestRequest, IngestResponse, SearchRequest, SearchResponse
from app.services import EmbeddingService, IngestService, SearchService, ServiceError


def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


@asynccontextmanager
async def lifespan(app: FastAPI):
    database_url = get_required_env("DATABASE_URL")
    openai_api_key = get_required_env("OPENAI_API_KEY")
    embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    embedding_dim = int(os.getenv("EMBEDDING_DIM", "1536"))
    openai_timeout_seconds = float(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))
    db_timeout_seconds = float(os.getenv("DB_COMMAND_TIMEOUT_SECONDS", "30"))
    db_min_pool_size = int(os.getenv("DB_MIN_POOL_SIZE", "1"))
    db_max_pool_size = int(os.getenv("DB_MAX_POOL_SIZE", "10"))

    db = Database(
        database_url=database_url,
        embedding_dim=embedding_dim,
        min_pool_size=db_min_pool_size,
        max_pool_size=db_max_pool_size,
        command_timeout_seconds=db_timeout_seconds,
    )
    await db.connect()
    await db.initialize_schema()

    embedding_service = EmbeddingService(
        api_key=openai_api_key,
        model=embedding_model,
        timeout_seconds=openai_timeout_seconds,
        embedding_dim=embedding_dim,
    )
    app.state.ingest_service = IngestService(db=db, embedding_service=embedding_service)
    app.state.search_service = SearchService(db=db, embedding_service=embedding_service)

    try:
        yield
    finally:
        await db.close()


app = FastAPI(title="RAG Microservice", version="1.0.0", lifespan=lifespan)


@app.exception_handler(ServiceError)
async def service_error_handler(_, exc: ServiceError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse, status_code=201)
async def ingest(payload: IngestRequest) -> IngestResponse:
    ingest_service: IngestService = app.state.ingest_service
    try:
        return await ingest_service.ingest(payload)
    except ServiceError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unexpected ingest error: {str(exc)}") from exc


@app.post("/search", response_model=SearchResponse)
async def search(payload: SearchRequest) -> SearchResponse:
    search_service: SearchService = app.state.search_service
    try:
        return await search_service.search(payload)
    except ServiceError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unexpected search error: {str(exc)}") from exc
