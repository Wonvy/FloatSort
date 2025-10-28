# 开发文档

## 项目架构

### 整体架构

FloatSort 采用前后端分离架构：

```
┌─────────────────────────────────────┐
│         前端 UI (HTML/CSS/JS)        │
│  - 用户界面                          │
│  - 事件处理                          │
│  - 状态管理                          │
└──────────────┬──────────────────────┘
               │ Tauri IPC
┌──────────────┴──────────────────────┐
│         Rust 后端 (Tauri)            │
│  ┌──────────────────────────────┐   │
│  │  配置管理 (config.rs)         │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  规则引擎 (rule_engine.rs)    │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  文件监控 (file_monitor.rs)   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  文件操作 (file_ops.rs)       │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
               │
               ▼
         文件系统 (OS)
```

### 数据流

1. **用户启动监控**：
   ```
   UI Click → Tauri Command → FileMonitor.start()
   → notify Watcher → 监听文件系统事件
   ```

2. **文件事件触发**：
   ```
   文件系统事件 → notify → FileMonitor
   → RuleEngine.find_matching_rule()
   → file_ops.execute_action()
   → 发送事件到前端
   ```

3. **手动拖拽文件**：
   ```
   拖拽文件 → UI 捕获 → organize_file Command
   → RuleEngine → file_ops → 返回结果
   ```

## 核心模块详解

### 1. 配置管理 (config.rs)

**职责**：
- 加载和保存配置文件
- 提供默认配置
- 配置验证

**主要 API**：
```rust
pub struct AppConfig {
    pub watch_paths: Vec<String>,
    pub rules: Vec<Rule>,
    pub auto_start: bool,
    pub show_notifications: bool,
    pub log_level: String,
}

impl AppConfig {
    pub fn load_from_file(path: &Path) -> Result<Self>;
    pub fn save_to_file(&self, path: &Path) -> Result<()>;
    pub fn load_or_default(path: &Path) -> Result<Self>;
}
```

### 2. 规则引擎 (rule_engine.rs)

**职责**：
- 匹配文件与规则
- 条件判断逻辑
- 确定执行动作

**条件类型**：
```rust
pub enum RuleCondition {
    Extension { values: Vec<String> },
    SizeRange { min: Option<u64>, max: Option<u64> },
    NameContains { pattern: String },
    NameRegex { pattern: String },
    CreatedDaysAgo { min: Option<u64>, max: Option<u64> },
    ModifiedDaysAgo { min: Option<u64>, max: Option<u64> },
}
```

**动作类型**：
```rust
pub enum RuleAction {
    MoveTo { destination: String },
    CopyTo { destination: String },
    Rename { pattern: String },
    Delete,
}
```

**匹配算法**：
1. 过滤出已启用的规则
2. 按优先级排序（数字越小优先级越高）
3. 遍历规则，检查所有条件（AND 逻辑）
4. 返回第一个匹配的规则

### 3. 文件监控 (file_monitor.rs)

**职责**：
- 使用 notify crate 监控文件系统
- 处理文件创建和修改事件
- 自动应用规则

**工作流程**：
```rust
1. 创建 RecommendedWatcher
2. 为每个 watch_path 添加监控
3. 在新线程中接收事件
4. 过滤文件创建/修改事件
5. 获取文件信息
6. 调用 rule_engine 匹配规则
7. 执行对应动作
8. 发送结果到前端
```

**事件通知**：
- `file-organized`: 文件成功整理
- `file-error`: 处理出错

### 4. 文件操作 (file_ops.rs)

**职责**：
- 获取文件元数据
- 执行文件操作（移动、复制、重命名、删除）
- 处理跨分区移动

**核心函数**：
```rust
// 获取文件信息
pub fn get_file_info(path: &Path) -> Result<FileInfo>;

// 整理文件
pub fn organize_file(file_info: &FileInfo, rules: &[Rule]) -> Result<Option<String>>;

// 执行具体动作
fn execute_action(action: &RuleAction, file_info: &FileInfo) -> Result<Option<String>>;
```

## Tauri 命令

### 已实现的命令

| 命令 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `get_config` | - | `AppConfig` | 获取当前配置 |
| `save_config` | `config: AppConfig` | `()` | 保存配置 |
| `start_monitoring` | - | `()` | 启动文件监控 |
| `stop_monitoring` | - | `()` | 停止文件监控 |
| `organize_file` | `file_path: String` | `String` | 手动整理单个文件 |
| `get_statistics` | - | `Value` | 获取统计信息 |

### 添加新命令

