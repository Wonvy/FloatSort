# 🏗️ FloatSort 架构设计

## 📐 总体架构

FloatSort 采用 **Tauri + Rust** 架构，将 Rust 的高性能与 Web 技术的灵活性相结合。

```
┌─────────────────────────────────────────────────────────┐
│                      前端层 (UI)                          │
│            HTML + CSS + JavaScript                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  规则管理 │  │  文件监控 │  │  配置导入  │              │
│  │   界面   │  │   界面   │  │   导出    │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└────────────────────┬────────────────────────────────────┘
                     │ Tauri IPC
┌────────────────────┴────────────────────────────────────┐
│                   Tauri 桥接层                           │
│              Commands + Events System                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                    后端层 (Rust)                         │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ 配置管理  │  │ 规则引擎  │  │ 文件监控  │             │
│  │  模块    │  │   模块   │  │   模块    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│        │              │              │                  │
│        └──────────────┴──────────────┘                  │
│                      │                                  │
│              ┌───────┴────────┐                         │
│              │   文件操作模块   │                         │
│              └────────────────┘                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                  系统层 (OS)                             │
│     文件系统 | 进程管理 | 系统托盘 | 通知                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 核心模块

### 1. 前端层 (ui/)

#### 职责
- 用户界面展示
- 用户交互处理
- 状态管理
- 与后端通信

#### 技术栈
- **HTML5**: 语义化结构
- **CSS3**: 现代样式、动画、渐变
- **Vanilla JavaScript**: 无框架依赖，轻量高效

#### 核心组件

**app_v2.js** - 主应用逻辑
```javascript
// 全局状态管理
const appState = {
    rules: [],
    folders: [],
    pendingFilesByFolder: {},
    // ...
};

// 核心功能
- renderRules()      // 规则列表渲染
- renderFolders()    // 文件夹列表渲染
- showBatchConfirm() // 批量确认对话框
- saveRule()         // 保存规则
- saveFolder()       // 保存文件夹配置
```

**styles_minimal.css** - 样式系统
```css
/* 设计系统 */
- CSS 变量定义（颜色、间距、圆角）
- 网格布局
- Flexbox 布局
- 过渡动画
- 响应式设计
```

---

### 2. Tauri 桥接层

#### Tauri Commands (前端 → 后端)

```rust
// src-tauri/src/main.rs

#[tauri::command]
async fn get_config(state: State<AppState>) -> Result<AppConfig>

#[tauri::command]
async fn save_config(config: AppConfig, state: State<AppState>) -> Result<()>

#[tauri::command]
async fn start_file_monitoring(folders: Vec<WatchFolder>, state: State<AppState>) -> Result<()>

#[tauri::command]
async fn process_file(file_path: String, folder_id: String, state: State<AppState>) -> Result<ProcessResult>
```

#### Tauri Events (后端 → 前端)

```rust
// 文件检测事件
app_handle.emit_all("file-detected", FileDetectedPayload {
    file_path: path.to_string_lossy().to_string(),
    folder_id: folder.id.clone(),
})

// 文件处理完成事件
app_handle.emit_all("file-organized", FileOrganizedPayload {
    file_path,
    destination,
    rule_name,
})
```

---

### 3. 后端核心模块

#### 3.1 配置管理 (config.rs)

**职责**: 配置文件的读取、保存、验证

```rust
pub struct AppConfig {
    pub version: u32,
    pub rules: Vec<Rule>,
    pub watch_folders: Vec<WatchFolder>,
}

impl AppConfig {
    pub fn load() -> Result<Self>
    pub fn save(&self) -> Result<()>
    pub fn migrate(old_config: OldConfig) -> Self
}
```

**特性**:
- JSON 格式存储
- 自动版本迁移
- 默认配置生成
- 错误恢复机制

---

#### 3.2 规则引擎 (rule_engine.rs)

**职责**: 文件与规则的匹配逻辑

```rust
pub struct RuleEngine {
    rules: Vec<Rule>,
}

impl RuleEngine {
    // 查找匹配的规则
    pub fn find_matching_rules(&self, file_info: &FileInfo) -> Vec<&Rule>
    
    // 检查单个条件
    fn check_single_condition(condition: &RuleCondition, file_info: &FileInfo) -> bool
    
    // 获取目标路径
    pub fn get_destination_path(rule: &Rule, file_info: &FileInfo, base_path: &Path) -> PathBuf
}
```

**支持的条件类型**:
```rust
pub enum RuleCondition {
    FileType { file_type: String },        // file/folder/both
    Extension { extensions: Vec<String> }, // 文件扩展名
    SizeRange { min: u64, max: u64 },     // 文件大小范围
    NameContains { pattern: String },      // 文件名包含
    NameRegex { pattern: String },         // 正则表达式
    CreatedAfter { date: String },         // 创建时间
    ModifiedAfter { date: String },        // 修改时间
}
```

**规则匹配流程**:
```
1. 遍历所有启用的规则（按优先级）
   ├─> 2. 检查所有条件（AND 逻辑）
   │     ├─> FileType 条件
   │     ├─> Extension 条件
   │     └─> 其他条件
   │
   ├─> 3. 所有条件都满足？
   │     ├─> 是 -> 返回该规则
   │     └─> 否 -> 继续下一个规则
   │
   └─> 4. 返回第一个匹配的规则
