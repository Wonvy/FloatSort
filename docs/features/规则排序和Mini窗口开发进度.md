# FloatSort 规则排序和Mini窗口开发进度

📅 更新日期：2025-10-28
✨ 版本：V2.3.3

---

## ✅ **已完成功能**

### 1. 规则排序UI修复 ✓

**问题**：原来的拖拽排序不够直观，且在某些情况下可能不工作。

**解决方案**：改为上下箭头按钮排序

**实现细节**：
```javascript
// 新的UI结构
<div class="rule-sort-item">
    <label class="checkbox-label">
        <input type="checkbox">
        <span>规则名称</span>
    </label>
    <div class="rule-sort-buttons">
        <button class="sort-btn" onclick="moveRuleUp(index)">▲</button>
        <button class="sort-btn" onclick="moveRuleDown(index)">▼</button>
    </div>
</div>
```

**功能**：
- ✅ 点击 ▲ 向上移动规则
- ✅ 点击 ▼ 向下移动规则
- ✅ 第一个规则的 ▲ 自动禁用
- ✅ 最后一个规则的 ▼ 自动禁用
- ✅ 移动后自动更新按钮状态
- ✅ 保存时按DOM顺序保存规则

**位置**：
- 文件：`ui/app_v2.js` (第371-425行)
- CSS：`ui/styles_minimal.css` (第542-589行)

---

### 2. 规则字母编号 ✓

**功能**：为所有规则添加字母标签（A, B, C...）

**实现**：
```javascript
function getRuleLabel(index) {
    return String.fromCharCode(65 + index); // A, B, C, ...
}
```

**显示效果**：
```
[A] 图片文件归类
[B] 文档文件归类
[C] 视频文件归类
...
```

**CSS样式**：
```css
.rule-label {
    display: inline-block;
    width: 20px;
    height: 20px;
    background: #000;
    color: #fff;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
}
```

**位置**：
- 函数：`ui/app_v2.js` (第18-20行)
- 应用：`ui/app_v2.js` (第346行，renderRules函数)
- CSS：`ui/styles_minimal.css` (第818-831行)

---

## 🚧 **进行中：Mini悬浮窗功能**

### 功能需求

1. **创建Mini悬浮窗**
   - 独立的小窗口，始终悬浮在桌面上方
   - 显示当前选中的规则

2. **滚轮切换规则**
   - 向上滚：切换到上一个规则
   - 向下滚：切换到下一个规则
   - 默认状态：显示"所有规则"

3. **规则显示**
   - 显示规则的字母编号和名称
   - 例如：`[A] 图片归类` 或 `[*] 所有规则`

4. **文件拖拽**
   - 支持拖拽文件到mini窗口
   - 根据当前选中的规则进行整理
   - 如果是"所有规则"，则尝试匹配所有规则

---

## 📋 **实现计划**

### 阶段1：后端支持 (Tauri)

#### 1.1 创建Mini窗口

**文件**：`src-tauri/src/main.rs`

```rust
// 在main函数中添加
.setup(|app| {
    // 创建主窗口
    let main_window = app.get_window("main").unwrap();
    
    // 创建mini窗口
    tauri::WindowBuilder::new(
        app,
        "mini",
        tauri::WindowUrl::App("mini.html".into())
    )
    .title("FloatSort Mini")
    .inner_size(200.0, 60.0)
    .resizable(false)
    .always_on_top(true)
    .decorations(false)  // 无边框
    .skip_taskbar(true)  // 不显示在任务栏
    .build()?;
    
    Ok(())
})
```

#### 1.2 添加规则选择命令

```rust
#[tauri::command]
async fn process_file_with_rule(
    path: String, 
    rule_id: Option<String>,  // None表示所有规则
    state: State<'_, AppState>
) -> Result<String, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    let rules_to_apply = if let Some(id) = rule_id {
        // 只使用指定规则
        config.rules.iter().filter(|r| r.id == id).cloned().collect()
    } else {
        // 使用所有规则
        config.rules.clone()
    };
    
    let result = file_ops::organize_single_file(&path, &rules_to_apply)
        .map_err(|e| e.to_string())?;
    
    Ok(result)
}
```

#### 1.3 注册新命令

```rust
.invoke_handler(tauri::generate_handler![
    // ... 其他命令
    process_file_with_rule,
])
```

---

### 阶段2：前端UI (Mini窗口)

#### 2.1 创建mini.html

**文件**：`ui/mini.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>FloatSort Mini</title>
    <link rel="stylesheet" href="mini.css">
</head>
<body>
    <div class="mini-container" id="miniWindow">
        <div class="mini-header">
            <span class="mini-icon">📂</span>
            <span class="mini-title" id="currentRule">所有规则</span>
        </div>
        <div class="mini-status" id="miniStatus">
            拖拽文件到此处
        </div>
    </div>
    <script src="mini.js"></script>
</body>
</html>
```

