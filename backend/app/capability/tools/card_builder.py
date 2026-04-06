from __future__ import annotations
import uuid
from typing import Any, Dict
from app.capability.base import BaseCapability


class CardBuilderCapability(BaseCapability):
    name = "card_builder"
    description = (
        "Build a UI card to display information, request user action, or collect user input. "
        "Use this when you want to show structured information, ask for confirmation, or collect form data from the user."
    )
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
