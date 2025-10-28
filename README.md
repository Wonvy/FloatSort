# FloatSort - 智能悬浮文件整理器

<div align="center">

**Smart Floating File Organizer (Rust Edition)**

一个基于 Rust 和 Tauri 的智能桌面悬浮窗应用，用于自动整理文件。

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用指南](#使用指南) • [开发文档](#开发文档)

</div>

---

## 🎯 功能特性

### ✨ 核心功能

- **📁 实时文件监控**
  - 自动监控指定文件夹
  - 支持多路径同时监控
  - 跨平台文件系统事件

- **🎨 智能规则引擎**
  - 多条件判断（扩展名、大小、时间、名称等）
  - 灵活的动作系统（移动、复制、重命名、删除）
  - 规则优先级支持

- **🖱️ 拖拽快速整理**
  - 拖拽文件到悬浮窗
  - 即时应用规则
  - 支持批量处理

- **📊 可视化界面**
  - 现代化深色主题
  - 实时活动日志
  - 统计信息展示

### 🛠️ 技术亮点

- **高性能**: Rust 编写，内存安全，零成本抽象
- **跨平台**: 支持 Windows、macOS、Linux
- **轻量级**: 小于 10MB 的可执行文件
- **安全**: Tauri 提供的安全沙箱环境

---

## 🚀 快速开始

### 环境要求

- Rust 1.70+ (Edition 2021)
- Node.js 16+ (可选，用于前端开发)
- 操作系统: Windows 10+, macOS 10.15+, Ubuntu 20.04+

### 安装依赖

```bash
# 安装 Rust (如果尚未安装)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Windows 用户需要安装 Visual Studio Build Tools
# macOS 用户需要安装 Xcode Command Line Tools
```

### 构建项目

```bash
# 克隆项目
git clone https://github.com/yourusername/FloatSort.git
cd FloatSort

# 开发模式运行
cargo tauri dev

# 生产构建
cargo tauri build
```

---

## 📖 使用指南

### 基础配置

1. **添加监控路径**
   - 点击"设置"按钮
   - 在"监控路径"部分点击"添加路径"
   - 选择要监控的文件夹

2. **配置整理规则**
   - 默认提供图片和文档规则
   - 可以自定义规则条件和动作
   - 调整规则优先级

3. **启动监控**
   - 点击"开始监控"按钮
   - 应用将自动整理新文件

### 规则示例

```json
{
  "id": "rule_images",
  "name": "图片文件归类",
  "enabled": true,
  "conditions": [
    {
      "type": "Extension",
      "values": ["jpg", "png", "gif"]
    }
  ],
  "action": {
    "type": "MoveTo",
    "destination": "Pictures"
  },
  "priority": 1
}
```

### 拖拽整理

直接拖拽文件到悬浮窗的拖拽区域，应用会立即根据规则进行整理。

---

## 🔧 开发文档

### 项目结构

```
FloatSort/
├── src-tauri/           # Rust 后端
│   ├── src/
│   │   ├── main.rs      # 应用入口
│   │   ├── config.rs    # 配置管理
│   │   ├── models.rs    # 数据模型
│   │   ├── rule_engine.rs    # 规则引擎
│   │   ├── file_monitor.rs   # 文件监控
│   │   └── file_ops.rs       # 文件操作
│   ├── Cargo.toml       # Rust 依赖
│   └── tauri.conf.json  # Tauri 配置
├── ui/                  # 前端界面
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── data/                # 配置数据 (运行时生成)
│   └── config.json
└── README.md
```

### 核心模块

#### 规则引擎 (rule_engine.rs)

负责规则匹配和条件判断：

- 支持的条件类型：
  - `Extension`: 文件扩展名
  - `SizeRange`: 文件大小范围
  - `NameContains`: 文件名包含
  - `NameRegex`: 正则表达式匹配
  - `CreatedDaysAgo`: 创建时间
  - `ModifiedDaysAgo`: 修改时间

- 支持的动作类型：
  - `MoveTo`: 移动到指定目录
  - `CopyTo`: 复制到指定目录
  - `Rename`: 重命名文件
  - `Delete`: 删除文件

#### 文件监控 (file_monitor.rs)

使用 `notify` crate 实现跨平台文件监控：

- 实时检测文件创建和修改
- 自动应用规则
- 事件通知到前端

#### 配置管理 (config.rs)

管理应用配置和规则：

- JSON 格式存储
- 自动创建默认配置
- 配置热重载

---

## 🎨 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | Rust (Edition 2021) |
| GUI 框架 | Tauri 1.5 |
| 文件监控 | notify 6.1 |
| 序列化 | serde, serde_json |
| 日志 | tracing, tracing-subscriber |
| 异步运行时 | tokio |
| 前端 | HTML5, CSS3, JavaScript (ES6+) |

---

## 📝 配置文件说明

### config.json

```json
{
  "watch_paths": [
    "C:/Users/Public/Downloads"
  ],
  "rules": [
    {
      "id": "rule_id",
      "name": "规则名称",
      "enabled": true,
      "conditions": [...],
      "action": {...},
      "priority": 1
    }
  ],
  "auto_start": false,
  "show_notifications": true,
  "log_level": "info"
}
```

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

- [Tauri](https://tauri.app/) - 跨平台桌面应用框架
- [notify](https://github.com/notify-rs/notify) - 文件系统监控
- [serde](https://serde.rs/) - 序列化框架

---

<div align="center">

**用 ❤️ 和 🦀 制作**

[报告问题](https://github.com/yourusername/FloatSort/issues) • [功能建议](https://github.com/yourusername/FloatSort/issues)

</div>


