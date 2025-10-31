use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, PhysicalPosition, Window};
use tracing::{info, warn};

#[cfg(target_os = "windows")]
use winapi::um::winuser::{GetCursorPos, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};

/// 窗口折叠管理器
pub struct WindowSnapManager {
    window: Window,
    collapsed: Arc<Mutex<bool>>,
    collapsed_edge: Arc<Mutex<Option<Edge>>>,
    original_position: Arc<Mutex<Option<PhysicalPosition<i32>>>>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum Edge {
    Top,
    Left,
    Right,
}

const SNAP_THRESHOLD: i32 = 10; // 距离屏幕边缘多少像素时触发标记线
const COLLAPSED_VISIBLE_SIZE: i32 = 1; // 折叠后可见的像素数

impl WindowSnapManager {
    pub fn new(window: Window) -> Self {
        Self {
            window,
            collapsed: Arc::new(Mutex::new(false)),
            collapsed_edge: Arc::new(Mutex::new(None)),
            original_position: Arc::new(Mutex::new(None)),
        }
    }

    /// 启动窗口折叠监听（仅用于展开检测）
    pub fn start(&self, running: Arc<Mutex<bool>>) {
        info!("✓ 窗口折叠监听线程已启动");

        let window = self.window.clone();
        let collapsed = self.collapsed.clone();
        let collapsed_edge = self.collapsed_edge.clone();
        let original_position = self.original_position.clone();

        thread::spawn(move || {
            while *running.lock().unwrap() {
                // 如果已折叠，检查鼠标是否接近窗口边缘，是则展开
                let is_collapsed = *collapsed.lock().unwrap();
                if is_collapsed {
                    if let Ok(should_expand) = Self::should_expand(&window, &collapsed_edge) {
                        if should_expand {
                            if let Err(e) = Self::expand_window(
                                &window,
                                &collapsed,
                                &collapsed_edge,
                                &original_position,
                            ) {
                                warn!("展开窗口失败: {}", e);
                            }
                        }
                    }
                }

                thread::sleep(Duration::from_millis(100)); // 每100ms检查一次
            }
            info!("窗口折叠功能已停止");
        });
    }

    /// 检查窗口是否接近边缘（不考虑全屏）
    fn check_near_edge(window: &Window) -> Result<Option<Edge>, String> {
        let position = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;
        let screen_size = Self::get_screen_size()?;

        // 检查是否接近顶部
        if position.y <= SNAP_THRESHOLD {
            return Ok(Some(Edge::Top));
        }

        // 检查是否接近左边
        if position.x <= SNAP_THRESHOLD {
            return Ok(Some(Edge::Left));
        }

        // 检查是否接近右边
        let right_edge = position.x + size.width as i32;
        if right_edge >= screen_size.0 - SNAP_THRESHOLD {
            return Ok(Some(Edge::Right));
        }

        Ok(None)
    }

    /// 检查是否应该展开窗口
    fn should_expand(
        window: &Window,
        collapsed_edge: &Arc<Mutex<Option<Edge>>>,
    ) -> Result<bool, String> {
        let edge = collapsed_edge.lock().unwrap();
        if edge.is_none() {
            return Ok(false);
        }

        let mouse_pos = Self::get_mouse_position()?;
        let position = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;

        const EXPAND_TRIGGER_DISTANCE: i32 = 10; // 鼠标距离窗口边缘多少像素时触发展开

        match *edge {
            Some(Edge::Top) => {
                // 鼠标在窗口可见部分附近（顶部边缘）
                Ok(mouse_pos.1 <= EXPAND_TRIGGER_DISTANCE
                    && mouse_pos.0 >= position.x
                    && mouse_pos.0 <= position.x + size.width as i32)
            }
            Some(Edge::Left) => {
                // 鼠标在窗口可见部分附近（左边缘）
                Ok(mouse_pos.0 <= EXPAND_TRIGGER_DISTANCE
                    && mouse_pos.1 >= position.y
                    && mouse_pos.1 <= position.y + size.height as i32)
            }
            Some(Edge::Right) => {
                // 鼠标在窗口可见部分附近（右边缘）
                let screen_size = Self::get_screen_size()?;
                Ok(mouse_pos.0 >= screen_size.0 - EXPAND_TRIGGER_DISTANCE
                    && mouse_pos.1 >= position.y
                    && mouse_pos.1 <= position.y + size.height as i32)
            }
            None => Ok(false),
        }
    }

    /// 折叠窗口
    fn collapse_window(
        window: &Window,
        collapsed: &Arc<Mutex<bool>>,
        collapsed_edge: &Arc<Mutex<Option<Edge>>>,
        original_position: &Arc<Mutex<Option<PhysicalPosition<i32>>>>,
        edge: Edge,
    ) -> Result<(), String> {
        let position = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.outer_size().map_err(|e| e.to_string())?;

        // 保存原始位置
        *original_position.lock().unwrap() = Some(position);

        // 计算新位置
        let new_position = match edge {
            Edge::Top => PhysicalPosition::new(position.x, -(size.height as i32) + COLLAPSED_VISIBLE_SIZE),
            Edge::Left => PhysicalPosition::new(-(size.width as i32) + COLLAPSED_VISIBLE_SIZE, position.y),
            Edge::Right => {
                let screen_size = Self::get_screen_size()?;
                PhysicalPosition::new(
                    screen_size.0 - COLLAPSED_VISIBLE_SIZE,
                    position.y,
                )
            }
        };

        window.set_position(new_position).map_err(|e| e.to_string())?;

        *collapsed.lock().unwrap() = true;
        *collapsed_edge.lock().unwrap() = Some(edge);

        info!("✓ 窗口已折叠到 {:?} 边缘", edge);
        Ok(())
    }

