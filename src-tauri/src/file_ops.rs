use crate::models::{ConflictStrategy, FileInfo, Rule, RuleAction};
use crate::rule_engine::RuleEngine;
use crate::activity_log;
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;

/// 获取文件信息
pub fn get_file_info(path: &Path) -> Result<FileInfo> {
    let metadata = fs::metadata(path)
        .with_context(|| format!("无法读取文件元数据: {:?}", path))?;

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("")
        .to_string();

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();

    let created_at = metadata.created().ok().map(|t| {
        let st: std::time::SystemTime = t;
        DateTime::<Utc>::from(st)
    });

    let modified_at = metadata.modified().ok().map(|t| {
        let st: std::time::SystemTime = t;
        DateTime::<Utc>::from(st)
    });

    Ok(FileInfo {
        path: path.to_string_lossy().to_string(),
        name,
        extension,
        size: metadata.len(),
        created_at,
        modified_at,
        is_directory: metadata.is_dir(),
    })
}

/// 整理文件（根据规则）
pub fn organize_file(file_info: &FileInfo, rules: &[Rule]) -> Result<Option<String>> {
    let engine = RuleEngine::new(rules.to_vec());

    // 查找匹配的规则（获取匹配结果，包含正则捕获组）
    let rule_match = match engine.find_matching_rule(file_info) {
        Some(m) => m,
        None => return Ok(None),
    };

    info!("应用规则 '{}' 到文件 {}", rule_match.rule.name, file_info.name);

    // 执行规则动作，传递冲突处理策略和正则捕获组
    let result = execute_action(&rule_match.rule.action, file_info, &engine, &rule_match.rule.conflict_strategy, &rule_match.regex_captures);
    
    // 记录文件操作日志
    match &result {
        Ok(Some(dest)) => {
            let _ = activity_log::log_file_operation(
                "移动文件",
                &file_info.path,
                Some(dest),
                Some(&rule_match.rule.name),
                true,
                None,
            );
        }
        Ok(None) => {}
        Err(e) => {
            let _ = activity_log::log_file_operation(
                "移动文件",
                &file_info.path,
                None,
                Some(&rule_match.rule.name),
                false,
                Some(&e.to_string()),
            );
        }
    }
    
    result
}

/// 手动整理单个文件
pub fn organize_single_file(file_path: &str, rules: &[Rule]) -> Result<String> {
    let path = Path::new(file_path);
    let file_info = get_file_info(path)?;

    info!("正在检查文件是否匹配规则: {}", file_path);
    
    match organize_file(&file_info, rules)? {
        Some(new_path) => {
            info!("✓ 文件已整理: {} -> {}", file_path, new_path);
            Ok(new_path)
        },
        None => {
            info!("⚠️ 文件未匹配任何规则，跳过: {}", file_path);
            Ok("文件未匹配任何规则".to_string())
        },
    }
}

/// 执行规则动作
fn execute_action(action: &RuleAction, file_info: &FileInfo, engine: &RuleEngine, conflict_strategy: &ConflictStrategy, regex_captures: &[String]) -> Result<Option<String>> {
    let source_path = Path::new(&file_info.path);
    let base_path = source_path.parent().unwrap_or(Path::new("."));

    match action {
        RuleAction::MoveTo { destination } => {
            // 检查是否为回收站特殊路径
            if destination == "{recycle}" {
                move_to_recycle_bin(source_path)?;
                Ok(Some("已移动到回收站".to_string()))
            } else {
                let dest_path = engine
                    .get_destination_path(action, file_info, base_path, regex_captures)
                    .context("无法获取目标路径")?;
                
                move_file_with_strategy(source_path, &dest_path, conflict_strategy)?;
                Ok(Some(dest_path))
            }
        }

        RuleAction::CopyTo { destination: _ } => {
            let dest_path = engine
                .get_destination_path(action, file_info, base_path, regex_captures)
                .context("无法获取目标路径")?;
            
            copy_file_with_strategy(source_path, &dest_path, conflict_strategy)?;
            Ok(Some(dest_path))
        }

        RuleAction::Rename { pattern: _ } => {
            let new_path = engine
                .get_destination_path(action, file_info, base_path, regex_captures)
                .context("无法获取新文件名")?;
            
            fs::rename(source_path, &new_path)
                .with_context(|| format!("重命名文件失败: {:?} -> {}", source_path, new_path))?;
            
            info!("文件已重命名: {:?} -> {}", source_path, new_path);
            Ok(Some(new_path))
        }

        RuleAction::Delete => {
            fs::remove_file(source_path)
                .with_context(|| format!("删除文件失败: {:?}", source_path))?;
            
            info!("文件已删除: {:?}", source_path);
            Ok(Some("已删除".to_string()))
        }
    }
}

