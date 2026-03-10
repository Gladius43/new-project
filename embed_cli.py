#!/usr/bin/env python3
"""Small CLI client for the deployed RAG API."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from pathlib import Path
from typing import Any

# Configuration constants (easy to change in one place).
ENV_BASE_URL = "EMBED_API_URL"
DEFAULT_BASE_URL = "http://ingenious-embrace.railway.internal"

INGEST_PATH = "/ingest"
UPLOAD_PATH = "/upload"
SEARCH_PATH = "/search"
HEALTH_PATH = "/health"

REQUEST_TIMEOUT_SECONDS = 30
DEFAULT_TOPIC_NAME = "default-topic"
DEFAULT_PROJECT_NAME = "default-project"


def exit_with_error(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def join_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


def import_requests():
    try:
        import requests  # type: ignore
    except ImportError:
        exit_with_error("Error: missing dependency 'requests'. Install with: pip install requests")
    return requests


def parse_json_response(response: Any) -> dict[str, Any]:
    try:
        data = response.json()
    except ValueError:
        exit_with_error("Error: server returned non-JSON response.")
    if not isinstance(data, dict):
        exit_with_error("Error: expected JSON object response.")
    return data


def request_json(method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    requests = import_requests()
    try:
        response = requests.request(method=method, url=url, timeout=REQUEST_TIMEOUT_SECONDS, **kwargs)
    except requests.exceptions.Timeout:
        exit_with_error("Error: request timed out.")
    except requests.exceptions.ConnectionError as exc:
        exit_with_error(f"Error: connection failed: {exc}")
    except requests.exceptions.RequestException as exc:
        exit_with_error(f"Error: request failed: {exc}")

    if not (200 <= response.status_code < 300):
        body = response.text.strip()
        if not body:
            body = "<empty body>"
        exit_with_error(f"Error: HTTP {response.status_code}: {body}")

    return parse_json_response(response)


def print_json(data: dict[str, Any]) -> None:
    print(json.dumps(data, indent=2, ensure_ascii=False))


def read_text_file(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        exit_with_error(f"Error: file not found: {path}")
    if not path.is_file():
        exit_with_error(f"Error: not a file: {path}")

    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        exit_with_error(f"Error: cannot read file: {exc}")
    except UnicodeDecodeError:
        exit_with_error("Error: file must be UTF-8 text for /ingest.")
    return ""


def parse_json_object(value: str, argument_name: str) -> dict[str, Any]:
    try:
        data = json.loads(value)
    except ValueError as exc:
        exit_with_error(f"Error: invalid JSON in {argument_name}: {exc}")
    if not isinstance(data, dict):
        exit_with_error(f"Error: {argument_name} must be a JSON object.")
    return data


def run_ingest_request(
    base_url: str,
    text: str,
    *,
    topic_name: str,
    project_name: str,
    source_type: str,
    source_origin: str,
    source_external_id: str | None,
    source_url: str | None,
    source_published_at: str | None,
    source_metadata_raw: str,
    document_title: str,
    document_language: str,
    document_metadata_raw: str,
    max_chars: int,
    overlap_chars: int,
) -> None:
    if max_chars <= 0:
        exit_with_error("Error: --max-chars must be positive.")
    if overlap_chars < 0:
        exit_with_error("Error: --overlap-chars must be >= 0.")
    if overlap_chars >= max_chars:
        exit_with_error("Error: --overlap-chars must be smaller than --max-chars.")

    payload = {
        "topic_name": topic_name,
        "project_name": project_name,
        "source": {
            "type": source_type,
            "origin": source_origin,
            "external_id": source_external_id,
            "url": source_url,
            "published_at": source_published_at,
            "metadata": parse_json_object(source_metadata_raw, "--source-metadata"),
        },
        "document": {
            "title": document_title,
            "language": document_language,
            "metadata": parse_json_object(document_metadata_raw, "--document-metadata"),
        },
        "text": text,
        "chunking": {
            "max_chars": max_chars,
            "overlap_chars": overlap_chars,
        },
    }

    url = join_url(base_url, INGEST_PATH)
    result = request_json("POST", url, json=payload)
    print_json(result)


def run_ingest(base_url: str, args: argparse.Namespace) -> None:
    text: str
    inferred_title: str
    inferred_external_id: str | None

    if args.text is not None:
        text = args.text
        inferred_title = "CLI text input"
        inferred_external_id = None
    else:
        file_path = args.file
        text = read_text_file(file_path)
        inferred_title = Path(file_path).name
        inferred_external_id = Path(file_path).name

    run_ingest_request(
        base_url=base_url,
        text=text,
        topic_name=args.topic_name,
        project_name=args.project_name,
        source_type=args.source_type,
        source_origin=args.source_origin,
        source_external_id=args.source_external_id or inferred_external_id,
        source_url=args.source_url,
        source_published_at=args.source_published_at,
        source_metadata_raw=args.source_metadata,
        document_title=args.document_title or inferred_title,
        document_language=args.document_language,
        document_metadata_raw=args.document_metadata,
        max_chars=args.max_chars,
        overlap_chars=args.overlap_chars,
    )


def run_embed(base_url: str, args: argparse.Namespace) -> None:
    run_ingest_request(
        base_url=base_url,
        text=args.text,
        topic_name=args.topic_name,
        project_name=args.project_name,
        source_type=args.source_type,
        source_origin=args.source_origin,
        source_external_id=args.source_external_id,
        source_url=args.source_url,
        source_published_at=args.source_published_at,
        source_metadata_raw=args.source_metadata,
        document_title=args.document_title or "CLI text input",
        document_language=args.document_language,
        document_metadata_raw=args.document_metadata,
        max_chars=args.max_chars,
        overlap_chars=args.overlap_chars,
    )


def run_upload(base_url: str, args: argparse.Namespace) -> None:
    path = Path(args.file)
    if not path.exists():
        exit_with_error(f"Error: file not found: {path}")
    if not path.is_file():
        exit_with_error(f"Error: not a file: {path}")

    content_type, _ = mimetypes.guess_type(path.name)
    if content_type is None:
        content_type = "application/octet-stream"

    form_data = {
        "topic_name": args.topic_name,
        "project_name": args.project_name,
        "title": args.document_title or path.name,
        "language": args.document_language,
        "source_type": args.source_type,
        "source_origin": args.source_origin,
        "source_external_id": args.source_external_id or path.name,
        "source_url": args.source_url or "",
        "source_published_at": args.source_published_at or "",
        "source_metadata": args.source_metadata,
        "document_metadata": args.document_metadata,
        "max_chars": str(args.max_chars),
        "overlap_chars": str(args.overlap_chars),
    }

    url = join_url(base_url, UPLOAD_PATH)
    try:
        with path.open("rb") as file_handle:
            files = {"file": (path.name, file_handle, content_type)}
            result = request_json("POST", url, data=form_data, files=files)
    except OSError as exc:
        exit_with_error(f"Error: cannot read file: {exc}")

    print_json(result)


def run_search(base_url: str, args: argparse.Namespace) -> None:
    query = args.query
    top_k = args.top_k
    if top_k <= 0:
        exit_with_error("Error: --top-k must be a positive integer.")

    url = join_url(base_url, SEARCH_PATH)
    payload = {"query": query, "top_k": top_k}
    if args.topic_name:
        payload["topic_name"] = args.topic_name
    if args.project_name:
        payload["project_name"] = args.project_name

    result = request_json("POST", url, json=payload)
    print_json(result)


def run_health(base_url: str) -> None:
    url = join_url(base_url, HEALTH_PATH)
    result = request_json("GET", url)
    print_json(result)


def add_ingest_fields(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--topic-name", default=DEFAULT_TOPIC_NAME, help="Topic name")
    parser.add_argument("--project-name", default=DEFAULT_PROJECT_NAME, help="Project name")
    parser.add_argument("--source-type", default="document", help="Source type")
    parser.add_argument("--source-origin", default="local", help="Source origin")
    parser.add_argument("--source-external-id", default=None, help="Source external id")
    parser.add_argument("--source-url", default=None, help="Source URL")
    parser.add_argument("--source-published-at", default=None, help="ISO datetime, e.g. 2022-01-01T00:00:00Z")
    parser.add_argument("--source-metadata", default="{}", help="JSON object for source metadata")
    parser.add_argument("--document-title", default=None, help="Document title")
    parser.add_argument("--document-language", default="en", help="Document language")
    parser.add_argument("--document-metadata", default="{}", help="JSON object for document metadata")
    parser.add_argument("--max-chars", type=int, default=1000, help="Chunk max chars")
    parser.add_argument("--overlap-chars", type=int, default=200, help="Chunk overlap chars")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="CLI client for RAG API")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ingest_parser = subparsers.add_parser("ingest", help="Ingest text or file via /ingest")
    ingest_input = ingest_parser.add_mutually_exclusive_group(required=True)
    ingest_input.add_argument("--text", help="Raw text to ingest")
    ingest_input.add_argument("--file", help="Path to UTF-8 text file to ingest")
    add_ingest_fields(ingest_parser)

    embed_parser = subparsers.add_parser("embed", help="Compatibility alias: ingest text")
    embed_parser.add_argument("--text", required=True, help="Text to ingest")
    add_ingest_fields(embed_parser)

    upload_parser = subparsers.add_parser("upload", help="Upload file via /upload (pdf/docx/txt/...)")
    upload_parser.add_argument("--file", required=True, help="Path to file to upload")
    add_ingest_fields(upload_parser)

    search_parser = subparsers.add_parser("search", help="Semantic search")
    search_parser.add_argument("--query", required=True, help="Search query")
    search_parser.add_argument("--top-k", type=int, default=5, help="Number of results to return")
    search_parser.add_argument("--topic-name", default=None, help="Optional topic filter")
    search_parser.add_argument("--project-name", default=None, help="Optional project filter")

    subparsers.add_parser("health", help="Check /health")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    base_url = os.getenv(ENV_BASE_URL, DEFAULT_BASE_URL).strip()
    if not base_url:
        exit_with_error("Error: EMBED_API_URL is set but empty.")

    if args.command == "ingest":
        run_ingest(base_url=base_url, args=args)
        return

    if args.command == "embed":
        run_embed(base_url=base_url, args=args)
        return

    if args.command == "upload":
        run_upload(base_url=base_url, args=args)
        return

    if args.command == "search":
        run_search(base_url=base_url, args=args)
        return

    if args.command == "health":
        run_health(base_url=base_url)
        return

    exit_with_error("Error: unknown command.")


if __name__ == "__main__":
    main()
