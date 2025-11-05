// 文件内容解析模块
// 提供可扩展的文件内容分析框架

mod pdf_parser;
mod image_parser;
pub mod registry;

pub use pdf_parser::PdfParser;
pub use image_parser::ImageParser;
pub use registry::{ParserRegistry, ParserInfo};

use std::path::Path;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// 解析后的文件内容
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedContent {
    /// 提取的文本内容（如果适用）
    pub text: Option<String>,
    
    /// 结构化元数据
    pub metadata: HashMap<String, MetadataValue>,
    
    /// 解析耗时（毫秒）
    pub parse_time_ms: u64,
    
    /// 解析器名称
    pub parser_name: String,
}

/// 元数据值类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum MetadataValue {
    String(String),
    Number(f64),
    Boolean(bool),
    Array(Vec<String>),
}

impl MetadataValue {
    pub fn as_string(&self) -> Option<String> {
        match self {
            MetadataValue::String(s) => Some(s.clone()),
            MetadataValue::Number(n) => Some(n.to_string()),
            MetadataValue::Boolean(b) => Some(b.to_string()),
            MetadataValue::Array(arr) => Some(arr.join(", ")),
        }
    }
    
    pub fn as_number(&self) -> Option<f64> {
        match self {
            MetadataValue::Number(n) => Some(*n),
            MetadataValue::String(s) => s.parse().ok(),
            _ => None,
        }
    }
}

/// 内容解析器 Trait（核心接口）
pub trait ContentParser: Send + Sync {
    /// 解析器名称
    fn name(&self) -> &str;
    
    /// 支持的文件扩展名（小写）
    fn supported_extensions(&self) -> Vec<&str>;
    
    /// 判断是否可以解析该文件
    fn can_parse(&self, file_path: &Path) -> bool {
        file_path
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| {
                let ext_lower = ext.to_lowercase();
                self.supported_extensions()
                    .iter()
                    .any(|&supported| supported == ext_lower)
            })
            .unwrap_or(false)
    }
    
    /// 解析文件内容
    fn parse(&self, file_path: &Path) -> Result<ParsedContent, String>;
    
    /// 最大支持的文件大小（字节），默认10MB
    fn max_file_size(&self) -> u64 {
        10 * 1024 * 1024 // 10MB
    }
}

