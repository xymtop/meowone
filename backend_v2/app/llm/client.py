"""LLM 客户端 - 支持流式调用，从数据库读取模型配置"""
from __future__ import annotations

import asyncio
import httpx
import json
import uuid
from typing import Any, AsyncIterator, Dict, List, Optional

from app.db.queries.models import get_default_model, get_model_by_name


async def _resolve_model(name: Optional[str] = None) -> Dict[str, Any]:
    """从数据库查找模型配置，fallback 到环境变量"""
    from app.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
    if name:
        m = await get_model_by_name(name)
        if m:
            return m
    m = await get_default_model()
    if m:
        return m
    # 最终 fallback
    return {"name": LLM_MODEL, "base_url": LLM_BASE_URL, "api_key": LLM_API_KEY}


def _is_mock(api_key: str) -> bool:
    return api_key in ("", "sk-mock", "mock")


async def _mock_stream(messages: List[Dict[str, Any]], tools=None) -> AsyncIterator[Dict[str, Any]]:
    response = "你好！我是 MeowOne，当前运行在 Mock 模式（LLM API 未配置）。"
    for char in response:
        yield {"type": "content_delta", "content": char}
        await asyncio.sleep(0.01)


async def chat_completion_stream(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    model: Optional[str] = None,
) -> AsyncIterator[Dict[str, Any]]:
    """流式调用 LLM，返回 content_delta / tool_call / done 事件"""
    cfg = await _resolve_model(model)
    base_url = str(cfg.get("base_url") or "").rstrip("/")
    api_key = str(cfg.get("api_key") or "")
    model_name = str(cfg.get("name") or model or "")

    if _is_mock(api_key) or not base_url:
        async for chunk in _mock_stream(messages, tools):
            yield chunk
        return

    url = f"{base_url}/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload: Dict[str, Any] = {"model": model_name, "messages": messages, "stream": True}
    if tools:
        payload["tools"] = tools
        payload["parallel_tool_calls"] = True

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                tool_calls_buffer: Dict[str, Dict[str, str]] = {}

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        for tc in tool_calls_buffer.values():
                            yield {"type": "tool_call", "id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]}
                        yield {"type": "done"}
                        return
                    try:
                        chunk = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
                    choice = chunk.get("choices", [{}])[0]
                    delta = choice.get("delta", {})
                    if delta.get("content"):
                        yield {"type": "content_delta", "content": delta["content"]}
                    if delta.get("tool_calls"):
                        for tc in delta["tool_calls"]:
                            idx = str(tc.get("index", 0))
                            if idx not in tool_calls_buffer:
                                tool_calls_buffer[idx] = {"id": tc.get("id", ""), "name": "", "arguments": ""}
                            if tc.get("id"):
                                tool_calls_buffer[idx]["id"] = tc["id"]
                            if tc.get("function", {}).get("name"):
                                tool_calls_buffer[idx]["name"] = tc["function"]["name"]
                            if tc.get("function", {}).get("arguments"):
                                tool_calls_buffer[idx]["arguments"] += tc["function"]["arguments"]
    except (httpx.ConnectError, httpx.ConnectTimeout):
        async for chunk in _mock_stream(messages, tools):
            yield chunk
