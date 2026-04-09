"""
A2A 客户端 —— 调用外部智能体

通过 HTTP 发送任务给外部 A2A 智能体，将响应转换为 LoopEvent 流。
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.loop.events import DeltaEvent, DoneEvent, ErrorEvent, LoopEvent

logger = logging.getLogger(__name__)


async def call_a2a_agent(
    base_url: str,
    task: str,
    history: Optional[List[Dict[str, Any]]] = None,
    auth_token: Optional[str] = None,
    message_id: Optional[str] = None,
) -> AsyncIterator[LoopEvent]:
    """
    调用外部 A2A 智能体

    Args:
        base_url:   外部智能体的 A2A 端点（如 http://127.0.0.1:8001）
        task:       任务描述（用户消息）
        history:    对话历史（可选）
        auth_token: 认证 token（可选）
        message_id: 消息追踪 ID

    Yields:
        LoopEvent（DeltaEvent / DoneEvent / ErrorEvent）
    """
    mid = message_id or str(uuid.uuid4())
    start = time.perf_counter()

    headers: Dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    # A2A JSON-RPC 请求体（使用 message/send 方法）
    payload: Dict[str, Any] = {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": "message/send",
        "params": {
            "message": {
                "messageId": str(uuid.uuid4()),
                "role": "user",
                "parts": [{"type": "text", "text": task}],
            },
        },
    }
    if history:
        payload["params"]["history"] = history

    # 直接向 base_url 发送请求（不带 /a2a）
    url = base_url.rstrip("/")
    logger.info("A2A 调用: url=%s, task_len=%d", url, len(task))

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            logger.info("A2A 发送请求: method=%s", payload["method"])
            response = await client.post(url, json=payload, headers=headers)
            logger.info("A2A 响应: status=%d, content_type=%s", response.status_code, response.headers.get("content-type", ""))
            
            if response.status_code != 200:
                logger.error("A2A 错误响应: status=%d, body=%s", response.status_code, response.text[:500])
                yield ErrorEvent(code="A2A_HTTP_ERROR", message=f"HTTP {response.status_code}: {response.text[:200]}")
                yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=(time.perf_counter() - start) * 1000)
                return

            content_type = response.headers.get("content-type", "")
            if "text/event-stream" in content_type:
                result = _parse_sse_response(response.text)
            else:
                result = response.json()

        # 解析 A2A 响应
        logger.info("A2A 解析响应: type=%s, keys=%s", type(result).__name__, list(result.keys()) if isinstance(result, dict) else "N/A")
        
        if isinstance(result, dict) and "error" in result:
            error = result["error"]
            logger.error("A2A JSON-RPC 错误: %s", error)
            yield ErrorEvent(code="A2A_ERROR", message=str(error))
            yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=(time.perf_counter() - start) * 1000)
            return

        result_data = result.get("result", {}) if isinstance(result, dict) else result
        logger.info("A2A result_data: type=%s, keys=%s", type(result_data).__name__, list(result_data.keys()) if isinstance(result_data, dict) else "N/A")

        # 提取 artifacts 中的文本
        artifacts = result_data.get("artifacts", []) if isinstance(result_data, dict) else []
        logger.info("A2A artifacts 数量: %d", len(artifacts))
        
        output_parts: List[str] = []
        for artifact in artifacts:
            for part in artifact.get("parts", []):
                # 支持 type 和 kind 两种字段名（A2A 规范不同版本）
                part_type = part.get("type") or part.get("kind")
                if part_type == "text":
                    output_parts.append(str(part.get("text", "")))

        output = "\n".join(output_parts).strip()
        logger.info("A2A 提取文本: len=%d, preview=%s", len(output), output[:200] if output else "(empty)")
        
        if not output:
            # 如果没有 artifact，尝试从 message 中获取
            msg = result_data.get("message", {}) if isinstance(result_data, dict) else {}
            for part in msg.get("parts", []):
                # 支持 type 和 kind 两种字段名
                part_type = part.get("type") or part.get("kind")
                if part_type == "text":
                    output_parts.append(str(part.get("text", "")))
            output = "\n".join(output_parts).strip()
            logger.info("A2A 从 message 提取: len=%d", len(output))

        if output:
            yield DeltaEvent(message_id=mid, content=output, done=False)
        yield DeltaEvent(message_id=mid, content="", done=True)
        yield DoneEvent(
            message_id=mid,
            loop_rounds=1,
            total_duration=(time.perf_counter() - start) * 1000,
        )
        logger.info("A2A 完成: duration=%.2fms", (time.perf_counter() - start) * 1000)

    except httpx.ConnectError as e:
        logger.error("A2A 连接失败: %s", e)
        yield ErrorEvent(code="A2A_UNREACHABLE", message=str(e))
        yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=(time.perf_counter() - start) * 1000)
    except httpx.TimeoutException as e:
        logger.error("A2A 超时: %s", e)
        yield ErrorEvent(code="A2A_TIMEOUT", message=str(e))
        yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=(time.perf_counter() - start) * 1000)
    except Exception as e:
        logger.exception("A2A 调用失败: %s", base_url)
        yield ErrorEvent(code="A2A_ERROR", message=str(e))
        yield DoneEvent(message_id=mid, loop_rounds=0, total_duration=(time.perf_counter() - start) * 1000)


def _parse_sse_response(text: str) -> Dict[str, Any]:
    """解析 Server-Sent Events 响应"""
    result = None
    current_event = ""
    current_data = ""

    for line in text.split("\n"):
        line = line.rstrip("\r")
        if not line:
            continue

        if line.startswith("event: "):
            current_event = line[7:].strip()
        elif line.startswith("data: "):
            current_data = line[6:].strip()
        elif line == "" and current_event and current_data:
            try:
                data_obj = json.loads(current_data)
                if isinstance(data_obj, dict):
                    if "result" in data_obj:
                        result = data_obj["result"]
                    elif "error" in data_obj:
                        raise RuntimeError(f"A2A error: {data_obj['error']}")
            except json.JSONDecodeError:
                pass
            current_event = ""
            current_data = ""

    return result or {}
