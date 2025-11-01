use crate::models::Rule;
use crate::i18n;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// 触发模式
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TriggerMode {
    /// 立即执行
    Immediate,
    /// 手动确认
    Manual,
    /// 启动时执行
    OnStartup,
    /// 定时执行
    Scheduled,
}

impl Default for TriggerMode {
    fn default() -> Self {
        TriggerMode::Manual
    }
}

/// 定时类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleType {
    /// 间隔执行（每N分钟）
    Interval,
    /// 每天执行
    Daily,
    /// 每周执行
    Weekly,
}

/// 文件处理模式（兼容旧版本）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProcessingMode {
    /// 自动处理
    Auto,
    /// 手动处理（需要确认）
    Manual,
}

impl Default for ProcessingMode {
    fn default() -> Self {
        ProcessingMode::Manual
    }
}

/// 监控文件夹配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchFolder {
    /// 文件夹 ID
    pub id: String,
    
    /// 文件夹路径
    pub path: String,
    
    /// 文件夹名称（用于显示）
    pub name: String,
    
    /// 是否启用监控
    pub enabled: bool,
    
    /// 关联的规则 ID 列表
    pub rule_ids: Vec<String>,
    
    /// 文件处理模式（默认为手动）- 兼容旧版本
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub processing_mode: Option<ProcessingMode>,
    
    /// 触发模式（新版本）
    #[serde(default)]
    pub trigger_mode: TriggerMode,
    
    /// 定时类型
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_type: Option<ScheduleType>,
    
    /// 间隔分钟数（用于 Interval 类型）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_interval_minutes: Option<u32>,
    
    /// 每天执行时间（用于 Daily 类型）格式: "HH:MM"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_daily_time: Option<String>,
    
    /// 每周星期几（用于 Weekly 类型）0=周日, 1=周一, ..., 6=周六
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_weekly_day: Option<u8>,
    
    /// 每周执行时间（用于 Weekly 类型）格式: "HH:MM"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_weekly_time: Option<String>,
}

impl WatchFolder {
    /// 迁移旧的 processing_mode 到新的 trigger_mode
    pub fn migrate_processing_mode(&mut self) {
        if let Some(old_mode) = &self.processing_mode {
            self.trigger_mode = match old_mode {
                ProcessingMode::Auto => TriggerMode::Immediate,
                ProcessingMode::Manual => TriggerMode::Manual,
            };
            self.processing_mode = None; // 清除旧字段
        }
    }
    
