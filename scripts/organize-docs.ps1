# 文档整理脚本
# 将散落的文档整理到合理的目录结构中

Write-Host "📚 开始整理文档..." -ForegroundColor Cyan

# 创建文档目录结构
$directories = @(
    "docs/history",
    "docs/troubleshooting",
    "docs/features",
    "archive"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
        Write-Host "✓ 创建目录: $dir" -ForegroundColor Green
    }
}

# 版本历史文档 -> docs/history/
$historyDocs = @(
    "V2.9完整功能说明.md",
    "V2.8.1修复说明.md",
    "V2.8完整更新说明.md",
    "V2.8更新进度.md",
    "V2.7界面简化更新.md",
    "V2.5快速测试.md",
    "V2.5功能更新说明.md",
    "V2.3功能完成报告.md",
    "V2.2功能完成报告.md",
    "V2.2功能升级计划.md",
    "V2快速开始.md",
    "V2完成报告.md",
    "V2开发进度.md",
    "V2架构设计.md"
)

Write-Host "`n📦 移动版本历史文档..." -ForegroundColor Yellow
foreach ($doc in $historyDocs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination "docs/history/" -Force
        Write-Host "  → $doc -> docs/history/" -ForegroundColor Gray
    }
}

# 功能说明文档 -> docs/features/
$featureDocs = @(
    "托盘功能说明.md",
    "Mini窗口拖拽修复.md",
    "Mini窗口快速测试.md",
    "Mini悬浮窗功能说明.md",
    "规则排序和Mini窗口开发进度.md",
    "极简风格更新说明.md",
    "批量预览功能说明.md",
    "拖拽功能说明.md",
    "监控功能说明.md"
)

Write-Host "`n🎨 移动功能说明文档..." -ForegroundColor Yellow
foreach ($doc in $featureDocs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination "docs/features/" -Force
        Write-Host "  → $doc -> docs/features/" -ForegroundColor Gray
    }
}

# 问题修复文档 -> docs/troubleshooting/
$troubleshootingDocs = @(
    "编译错误修复.md",
    "无限循环BUG修复说明.md"
)

Write-Host "`n🔧 移动问题修复文档..." -ForegroundColor Yellow
foreach ($doc in $troubleshootingDocs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination "docs/troubleshooting/" -Force
        Write-Host "  → $doc -> docs/troubleshooting/" -ForegroundColor Gray
    }
}

# 开发总结文档 -> archive/
$archiveDocs = @(
    "UI优化_2025-10-28.md",
    "开发总结_2025-10-28.md",
    "开发总结.md",
    "规则编辑功能测试指南.md",
    "当前进展和下一步.md",
    "测试指南.md",
    "快速安装指南.md",
    "项目完成总结.md"
)

Write-Host "`n📁 归档开发总结文档..." -ForegroundColor Yellow
foreach ($doc in $archiveDocs) {
    if (Test-Path $doc) {
        Move-Item -Path $doc -Destination "archive/" -Force
        Write-Host "  → $doc -> archive/" -ForegroundColor Gray
    }
}

# 创建 .gitignore for archive
$archiveGitignore = @"
# 归档文档目录
# 这些文档是历史开发记录，不影响当前项目使用

# 如果您是新用户，可以忽略此目录
# 如果您是开发者，这些文档记录了项目的演进历史
"@

Set-Content -Path "archive/.gitignore" -Value $archiveGitignore

Write-Host ""
Write-Host "OK 文档整理完成！" -ForegroundColor Green
Write-Host ""
Write-Host "新的文档结构:" -ForegroundColor Cyan
Write-Host "  docs/"
Write-Host "    README.md           - 文档导航"
Write-Host "    USER_GUIDE.md       - 用户指南"
Write-Host "    DEVELOPMENT.md      - 开发指南"
Write-Host "    BUILD.md            - 构建指南"
Write-Host "    history/            - 版本历史"
Write-Host "    features/           - 功能说明"
Write-Host "    troubleshooting/    - 问题修复"
Write-Host ""
Write-Host "  archive/              - 历史归档"
Write-Host ""
Write-Host "提示:" -ForegroundColor Yellow
Write-Host "  - 主要文档保留在根目录"
Write-Host "  - 详细文档整理到 docs/ 目录"
Write-Host "  - 历史开发文档归档到 archive/ 目录"
Write-Host "  - 从 docs/README.md 开始浏览所有文档"

