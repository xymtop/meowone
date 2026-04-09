# MeowOne 后端应用入口文件
# 负责初始化日志系统并创建 FastAPI 应用实例

from __future__ import annotations
import logging

# 配置日志格式：[时间戳] [日志级别] 模块名: 消息内容
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# 从 app_factory 模块导入 create_app 函数，创建 FastAPI 应用
from app.app_factory import create_app

# 创建全局应用实例
app = create_app()
