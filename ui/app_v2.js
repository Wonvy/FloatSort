// FloatSort V2 - 主应用逻辑

// ========== 全局状态 ==========
const appState = {
    folders: [],
    rules: [],
    monitoring: false,
    filesProcessed: 0,
    editingFolderId: null,
    editingRuleId: null,
    pendingBatch: [],  // 待整理文件队列
    batchThreshold: 1,  // 批量确认阈值（从配置读取）
    currentConditions: [],  // 当前规则的条件列表
    currentRuleIndex: -1,  // 当前选中的规则索引（-1表示所有规则）
    isMiniMode: false,  // 是否处于Mini模式
    isCollapsed: false,  // 窗口是否折叠
    collapseEdge: null,  // 折叠在哪个边缘（'left', 'right', 'top', 'bottom'）
    positionCheckInterval: null,  // 位置检查定时器
    originalSize: null,  // 折叠前的原始窗口尺寸
    originalPosition: null,  // 折叠前的原始窗口位置
    expandCooldown: false,  // 展开冷却期，防止立即再折叠
    isMouseOver: false,  // 鼠标是否在窗口上
    collapseTimer: null,  // 折叠延迟定时器
    isDragging: false  // 窗口是否正在拖拽中
};

// 为规则生成字母编号
function getRuleLabel(index) {
    return String.fromCharCode(65 + index); // A, B, C, ...
}

// ========== Tauri API ==========
let invoke, dialog, listen;

//========== 初始化 ==========
window.addEventListener('DOMContentLoaded', async () => {
    await initTauriAPI();
    initializeApp();
});

async function initTauriAPI() {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (window.__TAURI__) {
                invoke = window.__TAURI__.tauri.invoke;
                dialog = window.__TAURI__.dialog;
                listen = window.__TAURI__.event.listen;
                console.log('✓ Tauri API 已加载');
                resolve();
            } else {
                console.error('✗ Tauri API 未找到');
                showNotification('应用初始化失败', 'error');
            }
        }, 200);
    });
}

function initializeApp() {
    console.log('FloatSort V2 初始化中...');
    
    setupTabs();
    setupEventListeners();
    setupBackendListeners();
    setupWindowListeners();
    setupCollapseExpand();
    startPositionMonitoring();
    loadAppData();
    
    console.log('✓ FloatSort V2 已就绪');
}

// ========== Tab 切换 ==========
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // 更新按钮状态
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 切换面板
            tabPanes.forEach(pane => {
                if (pane.id === `${targetTab}-pane`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
            
            addActivity(`切换到: ${btn.textContent.trim()}`);
        });
    });
}

// ========== 事件监听器 ==========
function setupEventListeners() {
    // 窗口控制按钮
    document.getElementById('minimizeBtn').addEventListener('click', enterMiniMode);
    document.getElementById('closeWindowBtn').addEventListener('click', closeWindow);
    
    // 拖拽区域监听（检测拖拽状态）
    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
        appHeader.addEventListener('mousedown', () => {
            appState.isDragging = true;
            console.log('[拖拽] 开始拖拽完整窗口');
        });
    }
    
    const miniContent = document.querySelector('.mini-content');
    if (miniContent) {
        miniContent.addEventListener('mousedown', () => {
            appState.isDragging = true;
            console.log('[拖拽] 开始拖拽Mini窗口');
        });
    }
    
    // 全局监听 mouseup（拖拽结束）
    document.addEventListener('mouseup', () => {
        if (appState.isDragging) {
            appState.isDragging = false;
            console.log('[拖拽] 拖拽结束');
        }
    });
    
    // Mini窗口控制
    document.getElementById('miniWindow').addEventListener('click', handleMiniClick);
    
    // 滚轮切换规则
    document.getElementById('miniWindow').addEventListener('wheel', handleMiniWheel);
    
    // 右键菜单
    document.getElementById('miniWindow').addEventListener('contextmenu', handleMiniRightClick);
    
    // Mini窗口的鼠标进入/离开事件（用于折叠/展开）
    const miniWindow = document.getElementById('miniWindow');
    miniWindow.addEventListener('mouseenter', () => {
        appState.isMouseOver = true;
        
        // 清除待执行的折叠定时器
        if (appState.collapseTimer) {
            clearTimeout(appState.collapseTimer);
            appState.collapseTimer = null;
            console.log('[鼠标] 取消折叠定时器');
        }
        
        if (appState.isCollapsed) {
            expandWindow();
        }
    });
    
    miniWindow.addEventListener('mouseleave', async () => {
        appState.isMouseOver = false;
        console.log('[鼠标] 离开Mini窗口');
        
        // 清除之前的折叠定时器（如果有）
        if (appState.collapseTimer) {
            clearTimeout(appState.collapseTimer);
            appState.collapseTimer = null;
        }
        
        // 鼠标离开后延迟800ms再检查是否需要折叠，给用户拖拽的机会
        if (!appState.isCollapsed && appState.isMiniMode) {
            appState.collapseTimer = setTimeout(async () => {
                // 如果正在拖拽，不执行折叠
                if (appState.isDragging) {
                    console.log('[鼠标] 正在拖拽中，取消折叠');
                    appState.collapseTimer = null;
                    return;
                }
                
                try {
                    const { appWindow } = window.__TAURI__.window;
                    const position = await appWindow.outerPosition();
                    const size = await appWindow.outerSize();
                    
                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;
                    const edgeThreshold = 10;
                    
                    let nearEdge = null;
                    if (position.x <= edgeThreshold) {
                        nearEdge = 'left';
                    } else if (position.x + size.width >= screenWidth - edgeThreshold) {
                        nearEdge = 'right';
                    } else if (position.y <= edgeThreshold) {
                        nearEdge = 'top';
                    } else if (position.y + size.height >= screenHeight - edgeThreshold) {
                        nearEdge = 'bottom';
                    }
                    
                    // 如果窗口在边缘，执行折叠
                    if (nearEdge) {
                        console.log('[鼠标] Mini窗口延迟检测到靠近边缘，执行折叠');
                        collapseWindow(nearEdge);
                    }
                    
                    appState.collapseTimer = null;
                } catch (error) {
                    console.error('[鼠标] 检查窗口位置失败:', error);
                    appState.collapseTimer = null;
                }
            }, 800); // 800ms延迟，给用户足够时间拖拽窗口
            
            console.log('[鼠标] 设置Mini窗口折叠定时器（800ms后执行）');
        }
    });
    
    // 文件夹管理
    document.getElementById('addFolderBtn').addEventListener('click', () => openFolderModal());
    document.getElementById('closeFolderModal').addEventListener('click', closeFolderModal);
    document.getElementById('cancelFolderBtn').addEventListener('click', closeFolderModal);
    document.getElementById('saveFolderBtn').addEventListener('click', saveFolder);
    document.getElementById('browseFolderBtn').addEventListener('click', browseFolder);
    
    // 规则管理
    document.getElementById('addRuleBtn').addEventListener('click', () => openRuleModal());
    document.getElementById('closeRuleModal').addEventListener('click', closeRuleModal);
    document.getElementById('cancelRuleBtn').addEventListener('click', closeRuleModal);
    document.getElementById('saveRuleBtn').addEventListener('click', saveRule);
    
    // 条件构建器
    document.getElementById('conditionType').addEventListener('change', updateConditionInputs);
    document.getElementById('addConditionBtn').addEventListener('click', addCondition);
    
    // 活动日志
    document.getElementById('clearActivityBtn').addEventListener('click', clearActivity);
    
    // 批量确认窗口
    document.getElementById('closeBatchModal').addEventListener('click', closeBatchModal);
    document.getElementById('cancelBatch').addEventListener('click', closeBatchModal);
    document.getElementById('confirmBatch').addEventListener('click', confirmBatch);
    
    // 模态框点击背景关闭
    document.getElementById('folderModal').addEventListener('click', (e) => {
        if (e.target.id === 'folderModal') closeFolderModal();
    });
    document.getElementById('ruleModal').addEventListener('click', (e) => {
        if (e.target.id === 'ruleModal') closeRuleModal();
    });
    document.getElementById('batchConfirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'batchConfirmModal') closeBatchModal();
    });
}