    /// 获取触发模式的显示文本
    #[allow(dead_code)]
    pub fn get_trigger_display(&self) -> String {
        match &self.trigger_mode {
            TriggerMode::Immediate => "立即执行".to_string(),
            TriggerMode::Manual => "手动确认".to_string(),
            TriggerMode::OnStartup => "启动时执行".to_string(),
            TriggerMode::Scheduled => {
                match &self.schedule_type {
                    Some(ScheduleType::Interval) => {
                        let minutes = self.schedule_interval_minutes.unwrap_or(30);
                        if minutes < 60 {
                            format!("每{}分钟", minutes)
                        } else {
                            let hours = minutes / 60;
                            format!("每{}小时", hours)
                        }
                    }
                    Some(ScheduleType::Daily) => {
                        let time = self.schedule_daily_time.as_deref().unwrap_or("09:00");
                        format!("每天 {}", time)
                    }
                    Some(ScheduleType::Weekly) => {
                        let day = self.schedule_weekly_day.unwrap_or(1);
                        let time = self.schedule_weekly_time.as_deref().unwrap_or("09:00");
                        let day_name = match day {
                            0 => "周日",
                            1 => "周一",
                            2 => "周二",
                            3 => "周三",
                            4 => "周四",
                            5 => "周五",
                            6 => "周六",
                            _ => "周一",
                        };
                        format!("每{} {}", day_name, time)
                    }
                    None => "定时执行".to_string(),
                }
            }
        }
    }
}

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 配置文件版本（用于迁移）
    #[serde(default = "default_version")]
    pub version: u32,
    
    /// 监控文件夹列表
    #[serde(default)]
    pub folders: Vec<WatchFolder>,
    
    /// 整理规则列表（全局规则库）
    pub rules: Vec<Rule>,
    
    /// 是否显示通知
    pub show_notifications: bool,
    
    /// 日志级别
    pub log_level: String,
    
    /// 批量确认阈值（超过此数量的文件需要确认）
    #[serde(default = "default_batch_threshold")]
    pub batch_threshold: u32,
    
    /// 窗口宽度
    #[serde(default = "default_window_width")]
    pub window_width: u32,
    
    /// 窗口高度
    #[serde(default = "default_window_height")]
    pub window_height: u32,
    
    /// 动画效果: none, fade, slide
    #[serde(default = "default_animation")]
    pub animation: String,
    
    /// 动画速度: fast, normal, slow
    #[serde(default = "default_animation_speed")]
    pub animation_speed: String,
    
    /// 界面语言: zh-CN, en-US, ja-JP
    #[serde(default = "default_language")]
    pub language: String,
    
    /// 文件稳定性检查延迟（秒）- 检测到文件后等待多久再检查稳定性
    #[serde(default = "default_stability_delay")]
    pub file_stability_delay: u32,
    
    /// 文件稳定性检查次数 - 需要连续几次检查文件都稳定才处理
    #[serde(default = "default_stability_checks")]
    pub file_stability_checks: u32,
    
    /// 日志保留天数 - 自动清理超过此天数的日志文件，-1表示永久保留
    #[serde(default = "default_log_retention_days")]
    pub log_retention_days: i32,
    
    /// 窗口X位置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_x: Option<i32>,
    
    /// 窗口Y位置
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_y: Option<i32>,
    
    /// 窗口是否处于折叠状态
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_collapsed: Option<bool>,
    
    /// 折叠在哪个边缘: Top, Left, Right
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapsed_edge: Option<String>,
    
    // 保留旧字段以支持迁移
    #[serde(skip_serializing, default)]
    pub watch_paths: Option<Vec<String>>,
    
    #[serde(skip_serializing, default)]
    pub auto_start: Option<bool>,
}

fn default_version() -> u32 {
    2
}

fn default_batch_threshold() -> u32 {
    1
}

fn default_window_width() -> u32 {
    500
}

fn default_animation() -> String {
    "none".to_string()
}

fn default_animation_speed() -> String {
    "normal".to_string()
}

fn default_language() -> String {
    "zh-CN".to_string()
}

fn default_stability_delay() -> u32 {
    3  // 默认等待3秒
}

fn default_stability_checks() -> u32 {
    2  // 默认检查2次
}

fn default_log_retention_days() -> i32 {
    30  // 默认保留30天
}

fn default_window_height() -> u32 {
    750
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: 2,
            folders: vec![],
            rules: vec![
                // 默认规则示例
                Rule {
                    id: "rule_images".to_string(),
                    name: "图片文件归类".to_string(),
                    enabled: true,
                    logic: "and".to_string(),
                    conditions: vec![
                        crate::models::RuleCondition::Extension {
                            values: vec![
                                "jpg".to_string(),
                                "jpeg".to_string(),
                                "png".to_string(),
                                "gif".to_string(),
                                "bmp".to_string(),
                                "svg".to_string(),
                            ],
                        },
                    ],
                    action: crate::models::RuleAction::MoveTo {
                        destination: "Pictures".to_string(),
                    },
                    priority: 1,
                    conflict_strategy: crate::models::ConflictStrategy::Skip,
                },
                Rule {
                    id: "rule_documents".to_string(),
                    name: "文档文件归类".to_string(),
                    enabled: true,
                    logic: "and".to_string(),
                    conditions: vec![
                        crate::models::RuleCondition::Extension {
                            values: vec![
                                "pdf".to_string(),
                                "doc".to_string(),
                                "docx".to_string(),
                                "txt".to_string(),
                                "md".to_string(),
                            ],
                        },
                    ],
                    action: crate::models::RuleAction::MoveTo {
                        destination: "Documents".to_string(),
                    },
                    priority: 2,
                    conflict_strategy: crate::models::ConflictStrategy::Skip,
                },
            ],
            show_notifications: true,
            log_level: "info".to_string(),
            batch_threshold: 1,
            window_width: 500,
            window_height: 750,
            animation: "none".to_string(),
            animation_speed: "normal".to_string(),
            language: default_language(),
            file_stability_delay: default_stability_delay(),
            file_stability_checks: default_stability_checks(),
            log_retention_days: default_log_retention_days(),
            window_x: None,
            window_y: None,
            is_collapsed: None,
            collapsed_edge: None,
            watch_paths: None,
            auto_start: None,
        }
    }
}

