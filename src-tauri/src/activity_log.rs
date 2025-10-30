use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use std::path::Path;
use chrono::Local;
use anyhow::Result;

/// 记录文件操作日志
pub fn log_file_operation(
    operation: &str,
    source: &str,
    destination: Option<&str>,
    rule_name: Option<&str>,
    success: bool,
    error_msg: Option<&str>,
) -> Result<String> {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // 构建日志消息
    let mut log_message = format!("[{}] ", timestamp);
    
    if success {
        log_message.push_str("✅ ");
    } else {
        log_message.push_str("❌ ");
    }
    
    log_message.push_str(operation);
    log_message.push_str(": ");
    log_message.push_str(source);
    
    if let Some(dest) = destination {
        log_message.push_str(" → ");
        log_message.push_str(dest);
    }
    
    if let Some(rule) = rule_name {
        log_message.push_str(" (规则: ");
        log_message.push_str(rule);
        log_message.push_str(")");
    }
    
    if let Some(err) = error_msg {
        log_message.push_str(" - 错误: ");
        log_message.push_str(err);
    }
    
    // 确保日志目录存在
    let log_dir = Path::new("log");
    if !log_dir.exists() {
        create_dir_all(log_dir)?;
    }
    
    // 写入日志文件（按日期命名）
    let log_file_name = format!("log/floatsort_{}.log", Local::now().format("%Y-%m-%d"));
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_name)?;
    
    writeln!(file, "{}", log_message)?;
    
    Ok(log_message)
}

/// 记录一般活动日志
#[allow(dead_code)]
pub fn log_activity(message: &str) -> Result<String> {
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_message = format!("[{}] {}", timestamp, message);
    
    // 确保日志目录存在
    let log_dir = Path::new("log");
    if !log_dir.exists() {
        create_dir_all(log_dir)?;
    }
    
    // 写入日志文件
    let log_file_name = format!("log/floatsort_{}.log", Local::now().format("%Y-%m-%d"));
    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_file_name)?;
    
    writeln!(file, "{}", log_message)?;
    
    Ok(log_message)
}

