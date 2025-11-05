# 📚 FloatSort 内容解析器使用指南

## 🌟 功能概述

FloatSort现在支持基于**文件内容**的智能分类！不仅可以根据文件名、大小、日期分类，还可以根据：
- 📄 **PDF文本内容** - 搜索文档中的关键词
- 🖼️ **图片元数据** - 根据相机型号、ISO、分辨率等分类
- 🔍 **未来可扩展** - 支持添加更多文件格式解析器

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────┐
│         规则引擎 (Rule Engine)           │
│  ✓ 评估文件是否匹配规则                  │
│  ✓ 支持内容条件判断                      │
└───────────────┬─────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  内容解析调度器        │
    │  (Parser Registry)    │
    │  ✓ LRU缓存           │
    │  ✓ 性能优化          │
    └───────────┬───────────┘
                │
    ┌───────────▼────────────────────┐
    │   已注册的解析器                │
    ├────────────┬───────────────────┤
    │ PDF Parser │ Image Parser │ ...│
    └────────────┴───────────────────┘
```

---

## 📦 支持的文件格式

### 1. PDF文件 📄

**支持的元数据：**
- `page_count` - 页数
- `char_count` - 字符数
- `word_count` - 单词数
- `line_count` - 行数
- `file_size` - 文件大小（字节）
- `file_size_mb` - 文件大小（MB）
- `pdf_version` - PDF版本
- `title` - 文档标题
- `author` - 作者
- `subject` - 主题

**支持的操作：**
- ✅ 文本内容关键词搜索
- ✅ 元数据条件匹配

### 2. 图片文件 🖼️

**支持格式：** JPG, PNG, GIF, BMP, WEBP, TIFF

**支持的元数据：**
- `width` - 宽度（像素）
- `height` - 高度（像素）
- `megapixels` - 百万像素
- `aspect_ratio` - 宽高比
- `orientation` - 方向（横向/纵向/正方形）
- `file_size` - 文件大小
- `format` - 图片格式

**EXIF数据（如果有）：**
- `camera_make` - 相机制造商
- `camera_model` - 相机型号
- `iso` - ISO感光度
- `aperture` - 光圈值
- `shutter_speed` - 快门速度
- `focal_length` - 焦距
- `date_taken` - 拍摄日期
- `has_gps` - 是否有GPS信息
- `gps_latitude` - GPS纬度
- `gps_longitude` - GPS经度

**支持的操作：**
- ✅ 元数据条件匹配

---

## 🎯 使用示例

### 示例 1: PDF文档自动分类

**需求：** 将包含"合同"或"协议"的PDF文件移动到"合同文档"文件夹

**规则配置：**
```json
{
  "name": "合同文档分类",
  "conditions": [
    {
      "type": "Extension",
      "values": ["pdf"]
    },
    {
      "type": "ContentKeywords",
      "keywords": ["合同", "协议"],
      "match_mode": "any",
      "case_sensitive": false
    }
  ],
  "action": {
    "type": "MoveTo",
    "destination": "D:\\Documents\\合同"
  }
}
```

### 示例 2: 高分辨率照片分类

**需求：** 将分辨率超过1200万像素的照片移动到"高分辨率照片"文件夹

**规则配置：**
```json
{
  "name": "高分辨率照片",
  "conditions": [
    {
      "type": "Extension",
      "values": ["jpg", "jpeg", "png"]
    },
    {
      "type": "ContentMetadata",
      "key": "megapixels",
      "operator": "greater_than",
      "value": "12"
    }
  ],
  "action": {
    "type": "MoveTo",
    "destination": "D:\\Photos\\高分辨率"
  }
}
```

### 示例 3: Canon相机照片分类

**需求：** 将Canon相机拍摄的照片按日期分类

**规则配置：**
```json
{
  "name": "Canon照片分类",
  "conditions": [
    {
      "type": "Extension",
      "values": ["jpg", "jpeg"]
    },
    {
      "type": "ContentMetadata",
      "key": "camera_make",
      "operator": "contains",
      "value": "Canon"
    }
  ],
  "action": {
    "type": "MoveTo",
    "destination": "D:\\Photos\\Canon\\{year}-{month}"
  }
}
```

### 示例 4: 长文档分类

**需求：** 将页数超过50页的PDF文档移动到"长文档"文件夹

**规则配置：**
```json
{
  "name": "长文档分类",
  "conditions": [
    {
      "type": "Extension",
      "values": ["pdf"]
    },
    {
      "type": "ContentMetadata",
      "key": "page_count",
      "operator": "greater_than",
      "value": "50"
    }
  ],
  "action": {
    "type": "MoveTo",
    "destination": "D:\\Documents\\长文档"
  }
}
```

---

## 🧪 测试工具

我们提供了一个测试页面来验证解析器功能：

**位置：** `ui/test_parser.html`

**功能：**
1. 查看所有已注册的解析器
2. 选择文件并测试内容解析
3. 查看提取的文本和元数据
4. 验证解析性能（耗时统计）

**使用方法：**
```bash
# 在浏览器中打开
file:///D:/Code/cursor/FloatSort/ui/test_parser.html
```

---

## 🔌 Tauri API

### 1. 获取可用解析器

```javascript
const parsers = await invoke('get_available_parsers');
// 返回: [
//   { name: "PDF Parser", extensions: ["pdf"] },
//   { name: "Image EXIF Parser", extensions: ["jpg", "jpeg", "png", ...] }
// ]
```

### 2. 解析文件内容

```javascript
const result = await invoke('parse_file_content', { 
    filePath: 'C:\\Documents\\report.pdf' 
});

