# Mac 安装指南

## ⚠️ "无法验证开发者" 问题解决

Mac系统默认会阻止未经Apple认证的应用，这是正常的安全机制。

### 解决步骤

#### 方法1：右键打开（推荐）

1. 找到下载的 `FloatSort.app`
2. **按住 Control 键点击**应用图标（或右键点击）
3. 选择 "**打开**"
4. 在弹出的对话框中再次点击 "**打开**"

✅ 之后就可以正常双击打开了

#### 方法2：系统设置允许

1. 双击应用（会被阻止）
2. 打开 "**系统设置**" → "**隐私与安全性**"
3. 在 "安全性" 部分找到：
   ```
   "FloatSort.app"已被阻止使用
   ```
4. 点击 "**仍要打开**" 按钮

#### 方法3：终端命令（高级用户）

```bash
# 进入应用所在目录
cd ~/Downloads  # 或应用实际位置

# 移除隔离属性
xattr -cr FloatSort.app

# 如果还不行，尝试
sudo xattr -rd com.apple.quarantine FloatSort.app
```

## 🔐 为什么会出现这个提示？

- FloatSort 是开源软件，目前未购买Apple开发者账号进行代码签名（$99/年）
- 这**不代表软件不安全**，你可以查看完整的[源代码](https://github.com/Wonvy/FloatSort)
- 软件完全在本地运行，不会收集或上传任何数据

## 💡 其他注意事项

### 系统要求
- macOS 11.0 (Big Sur) 或更高版本
- 支持 Intel 和 Apple Silicon (M1/M2/M3) 芯片

### 首次运行
- 可能需要授予文件访问权限
- 可能需要授予辅助功能权限（用于窗口管理）

### 卸载
直接将应用拖到废纸篓即可。

配置文件位置：
```
~/Library/Application Support/FloatSort/
```

## 📮 遇到问题？

如果以上方法都无法解决，请访问：
- [GitHub Issues](https://github.com/Wonvy/FloatSort/issues)
- [项目文档](https://github.com/Wonvy/FloatSort/tree/main/docs)

## 🔒 安全性说明

FloatSort 是开源软件，你可以：
- 查看[完整源代码](https://github.com/Wonvy/FloatSort)
- [自行编译](docs/BUILD.md)构建应用
- 审查代码确认安全性

我们不会：
- ❌ 收集用户数据
- ❌ 连接外部服务器
- ❌ 访问不必要的系统权限

所有文件整理操作都在本地完成。





