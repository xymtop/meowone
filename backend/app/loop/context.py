from __future__ import annotations
from typing import List, Dict, Any


class LoopContext:
    """Manages conversation context for the Agent Loop."""

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
        self.messages.append({
            "role": "assistant",
            "content": None,
            "tool_calls": [{
                "id": tool_call_id,
                "type": "function",
                "function": {"name": name, "arguments": arguments},
            }],
        })

    def add_tool_result(self, tool_call_id: str, result: str) -> None:
        self.messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": result,
        })

    def get_messages(self) -> List[Dict[str, Any]]:
        return self.messages
