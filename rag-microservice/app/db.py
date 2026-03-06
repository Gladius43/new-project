from __future__ import annotations

import asyncpg


class Database:
    def __init__(
        self,
        database_url: str,
        embedding_dim: int,
        min_pool_size: int = 1,
        max_pool_size: int = 10,
        command_timeout_seconds: float = 30.0,
    ) -> None:
        self._database_url = database_url
        self._embedding_dim = embedding_dim
        self._min_pool_size = min_pool_size
        self._max_pool_size = max_pool_size
        self._command_timeout_seconds = command_timeout_seconds
        self.pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self.pool = await asyncpg.create_pool(
            dsn=self._database_url,
            min_size=self._min_pool_size,
            max_size=self._max_pool_size,
            command_timeout=self._command_timeout_seconds,
        )

    async def close(self) -> None:
        if self.pool is not None:
            await self.pool.close()
            self.pool = None

    async def initialize_schema(self) -> None:
        if self.pool is None:
            raise RuntimeError("Database pool is not initialized")

        schema_sql = f"""
        CREATE EXTENSION IF NOT EXISTS vector;

        CREATE TABLE IF NOT EXISTS topics (
            id BIGSERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS projects (
            id BIGSERIAL PRIMARY KEY,
            topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(topic_id, name)
        );

        CREATE TABLE IF NOT EXISTS sources (
            id BIGSERIAL PRIMARY KEY,
            topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
            project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
            type TEXT NOT NULL,
            origin TEXT,
            external_id TEXT,
            url TEXT,
            published_at TIMESTAMPTZ,
            metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS documents (
            id BIGSERIAL PRIMARY KEY,
            source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            language TEXT,
            metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chunks (
            id BIGSERIAL PRIMARY KEY,
            document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
            source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
            chunk_index INT NOT NULL,
            content TEXT NOT NULL,
            embedding VECTOR({self._embedding_dim}) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(document_id, chunk_index)
        );

        CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
        CREATE INDEX IF NOT EXISTS idx_projects_topic_name ON projects(topic_id, name);
        CREATE INDEX IF NOT EXISTS idx_sources_topic_project ON sources(topic_id, project_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_id);
        CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine
            ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        """

        async with self.pool.acquire() as conn:
            await conn.execute(schema_sql)