1. 在 `main.rs` 中定义命令函数：
```rust
#[tauri::command]
fn my_command(param: String, state: State<AppState>) -> Result<String, String> {
    // 实现逻辑
    Ok("result".to_string())
}
```

2. 注册到 handler：
```rust
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    my_command
])
```

3. 前端调用：
```javascript
const result = await invoke('my_command', { param: 'value' });
```

## 前端开发

### 状态管理

应用状态保存在 `appState` 对象中：
```javascript
let appState = {
    monitoring: false,      // 监控状态
    config: null,           // 配置对象
    filesProcessed: 0,      // 处理文件数
    filesOrganized: 0,      // 整理文件数
};
```

### 事件系统

**后端到前端事件**：
```javascript
// 监听事件
await listen('file-organized', (event) => {
    console.log(event.payload);
});

// 后端发送事件
window.emit('file-organized', payload);
```

### UI 组件

主要组件：
- 头部状态栏
- 控制按钮区
- 拖拽区域
- 统计卡片
- 活动日志
- 设置面板

## 添加新功能

### 示例：添加新的规则条件

1. **修改 `models.rs`**：
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RuleCondition {
    // ... 现有条件
    
    // 新条件：文件夹路径匹配
    PathContains { pattern: String },
}
```

2. **修改 `rule_engine.rs`**：
```rust
fn check_single_condition(&self, condition: &RuleCondition, file_info: &FileInfo) -> bool {
    match condition {
        // ... 现有条件处理
        
        RuleCondition::PathContains { pattern } => {
            file_info.path.to_lowercase().contains(&pattern.to_lowercase())
        }
    }
}
```

3. **更新前端 UI**（如果需要）

### 示例：添加新的规则动作

1. **修改 `models.rs`**：
```rust
pub enum RuleAction {
    // ... 现有动作
    
    // 新动作：添加标签（示例）
    AddTag { tag: String },
}
```

2. **修改 `file_ops.rs`**：
```rust
fn execute_action(action: &RuleAction, file_info: &FileInfo) -> Result<Option<String>> {
    match action {
        // ... 现有动作处理
        
        RuleAction::AddTag { tag } => {
            // 实现标签功能（可能需要数据库）
            Ok(Some(format!("已添加标签: {}", tag)))
        }
    }
}
```

## 测试

### 单元测试

在模块底部添加测试：
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rule_matching() {
        // 测试代码
    }
}
```

运行测试：
```bash
cargo test
```

### 集成测试

在 `src-tauri/tests/` 目录中创建测试文件：
```rust
// tests/integration_test.rs
use floatsort::*;

#[test]
fn test_file_organization() {
    // 测试代码
}
```

### 前端测试

可以添加 Jest 或其他 JavaScript 测试框架。

## 性能优化建议

### 1. 规则匹配优化

- 使用缓存避免重复计算
- 对于大量规则，考虑使用索引
- 延迟加载正则表达式编译

### 2. 文件操作优化

- 批量处理文件
- 使用异步 I/O
- 避免阻塞主线程

### 3. 前端优化

- 虚拟滚动处理大量日志
- 防抖处理频繁更新
- 使用 Web Workers 处理耗时任务

## 调试技巧

### Rust 调试

```bash
# 详细日志
RUST_LOG=debug cargo tauri dev

# 特定模块日志
RUST_LOG=floatsort::file_monitor=trace cargo tauri dev

# 使用 dbg! 宏
dbg!(&file_info);
```

### JavaScript 调试

```javascript
// 开发者工具
console.log('Debug info:', data);
console.table(appState);

// 性能分析
console.time('operation');
// ... 代码
console.timeEnd('operation');
```

### 常见问题排查

1. **监控不工作**：检查路径权限、notify 日志
2. **规则不匹配**：打印条件检查结果
3. **文件操作失败**：检查目标路径、权限
4. **前端不更新**：检查事件监听、状态更新

## 代码规范

### Rust

- 使用 `cargo fmt` 格式化
- 使用 `cargo clippy` 检查
- 遵循 Rust API 指南
- 添加适当的注释

### JavaScript

- 使用现代 ES6+ 语法
- 保持函数简洁
- 添加错误处理
- 使用有意义的变量名

## 贡献流程

1. Fork 项目
2. 创建特性分支
3. 编写代码和测试
4. 运行 `cargo fmt` 和 `cargo clippy`
5. 提交 Pull Request
6. 等待代码审查

## 资源链接

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [notify crate 文档](https://docs.rs/notify/)
- [serde 文档](https://serde.rs/)
- [Rust 标准库](https://doc.rust-lang.org/std/)

