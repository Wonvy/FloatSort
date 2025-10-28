// Tauri API
const { invoke } = window.__TAURI__.tauri;
const { open } = window.__TAURI__.dialog;
const { listen } = window.__TAURI__.event;

// 应用状态
let appState = {
    monitoring: false,
    config: null,
    filesProcessed: 0,
    filesOrganized: 0,
};

// DOM 元素
const elements = {
    toggleMonitor: document.getElementById('toggleMonitor'),
    settingsBtn: document.getElementById('settingsBtn'),
    closeSettings: document.getElementById('closeSettings'),
    saveSettings: document.getElementById('saveSettings'),
    settingsPanel: document.getElementById('settingsPanel'),
    overlay: document.getElementById('overlay'),
    dropZone: document.getElementById('dropZone'),
    status: document.getElementById('status'),
    activityList: document.getElementById('activityList'),
    filesProcessed: document.getElementById('filesProcessed'),
    filesOrganized: document.getElementById('filesOrganized'),
    watchPathsList: document.getElementById('watchPathsList'),
    rulesList: document.getElementById('rulesList'),
    addWatchPath: document.getElementById('addWatchPath'),
    addRule: document.getElementById('addRule'),
    autoStart: document.getElementById('autoStart'),
    showNotifications: document.getElementById('showNotifications'),
};

// 初始化应用
async function init() {
    console.log('FloatSort 正在初始化...');
    
    // 加载配置
    await loadConfig();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 监听后端事件
    setupBackendListeners();
    
    console.log('FloatSort 初始化完成');
}