console.log(result);
// {
//   text: "PDF中提取的所有文本...",
//   metadata: {
//     page_count: 10,
//     char_count: 5234,
//     ...
//   },
//   parse_time_ms: 125,
//   parser_name: "PDF Parser"
// }
```

### 3. 检查是否支持解析

```javascript
const canParse = await invoke('can_parse_file', { 
    filePath: 'C:\\Documents\\file.pdf' 
});
// 返回: true 或 false
```

---

## ⚙️ 性能优化

### 1. LRU缓存

解析器使用LRU (Least Recently Used) 缓存，自动缓存最近解析的100个文件结果。

- 相同文件再次解析时直接返回缓存结果
- 文件修改后自动失效缓存
- 显著提升重复解析性能

### 2. 文件大小限制

为了性能和稳定性，设置了文件大小限制：

- **PDF文件：** 最大20MB
- **图片文件：** 最大50MB
- 超过限制的文件会返回错误

### 3. 异步处理

所有文件解析都是异步进行的，不会阻塞UI线程。

---

## 🚀 扩展指南

### 添加新的文件格式解析器

1. **创建解析器文件** `src-tauri/src/content_parser/xxx_parser.rs`

```rust
use super::{ContentParser, ParsedContent, MetadataValue};
use std::path::Path;

pub struct XxxParser;

impl ContentParser for XxxParser {
    fn name(&self) -> &str {
        "XXX Parser"
    }
    
    fn supported_extensions(&self) -> Vec<&str> {
        vec!["xxx", "yyy"]
    }
    
    fn parse(&self, file_path: &Path) -> Result<ParsedContent, String> {
        // 实现解析逻辑
        // ...
    }
}
```

2. **注册解析器** 在 `src-tauri/src/content_parser/registry.rs`

```rust
registry.register(Box::new(XxxParser::new()));
```

3. **完成！** 解析器会自动集成到系统中

---

## 📝 规则条件类型

### ContentKeywords（内容关键词）

```typescript
{
  type: "ContentKeywords",
  keywords: string[],        // 关键词列表
  match_mode: "any" | "all", // 匹配模式
  case_sensitive: boolean    // 是否区分大小写
}
```

### ContentMetadata（文件元数据）

```typescript
{
  type: "ContentMetadata",
  key: string,              // 元数据键名
  operator: "equals" |      // 运算符
            "contains" |
            "greater_than" |
            "less_than",
  value: string            // 比较值
}
```

---

## ⚠️ 注意事项

1. **文件格式支持：** 只有支持的文件格式才能使用内容条件
2. **解析耗时：** 大文件解析可能需要几秒钟
3. **缓存机制：** 文件修改后会重新解析
4. **错误处理：** 解析失败不会影响其他条件的判断

---

## 🎓 最佳实践

1. **组合条件：** 先用扩展名筛选，再用内容条件
2. **关键词选择：** 使用具有代表性的关键词
3. **性能考虑：** 避免在大量小文件上使用内容条件
4. **测试先行：** 使用测试页面验证规则效果

---

## 📞 技术支持

如有问题或建议，欢迎提Issue！

GitHub: [FloatSort Repository](https://github.com/Wonvy/FloatSort)


