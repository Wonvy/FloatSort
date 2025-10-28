// 应用状态
let monitoringActive = false;
let rulesCount = 0;
let filesProcessed = 0;
let editingRuleId = null; // 当前编辑的规则 ID

// Tauri API (延迟初始化)
let invoke, open, listen, appWindow;

// DOM 元素 (延迟初始化)
let dropZone, addRuleBtn, monitorBtn, settingsBtn, ruleModal, settingsModal;
let closeModalBtn, cancelBtn, closeSettingsBtn, ruleForm, browseFolderBtn, activityList, rulesList;

// 初始化
async function init() {
    console.log('FloatSort UI 初始化...');
    
    try {
        // 等待 Tauri API 准备就绪
        if (!window.__TAURI__) {
            console.error('Tauri API 未加载');
            return;
        }
        
        // 初始化 Tauri API
        console.log('=== Tauri API 初始化 ===');
        console.log('__TAURI__ keys:', Object.keys(window.__TAURI__));
        
        // Tauri v1 API 结构 (启用 withGlobalTauri 后)
        const { invoke: invokeFunc } = window.__TAURI__.tauri || {};
        const { open: openFunc } = window.__TAURI__.dialog || {};
        const { listen: listenFunc } = window.__TAURI__.event || {};
        
        invoke = invokeFunc;
        open = openFunc;
        listen = listenFunc;
        
        console.log('✓ invoke:', typeof invoke);
        console.log('✓ open:', typeof open);
        console.log('✓ listen:', typeof listen);
        
        if (!invoke) {
            console.error('❌ Tauri API 加载失败！');
            console.error('请确保 tauri.conf.json 中 withGlobalTauri 设置为 true');
            throw new Error('无法找到 Tauri invoke 函数');
        }
        
        console.log('Tauri API 已加载');
        
        // 初始化 DOM 元素
        dropZone = document.getElementById('dropZone');
        addRuleBtn = document.getElementById('addRuleBtn');
        monitorBtn = document.getElementById('monitorBtn');
        settingsBtn = document.getElementById('settingsBtn');
        ruleModal = document.getElementById('ruleModal');
        settingsModal = document.getElementById('settingsModal');
        closeModalBtn = document.getElementById('closeModalBtn');
        cancelBtn = document.getElementById('cancelBtn');
        closeSettingsBtn = document.getElementById('closeSettingsBtn');
        ruleForm = document.getElementById('ruleForm');
        browseFolderBtn = document.getElementById('browseFolderBtn');
        activityList = document.getElementById('activityList');
        rulesList = document.getElementById('rulesList');
        
        console.log('DOM 元素已获取');
        
        // 加载统计信息
        await loadStatistics();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 监听后端事件
        setupBackendListeners();
        
        console.log('UI 初始化完成 ✅');
    } catch (error) {
        console.error('初始化失败:', error);
    }
}

// 加载统计信息
async function loadStatistics() {
    try {
        const stats = await invoke('get_statistics');
        updateStats(stats);
    } catch (error) {
        console.error('加载统计信息失败:', error);
    }
}

// 更新统计显示
function updateStats(stats) {
    if (stats) {
        document.getElementById('filesProcessed').textContent = stats.files_processed || 0;
        document.getElementById('rulesCount').textContent = stats.rules_count || 0;
        document.getElementById('monitorStatus').textContent = stats.monitoring ? '监控中' : '未激活';
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 拖拽区域
    dropZone.addEventListener('click', async () => {
        try {
            const selected = await open({
                multiple: true,
                directory: false,
            });
            
            if (selected) {
                const files = Array.isArray(selected) ? selected : [selected];
                await processFiles(files);
            }
        } catch (error) {
            console.error('选择文件失败:', error);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });

    // 添加规则按钮
    addRuleBtn.addEventListener('click', () => {
        openRuleModal();
    });

    // 监控按钮
    monitorBtn.addEventListener('click', toggleMonitoring);

    // 设置按钮
    settingsBtn.addEventListener('click', async () => {
        await showSettings();
    });

    // 模态框关闭
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    closeSettingsBtn.addEventListener('click', closeSettingsModal);

    ruleModal.addEventListener('click', (e) => {
        if (e.target === ruleModal) {
            closeModal();
        }
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeSettingsModal();
        }
    });

    // 浏览文件夹
    browseFolderBtn.addEventListener('click', async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });
            
            if (selected) {
                document.getElementById('targetFolder').value = selected;
            }
        } catch (error) {
            console.error('选择文件夹失败:', error);
        }
    });

    // 规则表单提交
    ruleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveRule();
    });
}

