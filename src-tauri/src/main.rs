// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_monitor;
mod rule_engine;
mod file_ops;
mod models;
mod scheduler;
mod window_snap;
mod i18n;

use config::{AppConfig, WatchFolder};
use file_monitor::FileMonitor;
use scheduler::Scheduler;
use models::Rule;
use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use std::fs;
use tauri::{State, SystemTray, SystemTrayMenu, SystemTrayMenuItem, CustomMenuItem, SystemTrayEvent, Manager};
use tracing::info;
use tracing_subscriber;
use chrono::{Local, TimeZone};

// 应用状态
struct AppState {
    config: Arc<Mutex<AppConfig>>,
    monitor: Arc<Mutex<Option<FileMonitor>>>,
    stats: Arc<Mutex<Statistics>>,
    processed_files: Arc<Mutex<HashSet<String>>>, // 记录已处理的文件路径
    window_snap_running: Arc<Mutex<bool>>, // 窗口折叠功能是否运行中
}

// 统计信息
#[derive(Debug, Clone, Default)]
struct Statistics {
    files_processed: u64,
    files_organized: u64,
    last_activity: Option<String>,
}

// Tauri 命令：获取配置
#[tauri::command]
fn get_config(state: State<AppState>) -> Result<AppConfig, String> {
    state.config
        .lock()
        .map_err(|e| e.to_string())
        .map(|config| config.clone())
}

// Tauri 命令：保存配置
#[tauri::command]
fn save_config(config: AppConfig, state: State<AppState>) -> Result<(), String> {
    let mut app_config = state.config.lock().map_err(|e| e.to_string())?;
    *app_config = config.clone();
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("配置已保存");
    Ok(())
}

// Tauri 命令：保存窗口大小
#[tauri::command]
fn save_window_size(width: u32, height: u32, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.window_width = width;
    config.window_height = height;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    Ok(())
}

// Tauri 命令：保存窗口状态（位置、折叠状态）
#[tauri::command]
fn save_window_state(
    x: Option<i32>,
    y: Option<i32>,
    is_collapsed: Option<bool>,
    collapsed_edge: Option<String>,
    state: State<AppState>
) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    if let Some(x_pos) = x {
        config.window_x = Some(x_pos);
    }
    if let Some(y_pos) = y {
        config.window_y = Some(y_pos);
    }
    if let Some(collapsed) = is_collapsed {
        config.is_collapsed = Some(collapsed);
    }
    if let Some(edge) = collapsed_edge {
        config.collapsed_edge = Some(edge);
    }
    
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("窗口状态已保存: 折叠={:?}, 边缘={:?}", config.is_collapsed, config.collapsed_edge);
    Ok(())
}

// Tauri 命令：保存动画设置
#[tauri::command]
fn save_animation_settings(animation: String, animation_speed: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.animation = animation;
    config.animation_speed = animation_speed;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    Ok(())
}

// Tauri 命令：保存文件稳定性设置
#[tauri::command]
fn save_stability_settings(file_stability_delay: u32, file_stability_checks: u32, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.file_stability_delay = file_stability_delay;
    config.file_stability_checks = file_stability_checks;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("文件稳定性设置已保存: 延迟{}秒, {}次检查", file_stability_delay, file_stability_checks);
    Ok(())
}

// Tauri 命令：保存语言设置
#[tauri::command]
fn save_language_setting(language: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.language = language.clone();
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    
    // 同步更新Rust日志的语言设置
    i18n::set_language(&language);
    
    info!("{}: {}", i18n::t("language.saved"), language);
    Ok(())
}

// Tauri 命令：添加规则
#[tauri::command]
fn add_rule(rule: Rule, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.rules.push(rule);
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("规则已添加");
    Ok(())
}

// Tauri 命令：获取所有规则
#[tauri::command]
fn get_rules(state: State<AppState>) -> Result<Vec<Rule>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.rules.clone())
}

// Tauri 命令：删除规则
#[tauri::command]
fn remove_rule(rule_id: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    if let Some(index) = config.rules.iter().position(|r| r.id == rule_id) {
        let rule_name = config.rules[index].name.clone();
        config.rules.remove(index);
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("规则已删除: {}", rule_name);
        Ok(())
    } else {
        Err("规则不存在".to_string())
    }
}