/// 移动文件到回收站
fn move_to_recycle_bin(source: &Path) -> Result<()> {
    trash::delete(source)
        .with_context(|| format!("移动文件到回收站失败: {:?}", source))?;
    
    info!("文件已移动到回收站: {:?}", source);
    Ok(())
}

/// 根据冲突策略移动文件
fn move_file_with_strategy(source: &Path, dest_dir: &str, strategy: &ConflictStrategy) -> Result<()> {
    let dest_path = PathBuf::from(dest_dir);
    
    // 创建目标目录
    fs::create_dir_all(&dest_path)
        .with_context(|| format!("创建目录失败: {:?}", dest_path))?;

    // 获取文件名
    let file_name = source
        .file_name()
        .context("无法获取文件名")?;

    let mut final_dest = dest_path.join(file_name);

    // 检查文件是否已存在
    if final_dest.exists() {
        match strategy {
            ConflictStrategy::Skip => {
                info!("目标文件已存在，跳过: {:?}", final_dest);
                return Ok(());
            }
            ConflictStrategy::Overwrite => {
                info!("目标文件已存在，将覆盖: {:?}", final_dest);
                // 继续执行，会覆盖
            }
            ConflictStrategy::Rename => {
                // 生成副本文件名
                final_dest = generate_copy_name(&final_dest)?;
                info!("目标文件已存在，重命名为: {:?}", final_dest);
            }
        }
    }

    // 移动文件
    fs::rename(source, &final_dest)
        .or_else(|_| -> Result<()> {
            // 如果跨分区移动失败，则先复制再删除
            fs::copy(source, &final_dest)?;
            fs::remove_file(source)?;
            Ok(())
        })
        .with_context(|| format!("移动文件失败: {:?} -> {:?}", source, final_dest))?;

    info!("文件已移动: {:?} -> {:?}", source, final_dest);
    Ok(())
}

/// 根据冲突策略复制文件
fn copy_file_with_strategy(source: &Path, dest_dir: &str, strategy: &ConflictStrategy) -> Result<()> {
    let dest_path = PathBuf::from(dest_dir);
    
    // 创建目标目录
    fs::create_dir_all(&dest_path)
        .with_context(|| format!("创建目录失败: {:?}", dest_path))?;

    // 获取文件名
    let file_name = source
        .file_name()
        .context("无法获取文件名")?;

    let mut final_dest = dest_path.join(file_name);

    // 检查文件是否已存在
    if final_dest.exists() {
        match strategy {
            ConflictStrategy::Skip => {
                info!("目标文件已存在，跳过: {:?}", final_dest);
                return Ok(());
            }
            ConflictStrategy::Overwrite => {
                info!("目标文件已存在，将覆盖: {:?}", final_dest);
                // 继续执行，会覆盖
            }
            ConflictStrategy::Rename => {
                // 生成副本文件名
                final_dest = generate_copy_name(&final_dest)?;
                info!("目标文件已存在，重命名为: {:?}", final_dest);
            }
        }
    }

    // 复制文件
    fs::copy(source, &final_dest)
        .with_context(|| format!("复制文件失败: {:?} -> {:?}", source, final_dest))?;

    info!("文件已复制: {:?} -> {:?}", source, final_dest);
    Ok(())
}

/// 生成副本文件名（例如：file.txt -> file (副本).txt，file (副本).txt -> file (副本 2).txt）
fn generate_copy_name(path: &Path) -> Result<PathBuf> {
    let parent = path.parent().context("无法获取父目录")?;
    let stem = path.file_stem()
        .and_then(|s| s.to_str())
        .context("无法获取文件名")?;
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    // 尝试找到可用的副本文件名
    for i in 1..1000 {
        let new_name = if i == 1 {
            if extension.is_empty() {
                format!("{} (副本)", stem)
            } else {
                format!("{} (副本).{}", stem, extension)
            }
        } else {
            if extension.is_empty() {
                format!("{} (副本 {})", stem, i)
            } else {
                format!("{} (副本 {}).{}", stem, i, extension)
            }
        };

        let new_path = parent.join(&new_name);
        if !new_path.exists() {
            return Ok(new_path);
        }
    }

    anyhow::bail!("无法生成可用的副本文件名")
}


