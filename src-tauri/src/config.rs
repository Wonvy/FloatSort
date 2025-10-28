use crate::models::Rule;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// 应用配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// 监控的文件夹路径列表
    pub watch_paths: Vec<String>,
    
    /// 整理规则列表
    pub rules: Vec<Rule>,
    
    /// 是否自动启动监控
    pub auto_start: bool,
    
    /// 是否显示通知
    pub show_notifications: bool,
    
    /// 日志级别
    pub log_level: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            watch_paths: vec![],
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
            auto_start: false,
            show_notifications: true,
            log_level: "info".to_string(),
        }
    }
}

impl AppConfig {
    /// 从文件加载配置
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self> {
        let path = path.as_ref();
        let content = fs::read_to_string(path)
            .with_context(|| format!("无法读取配置文件: {:?}", path))?;
        
        let config: AppConfig = serde_json::from_str(&content)
            .with_context(|| "配置文件格式错误")?;
        
        info!("配置已从 {:?} 加载", path);
        Ok(config)
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


