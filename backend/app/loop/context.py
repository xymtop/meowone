from __future__ import annotations
from typing import List, Dict, Any


class LoopContext:
    """管理 Agent 循环的对话上下文（与 OpenAI Chat Completions 消息格式对齐）。"""

    def __init__(self, system_prompt: str, history: List[Dict[str, Any]]) -> None:
        self.system_prompt = system_prompt
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]
        for msg in history:
            self.messages.append({
                "role": msg["role"],
                "content": msg.get("content", ""),
            })

    def add_user_message(self, content: str) -> None:
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        self.messages.append({"role": "assistant", "content": content})

    def add_tool_call(self, tool_call_id: str, name: str, arguments: str) -> None:
        """单工具调用（兼容旧路径）；多工具请用 add_assistant_tool_calls。"""
        self.add_assistant_tool_calls(
            [{"id": tool_call_id, "name": name, "arguments": arguments}]
        )

    def add_assistant_tool_calls(self, calls: List[Dict[str, str]]) -> None:
        """将同一轮中的多个 function call 写入一条 assistant 消息（支持并行执行后按序回填 tool 结果）。"""
        if not calls:
            return
        payload = []
        for c in calls:
            payload.append({
                "id": c["id"],
                "type": "function",
                "function": {
                    "name": c["name"],
                    "arguments": c["arguments"],
                },
            })
        self.messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": payload,
        })

    def add_tool_result(self, tool_call_id: str, result: str) -> None:
        self.messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": result,
        })

    def get_messages(self) -> List[Dict[str, Any]]:
        return self.messages
