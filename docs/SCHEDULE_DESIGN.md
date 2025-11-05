# 文件夹调度系统设计文档

## 📋 功能概述

为每个监控文件夹添加灵活的执行时机选项，而不是检测到文件就立即处理。

## 🎯 执行模式

### 1. 即时模式
| 模式 | 图标 | 说明 | 使用场景 |
|------|------|------|----------|
| 立即执行 | 🚀 | 检测到文件立即整理 | 需要实时处理的重要文件夹 |
| 手动确认 | ✋ | 添加到待处理列表，需要确认 | 需要人工审核的文件 |

### 2. 延迟模式
| 模式 | 图标 | 说明 | 使用场景 |
|------|------|------|----------|
| 启动时执行 | 🔄 | 每次程序启动时处理累积的文件 | 不频繁使用的文件夹 |

### 3. 定时模式
| 类型 | 图标 | 说明 | 配置选项 | 使用场景 |
|------|------|------|----------|----------|
| 间隔执行 | ⏱️ | 每N分钟/小时执行一次 | 30分钟、1小时、2小时、自定义 | 定期批量处理 |
| 每天执行 | ⏰ | 每天指定时间执行 | 时间选择（如09:00） | 每日定时整理 |
| 每周执行 | 📅 | 每周指定时间执行 | 星期几 + 时间 | 每周定时整理 |

## 🎨 UI 设计

### 监控列表显示

```
┌─────────────────────────────────────────────────────────────┐
│ 📁 D:\下载                                ✓ 启用            │
│ 🚀 立即执行                              待处理: 0          │
│ 关联规则: 图片整理, PDF归档                                │
│ ─────────────────────────────────────────────────────────── │
│ 📁 D:\文档                                ✓ 启用            │
│ ⏰ 每天 09:00                            待处理: 15         │
│ 关联规则: 文档分类                                          │
│ ─────────────────────────────────────────────────────────── │
│ 📁 D:\临时                                ✓ 启用            │
│ 📅 每周一 10:00                          待处理: 3          │
│ 关联规则: 清理规则                                          │
│ ─────────────────────────────────────────────────────────── │
│ 📁 D:\工作                                ✓ 启用            │
│ ⏱️ 每30分钟                              待处理: 8          │
│ 关联规则: 项目整理                                          │
└─────────────────────────────────────────────────────────────┘
```

### 添加/编辑文件夹 - 调度设置

```
┌───────────── 添加监控文件夹 ─────────────────┐
│                                               │
│ 📂 选择文件夹: D:\下载                        │
│                                               │
│ 🎯 执行方式:                                  │
│  ○ 🚀 立即执行 - 检测到文件立即整理          │
│  ○ ✋ 手动确认 - 添加到待处理列表            │
│  ○ 🔄 启动时执行 - 程序启动时处理            │
│  ● ⏱️ 定时执行 - 按时间计划执行             │
│                                               │
│  ┌─ 定时设置 ───────────────────────────┐   │
│  │ 定时类型:                               │   │
│  │  ● 间隔执行                             │   │
│  │    每 [30▼] 分钟                        │   │
│  │                                         │   │
│  │  ○ 每天执行                             │   │
│  │    时间: [09]:[00]                      │   │
│  │                                         │   │
│  │  ○ 每周执行                             │   │
│  │    星期: [周一▼]  时间: [09]:[00]       │   │
│  └────────────────────────────────────────┘   │
│                                               │
│ 🏷️ 关联规则:                                 │
│  ☑ 图片整理                                   │
│  ☑ PDF归档                                    │
│                                               │
│              [取消]      [保存]               │
└───────────────────────────────────────────────┘
```

## 📊 数据结构

### Rust (后端)

