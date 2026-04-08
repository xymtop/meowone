from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.scheduler.strategies.base import BaseStrategy

# ============================================================
# Loop 基类
# ============================================================

@dataclass
class LoopResult:
    output: str
    stop_reason: str
    loop_rounds: int
    duration_ms: int


@dataclass
class StepResult:
    step_number: int
    output: Any
    is_final: bool


class BaseLoop(ABC):
    """Loop 插件基类"""

    name: str = ""
    description: str = ""
    config_schema: Dict[str, Any] = field(default_factory=dict)

    @abstractmethod
    async def run(
        self,
        agent_id: str,
        user_input: str,
        history: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> LoopResult:
        """执行完整 Loop"""
        pass

    @abstractmethod
    async def step(
        self,
        state: Dict[str, Any],
        context: Dict[str, Any],
    ) -> StepResult:
        """单步执行"""
        pass

    async def on_tool_call(
        self, tool_name: str, params: Dict, context: Dict
    ) -> Any:
        """工具调用钩子"""
        pass

    async def on_llm_call(
        self, messages: List[Dict], context: Dict
    ) -> Any:
        """LLM 调用钩子"""
        pass

    async def should_continue(
        self, state: Dict, context: Dict
    ) -> bool:
        """判断是否继续执行"""
        return True


# ============================================================
# Strategy 基类
# ============================================================

@dataclass
class SelectionResult:
    target_id: str
    target_type: str  # agent / team / org
    reasoning: str
    confidence: float  # 0-1


@dataclass
class DispatchResult:
    success: bool
    execution_id: str
    output: Any
    error: Optional[str]


class BaseStrategy(ABC):
    """调度策略插件基类"""

    name: str = ""
    description: str = ""
    config_schema: Dict[str, Any] = field(default_factory=dict)

    @abstractmethod
    async def select(
        self,
        task: str,
        task_requirements: Dict[str, Any],
        targets: List[Dict[str, Any]],
        context: Dict[str, Any],
    ) -> SelectionResult:
        """选择最佳执行目标"""
        pass

    @abstractmethod
    async def dispatch(
        self,
        task: str,
        target: Dict[str, Any],
        context: Dict[str, Any],
    ) -> DispatchResult:
        """分发任务到目标"""
        pass

    async def on_complete(self, result: Any, context: Dict) -> Any:
        """完成回调"""
        pass

    async def on_error(
        self, error: Exception, target: Dict, context: Dict
    ) -> Any:
        """错误处理"""
        pass


# ============================================================
# 插件注册表
# ============================================================

class PluginRegistry:
    """插件注册表"""

    def __init__(self):
        self._loops: Dict[str, type[BaseLoop]] = {}
        self._strategies: Dict[str, type[BaseStrategy]] = {}
        self._loop_instances: Dict[str, BaseLoop] = {}
        self._strategy_instances: Dict[str, BaseStrategy] = {}

    def register_loop(self, loop_class: type[BaseLoop]) -> None:
        """注册 Loop 插件"""
        if not issubclass(loop_class, BaseLoop):
            raise TypeError(f"{loop_class} must inherit from BaseLoop")
        if not loop_class.name:
            raise ValueError(f"{loop_class.__name__}.name is required")
        self._loops[loop_class.name] = loop_class

    def register_strategy(self, strategy_class: type[BaseStrategy]) -> None:
        """注册调度策略插件"""
        if not issubclass(strategy_class, BaseStrategy):
            raise TypeError(f"{strategy_class} must inherit from BaseStrategy")
        if not strategy_class.name:
            raise ValueError(f"{strategy_class.__name__}.name is required")
        self._strategies[strategy_class.name] = strategy_class

    def get_loop(self, name: str) -> Optional[type[BaseLoop]]:
        return self._loops.get(name)

    def get_strategy(self, name: str) -> Optional[type[BaseStrategy]]:
        return self._strategies.get(name)

    def list_loops(self) -> List[str]:
        return list(self._loops.keys())

    def list_strategies(self) -> List[str]:
        return list(self._strategies.keys())

    def create_loop(self, name: str, config: Dict[str, Any]) -> Optional[BaseLoop]:
        """创建 Loop 实例"""
        loop_class = self.get_loop(name)
        if not loop_class:
            return None
        if name not in self._loop_instances:
            self._loop_instances[name] = loop_class()
        return self._loop_instances[name]

    def create_strategy(
        self, name: str, config: Dict[str, Any]
    ) -> Optional[BaseStrategy]:
        """创建 Strategy 实例"""
        strategy_class = self.get_strategy(name)
        if not strategy_class:
            return None
        if name not in self._strategy_instances:
            self._strategy_instances[name] = strategy_class()
        return self._strategy_instances[name]


# 全局注册表
plugin_registry = PluginRegistry()


def discover_plugins() -> None:
    """自动发现并注册内置插件"""
    # 注册内置 Loop
    try:
        from app.loops.react import ReActLoop
        plugin_registry.register_loop(ReActLoop)
    except ImportError:
        pass

    try:
        from app.loops.plan_exec import PlanExecLoop
        plugin_registry.register_loop(PlanExecLoop)
    except ImportError:
        pass

    try:
        from app.loops.multi_agent_debate import MultiAgentDebateLoop
        plugin_registry.register_loop(MultiAgentDebateLoop)
    except ImportError:
        pass

    # 注册内置策略
    try:
        from app.scheduler.strategies.direct import DirectStrategy
        plugin_registry.register_strategy(DirectStrategy)
    except ImportError:
        pass

    try:
        from app.scheduler.strategies.round_robin import RoundRobinStrategy
        plugin_registry.register_strategy(RoundRobinStrategy)
    except ImportError:
        pass

    try:
        from app.scheduler.strategies.capability_match import CapabilityMatchStrategy
        plugin_registry.register_strategy(CapabilityMatchStrategy)
    except ImportError:
        pass
