# FloatSort 快速开始

> 5 分钟快速上手 FloatSort！

## 🚀 快速安装

### Windows

```powershell
# 下载并安装
# 访问 Releases 页面下载 FloatSort_0.1.0_x64_en-US.msi
# 双击运行安装程序

# 或使用命令行（如果已下载）
.\FloatSort_0.1.0_x64_en-US.msi
```

### macOS

```bash
# 下载 DMG 文件
# 拖拽到应用程序文件夹

# 首次运行可能需要授权
# 系统偏好设置 → 安全性与隐私 → 允许
```

### Linux

```bash
# Debian/Ubuntu
sudo dpkg -i floatsort_0.1.0_amd64.deb

# 或使用 AppImage
chmod +x FloatSort_0.1.0_amd64.AppImage
./FloatSort_0.1.0_amd64.AppImage
```

## ⚡ 3 步配置

### 步骤 1：添加监控文件夹

1. 启动 FloatSort
2. 点击右侧"设置"按钮
3. 在"监控路径"区域点击"+ 添加路径"
4. 选择您的下载文件夹（例如：`C:\Users\你的用户名\Downloads`）

### 步骤 2：检查规则

应用已内置常用规则，无需额外配置：

- ✅ **图片归类**：jpg, png, gif → Pictures
- ✅ **文档归类**：pdf, doc, txt → Documents
- ✅ **视频归类**：mp4, avi, mkv → Videos
- ✅ **音频归类**：mp3, wav, flac → Music
- ✅ **压缩包归类**：zip, rar, 7z → Archives

### 步骤 3：开始监控

点击左侧"开始监控"按钮，完成！

现在，所有新下载的文件将自动整理到对应文件夹。

## 📝 示例场景

### 场景 A：整理下载文件夹

**目标**：自动分类下载的文件

```
下载文件夹
├── photo.jpg          → 自动移动到 Pictures/
├── report.pdf         → 自动移动到 Documents/
├── movie.mp4          → 自动移动到 Videos/
└── song.mp3           → 自动移动到 Music/
```

**配置**：使用默认规则即可！

### 场景 B：手动整理现有文件

**操作**：

1. 打开包含杂乱文件的文件夹
2. 选择文件并拖拽到 FloatSort 窗口
3. 文件会立即按规则整理

### 场景 C：自定义规则

**需求**：将所有包含"工作"的文件移到工作文件夹

**操作**：

1. 打开设置
2. 点击"+ 添加规则"
3. 配置规则：
   - 名称：工作文件
   - 条件：文件名包含 "工作"
   - 动作：移动到 "Work"
4. 保存设置

## 🎯 常见用例

### 用例 1：学生管理作业

```json
{
  "name": "课程作业",
  "conditions": [
    {"type": "NameContains", "pattern": "作业"}
  ],
  "action": {
    "type": "MoveTo",
    "destination": "Study/Homework"
  }
}
```

### 用例 2：摄影师管理照片

```json
{
  "name": "RAW 格式照片",
  "conditions": [
    {"type": "Extension", "values": ["raw", "cr2", "nef"]}
  ],
  "action": {
    "type": "MoveTo",
    "destination": "Photos/RAW"
  }
}
```

### 用例 3：开发者整理项目

```json
{
  "name": "源代码归档",
  "conditions": [
    {"type": "Extension", "values": ["zip", "tar.gz"]},
    {"type": "NameContains", "pattern": "source"}
  ],
  "action": {
    "type": "MoveTo",
    "destination": "Development/Archives"
  }
}
```

## ⚠️ 重要提示

### 安全建议

- ✅ 首次使用时先测试规则
- ✅ 重要文件先备份
- ⚠️ 谨慎使用"删除"动作
- ⚠️ 检查目标文件夹权限

### 性能优化

- 💡 避免监控包含大量文件的文件夹
- 💡 合理设置规则优先级
- 💡 定期清理活动日志

## 🆘 遇到问题？

### 问题：监控不工作

**解决方案**：
```
1. 检查监控路径是否正确
2. 确认应用有文件夹访问权限
3. 查看活动日志是否有错误
4. 重启应用
```

### 问题：文件去向不对

**解决方案**：
```
1. 检查规则优先级（数字越小越优先）
2. 查看活动日志了解匹配的规则
3. 调整规则条件或顺序
```

### 问题：找不到配置文件

**位置**：
- Windows: `%APPDATA%\com.floatsort.app\data\config.json`
- macOS: `~/Library/Application Support/com.floatsort.app/data/config.json`
- Linux: `~/.config/com.floatsort.app/data/config.json`

## 📖 更多资源

- 📘 [完整用户指南](docs/USER_GUIDE.md)
- 🔧 [开发文档](docs/DEVELOPMENT.md)
- 🏗️ [构建指南](docs/BUILD.md)
- 🐛 [报告问题](https://github.com/yourusername/FloatSort/issues)

## ❓ 获取帮助

- **文档**: 查看 `docs/` 目录
- **Issues**: [GitHub Issues](https://github.com/yourusername/FloatSort/issues)
- **讨论**: [GitHub Discussions](https://github.com/yourusername/FloatSort/discussions)

---

享受整洁的文件管理体验！ 🎉

