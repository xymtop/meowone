"""
Todo List 工具 —— 专门用于 Plan-Exec 算法

这是一个任务管理工具，只能在 plan_exec 算法中使用。
支持添加、完成、删除、列出任务，以及根据计划更新任务列表。

工具名称: todo_manager
"""
from __future__ import annotations

import json
import uuid
from typing import Any, Dict

from app.capability.tool_base import BaseTool


class TodoItem:
    """单个待办事项"""
    def __init__(
        self,
        id_: str,
        title: str,
        status: str = "pending",  # pending | done
        description: str = "",
    ):
        self.id = id_
        self.title = title
        self.status = status
        self.description = description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "status": self.status,
            "description": self.description,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "TodoItem":
        return cls(
            id_=str(d.get("id", "")),
            title=str(d.get("title", "")),
            status=str(d.get("status", "pending")),
            description=str(d.get("description", "")),
        )


class TodoStore:
    """每个 session 独立的 Todo 存储"""

    def __init__(self):
        self._items: Dict[str, TodoItem] = {}
        self._order: list[str] = []  # 保持插入顺序

    def add(self, title: str, description: str = "") -> Dict[str, Any]:
        id_ = str(uuid.uuid4())[:8]
        item = TodoItem(id_=id_, title=title, description=description)
        self._items[id_] = item
        self._order.append(id_)
        return item.to_dict()

    def done(self, id_: str) -> Dict[str, Any] | None:
        item = self._items.get(id_)
        if not item:
            return None
        item.status = "done"
        return item.to_dict()

    def remove(self, id_: str) -> bool:
        if id_ not in self._items:
            return False
        del self._items[id_]
        self._order.remove(id_)
        return True

    def update(self, id_: str, title: str = "", status: str = "") -> Dict[str, Any] | None:
        item = self._items.get(id_)
        if not item:
            return None
        if title:
            item.title = title
        if status in ("pending", "done"):
            item.status = status
        return item.to_dict()

    def list_all(self) -> list[Dict[str, Any]]:
        return [self._items[id_].to_dict() for id_ in self._order]

    def list_pending(self) -> list[Dict[str, Any]]:
        return [self._items[id_].to_dict() for id_ in self._order if self._items[id_].status == "pending"]

    def clear_done(self) -> int:
        done_ids = [id_ for id_ in self._order if self._items[id_].status == "done"]
        for id_ in done_ids:
            del self._items[id_]
        for id_ in done_ids:
            self._order.remove(id_)
        return len(done_ids)

    def get_summary(self) -> Dict[str, Any]:
        total = len(self._items)
        pending = sum(1 for id_ in self._order if self._items[id_].status == "pending")
        done = total - pending
        return {"total": total, "pending": pending, "done": done}


# 全局 session 级别的 store 管理（按 message_id 隔离）
_todo_stores: Dict[str, TodoStore] = {}


def _get_store(message_id: str) -> TodoStore:
    if message_id not in _todo_stores:
        _todo_stores[message_id] = TodoStore()
    return _todo_stores[message_id]


def _clear_store(message_id: str) -> None:
    if message_id in _todo_stores:
        del _todo_stores[message_id]


class TodoManagerTool(BaseTool):
    """
    任务管理工具（仅 Plan-Exec 算法可用）

    用于管理执行计划中的待办事项：
    - 添加任务到清单
    - 标记任务完成
    - 更新任务状态
    - 列出当前任务
    - 清除已完成任务
    """
    name = "todo_manager"
    display_name = "Todo Manager"
    description = (
        "Manage a task todo list during plan execution. "
        "Use this to track progress of multi-step tasks. "
        "Supports: add, complete, remove, update, list, and clear operations. "
        "Each operation returns the updated state or task list."
    )
    permission = "standard"
    category = "planning"
    tags = ("todo", "task", "plan", "tracking")

    parameters_schema = {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "enum": ["add", "done", "remove", "update", "list", "pending", "clear_done", "summary"],
                "description": "操作类型",
            },
            "id": {
                "type": "string",
                "description": "任务 ID（done/remove/update 操作需要）",
            },
            "title": {
                "type": "string",
                "description": "任务标题（add/update 操作需要）",
            },
            "description": {
                "type": "string",
                "description": "任务描述（add 操作可选）",
            },
            "status": {
                "type": "string",
                "enum": ["pending", "done"],
                "description": "任务状态（update 操作可选）",
            },
        },
        "required": ["action"],
    }

    def __init__(self, message_id: str = ""):
        super().__init__()
        self._message_id = message_id

    def _store(self) -> TodoStore:
        return _get_store(self._message_id)

    async def execute(self, params: Dict[str, Any]) -> str:
        action = str(params.get("action", "")).strip()
        if not action:
            return json.dumps({"ok": False, "error": "action is required"}, ensure_ascii=False)

        try:
            if action == "add":
                title = str(params.get("title", "")).strip()
                if not title:
                    return json.dumps({"ok": False, "error": "title is required for add action"}, ensure_ascii=False)
                description = str(params.get("description", "")).strip()
                item = self._store().add(title, description)
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "added",
                    "item": item,
                    "summary": summary,
                }, ensure_ascii=False)

            elif action == "done":
                id_ = str(params.get("id", "")).strip()
                if not id_:
                    return json.dumps({"ok": False, "error": "id is required for done action"}, ensure_ascii=False)
                item = self._store().done(id_)
                if not item:
                    return json.dumps({"ok": False, "error": f"Task not found: {id_}"}, ensure_ascii=False)
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "completed",
                    "item": item,
                    "summary": summary,
                }, ensure_ascii=False)

            elif action == "remove":
                id_ = str(params.get("id", "")).strip()
                if not id_:
                    return json.dumps({"ok": False, "error": "id is required for remove action"}, ensure_ascii=False)
                ok = self._store().remove(id_)
                if not ok:
                    return json.dumps({"ok": False, "error": f"Task not found: {id_}"}, ensure_ascii=False)
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "removed",
                    "id": id_,
                    "summary": summary,
                }, ensure_ascii=False)

            elif action == "update":
                id_ = str(params.get("id", "")).strip()
                if not id_:
                    return json.dumps({"ok": False, "error": "id is required for update action"}, ensure_ascii=False)
                title = str(params.get("title", "")).strip()
                status = str(params.get("status", "")).strip()
                item = self._store().update(id_, title=title, status=status)
                if not item:
                    return json.dumps({"ok": False, "error": f"Task not found: {id_}"}, ensure_ascii=False)
                return json.dumps({
                    "ok": True,
                    "action": "updated",
                    "item": item,
                }, ensure_ascii=False)

            elif action == "list":
                items = self._store().list_all()
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "list",
                    "items": items,
                    "summary": summary,
                }, ensure_ascii=False)

            elif action == "pending":
                items = self._store().list_pending()
                return json.dumps({
                    "ok": True,
                    "action": "pending",
                    "items": items,
                    "count": len(items),
                }, ensure_ascii=False)

            elif action == "clear_done":
                count = self._store().clear_done()
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "cleared_done",
                    "removed": count,
                    "summary": summary,
                }, ensure_ascii=False)

            elif action == "summary":
                summary = self._store().get_summary()
                return json.dumps({
                    "ok": True,
                    "action": "summary",
                    "summary": summary,
                }, ensure_ascii=False)

            else:
                return json.dumps({
                    "ok": False,
                    "error": f"Unknown action: {action}",
                    "available_actions": ["add", "done", "remove", "update", "list", "pending", "clear_done", "summary"],
                }, ensure_ascii=False)

        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False)
