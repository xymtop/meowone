from __future__ import annotations

import uuid

from app.db.database import get_db


async def create_execution_log(
    *,
    execution_id: str,
    agent_name: str,
    agent_type: str,
    status: str,
    duration_ms: int,
    error_code: str | None = None,
) -> None:
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO agent_execution_logs
            (id, execution_id, agent_name, agent_type, status, duration_ms, error_code, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                str(uuid.uuid4()),
                execution_id,
                agent_name,
                agent_type,
                status,
                duration_ms,
                error_code,
            ),
        )
        await db.commit()
