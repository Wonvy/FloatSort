@echo off
chcp 65001 >nul
echo ================================
echo   FloatSort 开发环境启动
echo ================================
echo.
echo 正在启动 FloatSort...
echo.

cd src-tauri
cargo run

pause
