"""
DispatchContext —— 调度策略统一上下文类

所有调度策略函数接收此上下文作为唯一参数。

设计原则：
- gateway 层负责预填充所有可推导的字段
- 策略函数优先使用预填充字段，fallback 到自行查询
- 只有无法自动推导的配置才需要用户通过 strategy_config 提供
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.agents.runtime import AgentRuntime


@dataclass
class DispatchContext:
    """
    调度策略统一上下文

    分为两部分：
    1. 入口参数 —— 调用 dispatch() 时传入，gateway 原样透传
    2. 预填充字段 —— gateway 预查询填充，策略直接使用

    Attributes:
        user_message:       用户输入
        history:            对话历史
        session_id:         会话 ID
        message_id:         消息追踪 ID
        strategy_name:      调度策略名称（"direct" / "team_dispatch" / "capability_match"）
        strategy_config:     策略配置 JSON（dict），用于用户定制化覆盖
        model:              LLM 模型名称

    Pre-filled fields (gateway 预填充):
        agent_id:           入口 agent_id（若有）
        instance_id:        入口 instance_id（若有）
        image_id:           所属镜像 ID（从 instance/agent 推导）
        agent_runtime:      已构建的 AgentRuntime（direct / capability_match 可直接用）
        candidate_runtimes: 候选智能体运行时列表（capability_match / team_dispatch 共用，来自 image.agent_ids_json）

    策略配置格式示例（strategy_config，用户只需提供无法自动推导的部分）：
        direct:
            {}  // 无需配置，从 agent_id / image 自动推导

        team_dispatch:
            {
                "team_id": "xxx",  // 无法自动推导，必须配置
                "decompose_prompt": "自定义分解提示词（可选）",
                "parallel": true
            }

        capability_match:
            {
                // 无需配置，从 image.agent_ids_json / 所有 enabled agents 自动推导
                "match_model": "gpt-4o"   // 可选，覆盖语义匹配模型
            }
    """
    # === 入口参数 ===
    user_message: str
    history: List[Dict[str, Any]] = field(default_factory=list)
    session_id: Optional[str] = None
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    strategy_name: str = "direct"
    strategy_config: Dict[str, Any] = field(default_factory=dict)
    model: Optional[str] = None

    # === gateway 预填充的推导数据 ===
    agent_id: Optional[str] = None
    instance_id: Optional[str] = None
    image_id: Optional[str] = None

    # === 预构建的运行时对象 ===
    agent_runtime: Optional["AgentRuntime"] = None
    candidate_runtimes: List["AgentRuntime"] = field(default_factory=list)
