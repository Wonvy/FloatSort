// PDF文件解析器
use super::{ContentParser, ParsedContent, MetadataValue};
use std::path::Path;
use std::time::Instant;
use std::collections::HashMap;

pub struct PdfParser;

impl PdfParser {
    pub fn new() -> Self {
        Self
    }
}

impl ContentParser for PdfParser {
    fn name(&self) -> &str {
        "PDF Parser"
    }
    
    fn supported_extensions(&self) -> Vec<&str> {
        vec!["pdf"]
    }
    
    fn parse(&self, file_path: &Path) -> Result<ParsedContent, String> {
        let start = Instant::now();
        
        // 检查文件是否存在
        if !file_path.exists() {
            return Err("文件不存在".to_string());
        }
        
        // 检查文件大小
        let file_size = std::fs::metadata(file_path)
            .map_err(|e| format!("无法读取文件元数据: {}", e))?
            .len();
        
        if file_size > self.max_file_size() {
            return Err(format!(
                "文件过大 ({:.2}MB)，超过限制 ({:.2}MB)",
                file_size as f64 / 1024.0 / 1024.0,
                self.max_file_size() as f64 / 1024.0 / 1024.0
            ));
        }
        
        // 使用 pdf-extract 提取文本
        let text = match pdf_extract::extract_text(file_path) {
            Ok(content) => {
                // 清理文本：去除多余空白
                let cleaned = content
                    .lines()
                    .map(|line| line.trim())
                    .filter(|line| !line.is_empty())
                    .collect::<Vec<_>>()
                    .join("\n");
                Some(cleaned)
            },
            Err(e) => {
                tracing::warn!("PDF文本提取失败: {}, 错误: {}", file_path.display(), e);
                None
            }
        };
        
        // 提取元数据
        let mut metadata = HashMap::new();
        
        // 文件大小
        metadata.insert(
            "file_size".to_string(),
            MetadataValue::Number(file_size as f64)
        );
        
        metadata.insert(
            "file_size_mb".to_string(),
            MetadataValue::Number((file_size as f64 / 1024.0 / 1024.0 * 100.0).round() / 100.0)
        );
        
        // 字符数
        if let Some(ref txt) = text {
            metadata.insert(
                "char_count".to_string(),
                MetadataValue::Number(txt.chars().count() as f64)
            );
            
            metadata.insert(
                "word_count".to_string(),
                MetadataValue::Number(txt.split_whitespace().count() as f64)
            );
            
            metadata.insert(
                "line_count".to_string(),
                MetadataValue::Number(txt.lines().count() as f64)
            );
        }
        
        // 尝试使用 lopdf 获取更详细的元数据
        if let Ok(doc) = lopdf::Document::load(file_path) {
            // 页数
            metadata.insert(
                "page_count".to_string(),
                MetadataValue::Number(doc.get_pages().len() as f64)
            );
            
            // PDF版本
            let version_str = doc.version.to_string();
            metadata.insert(
                "pdf_version".to_string(),
                MetadataValue::String(version_str)
            );
            
            // 尝试获取文档信息
            if let Ok(info) = doc.trailer.get(b"Info") {
                if let Ok(info_ref) = info.as_reference() {
                    if let Ok(info_dict) = doc.get_object(info_ref) {
                        if let Ok(dict) = info_dict.as_dict() {
                            // 标题
                            if let Ok(title) = dict.get(b"Title") {
                                if let Ok(title_bytes) = title.as_str() {
                                    let title_string = String::from_utf8_lossy(title_bytes).to_string();
                                    metadata.insert("title".to_string(), MetadataValue::String(title_string));
                                }
                            }
                            
                            // 作者
                            if let Ok(author) = dict.get(b"Author") {
                                if let Ok(author_bytes) = author.as_str() {
                                    let author_string = String::from_utf8_lossy(author_bytes).to_string();
                                    metadata.insert("author".to_string(), MetadataValue::String(author_string));
                                }
                            }
                            
                            // 主题
                            if let Ok(subject) = dict.get(b"Subject") {
                                if let Ok(subject_bytes) = subject.as_str() {
                                    let subject_string = String::from_utf8_lossy(subject_bytes).to_string();
                                    metadata.insert("subject".to_string(), MetadataValue::String(subject_string));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        let parse_time_ms = start.elapsed().as_millis() as u64;
        
        Ok(ParsedContent {
            text,
            metadata,
            parse_time_ms,
            parser_name: self.name().to_string(),
        })
    }
    
    fn max_file_size(&self) -> u64 {
        20 * 1024 * 1024 // PDF可以支持到20MB
    }
}

