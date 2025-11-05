// 解析器注册表
use super::{ContentParser, ParsedContent, PdfParser, ImageParser};
use std::path::Path;
use std::sync::{Arc, Mutex};
use lru::LruCache;
use std::num::NonZeroUsize;

/// 解析器注册表
pub struct ParserRegistry {
    parsers: Vec<Box<dyn ContentParser>>,
    cache: Arc<Mutex<LruCache<String, ParsedContent>>>,
}

impl ParserRegistry {
    /// 创建新的注册表并注册所有解析器
    pub fn new() -> Self {
        let mut registry = Self {
            parsers: Vec::new(),
            cache: Arc::new(Mutex::new(
                LruCache::new(NonZeroUsize::new(100).unwrap())
            )),
        };
        
        // 注册解析器
        registry.register(Box::new(PdfParser::new()));
        registry.register(Box::new(ImageParser::new()));
        
        tracing::info!("内容解析器注册表初始化完成，已注册 {} 个解析器", registry.parsers.len());
        
        registry
    }
    
    /// 注册新的解析器
    pub fn register(&mut self, parser: Box<dyn ContentParser>) {
        tracing::info!(
            "注册解析器: {} (支持格式: {:?})",
            parser.name(),
            parser.supported_extensions()
        );
        self.parsers.push(parser);
    }
    
    /// 解析文件内容
    pub fn parse(&self, file_path: &Path) -> Result<ParsedContent, String> {
        // 检查文件是否存在
        if !file_path.exists() {
            return Err("文件不存在".to_string());
        }
        
        // 生成缓存key（路径+修改时间）
        let cache_key = match self.generate_cache_key(file_path) {
            Ok(key) => key,
            Err(e) => return Err(format!("无法生成缓存key: {}", e)),
        };
        
        // 检查缓存
        {
            let mut cache = self.cache.lock().unwrap();
            if let Some(cached) = cache.get(&cache_key) {
                tracing::debug!("使用缓存的解析结果: {}", file_path.display());
                return Ok(cached.clone());
            }
        }
        
        // 查找合适的解析器
        for parser in &self.parsers {
            if parser.can_parse(file_path) {
                tracing::info!("使用 {} 解析文件: {}", parser.name(), file_path.display());
                
                match parser.parse(file_path) {
                    Ok(result) => {
                        tracing::info!(
                            "解析完成: {} (耗时: {}ms)",
                            file_path.display(),
                            result.parse_time_ms
                        );
                        
                        // 存入缓存
                        let mut cache = self.cache.lock().unwrap();
                        cache.put(cache_key, result.clone());
                        
                        return Ok(result);
                    },
                    Err(e) => {
                        return Err(format!("{} 解析失败: {}", parser.name(), e));
                    }
                }
            }
        }
        
        Err(format!("没有找到适合该文件类型的解析器: {:?}", file_path.extension()))
    }
    
    /// 检查是否可以解析该文件
    pub fn can_parse(&self, file_path: &Path) -> bool {
        self.parsers.iter().any(|parser| parser.can_parse(file_path))
    }
    
    /// 获取所有注册的解析器信息
    pub fn get_parsers_info(&self) -> Vec<ParserInfo> {
        self.parsers
            .iter()
            .map(|parser| ParserInfo {
                name: parser.name().to_string(),
                extensions: parser.supported_extensions()
                    .iter()
                    .map(|s| s.to_string())
                    .collect(),
            })
            .collect()
    }
    
    /// 清空缓存
    #[allow(dead_code)]
    pub fn clear_cache(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
        tracing::info!("解析器缓存已清空");
    }
    
    /// 生成缓存key
    fn generate_cache_key(&self, file_path: &Path) -> Result<String, String> {
        let metadata = std::fs::metadata(file_path)
            .map_err(|e| format!("无法读取文件元数据: {}", e))?;
        
        let modified = metadata.modified()
            .map_err(|e| format!("无法获取修改时间: {}", e))?;
        
        Ok(format!("{}:{:?}", file_path.display(), modified))
    }
}

/// 解析器信息
#[derive(Debug, Clone, serde::Serialize)]
pub struct ParserInfo {
    pub name: String,
    pub extensions: Vec<String>,
}


