from __future__ import annotations

import hashlib
import json
import uuid
from typing import Any

import asyncpg

from app.schemas import DocumentPayload, SourcePayload


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in vector) + "]"


def _stable_int64_from_value(value: Any) -> int:
    digest = hashlib.sha1(str(value).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], byteorder="big", signed=False) & ((1 << 63) - 1)


def _coerce_value_for_udt(value: Any, udt_name: str | None) -> Any:
    if value is None or udt_name is None:
        return value

    if udt_name in {"int2", "int4", "int8"}:
        if isinstance(value, bool):
            return int(value)
        if isinstance(value, int):
            return value
        try:
            return int(str(value))
        except ValueError:
            return _stable_int64_from_value(value)

    if udt_name == "uuid":
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(str(value))
        except ValueError:
            return uuid.uuid5(uuid.NAMESPACE_OID, str(value))

    return str(value)


async def _get_column_udt_name(
    conn: asyncpg.Connection,
    table_name: str,
    column_name: str,
) -> str | None:
    row = await conn.fetchrow(
        """
        SELECT udt_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = $2
        ORDER BY (table_schema = 'public') DESC
        LIMIT 1
        """,
        table_name,
        column_name,
    )
    if row is None:
        return None
    return row["udt_name"]


async def _resolve_source_type(conn: asyncpg.Connection, requested_type: str) -> str:
    type_udt = await _get_column_udt_name(conn, "sources", "type")
    if not type_udt:
        return requested_type

    enum_rows = await conn.fetch(
        """
        SELECT e.enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = $1
        ORDER BY e.enumsortorder
        """,
        type_udt,
    )
    enum_values = [row["enumlabel"] for row in enum_rows]
    if not enum_values:
        return requested_type

    if requested_type in enum_values:
        return requested_type

    lowered = requested_type.lower()
    lowered_map = {value.lower(): value for value in enum_values}
    if lowered in lowered_map:
        return lowered_map[lowered]

    preferred_fallbacks = {
        "document": ["document", "text", "file", "note", "manual", "article"],
        "file": ["file", "document", "text"],
        "url": ["url", "web", "link"],
    }
    for candidate in preferred_fallbacks.get(lowered, []):
        if candidate in lowered_map:
            return lowered_map[candidate]

    return enum_values[0]


async def get_or_create_topic(conn: asyncpg.Connection, topic_name: str) -> Any:
    row = await conn.fetchrow("SELECT id FROM topics WHERE name = $1", topic_name)
    if row is not None:
        return row["id"]

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO topics (name)
            VALUES ($1)
            RETURNING id
            """,
            topic_name,
        )
    except asyncpg.UniqueViolationError:
        row = await conn.fetchrow("SELECT id FROM topics WHERE name = $1", topic_name)
        if row is None:
            raise

    return row["id"]


async def get_or_create_project(
    conn: asyncpg.Connection,
    topic_id: Any,
    project_name: str,
) -> Any:
    topic_id_udt = await _get_column_udt_name(conn, "projects", "topic_id")
    coerced_topic_id = _coerce_value_for_udt(topic_id, topic_id_udt)
    row = await conn.fetchrow("SELECT id FROM projects WHERE name = $1", project_name)
    if row is not None:
        return row["id"]

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO projects (topic_id, name)
            VALUES ($1, $2)
            RETURNING id
            """,
            coerced_topic_id,
            project_name,
        )
    except asyncpg.UniqueViolationError:
        row = await conn.fetchrow("SELECT id FROM projects WHERE name = $1", project_name)
        if row is None:
            raise

    return row["id"]


async def create_source(
    conn: asyncpg.Connection,
    topic_id: Any,
    project_id: Any,
    topic_name: str,
    project_name: str,
    source: SourcePayload,
) -> Any:
    source_topic_udt = await _get_column_udt_name(conn, "sources", "topic_id")
    source_project_udt = await _get_column_udt_name(conn, "sources", "project_id")
    source_type = await _resolve_source_type(conn, source.type)

    source_metadata = dict(source.metadata)
    source_metadata.setdefault("topic_name", topic_name)
    source_metadata.setdefault("project_name", project_name)

    coerced_topic_id = _coerce_value_for_udt(topic_id, source_topic_udt)
    coerced_project_id = _coerce_value_for_udt(project_id, source_project_udt)
    row = await conn.fetchrow(
        """
        INSERT INTO sources (
            topic_id,
            project_id,
            type,
            origin,
            external_id,
            url,
            published_at,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id
        """,
        coerced_topic_id,
        coerced_project_id,
        source_type,
        source.origin,
        source.external_id,
        source.url,
        source.published_at,
        json.dumps(source_metadata),
    )
    return row["id"]


async def create_document(
    conn: asyncpg.Connection,
    source_id: Any,
    document: DocumentPayload,
) -> Any:
    row = await conn.fetchrow(
        """
        INSERT INTO documents (source_id, title, language, metadata)
        VALUES ($1, $2, $3, $4::jsonb)
        RETURNING id
        """,
        source_id,
        document.title,
        document.language,
        json.dumps(document.metadata),
    )
    return row["id"]


async def insert_chunks(
    conn: asyncpg.Connection,
    document_id: Any,
    source_id: Any,
    chunks: list[str],
    embeddings: list[list[float]],
) -> int:
    records = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        records.append((document_id, source_id, idx, chunk, vector_to_literal(embedding)))

    await conn.executemany(
        """
        INSERT INTO chunks (document_id, source_id, chunk_index, content, embedding)
        VALUES ($1, $2, $3, $4, $5::vector)
        """,
        records,
    )
    return len(records)


async def search_chunks(
    conn: asyncpg.Connection,
    query_vector: list[float],
    top_k: int,
    topic_name: str | None = None,
    project_name: str | None = None,
) -> list[dict[str, Any]]:
    query_vector_literal = vector_to_literal(query_vector)
    params: list[Any] = [query_vector_literal]
    conditions: list[str] = []

    sql = """
    SELECT
        c.id::text AS chunk_id,
        c.document_id::text AS document_id,
        c.source_id::text AS source_id,
        c.content,
        (c.embedding <=> $1::vector) AS distance,
        d.title AS title,
        s.type AS source_type,
        s.url AS source_url,
        COALESCE(t.name, s.metadata->>'topic_name', '') AS topic_name,
        COALESCE(p.name, s.metadata->>'project_name', '') AS project_name
    FROM chunks c
    JOIN documents d ON d.id::text = c.document_id::text
    JOIN sources s ON s.id::text = c.source_id::text
    LEFT JOIN topics t ON t.id::text = s.topic_id::text
    LEFT JOIN projects p ON p.id::text = s.project_id::text
    """

    if topic_name:
        params.append(topic_name)
        conditions.append(f"COALESCE(t.name, s.metadata->>'topic_name', '') = ${len(params)}")

    if project_name:
        params.append(project_name)
        conditions.append(f"COALESCE(p.name, s.metadata->>'project_name', '') = ${len(params)}")

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    params.append(top_k)
    sql += f" ORDER BY c.embedding <=> $1::vector LIMIT ${len(params)}"

    rows = await conn.fetch(sql, *params)
    return [dict(row) for row in rows]
