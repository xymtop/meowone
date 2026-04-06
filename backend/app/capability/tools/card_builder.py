from __future__ import annotations
import uuid
from typing import Any, Dict
from app.capability.tool_base import BaseTool


class CardBuilderCapability(BaseTool):
    name = "card_builder"
    display_name = "MeowOne Card (legacy UI)"
    description = (
        "Optional legacy card UI (NOT the A2UI protocol). "
        "Prefer Google A2UI v0.8 in a Markdown fenced code block with language tag `a2ui`. "
        "Use this only for simple server-driven info/action/form panels."
    )
    permission = "standard"
    category = "ui"
    tags = ("card", "legacy")
    parameters_schema = {
        "type": "object",
        "properties": {
            "card_type": {
                "type": "string",
                "enum": ["info", "action", "form"],
                "description": (
                    "Type of card: 'info' for displaying information, "
                    "'action' for buttons the user can click, "
                    "'form' for collecting input"
                ),
            },
            "title": {
                "type": "string",
                "description": "Card title",
            },
            "fields": {
                "type": "array",
                "description": (
                    "For info/action cards: array of {label, value} objects. "
                    "For form cards: array of {name, label, type, placeholder, required} objects "
                    "where type is one of: text, date, select, number"
                ),
                "items": {"type": "object"},
            },
            "actions": {
                "type": "array",
                "description": (
                    "For action cards only: array of {id, label, style} objects "
                    "where style is primary/secondary/danger"
                ),
                "items": {"type": "object"},
            },
            "submit_label": {
                "type": "string",
                "description": "For form cards only: the submit button text",
            },
        },
        "required": ["card_type", "title", "fields"],
    }

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        card: Dict[str, Any] = {
            "id": f"card_{uuid.uuid4().hex[:8]}",
            "type": params["card_type"],
            "title": params["title"],
            "fields": params.get("fields", []),
            "status": "success",
        }
        if params["card_type"] == "action":
            card["actions"] = params.get("actions", [])
        elif params["card_type"] == "form":
            card["submitLabel"] = params.get("submit_label", "Submit")

        return card
