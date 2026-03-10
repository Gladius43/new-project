from __future__ import annotations

import asyncio
import math
from io import BytesIO
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET

import asyncpg
from openai import APIError, AsyncOpenAI, OpenAIError

from app import models
from app.db import Database
from app.schemas import IngestRequest, IngestResponse, SearchRequest, SearchResponse, SearchResult, SearchResultSource


class ServiceError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


SUPPORTED_TEXT_EXTENSIONS = {".txt", ".md", ".csv", ".json", ".log", ".rst"}


def extract_text_from_file(filename: str, content_type: str | None, data: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    normalized_content_type = (content_type or "").lower()

    if suffix == ".pdf" or "application/pdf" in normalized_content_type:
        return _extract_text_from_pdf(data)

    if suffix == ".docx" or "wordprocessingml.document" in normalized_content_type:
        return _extract_text_from_docx(data)

    if suffix in SUPPORTED_TEXT_EXTENSIONS or normalized_content_type.startswith("text/"):
        return _extract_text_from_plain_text(data)

    raise ServiceError(400, "Unsupported file type. Supported: pdf, docx, txt, md, csv, json, log, rst.")


def _extract_text_from_plain_text(data: bytes) -> str:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ServiceError(400, "Plain text files must be UTF-8 encoded.") from exc

    text = text.strip()
    if not text:
        raise ServiceError(400, "Uploaded file is empty after text extraction.")
    return text


def _extract_text_from_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ServiceError(500, "Missing dependency 'pypdf' for PDF extraction.") from exc

    try:
        reader = PdfReader(BytesIO(data))
        page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
    except Exception as exc:  # noqa: BLE001
        raise ServiceError(400, f"Failed to read PDF: {str(exc)}") from exc

    text = "\n\n".join(segment for segment in page_texts if segment).strip()
    if not text:
        raise ServiceError(400, "Could not extract text from PDF.")
    return text


def _extract_text_from_docx(data: bytes) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            if "word/document.xml" not in archive.namelist():
                raise ServiceError(400, "Invalid DOCX: missing word/document.xml.")
            xml_bytes = archive.read("word/document.xml")
    except zipfile.BadZipFile as exc:
        raise ServiceError(400, "Failed to read DOCX: invalid zip archive.") from exc
    except KeyError as exc:
        raise ServiceError(400, "Failed to read DOCX content.") from exc
    except ServiceError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise ServiceError(400, f"Failed to read DOCX: {str(exc)}") from exc

    try:
        root = ET.fromstring(xml_bytes)
    except Exception as exc:  # noqa: BLE001
        raise ServiceError(400, f"Failed to read DOCX: {str(exc)}") from exc

    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", namespace):
        chunks = [node.text for node in paragraph.findall(".//w:t", namespace) if node.text]
        if chunks:
            paragraph_text = "".join(chunks).strip()
            if paragraph_text:
                paragraphs.append(paragraph_text)

    text = "\n\n".join(paragraphs).strip()
    if not text:
        raise ServiceError(400, "Could not extract text from DOCX.")
    return text


def chunk_text(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    cleaned_text = text.strip()
    if not cleaned_text:
        raise ServiceError(400, "text must not be empty")
    if max_chars <= 0:
        raise ServiceError(400, "chunking.max_chars must be greater than 0")
    if overlap_chars < 0:
        raise ServiceError(400, "chunking.overlap_chars must be >= 0")
    if overlap_chars >= max_chars:
        raise ServiceError(400, "chunking.overlap_chars must be smaller than chunking.max_chars")

    chunks: list[str] = []
    start = 0
    text_length = len(cleaned_text)

    while start < text_length:
        end = min(start + max_chars, text_length)
        chunks.append(cleaned_text[start:end])
        if end >= text_length:
            break
        start = end - overlap_chars

    return chunks


def normalize_vector(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        raise ServiceError(502, "Embedding provider returned a zero vector")
    return [value / norm for value in vector]


class EmbeddingService:
    def __init__(self, api_key: str, model: str, timeout_seconds: float, embedding_dim: int) -> None:
        self._model = model
        self._timeout_seconds = timeout_seconds
        self._embedding_dim = embedding_dim
        self._client = AsyncOpenAI(api_key=api_key)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            response = await asyncio.wait_for(
                self._client.embeddings.create(model=self._model, input=texts),
                timeout=self._timeout_seconds,
            )
        except asyncio.TimeoutError as exc:
            raise ServiceError(504, "Timed out while generating embeddings") from exc
        except APIError as exc:
            raise ServiceError(502, f"Embedding API error: {exc.message}") from exc
        except OpenAIError as exc:
            raise ServiceError(502, f"Embedding API request failed: {str(exc)}") from exc

        normalized_vectors: list[list[float]] = []
        for item in response.data:
            vector = item.embedding
            if len(vector) != self._embedding_dim:
                raise ServiceError(
                    500,
                    f"Embedding dimension mismatch: expected {self._embedding_dim}, got {len(vector)}",
                )
            normalized_vectors.append(normalize_vector(vector))

        return normalized_vectors

    async def embed_one(self, text: str) -> list[float]:
        vectors = await self.embed_batch([text])
        if not vectors:
            raise ServiceError(502, "Embedding provider returned no vectors")
        return vectors[0]


class IngestService:
    def __init__(self, db: Database, embedding_service: EmbeddingService) -> None:
        self._db = db
        self._embedding_service = embedding_service

    async def ingest(self, payload: IngestRequest) -> IngestResponse:
        chunks = chunk_text(
            text=payload.text,
            max_chars=payload.chunking.max_chars,
            overlap_chars=payload.chunking.overlap_chars,
        )
        embeddings = await self._embedding_service.embed_batch(chunks)
        if len(chunks) != len(embeddings):
            raise ServiceError(502, "Embedding count does not match chunk count")

        if self._db.pool is None:
            raise ServiceError(500, "Database pool is not initialized")

        try:
            async with self._db.pool.acquire() as conn:
                async with conn.transaction():
                    topic_id = await models.get_or_create_topic(conn, payload.topic_name)
                    project_id = await models.get_or_create_project(conn, topic_id, payload.project_name)
                    source_id = await models.create_source(
                        conn=conn,
                        topic_id=topic_id,
                        project_id=project_id,
                        topic_name=payload.topic_name,
                        project_name=payload.project_name,
                        source=payload.source,
                    )
                    document_id = await models.create_document(
                        conn=conn,
                        source_id=source_id,
                        document=payload.document,
                        raw_text=payload.text,
                    )
                    chunks_inserted = await models.insert_chunks(
                        conn=conn,
                        document_id=document_id,
                        source_id=source_id,
                        chunks=chunks,
                        embeddings=embeddings,
                    )
        except asyncpg.QueryCanceledError as exc:
            raise ServiceError(504, "Database timed out during ingest") from exc
        except asyncpg.PostgresError as exc:
            raise ServiceError(500, f"Database error during ingest: {str(exc)}") from exc

        return IngestResponse(
            topic_id=str(topic_id),
            project_id=str(project_id),
            source_id=str(source_id),
            document_id=str(document_id),
            chunks_inserted=chunks_inserted,
        )


class SearchService:
    def __init__(self, db: Database, embedding_service: EmbeddingService) -> None:
        self._db = db
        self._embedding_service = embedding_service

    async def search(self, payload: SearchRequest) -> SearchResponse:
        query_vector = await self._embedding_service.embed_one(payload.query)

        if self._db.pool is None:
            raise ServiceError(500, "Database pool is not initialized")

        try:
            async with self._db.pool.acquire() as conn:
                rows = await models.search_chunks(
                    conn=conn,
                    query_vector=query_vector,
                    top_k=payload.top_k,
                    topic_name=payload.topic_name,
                    project_name=payload.project_name,
                )
        except asyncpg.QueryCanceledError as exc:
            raise ServiceError(504, "Database timed out during search") from exc
        except asyncpg.PostgresError as exc:
            raise ServiceError(500, f"Database error during search: {str(exc)}") from exc

        results = [
            SearchResult(
                chunk_id=str(row["chunk_id"]),
                document_id=str(row["document_id"]),
                source_id=str(row["source_id"]),
                content=row["content"],
                distance=float(row["distance"]),
                source=SearchResultSource(
                    title=row["title"],
                    type=row["source_type"],
                    url=row["source_url"],
                    topic_name=row["topic_name"],
                    project_name=row["project_name"],
                ),
            )
            for row in rows
        ]

        return SearchResponse(results=results)
