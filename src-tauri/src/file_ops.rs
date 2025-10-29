use crate::models::{FileInfo, Rule, RuleAction};
use crate::rule_engine::RuleEngine;
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
    })
}

/// 整理文件（根据规则）
pub fn organize_file(file_info: &FileInfo, rules: &[Rule]) -> Result<Option<String>> {
    let engine = RuleEngine::new(rules.to_vec());

    // 查找匹配的规则
    let rule = match engine.find_matching_rule(file_info) {
        Some(r) => r,
        None => return Ok(None),
    };

    info!("应用规则 '{}' 到文件 {}", rule.name, file_info.name);

    // 执行规则动作
    execute_action(&rule.action, file_info, &engine)
}

/// 手动整理单个文件
pub fn organize_single_file(file_path: &str, rules: &[Rule]) -> Result<String> {
    let path = Path::new(file_path);
    let file_info = get_file_info(path)?;

    match organize_file(&file_info, rules)? {
        Some(new_path) => Ok(new_path),
        None => Ok("文件未匹配任何规则".to_string()),
    }
}

/// 执行规则动作
fn execute_action(action: &RuleAction, file_info: &FileInfo, engine: &RuleEngine) -> Result<Option<String>> {
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
                    .get_destination_path(action, file_info, base_path)
                    .context("无法获取目标路径")?;
                
                move_file(source_path, &dest_path)?;
                Ok(Some(dest_path))
            }
        }

        RuleAction::CopyTo { destination: _ } => {
            let dest_path = engine
                .get_destination_path(action, file_info, base_path)
                .context("无法获取目标路径")?;
            
            copy_file(source_path, &dest_path)?;
            Ok(Some(dest_path))
        }

        RuleAction::Rename { pattern: _ } => {
            let new_path = engine
                .get_destination_path(action, file_info, base_path)
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

/// 移动文件
fn move_file(source: &Path, dest_dir: &str) -> Result<()> {
    let dest_path = PathBuf::from(dest_dir);
    
    // 创建目标目录
    fs::create_dir_all(&dest_path)
        .with_context(|| format!("创建目录失败: {:?}", dest_path))?;

    // 获取文件名
    let file_name = source
        .file_name()
        .context("无法获取文件名")?;

    let final_dest = dest_path.join(file_name);

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

/// 复制文件
fn copy_file(source: &Path, dest_dir: &str) -> Result<()> {
    let dest_path = PathBuf::from(dest_dir);
    
    // 创建目标目录
    fs::create_dir_all(&dest_path)
        .with_context(|| format!("创建目录失败: {:?}", dest_path))?;

    // 获取文件名
    let file_name = source
        .file_name()
        .context("无法获取文件名")?;

    let final_dest = dest_path.join(file_name);

    // 复制文件
    fs::copy(source, &final_dest)
        .with_context(|| format!("复制文件失败: {:?} -> {:?}", source, final_dest))?;

    info!("文件已复制: {:?} -> {:?}", source, final_dest);
    Ok(())
}


