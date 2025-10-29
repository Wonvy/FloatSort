// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_monitor;
mod rule_engine;
mod file_ops;
mod models;

use config::{AppConfig, WatchFolder};
use file_monitor::FileMonitor;
use models::Rule;
use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use tauri::{State, SystemTray, SystemTrayMenu, SystemTrayMenuItem, CustomMenuItem, SystemTrayEvent, Manager};
use tracing::info;
use tracing_subscriber;
use chrono;

// 应用状态
struct AppState {
    config: Arc<Mutex<AppConfig>>,
    monitor: Arc<Mutex<Option<FileMonitor>>>,
    stats: Arc<Mutex<Statistics>>,
    processed_files: Arc<Mutex<HashSet<String>>>, // 记录已处理的文件路径
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

// Tauri 命令：保存动画设置
#[tauri::command]
fn save_animation_settings(animation: String, animation_speed: String, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    config.animation = animation;
    config.animation_speed = animation_speed;
    config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
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

// Tauri 命令：清除已处理文件记录
#[tauri::command]
fn clear_processed_files(state: State<AppState>) -> Result<(), String> {
    let mut processed = state.processed_files.lock().map_err(|e| e.to_string())?;
    let count = processed.len();
    processed.clear();
    info!("已清除 {} 条已处理文件记录", count);
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
    
    // 创建并启动文件监控器
    let monitor = FileMonitor::new(config.clone(), window)
        .map_err(|e| format!("创建并启动监控器失败: {}", e))?;
    
    // 保存监控器实例
    let mut monitor_guard = state.monitor.lock().map_err(|e| e.to_string())?;
    *monitor_guard = Some(monitor);
    
    let folder_names: Vec<_> = enabled_folders.iter().map(|f| f.name.as_str()).collect();
    info!("文件监控已启动，监控文件夹: {:?}", folder_names);
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
async fn process_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    // 检查文件是否已处理过
    {
        let processed = state.processed_files.lock().map_err(|e| e.to_string())?;
        if processed.contains(&path) {
            info!("文件已处理过，跳过: {}", path);
            return Ok(String::new()); // 返回空字符串表示跳过
        }
    }
    
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    let result = file_ops::organize_single_file(&path, &config.rules)
        .map_err(|e| e.to_string())?;
    
    // 判断文件是否被成功移动（返回值不是错误提示信息）
    let is_organized = !result.is_empty() && result != "文件未匹配任何规则";
    
    // 只有文件被成功移动才记录为已处理
    if is_organized {
        let mut processed = state.processed_files.lock().map_err(|e| e.to_string())?;
        processed.insert(path.clone());
        info!("文件已记录为已处理: {}", path);
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
async fn process_file_with_rule(path: String, rule_id: String, state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    // 查找指定的规则
    let rule = config.rules.iter()
        .find(|r| r.id == rule_id)
        .ok_or_else(|| "规则不存在".to_string())?;
    
    // 使用单个规则进行整理
    let result = file_ops::organize_single_file(&path, &vec![rule.clone()])
        .map_err(|e| e.to_string())?;
    
    // 更新统计
    let mut stats = state.stats.lock().map_err(|e| e.to_string())?;
    stats.files_processed += 1;
    if !result.is_empty() {
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
    
    if let Some(rule) = engine.find_matching_rule(&file_info) {
        // 计算目标路径（使用当前目录作为基础路径）
        let base_path = Path::new(&path).parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;
        
        if let Some(dest_path) = engine.get_destination_path(&rule.action, &file_info, base_path) {
            return Ok(serde_json::json!({
                "matched": true,
                "rule_name": rule.name,
                "original_path": path,
                "target_path": dest_path,
            }));
        }
    }
    
    // 未匹配任何规则
    Ok(serde_json::json!({
        "matched": false,
        "original_path": path,
        "target_path": null,
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
    
    if let Some(_matched_rule) = engine.find_matching_rule(&file_info) {
        // 计算目标路径
        let base_path = Path::new(&path).parent()
            .ok_or_else(|| "无法获取父目录".to_string())?;
        
        if let Some(dest_path) = engine.get_destination_path(&rule.action, &file_info, base_path) {
            return Ok(serde_json::json!({
                "matched": true,
                "rule_name": rule.name,
                "original_path": path,
                "target_path": dest_path,
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
    info!("窗口已隐藏到托盘");
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

fn main() {
    // 初始化日志系统
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive(tracing::Level::INFO.into())
        )
        .init();

    info!("FloatSort 启动中...");

    // 加载配置
    let config = AppConfig::load_or_default("data/config.json")
        .expect("无法加载配置文件");

    // 创建应用状态
    let app_state = AppState {
        config: Arc::new(Mutex::new(config)),
        monitor: Arc::new(Mutex::new(None)),
        stats: Arc::new(Mutex::new(Statistics::default())),
        processed_files: Arc::new(Mutex::new(HashSet::new())),
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
            save_animation_settings,
            add_rule,
            get_rules,
            remove_rule,
            update_rule,
            reorder_rules,
            clear_processed_files,
            select_folder,
            open_folder,
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
            show_from_tray
        ])
        .setup(|_app| {
            info!("FloatSort 初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}


