"""
数据库兼容层

为 service 层提供统一的数据库访问接口。
内部直接代理 db/connection.py 的 get_db。
"""
from __future__ import annotations

from app.db.connection import get_db

__all__ = ["get_db"]
