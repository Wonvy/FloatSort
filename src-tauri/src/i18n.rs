use std::sync::RwLock;
use once_cell::sync::Lazy;

/// 全局语言设置
static CURRENT_LANGUAGE: Lazy<RwLock<String>> = Lazy::new(|| {
    RwLock::new("zh-CN".to_string())
});

/// 设置当前语言
pub fn set_language(lang: &str) {
    if let Ok(mut current_lang) = CURRENT_LANGUAGE.write() {
        *current_lang = lang.to_string();
    }
}

/// 获取当前语言
pub fn get_language() -> String {
    CURRENT_LANGUAGE.read()
        .map(|lang| lang.clone())
        .unwrap_or_else(|_| "zh-CN".to_string())
}

/// 翻译函数
pub fn t(key: &str) -> String {
    let lang = get_language();
    translate(key, &lang)
}

/// 根据key和语言返回翻译文本
fn translate(key: &str, lang: &str) -> String {
    match (key, lang) {
        // 文件监控相关
        ("file.detected", "zh-CN") => "检测到文件".to_string(),
        ("file.detected", "en-US") => "File detected".to_string(),
        ("file.detected", "ja-JP") => "ファイルを検出".to_string(),
        
        ("file.stable", "zh-CN") => "文件已稳定".to_string(),
        ("file.stable", "en-US") => "File is stable".to_string(),
        ("file.stable", "ja-JP") => "ファイルが安定".to_string(),
        
        ("file.stability_check", "zh-CN") => "文件稳定检查".to_string(),
        ("file.stability_check", "en-US") => "File stability check".to_string(),
        ("file.stability_check", "ja-JP") => "ファイル安定性チェック".to_string(),
        
        ("file.stability_timeout", "zh-CN") => "文件稳定性检查超时".to_string(),
        ("file.stability_timeout", "en-US") => "File stability check timeout".to_string(),
        ("file.stability_timeout", "ja-JP") => "ファイル安定性チェックタイムアウト".to_string(),
        
        ("file.stability_failed", "zh-CN") => "文件稳定性检查失败，跳过".to_string(),
        ("file.stability_failed", "en-US") => "File stability check failed, skipping".to_string(),
        ("file.stability_failed", "ja-JP") => "ファイル安定性チェック失敗、スキップ".to_string(),
        
        ("file.event_sent", "zh-CN") => "文件检测事件已发送到前端".to_string(),
        ("file.event_sent", "en-US") => "File detection event sent to frontend".to_string(),
        ("file.event_sent", "ja-JP") => "ファイル検出イベントがフロントエンドに送信されました".to_string(),
        
        ("file.sending_event", "zh-CN") => "文件已稳定，发送检测事件".to_string(),
        ("file.sending_event", "en-US") => "File is stable, sending detection event".to_string(),
        ("file.sending_event", "ja-JP") => "ファイルが安定、検出イベントを送信".to_string(),
        
        // 配置相关
        ("config.saved", "zh-CN") => "配置已保存到".to_string(),
        ("config.saved", "en-US") => "Configuration saved to".to_string(),
        ("config.saved", "ja-JP") => "設定を保存しました".to_string(),
        
        ("config.loaded", "zh-CN") => "配置已加载".to_string(),
        ("config.loaded", "en-US") => "Configuration loaded".to_string(),
        ("config.loaded", "ja-JP") => "設定を読み込みました".to_string(),
        
        ("config.not_found", "zh-CN") => "配置文件不存在，使用默认配置".to_string(),
        ("config.not_found", "en-US") => "Configuration file not found, using defaults".to_string(),
        ("config.not_found", "ja-JP") => "設定ファイルが見つかりません、デフォルトを使用".to_string(),
        
        // 语言设置
        ("language.saved", "zh-CN") => "语言设置已保存".to_string(),
        ("language.saved", "en-US") => "Language setting saved".to_string(),
        ("language.saved", "ja-JP") => "言語設定を保存しました".to_string(),
        
        // 活动日志
        ("activity.cleared", "zh-CN") => "活动日志已清空".to_string(),
        ("activity.cleared", "en-US") => "Activity log cleared".to_string(),
        ("activity.cleared", "ja-JP") => "アクティビティログをクリアしました".to_string(),
        
        // 窗口相关
        ("window.hidden", "zh-CN") => "窗口已隐藏到托盘".to_string(),
        ("window.hidden", "en-US") => "Window hidden to tray".to_string(),
        ("window.hidden", "ja-JP") => "ウィンドウをトレイに隠しました".to_string(),
        
        // 默认返回key
        _ => key.to_string(),
    }
}

