from __future__ import annotations

import asyncio
import json
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_db


async def create_workflow_execution(
    *,
    workflow_id: str,
    workflow_name: str,
    inputs: Dict[str, Any],
    max_rounds: Optional[int] = None,
    max_tool_phases: Optional[int] = None,
    model_name: Optional[str] = None,
) -> str:
    """创建工作流执行记录并启动异步执行"""
    execution_id = str(uuid.uuid4())

    async with get_db() as db:
        await db.execute(
            """
            INSERT INTO workflow_executions
            (id, workflow_id, workflow_name, status, inputs_json, created_at)
            VALUES (?, ?, ?, 'pending', ?, datetime('now'))
            """,
            (execution_id, workflow_id, workflow_name, json.dumps(inputs, ensure_ascii=False)),
        )
        await db.commit()

    asyncio.create_task(_execute_workflow_async(
        execution_id=execution_id,
        workflow_id=workflow_id,
        inputs=inputs,
        max_rounds=max_rounds,
        max_tool_phases=max_tool_phases,
        model_name=model_name,
    ))

    return execution_id


async def _execute_workflow_async(
    execution_id: str,
    workflow_id: str,
    inputs: Dict[str, Any],
    max_rounds: Optional[int],
    max_tool_phases: Optional[int],
    model_name: Optional[str],
) -> None:
    """异步执行工作流"""
    from app.core.runtime_container import runtime_container
    from app.gateway.turn_service import TurnService

    turn_service: TurnService = runtime_container.turn_service

    try:
        async with get_db() as db:
            await db.execute(
                "UPDATE workflow_executions SET status = 'running', started_at = datetime('now') WHERE id = ?",
                (execution_id,),
            )
            await db.commit()

        async with get_db() as db:
            cur = await db.execute("SELECT nodes_json, strategy FROM workflows WHERE id = ?", (workflow_id,))
            row = await cur.fetchone()
        if not row:
            raise Exception("Workflow not found")

        nodes = json.loads(row[0] or "[]")
        strategy = row[1] or "direct"

        node_results: Dict[str, Any] = {}
        outputs: Dict[str, Any] = {}

        if strategy == "parallel":
            tasks = []
            for node in nodes:
                task = _execute_node_async(
                    node=node,
                    inputs=inputs,
                    node_results=node_results,
                    max_rounds=max_rounds,
                    max_tool_phases=max_tool_phases,
                    model_name=model_name,
                    turn_service=turn_service,
                )
                tasks.append((node["id"], task))

            results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
            for (node_id, _), result in zip(tasks, results):
                if isinstance(result, Exception):
                    node_results[node_id] = {"status": "error", "error": str(result)}
                else:
                    node_results[node_id] = {"status": "success", "output": result}
                    outputs[node_id] = result

        elif strategy == "pipeline":
            for node in nodes:
                result = await _execute_single_node(
                    node=node,
                    inputs=inputs,
                    node_results=node_results,
                    max_rounds=max_rounds,
                    max_tool_phases=max_tool_phases,
                    model_name=model_name,
                    turn_service=turn_service,
                )
                node_results[node["id"]] = {"status": "success", "output": result}
                outputs[node["id"]] = result

        else:
            for node in nodes:
                deps = node.get("depends_on", [])
                if deps and not all(node_results.get(dep, {}).get("status") == "success" for dep in deps):
                    node_results[node["id"]] = {"status": "skipped", "reason": "dependencies not met"}
                    continue

                result = await _execute_single_node(
                    node=node,
                    inputs=inputs,
                    node_results=node_results,
                    max_rounds=max_rounds,
                    max_tool_phases=max_tool_phases,
                    model_name=model_name,
                    turn_service=turn_service,
                )
                node_results[node["id"]] = {"status": "success", "output": result}
                outputs[node["id"]] = result

        duration_ms = 0
        async with get_db() as db:
            cur = await db.execute(
                "SELECT started_at FROM workflow_executions WHERE id = ?", (execution_id,)
            )
            row = await cur.fetchone()
            if row and row[0]:
                started = datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
                duration_ms = int((datetime.now() - started).total_seconds() * 1000)

        async with get_db() as db:
            await db.execute(
                """
                UPDATE workflow_executions
                SET status = 'completed', outputs_json = ?, completed_at = datetime('now'),
                    duration_ms = ?, node_results_json = ?
                WHERE id = ?
                """,
                (json.dumps(outputs, ensure_ascii=False), duration_ms, json.dumps(node_results, ensure_ascii=False), execution_id),
            )
            await db.commit()

    except Exception as e:
        async with get_db() as db:
            await db.execute(
                """
                UPDATE workflow_executions
                SET status = 'failed', error_message = ?, completed_at = datetime('now')
                WHERE id = ?
                """,
                (str(e), execution_id),
            )
            await db.commit()


