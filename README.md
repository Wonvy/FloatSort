# FloatSort

🚀 **智能悬浮文件整理器** - 轻量、高效、智能

## 📋 项目简介

FloatSort 是一个基于 Rust + Tauri 构建的桌面文件整理工具，提供：

- 🎯 **拖拽即整理**：拖拽文件自动分类
- 👁️ **实时监控**：监控文件夹变化，自动整理
- 📝 **自定义规则**：灵活的规则引擎，多条件判断
- ⚡ **高性能**：Rust 构建，轻量高效
- 🎨 **现代界面**：简洁美观的用户体验

## 🛠️ 技术栈

- **后端**: Rust + Tauri
- **前端**: HTML + CSS + JavaScript
- **核心库**:
  - `notify`: 文件系统监控
  - `serde`: 序列化/反序列化
  - `tokio`: 异步运行时
  - `tracing`: 日志系统

## 🚀 快速开始

### 环境要求

- Rust 1.70+
- Node.js 16+ (可选)
- Visual Studio Build Tools (Windows)

### 安装依赖

```bash
# 克隆项目
git clone <your-repo-url>
cd FloatSort

# Rust 依赖会在构建时自动安装
```

### 开发模式

```bash
# 方式1：使用启动脚本（Windows）
开始开发.bat

# 方式2：手动启动
cd src-tauri
cargo run

# 方式3：使用 Tauri CLI（如果已安装）
cargo tauri dev
```

### 构建发布版本

```bash
cd src-tauri
cargo build --release
```

## 📁 项目结构

```
FloatSort/
├── src-tauri/           # Rust 后端
│   ├── src/
│   │   ├── main.rs      # 主入口
│   │   ├── config.rs    # 配置管理
│   │   ├── models.rs    # 数据模型
│   │   ├── file_ops.rs  # 文件操作
│   │   ├── file_monitor.rs  # 文件监控
│   │   └── rule_engine.rs   # 规则引擎
│   ├── Cargo.toml
│   └── tauri.conf.json
├── ui/                  # 前端界面
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── data/                # 数据目录
│   └── config.json      # 配置文件（自动生成）
└── README.md
```

## ✨ 功能特性

### 已实现

- ✅ 基础框架搭建
- ✅ 配置文件管理
- ✅ 文件操作（移动、复制、重命名、删除）
- ✅ 规则引擎（多条件匹配）
- ✅ 现代化 UI 界面
- ✅ 拖拽文件处理

### 开发中

- 🚧 文件夹实时监控
- 🚧 规则管理界面
- 🚧 批量操作
- 🚧 撤销/恢复功能
- 🚧 统计分析

### 计划中

- 📅 预设规则模板
- 📅 智能文件分类建议
- 📅 多语言支持
- 📅 主题定制
- 📅 快捷键支持

## 🎮 使用指南

### 添加规则

1. 点击 **"➕ 添加规则"** 按钮
2. 填写规则信息：
   - 规则名称
   - 匹配类型（扩展名/大小/文件名）
   - 匹配值
   - 目标文件夹
3. 保存规则

### 处理文件

**方式1：拖拽**
- 将文件拖拽到主界面拖拽区

**方式2：选择**
- 点击拖拽区，选择文件

### 监控文件夹

1. 点击 **"👁️ 开始监控"** 按钮
2. 系统会自动监控配置的文件夹
3. 新增/修改的文件会自动按规则处理
4. 点击 **"⏸️ 停止监控"** 停止监控

## ⚙️ 配置说明

配置文件位置: `data/config.json`

```json
{
  "monitor_paths": [],
  "rules": [],
  "auto_start": false,
  "notify_on_action": true
}
```

- `monitor_paths`: 监控的文件夹路径列表
- `rules`: 整理规则列表
- `auto_start`: 启动时自动开始监控
- `notify_on_action`: 执行操作时显示通知

## 🐛 问题排查

### 编译错误

```bash
# 清理缓存重新编译
cargo clean
cargo build
```

### 窗口无法显示

检查 `ui/` 目录是否存在所有文件：
- index.html
- styles.css
- app.js
- favicon.ico

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

- Issues: [GitHub Issues](your-repo-url/issues)
- Email: your-email@example.com

---

**Made with ❤️ using Rust & Tauri**
