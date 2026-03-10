from __future__ import annotations

import json
from typing import Any

import asyncpg

from app.schemas import DocumentPayload, SourcePayload


def vector_to_literal(vector: list[float]) -> str:
    return "[" + ",".join(f"{value:.10f}" for value in vector) + "]"


async def get_or_create_topic(conn: asyncpg.Connection, topic_name: str) -> int:
    row = await conn.fetchrow("SELECT id FROM topics WHERE name = $1", topic_name)
    if row is not None:
        return int(row["id"])

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

    return int(row["id"])


async def get_or_create_project(
    conn: asyncpg.Connection,
    topic_id: int,
    project_name: str,
) -> int:
    row = await conn.fetchrow(
        """
        SELECT id
        FROM projects
        WHERE topic_id = $1 AND name = $2
        """,
        topic_id,
        project_name,
    )
    if row is not None:
        return int(row["id"])

    try:
        row = await conn.fetchrow(
            """
            INSERT INTO projects (topic_id, name)
            VALUES ($1, $2)
            RETURNING id
            """,
            topic_id,
            project_name,
        )
    except asyncpg.UniqueViolationError:
        row = await conn.fetchrow(
            """
            SELECT id
            FROM projects
            WHERE topic_id = $1 AND name = $2
            """,
            topic_id,
            project_name,
        )
        if row is None:
            raise

    return int(row["id"])


async def create_source(
    conn: asyncpg.Connection,
    topic_id: int,
    project_id: int,
    source: SourcePayload,
) -> int:
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
        topic_id,
        project_id,
        source.type,
        source.origin,
        source.external_id,
        source.url,
        source.published_at,
        json.dumps(source.metadata),
    )
    return int(row["id"])


async def create_document(
    conn: asyncpg.Connection,
    source_id: int,
    document: DocumentPayload,
) -> int:
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
    return int(row["id"])


async def insert_chunks(
    conn: asyncpg.Connection,
    document_id: int,
    source_id: int,
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
        t.name AS topic_name,
        p.name AS project_name
    FROM chunks c
    JOIN documents d ON d.id::text = c.document_id::text
    JOIN sources s ON s.id::text = c.source_id::text
    JOIN topics t ON t.id::text = s.topic_id::text
    JOIN projects p ON p.id::text = s.project_id::text
    """

    if topic_name:
        params.append(topic_name)
        conditions.append(f"t.name = ${len(params)}")

    if project_name:
        params.append(project_name)
        conditions.append(f"p.name = ${len(params)}")

    if conditions:
        sql += " WHERE " + " AND ".join(conditions)

    params.append(top_k)
    sql += f" ORDER BY c.embedding <=> $1::vector LIMIT ${len(params)}"

    rows = await conn.fetch(sql, *params)
    return [dict(row) for row in rows]
