# Mini窗口拖拽修复

📅 修复日期：2025-10-28  
🐛 版本：V2.8.2  
🎯 修复：Mini悬浮窗口拖拽功能

---

## 🔧 **修复内容**

### **问题**
Mini悬浮窗口无法拖动位置

### **原因**
- Mini窗口没有`data-tauri-drag-region`属性
- `cursor`样式为`pointer`而不是`move`
- `mini-content`的`pointer-events: none`阻止了交互

### **修复方案**

#### **1. 添加拖拽属性**
```html
<!-- 之前 -->
<div class="mini-window" id="miniWindow">

<!-- 现在 -->
<div class="mini-window" id="miniWindow" data-tauri-drag-region>
```

#### **2. 更新CSS样式**
```css
.mini-window {
    cursor: move;           /* 之前：pointer */
    user-select: none;      /* 新增：防止拖拽时选中文本 */
}

.mini-content {
    pointer-events: auto;   /* 之前：none */
}
```

---

## 🎯 **效果**

### **之前**
- ❌ 无法拖动Mini窗口
- 🖱️ 光标显示为手型（pointer）
- 📍 窗口位置固定

### **现在**
- ✅ 可以拖动Mini窗口到任意位置
- 🖱️ 光标显示为移动图标（move）
- 📍 窗口位置灵活调整

---

## 🧪 **测试指南**

### **基础拖拽测试**
```
1. 点击最小化按钮（➖）进入Mini模式
2. 鼠标放在Mini窗口任意位置
   ✓ 光标变为移动图标（十字箭头）
3. 按住左键拖动
   ✓ 窗口跟随鼠标移动
4. 松开鼠标
   ✓ 窗口停留在新位置
```

### **功能兼容测试**
```
1. 在Mini窗口上滚动鼠标滚轮
   ✓ 可以切换规则（A/B/C...）
   
2. 在Mini窗口上右键点击
   ✓ 弹出规则选择菜单
   
3. 在Mini窗口上单击
   ✓ 退出Mini模式，返回完整界面
   
4. 拖拽文件到Mini窗口
   ✓ 根据当前规则整理文件
```

### **拖拽和点击区分测试**
```
1. 快速点击Mini窗口（不移动）
   ✓ 退出Mini模式（点击事件）
   
2. 按住鼠标并移动一小段距离
   ✓ 拖动窗口（拖拽事件）
   
3. 按住鼠标不动，停留1秒后移动
   ✓ 拖动窗口
```

---

## 💡 **技术细节**

### **Tauri拖拽机制**
- **点击 vs 拖拽**：Tauri自动区分点击和拖拽
  - 移动距离 < 5px → 点击事件
  - 移动距离 ≥ 5px → 拖拽事件

### **pointer-events说明**
```css
/* ❌ 之前：阻止所有交互 */
.mini-content {
    pointer-events: none;
}

/* ✅ 现在：允许交互 */
.mini-content {
    pointer-events: auto;
}
```

**为什么改为auto？**
- `none`会阻止所有鼠标事件，包括拖拽
- `auto`允许正常的鼠标交互
- 拖拽属性在父元素上，不会冲突

### **user-select: none**
```css
.mini-window {
    user-select: none;  /* 防止拖拽时选中文本 */
}
```

---

## 🎨 **视觉反馈**

### **光标变化**
| 状态 | 光标 | 说明 |
|-----|------|------|
| **悬停** | move（十字箭头）| 提示可拖动 |
| **拖动中** | move | 跟随移动 |
| **点击** | pointer | 快速点击时 |

### **拖拽提示**
- Mini窗口背景：黑色半透明 (rgba(0, 0, 0, 0.95))
- 拖拽文件悬停：边框高亮（2px白色）

---

## 📊 **修改文件**

| 文件 | 修改内容 | 行数 |
|-----|---------|------|
| **ui/index_v2.html** | 添加`data-tauri-drag-region` | +1 |
| **ui/styles_minimal.css** | 更新`.mini-window`样式 | ~5 |
| **ui/styles_minimal.css** | 更新`.mini-content`样式 | ~1 |

---

## ✅ **测试清单**

- [x] Mini窗口可以拖动
- [x] 拖动光标为move图标
- [x] 滚轮切换规则正常
- [x] 右键菜单正常
- [x] 单击退出Mini模式正常
- [x] 拖拽文件到Mini窗口正常
- [x] 不会选中窗口内文本

---

## 🎯 **总结**

**修复前**：
- ❌ Mini窗口位置固定，无法调整

**修复后**：
- ✅ Mini窗口可以自由拖动
- ✅ 所有功能保持正常
- ✅ 更好的用户体验

**关键改动**：
1. 添加`data-tauri-drag-region`属性
2. 改变`cursor`为`move`
3. 设置`pointer-events: auto`
4. 添加`user-select: none`

---

**现在Mini窗口既可以拖动，又保留了所有交互功能！** 🎉

