@echo off
chcp 65001 > nul
echo ============================================================
echo   MeowOne AI Agent Platform
echo ============================================================
echo.

:: 检查 Docker 是否运行
docker info > nul 2>&1
if errorlevel 1 (
    echo 错误: Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

:: 检查 .env 文件
if not exist .env (
    if exist .env.docker (
        echo 提示: 未找到 .env 文件，正在从 .env.docker 复制...
        copy .env.docker .env
        echo.
        echo 请编辑 .env 文件，填入您的 LLM_API_KEY
        echo.
    )
)

:: 启动服务
echo 正在启动服务...
docker-compose up -d

echo.
echo ============================================================
echo   服务已启动!
echo ============================================================
echo.
echo 访问地址:
echo   前端:    http://localhost:9006
echo   后端:    http://localhost:8000
echo   API 文档: http://localhost:8000/docs
echo.
echo 查看日志: docker-compose logs -f
echo 停止服务: docker-compose down
echo.
pause
