use crate::models::{FileInfo, Rule, RuleAction, RuleCondition};
use anyhow::{Context, Result};
use regex::Regex;
use std::path::Path;
use tracing::{debug, info};
use chrono::Utc;

/// 规则引擎
pub struct RuleEngine {
    rules: Vec<Rule>,
}

impl RuleEngine {
    /// 创建新的规则引擎
    pub fn new(rules: Vec<Rule>) -> Self {
        Self { rules }
    }

    /// 为文件查找匹配的规则
    pub fn find_matching_rule(&self, file_info: &FileInfo) -> Option<&Rule> {
        // 按优先级排序（已启用的规则）
        let mut enabled_rules: Vec<&Rule> = self.rules
            .iter()
            .filter(|r| r.enabled)
            .collect();
        
        enabled_rules.sort_by_key(|r| r.priority);

        // 找到第一个匹配的规则
        for rule in enabled_rules {
            if self.check_conditions(&rule.conditions, file_info) {
                debug!("文件 {} 匹配规则: {}", file_info.name, rule.name);
                return Some(rule);
            }
        }

        None
    }

    /// 检查所有条件是否满足
    fn check_conditions(&self, conditions: &[RuleCondition], file_info: &FileInfo) -> bool {
        if conditions.is_empty() {
            return false;
        }

        // 所有条件都必须满足（AND 逻辑）
        conditions.iter().all(|condition| {
            self.check_single_condition(condition, file_info)
        })
    }

    /// 检查单个条件
    fn check_single_condition(&self, condition: &RuleCondition, file_info: &FileInfo) -> bool {
        match condition {
            RuleCondition::Extension { values } => {
                let ext = file_info.extension.to_lowercase();
                values.iter().any(|v| v.to_lowercase() == ext)
            }

            RuleCondition::SizeRange { min, max } => {
                let size = file_info.size;
                let min_ok = min.map_or(true, |m| size >= m);
                let max_ok = max.map_or(true, |m| size <= m);
                min_ok && max_ok
            }

            RuleCondition::NameContains { pattern } => {
                file_info.name.to_lowercase().contains(&pattern.to_lowercase())
            }

            RuleCondition::NameRegex { pattern } => {
                if let Ok(regex) = Regex::new(pattern) {
                    regex.is_match(&file_info.name)
                } else {
                    false
                }
            }

            RuleCondition::CreatedDaysAgo { min, max } => {
                if let Some(created) = file_info.created_at {
                    let now = Utc::now();
                    let days = (now - created).num_days() as u64;
                    let min_ok = min.map_or(true, |m| days >= m);
                    let max_ok = max.map_or(true, |m| days <= m);
                    min_ok && max_ok
                } else {
                    false
                }
            }

            RuleCondition::ModifiedDaysAgo { min, max } => {
                if let Some(modified) = file_info.modified_at {
                    let now = Utc::now();
                    let days = (now - modified).num_days() as u64;
                    let min_ok = min.map_or(true, |m| days >= m);
                    let max_ok = max.map_or(true, |m| days <= m);
                    min_ok && max_ok
                } else {
                    false
                }
            }
        }
    }

    /// 获取目标路径
    pub fn get_destination_path(&self, action: &RuleAction, file_info: &FileInfo, base_path: &Path) -> Option<String> {
        match action {
            RuleAction::MoveTo { destination } | RuleAction::CopyTo { destination } => {
                let dest_path = if Path::new(destination).is_absolute() {
                    Path::new(destination).to_path_buf()
                } else {
                    base_path.join(destination)
                };
                Some(dest_path.to_string_lossy().to_string())
            }
            RuleAction::Rename { pattern } => {
                // 简单的模板替换
                let new_name = pattern
                    .replace("{name}", &file_info.name)
                    .replace("{ext}", &file_info.extension);
                
                let parent = Path::new(&file_info.path).parent()?;
                Some(parent.join(new_name).to_string_lossy().to_string())
            }
            RuleAction::Delete => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{FileInfo, Rule, RuleAction, RuleCondition};

    #[test]
    fn test_extension_condition() {
        let rule = Rule {
            id: "test".to_string(),
            name: "Test Rule".to_string(),
            enabled: true,
            conditions: vec![RuleCondition::Extension {
                values: vec!["jpg".to_string(), "png".to_string()],
            }],
            action: RuleAction::MoveTo {
                destination: "Images".to_string(),
            },
            priority: 1,
        };

        let engine = RuleEngine::new(vec![rule]);

        let file_info = FileInfo {
            path: "test.jpg".to_string(),
            name: "test.jpg".to_string(),
            extension: "jpg".to_string(),
            size: 1024,
            created_at: None,
            modified_at: None,
        };

        assert!(engine.find_matching_rule(&file_info).is_some());
    }
}


