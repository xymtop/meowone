from app.loops.react import ReActLoop
from app.loops.plan_exec import PlanExecLoop
from app.loops.critic import CriticLoop
from app.loops.multi_agent_debate import MultiAgentDebateLoop
from app.loops.hierarchical import HierarchicalLoop

# 导出所有循环实现，供注册表和前端配置使用
__all__ = [
    "ReActLoop",
    "PlanExecLoop",
    "CriticLoop",
    "MultiAgentDebateLoop",
    "HierarchicalLoop",
]

# 循环模式元数据（用于前端展示）
LOOP_MODE_META = {
    "react": {
        "name": "ReAct",
        "description": "标准 ReAct 模式：思考 → 行动 → 观察（默认）",
        "class": ReActLoop,
    },
    "plan_exec": {
        "name": "计划-执行分离",
        "description": "先让模型生成结构化计划，再按计划逐步执行",
        "class": PlanExecLoop,
    },
    "critic": {
        "name": "批评-改进",
        "description": "生成 → 批评 → 改进，循环迭代直到质量达标",
        "class": CriticLoop,
    },
    "hierarchical": {
        "name": "层级式执行",
        "description": "上级规划，下级执行，支持多层嵌套",
        "class": HierarchicalLoop,
    },
}
