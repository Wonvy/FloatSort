# FloatSort 快速参考

## 🚀 常用命令

### 开发运行

```bash
# 开发模式（推荐，支持热重载）
cargo tauri dev

# 直接运行（无热重载）
cd src-tauri && cargo run
```

### 构建项目

```bash
# 发布版本（优化构建）
cargo tauri build

# 调试版本（快速构建）
cargo tauri build --debug

# 清理构建缓存
cargo clean
```

## 📁 项目目录

| 目录 | 说明 |
|------|------|
| `src-tauri/src/` | Rust 后端源代码 |
| `ui/` | 前端界面（HTML/CSS/JS） |
| `docs/` | 项目文档 |
| `data/` | 数据和配置文件 |

## 🔧 开发工具

### 依赖管理

```bash
# 查看依赖树
cargo tree

# 更新依赖
cargo update

# 添加依赖
cargo add [package-name]
```

### 代码质量

```bash
# 格式化代码
cargo fmt

# 代码检查
cargo clippy

# 运行测试
cargo test
```

## 📝 配置文件

| 文件 | 说明 |
|------|------|
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |
| `src-tauri/Cargo.toml` | Rust 包配置 |
| `Cargo.toml` | Workspace 配置 |
| `data/config.json` | 用户配置（运行时生成） |

## 🐛 故障排查

### 编译失败

```bash
# 清理并重新编译
cargo clean
cargo tauri dev
```

### 依赖问题

```bash
# 更新 Rust
rustup update

# 重新获取依赖
rm Cargo.lock
cargo build
```

### 窗口无法显示

检查 `ui/` 目录是否完整：
- ✅ index.html
- ✅ styles_minimal.css
- ✅ app_v2.js
- ✅ locales/

## 📚 更多文档

- [用户指南](USER_GUIDE.md) - 详细使用说明
- [开发指南](DEVELOPMENT.md) - 开发环境配置
- [构建指南](BUILD.md) - 构建和发布
- [架构设计](ARCHITECTURE.md) - 技术架构
- [Mac 安装指南](MAC_INSTALLATION.md) - Mac 用户必读

## 💡 快速提示

1. **首次启动较慢** - Rust 需要编译所有依赖，之后会快很多
2. **热重载** - 使用 `cargo tauri dev` 修改代码后会自动重启
3. **跨平台** - 在 Windows/Linux/macOS 上都可以开发和运行
4. **日志查看** - 开发模式下会在终端显示详细日志
5. **配置文件** - 首次运行会自动生成 `data/config.json`

## 🔗 相关链接

- [Tauri 官方文档](https://tauri.app/)
- [Rust 官方文档](https://doc.rust-lang.org/)
- [项目 GitHub](https://github.com/Wonvy/FloatSort)

