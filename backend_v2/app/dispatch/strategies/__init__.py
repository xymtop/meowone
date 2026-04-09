"""
调度策略包

所有策略模块在此导入，以触发 @dispatch_strategy 装饰器完成注册。
"""
from app.dispatch.strategies import direct, capability_match, team_dispatch  # noqa: F401