    /// 展开窗口
    fn expand_window(
        window: &Window,
        collapsed: &Arc<Mutex<bool>>,
        collapsed_edge: &Arc<Mutex<Option<Edge>>>,
        original_position: &Arc<Mutex<Option<PhysicalPosition<i32>>>>,
    ) -> Result<(), String> {
        let edge = collapsed_edge.lock().unwrap().clone();
        let original_pos = original_position.lock().unwrap();
        
        if let Some(mut pos) = *original_pos {
            let screen_size = Self::get_screen_size()?;
            let size = window.outer_size().map_err(|e| e.to_string())?;
            
            // 如果原始位置在触发区域内，调整到安全位置（避免立即再次折叠）
            const SAFE_DISTANCE: i32 = 0; // 展开后直接贴边
            
            match edge {
                Some(Edge::Top) => {
                    if pos.y <= SNAP_THRESHOLD {
                        pos.y = SAFE_DISTANCE;
                    }
                }
                Some(Edge::Left) => {
                    if pos.x <= SNAP_THRESHOLD {
                        pos.x = SAFE_DISTANCE;
                    }
                }
                Some(Edge::Right) => {
                    if pos.x + size.width as i32 >= screen_size.0 - SNAP_THRESHOLD {
                        pos.x = screen_size.0 - size.width as i32 - SAFE_DISTANCE;
                    }
                }
                None => {}
            }
            
            window.set_position(pos).map_err(|e| e.to_string())?;
            
            *collapsed.lock().unwrap() = false;
            *collapsed_edge.lock().unwrap() = None;
            
            info!("✓ 窗口已展开");
            
            // 发送展开事件到前端
            if let Err(e) = window.emit("window_expand", ()) {
                warn!("发送展开事件失败: {}", e);
            }
        }
        Ok(())
    }

    /// 获取屏幕尺寸
    #[cfg(target_os = "windows")]
    fn get_screen_size() -> Result<(i32, i32), String> {
        unsafe {
            let width = GetSystemMetrics(SM_CXSCREEN);
            let height = GetSystemMetrics(SM_CYSCREEN);
            Ok((width, height))
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn get_screen_size() -> Result<(i32, i32), String> {
        // 默认屏幕尺寸，非Windows平台可以使用其他方法获取
        Ok((1920, 1080))
    }

    /// 获取鼠标位置
    #[cfg(target_os = "windows")]
    fn get_mouse_position() -> Result<(i32, i32), String> {
        unsafe {
            let mut point = std::mem::zeroed();
            if GetCursorPos(&mut point) != 0 {
                Ok((point.x, point.y))
            } else {
                Err("无法获取鼠标位置".to_string())
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    fn get_mouse_position() -> Result<(i32, i32), String> {
        // 非Windows平台返回默认值
        Ok((0, 0))
    }
}

// 全局管理器实例
static mut MANAGER: Option<WindowSnapManager> = None;

/// Tauri命令：检查窗口是否接近边缘
#[tauri::command]
pub fn check_window_near_edge(window: Window) -> Result<Option<String>, String> {
    match WindowSnapManager::check_near_edge(&window)? {
        Some(Edge::Top) => Ok(Some("Top".to_string())),
        Some(Edge::Left) => Ok(Some("Left".to_string())),
        Some(Edge::Right) => Ok(Some("Right".to_string())),
        None => Ok(None),
    }
}

/// Tauri命令：触发窗口折叠
#[tauri::command]
pub fn trigger_window_snap(window: Window, edge: String, app_handle: tauri::AppHandle) -> Result<(), String> {
    let state: tauri::State<crate::AppState> = app_handle.state();
    let is_running = state.window_snap_running.lock().map_err(|e| e.to_string())?;
    
    if !*is_running {
        return Err("窗口折叠功能未启动".to_string());
    }
    drop(is_running);
    
    // 获取管理器
    unsafe {
        let manager_ptr = &raw const MANAGER;
        if let Some(manager) = (*manager_ptr).as_ref() {
            let edge_enum = match edge.as_str() {
                "Top" => Edge::Top,
                "Left" => Edge::Left,
                "Right" => Edge::Right,
                _ => return Err("无效的边缘参数".to_string()),
            };
            
            WindowSnapManager::collapse_window(
                &window,
                &manager.collapsed,
                &manager.collapsed_edge,
                &manager.original_position,
                edge_enum,
            )?;
        }
    }
    
    Ok(())
}

/// Tauri命令：启动窗口折叠功能
#[tauri::command]
pub fn start_window_snap(window: Window, app_handle: tauri::AppHandle) -> Result<(), String> {
    let state: tauri::State<crate::AppState> = app_handle.state();
    let mut is_running = state.window_snap_running.lock().map_err(|e| e.to_string())?;
    
    if *is_running {
        return Err("窗口折叠功能已经在运行".to_string());
    }
    
    *is_running = true;
    drop(is_running);
    
    let manager = WindowSnapManager::new(window);
    manager.start(state.window_snap_running.clone());
    
    // 保存管理器实例
    unsafe {
        let manager_ptr = &raw mut MANAGER;
        *manager_ptr = Some(manager);
    }
    
    info!("窗口折叠功能已启动");
    Ok(())
}

/// Tauri命令：停止窗口折叠功能
#[tauri::command]
pub fn stop_window_snap(app_handle: tauri::AppHandle) -> Result<(), String> {
    let state: tauri::State<crate::AppState> = app_handle.state();
    let mut running = state.window_snap_running.lock().map_err(|e| e.to_string())?;
    
    if !*running {
        return Err("窗口折叠功能未运行".to_string());
    }
    
    *running = false;
    info!("窗口折叠功能已停止");
    Ok(())
}
