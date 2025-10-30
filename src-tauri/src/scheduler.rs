use crate::config::{AppConfig, TriggerMode, ScheduleType};
use chrono::{Local, Datelike, NaiveTime};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Window;
use tracing::{info, warn, error};

/// 调度器 - 管理定时任务
pub struct Scheduler {
    config: Arc<Mutex<AppConfig>>,
    window: Window,
}

impl Scheduler {
    /// 创建新的调度器
    pub fn new(config: Arc<Mutex<AppConfig>>, window: Window) -> Self {
        Self { config, window }
    }

    /// 启动调度器 - 处理"启动时执行"的文件夹
    pub fn start(&self) {
        info!("📅 调度器启动");
        
        // 处理"启动时执行"的文件夹
        self.process_on_startup_folders();
        
        // 启动定时任务管理器
        self.start_scheduled_tasks();
    }

    /// 处理"启动时执行"的文件夹
    fn process_on_startup_folders(&self) {
        let config = match self.config.lock() {
            Ok(c) => c.clone(),
            Err(e) => {
                error!("无法获取配置: {}", e);
                return;
            }
        };

        let on_startup_folders: Vec<_> = config.folders.iter()
            .filter(|f| f.enabled && matches!(f.trigger_mode, TriggerMode::OnStartup))
            .cloned()
            .collect();

        if on_startup_folders.is_empty() {
            info!("没有需要在启动时执行的文件夹");
            return;
        }

        info!("🔄 发现 {} 个需要在启动时执行的文件夹", on_startup_folders.len());

        // 在后台线程中执行，避免阻塞主线程
        let window = self.window.clone();
        thread::spawn(move || {
            // 延迟1秒，确保UI已经初始化
            thread::sleep(Duration::from_secs(1));
            
            for folder in on_startup_folders {
                info!("🔄 启动时执行: {} ({})", folder.name, folder.path);
                Self::scan_and_emit_folder(&folder, &config, &window);
            }
        });
    }

    /// 启动定时任务管理器
    fn start_scheduled_tasks(&self) {
        let config = match self.config.lock() {
            Ok(c) => c.clone(),
            Err(e) => {
                error!("无法获取配置: {}", e);
                return;
            }
        };

        let scheduled_folders: Vec<_> = config.folders.iter()
            .filter(|f| f.enabled && matches!(f.trigger_mode, TriggerMode::Scheduled))
            .cloned()
            .collect();

        if scheduled_folders.is_empty() {
            info!("没有需要定时执行的文件夹");
            return;
        }

        info!("⏱️ 发现 {} 个需要定时执行的文件夹", scheduled_folders.len());

        // 为每个定时文件夹创建独立的监控线程
        for folder in scheduled_folders {
            let window = self.window.clone();
            let config_clone = config.clone();
            
            thread::spawn(move || {
                let folder_name = folder.name.clone();
                info!("⏱️ 启动定时任务: {}", folder_name);
                
                loop {
                    // 计算下次执行时间
                    let wait_duration = match Self::calculate_next_execution(&folder) {
                        Some(duration) => duration,
                        None => {
                            warn!("⚠️ 无法计算下次执行时间: {}", folder_name);
                            thread::sleep(Duration::from_secs(60)); // 等待1分钟后重试
                            continue;
                        }
                    };

                    info!("⏰ {} 将在 {:.1} 分钟后执行", folder_name, wait_duration.as_secs_f64() / 60.0);
                    
                    // 等待到执行时间
                    thread::sleep(wait_duration);
                    
                    // 执行扫描
                    info!("🚀 执行定时任务: {}", folder_name);
                    Self::scan_and_emit_folder(&folder, &config_clone, &window);
                }
            });
        }
    }

