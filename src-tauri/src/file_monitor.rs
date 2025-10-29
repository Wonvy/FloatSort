use crate::config::AppConfig;
use crate::file_ops;
use crate::models::{FileInfo, Rule};
use crate::rule_engine::RuleEngine;
use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::Window;
use tracing::{debug, error, info, warn};

/// 文件监控器
pub struct FileMonitor {
    _watcher: Arc<Mutex<RecommendedWatcher>>, // 保持 watcher 存活
}

impl FileMonitor {
    /// 创建新的文件监控器并启动
    pub fn new(config: AppConfig, window: Window) -> Result<Self, String> {
        let (tx, rx) = channel();

        // 创建监控器
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        ).map_err(|e| e.to_string())?;

        // 添加监控路径（非递归，只监控根目录文件）- 仅监控已启用的文件夹
        let enabled_folders: Vec<_> = config.folders.iter().filter(|f| f.enabled).collect();
        if enabled_folders.is_empty() {
            return Err("没有已启用的监控文件夹".to_string());
        }
        
        for folder in &enabled_folders {
            let path_buf = PathBuf::from(&folder.path);
            if path_buf.exists() {
                watcher
                    .watch(&path_buf, RecursiveMode::NonRecursive) // ✅ 改为非递归
                    .map_err(|e| format!("无法监控路径 {:?}: {}", folder.path, e))?;
                info!("开始监控路径（仅根目录文件）: {} ({})", folder.name, folder.path);
            } else {
                warn!("监控路径不存在: {} ({})", folder.name, folder.path);
            }
        }

        // 克隆配置和窗口用于线程
        let config_clone = config.clone();
        let window_clone = window.clone();

        // 在新线程中处理事件
        thread::spawn(move || {
            info!("文件监控线程已启动");
            for event in rx {
                Self::handle_event(event, &config_clone, &window_clone);
            }
            info!("文件监控线程已结束");
        });

        Ok(Self {
            _watcher: Arc::new(Mutex::new(watcher)),
        })
    }

    /// 处理文件系统事件
    fn handle_event(event: Event, config: &AppConfig, window: &Window) {
        use notify::EventKind;

        info!("收到文件事件: {:?}", event.kind);

        match event.kind {
            EventKind::Create(_) => {
                for path in &event.paths {
                    info!("检测到文件创建: {:?}", path);
                    if path.is_file() {
                        // 等待文件写入完成（避免处理正在写入的文件）
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        Self::process_file(path.clone(), config, window);
                    } else {
                        info!("跳过目录: {:?}", path);
                    }
                }
            }
            EventKind::Modify(_) => {
                for path in &event.paths {
                    info!("检测到文件修改: {:?}", path);
                    if path.is_file() {
                        // 等待文件写入完成
                        std::thread::sleep(std::time::Duration::from_millis(500));
                        Self::process_file(path.clone(), config, window);
                    }
                }
            }
            _ => {
                debug!("忽略事件类型: {:?}", event.kind);
            }
        }
    }

    /// 处理单个文件
    fn process_file(path: PathBuf, config: &AppConfig, window: &Window) {
        info!("开始处理文件: {:?}", path);
        
        // 发送文件检测事件到前端
        let _ = window.emit(
            "file-detected",
            serde_json::json!({
                "file_path": path.to_string_lossy().to_string(),
            }),
        );
        
        match file_ops::get_file_info(&path) {
            Ok(file_info) => {
                info!("✓ 获取文件信息成功: {} ({})", file_info.name, file_info.extension);

                // 根据文件路径找到对应的文件夹配置
                let folder = config.folders.iter()
                    .filter(|f| f.enabled)
                    .find(|f| path.starts_with(&f.path));
                
                if let Some(folder) = folder {
                    // 获取该文件夹关联的规则
                    let applicable_rules: Vec<Rule> = config.rules.iter()
                        .filter(|r| folder.rule_ids.contains(&r.id))
                        .cloned()
                        .collect();
                    
                    info!("文件夹 '{}' 应用 {} 条规则", folder.name, applicable_rules.len());
                    
                    // 尝试整理文件（使用文件夹路径作为基础路径）
                    match Self::organize_file_with_base(&file_info, &applicable_rules, &folder.path) {
                        Ok(Some(new_path)) => {
                            info!("✓ 文件已整理: {} -> {}", file_info.path, new_path);
                            
                            // 发送通知到前端
                            let _ = window.emit(
                                "file-organized",
                                serde_json::json!({
                                    "original_path": file_info.path,
                                    "new_path": new_path.clone(),
                                    "file_name": file_info.name.clone(),
                                }),
                            );
                        }
                        Ok(None) => {
                            info!("○ 文件未匹配任何规则: {}", file_info.name);
                            
                            // 发送未匹配通知到前端
                            let _ = window.emit(
                                "file-no-match",
                                serde_json::json!({
                                    "file_name": file_info.name,
                                    "file_path": file_info.path,
                                }),
                            );
                        }
                        Err(e) => {
                            error!("✗ 整理文件失败: {} - {}", file_info.name, e);
                            
                            let _ = window.emit(
                                "file-error",
                                serde_json::json!({
                                    "file_path": file_info.path,
                                    "file_name": file_info.name,
                                    "error": e.to_string(),
                                }),
                            );
                        }
                    }
                } else {
                    warn!("文件 {} 不属于任何已启用的监控文件夹", file_info.name);
                }
            }
            Err(e) => {
                error!("✗ 获取文件信息失败: {:?} - {}", path, e);
                
                let _ = window.emit(
                    "file-error",
                    serde_json::json!({
                        "file_path": path.to_string_lossy().to_string(),
                        "error": format!("获取文件信息失败: {}", e),
                    }),
                );
            }
        }
    }
    
    /// 使用指定的基础路径整理文件
    fn organize_file_with_base(file_info: &FileInfo, rules: &[Rule], base_path: &str) -> Result<Option<String>> {
        use std::fs;
        
        let engine = RuleEngine::new(rules.to_vec());
        
        // 查找匹配的规则
        if let Some(rule) = engine.find_matching_rule(file_info) {
            info!("应用规则 '{}' 到文件 {}", rule.name, file_info.name);
            
            // 使用监控根目录作为基础路径
            let base = Path::new(base_path);
            
            if let Some(dest_folder) = engine.get_destination_path(&rule.action, file_info, base) {
                let source = Path::new(&file_info.path);
                let dest_dir = PathBuf::from(&dest_folder);
                
                // 创建目标目录
                fs::create_dir_all(&dest_dir)?;
                
                // 构建完整目标路径
                let file_name = source.file_name()
                    .ok_or_else(|| anyhow::anyhow!("无法获取文件名"))?;
                let final_dest = dest_dir.join(file_name);
                
                // 移动文件（尝试重命名，失败则复制+删除）
                if let Err(_) = fs::rename(source, &final_dest) {
                    // 跨分区移动：复制后删除
                    fs::copy(source, &final_dest)?;
                    fs::remove_file(source)?;
                }
                
                let final_dest_str = final_dest.to_string_lossy().to_string();
                info!("文件已移动: {:?} -> {}", source, final_dest_str);
                
                Ok(Some(final_dest_str))
            } else {
                Ok(None)
            }
        } else {
            Ok(None)
        }
    }
}