// Tauri 命令：更新规则
#[tauri::command]
fn update_rule(rule_id: String, rule: Rule, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    if let Some(index) = config.rules.iter().position(|r| r.id == rule_id) {
        config.rules[index] = rule;
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("规则已更新");
        Ok(())
    } else {
        Err("规则不存在".to_string())
    }
}

// Tauri 命令：重新排序规则
#[tauri::command]
fn reorder_rules(rule_ids: Vec<String>, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    // 根据传入的ID顺序重新排序规则
    let mut new_rules = Vec::new();
    for id in &rule_ids {
        if let Some(rule) = config.rules.iter().find(|r| &r.id == id) {
            new_rules.push(rule.clone());
        }
    }
    
    // 验证所有规则都被包含了
    if new_rules.len() != config.rules.len() {
        return Err("规则ID列表不完整".to_string());
    }
    
    config.rules = new_rules;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("规则顺序已更新");
    Ok(())
}

// Tauri 命令：打开日志文件夹
#[tauri::command]
fn open_log_folder() -> Result<(), String> {
    let log_path = std::env::current_dir()
        .map_err(|e| e.to_string())?
        .join("logs");
    
    // 确保日志目录存在
    std::fs::create_dir_all(&log_path).map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&log_path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    info!("日志文件夹已打开");
    Ok(())
}

// Tauri 命令：读取指定日期的日志
#[tauri::command]
fn read_log_by_date(date: String) -> Result<String, String> {
    // 文件名格式: floatsort.YYYY-MM-DD.log
    let log_file = format!("logs/floatsort.{}.log", date);
    info!("尝试读取日志文件: {}", log_file);
    match std::fs::read_to_string(&log_file) {
        Ok(content) => {
            info!("成功读取日志文件，内容长度: {} 字节", content.len());
            Ok(content)
        },
        Err(e) => {
            info!("日志文件不存在或读取失败: {} - {}", log_file, e);
            Ok(String::new()) // 如果文件不存在，返回空字符串
        }
    }
}

