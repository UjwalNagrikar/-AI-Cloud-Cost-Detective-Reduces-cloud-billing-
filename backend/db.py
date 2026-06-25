import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import asyncpg


_pool: asyncpg.Pool | None = None
_memory_users: dict[str, dict[str, Any]] = {}
_memory_analyses: dict[str, dict[str, Any]] = {}
_next_user_id = 1


def _record_from_row(row: asyncpg.Record) -> dict[str, Any]:
    record = dict(row)
    if isinstance(record.get("analysis_result"), str):
        record["analysis_result"] = json.loads(record["analysis_result"])
    return record


async def init_db() -> None:
    global _pool
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return

    _pool = await asyncpg.create_pool(database_url)
    async with _pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS analyses (
                id UUID PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                resource_group TEXT NOT NULL,
                resources_scanned INTEGER NOT NULL,
                issues_found INTEGER NOT NULL,
                estimated_savings TEXT,
                analysis_result JSONB NOT NULL,
                status TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
            """
        )


async def close_db() -> None:
    if _pool:
        await _pool.close()


def using_postgres() -> bool:
    return _pool is not None


async def create_user(email: str, password_hash: str) -> dict[str, Any]:
    global _next_user_id
    normalized_email = email.strip().lower()

    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO users (email, password_hash)
                VALUES ($1, $2)
                RETURNING id, email, password_hash, created_at;
                """,
                normalized_email,
                password_hash,
            )
            return _record_from_row(row)

    if normalized_email in _memory_users:
        raise ValueError("Email is already registered.")

    user = {
        "id": _next_user_id,
        "email": normalized_email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
    }
    _next_user_id += 1
    _memory_users[normalized_email] = user
    return user


async def get_user_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, password_hash, created_at FROM users WHERE email = $1;",
                normalized_email,
            )
            return dict(row) if row else None

    return _memory_users.get(normalized_email)


async def save_analysis(
    *,
    analysis_id: str,
    user_id: int,
    resource_group: str,
    resources_scanned: int,
    issues_found: int,
    estimated_savings: str,
    analysis_result: dict[str, Any],
    status: str,
) -> dict[str, Any]:
    normalized_id = str(uuid.UUID(analysis_id))

    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO analyses (
                    id, user_id, resource_group, resources_scanned, issues_found,
                    estimated_savings, analysis_result, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
                RETURNING id::text, user_id, resource_group, resources_scanned,
                    issues_found, estimated_savings, analysis_result, status, created_at;
                """,
                normalized_id,
                user_id,
                resource_group,
                resources_scanned,
                issues_found,
                estimated_savings,
                json.dumps(analysis_result),
                status,
            )
            return _record_from_row(row)

    record = {
        "id": normalized_id,
        "user_id": user_id,
        "resource_group": resource_group,
        "resources_scanned": resources_scanned,
        "issues_found": issues_found,
        "estimated_savings": estimated_savings,
        "analysis_result": analysis_result,
        "status": status,
        "created_at": datetime.now(timezone.utc),
    }
    _memory_analyses[normalized_id] = record
    return record


async def list_analyses(user_id: int) -> list[dict[str, Any]]:
    if _pool:
        async with _pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id::text, resource_group, resources_scanned, issues_found,
                    estimated_savings, analysis_result, status, created_at
                FROM analyses
                WHERE user_id = $1
                ORDER BY created_at DESC;
                """,
                user_id,
            )
            return [_record_from_row(row) for row in rows]

    return sorted(
        [
            {key: value for key, value in record.items() if key != "user_id"}
            for record in _memory_analyses.values()
            if record["user_id"] == user_id
        ],
        key=lambda record: record["created_at"],
        reverse=True,
    )


async def get_analysis(user_id: int, analysis_id: str) -> dict[str, Any] | None:
    normalized_id = str(uuid.UUID(analysis_id))

    if _pool:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id::text, resource_group, resources_scanned, issues_found,
                    estimated_savings, analysis_result, status, created_at
                FROM analyses
                WHERE user_id = $1 AND id = $2::uuid;
                """,
                user_id,
                normalized_id,
            )
            return _record_from_row(row) if row else None

    record = _memory_analyses.get(normalized_id)
    if not record or record["user_id"] != user_id:
        return None
    return {key: value for key, value in record.items() if key != "user_id"}
