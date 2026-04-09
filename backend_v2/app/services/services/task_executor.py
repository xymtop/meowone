from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


async def execute_task_async(task_id: str) -> None:
    """异步执行任务"""
    from app.db.database import get_db
    from app.core.runtime_container import runtime_container
    from app.gateway.turn_service import TurnService
    from app.services import message_service

    turn_service: TurnService = runtime_container.turn_service

    try:
        async with get_db() as db:
            await db.execute(
                "UPDATE tasks SET status = 'running', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
                (task_id,),
            )
            await db.commit()

        task = await _get_task(task_id)
        if not task:
            raise Exception("Task not found")

        input_data = task.get("input_data", {})
        agent_name = task.get("agent_name") or input_data.get("agent_name", "")
        agent_type = task.get("agent_type", "internal")
        content = input_data.get("content", input_data.get("prompt", ""))

        if not content:
            raise Exception("No content to process")

        session_id = task_id
        await message_service.create_message(
            session_id=session_id,
            role="user",
            content_type="text",
            content=content,
        )

        from app.gateway.adapters.web_sse import stream_web_sse_turn

        results = []
        final_done = False

        async def collect_events():
            nonlocal results, final_done
            async for chunk in stream_web_sse_turn(
                turn_service,
                session_id=session_id,
                user_content=[{"type": "text", "text": content}],
                exclude_for_history=content,
                agent_name=agent_name,
                agent_type=agent_type,
            ):
                evt_data = {}
                if hasattr(chunk, "event") and hasattr(chunk, "data"):
                    try:
                        evt_data = json.loads(chunk.data) if chunk.data else {}
                    except Exception:
                        evt_data = {}
                    results.append({"event": chunk.event, "data": evt_data})
                    if chunk.event == "done":
                        final_done = True

        try:
            await asyncio.wait_for(collect_events(), timeout=300)
        except asyncio.TimeoutError:
            logger.warning(f"Task {task_id} timed out")

        output = {"events": results, "completed": final_done}

        async with get_db() as db:
            await db.execute(
                """
                UPDATE tasks
                SET status = 'completed', output_json = ?, completed_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (json.dumps(output, ensure_ascii=False), task_id),
            )
            await db.commit()

    except Exception as e:
        logger.error(f"Task {task_id} failed: {e}")
        async with get_db() as db:
            await db.execute(
                """
                UPDATE tasks
                SET status = 'failed', error_message = ?, completed_at = datetime('now'),
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (str(e), task_id),
            )
            await db.commit()


async def _get_task(task_id: str) -> Optional[Dict[str, Any]]:
    async with get_db() as db:
        cur = await db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        row = await cur.fetchone()
    if not row:
        return None

    task = dict(row)
    try:
        task["input_data"] = json.loads(task.get("input_json", "{}"))
    except Exception:
        task["input_data"] = {}
    return task


async def get_task_execution_history(agent_name: Optional[str] = None, limit: int = 50) -> list:
    """获取任务执行历史"""
    async with get_db() as db:
        where = "WHERE agent_name = ?" if agent_name else ""
        params = (agent_name,) if agent_name else ()
        cur = await db.execute(
            f"""
            SELECT id, name, task_type, status, agent_name, duration_ms, error_message, created_at, completed_at
            FROM tasks {where}
            ORDER BY created_at DESC LIMIT ?
            """,
            params + (limit,),
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]