// 设置后端监听器
function setupBackendListeners() {
    console.log('设置后端事件监听器...');
    
    // 监听文件拖拽事件
    listen('tauri://file-drop', async (event) => {
        console.log('文件拖拽:', event.payload);
        const files = event.payload;
        if (files && files.length > 0) {
            await processFiles(files);
        }
    });

    // 监听文件检测事件（监控模式）
    listen('file-detected', (event) => {
        console.log('检测到文件:', event.payload);
        const fileName = event.payload.file_path.split(/[\\\/]/).pop();
        addActivity(`🔍 检测: ${fileName}`);
    });

    // 监听文件处理事件
    listen('file-processed', (event) => {
        console.log('文件已处理:', event.payload);
        filesProcessed++;
        updateFileCount();
        addActivity(`📄 已处理: ${event.payload.name || '文件'}`);
    });

    // 监听后端文件组织事件
    listen('file-organized', (event) => {
        console.log('✓ 文件已整理:', event.payload);
        filesProcessed++;
        updateFileCount();
        
        const fileName = event.payload.file_name || '文件';
        const targetPath = event.payload.new_path;
        const targetFolder = targetPath ? targetPath.split(/[\\\/]/).slice(-2, -1)[0] : '目标';
        
        addActivity(`✅ 已整理: ${fileName} → ${targetFolder}/`);
        showNotification(`已整理: ${fileName}`, 'success');
    });

    // 监听文件未匹配规则事件
    listen('file-no-match', (event) => {
        console.log('○ 文件未匹配规则:', event.payload);
        const fileName = event.payload.file_name || '文件';
        addActivity(`○ 未匹配: ${fileName}`);
    });

    // 监听错误事件
    listen('file-error', (event) => {
        console.error('✗ 文件错误:', event.payload);
        const fileName = event.payload.file_name || event.payload.file_path?.split(/[\\\/]/).pop() || '文件';
        const error = event.payload.error || '未知错误';
        addActivity(`❌ 错误: ${fileName} - ${error}`);
        showNotification(`处理失败: ${fileName}`, 'error');
    });

    // 监听一般错误事件
    listen('error', (event) => {
        console.error('后端错误:', event.payload);
        addActivity(`❌ 系统错误: ${event.payload.message || '未知错误'}`);
    });
    
    console.log('后端事件监听器设置完成');
}

