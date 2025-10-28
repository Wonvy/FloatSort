#!/bin/bash
# FloatSort 生产构建脚本 (Bash)

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}=================================="
echo -e "  FloatSort 构建脚本"
echo -e "==================================${NC}"
echo ""

# 检查参数
BUILD_TYPE="release"
if [ "$1" == "--debug" ]; then
    BUILD_TYPE="debug"
fi

# 检查环境
echo -e "${YELLOW}检查构建环境...${NC}"
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}✗ Rust 未安装！${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Rust: $(rustc --version)${NC}"

# 清理之前的构建
echo ""
echo -e "${YELLOW}清理之前的构建...${NC}"
cargo clean
echo -e "${GREEN}✓ 清理完成${NC}"

# 显示构建类型
echo ""
if [ "$BUILD_TYPE" == "debug" ]; then
    echo -e "${CYAN}构建类型: 调试版本${NC}"
else
    echo -e "${CYAN}构建类型: 发布版本 (优化)${NC}"
fi

# 开始构建
echo ""
echo -e "${YELLOW}开始构建...${NC}"
echo -e "${GRAY}这可能需要几分钟时间，请耐心等待...${NC}"
echo ""

START_TIME=$(date +%s)

if [ "$BUILD_TYPE" == "debug" ]; then
    cargo tauri build --debug
else
    cargo tauri build
fi

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}✗ 构建失败！${NC}"
    exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "${GREEN}=================================="
echo -e "  ✓ 构建成功！"
echo -e "==================================${NC}"
echo -e "${GRAY}耗时: $DURATION 秒${NC}"
echo ""
echo -e "${YELLOW}构建输出位置:${NC}"
echo -e "${CYAN}  可执行文件: src-tauri/target/$BUILD_TYPE/${NC}"
echo -e "${CYAN}  安装包: src-tauri/target/$BUILD_TYPE/bundle/${NC}"
echo ""

# 显示生成的文件
BUNDLE_PATH="src-tauri/target/$BUILD_TYPE/bundle"
if [ -d "$BUNDLE_PATH" ]; then
    echo -e "${YELLOW}生成的安装包:${NC}"
    find "$BUNDLE_PATH" -type f \( -name "*.deb" -o -name "*.AppImage" -o -name "*.dmg" \) | while read file; do
        SIZE=$(du -h "$file" | cut -f1)
        echo -e "${CYAN}  📦 $(basename "$file") ($SIZE)${NC}"
    done
fi

