# FloatSort 开发启动脚本 (PowerShell)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  FloatSort 开发环境启动" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Rust 是否安装
Write-Host "检查环境..." -ForegroundColor Yellow
$rustVersion = rustc --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Rust 未安装！" -ForegroundColor Red
    Write-Host "请访问 https://rustup.rs/ 安装 Rust" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Rust: $rustVersion" -ForegroundColor Green

# 检查 Cargo 是否安装
$cargoVersion = cargo --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Cargo 未安装！" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Cargo: $cargoVersion" -ForegroundColor Green

# 设置日志级别
$env:RUST_LOG = "info"
Write-Host "✓ 日志级别: $env:RUST_LOG" -ForegroundColor Green

Write-Host ""
Write-Host "启动开发服务器..." -ForegroundColor Yellow
Write-Host "提示: 按 Ctrl+C 停止" -ForegroundColor Gray
Write-Host ""

# 启动 Tauri 开发模式
cargo tauri dev

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "✗ 启动失败！" -ForegroundColor Red
    exit 1
}

