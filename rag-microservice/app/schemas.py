from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class SourcePayload(BaseModel):
    type: str = Field(min_length=1, max_length=100)
    origin: str | None = Field(default=None, max_length=100)
    external_id: str | None = Field(default=None, max_length=255)
    url: str | None = Field(default=None, max_length=2048)
    published_at: datetime | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class DocumentPayload(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    language: str | None = Field(default=None, max_length=32)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChunkingOptions(BaseModel):
    max_chars: int = Field(default=1000, ge=100, le=10000)
    overlap_chars: int = Field(default=200, ge=0, le=5000)

    @field_validator("overlap_chars")
    @classmethod
    def overlap_must_be_smaller_than_chunk(cls, overlap_chars: int, info) -> int:
        max_chars = info.data.get("max_chars")
        if max_chars is not None and overlap_chars >= max_chars:
            raise ValueError("overlap_chars must be smaller than max_chars")
        return overlap_chars


class IngestRequest(BaseModel):
    topic_name: str = Field(min_length=1, max_length=255)
    project_name: str = Field(min_length=1, max_length=255)
    source: SourcePayload
    document: DocumentPayload
    text: str = Field(min_length=1)
    chunking: ChunkingOptions = Field(default_factory=ChunkingOptions)


class IngestResponse(BaseModel):
    topic_id: int
    project_id: int
    source_id: int
    document_id: int
    chunks_inserted: int


class SearchRequest(BaseModel):
    query: str = Field(min_length=1)
    top_k: int = Field(default=10, ge=1, le=100)
    topic_name: str | None = Field(default=None, max_length=255)
    project_name: str | None = Field(default=None, max_length=255)


class SearchResultSource(BaseModel):
    title: str
    type: str
    url: str | None
    topic_name: str
    project_name: str


class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    source_id: str
    content: str
    distance: float
    source: SearchResultSource


class SearchResponse(BaseModel):
    results: list[SearchResult]
