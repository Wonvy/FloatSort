# FloatSort

<div align="center">

🚀 **智能文件整理器** - 轻量、高效、智能

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/Wonvy/FloatSort)](https://github.com/Wonvy/FloatSort/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Wonvy/FloatSort/build.yml?branch=main)](https://github.com/Wonvy/FloatSort/actions)
[![Rust](https://img.shields.io/badge/Rust-1.70+-orange.svg)](https://www.rust-lang.org)
[![Tauri](https://img.shields.io/badge/Tauri-1.5-blue.svg)](https://tauri.app)

[功能特性](#-功能特性) •
[快速开始](#-快速开始) •
[文档](#-文档) •
[贡献指南](CONTRIBUTING.md) •
[更新日志](CHANGELOG.md)

</div>

---

## 📋 项目简介

FloatSort 是一个基于 Rust + Tauri 构建的桌面文件整理工具，提供：

- 🎯 **拖拽即整理**：拖拽文件自动分类
- 👁️ **实时监控**：监控文件夹变化，自动整理
- 📝 **自定义规则**：灵活的规则引擎，多条件判断
- ⚡ **高性能**：Rust 构建，轻量高效
- 🎨 **现代界面**：简洁美观的用户体验

## 📸 界面预览

<div align="center">
  <img src="docs/screenshots/main-window.png" width="700" alt="FloatSort 主界面">
  <p><em>简洁现代的主界面，支持中文、英文、日文三种语言</em></p>
</div>

## 🛠️ 技术栈

- **后端**: Rust + Tauri
- **前端**: HTML + CSS + JavaScript
- **核心库**:
  - `notify`: 文件系统监控
  - `serde`: 序列化/反序列化
  - `tokio`: 异步运行时
  - `tracing`: 日志系统

## 🚀 快速开始

### 前置要求

| 工具 | 版本要求 | 说明 |
|------|---------|------|
| **Rust** | 1.70+ | [安装指南](https://rustup.rs/) |
| **Cargo** | 自动安装 | Rust 自带包管理器 |
| **Visual Studio Build Tools** | - | 仅 Windows 需要 |

### 一键启动

```bash
# 1. 克隆项目
git clone https://github.com/Wonvy/FloatSort.git
cd FloatSort

# 2. 启动项目（首次会自动下载依赖）
cargo tauri dev
```

### 详细步骤

#### 1️⃣ 安装 Rust

**Windows:**
- 访问 [https://rustup.rs/](https://rustup.rs/) 下载并运行安装程序

**Linux/macOS:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### 2️⃣ 克隆项目

```bash
git clone https://github.com/Wonvy/FloatSort.git
cd FloatSort
```

#### 3️⃣ 运行项目

### 开发模式

```bash
# Tauri 开发模式（推荐，支持热重载）
cargo tauri dev

# 或直接运行（无热重载）
cd src-tauri
cargo run
```

> 💡 **提示**：`cargo tauri dev` 提供更好的开发体验，包括热重载和自动重启功能。

### 构建发布版本

```bash
# 发布版本（优化构建）
cargo tauri build

# 调试版本（快速构建）
cargo tauri build --debug
```

> **📱 Mac 用户特别提示**：首次运行可能会提示"无法验证开发者"，请查看 [Mac 安装指南](docs/MAC_INSTALLATION.md) 了解解决方法。

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
│   │   ├── rule_engine.rs   # 规则引擎
│   │   └── content_parser/  # 内容解析器
│   ├── Cargo.toml
│   └── tauri.conf.json
├── ui/                  # 前端界面
│   ├── index.html
│   ├── styles_minimal.css
│   ├── app_v2.js
│   └── locales/         # 多语言支持
├── docs/                # 文档目录
├── data/                # 数据目录
│   └── config.json      # 配置文件（自动生成）
└── README.md
```

## ✨ 功能特性

### 核心功能

- ✅ **智能规则引擎**
  - 多条件判断（扩展名、大小、名称、正则、时间）
  - 内容关键词匹配（PDF 文本、图片 EXIF）
  - 文件元数据匹配（PDF 属性、图片信息）
  - 正则表达式捕获组支持（`$1`, `$2`, `$3`...）
  - 时间条件（相对时间/绝对时间）
  - 规则优先级和排序
  
- ✅ **文件监控**
  - 实时监控文件夹变化
  - 文件稳定性检查（防止编辑中移动）
  - 自动/手动处理模式
  - 待处理文件队列

- ✅ **文件操作**
  - 移动、复制、重命名、删除
  - 跨分区移动支持
  - 文件冲突处理（跳过/覆盖/重命名）
  - 回收站支持

- ✅ **用户界面**
  - 现代化极简主题
  - 多语言支持（中文、英文、日文）
  - 拖拽文件快速整理
  - Mini 悬浮窗
  - 系统托盘支持
  - 实时活动日志
  - 智能条件显示（根据文件类型自动调整）

### 计划中

- 📅 预设规则模板
- 📅 智能文件分类建议
- 📅 主题定制
- 📅 快捷键支持
- 📅 更多文件类型支持（Office 文档、音视频）
- 📅 云存储集成

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

## 📚 文档

### 用户文档
- [📖 用户指南](docs/USER_GUIDE.md) - 详细的使用说明
- [⚡ 快速参考](docs/QUICK_REFERENCE.md) - 常用命令速查
- [🍎 Mac 安装指南](docs/MAC_INSTALLATION.md) - Mac 用户必读
- [❓ 常见问题](docs/FAQ.md) - FAQ

### 开发文档
- [💻 开发文档](docs/DEVELOPMENT.md) - 开发环境配置
- [🏗️ 架构设计](docs/ARCHITECTURE.md) - 技术架构说明
- [🔨 构建指南](docs/BUILD.md) - 编译打包说明
- [📚 完整文档](docs/README.md) - 文档导航中心

## 🛡️ 安全

请查看 [SECURITY.md](SECURITY.md) 了解安全政策和如何报告漏洞。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 🤝 贡献

我们欢迎所有形式的贡献！请阅读 [贡献指南](CONTRIBUTING.md) 了解如何参与。

- 🐛 [报告 Bug](https://github.com/Wonvy/FloatSort/issues/new?template=bug_report.yml)
- ✨ [功能建议](https://github.com/Wonvy/FloatSort/issues/new?template=feature_request.yml)
- 💬 [参与讨论](https://github.com/Wonvy/FloatSort/discussions)

## 🌟 支持项目

如果这个项目对您有帮助，请给个 ⭐️ Star！

## 📊 项目统计

![Alt](https://repobeats.axiom.co/api/embed/your-analytics-key.svg "Repobeats analytics image")

## 📮 联系方式

- **Issues**: [GitHub Issues](https://github.com/Wonvy/FloatSort/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Wonvy/FloatSort/discussions)

---

<div align="center">

**Made with ❤️ using Rust & Tauri**

Copyright © 2025 [Wonvy](https://github.com/Wonvy)

</div>
