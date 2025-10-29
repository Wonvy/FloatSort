use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 文件信息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub created_at: Option<DateTime<Utc>>,
    pub modified_at: Option<DateTime<Utc>>,
}

/// 规则条件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RuleCondition {
    /// 文件扩展名匹配
    Extension { values: Vec<String> },
    
    /// 文件大小范围（字节）
    SizeRange { min: Option<u64>, max: Option<u64> },
    
    /// 文件名包含
    NameContains { pattern: String },
    
    /// 文件名匹配正则表达式
    NameRegex { pattern: String },
    
    /// 创建时间范围（天数）
    CreatedDaysAgo { min: Option<u64>, max: Option<u64> },
    
    /// 修改时间范围（天数）
    ModifiedDaysAgo { min: Option<u64>, max: Option<u64> },
}

/// 规则动作
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RuleAction {
    /// 移动到指定目录
    MoveTo { destination: String },
    
    /// 复制到指定目录
    CopyTo { destination: String },
    
    /// 重命名（支持模板）
    Rename { pattern: String },
    
    /// 删除文件
    Delete,
}

/// 整理规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub id: String,
    pub name: String,
    pub enabled: bool,
    /// 条件逻辑运算符: "or" 或 "and"
    #[serde(default = "default_logic")]
    pub logic: String,
    pub conditions: Vec<RuleCondition>,
    pub action: RuleAction,
    pub priority: i32,
}

fn default_logic() -> String {
    "or".to_string()
}

/// 文件事件
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
pub struct FileEvent {
    pub event_type: String,
    pub file_path: String,
    pub timestamp: DateTime<Utc>,
}


