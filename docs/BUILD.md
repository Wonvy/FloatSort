# 构建指南

## 环境准备

### Windows

1. 安装 Rust：
```powershell
# 使用 rustup 安装
winget install Rustlang.Rustup
# 或者访问 https://rustup.rs/
```

2. 安装 Visual Studio Build Tools：
```powershell
# 需要 C++ 构建工具
winget install Microsoft.VisualStudio.2022.BuildTools
```

3. 安装 WebView2（Windows 10/11 通常已预装）：
```powershell
# 如果需要手动安装
winget install Microsoft.EdgeWebView2Runtime
```

### macOS

1. 安装 Xcode Command Line Tools：
```bash
xcode-select --install
```

2. 安装 Rust：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Linux (Ubuntu/Debian)

1. 安装系统依赖：
```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

2. 安装 Rust：
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## 开发模式

### 运行开发服务器

```bash
# 进入项目目录
cd FloatSort

# 运行开发模式（带热重载）
cargo tauri dev
```

开发模式特性：
- 自动重载 Rust 代码更改
- 自动刷新前端更改
- 详细的错误日志
- 开发者工具可用

### 调试

1. **Rust 后端调试**：
   - 使用 `println!` 或 `dbg!` 宏
   - 查看终端输出的 tracing 日志
   - 使用 `RUST_LOG=debug cargo tauri dev` 启用详细日志

2. **前端调试**：
   - 在开发模式下按 F12 打开开发者工具
   - 使用 `console.log` 调试 JavaScript
   - 检查网络请求和错误

## 生产构建

### 构建可执行文件

```bash
# 构建优化的生产版本
cargo tauri build
```

构建输出位置：
- **Windows**: `src-tauri/target/release/bundle/msi/FloatSort_0.1.0_x64_en-US.msi`
- **macOS**: `src-tauri/target/release/bundle/dmg/FloatSort_0.1.0_x64.dmg`
- **Linux**: `src-tauri/target/release/bundle/deb/floatsort_0.1.0_amd64.deb`

### 构建选项

1. **调试构建**（更快，但文件更大）：
```bash
cargo tauri build --debug
```

2. **指定目标平台**：
```bash
# 仅构建可执行文件，不打包安装程序
cargo build --release
```

3. **清理构建缓存**：
```bash
cargo clean
```

## 性能优化

### Cargo.toml 优化配置

当前已配置的优化选项：

```toml
[profile.release]
panic = "abort"        # 减小二进制大小
codegen-units = 1      # 更好的优化
lto = true             # 链接时优化
opt-level = "z"        # 最小化大小
strip = true           # 移除调试符号
```

### 进一步优化

1. **UPX 压缩**（可选）：
```bash
# 安装 UPX
# Windows: winget install upx
# macOS: brew install upx
# Linux: sudo apt install upx

# 压缩可执行文件
upx --best --lzma src-tauri/target/release/floatsort.exe
```

2. **减小依赖**：
   - 仅包含需要的 crate features
   - 移除未使用的依赖

## 打包和分发

### Windows

生成的文件：
- `FloatSort_0.1.0_x64_en-US.msi` - Windows 安装程序
- 位置: `src-tauri/target/release/bundle/msi/`

### macOS

生成的文件：
- `FloatSort_0.1.0_x64.dmg` - macOS 磁盘映像
- `FloatSort.app` - 应用程序包
- 位置: `src-tauri/target/release/bundle/dmg/`

**代码签名**（发布到 App Store 需要）：
```bash
# 需要 Apple Developer 账号
codesign --force --deep --sign "Developer ID Application: Your Name" FloatSort.app
```

### Linux

生成的文件：
- `floatsort_0.1.0_amd64.deb` - Debian 包
- `floatsort-0.1.0-1.x86_64.rpm` - RPM 包（如果安装了 rpmbuild）
- `floatsort_0.1.0_amd64.AppImage` - AppImage（如果安装了工具）
- 位置: `src-tauri/target/release/bundle/`

## 常见问题

### 1. 构建失败：找不到 Rust

```bash
# 确保 Rust 已添加到 PATH
source $HOME/.cargo/env
```

### 2. Windows: 缺少 MSVC 工具链

安装 Visual Studio Build Tools 并选择 C++ 工作负载。

### 3. Linux: WebKit 相关错误

```bash
sudo apt install libwebkit2gtk-4.0-dev
```

### 4. macOS: 权限问题

```bash
# 给予可执行权限
chmod +x src-tauri/target/release/floatsort
```

### 5. 构建速度慢

```bash
# 使用更多 CPU 核心
cargo build --release -j 8

# 或使用 sccache 缓存
cargo install sccache
export RUSTC_WRAPPER=sccache
```

## 持续集成

示例 GitHub Actions 工作流（`.github/workflows/build.yml`）：

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Install dependencies (Ubuntu)
        if: matrix.os == 'ubuntu-latest'
        run: |
          sudo apt update
          sudo apt install -y libwebkit2gtk-4.0-dev
      - name: Build
        run: cargo tauri build
```

## 开发工具推荐

- **IDE**: VSCode + rust-analyzer 插件
- **调试**: rust-gdb / lldb
- **性能分析**: cargo-flamegraph
- **代码检查**: cargo clippy
- **格式化**: cargo fmt

```bash
# 安装开发工具
rustup component add clippy rustfmt
cargo install cargo-flamegraph

# 运行检查
cargo clippy
cargo fmt --check
```


