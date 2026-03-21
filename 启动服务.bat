@echo off
chcp 65001 >nul
title DC-Visualizer 机房管理系统

echo ============================================
echo   DC-Visualizer 机房管理系统
echo ============================================
echo.

cd /d "F:\whc\code_project\jifangqinayi_V2"

echo 正在启动服务...
echo.
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo API文档:  http://localhost:3001/api/docs
echo.
echo 按 Ctrl+C 停止服务
echo ============================================
echo.

:: 启动后自动打开浏览器
start "" "http://localhost:5173"

:: 启动开发服务器
pnpm dev
