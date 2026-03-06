# RAG Microservice (FastAPI + Postgres/pgvector)

Focused RAG ingestion/search API with:
- async FastAPI endpoints
- async Postgres connection pool (`asyncpg`)
- `pgvector` storage/query for embeddings
- OpenAI embeddings for chunk + query vectors

## Project layout

```
rag-microservice/
  app/
    main.py
    db.py
    models.py
    schemas.py
    services.py
  requirements.txt
  Dockerfile
  README.md
```

## Requirements

- Python 3.11+ (3.12 recommended)
- Postgres with `pgvector` extension available
- `OPENAI_API_KEY`

## Run locally

```bash
cd /Users/dmitrije/Documents/New\ project/rag-microservice
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set environment variables:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/ragdb"
export OPENAI_API_KEY="sk-..."
export EMBEDDING_MODEL="text-embedding-3-small"
export EMBEDDING_DIM="1536"
```

Start API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Run with Docker

```bash
cd /Users/dmitrije/Documents/New\ project/rag-microservice
docker build -t rag-microservice .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/ragdb" \
  -e OPENAI_API_KEY="sk-..." \
  -e EMBEDDING_MODEL="text-embedding-3-small" \
  -e EMBEDDING_DIM="1536" \
  rag-microservice
```

## Example requests

### `POST /ingest`

```bash
curl -X POST "http://localhost:8000/ingest" \
  -H "Content-Type: application/json" \
  -d '{
    "topic_name": "climate-migration",
    "project_name": "ukraine-climate-haven",
    "source": {
      "type": "document",
      "origin": "local",
      "external_id": "optional-id",
      "url": "https://example.com/ipcc",
      "published_at": "2022-01-01T00:00:00Z",
      "metadata": {}
    },
    "document": {
      "title": "Chapter 12 excerpt",
      "language": "en",
      "metadata": {}
    },
    "text": "Long raw text of the document...",
    "chunking": {
      "max_chars": 1000,
      "overlap_chars": 200
    }
  }'
```

### `POST /search`

```bash
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How will climate change affect migration in Eastern Europe?",
    "top_k": 10,
    "topic_name": "climate-migration",
    "project_name": "ukraine-climate-haven"
  }'
```

## Notes

- Startup creates required tables and indexes automatically.
- Embeddings are normalized to unit vectors before insert/search.
- Keep `EMBEDDING_MODEL` and `EMBEDDING_DIM` consistent with your database schema.
