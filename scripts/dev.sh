#!/bin/bash
# FloatSort 开发启动脚本 (Bash)

echo "=================================="
echo "  FloatSort 开发环境启动"
echo "=================================="
echo ""

# 检查 Rust 是否安装
echo "检查环境..."
if ! command -v rustc &> /dev/null; then
    echo "✗ Rust 未安装！"
    echo "请访问 https://rustup.rs/ 安装 Rust"
    exit 1
fi
echo "✓ Rust: $(rustc --version)"

# 检查 Cargo 是否安装
if ! command -v cargo &> /dev/null; then
    echo "✗ Cargo 未安装！"
    exit 1
fi
echo "✓ Cargo: $(cargo --version)"

# 设置日志级别
export RUST_LOG=info
echo "✓ 日志级别: $RUST_LOG"

echo ""
echo "启动开发服务器..."
echo "提示: 按 Ctrl+C 停止"
echo ""

# 启动 Tauri 开发模式
cargo tauri dev

if [ $? -ne 0 ]; then
    echo ""
    echo "✗ 启动失败！"
    exit 1
fi

