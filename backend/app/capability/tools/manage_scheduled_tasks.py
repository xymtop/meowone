from __future__ import annotations

from typing import Any, Dict

from app.capability.tool_base import BaseTool
from app.services import scheduled_task_service


class ManageScheduledTasksTool(BaseTool):
    name = "manage_scheduled_tasks"
    display_name = "Manage scheduled tasks"
    description = "Create, list, enable/disable, delete, and trigger internal-agent scheduled tasks."
    permission = "standard"
    category = "scheduler"
    tags = ("internal", "scheduler", "task")

    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["create", "list", "delete", "enable", "disable", "run_due"],
            },
            "name": {"type": "string"},
            "agent_name": {"type": "string"},
            "prompt": {"type": "string"},
            "interval_seconds": {"type": "integer"},
            "scheduler_mode": {"type": "string"},
            "task_tag": {"type": "string"},
            "limit": {"type": "integer"},
        },
        "required": ["action"],
    }

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        action = str(params.get("action") or "").strip().lower()
        if action == "list":
            items = await scheduled_task_service.list_scheduled_tasks(enabled_only=False)
            return {"ok": True, "count": len(items), "tasks": items}
        if action == "run_due":
            limit = int(params.get("limit") or 5)
            return await scheduled_task_service.run_due_scheduled_tasks(limit=max(1, min(limit, 20)))

        name = str(params.get("name") or "").strip()
        if not name:
            return {"ok": False, "error": "name is required"}

        if action == "delete":
            deleted = await scheduled_task_service.delete_scheduled_task(name)
            return {"ok": True, "deleted": deleted}
        if action in {"enable", "disable"}:
            updated = await scheduled_task_service.set_scheduled_task_enabled(name, action == "enable")
            return {"ok": True, "updated": updated, "enabled": action == "enable"}
        if action == "create":
            agent_name = str(params.get("agent_name") or "").strip()
            prompt = str(params.get("prompt") or "").strip()
            interval_seconds = int(params.get("interval_seconds") or 0)
            if not agent_name or not prompt or interval_seconds <= 0:
                return {
                    "ok": False,
                    "error": "agent_name, prompt and positive interval_seconds are required",
                }
            await scheduled_task_service.upsert_scheduled_task(
                name=name,
                agent_name=agent_name,
                prompt=prompt,
                interval_seconds=interval_seconds,
                scheduler_mode=str(params.get("scheduler_mode") or "direct"),
                task_tag=str(params.get("task_tag") or ""),
                enabled=True,
            )
            return {"ok": True, "name": name}
        return {"ok": False, "error": f"unsupported action: {action}"}