#### 2.2 创建mini.css

**文件**：`ui/mini.css`

```css
body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: transparent;
    overflow: hidden;
}

.mini-container {
    width: 200px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    border-radius: 8px;
    padding: 12px;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    cursor: move;  /* 可拖动 */
}

.mini-container.drag-over {
    background: rgba(0, 0, 0, 1);
    box-shadow: 0 0 0 2px #fff;
}

.mini-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.mini-icon {
    font-size: 16px;
}

.mini-title {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
}

.mini-status {
    font-size: 11px;
    color: #999;
    text-align: center;
}
```

#### 2.3 创建mini.js

**文件**：`ui/mini.js`

```javascript
let invoke, listen;
let currentRuleIndex = -1;  // -1 = 所有规则
let rules = [];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    if (window.__TAURI__) {
        invoke = window.__TAURI__.invoke;
        listen = window.__TAURI__.event.listen;
    }
    
    // 加载规则列表
    await loadRules();
    
    // 设置滚轮事件
    setupWheelHandler();
    
    // 设置拖拽事件
    setupDragDrop();
    
    // 设置窗口拖动
    setupWindowDrag();
});

// 加载规则
async function loadRules() {
    try {
        rules = await invoke('get_rules');
        updateDisplay();
    } catch (error) {
        console.error('加载规则失败:', error);
    }
}

// 滚轮切换规则
function setupWheelHandler() {
    const container = document.getElementById('miniWindow');
    
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (e.deltaY < 0) {
            // 向上滚：上一个规则
            currentRuleIndex = Math.max(-1, currentRuleIndex - 1);
        } else {
            // 向下滚：下一个规则
            currentRuleIndex = Math.min(rules.length - 1, currentRuleIndex + 1);
        }
        
        updateDisplay();
    });
}

// 更新显示
function updateDisplay() {
    const titleEl = document.getElementById('currentRule');
    
    if (currentRuleIndex === -1) {
        titleEl.textContent = '[*] 所有规则';
    } else {
        const rule = rules[currentRuleIndex];
        const label = String.fromCharCode(65 + currentRuleIndex);
        titleEl.textContent = `[${label}] ${rule.name}`;
    }
}

// 设置拖拽
function setupDragDrop() {
    const container = document.getElementById('miniWindow');
    
    // 监听Tauri文件拖拽事件
    listen('tauri://file-drop', async (event) => {
        const files = event.payload;
        await processFiles(files);
    });
    
    // 视觉反馈
    listen('tauri://file-drop-hover', () => {
        container.classList.add('drag-over');
    });
    
    listen('tauri://file-drop-cancelled', () => {
        container.classList.remove('drag-over');
    });
}

// 处理文件
async function processFiles(files) {
    const container = document.getElementById('miniWindow');
    container.classList.remove('drag-over');
    
    const statusEl = document.getElementById('miniStatus');
    statusEl.textContent = '处理中...';
    
    const ruleId = currentRuleIndex === -1 ? null : rules[currentRuleIndex].id;
    
    for (const filePath of files) {
        try {
            const result = await invoke('process_file_with_rule', {
                path: filePath,
                ruleId: ruleId
            });
            
            if (result) {
                statusEl.textContent = '✓ 已整理';
            } else {
                statusEl.textContent = '⚠ 未匹配';
            }
        } catch (error) {
            statusEl.textContent = '✗ 错误';
            console.error('处理失败:', error);
        }
    }
    
    // 2秒后恢复提示
    setTimeout(() => {
        statusEl.textContent = '拖拽文件到此处';
    }, 2000);
}

// 窗口拖动
function setupWindowDrag() {
    const { appWindow } = window.__TAURI__.window;
    const container = document.getElementById('miniWindow');
    
    container.addEventListener('mousedown', () => {
        appWindow.startDragging();
    });
}
```

---

### 阶段3：配置和集成

#### 3.1 更新tauri.conf.json

```json
{
  "tauri": {
    "windows": [
      {
        "title": "FloatSort",
        ...
      },
      {
        "title": "FloatSort Mini",
        "label": "mini",
        "url": "mini.html",
        "width": 200,
        "height": 60,
        "resizable": false,
        "fullscreen": false,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "fileDropEnabled": true
      }
    ]
  }
}
```

#### 3.2 主窗口控制Mini窗口

在主窗口中添加控制按钮：

