from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.db.database import get_db

_worker_stop = asyncio.Event()
_worker_task: asyncio.Task | None = None


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _to_db_time(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(tzinfo=None).isoformat(timespec="seconds")


def _next_run(interval_seconds: int, from_time: datetime | None = None) -> str:
    base = from_time or _utc_now()
    return _to_db_time(base + timedelta(seconds=interval_seconds))


def _row_to_dict(row: Any) -> Dict[str, Any]:
    item = dict(row)
    item["enabled"] = bool(item.get("enabled", 1))
    return item


async def upsert_scheduled_task(
    *,
    name: str,
    agent_name: str,
    prompt: str,
    interval_seconds: int,
    scheduler_mode: str = "direct",
    task_tag: str = "",
    enabled: bool = True,
) -> None:
    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO scheduled_tasks (
              id, name, agent_name, prompt, interval_seconds, scheduler_mode, task_tag,
              enabled, next_run_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(name) DO UPDATE SET
              agent_name=excluded.agent_name,
              prompt=excluded.prompt,
              interval_seconds=excluded.interval_seconds,
              scheduler_mode=excluded.scheduler_mode,
              task_tag=excluded.task_tag,
              enabled=excluded.enabled,
              next_run_at=CASE
                WHEN excluded.enabled = 1 THEN COALESCE(scheduled_tasks.next_run_at, excluded.next_run_at)
                ELSE NULL
              END,
              updated_at=datetime('now')
            """,
            (
                str(uuid.uuid4()),
                name,
                agent_name,
                prompt,
                interval_seconds,
                scheduler_mode or "direct",
                task_tag,
                1 if enabled else 0,
                _next_run(interval_seconds) if enabled else None,
            ),
        )
        await db.commit()


async def list_scheduled_tasks(enabled_only: bool = False) -> List[Dict[str, Any]]:
    query = "SELECT * FROM scheduled_tasks"
    if enabled_only:
        query += " WHERE enabled = 1"
    query += " ORDER BY name ASC"
    async with get_db() as db:
        cur = await db.execute(query)
        rows = await cur.fetchall()
    return [_row_to_dict(r) for r in rows]


async def delete_scheduled_task(name: str) -> bool:
    async with get_db() as db:
        cur = await db.execute("DELETE FROM scheduled_tasks WHERE name = ?", (name,))
        await db.commit()
    return (cur.rowcount or 0) > 0


async def set_scheduled_task_enabled(name: str, enabled: bool) -> bool:
    async with get_db() as db:
        if enabled:
            cur = await db.execute(
                """
                UPDATE scheduled_tasks
                SET enabled = 1,
                    next_run_at = datetime('now', '+' || interval_seconds || ' seconds'),
                    updated_at = datetime('now')
                WHERE name = ?
                """,
                (name,),
            )
        else:
            cur = await db.execute(
                """
                UPDATE scheduled_tasks
                SET enabled = 0,
                    next_run_at = NULL,
                    updated_at = datetime('now')
                WHERE name = ?
                """,
                (name,),
            )
        await db.commit()
    return (cur.rowcount or 0) > 0


async def run_due_scheduled_tasks(limit: int = 5) -> Dict[str, Any]:
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT *
            FROM scheduled_tasks
            WHERE enabled = 1
              AND next_run_at IS NOT NULL
              AND next_run_at <= datetime('now')
            ORDER BY next_run_at ASC
            LIMIT ?
            """,
            (limit,),
        )
        rows = await cur.fetchall()

    from app.agents.definition import AgentDefinition
    from app.agents.dispatcher import agent_dispatcher
    from app.agents.plan_builder import AgentPlanBuilder
    from app.services import agent_service

    results: List[Dict[str, Any]] = []
    builder = AgentPlanBuilder()
    for row in rows:
        item = _row_to_dict(row)
        task_name = str(item.get("name") or "")
        try:
            agent_name = str(item["agent_name"])
            agent_row = await agent_service.get_agent(name=agent_name, agent_type="internal")
            if agent_row is None:
                invoke_result = {"ok": False, "error": f"Unknown internal agent: {agent_name}"}
            else:
                definition = AgentDefinition.from_row(agent_row)
                plan = await builder.build(definition, channel_id="scheduled_task")
                invoke_result = await agent_dispatcher.invoke(
                    plan=plan,
                    task=str(item["prompt"]),
                    history=[],
                    endpoint_base_url=definition.endpoint.base_url,
                )
            ok = bool(invoke_result.get("ok"))
            async with get_db() as db:
                await db.execute(
                    """
                    UPDATE scheduled_tasks
                    SET last_run_at = datetime('now'),
                        next_run_at = datetime('now', '+' || interval_seconds || ' seconds'),
                        last_status = ?,
                        last_output = ?,
                        last_error = ?,
                        updated_at = datetime('now')
                    WHERE name = ?
                    """,
                    (
                        "success" if ok else "failed",
                        str(invoke_result.get("output") or "")[:4000],
                        str(invoke_result.get("error") or "")[:2000] or None,
                        task_name,
                    ),
                )
                await db.commit()
            results.append({"name": task_name, "ok": ok, "result": invoke_result})
        except Exception as exc:  # noqa: BLE001
            async with get_db() as db:
                await db.execute(
                    """
                    UPDATE scheduled_tasks
                    SET last_run_at = datetime('now'),
                        next_run_at = datetime('now', '+' || interval_seconds || ' seconds'),
                        last_status = 'failed',
                        last_error = ?,
                        updated_at = datetime('now')
                    WHERE name = ?
                    """,
                    (str(exc)[:2000], task_name),
                )
                await db.commit()
            results.append({"name": task_name, "ok": False, "error": str(exc)})
    return {"ok": True, "count": len(results), "results": results}


async def start_scheduled_task_worker(interval_seconds: int = 15) -> None:
    global _worker_task
    if _worker_task and not _worker_task.done():
        return
    _worker_stop.clear()

    async def _worker() -> None:
        while not _worker_stop.is_set():
            try:
                await run_due_scheduled_tasks(limit=10)
            except Exception:
                pass
            try:
                await asyncio.wait_for(_worker_stop.wait(), timeout=interval_seconds)
            except TimeoutError:
                continue

    _worker_task = asyncio.create_task(_worker(), name="scheduled-task-worker")


async def stop_scheduled_task_worker() -> None:
    global _worker_task
    _worker_stop.set()
    if _worker_task:
        try:
            await _worker_task
        except Exception:
            pass
    _worker_task = None
