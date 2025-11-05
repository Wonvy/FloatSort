// 图片文件解析器（EXIF元数据）
use super::{ContentParser, ParsedContent, MetadataValue};
use std::path::Path;
use std::time::Instant;
use std::collections::HashMap;
use image::GenericImageView;

pub struct ImageParser;

impl ImageParser {
    pub fn new() -> Self {
        Self
    }
}

impl ContentParser for ImageParser {
    fn name(&self) -> &str {
        "Image EXIF Parser"
    }
    
    fn supported_extensions(&self) -> Vec<&str> {
        vec!["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif"]
    }
    
    fn parse(&self, file_path: &Path) -> Result<ParsedContent, String> {
        let start = Instant::now();
        
        // 检查文件是否存在
        if !file_path.exists() {
            return Err("文件不存在".to_string());
        }
        
        let mut metadata = HashMap::new();
        
        // 获取文件大小
        if let Ok(file_metadata) = std::fs::metadata(file_path) {
            let file_size = file_metadata.len();
            metadata.insert(
                "file_size".to_string(),
                MetadataValue::Number(file_size as f64)
            );
            metadata.insert(
                "file_size_mb".to_string(),
                MetadataValue::Number((file_size as f64 / 1024.0 / 1024.0 * 100.0).round() / 100.0)
            );
        }
        
        // 使用 image crate 获取基本信息
        if let Ok(img) = image::open(file_path) {
            let (width, height) = img.dimensions();
            
            metadata.insert("width".to_string(), MetadataValue::Number(width as f64));
            metadata.insert("height".to_string(), MetadataValue::Number(height as f64));
            metadata.insert(
                "resolution".to_string(),
                MetadataValue::String(format!("{}x{}", width, height))
            );
            
            // 图片格式
            metadata.insert(
                "format".to_string(),
                MetadataValue::String(format!("{:?}", img.color()))
            );
            
            // 像素总数（百万像素）
            let megapixels = (width as f64 * height as f64) / 1_000_000.0;
            metadata.insert(
                "megapixels".to_string(),
                MetadataValue::Number((megapixels * 100.0).round() / 100.0)
            );
            
            // 宽高比
            let aspect_ratio = width as f64 / height as f64;
            metadata.insert(
                "aspect_ratio".to_string(),
                MetadataValue::Number((aspect_ratio * 100.0).round() / 100.0)
            );
            
            // 判断方向
            let orientation = if width > height {
                "横向"
            } else if height > width {
                "纵向"
            } else {
                "正方形"
            };
            metadata.insert("orientation".to_string(), MetadataValue::String(orientation.to_string()));
        }
        
        // 尝试读取EXIF数据
        if let Ok(file) = std::fs::File::open(file_path) {
            let mut bufreader = std::io::BufReader::new(file);
            
            if let Ok(exif_reader) = exif::Reader::new().read_from_container(&mut bufreader) {
                // 相机制造商
                if let Some(field) = exif_reader.get_field(exif::Tag::Make, exif::In::PRIMARY) {
                    if let Some(make) = field.display_value().to_string().split(':').last() {
                        metadata.insert("camera_make".to_string(), MetadataValue::String(make.trim().to_string()));
                    }
                }
                
                // 相机型号
                if let Some(field) = exif_reader.get_field(exif::Tag::Model, exif::In::PRIMARY) {
                    if let Some(model) = field.display_value().to_string().split(':').last() {
                        metadata.insert("camera_model".to_string(), MetadataValue::String(model.trim().to_string()));
                    }
                }
                
                // 拍摄日期
                if let Some(field) = exif_reader.get_field(exif::Tag::DateTime, exif::In::PRIMARY) {
                    metadata.insert("date_taken".to_string(), MetadataValue::String(field.display_value().to_string()));
                }
                
                // ISO
                if let Some(field) = exif_reader.get_field(exif::Tag::PhotographicSensitivity, exif::In::PRIMARY) {
                    if let Some(iso_str) = field.display_value().to_string().split(':').last() {
                        if let Ok(iso) = iso_str.trim().parse::<f64>() {
                            metadata.insert("iso".to_string(), MetadataValue::Number(iso));
                        }
                    }
                }
                
                // 光圈
                if let Some(field) = exif_reader.get_field(exif::Tag::FNumber, exif::In::PRIMARY) {
                    metadata.insert("aperture".to_string(), MetadataValue::String(field.display_value().to_string()));
                }
                
                // 快门速度
                if let Some(field) = exif_reader.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY) {
                    metadata.insert("shutter_speed".to_string(), MetadataValue::String(field.display_value().to_string()));
                }
                
                // 焦距
                if let Some(field) = exif_reader.get_field(exif::Tag::FocalLength, exif::In::PRIMARY) {
                    metadata.insert("focal_length".to_string(), MetadataValue::String(field.display_value().to_string()));
                }
                
                // GPS坐标
                if let Some(lat_field) = exif_reader.get_field(exif::Tag::GPSLatitude, exif::In::PRIMARY) {
                    if let Some(lon_field) = exif_reader.get_field(exif::Tag::GPSLongitude, exif::In::PRIMARY) {
                        metadata.insert("has_gps".to_string(), MetadataValue::Boolean(true));
                        metadata.insert("gps_latitude".to_string(), MetadataValue::String(lat_field.display_value().to_string()));
                        metadata.insert("gps_longitude".to_string(), MetadataValue::String(lon_field.display_value().to_string()));
                    }
                }
            }
        }
        
        let parse_time_ms = start.elapsed().as_millis() as u64;
        
        Ok(ParsedContent {
            text: None, // 图片没有文本内容
            metadata,
            parse_time_ms,
            parser_name: self.name().to_string(),
        })
    }
    
    fn max_file_size(&self) -> u64 {
        50 * 1024 * 1024 // 图片可以支持到50MB
    }
}