// ========== 窗口事件监听 ==========
function setupWindowListeners() {
    const { appWindow } = window.__TAURI__.window;
    
    // 监听窗口大小变化（仅在正常状态下保存）
    let resizeTimeout;
    appWindow.onResized(async ({ payload }) => {
        // 防抖：用户停止调整大小后1秒才保存
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            // 只在正常状态下保存（非Mini模式、非折叠状态、非冷却期）
            if (!appState.isMiniMode && !appState.isCollapsed && !appState.expandCooldown) {
                const { width, height } = payload;
                try {
                    await invoke('save_window_size', { 
                        width: Math.round(width), 
                        height: Math.round(height) 
                    });
                    console.log(`✓ 窗口大小已保存: ${width}x${height}`);
                } catch (error) {
                    console.error('保存窗口大小失败:', error);
                }
            }
        }, 1000);
    });
}

// ========== 后端事件监听 ==========
function setupBackendListeners() {
    listen('file-detected', event => {
        const filePath = event.payload.file_path;
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
        
        addActivity(`📥 检测到文件: ${fileName}`);
        
        // 如果未达到批量阈值，自动整理
        // 如果达到阈值，添加到批量队列
        appState.pendingBatch.push({
            path: filePath,
            name: fileName
        });
        
        if (appState.pendingBatch.length >= appState.batchThreshold) {
            showBatchConfirm();
        }
    });
    
    listen('file-organized', event => {
        const { file_name, original_path, new_path } = event.payload;
        addActivity(
            `✅ <strong>${file_name}</strong>`,
            'success',
            `从: ${original_path}<br>到: ${new_path}`
        );
        appState.filesProcessed++;
        updateStats();
        
        // 从批量队列中移除已整理的文件
        appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== original_path);
    });
    
    listen('file-no-match', event => {
        addActivity(`⚠️ 未匹配规则: ${event.payload.file_name}`);
        
        // 从批量队列中移除未匹配的文件
        const filePath = event.payload.file_path;
        appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== filePath);
    });
    
    listen('file-error', event => {
        addActivity(`❌ 错误: ${event.payload.error}`, 'error');
    });
    
    // 监听拖拽文件事件
    listen('tauri://file-drop', event => {
        const files = event.payload;
        console.log('拖拽文件:', files);
        
        if (files && files.length > 0) {
            // Mini模式下的处理
            if (appState.isMiniMode) {
                handleMiniFileDrop(files);
                return;
            }
            
            // 完整模式下的处理
            addActivity(`📥 拖入 ${files.length} 个文件/文件夹`);
            
            // 将拖入的文件添加到批量队列
            files.forEach(filePath => {
                const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
                appState.pendingBatch.push({
                    path: filePath,
                    name: fileName
                });
            });
            
            // 如果达到批量阈值，显示确认窗口
            if (appState.pendingBatch.length >= appState.batchThreshold) {
                showBatchConfirm();
            } else {
                // 否则直接处理
                processDraggedFiles(files);
            }
        }
    });
    
    // 监听拖拽悬停事件（可选）
    listen('tauri://file-drop-hover', event => {
        console.log('文件悬停:', event.payload);
    });
    
    // 监听拖拽取消事件（可选）
    listen('tauri://file-drop-cancelled', () => {
        console.log('拖拽已取消');
    });
    
    // 监听窗口焦点事件（从托盘恢复时）
    listen('tauri://focus', async () => {
        console.log('[窗口] 窗口获得焦点');
        // 如果窗口是折叠状态，自动展开
        if (appState.isCollapsed) {
            console.log('[窗口] 从托盘恢复，自动展开窗口');
            await expandWindow();
        }
    });
}

// 处理拖拽的文件
async function processDraggedFiles(files) {
    for (const filePath of files) {
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
        
        try {
            addActivity(`🔄 开始处理: ${fileName}`);
            const result = await invoke('process_file', { path: filePath });
            
            if (result) {
                addActivity(
                    `✅ <strong>${fileName}</strong>`,
                    'success',
                    `从: ${filePath}<br>到: ${result}`
                );
                appState.filesProcessed++;
                updateStats();
                
                // 从批量队列中移除
                appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== filePath);
            } else {
                addActivity(`⚠️ 未匹配规则: ${fileName}`);
                appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== filePath);
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            addActivity(`❌ ${fileName} 处理失败: ${error}`, 'error');
            appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== filePath);
        }
    }
}

// ========== 规则卡片拖放处理 ==========
function setupRuleDragDrop() {
    const ruleCards = document.querySelectorAll('.rule-card');
    
    ruleCards.forEach(card => {
        const ruleId = card.dataset.ruleId;
        
        // 拖拽进入
        card.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!card.classList.contains('disabled')) {
                card.classList.add('drag-over');
            }
        });
        
        // 拖拽悬停
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // 拖拽离开
        card.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // 只有当离开卡片本身时才移除样式
            if (e.target === card || !card.contains(e.relatedTarget)) {
                card.classList.remove('drag-over');
            }
        });
        
        // 放下文件
        card.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            card.classList.remove('drag-over');
            
            // 禁用的规则不处理
            if (card.classList.contains('disabled')) {
                showNotification('该规则已禁用，无法处理文件', 'error');
                return;
            }
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                await processFilesWithRule(files, ruleId);
            }
        });
    });
}

