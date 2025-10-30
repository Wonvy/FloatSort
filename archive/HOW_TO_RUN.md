# 如何运行 FloatSort

## 🚀 快速开始（Windows）

### 方法 1：双击批处理文件（推荐）

直接双击项目根目录下的：
```
开始开发.bat      # 启动开发服务器
构建项目.bat      # 构建生产版本
```

### 方法 2：使用 PowerShell 脚本

在 PowerShell 中运行：
```powershell
# 开发模式
.\scripts\dev.ps1

# 构建项目
.\scripts\build.ps1
```

### 方法 3：直接使用 Cargo

```powershell
# 开发模式
cargo tauri dev

# 构建项目
cargo tauri build
```

---

## 🐧 Linux / 🍎 macOS

### 首次运行：赋予执行权限

```bash
# 赋予脚本执行权限
chmod +x scripts/dev.sh
chmod +x scripts/build.sh
```

### 运行开发服务器

```bash
# 使用脚本
./scripts/dev.sh

# 或直接使用 cargo
cargo tauri dev
```

### 构建项目

```bash
# 使用脚本
./scripts/build.sh

# 或直接使用 cargo
cargo tauri build
```

---

## 📋 前提条件

### 必需环境

1. **Rust** (1.70+)
   ```bash
   # 安装 Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # 验证安装
   rustc --version
   cargo --version
   ```

2. **系统依赖**

   **Windows:**
   - Visual Studio Build Tools（C++ 构建工具）
   - WebView2 Runtime（Windows 10/11 通常已预装）

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Ubuntu/Debian:**
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

   **Fedora:**
   ```bash
   sudo dnf install \
       webkit2gtk4.0-devel \
       openssl-devel \
       curl \
       wget \
       libappindicator-gtk3 \
       librsvg2-devel
   ```

---

## 🎯 开发模式详细说明

### 启动开发服务器

```bash
cargo tauri dev
```

**特性：**
- ✅ 自动热重载（Rust 和前端）
- ✅ 开发者工具可用（按 F12）
- ✅ 详细错误信息
- ✅ 实时日志输出

**环境变量：**
```bash
# 启用详细日志
RUST_LOG=debug cargo tauri dev

# 特定模块日志
RUST_LOG=floatsort::file_monitor=trace cargo tauri dev
```

### 首次运行可能需要时间

第一次运行时，Cargo 会下载并编译所有依赖，可能需要 5-10 分钟。

---

## 📦 构建生产版本

### 构建命令

```bash
cargo tauri build
```

### 构建输出

**Windows:**
- 位置：`src-tauri\target\release\bundle\msi\`
- 文件：`FloatSort_0.1.0_x64_en-US.msi`

**macOS:**
- 位置：`src-tauri/target/release/bundle/dmg/`
- 文件：`FloatSort_0.1.0_x64.dmg`

**Linux:**
- 位置：`src-tauri/target/release/bundle/deb/`
- 文件：`floatsort_0.1.0_amd64.deb`
- AppImage：`floatsort_0.1.0_amd64.AppImage`

### 构建选项

```bash
# 调试构建（更快，但未优化）
cargo tauri build --debug

# 清理构建缓存
cargo clean

# 仅编译，不打包
cargo build --release
```

---

## 🔧 常见问题

### Windows

**问题：找不到 MSVC 编译器**
```
解决：安装 Visual Studio Build Tools
下载地址：https://visualstudio.microsoft.com/downloads/
选择"使用 C++ 的桌面开发"工作负载
```

**问题：WebView2 未安装**
```
解决：下载并安装 WebView2 Runtime
下载地址：https://developer.microsoft.com/microsoft-edge/webview2/
```

### Linux

**问题：找不到 webkit2gtk**
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.0-dev

# Fedora
sudo dnf install webkit2gtk4.0-devel
```

**问题：权限被拒绝**
```bash
# 赋予脚本执行权限
chmod +x scripts/*.sh
```

### macOS

**问题：无法打开应用（安全限制）**
```
解决：
1. 打开"系统偏好设置" → "安全性与隐私"
2. 点击"仍要打开"按钮
或者：
xattr -d com.apple.quarantine /Applications/FloatSort.app
```

---

## 📝 开发工作流

### 标准开发流程

1. **启动开发服务器**
   ```bash
   cargo tauri dev
   ```

2. **修改代码**
   - Rust 代码：`src-tauri/src/`
   - 前端代码：`ui/`

3. **自动重载**
   - Rust 修改：保存后自动重新编译
   - 前端修改：保存后自动刷新

4. **测试**
   ```bash
   cargo test
   ```

5. **代码检查**
   ```bash
   cargo fmt --all
   cargo clippy --all-targets
   ```

6. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

### 推荐的 IDE 设置

**Visual Studio Code:**
- 安装 rust-analyzer 插件
- 安装 Tauri 插件
- 安装 Better TOML 插件

**配置文件** (`.vscode/settings.json`):
```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

---

## 🎓 学习资源

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Rust 官方教程](https://doc.rust-lang.org/book/)
- [项目开发文档](docs/DEVELOPMENT.md)
- [项目构建指南](docs/BUILD.md)

---

## 💬 获取帮助

遇到问题？

1. 查看 [常见问题](docs/USER_GUIDE.md#常见问题)
2. 搜索 [Issues](https://github.com/Wonvy/FloatSort/issues)
3. 创建新 [Issue](https://github.com/Wonvy/FloatSort/issues/new)
4. 加入 [讨论区](https://github.com/Wonvy/FloatSort/discussions)

---

祝开发愉快！🚀