```rust
pub struct WatchFolder {
    pub id: String,
    pub path: String,
    pub name: String,
    pub enabled: bool,
    pub rule_ids: Vec<String>,
    
    // 新增字段
    pub trigger_mode: TriggerMode,
    pub schedule_type: Option<ScheduleType>,
    pub schedule_interval_minutes: Option<u32>,
    pub schedule_daily_time: Option<String>,
    pub schedule_weekly_day: Option<u8>,
    pub schedule_weekly_time: Option<String>,
}

pub enum TriggerMode {
    Immediate,   // 立即执行
    Manual,      // 手动确认
    OnStartup,   // 启动时执行
    Scheduled,   // 定时执行
}

pub enum ScheduleType {
    Interval,    // 间隔执行
    Daily,       // 每天执行
    Weekly,      // 每周执行
}
```

### JavaScript (前端)

```javascript
const folder = {
    id: "uuid",
    path: "D:\\下载",
    name: "下载",
    enabled: true,
    rule_ids: ["rule1", "rule2"],
    
    // 新增字段
    trigger_mode: "scheduled",  // immediate, manual, on_startup, scheduled
    schedule_type: "interval",  // interval, daily, weekly
    schedule_interval_minutes: 30,
    schedule_daily_time: "09:00",
    schedule_weekly_day: 1,     // 0=周日, 1=周一, ...
    schedule_weekly_time: "09:00"
};
```

## 🔄 调度逻辑（待实现）

### 1. 立即执行 (Immediate)
- 文件稳定后立即调用 `organize_file`
- 当前已实现（原 auto 模式）

### 2. 手动确认 (Manual)
- 文件稳定后添加到 `pending_files`
- 等待用户点击批量处理按钮
- 当前已实现

### 3. 启动时执行 (OnStartup)
- 程序启动时扫描文件夹
- 处理所有匹配规则的文件
- 需要新增：启动时触发器

### 4. 定时执行 (Scheduled)

#### Interval - 间隔执行
```rust
// 使用 tokio::time::interval
let interval = tokio::time::interval(Duration::from_secs(minutes * 60));
loop {
    interval.tick().await;
    process_pending_files_for_folder(folder_id).await;
}
```

#### Daily - 每天执行
```rust
// 计算距离下次执行的时间
let next_run = calculate_next_daily_run(target_time);
tokio::time::sleep(next_run).await;
process_pending_files_for_folder(folder_id).await;
```

#### Weekly - 每周执行
```rust
// 计算距离下次执行的时间
let next_run = calculate_next_weekly_run(day, time);
tokio::time::sleep(next_run).await;
process_pending_files_for_folder(folder_id).await;
```

## 📝 实现步骤

### ✅ 已完成
1. [x] 扩展数据结构：添加 TriggerMode, ScheduleType 等枚举类型
2. [x] 更新 WatchFolder 结构：添加调度相关字段
3. [x] 添加 WatchFolder 辅助方法：迁移和显示文本生成
4. [x] 在配置加载时自动迁移旧数据（processing_mode -> trigger_mode）

### 🚧 进行中
5. [ ] 更新前端UI：添加调度模式选择界面
6. [ ] 前端：在监控列表中显示执行方式

### 📋 待实现
7. [ ] 后端：实现定时调度逻辑
8. [ ] 测试所有调度模式

## 🎉 预期效果

- **灵活性**：用户可以根据需求选择不同的执行时机
- **性能**：避免立即处理大量文件，可以批量处理
- **用户体验**：清晰的图标和描述，一目了然
- **扩展性**：易于添加新的调度类型

## 📚 使用示例

### 场景1：下载文件夹 - 立即整理
- 触发模式：🚀 立即执行
- 说明：下载完成后立即整理到对应文件夹

### 场景2：临时文件夹 - 每周清理
- 触发模式：📅 定时执行
- 定时类型：每周执行
- 配置：每周日 23:00
- 说明：每周末自动清理临时文件

### 场景3：工作文件夹 - 定期整理
- 触发模式：⏱️ 定时执行
- 定时类型：间隔执行
- 配置：每2小时
- 说明：工作时间定期整理文档

### 场景4：重要文件夹 - 人工审核
- 触发模式：✋ 手动确认
- 说明：重要文件需要人工确认后再整理

