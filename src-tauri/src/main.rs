// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_monitor;
mod rule_engine;
mod file_ops;
mod models;

use config::AppConfig;
use file_monitor::FileMonitor;
use models::Rule;
use std::sync::{Arc, Mutex};
use tauri::State;
use tracing::info;
use tracing_subscriber;
use chrono;

// 应用状态
struct AppState {
    config: Arc<Mutex<AppConfig>>,
    monitor: Arc<Mutex<Option<FileMonitor>>>,
    stats: Arc<Mutex<Statistics>>,
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
fn remove_rule(index: usize, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    if index < config.rules.len() {
        config.rules.remove(index);
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("规则已删除");
        Ok(())
    } else {
        Err("规则索引无效".to_string())
    }
}

// Tauri 命令：更新规则
#[tauri::command]
fn update_rule(index: usize, rule: Rule, state: State<AppState>) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    if index < config.rules.len() {
        config.rules[index] = rule;
        config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
        info!("规则已更新");
        Ok(())
    } else {
        Err("规则索引无效".to_string())
    }
}

// Tauri 命令：启动文件监控
#[tauri::command]
async fn start_monitoring(
    state: State<'_, AppState>,
    window: tauri::Window,
    watch_path: Option<String>,
) -> Result<(), String> {
    let mut config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    // 如果提供了监控路径，添加到配置中
    if let Some(path) = watch_path {
        if !config.watch_paths.contains(&path) {
            config.watch_paths.push(path.clone());
            config.save_to_file("data/config.json").map_err(|e| e.to_string())?;
            *state.config.lock().map_err(|e| e.to_string())? = config.clone();
            info!("已添加监控路径: {}", path);
        }
    }
    
    // 检查是否有监控路径
    if config.watch_paths.is_empty() {
        return Err("请先添加要监控的文件夹路径".to_string());
    }
    
    // 创建并启动文件监控器（监控在 new() 中自动启动）
    let monitor = FileMonitor::new(config.clone(), window)
        .map_err(|e| format!("创建并启动监控器失败: {}", e))?;
    
    // 保存监控器实例
    let mut monitor_guard = state.monitor.lock().map_err(|e| e.to_string())?;
    *monitor_guard = Some(monitor);
    
    info!("文件监控已启动，监控路径: {:?}", config.watch_paths);
    Ok(())
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
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    let result = file_ops::organize_single_file(&path, &config.rules)
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
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            add_rule,
            get_rules,
            remove_rule,
            update_rule,
            start_monitoring,
            stop_monitoring,
            process_file,
            get_statistics
        ])
        .setup(|_app| {
            info!("FloatSort 初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}


