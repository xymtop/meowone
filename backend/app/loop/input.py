"""
Loop 输入定义模块

定义智能体循环的输入数据结构：
- LoopLimits: 资源限制配置
- LoopRunInput: 循环运行输入
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.capability.registry import CapabilityRegistry
from app.loop.context import UserContent


@dataclass
class LoopLimits:
    """资源限制配置

    控制智能体循环执行时的资源使用限制。
    
    Attributes:
        max_rounds: 最大对话轮次数
        max_tool_phases: 最大工具调用阶段数
        timeout_seconds: 执行超时时间（秒）
    """
    max_rounds: Optional[int] = None
    max_tool_phases: Optional[int] = None
    timeout_seconds: Optional[int] = None


@dataclass
class LoopRunInput:
    """循环运行输入

    智能体循环运行时的统一输入契约。
    
    这个类型框架无关，使得适配器和网关可以构造统一的运行负载，
    然后输入到相同的循环内核中执行。

    Attributes:
        user_message: 用户消息内容
        history: 对话历史
        capabilities: 可用的能力注册表
        extra_system: 额外的系统提示
        message_id: 消息 ID（用于追踪）
        limits: 资源限制
        model: 模型名称
        loop_mode: 循环执行模式，影响 run_loop() 内部的路由逻辑
    """

    user_message: UserContent
    history: List[Dict[str, Any]]
    capabilities: CapabilityRegistry
    extra_system: str = ""
    message_id: Optional[str] = None
    limits: Optional[LoopLimits] = None
    """Resolved model name (matches rows in models table / OpenAI model id)."""
    model: Optional[str] = None
    # 循环执行模式，影响 run_loop() 内部的路由逻辑
    loop_mode: str = "react"
