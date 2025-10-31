use crate::config::AppConfig;
use crate::i18n;
use anyhow::Result;
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime};
use tauri::Window;
use tracing::{debug, error, info, warn};

/// 文件信息（用于稳定性检查）
#[derive(Debug, Clone)]
struct FileSnapshot {
    size: u64,
    modified: SystemTime,
}

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

    /// 处理单个文件 - 检查文件稳定性后再通知前端
    fn process_file(path: PathBuf, config: &AppConfig, window: &Window) {
        info!("检测到文件: {:?}", path);
        
        // 检查是否是临时文件，如果是则跳过
        if Self::is_temporary_file(&path) {
            info!("跳过临时文件: {:?}", path);
            return;
        }
        
        // 克隆配置和窗口，用于延迟检查
        let config_clone = config.clone();
        let window_clone = window.clone();
        let path_clone = path.clone();
        
        // 在新线程中进行稳定性检查
        thread::spawn(move || {
            if Self::wait_for_file_stable(&path_clone, &config_clone) {
                info!("{}: {:?}", i18n::t("file.sending_event"), path_clone);
                
                // 发送文件检测事件到前端
                let _ = window_clone.emit(
                    "file-detected",
                    serde_json::json!({
                        "file_path": path_clone.to_string_lossy().to_string(),
                    }),
                );
                
                info!("✓ {}: {:?}", i18n::t("file.event_sent"), path_clone);
            } else {
                warn!("{}: {:?}", i18n::t("file.stability_failed"), path_clone);
            }
        });
    }
    
    /// 检查文件是否为临时文件
    fn is_temporary_file(path: &Path) -> bool {
        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
            // 常见的临时文件模式
            let temp_patterns = vec![
                "~$",           // Microsoft Office 临时文件
                ".tmp", ".temp", // 临时文件
                ".TMP", ".TEMP",
                ".crdownload",  // Chrome 下载中
                ".download",    // Firefox 下载中
                ".part",        // 部分下载
                "~",            // Vim/Emacs 备份文件
            ];
            
            for pattern in temp_patterns {
                if file_name.starts_with(pattern) || file_name.ends_with(pattern) {
                    return true;
                }
            }
            
            // 检查是否包含临时文件标记
            if file_name.contains(".tmp") || 
               file_name.contains(".TMP") ||
               file_name.contains("~RF") {  // Office 临时锁文件
                return true;
            }
        }
        
        false
    }
    
    /// 等待文件稳定（大小和修改时间不再变化）
    fn wait_for_file_stable(path: &Path, config: &AppConfig) -> bool {
        let delay = Duration::from_secs(config.file_stability_delay as u64);
        let required_checks = config.file_stability_checks;
        
        info!("等待文件稳定: {:?} (延迟{}秒, 需要{}次稳定检查)", 
              path, config.file_stability_delay, required_checks);
        
        // 初始延迟
        thread::sleep(delay);
        
        let mut last_snapshot: Option<FileSnapshot> = None;
        let mut stable_count = 0u32;
        
        for i in 0..required_checks * 2 {  // 最多检查 required_checks * 2 次
            // 检查文件是否被锁定
            if Self::is_file_locked(path) {
                info!("文件被锁定，等待: {:?} (检查 {}/{})", path, i + 1, required_checks * 2);
                thread::sleep(Duration::from_secs(1));
                stable_count = 0;  // 重置稳定计数
                continue;
            }
            
            // 获取文件信息
            match Self::get_file_snapshot(path) {
                Some(current) => {
                    if let Some(last) = &last_snapshot {
                        // 比较文件大小和修改时间
                        if current.size == last.size && current.modified == last.modified {
                            stable_count += 1;
                            info!("{} {}/{}: {:?}", i18n::t("file.stability_check"), stable_count, required_checks, path);
                            
                            if stable_count >= required_checks {
                                info!("✓ {}: {:?}", i18n::t("file.stable"), path);
                                return true;
                            }
                        } else {
                            info!("文件仍在变化: {:?} (大小: {} -> {}, 修改时间变化)", 
                                  path, last.size, current.size);
                            stable_count = 0;  // 重置稳定计数
                        }
                    }
                    
                    last_snapshot = Some(current);
                    thread::sleep(Duration::from_secs(1));
                }
                None => {
                    warn!("无法获取文件信息: {:?}", path);
                    return false;
                }
            }
        }
        
        // 如果经过多次检查仍未稳定，返回 false
        warn!("{}: {:?}", i18n::t("file.stability_timeout"), path);
        false
    }
    
    /// 获取文件快照（大小和修改时间）
    fn get_file_snapshot(path: &Path) -> Option<FileSnapshot> {
        use std::fs;
        
        match fs::metadata(path) {
            Ok(metadata) => {
                Some(FileSnapshot {
                    size: metadata.len(),
                    modified: metadata.modified().ok()?,
                })
            }
            Err(e) => {
                debug!("无法读取文件元数据: {:?}, 错误: {}", path, e);
                None
            }
        }
    }
    
    /// 检查文件是否被锁定（被其他程序占用）
    fn is_file_locked(path: &Path) -> bool {
        use std::fs::OpenOptions;
        
        // 尝试以独占模式打开文件
        match OpenOptions::new()
            .read(true)
            .write(true)
            .open(path)
        {
            Ok(_) => false,  // 文件未被锁定
            Err(e) => {
                // 检查是否是权限错误（文件被占用）
                match e.kind() {
                    std::io::ErrorKind::PermissionDenied => {
                        debug!("文件被锁定（权限拒绝）: {:?}", path);
                        true
                    }
                    std::io::ErrorKind::NotFound => {
                        debug!("文件不存在: {:?}", path);
                        true  // 文件不存在，视为"锁定"
                    }
                    _ => {
                        debug!("无法打开文件: {:?}, 错误: {}", path, e);
                        true  // 其他错误也视为锁定
                    }
                }
            }
        }
    }
}