// Tauri 命令：清理过期日志
#[tauri::command]
fn cleanup_old_logs(retention_days: i32) -> Result<u32, String> {
    if retention_days < 0 {
        return Ok(0); // 永久保留，不清理
    }
    
    let log_dir = std::path::Path::new("logs");
    if !log_dir.exists() {
        return Ok(0);
    }
    
    let now = Local::now();
    let cutoff_date = now - chrono::Duration::days(retention_days as i64);
    let mut removed_count = 0;
    
    match fs::read_dir(log_dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                        // 解析日志文件名: floatsort.YYYY-MM-DD.log
                        if file_name.starts_with("floatsort.") && file_name.ends_with(".log") {
                            let date_str = &file_name[10..file_name.len()-4]; // 提取日期部分（floatsort. = 10个字符）
                            if let Ok(file_date) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                                let file_datetime = file_date.and_hms_opt(0, 0, 0).unwrap();
                                let file_datetime = Local.from_local_datetime(&file_datetime).unwrap();
                                
                                if file_datetime < cutoff_date {
                                    if let Err(e) = fs::remove_file(&path) {
                                        info!("删除日志文件失败: {:?} - {}", path, e);
                                    } else {
                                        removed_count += 1;
                                        info!("删除过期日志: {:?}", path);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("无法读取日志目录: {}", e)),
    }
    
    info!("清理完成，删除了 {} 个过期日志文件", removed_count);
    Ok(removed_count)
}

// Tauri 命令：保存日志保留天数设置
#[tauri::command]
fn save_log_retention_setting(retention_days: i32, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.log_retention_days = retention_days;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("日志保留天数设置已保存: {}天", retention_days);
    Ok(())
}

// Tauri 命令：选择文件夹
#[tauri::command]
async fn select_folder(window: tauri::Window) -> Result<Option<String>, String> {
    use tauri::api::dialog::FileDialogBuilder;
    use std::sync::mpsc;
    
    info!("打开文件夹选择对话框...");
    
    let (tx, rx) = mpsc::channel();
    
    FileDialogBuilder::new()
        .set_parent(&window)
        .set_title("选择目标文件夹")
        .pick_folder(move |folder_path| {
            info!("用户选择结果: {:?}", folder_path);
            let _ = tx.send(folder_path);
        });
    
    let folder = rx.recv().map_err(|e| {
        let err_msg = format!("接收文件夹路径失败: {}", e);
        info!("{}", err_msg);
        err_msg
    })?;
    
    let result = folder.map(|path| path.to_string_lossy().to_string());
    info!("返回文件夹路径: {:?}", result);
    Ok(result)
}

// Tauri 命令：打开文件夹
#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    use std::process::Command;
    
    info!("打开文件夹: {}", path);
    
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("无法打开文件夹: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn open_file_location(path: String) -> Result<(), String> {
    use std::process::Command;
    
    info!("在文件管理器中打开文件: {}", path);
    
    #[cfg(target_os = "windows")]
    {
        // Windows: 使用 /select 参数在资源管理器中选中文件
        Command::new("explorer")
            .args(&["/select,", &path])
            .spawn()
            .map_err(|e| format!("无法打开文件位置: {}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOS: 使用 -R 参数在Finder中显示文件
        Command::new("open")
            .args(&["-R", &path])
            .spawn()
            .map_err(|e| format!("无法打开文件位置: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linux: 使用 dbus 调用文件管理器（如果支持）
        // 否则打开文件所在的文件夹
        use std::path::Path;
        if let Some(parent) = Path::new(&path).parent() {
            Command::new("xdg-open")
                .arg(parent)
                .spawn()
                .map_err(|e| format!("无法打开文件位置: {}", e))?;
        } else {
            return Err("无法确定文件路径".to_string());
        }
    }
    
    Ok(())
}

// ============ 文件夹管理命令 ============

// Tauri 命令：获取所有文件夹
#[tauri::command]
fn get_folders(state: State<AppState>) -> Result<Vec<WatchFolder>, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.folders.clone())
}

// Tauri 命令：添加文件夹
#[tauri::command]
fn add_folder(folder: WatchFolder, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    // 检查路径是否已存在
    if config.folders.iter().any(|f| f.path == folder.path) {
        return Err("该文件夹已存在".to_string());
    }
    
    config.folders.push(folder.clone());
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("文件夹已添加: {}", folder.name);
    Ok(())
}

// Tauri 命令：更新文件夹
#[tauri::command]
fn update_folder(folder_id: String, folder: WatchFolder, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    if let Some(index) = config.folders.iter().position(|f| f.id == folder_id) {
        config.folders[index] = folder;
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("文件夹已更新");
        Ok(())
    } else {
        Err("文件夹不存在".to_string())
    }
}

// Tauri 命令：删除文件夹
#[tauri::command]
fn remove_folder(folder_id: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    if let Some(index) = config.folders.iter().position(|f| f.id == folder_id) {
        let folder_name = config.folders[index].name.clone();
        config.folders.remove(index);
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("文件夹已删除: {}", folder_name);
        Ok(())
    } else {
        Err("文件夹不存在".to_string())
    }
}

// Tauri 命令：切换文件夹监控状态
#[tauri::command]
fn toggle_folder(folder_id: String, state: State<AppState>) -> Result<bool, String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    let (new_state, folder_name) = {
        if let Some(folder) = config.folders.iter_mut().find(|f| f.id == folder_id) {
            folder.enabled = !folder.enabled;
            (folder.enabled, folder.name.clone())
        } else {
            return Err("文件夹不存在".to_string());
        }
    };
    
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("文件夹 {} 监控状态: {}", folder_name, new_state);
    Ok(new_state)
}

// Tauri 命令：更新文件夹关联的规则
#[tauri::command]
fn update_folder_rules(folder_id: String, rule_ids: Vec<String>, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    
    let folder_name = {
        if let Some(folder) = config.folders.iter_mut().find(|f| f.id == folder_id) {
            folder.rule_ids = rule_ids;
            folder.name.clone()
        } else {
            return Err("文件夹不存在".to_string());
        }
    };
    
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("文件夹 {} 的规则已更新", folder_name);
    Ok(())
}

// ============ 监控命令（更新版） ============

// Tauri 命令：启动所有已启用文件夹的监控
#[tauri::command]
async fn start_monitoring(
    state: State<'_, AppState>,
    window: tauri::Window,
) -> Result<(), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    // 检查是否有已启用的文件夹
    let enabled_folders: Vec<_> = config.folders.iter().filter(|f| f.enabled).collect();
    if enabled_folders.is_empty() {
        return Err("没有已启用的监控文件夹，请先添加并启用文件夹".to_string());
    }
    
    // 创建并启动文件监控器（仅处理 Immediate 和 Manual 模式）
    let monitor = FileMonitor::new(config.clone(), window.clone())
        .map_err(|e| format!("创建并启动监控器失败: {}", e))?;
    
    // 保存监控器实例
    let mut monitor_guard = state.monitor.lock().map_err(|e| e.to_string())?;
    *monitor_guard = Some(monitor);
    
    let folder_names: Vec<_> = enabled_folders.iter().map(|f| f.name.as_str()).collect();
    info!("文件监控已启动，监控文件夹: {:?}", folder_names);
    
    // 创建并启动调度器（处理 OnStartup 和 Scheduled 模式）
    let scheduler = Scheduler::new(state.config.clone(), window);
    scheduler.start();
    info!("调度器已启动");
    
    Ok(())
}

// Tauri 命令：启动特定文件夹的监控
#[tauri::command]
async fn start_folder_monitoring(
    folder_id: String,
    state: State<'_, AppState>,
    window: tauri::Window,
) -> Result<(), String> {
    // 先启用该文件夹
    let _ = toggle_folder(folder_id.clone(), state.clone())?;
    
    // 重新启动监控
    start_monitoring(state, window).await
}

// Tauri 命令：停止文件监控
#[tauri::command]
fn stop_monitoring(state: State<AppState>) -> Result<(), String> {
    let mut monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    *monitor = None;
    info!("文件监控已停止");
    Ok(())
}

// Tauri 命令：手动整理文件
#[tauri::command]
async fn process_file(path: String, window: tauri::Window, state: State<'_, AppState>) -> Result<String, String> {
    info!("[自动处理] 开始处理文件: {}", path);
    
    // 检查文件是否已处理过
    {
        let processed = state.processed_files.lock().map_err(|e| e.to_string())?;
        if processed.contains(&path) {
            info!("文件已处理过，跳过: {}", path);
            return Ok(String::new()); // 返回空字符串表示跳过
        }
    }
    
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    let original_path = path.clone();
    
    let result = file_ops::organize_single_file(&path, &config.rules)
        .map_err(|e| e.to_string())?;
    
    // 判断文件是否被成功移动（返回值不是错误提示信息）
    let is_organized = !result.is_empty() && result != "文件未匹配任何规则";
    
    // 只有文件被成功移动才记录为已处理
    if is_organized {
        let mut processed = state.processed_files.lock().map_err(|e| e.to_string())?;
        processed.insert(path.clone());
        info!("文件已记录为已处理: {}", path);
        
        // 发送整理成功事件到前端
        #[derive(Clone, serde::Serialize)]
        struct FileOrganizedEvent {
            from: String,
            to: String,
        }
        
        if let Err(e) = window.emit("file-organized", FileOrganizedEvent {
            from: original_path,
            to: result.clone(),
        }) {
            info!("发送文件整理事件失败: {}", e);
        }
    }
    
    // 更新统计
    let mut stats = state.stats.lock().map_err(|e| e.to_string())?;
    stats.files_processed += 1;
    if is_organized {
        stats.files_organized += 1;
    }
    stats.last_activity = Some(chrono::Local::now().to_rfc3339());
    
    Ok(result)
}

// Tauri 命令：使用指定规则整理文件
#[tauri::command]
async fn process_file_with_rule(path: String, rule_id: String, window: tauri::Window, state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    let original_path = path.clone();
    
    // 查找指定的规则
    let rule = config.rules.iter()
        .find(|r| r.id == rule_id)
        .ok_or_else(|| "规则不存在".to_string())?;
    
    // 使用单个规则进行整理
    let result = file_ops::organize_single_file(&path, &vec![rule.clone()])
        .map_err(|e| e.to_string())?;
    
    let is_organized = !result.is_empty() && result != "文件未匹配任何规则";
    
    // 发送整理成功事件到前端
    if is_organized {
        #[derive(Clone, serde::Serialize)]
        struct FileOrganizedEvent {
            from: String,
            to: String,
        }
        
        if let Err(e) = window.emit("file-organized", FileOrganizedEvent {
            from: original_path,
            to: result.clone(),
        }) {
            info!("发送文件整理事件失败: {}", e);
        }
    }
    
    // 更新统计
    let mut stats = state.stats.lock().map_err(|e| e.to_string())?;
    stats.files_processed += 1;
    if is_organized {
        stats.files_organized += 1;
    }
    stats.last_activity = Some(chrono::Local::now().to_rfc3339());
    
    Ok(result)
}

// Tauri 命令：预览文件整理（不实际移动文件）
#[tauri::command]
async fn preview_file_organization(path: String, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    use std::path::Path;
    
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    // 获取文件信息
    let file_info = file_ops::get_file_info(Path::new(&path))
        .map_err(|e| e.to_string())?;
    
    // 查找匹配的规则
    let engine = crate::rule_engine::RuleEngine::new(config.rules.clone());
    
    if let Some(rule_match) = engine.find_matching_rule(&file_info) {
        // 计算目标路径（使用当前目录作为基础路径）
        let base_path = Path::new(&path).parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;
        
        if let Some(dest_path) = engine.get_destination_path(&rule_match.rule.action, &file_info, base_path, &rule_match.regex_captures) {
            // 如果目标路径是回收站，直接返回
            if dest_path == "已移动到回收站" || dest_path == "{recycle}" {
                return Ok(serde_json::json!({
                    "matched": true,
                    "rule_name": rule_match.rule.name,
                    "original_path": path,
                    "target_path": "回收站",
                    "is_directory": file_info.is_directory,
                }));
            }
            
            // 构建完整的目标文件路径（目标文件夹 + 文件名）
            let file_name = Path::new(&path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            let full_target_path = Path::new(&dest_path)
                .join(file_name)
                .to_string_lossy()
                .to_string();
            
            return Ok(serde_json::json!({
                "matched": true,
                "rule_name": rule_match.rule.name,
                "original_path": path,
                "target_path": full_target_path,
                "is_directory": file_info.is_directory,
            }));
        }
    }
    
    // 未匹配任何规则
    Ok(serde_json::json!({
        "matched": false,
        "original_path": path,
        "target_path": null,
        "is_directory": file_info.is_directory,
    }))
}

// Tauri 命令：预览使用指定规则的文件整理
#[tauri::command]
async fn preview_file_organization_with_rule(path: String, rule_id: String, state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    use std::path::Path;
    
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    // 查找指定的规则
    let rule = config.rules.iter()
        .find(|r| r.id == rule_id)
        .ok_or_else(|| "规则不存在".to_string())?;
    
    // 获取文件信息
    let file_info = file_ops::get_file_info(Path::new(&path))
        .map_err(|e| e.to_string())?;
    
    // 检查文件是否匹配该规则
    let engine = crate::rule_engine::RuleEngine::new(vec![rule.clone()]);
    
    if let Some(rule_match) = engine.find_matching_rule(&file_info) {
        // 计算目标路径
        let base_path = Path::new(&path).parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;
        
        if let Some(dest_path) = engine.get_destination_path(&rule_match.rule.action, &file_info, base_path, &rule_match.regex_captures) {
            // 如果目标路径是回收站，直接返回
            if dest_path == "已移动到回收站" || dest_path == "{recycle}" {
                return Ok(serde_json::json!({
                    "matched": true,
                    "rule_name": rule_match.rule.name,
                    "original_path": path,
                    "target_path": "回收站",
                    "is_directory": file_info.is_directory,
                }));
            }
            
            // 构建完整的目标文件路径（目标文件夹 + 文件名）
            let file_name = Path::new(&path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");
            let full_target_path = Path::new(&dest_path)
                .join(file_name)
                .to_string_lossy()
                .to_string();
            
            return Ok(serde_json::json!({
                "matched": true,
                "rule_name": rule_match.rule.name,
                "original_path": path,
                "target_path": full_target_path,
                "is_directory": file_info.is_directory,
            }));
        }
    }
    
    // 文件不匹配该规则
    Ok(serde_json::json!({
        "matched": false,
        "original_path": path,
        "target_path": null,
    }))
}

// Tauri 命令：获取文件统计
#[tauri::command]
fn get_statistics(state: State<AppState>) -> Result<serde_json::Value, String> {
    let stats = state.stats.lock().map_err(|e| e.to_string())?;
    let config = state.config.lock().map_err(|e| e.to_string())?;
    let monitor = state.monitor.lock().map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "files_processed": stats.files_processed,
        "files_organized": stats.files_organized,
        "rules_count": config.rules.len(),
        "monitoring": monitor.is_some(),
        "last_activity": stats.last_activity
    }))
}

// Tauri 命令：隐藏窗口到托盘
#[tauri::command]
fn hide_to_tray(window: tauri::Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    info!("{}", i18n::t("window.hidden"));
    Ok(())
}

// Tauri 命令：从托盘显示窗口
#[tauri::command]
fn show_from_tray(window: tauri::Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    info!("窗口已从托盘显示");
    Ok(())
}

// Tauri 命令：获取今日活动日志
#[tauri::command]
fn get_activity_logs() -> Result<Vec<String>, String> {
    let log_file_name = format!("log/floatsort_{}.log", Local::now().format("%Y-%m-%d"));
    
    if !std::path::Path::new(&log_file_name).exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&log_file_name)
        .map_err(|e| e.to_string())?;
    
    // 返回最后100行日志
    let lines: Vec<String> = content
        .lines()
        .rev()
        .take(100)
        .map(|s| s.to_string())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    
    Ok(lines)
}