```

---

#### 3.3 文件监控 (file_monitor.rs)

**职责**: 监控文件系统变化，触发文件处理

```rust
pub struct FileMonitor {
    watcher: RecommendedWatcher,
    folders: Arc<Mutex<Vec<WatchFolder>>>,
    app_handle: AppHandle,
}

impl FileMonitor {
    pub fn new(app_handle: AppHandle) -> Self
    
    pub fn start(&mut self, folders: Vec<WatchFolder>) -> Result<()>
    
    pub fn stop(&mut self) -> Result<()>
    
    fn process_file(&self, path: PathBuf, folder_id: String)
    
    fn initial_scan(&self, folder: &WatchFolder)
}
```

**工作流程**:
```
┌─────────────┐
│  文件系统    │
│   事件      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   notify    │  监听文件变化
│   Watcher   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ FileMonitor │  过滤和处理
│ process_file│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   发送事件   │  emit "file-detected"
│  到前端     │
└─────────────┘
```

**支持的事件类型**:
- Create: 文件创建
- Modify: 文件修改
- Remove: 文件删除
- Rename: 文件重命名

---

#### 3.4 文件操作 (file_ops.rs)

**职责**: 执行文件的移动、复制、重命名、删除

```rust
// 获取文件信息
pub fn get_file_info(path: &Path) -> Result<FileInfo>

// 整理单个文件
pub fn organize_file(
    file_info: FileInfo,
    applicable_rules: Vec<&Rule>,
) -> Result<String>

// 执行规则动作
fn execute_action(
    source: &Path,
    destination: &Path,
    action: &RuleAction,
    conflict_strategy: ConflictStrategy,
) -> Result<()>

// 文件冲突处理
fn move_file_with_strategy(...) -> Result<()>
fn copy_file_with_strategy(...) -> Result<()>
fn generate_copy_name(...) -> PathBuf
```

**冲突处理策略**:
```rust
pub enum ConflictStrategy {
    Skip,      // 跳过，不处理
    Overwrite, // 覆盖已存在的文件
    Rename,    // 重命名为 "文件名 (副本).ext"
}
```

**回收站支持**:
```rust
// 使用 trash crate
if destination == "{recycle}" {
    trash::delete(source_path)?;
}
```

---

#### 3.5 活动日志 (activity_log.rs)

**职责**: 记录文件操作日志

```rust
pub fn log_file_operation(
    operation_type: &str,      // "移动", "复制", "删除"
    original_path: &str,       // 原始路径
    target_path: Option<&str>, // 目标路径
    rule_name: Option<&str>,   // 规则名称
    success: bool,             // 是否成功
    error_message: Option<&str>, // 错误信息
) -> Result<String>
```

**日志格式**:
```
[2025-10-30 10:05:04] 移动: C:\file.txt → D:\target\file.txt [规则: 文档分类] ✅ 成功
[2025-10-30 10:05:05] 移动: C:\file2.txt [错误: 目标文件已存在] ❌ 失败
```

**日志文件**:
- 位置: `log/floatsort_YYYY-MM-DD.log`
- 每天一个文件
- 自动创建目录

---

## 📊 数据模型

### 核心数据结构 (models.rs)

```rust
// 文件信息
pub struct FileInfo {
    pub path: PathBuf,
    pub name: String,
    pub extension: Option<String>,
    pub size: u64,
    pub created: SystemTime,
    pub modified: SystemTime,
    pub is_directory: bool,
}

// 规则
pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    pub conditions: Vec<RuleCondition>,
    pub destination: String,
    pub conflict_strategy: ConflictStrategy,
}

// 监控文件夹
pub struct WatchFolder {
    pub id: String,
    pub name: String,
    pub path: String,
    pub enabled: bool,
    pub associated_rule_ids: Vec<String>,
    pub processing_mode: ProcessingMode, // Auto | Manual
}

// 处理模式
pub enum ProcessingMode {
    Auto,   // 自动处理
    Manual, // 手动确认
}
```

---

## 🔄 数据流

### 文件处理完整流程

```
┌─────────────┐
│ 用户添加监控  │
│   文件夹     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│FileMonitor  │
│ 开始监控     │  ◄─── notify crate
└──────┬──────┘
       │
       │ 检测到文件
       ▼
