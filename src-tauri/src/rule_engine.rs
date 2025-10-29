use crate::models::{FileInfo, Rule, RuleAction, RuleCondition};
use regex::Regex;
use std::path::Path;
use tracing::debug;
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
            if self.check_conditions(&rule.conditions, &rule.logic, file_info) {
                debug!("文件 {} 匹配规则: {}", file_info.name, rule.name);
                return Some(rule);
            }
        }

        None
    }

    /// 检查所有条件是否满足
    fn check_conditions(&self, conditions: &[RuleCondition], logic: &str, file_info: &FileInfo) -> bool {
        if conditions.is_empty() {
            return false;
        }

        match logic {
            "and" => {
                // AND 逻辑：所有条件都必须满足
                conditions.iter().all(|condition| {
                    self.check_single_condition(condition, file_info)
                })
            }
            "or" | _ => {
                // OR 逻辑：满足任一条件即可（默认）
                conditions.iter().any(|condition| {
                    self.check_single_condition(condition, file_info)
                })
            }
        }
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

    /// 解析路径中的占位符
    fn resolve_placeholders(&self, template: &str, file_info: &FileInfo) -> String {
        let mut result = template.to_string();
        
        // 文件名（不含扩展名）
        let name_without_ext = file_info.name
            .strip_suffix(&format!(".{}", file_info.extension))
            .unwrap_or(&file_info.name);
        result = result.replace("{name}", name_without_ext);
        
        // 扩展名
        result = result.replace("{ext}", &file_info.extension);
        
        // 时间相关占位符 - 优先使用修改时间，其次是创建时间
        let datetime = file_info.modified_at.or(file_info.created_at);
        
        if let Some(dt) = datetime {
            result = result.replace("{year}", &dt.format("%Y").to_string());
            result = result.replace("{month}", &dt.format("%m").to_string());
            result = result.replace("{day}", &dt.format("%d").to_string());
        } else {
            // 如果没有时间信息，使用当前时间
            let now = Utc::now();
            result = result.replace("{year}", &now.format("%Y").to_string());
            result = result.replace("{month}", &now.format("%m").to_string());
            result = result.replace("{day}", &now.format("%d").to_string());
        }
        
        result
    }
    
    /// 获取目标路径
    pub fn get_destination_path(&self, action: &RuleAction, file_info: &FileInfo, base_path: &Path) -> Option<String> {
        match action {
            RuleAction::MoveTo { destination } | RuleAction::CopyTo { destination } => {
                // 解析占位符
                let resolved_destination = self.resolve_placeholders(destination, file_info);
                
                let dest_path = if Path::new(&resolved_destination).is_absolute() {
                    Path::new(&resolved_destination).to_path_buf()
                } else {
                    base_path.join(&resolved_destination)
                };
                Some(dest_path.to_string_lossy().to_string())
            }
            RuleAction::Rename { pattern } => {
                // 解析占位符
                let new_name = self.resolve_placeholders(pattern, file_info);
                
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