impl AppConfig {
    /// 从文件加载配置并自动迁移
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .with_context(|| format!("无法读取配置文件: {:?}", path))?;
        
        let mut config: AppConfig = serde_json::from_str(&content)
            .with_context(|| "配置文件格式错误")?;
        
        // 自动迁移旧版本配置
        if config.version < 2 {
            config = Self::migrate_v1_to_v2(config)?;
            info!("配置已从 V1 迁移到 V2");
            // 保存迁移后的配置
            config.save_to_file(path)?;
        }
        
        // 迁移 processing_mode 到 trigger_mode（所有版本都需要）
        let mut migrated = false;
        for folder in config.folders.iter_mut() {
            if folder.processing_mode.is_some() {
                folder.migrate_processing_mode();
                migrated = true;
            }
        }
        
        if migrated {
            info!("已迁移 processing_mode 到新的 trigger_mode");
            // 保存迁移后的配置
            config.save_to_file(path)?;
        }
        
        info!("配置已从 {:?} 加载 (版本: {})", path, config.version);
        Ok(config)
    }
    
    /// 将 V1 配置迁移到 V2
    fn migrate_v1_to_v2(old_config: AppConfig) -> Result<Self> {
        let mut folders = Vec::new();
        
        // 迁移旧的 watch_paths 到 folders
        if let Some(watch_paths) = old_config.watch_paths {
            for (index, path) in watch_paths.iter().enumerate() {
                let folder_name = Path::new(path)
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("未命名文件夹")
                    .to_string();
                
                folders.push(WatchFolder {
                    id: format!("folder_{}", index + 1),
                    path: path.clone(),
                    name: folder_name,
                    enabled: old_config.auto_start.unwrap_or(false),
                    rule_ids: old_config.rules.iter().map(|r| r.id.clone()).collect(),
                    processing_mode: Some(ProcessingMode::Manual),
                    trigger_mode: TriggerMode::Manual,
                    schedule_type: None,
                    schedule_interval_minutes: None,
                    schedule_daily_time: None,
                    schedule_weekly_day: None,
                    schedule_weekly_time: None,
                });
            }
        }
        
        Ok(AppConfig {
            version: 2,
            folders,
            rules: old_config.rules,
            show_notifications: old_config.show_notifications,
            log_level: old_config.log_level,
            batch_threshold: 1,
            window_width: 500,
            window_height: 750,
            animation: "none".to_string(),
            animation_speed: "normal".to_string(),
            language: default_language(),
            file_stability_delay: default_stability_delay(),
            file_stability_checks: default_stability_checks(),
            log_retention_days: default_log_retention_days(),
            window_x: None,
            window_y: None,
            is_collapsed: None,
            collapsed_edge: None,
            watch_paths: None,
            auto_start: None,
        })
    }

    /// 加载配置或使用默认值
    pub fn load_or_default<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        
        if path.exists() {
            Self::load_from_file(path)
        } else {
            warn!("{}", i18n::t("config.not_found"));
            let config = Self::default();
            
            // 尝试保存默认配置
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            config.save_to_file(path)?;
            
            Ok(config)
        }
    }

    /// 保存配置到文件
    pub fn save_to_file<P: AsRef<Path>>(&self, path: P) -> Result<()> {
        let path = path.as_ref();
        
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        
        let content = serde_json::to_string_pretty(self)?;
        fs::write(path, content)
            .with_context(|| format!("无法写入配置文件: {:?}", path))?;
        
        info!("{} {:?}", i18n::t("config.saved"), path);
        Ok(())
    }
}