```javascript
// ui/app.js 中添加
async function toggleMiniWindow() {
    try {
        const miniWindow = await window.__TAURI__.window.WebviewWindow.getByLabel('mini');
        
        if (miniWindow) {
            const isVisible = await miniWindow.isVisible();
            if (isVisible) {
                await miniWindow.hide();
            } else {
                await miniWindow.show();
            }
        }
    } catch (error) {
        console.error('切换Mini窗口失败:', error);
    }
}
```

---

## 🎯 **使用场景**

### 场景1：快速整理桌面文件

```
1. 打开Mini窗口（悬浮在桌面）
2. 滚轮切换到"图片归类"规则（显示 [A] 图片归类）
3. 拖拽图片文件到Mini窗口
4. 文件自动整理到Pictures文件夹
```

### 场景2：批量处理特定类型文件

```
1. 滚轮切换到"文档归类"规则（显示 [B] 文档归类）
2. 拖拽多个文档到Mini窗口
3. 所有文档按规则整理
```

### 场景3：使用所有规则

```
1. 滚轮切换到"所有规则"（显示 [*] 所有规则）
2. 拖拽各种类型的文件
3. 每个文件匹配第一个符合的规则
```

---

## 📊 **开发进度**

| 功能 | 状态 | 进度 |
|------|------|------|
| 规则排序UI | ✅ 完成 | 100% |
| 规则字母编号 | ✅ 完成 | 100% |
| 后端Mini窗口支持 | ⏳ 待开发 | 0% |
| Mini窗口UI | ⏳ 待开发 | 0% |
| 滚轮切换规则 | ⏳ 待开发 | 0% |
| 文件拖拽处理 | ⏳ 待开发 | 0% |
| 窗口拖动 | ⏳ 待开发 | 0% |

**总体进度**: 30%

---

## 🔧 **技术难点**

### 1. 多窗口管理

**挑战**：Tauri创建和管理多个窗口

**解决方案**：
- 使用 `WindowBuilder` 创建mini窗口
- 使用 `window.getByLabel('mini')` 获取窗口引用
- 使用 `show()`/`hide()` 控制显示

### 2. 窗口间通信

**挑战**：主窗口和Mini窗口需要同步规则列表

**解决方案**：
- Mini窗口启动时调用 `get_rules` 获取规则
- 使用 Tauri Events 进行窗口间通信
- 主窗口规则变化时发送事件到Mini窗口

```javascript
// 主窗口
await emit('rules-updated', { rules: appState.rules });

// Mini窗口
await listen('rules-updated', (event) => {
    rules = event.payload.rules;
    updateDisplay();
});
```

### 3. 无边框窗口拖动

**挑战**：无边框窗口无法通过标题栏拖动

**解决方案**：
- 使用 `appWindow.startDragging()` API
- 在mousedown事件中触发

---

## 🧪 **测试计划**

### 功能测试

- [ ] Mini窗口成功创建和显示
- [ ] 滚轮向上切换到上一个规则
- [ ] 滚轮向下切换到下一个规则
- [ ] 正确显示规则字母编号和名称
- [ ] 拖拽单个文件到Mini窗口成功整理
- [ ] 拖拽多个文件到Mini窗口成功批量整理
- [ ] "所有规则"模式正常工作
- [ ] 拖动Mini窗口改变位置
- [ ] 关闭主窗口时Mini窗口也关闭

### 边界测试

- [ ] 没有规则时Mini窗口显示"无规则"
- [ ] 滚轮在第一个/最后一个规则时不越界
- [ ] 拖拽不支持的文件类型显示"未匹配"
- [ ] 网络/后端异常时显示错误

---

## 📝 **下一步行动**

### 立即行动

1. ✅ **完成规则排序UI** - 已完成
2. ✅ **添加规则字母编号** - 已完成
3. ⏳ **实现后端Mini窗口支持** - 下一步
4. ⏳ **创建Mini窗口UI** - 待开发
5. ⏳ **实现滚轮切换和文件拖拽** - 待开发

### 时间估算

- 后端支持：1-2小时
- 前端UI：2-3小时
- 测试和调试：1-2小时
- **总计**：4-7小时

---

## 🎉 **当前可测试功能**

目前已完成的功能可以立即测试：

### 1. 规则排序

**测试步骤**：
1. 打开应用，进入"规则"Tab
2. 点击"添加文件夹"
3. 选择文件夹并勾选多个规则
4. 在规则列表中点击 ▲ 和 ▼ 按钮
5. 观察规则顺序变化
6. 保存后验证顺序是否保持

### 2. 规则标签

**测试步骤**：
1. 进入"规则"Tab
2. 观察每个规则名称前的字母标签
3. 验证标签从A开始依次递增

---

**当前版本已稳定，可以测试排序和标签功能！** ✓

**Mini窗口功能将在下个版本实现。** ⏳

