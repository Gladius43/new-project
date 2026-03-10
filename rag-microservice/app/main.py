from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError

from app.db import Database
from app.schemas import IngestRequest, IngestResponse, SearchRequest, SearchResponse, UploadResponse
from app.services import EmbeddingService, IngestService, SearchService, ServiceError, extract_text_from_file


STATIC_DIR = Path(__file__).resolve().parent / "static"
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "1.1.0")


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


app = FastAPI(title="RAG Microservice", version=SERVICE_VERSION, lifespan=lifespan)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _parse_form_json(value: str, field_name: str) -> dict:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail=f"{field_name} must be valid JSON object") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(status_code=422, detail=f"{field_name} must be JSON object")
    return parsed


def _none_if_empty(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized if normalized else None


@app.get("/", include_in_schema=False)
async def ui_home() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.exception_handler(ServiceError)
async def service_error_handler(_, exc: ServiceError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(RuntimeError)
async def runtime_error_handler(_, exc: RuntimeError):
    return JSONResponse(status_code=500, content={"detail": str(exc)})


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "version": SERVICE_VERSION}


@app.post("/upload", response_model=UploadResponse, status_code=201)
async def upload(
    file: UploadFile = File(...),
    topic_name: str = Form(...),
    project_name: str = Form(...),
    title: str | None = Form(default=None),
    language: str = Form(default="en"),
    source_type: str = Form(default="document"),
    source_origin: str = Form(default="upload"),
    source_external_id: str | None = Form(default=None),
    source_url: str | None = Form(default=None),
    source_published_at: str | None = Form(default=None),
    source_metadata: str = Form(default="{}"),
    document_metadata: str = Form(default="{}"),
    max_chars: int = Form(default=1000),
    overlap_chars: int = Form(default=200),
) -> UploadResponse:
    ingest_service: IngestService = app.state.ingest_service

    filename = file.filename or "upload.bin"
    content_type = file.content_type

    try:
        try:
            raw_bytes = await file.read()
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Could not read uploaded file: {str(exc)}") from exc

        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        extracted_text = extract_text_from_file(filename=filename, content_type=content_type, data=raw_bytes)

        payload_dict = {
            "topic_name": topic_name,
            "project_name": project_name,
            "source": {
                "type": source_type,
                "origin": source_origin,
                "external_id": _none_if_empty(source_external_id) or filename,
                "url": _none_if_empty(source_url),
                "published_at": _none_if_empty(source_published_at),
                "metadata": _parse_form_json(source_metadata, "source_metadata"),
            },
            "document": {
                "title": _none_if_empty(title) or filename,
                "language": language,
                "metadata": _parse_form_json(document_metadata, "document_metadata"),
            },
            "text": extracted_text,
            "chunking": {
                "max_chars": max_chars,
                "overlap_chars": overlap_chars,
            },
        }

        try:
            payload = IngestRequest.model_validate(payload_dict)
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail=exc.errors()) from exc

        try:
            ingest_result = await ingest_service.ingest(payload)
        except ServiceError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=500, detail=f"Unexpected upload error: {str(exc)}") from exc

        return UploadResponse(
            **ingest_result.model_dump(),
            filename=filename,
            content_type=content_type,
            chars_extracted=len(extracted_text),
        )
    finally:
        await file.close()


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
