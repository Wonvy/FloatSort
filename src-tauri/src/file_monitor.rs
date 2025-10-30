use crate::config::AppConfig;
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

        // 克隆配置和窗口用于初始扫描
        let config_for_scan = config.clone();
        let window_for_scan = window.clone();
        
        // 在启动监控后，对已存在的文件进行初始扫描
        thread::spawn(move || {
            info!("开始对监控文件夹进行初始扫描...");
            Self::scan_existing_files(&config_for_scan, &window_for_scan);
            info!("初始扫描完成");
        });

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
    
    /// 扫描监控文件夹中已存在的文件
    fn scan_existing_files(config: &AppConfig, window: &Window) {
        use std::fs;
        
        // 获取所有已启用的文件夹
        let enabled_folders: Vec<_> = config.folders.iter().filter(|f| f.enabled).collect();
        
        for folder in enabled_folders {
            let path = Path::new(&folder.path);
            if !path.exists() || !path.is_dir() {
                warn!("文件夹不存在或不是目录: {}", folder.path);
                continue;
            }
            
            info!("扫描文件夹: {} ({})", folder.name, folder.path);
            
            // 读取文件夹中的所有文件（非递归）
            match fs::read_dir(path) {
                Ok(entries) => {
                    let mut file_count = 0;
                    for entry in entries {
                        if let Ok(entry) = entry {
                            let entry_path = entry.path();
                            
                            // 只处理文件，忽略目录
                            if entry_path.is_file() {
                                file_count += 1;
                                info!("发现文件: {:?}", entry_path);
                                
                                // 等待一小段时间，避免太快
                                std::thread::sleep(std::time::Duration::from_millis(100));
                                
                                // 处理文件
                                Self::process_file(entry_path, config, window);
                            }
                        }
                    }
                    info!("文件夹 '{}' 扫描完成，共 {} 个文件", folder.name, file_count);
                }
                Err(e) => {
                    error!("读取文件夹 '{}' 失败: {}", folder.path, e);
                }
            }
        }
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

    /// 处理单个文件 - 只检测并通知前端，由前端决定是否整理
    fn process_file(path: PathBuf, _config: &AppConfig, window: &Window) {
        info!("检测到文件: {:?}", path);
        
        // 只发送文件检测事件到前端，由前端决定是否整理
        // 前端会根据批量阈值来决定是自动整理还是显示确认窗口
        let _ = window.emit(
            "file-detected",
            serde_json::json!({
                "file_path": path.to_string_lossy().to_string(),
            }),
        );
        
        info!("✓ 文件检测事件已发送到前端: {:?}", path);
    }
}