// Tauri 命令：清空活动日志
#[tauri::command]
fn clear_activity_logs() -> Result<(), String> {
    let log_file_name = format!("log/floatsort_{}.log", Local::now().format("%Y-%m-%d"));
    
    if std::path::Path::new(&log_file_name).exists() {
        // 清空日志文件内容（保留文件）
        fs::write(&log_file_name, "")
            .map_err(|e| format!("清空日志文件失败: {}", e))?;
        info!("{}", i18n::t("activity.cleared"));
    }
    
    Ok(())
}

// Tauri 命令：导出配置
#[tauri::command]
fn export_config(state: State<AppState>) -> Result<serde_json::Value, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    let config_json = serde_json::to_value(&*config).map_err(|e| e.to_string())?;
    info!("配置已导出");
    Ok(config_json)
}

// Tauri 命令：导入配置
#[tauri::command]
fn import_config(config: AppConfig, state: State<AppState>) -> Result<(), String> {
    let mut app_config = state.config.lock().map_err(|e| e.to_string())?;
    *app_config = config.clone();
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
    info!("配置已导入并保存");
    Ok(())
}

// Tauri 命令：保存文件
#[tauri::command]
fn save_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("保存文件失败: {}", e))?;
    info!("文件已保存到: {}", path);
    Ok(())
}

