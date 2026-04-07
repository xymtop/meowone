from __future__ import annotations
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from app.app_factory import create_app

app = create_app()