// 使用指定规则处理文件
async function processFilesWithRule(files, ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    addActivity(`📋 使用规则 [${rule.name}] 处理 ${files.length} 个文件`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        try {
            // 调用后端处理，传入规则ID
            const result = await invoke('process_file_with_rule', {
                path: file.path,
                ruleId: ruleId
            });
            
            if (result) {
                addActivity(
                    `✅ <strong>${file.name}</strong>`,
                    'success',
                    `从: ${file.path}<br>到: ${result}<br>规则: ${rule.name}`
                );
                successCount++;
                appState.filesProcessed++;
            } else {
                addActivity(`⚠️ 不符合规则: ${file.name}`, 'error');
                failCount++;
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            addActivity(`❌ ${file.name} 处理失败: ${error}`, 'error');
            failCount++;
        }
    }
    
    updateStats();
    
    if (successCount > 0) {
        showNotification(`成功整理 ${successCount} 个文件`, 'success');
    }
    if (failCount > 0) {
        showNotification(`${failCount} 个文件处理失败`, 'error');
    }
}

// ========== 加载数据 ==========
async function loadAppData() {
    try {
        await loadConfig();
        await loadFolders();
        await loadRules();
        updateStats();
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败', 'error');
    }
}

async function loadConfig() {
    try {
        const config = await invoke('get_config');
        appState.batchThreshold = config.batch_threshold || 1;
        console.log(`✓ 批量确认阈值: ${appState.batchThreshold}`);
        
        // 恢复窗口大小（仅在完整模式下）
        if (!appState.isMiniMode) {
            const { appWindow } = window.__TAURI__.window;
            let width = config.window_width || 360;
            let height = config.window_height || 520;
            
            // 验证窗口尺寸，防止加载折叠后的错误尺寸
            const minWidth = 200;
            const minHeight = 300;
            if (width < minWidth || height < minHeight) {
                console.warn(`⚠️ 检测到异常窗口尺寸: ${width}x${height}，使用默认值`);
                width = 360;
                height = 520;
                // 保存修复后的尺寸
                await invoke('save_window_size', { width, height });
            }
            
            await appWindow.setSize(new window.__TAURI__.window.LogicalSize(width, height));
            console.log(`✓ 窗口大小已恢复: ${width}x${height}`);
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        // 使用默认值
        appState.batchThreshold = 1;
    }
}

async function loadFolders() {
    try {
        const folders = await invoke('get_folders');
        appState.folders = folders;
        renderFolders();
        console.log(`✓ 已加载 ${folders.length} 个文件夹`);
    } catch (error) {
        console.error('加载文件夹失败:', error);
        showNotification('加载文件夹失败', 'error');
    }
}

async function loadRules() {
    try {
        const rules = await invoke('get_rules');
        appState.rules = rules;
        renderRules();
        console.log(`✓ 已加载 ${rules.length} 条规则`);
    } catch (error) {
        console.error('加载规则失败:', error);
        showNotification('加载规则失败', 'error');
    }
}

// ========== 渲染文件夹列表 ==========
function renderFolders() {
    const folderList = document.getElementById('folderList');
    
    if (appState.folders.length === 0) {
        folderList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📂</span>
                <p>暂无监控文件夹</p>
                <p class="empty-hint">点击上方按钮添加文件夹开始监控</p>
            </div>
        `;
        return;
    }
    
    folderList.innerHTML = appState.folders.map(folder => {
        const associatedRules = appState.rules.filter(r => folder.rule_ids.includes(r.id));
        
        return `
            <div class="folder-card ${!folder.enabled ? 'disabled' : ''}" data-folder-id="${folder.id}">
                <button class="folder-toggle ${folder.enabled ? 'active' : ''}" 
                        onclick="toggleFolderMonitoring('${folder.id}')">
                </button>
                <div class="folder-header">
                    <div class="folder-info">
                        <div class="folder-name">${folder.name}</div>
                        <div class="folder-path">${folder.path}</div>
                    </div>
                </div>
                <div class="folder-rules">
                    <div class="folder-rules-title">规则 (${associatedRules.length})</div>
                    <div class="rule-tags">
                        ${associatedRules.length > 0 
                            ? associatedRules.map(r => `<span class="rule-tag">${r.name}</span>`).join('')
                            : '<span class="hint" style="font-size: 10px; color: #ccc;">未关联</span>'}
                    </div>
                </div>
                <div class="folder-actions">
                    <button class="btn-secondary btn-sm" onclick="editFolder('${folder.id}')">编辑</button>
                    <button class="btn-secondary btn-sm" onclick="deleteFolder('${folder.id}')">删除</button>
                </div>
            </div>
        `;
    }).join('');
}

// ========== 渲染规则列表 ==========
function renderRules() {
    const rulesList = document.getElementById('rulesList');
    
    if (appState.rules.length === 0) {
        rulesList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <p>暂无规则</p>
                <p class="empty-hint">创建规则来自动整理文件</p>
            </div>
        `;
        return;
    }
    
    rulesList.innerHTML = appState.rules.map((rule, index) => {
        const usedByFolders = appState.folders.filter(f => f.rule_ids.includes(rule.id));
        const condition = rule.conditions[0];
        let conditionText = '';
        const ruleLabel = getRuleLabel(index);
        
        if (condition.type === 'Extension') {
            conditionText = `扩展名: ${condition.values.join(', ')}`;
        } else if (condition.type === 'NameContains') {
            conditionText = `包含: ${condition.pattern}`;
        } else if (condition.type === 'SizeRange') {
            conditionText = `大小: ${condition.max ? Math.round(condition.max / 1024 / 1024) + 'MB' : '不限'}`;
        }
        
        // 生成文件夹列表的 tooltip
        const folderNames = usedByFolders.map(f => f.name).join('、') || '暂未被任何文件夹使用';
        
        return `
            <div class="rule-card compact ${!rule.enabled ? 'disabled' : ''}" data-rule-id="${rule.id}">
                <button class="rule-toggle ${rule.enabled ? 'active' : ''}" 
                        onclick="toggleRule('${rule.id}')">
                </button>
                <div class="rule-info">
                    <div class="rule-name">
                        <span class="rule-label">${ruleLabel}</span>
                        ${rule.name}
                    </div>
                    <div class="rule-details">${conditionText} → ${rule.action.destination}</div>
                </div>
                <div class="rule-usage" title="${folderNames}">
                    <span class="usage-badge">${usedByFolders.length}</span>
                    <span class="usage-text">个文件夹</span>
                </div>
                <div class="rule-actions">
                    <button class="btn-secondary btn-sm" onclick="editRule('${rule.id}')">编辑</button>
                    <button class="btn-secondary btn-sm" onclick="deleteRule('${rule.id}')">删除</button>
                </div>
                <div class="rule-drop-hint">拖放文件到此</div>
            </div>
        `;
    }).join('');
    
    // 为规则卡片添加拖放事件监听
    setupRuleDragDrop();
}

// ========== 规则排序功能 ==========
window.moveRuleUp = function(index) {
    const container = document.getElementById('folderRules');
    const items = Array.from(container.querySelectorAll('.rule-sort-item'));
    
    if (index > 0 && index < items.length) {
        const currentItem = items[index];
        const previousItem = items[index - 1];
        
        // 交换DOM元素
        container.insertBefore(currentItem, previousItem);
        
        // 重新渲染以更新按钮状态
        refreshRuleSortButtons();
    }
};

window.moveRuleDown = function(index) {
    const container = document.getElementById('folderRules');
    const items = Array.from(container.querySelectorAll('.rule-sort-item'));
    
    if (index >= 0 && index < items.length - 1) {
        const currentItem = items[index];
        const nextItem = items[index + 1];
        
        // 交换DOM元素
        container.insertBefore(nextItem, currentItem);
        
        // 重新渲染以更新按钮状态
        refreshRuleSortButtons();
    }
};

function refreshRuleSortButtons() {
    const container = document.getElementById('folderRules');
    const items = Array.from(container.querySelectorAll('.rule-sort-item'));
    
    items.forEach((item, index) => {
        const upBtn = item.querySelector('.sort-btn:first-child');
        const downBtn = item.querySelector('.sort-btn:last-child');
        
        // 更新按钮状态
        if (upBtn) {
            upBtn.disabled = index === 0;
            upBtn.onclick = () => moveRuleUp(index);
        }
        if (downBtn) {
            downBtn.disabled = index === items.length - 1;
            downBtn.onclick = () => moveRuleDown(index);
        }
        
        // 更新data-index
        item.setAttribute('data-index', index);
    });
}

// ========== 文件夹管理函数 ==========
async function openFolderModal(folderId = null) {
    appState.editingFolderId = folderId;
    const modal = document.getElementById('folderModal');
    const title = document.getElementById('folderModalTitle');
    const form = document.getElementById('folderForm');
    
    form.reset();
    
    // 加载规则列表用于关联
    const rulesCheckboxes = document.getElementById('folderRules');
    if (appState.rules.length === 0) {
        rulesCheckboxes.innerHTML = '<p class="hint">暂无规则，请先创建规则</p>';
    } else {
        // 如果是编辑模式，按照文件夹保存的顺序显示规则
        let orderedRules = [...appState.rules];
        if (folderId) {
            const folder = appState.folders.find(f => f.id === folderId);
            if (folder && folder.rule_ids.length > 0) {
                // 先显示已选择的规则（按保存的顺序）
                const selectedRules = folder.rule_ids
                    .map(id => appState.rules.find(r => r.id === id))
                    .filter(r => r);
                // 再显示未选择的规则
                const unselectedRules = appState.rules.filter(r => !folder.rule_ids.includes(r.id));
                orderedRules = [...selectedRules, ...unselectedRules];
            }
        }
        
        rulesCheckboxes.innerHTML = orderedRules.map((rule, index) => `
            <div class="rule-sort-item" data-rule-id="${rule.id}" data-index="${index}">
                <label class="checkbox-label">
                    <input type="checkbox" value="${rule.id}" ${folderId && appState.folders.find(f => f.id === folderId)?.rule_ids.includes(rule.id) ? 'checked' : ''}>
                    <span>${rule.name}</span>
                </label>
                <div class="rule-sort-buttons">
                    <button type="button" class="sort-btn" onclick="moveRuleUp(${index})" ${index === 0 ? 'disabled' : ''}>
                        ▲
                    </button>
                    <button type="button" class="sort-btn" onclick="moveRuleDown(${index})" ${index === orderedRules.length - 1 ? 'disabled' : ''}>
                        ▼
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    if (folderId) {
        // 编辑模式
        const folder = appState.folders.find(f => f.id === folderId);
        if (!folder) return;
        
        title.textContent = '✏️ 编辑文件夹';
        document.getElementById('folderPath').value = folder.path;
        document.getElementById('folderName').value = folder.name;
        document.getElementById('folderEnabled').checked = folder.enabled;
    } else {
        // 新增模式
        title.textContent = '📁 添加文件夹';
    }
    
    modal.style.display = 'flex';
}

function closeFolderModal() {
    document.getElementById('folderModal').style.display = 'none';
    appState.editingFolderId = null;
}

async function browseFolder() {
    try {
        const selected = await dialog.open({
            directory: true,
            multiple: false,
        });
        
        if (selected) {
            document.getElementById('folderPath').value = selected;
            // 自动填充文件夹名称
            const name = selected.split('\\').pop() || selected.split('/').pop();
            if (!document.getElementById('folderName').value) {
                document.getElementById('folderName').value = name;
            }
        }
    } catch (error) {
        console.error('浏览文件夹失败:', error);
        showNotification('浏览文件夹失败', 'error');
    }
}

async function saveFolder() {
    const path = document.getElementById('folderPath').value.trim();
    const name = document.getElementById('folderName').value.trim();
    const enabled = document.getElementById('folderEnabled').checked;
    
    if (!path || !name) {
        showNotification('请填写完整信息', 'error');
        return;
    }
    
    // 获取选中的规则（按照DOM顺序，体现排序结果）
    const allRuleItems = document.querySelectorAll('#folderRules .rule-sort-item');
    const ruleIds = Array.from(allRuleItems)
        .filter(item => item.querySelector('input[type="checkbox"]').checked)
        .map(item => item.getAttribute('data-rule-id'));
    
    const folder = {
        id: appState.editingFolderId || `folder_${Date.now()}`,
        path,
        name,
        enabled,
        rule_ids: ruleIds,
    };
    
    try {
        if (appState.editingFolderId) {
            await invoke('update_folder', { folderId: appState.editingFolderId, folder });
            showNotification(`文件夹 "${name}" 已更新`, 'success');
            addActivity(`✏️ 更新文件夹: ${name}`);
        } else {
            await invoke('add_folder', { folder });
            showNotification(`文件夹 "${name}" 已添加`, 'success');
            addActivity(`➕ 添加文件夹: ${name}`);
        }
        
        await loadFolders();
        closeFolderModal();
        updateStats();
    } catch (error) {
        console.error('保存文件夹失败:', error);
        showNotification(`保存失败: ${error}`, 'error');
    }
}

async function toggleFolderMonitoring(folderId) {
    try {
        const newState = await invoke('toggle_folder', { folderId });
        const folder = appState.folders.find(f => f.id === folderId);
        
        if (folder) {
            folder.enabled = newState;
            renderFolders();
            showNotification(
                `文件夹 "${folder.name}" 监控${newState ? '已启用' : '已停用'}`,
                newState ? 'success' : 'info'
            );
            addActivity(`${newState ? '🟢' : '🔴'} ${folder.name} 监控${newState ? '启用' : '停用'}`);
        }
    } catch (error) {
        console.error('切换监控失败:', error);
        showNotification('切换监控失败', 'error');
    }
}

async function editFolder(folderId) {
    await openFolderModal(folderId);
}

async function deleteFolder(folderId) {
    const folder = appState.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) return;
    
    try {
        await invoke('remove_folder', { folderId });
        showNotification(`文件夹 "${folder.name}" 已删除`, 'success');
        addActivity(`🗑️ 删除文件夹: ${folder.name}`);
        await loadFolders();
        updateStats();
    } catch (error) {
        console.error('删除文件夹失败:', error);
        showNotification('删除失败', 'error');
    }
}

// ========== 条件构建器函数 ==========

// 更新条件输入框
function updateConditionInputs() {
    const type = document.getElementById('conditionType').value;
    const container = document.getElementById('conditionInputs');
    
    container.innerHTML = '';
    
    switch (type) {
        case 'extension':
            container.innerHTML = `
                <input type="text" id="conditionInput" placeholder="输入扩展名，逗号分隔（如：jpg,png,gif）" />
            `;
            break;
        case 'name':
            container.innerHTML = `
                <input type="text" id="conditionInput" placeholder="输入文件名关键字" />
            `;
            break;
        case 'regex':
            container.innerHTML = `
                <input type="text" id="conditionInput" placeholder="输入正则表达式（如：^report_.*\\.pdf$）" />
            `;
            break;
        case 'size':
            container.innerHTML = `
                <input type="number" id="minSize" placeholder="最小大小(MB)" min="0" step="0.1" style="flex: 1;" />
                <input type="number" id="maxSize" placeholder="最大大小(MB)" min="0" step="0.1" style="flex: 1;" />
            `;
            break;
        case 'created':
        case 'modified':
            container.innerHTML = `
                <input type="number" id="minDays" placeholder="最少天数" min="0" style="flex: 1;" />
                <input type="number" id="maxDays" placeholder="最多天数" min="0" style="flex: 1;" />
            `;
            break;
    }
}

// 添加条件
function addCondition() {
    const type = document.getElementById('conditionType').value;
    let condition = null;
    
    switch (type) {
        case 'extension': {
            const input = document.getElementById('conditionInput').value.trim();
            if (!input) {
                showNotification('请输入文件扩展名', 'error');
                return;
            }
            const values = input.split(',').map(v => v.trim()).filter(v => v);
            condition = {
                type: 'Extension',
                values: values,
                displayText: `扩展名: ${values.join(', ')}`
            };
            break;
        }
        case 'name': {
            const pattern = document.getElementById('conditionInput').value.trim();
            if (!pattern) {
                showNotification('请输入文件名关键字', 'error');
                return;
            }
            condition = {
                type: 'NameContains',
                pattern: pattern,
                displayText: `文件名包含: ${pattern}`
            };
            break;
        }
        case 'regex': {
            const pattern = document.getElementById('conditionInput').value.trim();
            if (!pattern) {
                showNotification('请输入正则表达式', 'error');
                return;
            }
            condition = {
                type: 'NameRegex',
                pattern: pattern,
                displayText: `正则匹配: ${pattern}`
            };
            break;
        }
        case 'size': {
            const min = document.getElementById('minSize').value;
            const max = document.getElementById('maxSize').value;
            if (!min && !max) {
                showNotification('请输入至少一个大小限制', 'error');
                return;
            }
            condition = {
                type: 'SizeRange',
                min: min ? parseInt(parseFloat(min) * 1024 * 1024) : null,
                max: max ? parseInt(parseFloat(max) * 1024 * 1024) : null,
                displayText: `文件大小: ${min ? min + 'MB' : '无限制'} ~ ${max ? max + 'MB' : '无限制'}`
            };
            break;
        }
        case 'created': {
            const min = document.getElementById('minDays').value;
            const max = document.getElementById('maxDays').value;
            if (!min && !max) {
                showNotification('请输入至少一个天数限制', 'error');
                return;
            }
            condition = {
                type: 'CreatedDaysAgo',
                min: min ? parseInt(min) : null,
                max: max ? parseInt(max) : null,
                displayText: `创建于: ${min ? min + '天' : '无限制'} ~ ${max ? max + '天' : '无限制'}前`
            };
            break;
        }
        case 'modified': {
            const min = document.getElementById('minDays').value;
            const max = document.getElementById('maxDays').value;
            if (!min && !max) {
                showNotification('请输入至少一个天数限制', 'error');
                return;
            }
            condition = {
                type: 'ModifiedDaysAgo',
                min: min ? parseInt(min) : null,
                max: max ? parseInt(max) : null,
                displayText: `修改于: ${min ? min + '天' : '无限制'} ~ ${max ? max + '天' : '无限制'}前`
            };
            break;
        }
    }
    
    if (condition) {
        appState.currentConditions.push(condition);
        renderConditions();
        
        // 清空输入
        const inputs = document.getElementById('conditionInputs').querySelectorAll('input');
        inputs.forEach(input => input.value = '');
    }
}

// 删除条件（全局暴露）
window.removeCondition = function(index) {
    appState.currentConditions.splice(index, 1);
    renderConditions();
};

// 渲染条件列表
function renderConditions() {
    const container = document.getElementById('conditionsList');
    
    if (appState.currentConditions.length === 0) {
        container.innerHTML = '<div class="conditions-empty">暂无条件，请添加至少一个条件</div>';
        return;
    }
    
    container.innerHTML = appState.currentConditions.map((cond, index) => `
        <div class="condition-item">
            <div class="condition-content">
                <span class="condition-type">${getConditionTypeLabel(cond.type)}</span>
                <span class="condition-value">${cond.displayText}</span>
            </div>
            <button class="condition-remove" onclick="removeCondition(${index})">删除</button>
        </div>
    `).join('');
}

// 获取条件类型标签
function getConditionTypeLabel(type) {
    const labels = {
        'Extension': '📦',
        'NameContains': '🔤',
        'NameRegex': '🔎',
        'SizeRange': '📏',
        'CreatedDaysAgo': '📅',
        'ModifiedDaysAgo': '🕒'
    };
    return labels[type] || '⚙️';
}

// ========== 规则管理函数 ==========
async function openRuleModal(ruleId = null) {
    appState.editingRuleId = ruleId;
    appState.currentConditions = [];
    
    const modal = document.getElementById('ruleModal');
    const title = document.getElementById('ruleModalTitle');
    const form = document.getElementById('ruleForm');
    
    form.reset();
    
    if (ruleId) {
        // 编辑模式
        const rule = appState.rules.find(r => r.id === ruleId);
        if (!rule) return;
        
        title.textContent = '✏️ 编辑规则';
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('targetFolder').value = rule.action.destination;
        
        // 加载现有条件
        appState.currentConditions = rule.conditions.map(cond => {
            let displayText = '';
            if (cond.type === 'Extension') {
                displayText = `扩展名: ${cond.values.join(', ')}`;
            } else if (cond.type === 'NameContains') {
                displayText = `文件名包含: ${cond.pattern}`;
            } else if (cond.type === 'NameRegex') {
                displayText = `正则匹配: ${cond.pattern}`;
            } else if (cond.type === 'SizeRange') {
                const minMB = cond.min ? Math.round(cond.min / 1024 / 1024) : null;
                const maxMB = cond.max ? Math.round(cond.max / 1024 / 1024) : null;
                displayText = `文件大小: ${minMB ? minMB + 'MB' : '无限制'} ~ ${maxMB ? maxMB + 'MB' : '无限制'}`;
            } else if (cond.type === 'CreatedDaysAgo') {
                displayText = `创建于: ${cond.min || '无限制'} ~ ${cond.max || '无限制'}天前`;
            } else if (cond.type === 'ModifiedDaysAgo') {
                displayText = `修改于: ${cond.min || '无限制'} ~ ${cond.max || '无限制'}天前`;
            }
            return { ...cond, displayText };
        });
    } else {
        // 新增模式
        title.textContent = '📝 创建规则';
    }
    
    // 初始化条件构建器
    updateConditionInputs();
    renderConditions();
    
    modal.style.display = 'flex';
}

function closeRuleModal() {
    document.getElementById('ruleModal').style.display = 'none';
    appState.editingRuleId = null;
}

async function saveRule() {
    const name = document.getElementById('ruleName').value.trim();
    const target = document.getElementById('targetFolder').value.trim();
    
    if (!name || !target) {
        showNotification('请填写完整信息', 'error');
        return;
    }
    
    if (appState.currentConditions.length === 0) {
        showNotification('请至少添加一个条件', 'error');
        return;
    }
    
    // 将条件转换为后端格式（移除displayText）
    const conditions = appState.currentConditions.map(cond => {
        const { displayText, ...rest } = cond;
        return rest;
    });
    
    const rule = {
        id: appState.editingRuleId || `rule_${Date.now()}`,
        name,
        enabled: true,
        conditions: conditions,
        action: { type: 'MoveTo', destination: target },
        priority: 0,
    };
    
    try {
        if (appState.editingRuleId) {
            await invoke('update_rule', { ruleId: appState.editingRuleId, rule });
            showNotification(`规则 "${name}" 已更新`, 'success');
            addActivity(`✏️ 更新规则: ${name}`);
        } else {
            await invoke('add_rule', { rule });
            showNotification(`规则 "${name}" 已添加`, 'success');
            addActivity(`➕ 添加规则: ${name}`);
        }
        
        await loadRules();
        closeRuleModal();
        updateStats();
    } catch (error) {
        console.error('保存规则失败:', error);
        showNotification(`保存失败: ${error}`, 'error');
    }
}

async function editRule(ruleId) {
    await openRuleModal(ruleId);
}

async function deleteRule(ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    if (!confirm(`确定要删除规则 "${rule.name}" 吗？`)) return;
    
    try {
        await invoke('remove_rule', { ruleId });
        showNotification(`规则 "${rule.name}" 已删除`, 'success');
        addActivity(`🗑️ 删除规则: ${rule.name}`);
        await loadRules();
        await loadFolders(); // 重新加载文件夹以更新关联
        updateStats();
    } catch (error) {
        console.error('删除规则失败:', error);
        showNotification('删除失败', 'error');
    }
}

// 切换规则启用/禁用状态
async function toggleRule(ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    try {
        // 切换状态
        rule.enabled = !rule.enabled;
        
        // 调用后端更新
        await invoke('update_rule', { ruleId, rule });
        
        const status = rule.enabled ? '启用' : '禁用';
        showNotification(`规则 "${rule.name}" 已${status}`, 'success');
        addActivity(`${rule.enabled ? '[启用]' : '[停用]'} ${status}规则: ${rule.name}`);
        
        // 重新渲染
        await loadRules();
        updateStats();
    } catch (error) {
        console.error('切换规则状态失败:', error);
        showNotification('操作失败', 'error');
        // 恢复状态
        rule.enabled = !rule.enabled;
    }
}

// ========== 统计信息 ==========
function updateStats() {
    document.getElementById('filesProcessedCount').textContent = appState.filesProcessed;
    document.getElementById('foldersCount').textContent = appState.folders.filter(f => f.enabled).length;
    document.getElementById('rulesCount').textContent = appState.rules.filter(r => r.enabled).length;
}

// ========== 活动日志 ==========
function addActivity(message, type = 'info', details = null) {
    const activityLog = document.getElementById('activityLog');
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    let detailsHtml = '';
    if (details) {
        detailsHtml = `<div class="activity-details">${details}</div>`;
    }
    
    item.innerHTML = `
        <span class="activity-time">${timeStr}</span>
        <div class="activity-content">
            <div class="activity-message">${message}</div>
            ${detailsHtml}
        </div>
    `;
    
    activityLog.insertBefore(item, activityLog.firstChild);
    
    // 限制日志条目数量
    while (activityLog.children.length > 100) {
        activityLog.removeChild(activityLog.lastChild);
    }
}

function clearActivity() {
    const activityLog = document.getElementById('activityLog');
    activityLog.innerHTML = `
        <div class="activity-item">
            <span class="activity-time">清空</span>
            <span class="activity-message">活动日志已清空</span>
        </div>
    `;
}

// ========== 通知系统 ==========
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? '[成功]' : type === 'error' ? '[错误]' : '[信息]';
    
    notification.innerHTML = `
        <span>${icon}</span>
        <div class="notification-message">${message}</div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ========== 批量确认功能 ==========
async function showBatchConfirm() {
    const modal = document.getElementById('batchConfirmModal');
    const count = document.getElementById('batchCount');
    const list = document.getElementById('batchFileList');
    
    count.textContent = appState.pendingBatch.length;
    
    // 显示加载状态
    list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #667eea;">
            <div style="font-size: 32px;">⏳</div>
            <div style="margin-top: 10px;">正在计算目标位置...</div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // 预先计算每个文件的目标位置
    const filesPreviews = await Promise.all(
        appState.pendingBatch.map(async file => {
            try {
                const preview = await invoke('preview_file_organization', { path: file.path });
                return {
                    ...file,
                    matched: preview.matched,
                    ruleName: preview.rule_name || null,
                    targetPath: preview.target_path || '未匹配任何规则'
                };
            } catch (error) {
                console.error('预览失败:', error);
                return {
                    ...file,
                    matched: false,
                    targetPath: `错误: ${error}`
                };
            }
        })
    );
    
    // 渲染文件列表（带目标路径）
    list.innerHTML = filesPreviews.map(file => {
        const icon = file.matched ? '📄' : '⚠️';
        const toColor = file.matched ? '#27ae60' : '#e74c3c';
        const toPrefix = file.matched ? '📥 到: ' : '⚠️ ';
        
        return `
            <div class="batch-file-item">
                <div class="file-icon">${icon}</div>
                <div class="file-info">
                    <div class="file-name">${file.name}${file.ruleName ? ` <span style="color: #667eea; font-size: 11px;">(${file.ruleName})</span>` : ''}</div>
                    <div class="file-path from">${file.path}</div>
                    <div class="file-path to" style="color: ${toColor};">${toPrefix}${file.targetPath}</div>
                </div>
            </div>
        `;
    }).join('');
    
    addActivity(`🔔 批量整理确认 (${appState.pendingBatch.length} 个文件)`);
}

function closeBatchModal() {
    document.getElementById('batchConfirmModal').style.display = 'none';
    // 取消整理，清空队列
    appState.pendingBatch = [];
    addActivity(`[取消] 已取消批量整理`);
}

async function confirmBatch() {
    const files = [...appState.pendingBatch];
    document.getElementById('batchConfirmModal').style.display = 'none';
    
    addActivity(`[批量] 开始批量整理 (${files.length} 个文件)`);
    
    // 逐个处理文件
    for (const file of files) {
        try {
            await invoke('process_file', { path: file.path });
        } catch (error) {
            console.error(`处理文件失败: ${file.name}`, error);
            addActivity(`❌ ${file.name} 处理失败: ${error}`, 'error');
        }
    }
}

// ========== 窗口控制 ==========

// 关闭窗口（隐藏到托盘）
async function closeWindow() {
    try {
        await invoke('hide_to_tray');
        addActivity('[托盘] 已最小化到系统托盘');
    } catch (error) {
        console.error('隐藏到托盘失败:', error);
    }
}

// ========== 窗口边缘折叠功能 ==========

// 启动窗口位置监听
function startPositionMonitoring() {
    if (appState.positionCheckInterval) return;
    
    appState.positionCheckInterval = setInterval(async () => {
        // 冷却期内不检查（防止展开后立即折叠）
        if (appState.expandCooldown) return;
        
        // 鼠标在窗口上时不自动折叠
        if (appState.isMouseOver) return;
        
        try {
            const { appWindow } = window.__TAURI__.window;
            const position = await appWindow.outerPosition();
            const size = await appWindow.outerSize();
            
            // 获取屏幕尺寸
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            
            const edgeThreshold = 10; // 边缘阈值（像素）
            
            let nearEdge = null;
            if (position.x <= edgeThreshold) {
                nearEdge = 'left';
            } else if (position.x + size.width >= screenWidth - edgeThreshold) {
                nearEdge = 'right';
            } else if (position.y <= edgeThreshold) {
                nearEdge = 'top';
            } else if (position.y + size.height >= screenHeight - edgeThreshold) {
                nearEdge = 'bottom';
            }
            
            // 只在靠近边缘且未折叠时才折叠
            // 不自动展开，展开由 mouseenter 触发
            if (nearEdge && !appState.isCollapsed) {
                collapseWindow(nearEdge);
            }
        } catch (error) {
            console.error('检查窗口位置失败:', error);
        }
    }, 500); // 每500ms检查一次
}

// 停止窗口位置监听
function stopPositionMonitoring() {
    if (appState.positionCheckInterval) {
        clearInterval(appState.positionCheckInterval);
        appState.positionCheckInterval = null;
    }
}

// 折叠窗口
async function collapseWindow(edge) {
    if (appState.isCollapsed && appState.collapseEdge === edge) return;
    
    try {
        const { appWindow, LogicalSize } = window.__TAURI__.window;
        const currentSize = await appWindow.outerSize();
        
        console.log('[折叠] 开始折叠窗口', {
            edge,
            currentSize: { width: currentSize.width, height: currentSize.height },
            isCollapsed: appState.isCollapsed
        });
        
        // 只在未折叠时保存原始尺寸和位置
        if (!appState.isCollapsed) {
            const currentPosition = await appWindow.outerPosition();
            appState.originalSize = {
                width: currentSize.width,
                height: currentSize.height
            };
            appState.originalPosition = {
                x: currentPosition.x,
                y: currentPosition.y
            };
            console.log('[折叠] 保存原始尺寸和位置:', {
                size: appState.originalSize,
                position: appState.originalPosition
            });
        }
        
        appState.isCollapsed = true;
        appState.collapseEdge = edge;
        
        // 使用原始尺寸计算折叠后的尺寸（确保每次折叠都基于相同的基准）
        const baseSize = appState.originalSize;
        const collapsedSize = 2; // 折叠后固定为2px的极细线条
        
        // 获取屏幕尺寸和当前位置
        const position = await appWindow.outerPosition();
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        
        let newSize;
        let newPosition = null;
        
        if (edge === 'left' || edge === 'right') {
            // 左右折叠：宽度缩小到2px
            newSize = new LogicalSize(collapsedSize, baseSize.height);
            
            if (edge === 'right') {
                // 右边缘：窗口完全贴在屏幕右侧，使用+1偏移以消除间隙
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    screenWidth - collapsedSize + 1,
                    position.y
                );
            } else if (edge === 'left') {
                // 左边缘：窗口完全贴在屏幕左侧，使用-1偏移以消除间隙
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    -1,
                    position.y
                );
            }
        } else {
            // 上下折叠：高度缩小到2px
            newSize = new LogicalSize(baseSize.width, collapsedSize);
            
            if (edge === 'bottom') {
                // 底部边缘：窗口完全贴在屏幕底部，使用+1偏移以消除间隙
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    position.x,
                    screenHeight - collapsedSize + 1
                );
            } else if (edge === 'top') {
                // 顶部边缘：窗口完全贴在屏幕顶部，使用-1偏移以消除间隙
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    position.x,
                    -1
                );
            }
        }
        
        // 先设置尺寸，再设置位置，确保窗口紧贴边缘
        await appWindow.setSize(newSize);
        if (newPosition) {
            await appWindow.setPosition(newPosition);
            // 等待一帧确保位置更新
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        // 最后添加折叠CSS类（在窗口尺寸改变后）
        if (appState.isMiniMode) {
            document.getElementById('miniWindow').classList.add('collapsed');
        } else {
            document.getElementById('appContainer').classList.add('collapsed');
        }
        
        console.log(`[折叠] 窗口已折叠到${edge}边缘`, {
            newSize: { width: newSize.width, height: newSize.height },
            newPosition: newPosition ? { x: newPosition.x, y: newPosition.y } : null
        });
    } catch (error) {
        console.error('[折叠] 折叠窗口失败:', error);
    }
}

// 展开窗口
async function expandWindow() {
    if (!appState.isCollapsed) return;
    
    try {
        const { appWindow, LogicalSize } = window.__TAURI__.window;
        
        console.log('[展开] 开始展开窗口，当前状态:', {
            isCollapsed: appState.isCollapsed,
            originalSize: appState.originalSize,
            isMiniMode: appState.isMiniMode
        });
        
        // 先移除折叠CSS类（根据模式选择目标元素）
        if (appState.isMiniMode) {
            document.getElementById('miniWindow').classList.remove('collapsed');
        } else {
            document.getElementById('appContainer').classList.remove('collapsed');
        }
        
        // 更新状态
        appState.isCollapsed = false;
        appState.collapseEdge = null;
        
        // 设置极短冷却期，仅防止展开过程中被中断
        appState.expandCooldown = true;
        setTimeout(() => {
            appState.expandCooldown = false;
            console.log('[展开] 冷却期结束');
        }, 200);
        
        // 等待一帧，让DOM更新
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // 恢复原始尺寸和位置
        if (appState.originalSize && appState.originalPosition) {
            const newSize = new LogicalSize(appState.originalSize.width, appState.originalSize.height);
            const newPosition = new window.__TAURI__.window.LogicalPosition(
                appState.originalPosition.x,
                appState.originalPosition.y
            );
            
            await appWindow.setSize(newSize);
            await appWindow.setPosition(newPosition);
            
            console.log('[展开] 恢复窗口尺寸和位置:', {
                size: appState.originalSize,
                position: appState.originalPosition
            });
            
            // 立即保存正确的尺寸到配置
            try {
                await invoke('save_window_size', { 
                    width: Math.round(appState.originalSize.width), 
                    height: Math.round(appState.originalSize.height) 
                });
                console.log('[展开] 窗口尺寸已保存到配置');
            } catch (error) {
                console.error('[展开] 保存窗口尺寸失败:', error);
            }
        }
        
        // 清除保存的原始尺寸和位置，下次折叠时会重新保存
        appState.originalSize = null;
        appState.originalPosition = null;
        
        // 强制触发窗口resize事件，确保布局更新
        window.dispatchEvent(new Event('resize'));
        
        console.log('[展开] 窗口已完全展开');
    } catch (error) {
        console.error('[展开] 展开窗口失败:', error);
    }
}

// 鼠标进入/离开窗口事件
function setupCollapseExpand() {
    const container = document.getElementById('appContainer');
    
    container.addEventListener('mouseenter', () => {
        appState.isMouseOver = true;
        console.log('[鼠标] 进入窗口');
        
        // 清除待执行的折叠定时器
        if (appState.collapseTimer) {
            clearTimeout(appState.collapseTimer);
            appState.collapseTimer = null;
            console.log('[鼠标] 取消折叠定时器');
        }
        
        if (appState.isCollapsed) {
            expandWindow();
        }
    });
    
    container.addEventListener('mouseleave', async () => {
        appState.isMouseOver = false;
        console.log('[鼠标] 离开窗口');
        
        // 清除之前的折叠定时器（如果有）
        if (appState.collapseTimer) {
            clearTimeout(appState.collapseTimer);
            appState.collapseTimer = null;
        }
        
        // 鼠标离开后延迟800ms再检查是否需要折叠，给用户拖拽的机会
        if (!appState.isCollapsed && !appState.isMiniMode) {
            appState.collapseTimer = setTimeout(async () => {
                // 如果正在拖拽，不执行折叠
                if (appState.isDragging) {
                    console.log('[鼠标] 正在拖拽中，取消折叠');
                    appState.collapseTimer = null;
                    return;
                }
                
                try {
                    const { appWindow } = window.__TAURI__.window;
                    const position = await appWindow.outerPosition();
                    const size = await appWindow.outerSize();
                    
                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;
                    const edgeThreshold = 10;
                    
                    let nearEdge = null;
                    if (position.x <= edgeThreshold) {
                        nearEdge = 'left';
                    } else if (position.x + size.width >= screenWidth - edgeThreshold) {
                        nearEdge = 'right';
                    } else if (position.y <= edgeThreshold) {
                        nearEdge = 'top';
                    } else if (position.y + size.height >= screenHeight - edgeThreshold) {
                        nearEdge = 'bottom';
                    }
                    
                    // 如果窗口在边缘，执行折叠
                    if (nearEdge) {
                        console.log('[鼠标] 延迟检测到靠近边缘，执行折叠');
                        collapseWindow(nearEdge);
                    }
                    
                    appState.collapseTimer = null;
                } catch (error) {
                    console.error('[鼠标] 检查窗口位置失败:', error);
                    appState.collapseTimer = null;
                }
            }, 800); // 800ms延迟，给用户足够时间拖拽窗口
            
            console.log('[鼠标] 设置折叠定时器（800ms后执行）');
        }
    });
}

// ========== Mini窗口模式 ==========

// 进入Mini模式
async function enterMiniMode() {
    // 进入Mini模式前，保存当前窗口尺寸
    try {
        const { appWindow } = window.__TAURI__.window;
        const currentSize = await appWindow.outerSize();
        await invoke('save_window_size', { 
            width: currentSize.width, 
            height: currentSize.height 
        });
        console.log(`✓ 保存窗口尺寸: ${currentSize.width}x${currentSize.height}`);
    } catch (error) {
        console.error('保存窗口尺寸失败:', error);
    }
    
    appState.isMiniMode = true;
    
    // 重置折叠相关状态
    appState.expandCooldown = false;
    appState.isMouseOver = false;
    appState.originalPosition = null;
    
    // 清除折叠状态
    if (appState.isCollapsed) {
        appState.isCollapsed = false;
        appState.collapseEdge = null;
        document.getElementById('appContainer').classList.remove('collapsed');
    }
    
    // 隐藏完整界面，显示Mini窗口
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('miniWindow').style.display = 'flex';
    
    // 调整窗口大小
    try {
        const { appWindow } = window.__TAURI__.window;
        await appWindow.setSize(new window.__TAURI__.window.LogicalSize(300, 300));
        await appWindow.setResizable(false);
    } catch (error) {
        console.error('调整窗口大小失败:', error);
    }
    
    // 更新Mini显示
    updateMiniDisplay();
    
    // 继续位置监听（mini模式也支持折叠）
    // 位置监听器会检查 isMiniMode 并相应处理
    
    addActivity('[Mini] 进入Mini模式');
}

// 退出Mini模式
async function exitMiniMode() {
    appState.isMiniMode = false;
    
    // 隐藏右键菜单
    hideContextMenu();
    
    // 显示完整界面，隐藏Mini窗口
    const miniWindow = document.getElementById('miniWindow');
    miniWindow.style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // 恢复窗口大小（从配置加载，而不是硬编码）
    try {
        const { appWindow } = window.__TAURI__.window;
        const config = await invoke('get_config');
        let width = config.window_width || 360;
        let height = config.window_height || 520;
        
        // 验证窗口尺寸
        const minWidth = 200;
        const minHeight = 300;
        if (width < minWidth || height < minHeight) {
            width = 360;
            height = 520;
        }
        
        await appWindow.setSize(new window.__TAURI__.window.LogicalSize(width, height));
        await appWindow.setResizable(true);
        console.log(`✓ 恢复窗口尺寸: ${width}x${height}`);
    } catch (error) {
        console.error('恢复窗口大小失败:', error);
    }
    
    // 重新启动位置监听
    startPositionMonitoring();
    
    addActivity('[Mini] 退出Mini模式');
}

// 处理Mini窗口点击（直接退出）
async function handleMiniClick(e) {
    await exitMiniMode();
}

// 获取启用的规则列表
function getEnabledRules() {
    return appState.rules.filter(r => r.enabled);
}

// 更新Mini显示
function updateMiniDisplay() {
    const labelEl = document.getElementById('miniRuleLabel');
    const nameEl = document.getElementById('miniRuleName');
    
    if (appState.currentRuleIndex === -1) {
        labelEl.textContent = '[*]';
        nameEl.textContent = '所有启用规则';
    } else {
        const enabledRules = getEnabledRules();
        if (appState.currentRuleIndex < enabledRules.length) {
            const rule = enabledRules[appState.currentRuleIndex];
            const label = getRuleLabel(appState.currentRuleIndex);
            labelEl.textContent = `[${label}]`;
            nameEl.textContent = rule.name;
        } else {
            // 索引超出范围，重置为"所有规则"
            appState.currentRuleIndex = -1;
            labelEl.textContent = '[*]';
            nameEl.textContent = '所有启用规则';
        }
    }
}

// 处理滚轮切换规则（只切换启用的规则）
function handleMiniWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const enabledRules = getEnabledRules();
    
    if (e.deltaY < 0) {
        // 向上滚：上一个规则
        appState.currentRuleIndex = Math.max(-1, appState.currentRuleIndex - 1);
    } else {
        // 向下滚：下一个规则
        appState.currentRuleIndex = Math.min(enabledRules.length - 1, appState.currentRuleIndex + 1);
    }
    
    updateMiniDisplay();
    
    // 更新状态提示
    const statusEl = document.getElementById('miniStatus');
    statusEl.textContent = '规则已切换';
    setTimeout(() => {
        statusEl.textContent = '滚轮切换';
    }, 1000);
}

// 处理右键菜单
function handleMiniRightClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    showContextMenu(e.clientX, e.clientY);
}

