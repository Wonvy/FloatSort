# GitHub Actions 自动构建指南

## 📋 概述

本项目配置了 GitHub Actions 自动构建工作流，可以同时构建 **Windows** 和 **macOS** 版本的安装包。

## 🚀 使用方法

### **方法 1：通过创建 Tag 触发（推荐）**

这是最常用的方式，适合发布新版本时使用。

#### 步骤：

1. **确保所有更改已提交并推送到 GitHub**
   ```powershell
   git add .
   git commit -m "准备发布 v0.1.0"
   git push origin main
   ```

2. **创建并推送 Tag**
   ```powershell
   # 创建 tag（版本号格式：v0.1.0）
   git tag v0.1.0
   
   # 推送 tag 到 GitHub
   git push origin v0.1.0
   ```

3. **查看构建进度**
   - 访问您的 GitHub 仓库
   - 点击顶部的 **Actions** 标签
   - 您会看到新的工作流运行
   - 点击进入可以查看实时构建日志

4. **下载构建产物**
   - 构建完成后，点击工作流运行详情
   - 在页面底部找到 **Artifacts** 部分
   - 下载 `floatsort-windows` 和 `floatsort-macos`

5. **发布 Release（可选）**
   - 如果使用了 tag，会自动创建一个 **Draft Release**
   - 访问仓库的 **Releases** 页面
   - 编辑草稿 Release，然后点击 **Publish release**

---

### **方法 2：手动触发构建**

适合测试或不想创建 tag 的情况。

#### 步骤：

1. **访问 GitHub Actions 页面**
   - 打开您的 GitHub 仓库
   - 点击顶部的 **Actions** 标签

2. **选择工作流**
   - 在左侧找到 **Build and Release** 工作流
   - 点击它

3. **手动运行**
   - 点击右上角的 **Run workflow** 按钮
   - 选择分支（通常是 `main`）
   - 点击绿色的 **Run workflow** 按钮

4. **下载构建产物**
   - 等待构建完成（约 10-20 分钟）
   - 在工作流运行详情页面底部下载 Artifacts

---

## 📦 构建产物说明

### **Windows 版本** (`floatsort-windows`)
- `FloatSort_0.1.0_x64_zh-CN.msi` - Windows Installer 安装包
- `FloatSort_0.1.0_x64-setup.exe` - NSIS 安装程序（推荐）

### **macOS 版本** (`floatsort-macos`)
- `FloatSort.dmg` - macOS 磁盘镜像文件
- `FloatSort.app` - macOS 应用程序包

---

## 🔧 修改版本号

在发布新版本前，需要同步修改版本号：

1. **修改 `src-tauri/Cargo.toml`**
   ```toml
   [package]
   version = "0.1.0"  # 改为新版本号
   ```

2. **修改 `src-tauri/tauri.conf.json`**
   ```json
   {
     "package": {
       "version": "0.1.0"  # 改为新版本号
     }
   }
   ```

3. **提交更改并创建对应的 tag**
   ```powershell
   git add .
   git commit -m "Bump version to 0.2.0"
   git push origin main
   git tag v0.2.0
   git push origin v0.2.0
   ```

---

## ⏱️ 构建时间

- **Windows 构建**: 约 5-10 分钟
- **macOS 构建**: 约 10-15 分钟
- **总计**: 约 15-20 分钟

构建是并行进行的，所以总时间取决于较慢的那个平台。

---

## 🐛 常见问题

### 1. 构建失败怎么办？

- 点击失败的工作流，查看详细日志
- 常见原因：
  - Rust 编译错误 → 检查代码
  - 依赖问题 → 检查 `Cargo.toml`
  - 配置错误 → 检查 `tauri.conf.json`

### 2. 如何删除 Tag？

如果创建错误的 tag：
```powershell
# 删除本地 tag
git tag -d v0.1.0

# 删除远程 tag
git push origin --delete v0.1.0
```

### 3. 如何只构建一个平台？

编辑 `.github/workflows/build.yml`，修改 `matrix.platform`：
```yaml
# 只构建 Windows
platform: [windows-latest]

# 只构建 macOS
platform: [macos-latest]
```

---

## 📝 快速命令参考

```powershell
# 发布新版本的完整流程
git add .
git commit -m "Release v0.1.0"
git push origin main
git tag v0.1.0
git push origin v0.1.0

# 查看所有 tags
git tag -l

# 删除 tag
git tag -d v0.1.0                    # 删除本地
git push origin --delete v0.1.0      # 删除远程
```

---

## ✅ 验证工作流配置

提交工作流文件后，可以通过手动触发来验证配置是否正确：

1. 提交并推送 `.github/workflows/build.yml`
2. 访问 GitHub Actions
3. 手动运行一次工作流
4. 检查是否成功生成两个平台的安装包

---

## 🎉 完成！

现在您可以通过 GitHub Actions 自动构建跨平台安装包了！

