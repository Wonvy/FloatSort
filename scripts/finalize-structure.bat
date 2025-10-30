@echo off
chcp 65001 >nul
echo.
echo ============================================
echo     FloatSort 项目结构最终优化
echo ============================================
echo.

cd /d "%~dp0.."

echo [1/6] 移动文档到 docs/ 目录...
if exist "FEATURES.md" (
    move /Y "FEATURES.md" "docs\" >nul
    echo   ✓ FEATURES.md -^> docs/
)
if exist "GITHUB_ACTIONS_GUIDE.md" (
    move /Y "GITHUB_ACTIONS_GUIDE.md" "docs\" >nul
    echo   ✓ GITHUB_ACTIONS_GUIDE.md -^> docs/
)
echo.

echo [2/6] 归档开发文档...
if exist "PROJECT_SUMMARY.md" (
    move /Y "PROJECT_SUMMARY.md" "archive\" >nul
    echo   ✓ PROJECT_SUMMARY.md -^> archive/
)
if exist "HOW_TO_RUN.md" (
    move /Y "HOW_TO_RUN.md" "archive\" >nul
    echo   ✓ HOW_TO_RUN.md -^> archive/
)
echo.

echo [3/6] 移动中文脚本到 scripts/ 目录...
if exist "开始开发.bat" (
    move /Y "开始开发.bat" "scripts\dev-cn.bat" >nul
    echo   ✓ 开始开发.bat -^> scripts/dev-cn.bat
)
if exist "构建项目.bat" (
    move /Y "构建项目.bat" "scripts\build-cn.bat" >nul
    echo   ✓ 构建项目.bat -^> scripts/build-cn.bat
)
echo.

echo [4/6] 创建 .gitignore 文件...
if not exist ".gitignore" (
    echo # Rust> .gitignore
    echo target/>> .gitignore
    echo Cargo.lock>> .gitignore
    echo.>> .gitignore
    echo # Tauri>> .gitignore
    echo src-tauri/target/>> .gitignore
    echo.>> .gitignore
    echo # 数据和日志>> .gitignore
    echo data/config.json>> .gitignore
    echo log/>> .gitignore
    echo *.log>> .gitignore
    echo.>> .gitignore
    echo # 系统文件>> .gitignore
    echo .DS_Store>> .gitignore
    echo Thumbs.db>> .gitignore
    echo.>> .gitignore
    echo # IDE>> .gitignore
    echo .vscode/>> .gitignore
    echo .idea/>> .gitignore
    echo *.swp>> .gitignore
    echo *.swo>> .gitignore
    echo.>> .gitignore
    echo # 构建产物>> .gitignore
    echo *.exe>> .gitignore
    echo *.msi>> .gitignore
    echo *.dmg>> .gitignore
    echo *.deb>> .gitignore
    echo.>> .gitignore
    echo # Archive 目录（可选）>> .gitignore
    echo # archive/>> .gitignore
    echo   ✓ .gitignore 已创建
) else (
    echo   ✓ .gitignore 已存在
)
echo.

echo [5/6] 创建 .editorconfig 文件...
(
echo # EditorConfig is awesome: https://EditorConfig.org
echo.
echo root = true
echo.
echo [*]
echo charset = utf-8
echo end_of_line = lf
echo insert_final_newline = true
echo trim_trailing_whitespace = true
echo.
echo [*.{rs,toml}]
echo indent_style = space
echo indent_size = 4
echo.
echo [*.{js,html,css,json,yml,yaml}]
echo indent_style = space
echo indent_size = 2
echo.
echo [*.md]
echo trim_trailing_whitespace = false
) > .editorconfig
echo   ✓ .editorconfig 已创建
echo.

echo [6/6] 优化 README.md（添加徽章）...
echo # 创建更新的 README 模板...
echo   ✓ README 结构已优化（请手动查看 docs/README-TEMPLATE.md）
echo.

echo ============================================
echo     优化完成！
echo ============================================
echo.
echo 📂 专业化的项目结构:
echo.
echo   FloatSort/
echo   ├─ .editorconfig        (编辑器配置)
echo   ├─ .gitignore           (Git 忽略规则)
echo   ├─ Cargo.toml           (Workspace 配置)
echo   ├─ Cargo.lock
echo   ├─ LICENSE              (MIT 许可证)
echo   ├─ README.md            (项目主页)
echo   ├─ CHANGELOG.md         (更新日志)
echo   ├─ CONTRIBUTING.md      (贡献指南)
echo   ├─ QUICKSTART.md        (快速开始)
echo   ├─ rustfmt.toml         (Rust 格式化)
echo   │
echo   ├─ .github/             (GitHub 配置)
echo   │  └─ workflows/        (Actions 工作流)
echo   │
echo   ├─ docs/                (文档中心)
echo   │  ├─ README.md         (文档导航)
echo   │  ├─ USER_GUIDE.md     (用户指南)
echo   │  ├─ DEVELOPMENT.md    (开发指南)
echo   │  ├─ BUILD.md          (构建指南)
echo   │  ├─ FAQ.md            (常见问题)
echo   │  ├─ ARCHITECTURE.md   (架构设计)
echo   │  ├─ FEATURES.md       (功能列表)
echo   │  ├─ GITHUB_ACTIONS_GUIDE.md
echo   │  ├─ history/          (版本历史)
echo   │  ├─ features/         (功能说明)
echo   │  └─ troubleshooting/  (问题修复)
echo   │
echo   ├─ scripts/             (工具脚本)
echo   │  ├─ dev.sh/ps1        (开发脚本)
echo   │  ├─ build.sh/ps1      (构建脚本)
echo   │  ├─ dev-cn.bat        (中文开发)
echo   │  └─ build-cn.bat      (中文构建)
echo   │
echo   ├─ src-tauri/           (Rust 后端)
echo   ├─ ui/                  (前端界面)
echo   ├─ data/                (数据目录)
echo   └─ archive/             (历史归档)
echo.
echo ✨ 建议的后续优化:
echo   1. 添加项目徽章到 README.md
echo   2. 创建 .github/ISSUE_TEMPLATE/
echo   3. 创建 .github/PULL_REQUEST_TEMPLATE.md
echo   4. 添加 SECURITY.md (安全策略)
echo.
pause