// 显示右键菜单（只显示启用的规则）
function showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    const enabledRules = getEnabledRules();
    
    // 生成菜单项
    let menuHTML = '';
    
    // "所有规则"选项
    menuHTML += `
        <div class="context-menu-item ${appState.currentRuleIndex === -1 ? 'selected' : ''}" 
             onclick="selectRule(-1)">
            <span class="label">
                <span class="menu-badge">*</span>
                所有启用规则
            </span>
            ${appState.currentRuleIndex === -1 ? '✓' : ''}
        </div>
    `;
    
    if (enabledRules.length > 0) {
        menuHTML += '<div class="context-menu-divider"></div>';
    }
    
    // 各个启用的规则选项
    enabledRules.forEach((rule, index) => {
        const label = getRuleLabel(index);
        const isSelected = appState.currentRuleIndex === index;
        menuHTML += `
            <div class="context-menu-item ${isSelected ? 'selected' : ''}" 
                 onclick="selectRule(${index})">
                <span class="label">
                    <span class="menu-badge">${label}</span>
                    ${rule.name}
                </span>
                ${isSelected ? '✓' : ''}
            </div>
        `;
    });
    
    menu.innerHTML = menuHTML;
    
    // 定位菜单
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.classList.add('show');
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', hideContextMenu, { once: true });
    }, 0);
}

