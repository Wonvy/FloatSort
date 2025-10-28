// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod file_monitor;
mod rule_engine;
mod file_ops;
mod models;

use config::AppConfig;
use file_monitor::FileMonitor;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State, Window};
use tracing::{info, error};
use tracing_subscriber;

// 应用状态
struct AppState {
    config: Arc<Mutex<AppConfig>>,
    monitor: Arc<Mutex<Option<FileMonitor>>>,
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

// Tauri 命令：启动文件监控
#[tauri::command]
async fn start_monitoring(state: State<'_, AppState>, window: Window) -> Result<(), String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    let monitor = FileMonitor::new(config, window)?;
    monitor.start().map_err(|e| e.to_string())?;
    
    let mut monitor_state = state.monitor.lock().map_err(|e| e.to_string())?;
    *monitor_state = Some(monitor);
    
    info!("文件监控已启动");
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
async fn organize_file(file_path: String, state: State<'_, AppState>) -> Result<String, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?.clone();
    
    let result = file_ops::organize_single_file(&file_path, &config.rules)
        .map_err(|e| e.to_string())?;
    
    Ok(result)
}

// Tauri 命令：获取文件统计
#[tauri::command]
fn get_statistics(state: State<AppState>) -> Result<serde_json::Value, String> {
    // TODO: 实现统计功能
    Ok(serde_json::json!({
        "files_processed": 0,
        "files_organized": 0,
        "last_activity": null
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
    };

    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            start_monitoring,
            stop_monitoring,
            organize_file,
            get_statistics
        ])
        .setup(|app| {
            info!("FloatSort 初始化完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用时出错");
}


