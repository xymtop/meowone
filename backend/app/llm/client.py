from __future__ import annotations
import asyncio
import httpx
import json
import uuid
from typing import AsyncIterator, Optional, List, Dict, Any
from app.config import LLM_API_KEY, LLM_BASE_URL, LLM_MODEL

MOCK_MODE = LLM_API_KEY in ("", "sk-mock", "mock")

MOCK_RESPONSES = {
    "default": "你好！我是 MeowOne，你的 AI 操作系统助手。我可以通过对话帮你完成各种任务。有什么我可以帮你的吗？",
    "card_demo": None,
}


async def _mock_stream(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
) -> AsyncIterator[Dict[str, Any]]:
    """Mock LLM for demo/testing when API is unavailable."""
    user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            user_msg = m.get("content", "").lower()
            break

    has_tool_result = any(m.get("role") == "tool" for m in messages)

    if has_tool_result:
        response = "操作已完成！如果你还需要其他帮助，随时告诉我。"
        for char in response:
            yield {"type": "content_delta", "content": char}
            await asyncio.sleep(0.02)
        yield {"type": "done"}
        return

    if tools and ("卡片" in user_msg or "card" in user_msg or "会议" in user_msg or "表单" in user_msg or "form" in user_msg):
        if "表单" in user_msg or "form" in user_msg or "订" in user_msg:
            args = json.dumps({
                "card_type": "form",
                "title": "✈️ 订机票",
                "fields": [
                    {"name": "from", "label": "出发地", "type": "text", "placeholder": "例如：北京", "required": True},
                    {"name": "to", "label": "目的地", "type": "text", "placeholder": "例如：上海", "required": True},
                    {"name": "date", "label": "出发日期", "type": "date", "required": True},
                ],
                "submit_label": "搜索航班"
            }, ensure_ascii=False)
            yield {"type": "content_delta", "content": "好的，请填写以下信息：\n\n"}
            await asyncio.sleep(0.3)
            tc_id = f"call_{uuid.uuid4().hex[:8]}"
            yield {"type": "tool_call", "id": tc_id, "name": "card_builder", "arguments": args}
        elif "会议" in user_msg or "安排" in user_msg:
            args = json.dumps({
                "card_type": "action",
                "title": "📅 创建会议",
                "fields": [
                    {"label": "时间", "value": "明天下午 15:00"},
                    {"label": "参与人", "value": "张三、李四"},
                    {"label": "地点", "value": "会议室 A"}
                ],
                "actions": [
                    {"id": "confirm", "label": "确认创建", "style": "primary", "payload": {}},
                    {"id": "modify", "label": "修改", "style": "secondary", "payload": {}}
                ]
            }, ensure_ascii=False)
            yield {"type": "content_delta", "content": "我帮你安排了一个会议，请确认：\n\n"}
            await asyncio.sleep(0.3)
            tc_id = f"call_{uuid.uuid4().hex[:8]}"
            yield {"type": "tool_call", "id": tc_id, "name": "card_builder", "arguments": args}
        else:
            args = json.dumps({
                "card_type": "info",
                "title": "📊 系统信息",
                "fields": [
                    {"label": "状态", "value": "运行中"},
                    {"label": "已注册智能体", "value": "1 个"},
                    {"label": "可用工具", "value": "card_builder"},
                ]
            }, ensure_ascii=False)
            yield {"type": "content_delta", "content": "这是一张信息卡片：\n\n"}
            await asyncio.sleep(0.3)
            tc_id = f"call_{uuid.uuid4().hex[:8]}"
            yield {"type": "tool_call", "id": tc_id, "name": "card_builder", "arguments": args}
        yield {"type": "done"}
        return

    response = MOCK_RESPONSES["default"]
    if "介绍" in user_msg or "你好" in user_msg or "hello" in user_msg or "hi" in user_msg:
        response = (
            "你好！我是 **MeowOne**，你的 AI 操作系统助手。\n\n"
            "我可以帮你：\n"
            "- 日常对话和问答\n"
            "- 安排会议（试试说 *帮我安排一个会议*）\n"
            "- 订机票（试试说 *帮我订机票*）\n"
            "- 查看系统信息（试试说 *显示一张卡片*）\n\n"
            "有什么我可以帮你的吗？"
        )
    elif "Card Action" in user_msg:
        response = "好的，操作已确认！会议已成功创建。我会通知所有参与人。"
    else:
        response = (
            "收到你的消息。目前系统运行在 Mock 模式（LLM API 不可达），"
            "但所有功能链路都正常工作。\n\n"
            "你可以试试以下指令来体验卡片系统：\n"
            "- 帮我安排一个会议（操作卡片）\n"
            "- 帮我订机票（表单卡片）\n"
            "- 显示一张卡片（信息卡片）"
        )

    for char in response:
        yield {"type": "content_delta", "content": char}
        await asyncio.sleep(0.02)
    yield {"type": "done"}


async def chat_completion_stream(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    model: Optional[str] = None,
) -> AsyncIterator[Dict[str, Any]]:
    """Stream chat completion from OpenAI-compatible API.
    Falls back to mock mode when API is unavailable.
    """
    if MOCK_MODE:
        async for chunk in _mock_stream(messages, tools):
            yield chunk
        return

    url = f"{LLM_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "model": model or LLM_MODEL,
        "messages": messages,
        "stream": True,
    }
    if tools:
        payload["tools"] = tools

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
                            yield {
                                "type": "tool_call",
                                "id": tc["id"],
                                "name": tc["name"],
                                "arguments": tc["arguments"],
                            }
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
                                tool_calls_buffer[idx] = {
                                    "id": tc.get("id", ""),
                                    "name": "",
                                    "arguments": "",
                                }
                            if tc.get("id"):
                                tool_calls_buffer[idx]["id"] = tc["id"]
                            if tc.get("function", {}).get("name"):
                                tool_calls_buffer[idx]["name"] = tc["function"]["name"]
                            if tc.get("function", {}).get("arguments"):
                                tool_calls_buffer[idx]["arguments"] += tc["function"]["arguments"]
    except (httpx.ConnectError, httpx.ConnectTimeout) as e:
        async for chunk in _mock_stream(messages, tools):
            yield chunk