// 隐藏右键菜单
function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('show');
}

// 选择规则
function selectRule(index) {
    appState.currentRuleIndex = index;
    updateMiniDisplay();
    hideContextMenu();
}

// 处理Mini模式下的文件拖拽
async function handleMiniFileDrop(files) {
    const statusEl = document.getElementById('miniStatus');
    const miniWindow = document.getElementById('miniWindow');
    
    // 添加拖拽视觉反馈
    miniWindow.classList.add('drag-over');
    
    try {
        statusEl.textContent = `处理中... (${files.length} 个)`;
        
        let successCount = 0;
        let failCount = 0;
        
        for (const filePath of files) {
            const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
            
            try {
                // 根据当前选择的规则处理文件
                const result = await invoke('process_file', { path: filePath });
                
                if (result) {
                    successCount++;
                    console.log(`✓ ${fileName} 已整理`);
                } else {
                    console.log(`⚠ ${fileName} 未匹配规则`);
                }
            } catch (error) {
                failCount++;
                console.error(`✗ ${fileName} 处理失败:`, error);
            }
        }
        
        // 显示结果
        if (successCount > 0) {
            statusEl.textContent = `✓ 已整理 ${successCount} 个`;
        } else if (failCount > 0) {
            statusEl.textContent = `✗ 处理失败`;
        } else {
            statusEl.textContent = `⚠ 未匹配规则`;
        }
        
        // 2秒后恢复提示
        setTimeout(() => {
            statusEl.textContent = '滚轮切换';
            miniWindow.classList.remove('drag-over');
        }, 2000);
        
    } catch (error) {
        console.error('处理文件失败:', error);
        statusEl.textContent = '✗ 处理失败';
        setTimeout(() => {
            statusEl.textContent = '滚轮切换';
            miniWindow.classList.remove('drag-over');
        }, 2000);
    }
}

// 导出函数供 HTML 内联调用
window.toggleFolderMonitoring = toggleFolderMonitoring;
window.editFolder = editFolder;
window.deleteFolder = deleteFolder;
window.editRule = editRule;
window.deleteRule = deleteRule;
window.toggleRule = toggleRule;
window.selectRule = selectRule;