┌─────────────┐
│  发送事件    │  emit("file-detected", {...})
│  到前端     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  前端处理    │
│ file-detected│
└──────┬──────┘
       │
       ├─> ProcessingMode == Auto
       │     │
       │     ▼
       │   invoke("process_file")  ─────┐
       │                                │
       └─> ProcessingMode == Manual     │
             │                          │
             ▼                          │
           添加到待处理队列               │
             │                          │
             ▼                          │
           用户点击确认                   │
             │                          │
             ▼                          │
           invoke("process_file")  ─────┤
                                       │
                                       ▼
                              ┌─────────────┐
                              │RuleEngine   │
                              │ 匹配规则     │
                              └──────┬──────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │ FileOps     │
                              │ 执行操作     │
                              └──────┬──────┘
                                     │
                                     ├─> 成功
                                     │     │
                                     │     ▼
                                     │   记录日志
                                     │   更新统计
                                     │
                                     └─> 失败
                                           │
                                           ▼
                                         记录错误
                                         显示通知
```

---

## 🛡️ 错误处理

### 错误处理策略

```rust
// 使用 anyhow::Result 统一错误处理
pub type Result<T> = anyhow::Result<T>;

// 错误传播
fn risky_operation() -> Result<()> {
    let config = AppConfig::load()?;  // ? 操作符传播错误
    config.save()?;
    Ok(())
}

// 错误恢复
impl AppConfig {
    pub fn load() -> Result<Self> {
        match Self::load_from_file() {
            Ok(config) => Ok(config),
            Err(_) => {
                // 加载失败，使用默认配置
                warn!("无法加载配置，使用默认值");
                Ok(Self::default())
            }
        }
    }
}
```

### 日志系统

```rust
use tracing::{info, warn, error, debug};

// 不同级别的日志
info!("应用启动");
debug!("调试信息: 规则数量 = {}", rules.len());
warn!("警告: 配置文件不存在，使用默认配置");
error!("错误: 无法写入文件 {}", path);
```

---

## ⚡ 性能优化

### 1. 异步处理

```rust
// 使用 tokio 异步运行时
#[tokio::main]
async fn main() {
    // 异步命令处理
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            // ...
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2. 文件监控优化

```rust
// 防抖动处理
let debounce_duration = Duration::from_millis(500);

// 忽略临时文件
if path.extension() == Some(OsStr::new("tmp")) {
    return;
}

// 批量处理
let mut batch = Vec::new();
// 收集一段时间内的文件
// 批量处理
```

### 3. 规则匹配优化

```rust
// 规则按优先级排序（启动时一次）
rules.sort_by(|a, b| a.priority.cmp(&b.priority));

// 提前退出
for rule in rules.iter() {
    if !rule.enabled {
        continue;
    }
    if matches(rule, file) {
        return Some(rule); // 找到第一个匹配的规则就返回
    }
}
```

---

## 🔐 安全性

### 1. 路径验证

```rust
// 防止路径遍历攻击
fn is_safe_path(path: &Path) -> bool {
    !path.to_string_lossy().contains("..")
}

// 规范化路径
let canonical_path = path.canonicalize()?;
```

### 2. 权限检查

```rust
// 检查文件是否可读写
if !path.exists() {
    return Err(anyhow!("文件不存在"));
}

if metadata.permissions().readonly() {
    return Err(anyhow!("文件只读"));
}
```

### 3. Tauri 安全配置

```json
{
  "tauri": {
    "allowlist": {
      "all": false,  // 默认拒绝所有
      "fs": {
        "all": true,
        "scope": ["**"]  // 限制文件系统访问范围
      },
      "dialog": {
        "all": true
      }
    }
  }
}
```

---

## 📦 构建优化

### Release 配置

```toml
[profile.release]
panic = "abort"       # 减小二进制大小
codegen-units = 1     # 更好的优化
lto = true            # 链接时优化
opt-level = "z"       # 最小化大小
strip = true          # 移除调试符号
```

### 依赖优化

```toml
# 只包含需要的特性
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
serde = { version = "1.0", features = ["derive"] }
```

---

## 🔮 扩展性

### 1. 插件系统（规划中）

```rust
pub trait Plugin {
    fn name(&self) -> &str;
    fn version(&self) -> &str;
    fn on_file_detected(&self, file: &FileInfo) -> Result<()>;
    fn on_rule_matched(&self, rule: &Rule, file: &FileInfo) -> Result<()>;
}
```

### 2. 自定义条件（规划中）

```rust
pub trait CustomCondition {
    fn check(&self, file: &FileInfo) -> bool;
}
```

### 3. 钩子系统（规划中）

```rust
// 文件处理前后的钩子
app.on_before_process(|file| { /* ... */ });
app.on_after_process(|file, result| { /* ... */ });
```

---

**最后更新**: 2025-10-30

