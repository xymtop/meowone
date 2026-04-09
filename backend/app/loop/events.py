"""
Loop 事件定义模块

定义智能体循环运行时产生的事件类型：
- ThinkingEvent: 思考事件（模型正在思考）
- DeltaEvent: 内容增量事件（文本片段）
- CardEvent: 卡片事件（UI 卡片数据）
- ToolCallEvent: 工具调用事件
- ToolResultEvent: 工具结果事件
- ErrorEvent: 错误事件
- DoneEvent: 完成事件
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict


@dataclass
class ThinkingEvent:
    """思考事件

    表示模型正在思考中，需要等待。
    
    Attributes:
        step: 当前步骤编号
        description: 思考描述
    """
    step: int
    description: str
    event_type: str = field(default="thinking", init=False)


@dataclass
class DeltaEvent:
    """内容增量事件

    表示模型输出的文本片段，用于流式传输。
    
    Attributes:
        message_id: 消息 ID
        content: 文本内容
        done: 是否是最后一个片段
    """
    message_id: str
    content: str
    done: bool = False
    event_type: str = field(default="delta", init=False)


@dataclass
class CardEvent:
    """卡片事件

    表示需要渲染的 UI 卡片数据。
    
    Attributes:
        message_id: 消息 ID
        card: 卡片数据字典
    """
    message_id: str
    card: Dict[str, Any]
    event_type: str = field(default="card", init=False)


@dataclass
class ToolCallEvent:
    """工具调用事件

    表示模型请求调用某个工具。
    
    Attributes:
        tool_call_id: 工具调用 ID
        capability_name: 能力（工具）名称
        params: 工具参数
    """
    tool_call_id: str
    capability_name: str
    params: Dict[str, Any]
    event_type: str = field(default="tool_call", init=False)


@dataclass
class ToolResultEvent:
    """工具结果事件

    表示工具执行完成返回的结果。
    
    Attributes:
        tool_call_id: 工具调用 ID
        capability_name: 能力（工具）名称
        result: 执行结果
        success: 是否成功
    """
    tool_call_id: str
    capability_name: str
    result: Any
    success: bool
    event_type: str = field(default="tool_result", init=False)


@dataclass
class ErrorEvent:
    """错误事件

    表示执行过程中发生错误。
    
    Attributes:
        code: 错误码
        message: 错误信息
    """
    code: str
    message: str
    event_type: str = field(default="error", init=False)


@dataclass
class DoneEvent:
    """完成事件

    表示智能体循环执行完成。
    
    Attributes:
        message_id: 消息 ID
        loop_rounds: 总共执行的轮次
        total_duration: 总耗时（毫秒）
    """
    message_id: str
    loop_rounds: int
    total_duration: float
    event_type: str = field(default="done", init=False)


# 类型别名，用于泛型约束
LoopEvent = Any
