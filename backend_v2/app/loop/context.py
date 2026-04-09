"""
LoopContext —— Loop 算法统一上下文类

所有 loop 算法函数接收此上下文作为唯一参数，包含运行 Agent Loop 所需的全部信息。
同时维护 OpenAI 消息列表，供 LLM 调用使用。
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

# 用户消息内容类型
UserContent = Union[str, List[Dict[str, Any]]]


@dataclass
class LoopLimits:
    """资源限制"""
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None


@dataclass
class LoopContext:
    """
    Loop 算法统一上下文

    Attributes:
        user_message:   用户输入（字符串或多模态内容列表）
        history:        对话历史（OpenAI messages 格式，不含 system）
        capabilities:   能力注册表（工具集合）
        system_prompt:  完整系统提示词（由 agent builder 组装）
        limits:         资源限制
        model:          要使用的模型名称（空则由 LLM 客户端决定）
        message_id:     消息追踪 ID
        session_id:     会话 ID
        agent_id:       当前智能体 ID
        loop_mode:      loop 算法名称（由 engine 路由用，算法内部可忽略）

    内部状态（运行时填充）:
        _messages:      当前维护的完整消息列表（system + history + 本轮）
    """
    user_message: UserContent
    history: List[Dict[str, Any]]
    capabilities: Any  # CapabilityRegistry
    system_prompt: str = ""
    limits: LoopLimits = field(default_factory=LoopLimits)
    model: Optional[str] = None
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    loop_mode: str = "react"

    # 内部消息列表（初始化后填充）
    _messages: List[Dict[str, Any]] = field(default_factory=list, init=False, repr=False)

    def __post_init__(self) -> None:
        self._messages = [{"role": "system", "content": self.system_prompt}]
        for msg in self.history:
            role = msg.get("role", "user")
            if role == "user":
                self._messages.append({"role": "user", "content": msg.get("content", "")})
            elif role == "assistant":
                assistant_msg: Dict[str, Any] = {"role": "assistant", "content": msg.get("content")}
                if msg.get("tool_calls"):
                    assistant_msg["tool_calls"] = msg["tool_calls"]
                self._messages.append(assistant_msg)
            elif role == "tool":
                self._messages.append({
                    "role": "tool",
                    "tool_call_id": msg.get("tool_call_id", ""),
                    "content": msg.get("content", ""),
                })
        # 追加本轮用户消息
        user_content = self.user_message
        if isinstance(user_content, list):
            # 多模态内容：只取 text 部分
            text_parts = []
            for part in user_content:
                if isinstance(part, dict) and part.get("type") == "text":
                    text_parts.append(str(part.get("text", "")))
            self._messages.append({"role": "user", "content": "\n".join(text_parts)})
        else:
            self._messages.append({"role": "user", "content": user_content})

    # ------------------------------------------------------------------ #
    # 消息操作
    # ------------------------------------------------------------------ #

    def get_messages(self) -> List[Dict[str, Any]]:
        return self._messages

    def add_assistant_message(self, content: str) -> None:
        self._messages.append({"role": "assistant", "content": content})

    def add_assistant_tool_calls(self, calls: List[Dict[str, str]]) -> None:
        if not calls:
            return
        payload = [
            {
                "id": c["id"],
                "type": "function",
                "function": {"name": c["name"], "arguments": c["arguments"]},
            }
            for c in calls
        ]
        self._messages.append({"role": "assistant", "content": None, "tool_calls": payload})

    def add_tool_result(self, tool_call_id: str, result: str) -> None:
        self._messages.append({"role": "tool", "tool_call_id": tool_call_id, "content": result})

    def clone_with_extra_system(self, extra: str) -> "LoopContext":
        """返回一个具有额外系统提示的新上下文（用于 plan_exec 执行阶段）"""
        new_ctx = LoopContext(
            user_message=self.user_message,
            history=[],
            capabilities=self.capabilities,
            system_prompt=self.system_prompt + "\n\n" + extra,
            limits=self.limits,
            model=self.model,
            message_id=self.message_id,
            session_id=self.session_id,
            agent_id=self.agent_id,
            loop_mode=self.loop_mode,
        )
        # 复制当前消息列表（包括 system + history + 本轮 user message）
        new_ctx._messages = list(self._messages)
        return new_ctx

    def with_capabilities(self, capabilities: Any) -> "LoopContext":
        """返回一个具有新 capabilities 的上下文（用于 plan_exec 添加 todo_manager）"""
        new_ctx = LoopContext(
            user_message=self.user_message,
            history=[],
            capabilities=capabilities,
            system_prompt=self.system_prompt,
            limits=self.limits,
            model=self.model,
            message_id=self.message_id,
            session_id=self.session_id,
            agent_id=self.agent_id,
            loop_mode=self.loop_mode,
        )
        # 复制当前消息
        new_ctx._messages = list(self._messages)
        return new_ctx
