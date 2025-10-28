# FloatSort 生产构建脚本 (PowerShell)

param(
    [switch]$Release = $false,
    [switch]$Debug = $false
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  FloatSort 构建脚本" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查环境
Write-Host "检查构建环境..." -ForegroundColor Yellow
$rustVersion = rustc --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Rust 未安装！" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Rust: $rustVersion" -ForegroundColor Green

# 清理之前的构建
Write-Host ""
Write-Host "清理之前的构建..." -ForegroundColor Yellow
cargo clean
Write-Host "✓ 清理完成" -ForegroundColor Green

# 确定构建类型
$buildType = "release"
if ($Debug) {
    $buildType = "debug"
    Write-Host ""
    Write-Host "构建类型: 调试版本" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "构建类型: 发布版本 (优化)" -ForegroundColor Cyan
}

# 开始构建
Write-Host ""
Write-Host "开始构建..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟时间，请耐心等待..." -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

if ($Debug) {
    cargo tauri build --debug
} else {
    cargo tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ 构建失败！" -ForegroundColor Red
    exit 1
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "==================================" -ForegroundColor Green
Write-Host "  ✓ 构建成功！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host "耗时: $($duration.TotalSeconds) 秒" -ForegroundColor Gray
Write-Host ""
Write-Host "构建输出位置:" -ForegroundColor Yellow
Write-Host "  可执行文件: src-tauri\target\$buildType\" -ForegroundColor Cyan
Write-Host "  安装包: src-tauri\target\$buildType\bundle\" -ForegroundColor Cyan
Write-Host ""

# 显示生成的文件
$bundlePath = "src-tauri\target\$buildType\bundle"
if (Test-Path $bundlePath) {
    Write-Host "生成的安装包:" -ForegroundColor Yellow
    Get-ChildItem -Path $bundlePath -Recurse -Include "*.msi", "*.exe" | ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  📦 $($_.Name) ($size MB)" -ForegroundColor Cyan
    }
}

