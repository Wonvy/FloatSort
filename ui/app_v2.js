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
    batchThreshold: 5,  // 批量确认阈值
    currentConditions: [],  // 当前规则的条件列表
    currentRuleIndex: -1,  // 当前选中的规则索引（-1表示所有规则）
    isMiniMode: false,  // 是否处于Mini模式
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
    // 全局监控按钮
    document.getElementById('globalStartBtn').addEventListener('click', startAllMonitoring);
    document.getElementById('globalStopBtn').addEventListener('click', stopAllMonitoring);
    
    // Mini窗口控制
    document.getElementById('minimizeBtn').addEventListener('click', enterMiniMode);
    document.getElementById('miniWindow').addEventListener('click', exitMiniMode);
    
    // 滚轮切换规则
    document.getElementById('miniWindow').addEventListener('wheel', handleMiniWheel);
    
    // 右键菜单
    document.getElementById('miniWindow').addEventListener('contextmenu', handleMiniRightClick);
    
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

// ========== 加载数据 ==========
async function loadAppData() {
    try {
        await loadFolders();
        await loadRules();
        updateStats();
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败', 'error');
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
            <div class="rule-card compact">
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
            </div>
        `;
    }).join('');
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

// ========== 监控控制 ==========
async function startAllMonitoring() {
    try {
        await invoke('start_monitoring');
        appState.monitoring = true;
        document.getElementById('globalStartBtn').style.display = 'none';
        document.getElementById('globalStopBtn').style.display = 'block';
        showNotification('全局监控已启动', 'success');
        addActivity('🟢 启动全局监控');
    } catch (error) {
        console.error('启动监控失败:', error);
        showNotification(`启动失败: ${error}`, 'error');
    }
}

async function stopAllMonitoring() {
    try {
        await invoke('stop_monitoring');
        appState.monitoring = false;
        document.getElementById('globalStartBtn').style.display = 'block';
        document.getElementById('globalStopBtn').style.display = 'none';
        showNotification('全局监控已停止', 'info');
        addActivity('🔴 停止全局监控');
    } catch (error) {
        console.error('停止监控失败:', error);
        showNotification('停止失败', 'error');
    }
}

// ========== 统计信息 ==========
function updateStats() {
    document.getElementById('filesProcessedCount').textContent = appState.filesProcessed;
    document.getElementById('foldersCount').textContent = appState.folders.filter(f => f.enabled).length;
    document.getElementById('rulesCount').textContent = appState.rules.length;
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
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    
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
    addActivity(`❌ 已取消批量整理`);
}

async function confirmBatch() {
    const files = [...appState.pendingBatch];
    document.getElementById('batchConfirmModal').style.display = 'none';
    
    addActivity(`✅ 开始批量整理 (${files.length} 个文件)`);
    
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

// ========== Mini窗口模式 ==========

// 进入Mini模式
async function enterMiniMode() {
    appState.isMiniMode = true;
    
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
    
    addActivity('🔽 进入Mini模式');
}

// 退出Mini模式
async function exitMiniMode() {
    appState.isMiniMode = false;
    
    // 隐藏右键菜单
    hideContextMenu();
    
    // 显示完整界面，隐藏Mini窗口
    document.getElementById('miniWindow').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';
    
    // 恢复窗口大小
    try {
        const { appWindow } = window.__TAURI__.window;
        await appWindow.setSize(new window.__TAURI__.window.LogicalSize(360, 520));
        await appWindow.setResizable(true);
    } catch (error) {
        console.error('恢复窗口大小失败:', error);
    }
    
    addActivity('🔼 退出Mini模式');
}

// 更新Mini显示
function updateMiniDisplay() {
    const labelEl = document.getElementById('miniRuleLabel');
    const nameEl = document.getElementById('miniRuleName');
    
    if (appState.currentRuleIndex === -1) {
        labelEl.textContent = '[*]';
        nameEl.textContent = '所有规则';
    } else {
        const rule = appState.rules[appState.currentRuleIndex];
        const label = getRuleLabel(appState.currentRuleIndex);
        labelEl.textContent = `[${label}]`;
        nameEl.textContent = rule.name;
    }
}

// 处理滚轮切换规则
function handleMiniWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.deltaY < 0) {
        // 向上滚：上一个规则
        appState.currentRuleIndex = Math.max(-1, appState.currentRuleIndex - 1);
    } else {
        // 向下滚：下一个规则
        appState.currentRuleIndex = Math.min(appState.rules.length - 1, appState.currentRuleIndex + 1);
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

// 显示右键菜单
function showContextMenu(x, y) {
    const menu = document.getElementById('contextMenu');
    
    // 生成菜单项
    let menuHTML = '';
    
    // "所有规则"选项
    menuHTML += `
        <div class="context-menu-item ${appState.currentRuleIndex === -1 ? 'selected' : ''}" 
             onclick="selectRule(-1)">
            <span class="label">
                <span class="menu-badge">*</span>
                所有规则
            </span>
            ${appState.currentRuleIndex === -1 ? '✓' : ''}
        </div>
    `;
    
    if (appState.rules.length > 0) {
        menuHTML += '<div class="context-menu-divider"></div>';
    }
    
    // 各个规则选项
    appState.rules.forEach((rule, index) => {
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
window.selectRule = selectRule;

