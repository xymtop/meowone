"""
DispatchContext —— 调度策略统一上下文类

所有调度策略函数接收此上下文作为唯一参数。
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DispatchContext:
    """
    调度策略统一上下文

    Attributes:
        user_message:      用户输入
        history:           对话历史
        session_id:        会话 ID
        message_id:        消息追踪 ID
        strategy_name:     调度策略名称（"direct" / "team_dispatch" / "capability_match"）
        strategy_config:   从数据库读取并解析的策略配置 JSON（dict）
        model:             LLM 模型名称（可选）

    策略配置格式示例：
        direct:
            {"agent_id": "xxx"}
            或
            {"agent_name": "xxx"}

        team_dispatch:
            {
                "team_id": "xxx",
                "decompose_prompt": "请将任务分解给团队成员",
                "parallel": true
            }

        capability_match:
            {
                "candidate_agent_ids": ["agent-a", "agent-b", "agent-c"],
                "match_model": "gpt-4o"   // 可选，用于语义匹配
            }
    """
    user_message: str
    history: List[Dict[str, Any]] = field(default_factory=list)
    session_id: Optional[str] = None
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    strategy_name: str = "direct"
    strategy_config: Dict[str, Any] = field(default_factory=dict)
    model: Optional[str] = None