// 处理文件
async function processFiles(files) {
    console.log('处理文件:', files);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        try {
            const result = await invoke('process_file', { path: file });
            const fileName = file.split(/[/\\]/).pop();
            
            if (result && result.length > 0) {
                addActivity(`✅ 已整理: ${fileName}`);
                successCount++;
            } else {
                addActivity(`📄 已处理: ${fileName} (无匹配规则)`);
                successCount++;
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            const fileName = file.split(/[/\\]/).pop();
            const message = typeof error === 'string' ? error : error.message || '未知错误';
            addActivity(`❌ 失败: ${fileName} - ${message}`);
            failCount++;
        }
    }
    
    await loadStatistics();
    
    // 显示汇总通知
    if (failCount === 0) {
        showNotification(`成功处理 ${successCount} 个文件`, 'success');
    } else {
        showNotification(`处理完成: ${successCount} 成功, ${failCount} 失败`, 'warning');
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 动画显示
    setTimeout(() => notification.classList.add('show'), 10);
    
    // 3秒后自动关闭
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 切换监控状态
async function toggleMonitoring() {
    try {
        if (monitoringActive) {
            await invoke('stop_monitoring');
            monitoringActive = false;
            monitorBtn.innerHTML = '<span>👁️</span> 开始监控';
            document.getElementById('monitorStatus').textContent = '未激活';
            addActivity('⏸️ 监控已停止');
            showNotification('监控已停止', 'info');
        } else {
            // 选择要监控的文件夹
            const watchPath = await open({
                directory: true,
                multiple: false,
                title: '选择要监控的文件夹'
            });
            
            if (!watchPath) {
                showNotification('已取消', 'info');
                return;
            }
            
            await invoke('start_monitoring', { watchPath });
            monitoringActive = true;
            monitorBtn.innerHTML = '<span>⏸️</span> 停止监控';
            document.getElementById('monitorStatus').textContent = '监控中';
            addActivity(`▶️ 监控已启动: ${watchPath}`);
            showNotification(`监控已启动: ${watchPath}`, 'success');
        }
    } catch (error) {
        console.error('切换监控状态失败:', error);
        const message = typeof error === 'string' ? error : error.message || '未知错误';
        addActivity(`❌ 监控操作失败: ${message}`);
        showNotification(`监控操作失败: ${message}`, 'error');
    }
}

// 保存规则
async function saveRule() {
    const name = document.getElementById('ruleName').value.trim();
    const type = document.getElementById('ruleType').value;
    const value = document.getElementById('ruleValue').value.trim();
    const target = document.getElementById('targetFolder').value.trim();

    // 表单验证
    if (!name) {
        showNotification('请输入规则名称', 'error');
        return;
    }
    if (!value) {
        showNotification('请输入匹配值', 'error');
        return;
    }
    if (!target) {
        showNotification('请选择目标文件夹', 'error');
        return;
    }

    try {
        // 根据类型构建条件（符合 Rust serde tagged enum 格式）
        let condition;
        if (type === 'extension') {
            const extensions = value.split(',').map(ext => ext.trim().replace(/^\./, ''));
            condition = { 
                type: 'Extension',
                values: extensions 
            };
        } else if (type === 'size') {
            const sizeInBytes = parseInt(value) * 1024 * 1024; // 假设输入是 MB
            condition = { 
                type: 'SizeRange',
                min: null,
                max: sizeInBytes 
            };
        } else {
            condition = { 
                type: 'NameContains',
                pattern: value 
            };
        }

        const rule = {
            id: editingRuleId || `rule_${Date.now()}`,
            name,
            enabled: true,
            conditions: [condition],
            action: { 
                type: 'MoveTo',
                destination: target 
            },
            priority: 0,
        };

        if (editingRuleId) {
            // 编辑模式
            await invoke('update_rule', {
                ruleId: editingRuleId,
                rule
            });
            addActivity(`✏️ 规则已更新: ${name}`);
            showNotification(`规则 "${name}" 已更新`, 'success');
        } else {
            // 新增模式
            await invoke('add_rule', { rule });
            addActivity(`📝 规则已添加: ${name}`);
            showNotification(`规则 "${name}" 已添加`, 'success');
        }

        await loadStatistics(); // 重新加载统计信息
        closeModal();
    } catch (error) {
        console.error('保存规则失败:', error);
        const message = typeof error === 'string' ? error : error.message || '未知错误';
        addActivity(`❌ 保存规则失败: ${message}`);
        showNotification(`保存规则失败: ${message}`, 'error');
    }
}

// 打开规则模态框（新增或编辑）
function openRuleModal(rule = null) {
    if (rule) {
        // 编辑模式
        editingRuleId = rule.id;
        document.querySelector('#ruleModal .modal-header h2').textContent = '✏️ 编辑规则';
        
        // 填充表单
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('targetFolder').value = '';
        
        // 解析条件
        if (rule.conditions && rule.conditions.length > 0) {
            const cond = rule.conditions[0];
            if (cond.type === 'Extension') {
                document.getElementById('ruleType').value = 'extension';
                document.getElementById('ruleValue').value = cond.values.join(', ');
            } else if (cond.type === 'SizeRange') {
                document.getElementById('ruleType').value = 'size';
                document.getElementById('ruleValue').value = cond.max ? Math.round(cond.max / 1024 / 1024) : '';
            } else if (cond.type === 'NameContains') {
                document.getElementById('ruleType').value = 'name';
                document.getElementById('ruleValue').value = cond.pattern;
            }
        }
        
        // 解析目标文件夹
        if (rule.action && rule.action.destination) {
            document.getElementById('targetFolder').value = rule.action.destination;
        }
    } else {
        // 新增模式
        editingRuleId = null;
        document.querySelector('#ruleModal .modal-header h2').textContent = '📝 创建规则';
        ruleForm.reset();
    }
    
    ruleModal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    ruleModal.style.display = 'none';
    editingRuleId = null;
    ruleForm.reset();
}

// 添加活动记录
function addActivity(message) {
    const emptyItem = activityList.querySelector('.activity-item.empty');
    if (emptyItem) {
        emptyItem.remove();
    }

    const item = document.createElement('div');
    item.className = 'activity-item';
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    item.textContent = `[${time}] ${message}`;
    
    activityList.insertBefore(item, activityList.firstChild);
    
    // 限制最多显示 10 条
    while (activityList.children.length > 10) {
        activityList.removeChild(activityList.lastChild);
    }
}

// 更新文件计数
function updateFileCount() {
    document.getElementById('filesProcessed').textContent = filesProcessed;
}

// 显示设置界面
async function showSettings() {
    try {
        const rules = await invoke('get_rules');
        
        // 清空列表
        rulesList.innerHTML = '';
        
        if (rules.length === 0) {
            rulesList.innerHTML = '<div class="activity-item empty">暂无规则</div>';
        } else {
            rules.forEach((rule, index) => {
                const ruleItem = document.createElement('div');
                ruleItem.className = 'activity-item';
                ruleItem.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                
                // 规则信息
                const ruleInfo = document.createElement('div');
                ruleInfo.style.flex = '1';
                
                // 获取条件描述
                let conditionDesc = '';
                if (rule.conditions && rule.conditions.length > 0) {
                    const cond = rule.conditions[0];
                    if (cond.type === 'Extension') {
                        conditionDesc = `扩展名: ${cond.values.join(', ')}`;
                    } else if (cond.type === 'SizeRange') {
                        conditionDesc = `大小: ${cond.max ? Math.round(cond.max / 1024 / 1024) + 'MB' : '不限'}`;
                    } else if (cond.type === 'NameContains') {
                        conditionDesc = `包含: ${cond.pattern}`;
                    }
                }
                
                // 获取动作描述
                let actionDesc = '';
                if (rule.action) {
                    if (rule.action.type === 'MoveTo') {
                        actionDesc = `→ ${rule.action.destination}`;
                    } else if (rule.action.type === 'CopyTo') {
                        actionDesc = `复制到 ${rule.action.destination}`;
                    }
                }
                
                ruleInfo.innerHTML = `
                    <div style="font-weight: bold; margin-bottom: 4px;">${rule.name}</div>
                    <div style="font-size: 12px; color: #666;">${conditionDesc}</div>
                    <div style="font-size: 12px; color: #999;">${actionDesc}</div>
                `;
                
                // 按钮容器
                const btnContainer = document.createElement('div');
                btnContainer.style.cssText = 'display: flex; gap: 8px; margin-left: 10px;';
                
                // 编辑按钮
                const editBtn = document.createElement('button');
                editBtn.textContent = '编辑';
                editBtn.className = 'btn-primary';
                editBtn.style.cssText = 'padding: 4px 12px; font-size: 12px;';
                editBtn.onclick = () => {
                    closeSettingsModal();
                    openRuleModal(rule);
                };
                
                // 删除按钮
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '删除';
                deleteBtn.className = 'btn-secondary';
                deleteBtn.style.cssText = 'padding: 4px 12px; font-size: 12px;';
                deleteBtn.onclick = async () => {
                    if (confirm(`确定要删除规则 "${rule.name}" 吗？`)) {
                        try {
                            await invoke('remove_rule', { ruleId: rule.id });
                            showNotification(`规则 "${rule.name}" 已删除`, 'success');
                            await showSettings(); // 重新加载列表
                            await loadStatistics(); // 更新统计
                        } catch (error) {
                            console.error('删除规则失败:', error);
                            showNotification('删除规则失败', 'error');
                        }
                    }
                };
                
                btnContainer.appendChild(editBtn);
                btnContainer.appendChild(deleteBtn);
                
                ruleItem.appendChild(ruleInfo);
                ruleItem.appendChild(btnContainer);
                rulesList.appendChild(ruleItem);
            });
        }
        
        settingsModal.style.display = 'flex';
        addActivity('⚙️ 打开设置');
    } catch (error) {
        console.error('加载规则失败:', error);
        showNotification('加载规则失败', 'error');
    }
}

// 关闭设置模态框
function closeSettingsModal() {
    settingsModal.style.display = 'none';
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成');
    // 给 Tauri 一点时间加载
    setTimeout(init, 100);
});
