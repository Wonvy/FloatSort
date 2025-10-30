use crate::models::{FileInfo, Rule, RuleAction, RuleCondition};
use regex::Regex;
use std::path::Path;
use tracing::debug;
use chrono::Utc;

/// 规则匹配结果
#[derive(Debug)]
pub struct RuleMatch<'a> {
    pub rule: &'a Rule,
    pub regex_captures: Vec<String>,  // 正则表达式捕获组
}

/// 规则引擎
pub struct RuleEngine {
    rules: Vec<Rule>,
}

impl RuleEngine {
    /// 创建新的规则引擎
    pub fn new(rules: Vec<Rule>) -> Self {
        Self { rules }
    }

    /// 为文件查找匹配的规则（返回匹配结果，包含捕获组）
    pub fn find_matching_rule<'a>(&'a self, file_info: &FileInfo) -> Option<RuleMatch<'a>> {
        // 按优先级排序（已启用的规则）
        let mut enabled_rules: Vec<&Rule> = self.rules
            .iter()
            .filter(|r| r.enabled)
            .collect();
        
        enabled_rules.sort_by_key(|r| r.priority);

        // 找到第一个匹配的规则
        for rule in enabled_rules {
            if let Some(captures) = self.check_conditions_with_captures(&rule.conditions, &rule.logic, file_info) {
                debug!("文件 {} 匹配规则: {}", file_info.name, rule.name);
                return Some(RuleMatch {
                    rule,
                    regex_captures: captures,
                });
            }
        }

        None
    }

    /// 检查所有条件是否满足，并返回正则表达式捕获组
    fn check_conditions_with_captures(&self, conditions: &[RuleCondition], _logic: &str, file_info: &FileInfo) -> Option<Vec<String>> {
        if conditions.is_empty() {
            return None;
        }

        let mut regex_captures = Vec::new();

        // 固定使用 AND 逻辑：所有条件都必须满足
        for condition in conditions {
            match condition {
                RuleCondition::NameRegex { pattern } => {
                    if let Ok(regex) = Regex::new(pattern) {
                        if let Some(caps) = regex.captures(&file_info.name) {
                            // 提取所有捕获组（跳过第0个，因为它是整个匹配）
                            for i in 1..caps.len() {
                                if let Some(m) = caps.get(i) {
                                    regex_captures.push(m.as_str().to_string());
                                }
                            }
                            // 继续检查其他条件
                        } else {
                            return None;  // 正则不匹配，整个规则不匹配
                        }
                    } else {
                        return None;  // 正则表达式无效
                    }
                }
                _ => {
                    // 检查其他条件
                    if !self.check_single_condition(condition, file_info) {
                        return None;  // 有条件不满足
                    }
                }
            }
        }

        Some(regex_captures)
    }

    /// 检查单个条件
    fn check_single_condition(&self, condition: &RuleCondition, file_info: &FileInfo) -> bool {
        match condition {
            RuleCondition::FileType { file_type } => {
                match file_type.as_str() {
                    "file" => !file_info.is_directory,
                    "folder" => file_info.is_directory,
                    "both" => true,  // 同时应用于文件和文件夹
                    _ => false,
                }
            }

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

            RuleCondition::CreatedTime { time_type, comparison, days, datetime } => {
                if let Some(created) = file_info.created_at {
                    let now = Utc::now();
                    
                    let target_time = if time_type == "relative" {
                        // 相对时间：计算N天前的时间
                        if let Some(d) = days {
                            now - chrono::Duration::days(*d as i64)
                        } else {
                            return false;
                        }
                    } else if time_type == "absolute" {
                        // 绝对时间：解析日期时间字符串
                        if let Some(dt_str) = datetime {
                            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(dt_str) {
                                dt.with_timezone(&Utc)
                            } else {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    };
                    
                    // 根据比较方式判断
                    match comparison.as_str() {
                        "before" => created < target_time,
                        "after" => created > target_time,
                        _ => false,
                    }
                } else {
                    false
                }
            }

            RuleCondition::ModifiedTime { time_type, comparison, days, datetime } => {
                if let Some(modified) = file_info.modified_at {
                    let now = Utc::now();
                    
                    let target_time = if time_type == "relative" {
                        // 相对时间：计算N天前的时间
                        if let Some(d) = days {
                            now - chrono::Duration::days(*d as i64)
                        } else {
                            return false;
                        }
                    } else if time_type == "absolute" {
                        // 绝对时间：解析日期时间字符串
                        if let Some(dt_str) = datetime {
                            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(dt_str) {
                                dt.with_timezone(&Utc)
                            } else {
                                return false;
                            }
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    };
                    
                    // 根据比较方式判断
                    match comparison.as_str() {
                        "before" => modified < target_time,
                        "after" => modified > target_time,
                        _ => false,
                    }
                } else {
                    false
                }
            }
        }
    }

    /// 解析路径中的占位符
    fn resolve_placeholders(&self, template: &str, file_info: &FileInfo, regex_captures: &[String]) -> String {
        let mut result = template.to_string();
        
        // 正则表达式捕获组 - 支持 $1, $2, $3... 或 ${1}, ${2}, ${3}...
        for (i, capture) in regex_captures.iter().enumerate() {
            let index = i + 1;
            result = result.replace(&format!("${}", index), capture);
            result = result.replace(&format!("${{{}}}", index), capture);
        }
        
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
    
    /// 获取目标路径（支持正则捕获组）
    pub fn get_destination_path(&self, action: &RuleAction, file_info: &FileInfo, base_path: &Path, regex_captures: &[String]) -> Option<String> {
        match action {
            RuleAction::MoveTo { destination } | RuleAction::CopyTo { destination } => {
                // 检查是否为回收站特殊路径
                if destination == "{recycle}" {
                    return Some("{recycle}".to_string());
                }
                
                // 解析占位符（包括正则捕获组）
                let resolved_destination = self.resolve_placeholders(destination, file_info, regex_captures);
                
                let dest_path = if Path::new(&resolved_destination).is_absolute() {
                    Path::new(&resolved_destination).to_path_buf()
                } else {
                    base_path.join(&resolved_destination)
                };
                Some(dest_path.to_string_lossy().to_string())
            }
            RuleAction::Rename { pattern } => {
                // 解析占位符（包括正则捕获组）
                let new_name = self.resolve_placeholders(pattern, file_info, regex_captures);
                
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
            is_directory: false,
        };

        assert!(engine.find_matching_rule(&file_info).is_some());
    }
}


