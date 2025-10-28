# 贡献指南

感谢您对 FloatSort 项目的关注！我们欢迎任何形式的贡献。

## 🤝 贡献方式

### 报告 Bug

如果您发现了 bug，请：

1. 在 [Issues](https://github.com/yourusername/FloatSort/issues) 中搜索，确认问题未被报告
2. 创建新 Issue，包含：
   - 清晰的标题
   - 详细的问题描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 系统信息（操作系统、版本等）
   - 相关日志或截图

### 功能建议

欢迎提出新功能建议：

1. 在 [Discussions](https://github.com/yourusername/FloatSort/discussions) 中讨论
2. 说明功能的使用场景和价值
3. 如果可能，提供设计方案或草图

### 提交代码

#### 准备工作

1. **Fork 项目**
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```

2. **克隆仓库**
   ```bash
   git clone https://github.com/你的用户名/FloatSort.git
   cd FloatSort
   ```

3. **创建分支**
   ```bash
   git checkout -b feature/amazing-feature
   # 或
   git checkout -b fix/bug-description
   ```

4. **安装依赖**
   ```bash
   # 确保已安装 Rust
   rustup update
   ```

#### 开发流程

1. **编写代码**
   - 遵循项目代码风格
   - 添加必要的注释
   - 编写单元测试

2. **运行测试**
   ```bash
   # 运行测试
   cargo test
   
   # 代码格式化
   cargo fmt
   
   # 代码检查
   cargo clippy -- -D warnings
   ```

3. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加某功能"
   ```

   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 代码重构
   - `test:` 测试相关
   - `chore:` 构建/工具相关

4. **推送到 GitHub**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 关联相关 Issue
   - 等待代码审查

## 📋 代码规范

### Rust 代码

- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 检查代码质量
- 遵循 [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- 为公共 API 编写文档注释
- 保持函数简短，职责单一

**示例**：
```rust
/// 获取文件信息
///
/// # Arguments
///
/// * `path` - 文件路径
///
/// # Returns
///
/// 返回 `FileInfo` 结构体
///
/// # Errors
///
/// 如果文件不存在或无法读取，返回错误
pub fn get_file_info(path: &Path) -> Result<FileInfo> {
    // 实现
}
```

### JavaScript 代码

- 使用现代 ES6+ 语法
- 使用 `const` 和 `let`，避免 `var`
- 函数和变量使用驼峰命名
- 添加适当的注释
- 保持一致的代码风格

**示例**：
```javascript
/**
 * 加载配置文件
 * @returns {Promise<AppConfig>} 配置对象
 */
async function loadConfig() {
    try {
        const config = await invoke('get_config');
        return config;
    } catch (error) {
        console.error('加载配置失败:', error);
        throw error;
    }
}
```

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<类型>(<范围>): <描述>

[可选的详细说明]

[可选的脚注]
```

**示例**：
```
feat(rule-engine): 添加正则表达式条件支持

- 实现 NameRegex 条件类型
- 添加正则表达式编译缓存
- 更新文档

Closes #123
```

## 🧪 测试

### 编写测试

为新功能或 bug 修复添加测试：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_matching() {
        let rule = create_test_rule();
        let file_info = create_test_file();
        assert!(matches_rule(&file_info, &rule));
    }
}
```

### 运行测试

```bash
# 运行所有测试
cargo test

# 运行特定测试
cargo test test_extension_matching

# 显示详细输出
cargo test -- --nocapture
```

## 📚 文档

### 更新文档

如果您的更改影响用户或开发者，请更新相应文档：

- `README.md` - 项目概览
- `docs/USER_GUIDE.md` - 用户指南
- `docs/DEVELOPMENT.md` - 开发文档
- `docs/BUILD.md` - 构建指南
- 代码注释

### 文档风格

- 使用清晰、简洁的语言
- 提供代码示例
- 添加截图（如适用）
- 保持中文文档的通顺

## 🔍 代码审查

所有 PR 都需要经过代码审查：

### 审查者关注点

- 代码质量和可读性
- 测试覆盖率
- 性能影响
- 安全性
- 文档完整性

### 作者响应

- 及时回复审查意见
- 虚心接受建议
- 解释设计决策
- 更新代码并推送

## 🎯 优先级

当前优先级较高的任务：

1. ✅ 完善规则编辑器 UI
2. ✅ 添加更多文件条件类型
3. ✅ 实现统计和报表功能
4. ✅ 支持规则导入/导出
5. ✅ 优化性能和内存占用

查看 [Issues](https://github.com/yourusername/FloatSort/issues) 了解更多。

## 💡 开发提示

### 调试技巧

```bash
# 启用详细日志
RUST_LOG=debug cargo tauri dev

# 特定模块日志
RUST_LOG=floatsort::rule_engine=trace cargo tauri dev
```

### 性能分析

```bash
# 安装 flamegraph
cargo install flamegraph

# 生成性能分析图
cargo flamegraph
```

### 常用命令

```bash
# 格式化所有代码
cargo fmt --all

# 检查代码（不编译）
cargo check

# 运行 clippy
cargo clippy --all-targets --all-features

# 更新依赖
cargo update

# 清理构建缓存
cargo clean
```

## 🌍 国际化

如果您想添加其他语言支持：

1. 创建语言文件（如 `i18n/en.json`）
2. 实现语言切换逻辑
3. 更新相关文档

## 📞 联系方式

- GitHub Issues: [问题追踪](https://github.com/yourusername/FloatSort/issues)
- Discussions: [讨论区](https://github.com/yourusername/FloatSort/discussions)
- Email: dev@floatsort.example.com

## 📄 许可证

贡献的代码将采用与项目相同的 MIT 许可证。

---

再次感谢您的贡献！🎉