    /// 计算下次执行时间（返回等待时长）
    fn calculate_next_execution(folder: &crate::config::WatchFolder) -> Option<Duration> {
        let now = Local::now();
        
        match &folder.schedule_type {
            Some(ScheduleType::Interval) => {
                // 间隔执行：直接返回间隔时间
                let minutes = folder.schedule_interval_minutes.unwrap_or(30);
                Some(Duration::from_secs(minutes as u64 * 60))
            }
            
            Some(ScheduleType::Daily) => {
                // 每天执行：计算到指定时间的等待时长
                let target_time_str = folder.schedule_daily_time.as_deref().unwrap_or("09:00");
                let target_time = NaiveTime::parse_from_str(target_time_str, "%H:%M").ok()?;
                
                let mut target_datetime = now.date_naive().and_time(target_time);
                
                // 如果今天的时间已过，则设置为明天
                if now.time() >= target_time {
                    target_datetime = (now + chrono::Duration::days(1)).date_naive().and_time(target_time);
                }
                
                let wait_duration = (target_datetime - now.naive_local()).to_std().ok()?;
                Some(wait_duration)
            }
            
            Some(ScheduleType::Weekly) => {
                // 每周执行：计算到指定星期和时间的等待时长
                let target_day = folder.schedule_weekly_day.unwrap_or(1); // 默认周一
                let target_time_str = folder.schedule_weekly_time.as_deref().unwrap_or("09:00");
                let target_time = NaiveTime::parse_from_str(target_time_str, "%H:%M").ok()?;
                
                let current_weekday = now.weekday().num_days_from_monday(); // 0=周一, 6=周日
                let target_weekday = match target_day {
                    0 => 6, // 周日 -> 6
                    d => d - 1, // 周一-周六 -> 0-5
                };
                
                // 计算天数差
                let days_until_target = if current_weekday < target_weekday as u32 {
                    target_weekday as i64 - current_weekday as i64
                } else if current_weekday > target_weekday as u32 {
                    7 - (current_weekday as i64 - target_weekday as i64)
                } else {
                    // 同一天，检查时间
                    if now.time() >= target_time {
                        7 // 已过时间，等到下周
                    } else {
                        0 // 今天
                    }
                };
                
                let target_datetime = (now + chrono::Duration::days(days_until_target))
                    .date_naive()
                    .and_time(target_time);
                
                let wait_duration = (target_datetime - now.naive_local()).to_std().ok()?;
                Some(wait_duration)
            }
            
            None => {
                warn!("⚠️ 定时文件夹缺少调度类型配置");
                None
            }
        }
    }

    /// 扫描文件夹并向前端发送文件检测事件
    fn scan_and_emit_folder(
        folder: &crate::config::WatchFolder,
        _config: &AppConfig,
        window: &Window,
    ) {
        use std::path::PathBuf;
        use std::fs;

        let path = PathBuf::from(&folder.path);
        
        if !path.exists() {
            warn!("⚠️ 文件夹不存在: {} ({})", folder.name, folder.path);
            return;
        }

        // 读取文件夹中的所有文件（仅根目录）
        let entries = match fs::read_dir(&path) {
            Ok(entries) => entries,
            Err(e) => {
                error!("❌ 无法读取文件夹 {}: {}", folder.name, e);
                return;
            }
        };

        let mut file_count = 0;
        
        for entry in entries.flatten() {
            let entry_path = entry.path();
            
            // 只处理文件，不处理子文件夹
            if !entry_path.is_file() {
                continue;
            }

            // 跳过临时文件
            if Self::is_temp_file(&entry_path) {
                continue;
            }

            // 获取文件路径字符串
            let file_path_str = match entry_path.to_str() {
                Some(s) => s.to_string(),
                None => continue,
            };

            // 发送文件检测事件到前端
            if let Err(e) = window.emit("file-detected", file_path_str.clone()) {
                error!("❌ 无法发送文件检测事件: {} - {}", file_path_str, e);
            } else {
                file_count += 1;
            }
        }

        info!("✅ {} 扫描完成，发现 {} 个文件", folder.name, file_count);
    }

    /// 判断是否为临时文件
    fn is_temp_file(path: &std::path::Path) -> bool {
        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
            // 常见的临时文件模式
            name.starts_with("~$")          // Office临时文件
                || name.starts_with(".")    // 隐藏文件
                || name.ends_with(".tmp")   // 临时文件
                || name.ends_with(".temp")
                || name.ends_with(".crdownload") // Chrome下载中
                || name.ends_with(".part")  // Firefox下载中
                || name.ends_with(".download")
        } else {
            false
        }
    }
}

