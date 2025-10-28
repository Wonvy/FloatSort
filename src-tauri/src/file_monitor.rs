use crate::config::AppConfig;
use crate::file_ops;
use crate::models::FileInfo;
use anyhow::{Context, Result};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::thread;
use tauri::Window;
use tracing::{debug, error, info, warn};

/// 文件监控器
pub struct FileMonitor {
    config: AppConfig,
    window: Window,
}

impl FileMonitor {
    /// 创建新的文件监控器
    pub fn new(config: AppConfig, window: Window) -> Result<Self, String> {
        Ok(Self { config, window })
    }

    /// 启动监控
    pub fn start(&self) -> Result<()> {
        let (tx, rx) = channel();

        // 创建监控器
        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    let _ = tx.send(event);
                }
            },
            Config::default(),
        )?;

        // 添加监控路径
        for path in &self.config.watch_paths {
            let path_buf = PathBuf::from(path);
            if path_buf.exists() {
                watcher
                    .watch(&path_buf, RecursiveMode::Recursive)
                    .with_context(|| format!("无法监控路径: {:?}", path))?;
                info!("开始监控路径: {:?}", path);
            } else {
                warn!("监控路径不存在: {:?}", path);
            }
        }

        // 克隆配置和窗口用于线程
        let config = self.config.clone();
        let window = self.window.clone();

        // 在新线程中处理事件
        thread::spawn(move || {
            for event in rx {
                Self::handle_event(event, &config, &window);
            }
        });

        Ok(())
    }

    /// 处理文件系统事件
    fn handle_event(event: Event, config: &AppConfig, window: &Window) {
        use notify::EventKind;

        debug!("收到文件事件: {:?}", event);

        match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) => {
                for path in event.paths {
                    if path.is_file() {
                        Self::process_file(path, config, window);
                    }
                }
            }
            _ => {}
        }
    }

    /// 处理单个文件
    fn process_file(path: PathBuf, config: &AppConfig, window: &Window) {
        match file_ops::get_file_info(&path) {
            Ok(file_info) => {
                info!("检测到文件: {}", file_info.name);

                // 尝试整理文件
                match file_ops::organize_file(&file_info, &config.rules) {
                    Ok(Some(new_path)) => {
                        info!("文件已整理: {} -> {}", file_info.path, new_path);
                        
                        // 发送通知到前端
                        let _ = window.emit(
                            "file-organized",
                            serde_json::json!({
                                "original_path": file_info.path,
                                "new_path": new_path,
                                "file_name": file_info.name,
                            }),
                        );
                    }
                    Ok(None) => {
                        debug!("文件未匹配任何规则: {}", file_info.name);
                    }
                    Err(e) => {
                        error!("整理文件失败: {} - {}", file_info.name, e);
                        
                        let _ = window.emit(
                            "file-error",
                            serde_json::json!({
                                "file_path": file_info.path,
                                "error": e.to_string(),
                            }),
                        );
                    }
                }
            }
            Err(e) => {
                error!("获取文件信息失败: {:?} - {}", path, e);
            }
        }
    }
}


