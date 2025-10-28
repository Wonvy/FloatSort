use crate::models::Rule;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tracing::{info, warn};

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
    360
}

fn default_window_height() -> u32 {
    520
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
                },
                Rule {
                    id: "rule_documents".to_string(),
                    name: "文档文件归类".to_string(),
                    enabled: true,
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
                },
            ],
            show_notifications: true,
            log_level: "info".to_string(),
            batch_threshold: 1,
            window_width: 360,
            window_height: 520,
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
            window_width: 360,
            window_height: 520,
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
            warn!("配置文件不存在，使用默认配置");
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
        
        info!("配置已保存到 {:?}", path);
        Ok(())
    }
}


