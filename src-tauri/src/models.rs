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
    pub is_directory: bool,
}

/// 规则条件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RuleCondition {
    /// 文件类型（文件或文件夹）
    FileType { file_type: String },
    
    /// 文件扩展名匹配
    Extension { values: Vec<String> },
    
    /// 文件大小范围（字节）
    SizeRange { min: Option<u64>, max: Option<u64> },
    
    /// 文件名包含
    NameContains { pattern: String },
    
    /// 文件名匹配正则表达式
    NameRegex { pattern: String },
    
    /// 创建时间范围（天数）- 已弃用，保留用于兼容
    CreatedDaysAgo { min: Option<u64>, max: Option<u64> },
    
    /// 修改时间范围（天数）- 已弃用，保留用于兼容
    ModifiedDaysAgo { min: Option<u64>, max: Option<u64> },
    
    /// 创建时间条件（新版）
    CreatedTime { 
        /// 时间类型：relative(相对时间) 或 absolute(绝对时间)
        time_type: String,
        /// 比较方式：before(之前) 或 after(之后)
        comparison: String,
        /// 相对时间：天数
        days: Option<u64>,
        /// 绝对时间：ISO 8601格式的日期时间字符串
        datetime: Option<String>,
    },
    
    /// 修改时间条件（新版）
    ModifiedTime {
        /// 时间类型：relative(相对时间) 或 absolute(绝对时间)
        time_type: String,
        /// 比较方式：before(之前) 或 after(之后)
        comparison: String,
        /// 相对时间：天数
        days: Option<u64>,
        /// 绝对时间：ISO 8601格式的日期时间字符串
        datetime: Option<String>,
    },
}

/// 文件冲突处理策略
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConflictStrategy {
    /// 跳过（默认）
    Skip,
    /// 覆盖
    Overwrite,
    /// 重命名为副本
    Rename,
}

impl Default for ConflictStrategy {
    fn default() -> Self {
        ConflictStrategy::Skip
    }
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
    /// 条件逻辑运算符: 固定为 "and"（所有条件必须同时满足）
    #[serde(default = "default_logic")]
    pub logic: String,
    pub conditions: Vec<RuleCondition>,
    pub action: RuleAction,
    pub priority: i32,
    /// 文件冲突处理策略（默认为跳过）
    #[serde(default)]
    pub conflict_strategy: ConflictStrategy,
    /// 规则图标（Bootstrap Icons类名，如 "bi bi-file-earmark"）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    /// 自定义SVG图标代码
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_svg: Option<String>,
    /// 图标颜色（十六进制颜色值）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

fn default_logic() -> String {
    "and".to_string()
}

/// 文件事件
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
pub struct FileEvent {
    pub event_type: String,
    pub file_path: String,
    pub timestamp: DateTime<Utc>,
}


