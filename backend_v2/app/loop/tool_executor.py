"""工具执行辅助 - 并行执行工具调用，供各 loop 算法复用"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


async def execute_tool_calls(
    tool_calls: List[Dict[str, Any]],
    capabilities: Any,  # CapabilityRegistry
) -> List[Dict[str, Any]]:
    """并行执行所有工具调用，返回结果列表"""

    async def _execute_one(tc: Dict[str, Any]) -> Dict[str, Any]:
        tid = tc["id"]
        name = tc["name"]
        capability = capabilities.get(name)
        if not capability:
            err = json.dumps({"error": f"Unknown capability: {name}"}, ensure_ascii=False)
            logger.warning("未知工具: %s", name)
            return {
                "tool_call_id": tid, "name": name, "result_str": err,
                "result": None, "stop_loop": False,
                "error_code": "UNKNOWN_CAPABILITY",
                "error_message": f"Unknown capability: {name}",
            }
        try:
            raw_args = tc.get("arguments") or "{}"
            params = json.loads(raw_args)
            raw = await capability.execute(params)
            # 兼容 ToolExecutionResult（如果有）
            stop_loop = False
            payload: Any = raw
            if hasattr(raw, "stop_loop") and hasattr(raw, "payload"):
                stop_loop = raw.stop_loop
                payload = raw.payload
            result_str = (
                json.dumps(payload, ensure_ascii=False)
                if isinstance(payload, (dict, list))
                else str(payload)
            )
            logger.info("工具完成: %s id=%s stop_loop=%s", name, tid, stop_loop)
            return {
                "tool_call_id": tid, "name": name, "result_str": result_str,
                "result": payload, "stop_loop": stop_loop,
                "error_code": None, "error_message": None,
            }
        except Exception as e:
            logger.exception("工具失败: %s", name)
            err = json.dumps({"error": str(e)}, ensure_ascii=False)
            return {
                "tool_call_id": tid, "name": name, "result_str": err,
                "result": None, "stop_loop": False,
                "error_code": "TOOL_ERROR",
                "error_message": f"{name} failed: {e}",
            }

    return list(await asyncio.gather(*[_execute_one(tc) for tc in tool_calls]))
