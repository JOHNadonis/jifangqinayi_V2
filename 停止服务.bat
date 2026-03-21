@echo off
chcp 65001 >nul
title 停止 DC-Visualizer

echo 正在停止服务...

:: 停止 Node 进程
taskkill /F /IM node.exe >nul 2>&1

echo 服务已停止
pause