// 加载配置
async function loadConfig() {
    try {
        appState.config = await invoke('get_config');
        console.log('配置已加载:', appState.config);
        updateUI();
    } catch (error) {
        console.error('加载配置失败:', error);
        showNotification('加载配置失败: ' + error, 'error');
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 监控开关
    elements.toggleMonitor.addEventListener('click', toggleMonitoring);
    
    // 设置面板
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettings.addEventListener('click', closeSettings);
    elements.overlay.addEventListener('click', closeSettings);
    elements.saveSettings.addEventListener('click', saveSettings);
    
    // 添加路径和规则
    elements.addWatchPath.addEventListener('click', addWatchPath);
    elements.addRule.addEventListener('click', () => {
        alert('规则编辑器正在开发中...');
    });
    
    // 拖拽区域
    setupDropZone();
}

// 设置后端事件监听
async function setupBackendListeners() {
    // 监听文件整理事件
    await listen('file-organized', (event) => {
        console.log('文件已整理:', event.payload);
        appState.filesOrganized++;
        updateStats();
        addActivity(
            `文件已整理: ${event.payload.file_name}`,
            `${event.payload.original_path} → ${event.payload.new_path}`
        );
    });
    
    // 监听错误事件
    await listen('file-error', (event) => {
        console.error('文件处理错误:', event.payload);
        addActivity(
            `错误: ${event.payload.file_path}`,
            event.payload.error,
            'error'
        );
    });
}

// 切换监控状态
async function toggleMonitoring() {
    try {
        if (appState.monitoring) {
            await invoke('stop_monitoring');
            appState.monitoring = false;
            elements.toggleMonitor.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>开始监控</span>
            `;
            elements.status.classList.remove('active');
            elements.status.querySelector('.status-text').textContent = '未监控';
            showNotification('监控已停止', 'info');
        } else {
            await invoke('start_monitoring');
            appState.monitoring = true;
            elements.toggleMonitor.innerHTML = `
                <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <span>停止监控</span>
            `;
            elements.status.classList.add('active');
            elements.status.querySelector('.status-text').textContent = '监控中';
            showNotification('监控已启动', 'success');
        }
    } catch (error) {
        console.error('切换监控状态失败:', error);
        showNotification('操作失败: ' + error, 'error');
    }
}

// 打开设置面板
function openSettings() {
    elements.settingsPanel.classList.add('open');
    elements.overlay.classList.add('show');
    renderWatchPaths();
    renderRules();
    elements.autoStart.checked = appState.config.auto_start;
    elements.showNotifications.checked = appState.config.show_notifications;
}

// 关闭设置面板
function closeSettings() {
    elements.settingsPanel.classList.remove('open');
    elements.overlay.classList.remove('show');
}

// 保存设置
async function saveSettings() {
    try {
        // 更新配置
        appState.config.auto_start = elements.autoStart.checked;
        appState.config.show_notifications = elements.showNotifications.checked;
        
        await invoke('save_config', { config: appState.config });
        showNotification('设置已保存', 'success');
        closeSettings();
    } catch (error) {
        console.error('保存设置失败:', error);
        showNotification('保存设置失败: ' + error, 'error');
    }
}

// 添加监控路径
async function addWatchPath() {
    try {
        const selected = await open({
            directory: true,
            multiple: false,
        });
        
        if (selected) {
            if (!appState.config.watch_paths.includes(selected)) {
                appState.config.watch_paths.push(selected);
                renderWatchPaths();
            }
        }
    } catch (error) {
        console.error('添加路径失败:', error);
    }
}

// 渲染监控路径列表
function renderWatchPaths() {
    elements.watchPathsList.innerHTML = appState.config.watch_paths
        .map((path, index) => `
            <div class="path-item">
                <span class="path-text">${path}</span>
                <button class="remove-btn" onclick="removePath(${index})">删除</button>
            </div>
        `)
        .join('');
}

// 删除路径
window.removePath = function(index) {
    appState.config.watch_paths.splice(index, 1);
    renderWatchPaths();
};

// 渲染规则列表
function renderRules() {
    elements.rulesList.innerHTML = appState.config.rules
        .map((rule, index) => `
            <div class="rule-item">
                <div>
                    <div class="rule-name">${rule.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                        ${rule.enabled ? '✓ 已启用' : '✗ 已禁用'}
                    </div>
                </div>
                <button class="remove-btn" onclick="removeRule(${index})">删除</button>
            </div>
        `)
        .join('');
}

// 删除规则
window.removeRule = function(index) {
    appState.config.rules.splice(index, 1);
    renderRules();
};

// 设置拖拽区域
function setupDropZone() {
    elements.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.dropZone.classList.add('drag-over');
    });
    
    elements.dropZone.addEventListener('dragleave', () => {
        elements.dropZone.classList.remove('drag-over');
    });
    
    elements.dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        elements.dropZone.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        for (let file of files) {
            await organizeFile(file.path);
        }
    });
}

// 整理单个文件
async function organizeFile(filePath) {
    try {
        const result = await invoke('organize_file', { filePath });
        appState.filesProcessed++;
        updateStats();
        addActivity(`手动整理: ${filePath}`, result);
    } catch (error) {
        console.error('整理文件失败:', error);
        addActivity(`整理失败: ${filePath}`, error, 'error');
    }
}

// 更新统计信息
function updateStats() {
    elements.filesProcessed.textContent = appState.filesProcessed;
    elements.filesOrganized.textContent = appState.filesOrganized;
}

// 添加活动记录
function addActivity(title, detail, type = 'info') {
    const activityEmpty = elements.activityList.querySelector('.activity-empty');
    if (activityEmpty) {
        activityEmpty.remove();
    }
    
    const now = new Date().toLocaleTimeString('zh-CN');
    const item = document.createElement('div');
    item.className = `activity-item ${type}`;
    item.innerHTML = `
        <div class="activity-time">${now}</div>
        <div class="activity-text">${title}</div>
        ${detail ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">${detail}</div>` : ''}
    `;
    
    elements.activityList.insertBefore(item, elements.activityList.firstChild);
    
    // 限制活动记录数量
    const items = elements.activityList.querySelectorAll('.activity-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    if (appState.config && appState.config.show_notifications) {
        console.log(`[${type.toUpperCase()}] ${message}`);
        addActivity(message, '', type);
    }
}

// 更新 UI
function updateUI() {
    renderWatchPaths();
    renderRules();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}