// Tauri 命令：读取文件
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| format!("读取文件失败: {}", e))?;
    info!("文件已读取: {}", path);
    Ok(content)
}

// Tauri 命令：退出应用程序
#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) -> Result<(), String> {
    info!("用户请求退出程序");
    app_handle.exit(0);
    Ok(())
}

fn main() {
    // 创建日志目录
    std::fs::create_dir_all("logs").expect("无法创建日志目录");
    
    // 初始化日志系统 - 使用本地时区的日期创建日志文件
    // 创建当天的日志文件（使用本地时间）
    let log_file_name = format!("floatsort.{}.log", Local::now().format("%Y-%m-%d"));
    let log_file_path = std::path::Path::new("logs").join(&log_file_name);
    
    // 使用标准文件输出，tracing会自动处理
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .expect("无法创建日志文件");
    
    // 使用tracing_appender的non_blocking包装文件
    let (non_blocking, _guard) = tracing_appender::non_blocking(log_file);
    
    // 保持_guard存活，防止日志丢失
    std::mem::forget(_guard);
    
    // 自定义时间格式：使用本地时间
    use tracing_subscriber::fmt::time::ChronoLocal;
    
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into())
        )
        .with_writer(non_blocking)
        .with_timer(ChronoLocal::new("%Y-%m-%d %H:%M:%S".to_string()))  // 使用本地时间
        .with_target(false)  // 去掉模块路径
        .with_thread_ids(false)  // 去掉线程ID
        .with_thread_names(false)  // 去掉线程名
        .with_ansi(false)  // 去掉ANSI颜色代码
        .compact()  // 使用紧凑格式
        .init();

    info!("FloatSort 启动中...");
    info!("日志文件: {}", log_file_name);

    // 加载配置
    let config = AppConfig::load_or_default("data/config.json")
        .expect("无法加载配置文件");

    // 初始化i18n语言设置
    i18n::set_language(&config.language);
    
    // 自动清理过期日志
    let retention_days = config.log_retention_days;
    if retention_days > 0 {
        match cleanup_old_logs(retention_days) {
            Ok(count) => {
                if count > 0 {
                    info!("启动时清理了 {} 个过期日志文件", count);
                }
            }
            Err(e) => {
                info!("清理日志失败: {}", e);
            }
        }
    }

    // 创建应用状态
    let app_state = AppState {
        config: Arc::new(Mutex::new(config)),
        monitor: Arc::new(Mutex::new(None)),
        stats: Arc::new(Mutex::new(Statistics::default())),
        processed_files: Arc::new(Mutex::new(HashSet::new())),
        window_snap_running: Arc::new(Mutex::new(false)),
    };

    // 创建系统托盘菜单
    let show = CustomMenuItem::new("show".to_string(), "显示窗口");
    let quit = CustomMenuItem::new("quit".to_string(), "退出程序");
    let tray_menu = SystemTrayMenu::new()
        .add_item(show)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);
    
    // 使用 image crate 加载PNG图标
    let icon_bytes = include_bytes!("../icons/icon.png");
    let icon_img = image::load_from_memory(icon_bytes)
        .expect("无法加载托盘图标")
        .to_rgba8();
    let (width, height) = icon_img.dimensions();
    let icon = tauri::Icon::Rgba {
        rgba: icon_img.into_raw(),
        width,
        height,
    };
    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        .with_icon(icon);

    tauri::Builder::default()
        .manage(app_state)
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                // 左键点击显示窗口
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
                window.set_focus().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        let window = app.get_window("main").unwrap();
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            save_window_size,
            save_window_state,
            save_animation_settings,
            save_stability_settings,
            save_language_setting,
            add_rule,
            get_rules,
            remove_rule,
            update_rule,
            reorder_rules,
            open_log_folder,
            read_log_by_date,
            cleanup_old_logs,
            save_log_retention_setting,
            select_folder,
            open_folder,
            open_file_location,
            get_folders,
            add_folder,
            update_folder,
            remove_folder,
            toggle_folder,
            update_folder_rules,
            start_monitoring,
            start_folder_monitoring,
            stop_monitoring,
            process_file,
            process_file_with_rule,
            preview_file_organization,
            preview_file_organization_with_rule,
            get_statistics,
            hide_to_tray,
            show_from_tray,
            get_activity_logs,
            clear_activity_logs,
            export_config,
            import_config,
            save_file,
            read_file,
            exit_app,
            window_snap::start_window_snap,
            window_snap::stop_window_snap,
            window_snap::check_window_near_edge,
            window_snap::trigger_window_snap
        ])
        .setup(|app| {
            info!("FloatSort 初始化完成");
            
            let window = app.get_window("main").unwrap();
            let app_handle = app.handle();
            
            // 先居中窗口（默认行为）
            info!("窗口居中显示");
            if let Err(e) = window.center() {
                info!("居中窗口失败: {}", e);
            }
            
            // 启动窗口折叠功能（但不自动恢复折叠状态）
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(1000));
                if let Err(e) = window_snap::start_window_snap(window, app_handle) {
                    info!("自动启动窗口折叠功能失败: {}", e);
                } else {
                    info!("窗口折叠功能已启动");
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}


