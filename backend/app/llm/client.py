"""
LLM 客户端模块

负责与 LLM API 通信，支持流式和非流式调用。
"""

from __future__ import annotations
import asyncio
import httpx
import json
import uuid
from typing import AsyncIterator, Optional, List, Dict, Any
from app.services.model_service import resolve_model_sync


def _is_mock_mode(api_key: str) -> bool:
    """检查是否处于 Mock 模式（用于演示/测试）"""
    return api_key in ("", "sk-mock", "mock")


# Mock 响应文本，用于 API 不可用时的演示
MOCK_RESPONSES = {
    "default": "你好！我是 MeowOne，你的 AI 操作系统助手。我可以通过对话帮你完成各种任务。有什么我可以帮你的吗？",
    "card_demo": None,
}


def _last_user_text_lower(messages: List[Dict[str, Any]]) -> str:
    """从消息列表中提取最后一条用户消息的文本（小写）

    用于 Mock 模式下的意图识别。

    Args:
        messages: 消息列表

    Returns:
        最后一条用户消息的文本（小写）
    """
    for m in reversed(messages):
        if m.get("role") != "user":
            continue
        c = m.get("content")
        if isinstance(c, str):
            return c.lower()
        if isinstance(c, list):
            # 处理多模态内容
            parts: List[str] = []
            for p in c:
                if isinstance(p, dict) and p.get("type") == "text":
                    parts.append(str(p.get("text", "")))
            return " ".join(parts).lower()
    return ""


async def _mock_stream(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
) -> AsyncIterator[Dict[str, Any]]:
    """Mock LLM 流式响应

    当 API 不可用时，提供模拟响应用于演示和测试。
    支持识别简单意图并返回相应的卡片数据。

    Args:
        messages: 消息列表
        tools: 可用工具列表

    Yields:
        模拟的流式响应事件
    """
    user_msg = _last_user_text_lower(messages)

    # 检查是否有工具结果
    has_tool_result = any(m.get("role") == "tool" for m in messages)

    if has_tool_result:
        # 工具执行后的响应
        response = "操作已完成！如果你还需要其他帮助，随时告诉我。"
        for char in response:
            yield {"type": "content_delta", "content": char}
            await asyncio.sleep(0.02)
        yield {"type": "done"}
        return

    # 根据用户意图生成响应
    if tools and ("卡片" in user_msg or "card" in user_msg or "会议" in user_msg or "表单" in user_msg or "form" in user_msg):
        if "表单" in user_msg or "form" in user_msg or "订" in user_msg:
            # 订机票表单
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
            # 会议卡片
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
            # 信息卡片
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

    # 默认响应
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

    # 流式输出
    for char in response:
        yield {"type": "content_delta", "content": char}
        await asyncio.sleep(0.02)
    yield {"type": "done"}


async def chat_completion_stream(
    messages: List[Dict[str, Any]],
    tools: Optional[List[Dict[str, Any]]] = None,
    model: Optional[str] = None,
) -> AsyncIterator[Dict[str, Any]]:
    """流式聊天补全

    从 OpenAI 兼容 API 获取流式响应。
    当 API 不可用时自动回退到 Mock 模式。

    Args:
        messages: 消息列表
        tools: 可用工具列表
        model: 模型名称（可选）

    Yields:
        流式响应事件（content_delta、tool_call、done）
    """
    # 解析模型配置
    model_cfg = resolve_model_sync(model)
    base_url = str(model_cfg.get("base_url") or "").rstrip("/")
    api_key = str(model_cfg.get("api_key") or "")
    model_name = str(model_cfg.get("name") or model or "")

    # Mock 模式检测
    if _is_mock_mode(api_key) or not base_url:
        async for chunk in _mock_stream(messages, tools):
            yield chunk
        return

    # 构建请求
    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload: Dict[str, Any] = {
        "model": model_name,
        "messages": messages,
        "stream": True,
    }
    if tools:
        payload["tools"] = tools
        # 允许模型在同一轮 assistant 消息中返回多个 tool_calls
        payload["parallel_tool_calls"] = True

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()

                # 工具调用缓冲区（用于处理分片的 tool_call）
                tool_calls_buffer: Dict[str, Dict[str, str]] = {}

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str.strip() == "[DONE]":
                        # 流结束时，输出所有累积的工具调用
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

                    # 内容增量
                    if delta.get("content"):
                        yield {"type": "content_delta", "content": delta["content"]}

                    # 工具调用（可能分片到达）
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
        # 连接失败时回退到 Mock 模式
        async for chunk in _mock_stream(messages, tools):
            yield chunk
