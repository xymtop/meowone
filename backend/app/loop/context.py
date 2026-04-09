"""
Loop 上下文管理模块

管理智能体循环的对话上下文，与 OpenAI Chat Completions 消息格式对齐。

主要功能：
- 管理消息历史（system、user、assistant、tool）
- 添加用户消息、助手消息、工具调用、工具结果
"""

from __future__ import annotations
from typing import List, Dict, Any, Union

# 用户消息内容类型：可以是字符串或多模态内容列表
UserContent = Union[str, List[Dict[str, Any]]]


class LoopContext:
    """对话上下文管理器

    管理 Agent 循环的对话上下文，与 OpenAI Chat Completions 消息格式对齐。

    消息格式示例：
    [
        {"role": "system", "content": "系统提示..."},
        {"role": "user", "content": "用户消息..."},
        {"role": "assistant", "content": "助手回复..."},
        {"role": "assistant", "content": null, "tool_calls": [...]},
        {"role": "tool", "tool_call_id": "xxx", "content": "工具结果..."},
    ]
    """

    def __init__(self, system_prompt: str, history: List[Dict[str, Any]]) -> None:
        """初始化上下文

        Args:
            system_prompt: 系统提示词
            history: 对话历史列表
        """
        self.system_prompt = system_prompt
        # 初始化消息列表，包含系统消息
        self.messages: List[Dict[str, Any]] = [
            {"role": "system", "content": system_prompt}
        ]
        # 追加历史消息
        for msg in history:
            self.messages.append({
                "role": msg["role"],
                "content": msg.get("content", ""),
            })

    def add_user_message(self, content: UserContent) -> None:
        """添加用户消息

        Args:
            content: 用户消息内容
        """
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        """添加助手消息

        Args:
            content: 助手回复内容
        """
        self.messages.append({"role": "assistant", "content": content})

    def add_tool_call(self, tool_call_id: str, name: str, arguments: str) -> None:
        """添加单个工具调用（兼容旧路径）

        Args:
            tool_call_id: 工具调用 ID
            name: 工具名称
            arguments: 工具参数（JSON 字符串）
        """
        self.add_assistant_tool_calls(
            [{"id": tool_call_id, "name": name, "arguments": arguments}]
        )

    def add_assistant_tool_calls(self, calls: List[Dict[str, str]]) -> None:
        """添加助手的多工具调用

        将同一轮中的多个 function call 写入一条 assistant 消息。
        支持并行执行后按序回填工具结果。

        Args:
            calls: 工具调用列表，每项包含 id、name、arguments
        """
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
        """添加工具结果

        Args:
            tool_call_id: 工具调用 ID（用于匹配对应的工具调用）
            result: 工具执行结果
        """
        self.messages.append({
            "role": "tool",
            "tool_call_id": tool_call_id,
            "content": result,
        })

    def get_messages(self) -> List[Dict[str, Any]]:
        """获取消息列表

        Returns:
            完整的消息列表，用于发送给 LLM
        """
        return self.messages