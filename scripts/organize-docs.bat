@echo off
chcp 65001 >nul
echo.
echo ============================================
echo     FloatSort 文档整理脚本
echo ============================================
echo.

cd /d "%~dp0.."

echo [1/5] 创建文档目录结构...
if not exist "docs\history" mkdir "docs\history"
if not exist "docs\troubleshooting" mkdir "docs\troubleshooting"
if not exist "docs\features" mkdir "docs\features"
if not exist "archive" mkdir "archive"
echo   ✓ 目录创建完成
echo.

echo [2/5] 整理版本历史文档...
move /Y "V2.9完整功能说明.md" "docs\history\" 2>nul
move /Y "V2.8.1修复说明.md" "docs\history\" 2>nul
move /Y "V2.8完整更新说明.md" "docs\history\" 2>nul
move /Y "V2.8更新进度.md" "docs\history\" 2>nul
move /Y "V2.7界面简化更新.md" "docs\history\" 2>nul
move /Y "V2.5快速测试.md" "docs\history\" 2>nul
move /Y "V2.5功能更新说明.md" "docs\history\" 2>nul
move /Y "V2.3功能完成报告.md" "docs\history\" 2>nul
move /Y "V2.2功能完成报告.md" "docs\history\" 2>nul
move /Y "V2.2功能升级计划.md" "docs\history\" 2>nul
move /Y "V2快速开始.md" "docs\history\" 2>nul
move /Y "V2完成报告.md" "docs\history\" 2>nul
move /Y "V2开发进度.md" "docs\history\" 2>nul
move /Y "V2架构设计.md" "docs\history\" 2>nul
echo   ✓ 版本历史文档已整理
echo.

echo [3/5] 整理功能说明文档...
move /Y "托盘功能说明.md" "docs\features\" 2>nul
move /Y "Mini窗口拖拽修复.md" "docs\features\" 2>nul
move /Y "Mini窗口快速测试.md" "docs\features\" 2>nul
move /Y "Mini悬浮窗功能说明.md" "docs\features\" 2>nul
move /Y "规则排序和Mini窗口开发进度.md" "docs\features\" 2>nul
move /Y "极简风格更新说明.md" "docs\features\" 2>nul
move /Y "批量预览功能说明.md" "docs\features\" 2>nul
move /Y "拖拽功能说明.md" "docs\features\" 2>nul
move /Y "监控功能说明.md" "docs\features\" 2>nul
echo   ✓ 功能说明文档已整理
echo.

echo [4/5] 整理问题修复文档...
move /Y "编译错误修复.md" "docs\troubleshooting\" 2>nul
move /Y "无限循环BUG修复说明.md" "docs\troubleshooting\" 2>nul
echo   ✓ 问题修复文档已整理
echo.

echo [5/5] 归档开发总结文档...
move /Y "UI优化_2025-10-28.md" "archive\" 2>nul
move /Y "开发总结_2025-10-28.md" "archive\" 2>nul
move /Y "开发总结.md" "archive\" 2>nul
move /Y "规则编辑功能测试指南.md" "archive\" 2>nul
move /Y "当前进展和下一步.md" "archive\" 2>nul
move /Y "测试指南.md" "archive\" 2>nul
move /Y "快速安装指南.md" "archive\" 2>nul
move /Y "项目完成总结.md" "archive\" 2>nul
echo   ✓ 开发总结文档已归档
echo.

echo ============================================
echo     文档整理完成！
echo ============================================
echo.
echo 新的文档结构:
echo.
echo   docs/
echo     ├─ README.md         (文档导航)
echo     ├─ USER_GUIDE.md     (用户指南)
echo     ├─ DEVELOPMENT.md    (开发指南)
echo     ├─ BUILD.md          (构建指南)
echo     ├─ FAQ.md            (常见问题)
echo     ├─ ARCHITECTURE.md   (架构设计)
echo     ├─ history/          (版本历史)
echo     ├─ features/         (功能说明)
echo     └─ troubleshooting/  (问题修复)
echo.
echo   archive/               (历史归档)
echo.
echo 提示:
echo   - 主要文档保留在根目录
echo   - 详细文档整理到 docs/ 目录
echo   - 历史开发文档归档到 archive/ 目录
echo   - 从 docs/README.md 开始浏览所有文档
echo.
pause