async def _execute_single_node(
    node: Dict[str, Any],
    inputs: Dict[str, Any],
    node_results: Dict[str, Any],
    max_rounds: Optional[int],
    max_tool_phases: Optional[int],
    model_name: Optional[str],
    turn_service,
) -> Any:
    """执行单个节点"""
    agent_name = node.get("agent_name", "")
    agent_type = node.get("agent_type", "internal")
    input_mapping = node.get("input_mapping", {})

    node_input = {}
    for target_key, source_key in input_mapping.items():
        if source_key in inputs:
            node_input[target_key] = inputs[source_key]
        elif source_key in node_results:
            prev_results = node_results.get(source_key, {})
            node_input[target_key] = prev_results.get("output", "")

    content = node.get("config", {}).get("prompt", "")
    if isinstance(content, dict):
        content = content.get("template", "")
    if not content and node_input:
        content = json.dumps(node_input, ensure_ascii=False)

    session_id = str(uuid.uuid4())
    user_payload = [{"type": "text", "text": content}]

    from app.services import message_service
    await message_service.create_message(
        session_id=session_id,
        role="user",
        content_type="text",
        content=content,
    )

    from app.gateway.adapters.web_sse import stream_web_sse_turn
    from app.sdk.core import safe_limits

    results_text = ""
    final_event_received = False

    async def collect_result(evt: Any) -> None:
        nonlocal results_text, final_event_received
        event = evt.get("event", "")
        data = evt.get("data", {})
        if event == "agent_message":
            results_text += data.get("content", "") + "\n"
        elif event == "done":
            final_event_received = True

    try:
        gen = stream_web_sse_turn(
            turn_service,
            session_id=session_id,
            user_content=user_payload,
            exclude_for_history=content,
            scheduler_mode="direct",
            agent_name=agent_name,
            agent_type=agent_type,
            limits=safe_limits(max_rounds, max_tool_phases, None),
            model_name=model_name,
        )

        async for chunk in gen:
            if hasattr(chunk, "event"):
                await collect_result({"event": chunk.event, "data": json.loads(chunk.data) if chunk.data else {}})

    except Exception as e:
        return {"error": str(e), "partial_output": results_text}

    return results_text.strip()


async def _execute_node_async(node: Dict, inputs, node_results, max_rounds, max_tool_phases, model_name, turn_service):
    return await _execute_single_node(node, inputs, node_results, max_rounds, max_tool_phases, model_name, turn_service)


async def get_workflow_execution(execution_id: str) -> Optional[Dict[str, Any]]:
    """获取执行详情"""
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT id, workflow_id, workflow_name, status, inputs_json, outputs_json,
                   error_message, started_at, completed_at, duration_ms, node_results_json, created_at
            FROM workflow_executions WHERE id = ?
            """,
            (execution_id,),
        )
        row = await cur.fetchone()

    if not row:
        return None

    item = dict(row)
    try:
        item["inputs"] = json.loads(item.get("inputs_json", "{}"))
    except Exception:
        item["inputs"] = {}
    try:
        item["outputs"] = json.loads(item.get("outputs_json", "{}"))
    except Exception:
        item["outputs"] = {}
    try:
        item["node_results"] = json.loads(item.get("node_results_json", "[]"))
    except Exception:
        item["node_results"] = []

    return item


async def list_workflow_executions(limit: int = 50) -> List[Dict[str, Any]]:
    """列出最近的工作流执行"""
    async with get_db() as db:
        cur = await db.execute(
            """
            SELECT id, workflow_id, workflow_name, status, duration_ms, created_at, started_at, completed_at
            FROM workflow_executions ORDER BY created_at DESC LIMIT ?
            """,
            (limit,),
        )
        rows = await cur.fetchall()

    return [dict(r) for r in rows]