@echo off
chcp 65001 >nul
echo ================================
echo   FloatSort 项目构建
echo ================================
echo.

REM 检查 PowerShell 是否可用
where pwsh >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    pwsh -ExecutionPolicy Bypass -File scripts\build.ps1
) else (
    where powershell >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        powershell -ExecutionPolicy Bypass -File scripts\build.ps1
    ) else (
        echo 错误：未找到 PowerShell
        echo 请安装 PowerShell 或手动运行：cargo tauri build
        pause
    )
)

