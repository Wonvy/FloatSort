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
    editingConditionIndex: -1,  // 正在编辑的条件索引（-1表示新增）
    isMiniMode: false,  // 是否处于Mini模式
    isCollapsed: false,  // 窗口是否折叠
    collapseEdge: null,  // 折叠在哪个边缘（'left', 'right', 'top', 'bottom'）
    positionCheckInterval: null,  // 位置检查定时器
    originalSize: null,  // 折叠前的原始窗口尺寸
    originalPosition: null,  // 折叠前的原始窗口位置
    expandCooldown: false,  // 展开冷却期，防止立即再折叠
    isMouseOver: false,  // 鼠标是否在窗口上
    collapseTimer: null,  // 折叠延迟定时器
    isDragging: false,  // 窗口是否正在拖拽中
    animation: 'none',  // 动画效果: none, fade, slide
    animationSpeed: 'normal',  // 动画速度: fast(150ms), normal(300ms), slow(500ms)
    processedFiles: new Set(),  // 记录已处理过的文件路径，避免重复处理
    isFullscreen: false,  // 窗口是否处于全屏状态
    selectedRuleId: null,  // 选中的单个规则ID（用于拖拽文件到特定规则）
    selectedRuleIds: null,  // 选中的多个规则IDs（用于拖拽文件到多个规则）
    pendingDeleteItem: null  // 待删除的项目 { type: 'rule'|'folder', id: string, name: string }
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

// ========== 占位符按钮 ==========
function setupPlaceholderButtons() {
    const targetFolderInput = document.getElementById('targetFolder');
    const placeholderButtons = document.querySelectorAll('.tag-btn');
    
    placeholderButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const placeholder = btn.dataset.placeholder;
            const input = targetFolderInput;
            
            // 获取当前光标位置
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const currentValue = input.value;
            
            // 在光标位置插入占位符
            const newValue = currentValue.substring(0, start) + placeholder + currentValue.substring(end);
            input.value = newValue;
            
            // 将光标移动到插入内容之后
            const newCursorPos = start + placeholder.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
            
            // 聚焦输入框
            input.focus();
            
            // 触发input事件以更新任何绑定
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log(`[占位符] 已插入: ${placeholder}`);
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
        
        // 双击标题栏全屏/还原
        appHeader.addEventListener('dblclick', async (e) => {
            // 如果双击的是按钮，不处理
            if (e.target.closest('button')) {
                return;
            }
            
            // 如果处于 Mini 模式或折叠状态，不处理
            if (appState.isMiniMode || appState.isCollapsed) {
                return;
            }
            
            // 清除任何待执行的折叠定时器
            if (appState.collapseTimer) {
                clearTimeout(appState.collapseTimer);
                appState.collapseTimer = null;
                console.log('[全屏] 清除折叠定时器');
            }
            
            try {
                const { appWindow } = window.__TAURI__.window;
                
                if (appState.isFullscreen) {
                    // 退出全屏，还原到默认大小
                    await appWindow.setFullscreen(false);
                    
                    // 等待全屏状态完全退出
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // 恢复默认大小并居中
                    await appWindow.setSize(new window.__TAURI__.window.LogicalSize(360, 520));
                    await appWindow.center();
                    
                    // 确保窗口可调整大小
                    await appWindow.setResizable(true);
                    
                    appState.isFullscreen = false;
                    
                    // 清除任何待执行的折叠定时器
                    if (appState.collapseTimer) {
                        clearTimeout(appState.collapseTimer);
                        appState.collapseTimer = null;
                        console.log('[全屏] 清除折叠定时器');
                    }
                    
                    // 设置冷却期，防止立即折叠
                    appState.expandCooldown = true;
                    setTimeout(() => {
                        appState.expandCooldown = false;
                        console.log('[全屏] 冷却期结束');
                    }, 3000); // 3秒冷却期，给用户足够时间
                    
                    console.log('[全屏] 退出全屏，已还原到默认大小 360x520（冷却期 3 秒）');
                    showNotification('已还原到默认大小', 'info');
                } else {
                    // 进入全屏前，停止位置监控
                    if (appState.positionCheckInterval) {
                        clearInterval(appState.positionCheckInterval);
                        appState.positionCheckInterval = null;
                        console.log('[全屏] 停止位置监控');
                    }
                    
                    // 清除任何待执行的折叠定时器
                    if (appState.collapseTimer) {
                        clearTimeout(appState.collapseTimer);
                        appState.collapseTimer = null;
                        console.log('[全屏] 清除折叠定时器');
                    }
                    
                    // 进入全屏
                    await appWindow.setFullscreen(true);
                    appState.isFullscreen = true;
                    console.log('[全屏] 进入全屏模式');
                    showNotification('已进入全屏模式', 'info');
                }
            } catch (error) {
                console.error('[全屏] 切换失败:', error);
                showNotification('全屏切换失败', 'error');
            }
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
                // 如果正在拖拽或冷却期，不执行折叠
                if (appState.isDragging || appState.expandCooldown) {
                    console.log('[鼠标] 正在拖拽/冷却期中，取消折叠');
                    appState.collapseTimer = null;
                    return;
                }
                
                try {
                    const { appWindow } = window.__TAURI__.window;
                    const position = await appWindow.outerPosition();
                    const size = await appWindow.outerSize();
                    
                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;
                    // 边缘阈值：只有真正贴在边缘时才折叠（≤5px）
                    const edgeThreshold = 5;
                    
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
                    
                    // 如果窗口真正贴在边缘，执行折叠
                    if (nearEdge) {
                        console.log('[鼠标] Mini窗口延迟检测到窗口贴边，执行折叠');
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
    
    // 占位符标签按钮
    setupPlaceholderButtons();
    
    // 设置
    document.getElementById('animationSelect').addEventListener('change', (e) => {
        appState.animation = e.target.value;
        saveAnimationSettings();
        console.log(`[设置] 动画效果已更改为: ${e.target.value}`);
    });
    
    document.getElementById('animationSpeedSelect').addEventListener('change', (e) => {
        appState.animationSpeed = e.target.value;
        saveAnimationSettings();
        console.log(`[设置] 动画速度已更改为: ${e.target.value}`);
    });
    
    // 清空活动日志
    document.getElementById('clearActivityBtn').addEventListener('click', clearActivity);
    document.getElementById('clearProcessedBtn').addEventListener('click', clearProcessedFiles);
    
    // 规则目标文件夹选择按钮
    document.getElementById('browseTargetFolderBtn').addEventListener('click', selectTargetFolder);
    
    // 批量确认窗口
    document.getElementById('closeBatchModal').addEventListener('click', closeBatchModal);
    document.getElementById('cancelBatch').addEventListener('click', closeBatchModal);
    document.getElementById('confirmBatch').addEventListener('click', confirmBatch);
    
    // 删除确认窗口
    document.getElementById('closeDeleteConfirm').addEventListener('click', closeDeleteConfirm);
    document.getElementById('cancelDelete').addEventListener('click', closeDeleteConfirm);
    document.getElementById('confirmDelete').addEventListener('click', executeDelete);
    
    // 模态框点击背景关闭
    document.getElementById('folderModal').addEventListener('click', (e) => {
        if (e.target.id === 'folderModal') closeFolderModal();
    });
    // 规则模态框不允许点击外部关闭，只能通过按钮关闭
    // document.getElementById('ruleModal').addEventListener('click', (e) => {
    //     if (e.target.id === 'ruleModal') closeRuleModal();
    // });
    document.getElementById('batchConfirmModal').addEventListener('click', (e) => {
        if (e.target.id === 'batchConfirmModal') closeBatchModal();
    });
    // 删除确认模态框不允许点击外部关闭，防止误操作
    // document.getElementById('deleteConfirmModal').addEventListener('click', (e) => {
    //     if (e.target.id === 'deleteConfirmModal') closeDeleteConfirm();
    // });
    
    // 点击空白处取消规则选中
    document.addEventListener('click', (e) => {
        // 如果点击的是规则卡片或其子元素，不处理
        if (e.target.closest('.rule-card')) {
            return;
        }
        
        // 如果点击的是模态框或按钮，不处理
        if (e.target.closest('.modal') || e.target.closest('button') || e.target.closest('.modal-content')) {
            return;
        }
        
        // 取消所有规则的选中状态
        const selectedCard = document.querySelector('.rule-card.selected');
        if (selectedCard) {
            selectedCard.classList.remove('selected');
            console.log('[规则选择] 点击空白处，取消选中');
        }
    });
    
    // ESC 键退出全屏
    document.addEventListener('keydown', async (e) => {
        if (e.key === 'Escape' && appState.isFullscreen) {
            try {
                const { appWindow } = window.__TAURI__.window;
                await appWindow.setFullscreen(false);
                
                // 等待全屏状态完全退出
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 恢复默认大小并居中
                await appWindow.setSize(new window.__TAURI__.window.LogicalSize(360, 520));
                await appWindow.center();
                
                // 确保窗口可调整大小
                await appWindow.setResizable(true);
                
                appState.isFullscreen = false;
                
                // 清除任何待执行的折叠定时器
                if (appState.collapseTimer) {
                    clearTimeout(appState.collapseTimer);
                    appState.collapseTimer = null;
                    console.log('[全屏] 清除折叠定时器');
                }
                
                // 设置冷却期，防止立即折叠
                appState.expandCooldown = true;
                setTimeout(() => {
                    appState.expandCooldown = false;
                    console.log('[全屏] 冷却期结束');
                }, 3000); // 3秒冷却期，给用户足够时间
                
                console.log('[全屏] ESC 退出全屏，已还原到默认大小 360x520（冷却期 3 秒）');
                showNotification('已退出全屏', 'info');
            } catch (error) {
                console.error('[全屏] ESC 退出全屏失败:', error);
            }
        }
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
    listen('tauri://file-drop', async event => {
        const files = event.payload;
        console.log('拖拽文件:', files);
        
        if (files && files.length > 0) {
            // 检查是否有选中的规则（支持多选）
            const selectedRuleCards = document.querySelectorAll('.rule-card.selected');
            
            if (selectedRuleCards.length > 0) {
                // 获取所有选中的规则ID
                const selectedRuleIds = Array.from(selectedRuleCards).map(card => card.dataset.ruleId);
                console.log('[拖放] 使用选中的规则:', selectedRuleIds);
                
                // 转换为文件对象格式
                const fileObjects = files.map(filePath => ({
                    path: filePath,
                    name: filePath.split('\\').pop() || filePath.split('/').pop()
                }));
                
                // 使用选中的规则处理（支持多个规则）
                await processFilesWithRules(fileObjects, selectedRuleIds);
                return;
            }
            
            // Mini模式下的处理
            if (appState.isMiniMode) {
                handleMiniFileDrop(files);
                return;
            }
            
            // 完整模式下的处理（没有选中规则，使用所有启用的规则）
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

// ========== 规则卡片点击选择 ==========
function setupRuleSelection() {
    const ruleCards = document.querySelectorAll('.rule-card');
    console.log(`[规则选择] 初始化 ${ruleCards.length} 个规则卡片`);
    
    ruleCards.forEach(card => {
        // 移除之前的监听器（如果有）
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);
        
        // 添加点击事件
        newCard.addEventListener('click', (e) => {
            // 如果点击的是按钮，不处理
            if (e.target.closest('button')) {
                return;
            }
            
            // 禁用的规则不能选择
            if (newCard.classList.contains('disabled')) {
                showNotification('该规则已禁用', 'error');
                return;
            }
            
            const ruleId = newCard.dataset.ruleId;
            const isCtrlPressed = e.ctrlKey || e.metaKey; // Ctrl 或 Mac 的 Command 键
            
            // 切换选中状态
            if (newCard.classList.contains('selected')) {
                // 取消选中
                newCard.classList.remove('selected');
                console.log('[规则选择] 取消选中:', ruleId);
                
                const selectedCount = document.querySelectorAll('.rule-card.selected').length;
                if (selectedCount > 0) {
                    showNotification(`已取消选中，还有 ${selectedCount} 个规则被选中`, 'info');
                } else {
                    showNotification('已取消选中规则', 'info');
                }
            } else {
                // 如果没有按 Ctrl，取消其他规则的选中状态（单选）
                if (!isCtrlPressed) {
                    document.querySelectorAll('.rule-card.selected').forEach(c => {
                        c.classList.remove('selected');
                    });
                }
                
                // 选中当前规则
                newCard.classList.add('selected');
                const ruleName = appState.rules.find(r => r.id === ruleId)?.name || '';
                console.log('[规则选择] 选中规则:', ruleId, ruleName);
                
                const selectedCount = document.querySelectorAll('.rule-card.selected').length;
                if (selectedCount > 1) {
                    showNotification(`已选中 ${selectedCount} 个规则 (按住 Ctrl 多选)`, 'success');
                } else {
                    showNotification(`已选中规则: ${ruleName}`, 'success');
                }
            }
        });
    });
}

// 使用指定规则处理文件（支持多个规则）
async function processFilesWithRules(files, ruleIds) {
    // 如果只有一个规则，使用单规则逻辑
    if (ruleIds.length === 1) {
        return await processFilesWithRule(files, ruleIds[0]);
    }
    
    // 多规则处理
    const rules = ruleIds.map(id => appState.rules.find(r => r.id === id)).filter(r => r);
    if (rules.length === 0) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    // 将文件添加到待处理队列，并保存选中的规则IDs
    appState.pendingBatch = files.map(f => ({
        path: typeof f === 'string' ? f : f.path,
        name: typeof f === 'string' ? (f.split('\\').pop() || f.split('/').pop()) : f.name
    }));
    appState.selectedRuleIds = ruleIds; // 保存多个规则ID
    appState.selectedRuleId = null; // 清除单规则ID
    
    // 显示批量确认窗口（使用多个规则预览）
    await showBatchConfirmWithMultipleRules(ruleIds);
}

// 使用单个指定规则处理文件
async function processFilesWithRule(files, ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    // 将文件添加到待处理队列，并标记使用的规则
    appState.pendingBatch = files.map(f => ({
        path: typeof f === 'string' ? f : f.path,
        name: typeof f === 'string' ? (f.split('\\').pop() || f.split('/').pop()) : f.name
    }));
    appState.selectedRuleId = ruleId; // 保存选中的规则ID
    appState.selectedRuleIds = null; // 清除多规则IDs
    
    // 显示批量确认窗口（使用特定规则预览）
    await showBatchConfirmWithRule(ruleId);
}

// 使用特定规则的批量确认
async function showBatchConfirmWithRule(ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    const modal = document.getElementById('batchConfirmModal');
    const list = document.getElementById('batchFileList');
    
    // 重置模态框状态
    document.getElementById('batchProgress').style.display = 'none';
    list.style.display = 'block';
    document.getElementById('batchModalTitle').textContent = `规则 [${rule.name}] 批量整理确认`;
    
    // 重置 subtitle
    document.getElementById('batchModalSubtitle').innerHTML = `
        检测到 <span id="batchCount" style="color: #667eea; font-weight: bold;">${appState.pendingBatch.length}</span> 个文件待整理
    `;
    
    document.getElementById('confirmBatch').style.display = 'inline-block';
    document.getElementById('confirmBatch').disabled = false;
    document.getElementById('cancelBatch').disabled = false;
    document.getElementById('cancelBatch').textContent = '取消';
    
    // 重置进度
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('skipCount').textContent = '0';
    document.getElementById('failCount').textContent = '0';
    
    // 显示加载状态
    list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #667eea;">
            <div style="font-size: 32px;">⏳</div>
            <div style="margin-top: 10px;">正在计算目标位置...</div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // 预先计算每个文件的目标位置（使用特定规则）
    const filesPreviews = await Promise.all(
        appState.pendingBatch.map(async file => {
            try {
                const preview = await invoke('preview_file_organization_with_rule', { 
                    path: file.path,
                    ruleId: ruleId
                });
                return {
                    ...file,
                    matched: preview.matched,
                    ruleName: preview.rule_name || null,
                    targetPath: preview.target_path || '不符合规则条件'
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
    
    // 分离匹配和未匹配的文件
    const matchedFiles = filesPreviews.filter(f => f.matched);
    const unmatchedFiles = filesPreviews.filter(f => !f.matched);
    
    // 渲染文件列表（与 showBatchConfirm 相同的 UI）
    let html = '';
    
    // 匹配的文件
    if (matchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map(file => `
                        <div class="batch-file-item">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-path from">来自: ${file.path}</div>
                                <div class="file-path to">移至: ${file.targetPath}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件
    if (unmatchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header unmatched" onclick="toggleBatchSection(this)">
                    <svg class="collapse-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" style="transform: rotate(0deg);">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="warning-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#e74c3c" stroke-width="2" fill="none"/>
                        <path d="M8 4V8" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="8" cy="11" r="0.5" fill="#e74c3c" stroke="#e74c3c" stroke-width="1"/>
                    </svg>
                    <span class="section-title">不符合规则的文件</span>
                    <span class="section-count">${unmatchedFiles.length}</span>
                    <span class="collapse-hint">点击收起</span>
                </div>
                <div class="batch-section-content">
                    ${unmatchedFiles.map(file => `
                        <div class="batch-file-item unmatched">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-path from">位置: ${file.path}</div>
                                <div class="file-path error">原因: ${file.targetPath}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    if (matchedFiles.length === 0 && unmatchedFiles.length === 0) {
        html = `<div style="text-align: center; padding: 40px; color: #999;">没有可整理的文件</div>`;
    }
    
    list.innerHTML = html;
}

// 使用多个规则的批量确认
async function showBatchConfirmWithMultipleRules(ruleIds) {
    const rules = ruleIds.map(id => appState.rules.find(r => r.id === id)).filter(r => r);
    if (rules.length === 0) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    const modal = document.getElementById('batchConfirmModal');
    const list = document.getElementById('batchFileList');
    
    // 重置模态框状态
    document.getElementById('batchProgress').style.display = 'none';
    list.style.display = 'block';
    const ruleNames = rules.map(r => r.name).join('、');
    document.getElementById('batchModalTitle').textContent = `规则 [${ruleNames}] 批量整理确认`;
    
    // 重置 subtitle
    document.getElementById('batchModalSubtitle').innerHTML = `
        检测到 <span id="batchCount" style="color: #667eea; font-weight: bold;">${appState.pendingBatch.length}</span> 个文件待整理 (使用 ${rules.length} 个规则)
    `;
    
    document.getElementById('confirmBatch').style.display = 'inline-block';
    document.getElementById('confirmBatch').disabled = false;
    document.getElementById('cancelBatch').disabled = false;
    document.getElementById('cancelBatch').textContent = '取消';
    
    // 重置进度
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('skipCount').textContent = '0';
    document.getElementById('failCount').textContent = '0';
    
    // 显示加载状态
    list.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #667eea;">
            <div style="font-size: 32px;">⏳</div>
            <div style="margin-top: 10px;">正在计算目标位置...</div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // 预先计算每个文件的目标位置（按顺序尝试多个规则）
    const filesPreviews = await Promise.all(
        appState.pendingBatch.map(async file => {
            try {
                // 按顺序尝试每个规则
                for (const ruleId of ruleIds) {
                    const preview = await invoke('preview_file_organization_with_rule', { 
                        path: file.path,
                        ruleId: ruleId
                    });
                    
                    if (preview.matched) {
                        // 找到匹配的规则，返回结果
                        return {
                            ...file,
                            matched: true,
                            ruleName: preview.rule_name,
                            targetPath: preview.target_path
                        };
                    }
                }
                
                // 所有规则都不匹配
                return {
                    ...file,
                    matched: false,
                    targetPath: '不符合任何选中规则'
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
    
    // 分离匹配和未匹配的文件
    const matchedFiles = filesPreviews.filter(f => f.matched);
    const unmatchedFiles = filesPreviews.filter(f => !f.matched);
    
    // 渲染文件列表（与 showBatchConfirmWithRule 相同的 UI）
    let html = '';
    
    // 匹配的文件
    if (matchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map(file => `
                        <div class="batch-file-item">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-path from">来自: ${file.path}</div>
                                <div class="file-path to">移至: ${file.targetPath}</div>
                                <div class="file-path" style="color: #667eea; font-size: 11px;">规则: ${file.ruleName}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件
    if (unmatchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header unmatched" onclick="toggleBatchSection(this)">
                    <svg class="collapse-icon" width="12" height="12" viewBox="0 0 12 12" fill="none" style="transform: rotate(0deg);">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg class="warning-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#e74c3c" stroke-width="2" fill="none"/>
                        <path d="M8 4V8" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="8" cy="11" r="0.5" fill="#e74c3c" stroke="#e74c3c" stroke-width="1"/>
                    </svg>
                    <span class="section-title">不符合规则的文件</span>
                    <span class="section-count">${unmatchedFiles.length}</span>
                    <span class="collapse-hint">点击收起</span>
                </div>
                <div class="batch-section-content">
                    ${unmatchedFiles.map(file => `
                        <div class="batch-file-item unmatched">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-path from">位置: ${file.path}</div>
                                <div class="file-path error">原因: ${file.targetPath}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    if (matchedFiles.length === 0 && unmatchedFiles.length === 0) {
        html = `<div style="text-align: center; padding: 40px; color: #999;">没有可整理的文件</div>`;
    }
    
    list.innerHTML = html;
}

// 原始的 processFilesWithRule 逻辑现在移到 confirmBatch 中处理（当 appState.selectedRuleId 存在时）
async function processFilesWithRuleDirectly(files, ruleId) {
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) {
        showNotification('规则不存在', 'error');
        return;
    }
    
    showNotification(`使用选中规则 [${rule.name}] 处理 ${files.length} 个文件`, 'info');
    addActivity(`📋 使用选中规则 [${rule.name}] 处理 ${files.length} 个文件`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        try {
            // 调用后端处理，传入规则ID
            const result = await invoke('process_file_with_rule', {
                path: file.path,
                ruleId: ruleId
            });
            
            if (result && result !== '文件未匹配任何规则') {
                addActivity(
                    `✅ <strong>${file.name}</strong>`,
                    'success',
                    `从: ${file.path}<br>到: ${result}<br>规则: ${rule.name}`
                );
                successCount++;
                appState.filesProcessed++;
            } else {
                addActivity(`⊘ ${file.name} 不符合规则 [${rule.name}]`);
                skipCount++;
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            addActivity(`❌ ${file.name} 处理失败: ${error}`, 'error');
            failCount++;
        }
    }
    
    updateStats();
    
    // 显示统计结果
    const total = files.length;
    let message = `规则 [${rule.name}] 处理完成\n`;
    message += `成功: ${successCount} | 跳过: ${skipCount} | 失败: ${failCount}`;
    
    if (successCount > 0 && failCount === 0) {
        showNotification(message, 'success');
    } else if (successCount > 0) {
        showNotification(message, 'info');
    } else {
        showNotification(`没有文件匹配规则 [${rule.name}]`, 'error');
    }
    
    addActivity(`✓ 完成 - 成功:${successCount} 跳过:${skipCount} 失败:${failCount}`);
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
        
        // 加载动画设置
        appState.animation = config.animation || 'none';
        appState.animationSpeed = config.animation_speed || 'normal';
        
        // 更新UI中的下拉列表选项
        const animationSelect = document.getElementById('animationSelect');
        const speedSelect = document.getElementById('animationSpeedSelect');
        
        if (animationSelect) animationSelect.value = appState.animation;
        if (speedSelect) speedSelect.value = appState.animationSpeed;
        
        console.log(`✓ 动画设置: ${appState.animation} (${appState.animationSpeed})`);
        
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
        appState.animation = 'none';
        appState.animationSpeed = 'normal';
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
        const condition = rule.conditions && rule.conditions.length > 0 ? rule.conditions[0] : null;
        let conditionText = '';
        const ruleLabel = getRuleLabel(index);
        
        // 格式化单个条件的函数
        const formatCondition = (cond) => {
            if (cond.type === 'Extension') {
                return `扩展名: ${cond.values.join(', ')}`;
            } else if (cond.type === 'NameContains') {
                return `包含: ${cond.pattern}`;
            } else if (cond.type === 'NameRegex') {
                return `正则: ${cond.pattern}`;
            } else if (cond.type === 'SizeRange') {
                const minMB = cond.min ? Math.round(cond.min / 1024 / 1024) : null;
                const maxMB = cond.max ? Math.round(cond.max / 1024 / 1024) : null;
                if (minMB && maxMB) {
                    return `大小: ${minMB}-${maxMB}MB`;
                } else if (minMB) {
                    return `大小: ≥${minMB}MB`;
                } else if (maxMB) {
                    return `大小: ≤${maxMB}MB`;
                } else {
                    return `大小: 不限`;
                }
            } else if (cond.type === 'CreatedDaysAgo') {
                if (cond.min && cond.max) {
                    return `创建: ${cond.min}-${cond.max}天前`;
                } else if (cond.min) {
                    return `创建: ${cond.min}天前或更早`;
                } else if (cond.max) {
                    return `创建: ${cond.max}天内`;
                }
            } else if (cond.type === 'ModifiedDaysAgo') {
                if (cond.min && cond.max) {
                    return `修改: ${cond.min}-${cond.max}天前`;
                } else if (cond.min) {
                    return `修改: ${cond.min}天前或更早`;
                } else if (cond.max) {
                    return `修改: ${cond.max}天内`;
                }
            } else {
                return `条件: ${cond.type}`;
            }
        };
        
        // 生成完整条件提示文本
        let fullConditionTooltip = '';
        if (rule.conditions && rule.conditions.length > 0) {
            fullConditionTooltip = rule.conditions.map((c, i) => `${i + 1}. ${formatCondition(c)}`).join('\n');
        } else {
            fullConditionTooltip = '无条件';
        }
        
        if (condition) {
            conditionText = formatCondition(condition);
        } else {
            conditionText = '无条件';
        }
        
        // 如果有多个条件，添加提示
        if (rule.conditions && rule.conditions.length > 1) {
            conditionText += ` (+${rule.conditions.length - 1})`;
        }
        
        // 生成文件夹列表的 tooltip
        const folderNames = usedByFolders.map(f => f.name).join('、') || '暂未被任何文件夹使用';
        
        // 处理目标路径显示
        const destination = rule.action.destination;
        const isAbsolutePath = /^[A-Z]:\\/i.test(destination); // 检测绝对路径（Windows）
        let displayPath = destination;
        let iconColor = '#667eea'; // 默认紫色
        
        if (isAbsolutePath) {
            iconColor = '#f97316'; // 橙色
            // 提取驱动器和最后的文件夹名
            const parts = destination.split(/[\\/]/);
            const drive = parts[0]; // C:
            const lastName = parts[parts.length - 1]; // 最后的文件夹名
            if (parts.length > 2) {
                displayPath = `${drive}\\...\\${lastName}`;
            }
        }
        
        return `
            <div class="rule-card compact ${!rule.enabled ? 'disabled' : ''}" data-rule-id="${rule.id}" data-index="${index}" title="${fullConditionTooltip}">
                <span class="rule-order-number">${index + 1}</span>
                <div class="rule-name-col">
                    <div class="rule-name">${rule.name}</div>
                </div>
                <div class="rule-condition-col" title="${fullConditionTooltip}">
                    <div class="rule-condition-label">条件</div>
                    <div class="rule-condition-value">${conditionText}</div>
                </div>
                <div class="rule-destination-col">
                    <div class="rule-destination-label">移动到</div>
                    <div class="rule-destination-value" title="${destination}">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink: 0; color: ${iconColor};">
                            <path d="M3 2H9L11 4H13C13.5 4 14 4.5 14 5V12C14 12.5 13.5 13 13 13H3C2.5 13 2 12.5 2 12V3C2 2.5 2.5 2 3 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${isAbsolutePath ? `<span class="path-link" data-path="${destination}" onclick="openFolder('${destination.replace(/\\/g, '\\\\')}')">${displayPath}</span>` : displayPath}
                    </div>
                </div>
                <div class="rule-usage" title="${folderNames}">
                    <span class="usage-badge">${usedByFolders.length}</span>
                    <span class="usage-text">个文件夹</span>
                </div>
                <div class="rule-order-controls">
                    <button class="order-btn order-left" onclick="moveRuleUp(${index})" ${index === 0 ? 'disabled' : ''} title="上移">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="order-btn order-right" onclick="moveRuleDown(${index})" ${index === appState.rules.length - 1 ? 'disabled' : ''} title="下移">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <div class="rule-actions">
                    <button class="btn-icon btn-sm" onclick="editRule('${rule.id}')" title="编辑">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2L14 4.5L5.5 13H3V10.5L11.5 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 3.5L12.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-sm" onclick="deleteRule('${rule.id}')" title="删除">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5 4V3C5 2.5 5.5 2 6 2H10C10.5 2 11 2.5 11 3V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M5 4V13C5 13.5 5.5 14 6 14H10C10.5 14 11 13.5 11 13V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M7 7V11M9 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
                <button class="rule-toggle ${rule.enabled ? 'active' : ''}" 
                        onclick="toggleRule('${rule.id}')" title="${rule.enabled ? '禁用' : '启用'}">
                </button>
            </div>
        `;
    }).join('');
    
    // 为规则卡片添加点击选择事件监听
    setupRuleSelection();
}

// ========== 规则排序功能 ==========
window.moveRuleUp = async function(index) {
    if (index <= 0 || index >= appState.rules.length) return;
    
    // 交换规则在数组中的位置
    const temp = appState.rules[index];
    appState.rules[index] = appState.rules[index - 1];
    appState.rules[index - 1] = temp;
    
    // 保存到后端
    await saveRulesOrder();
    
    // 重新渲染
    renderRules();
    
    addActivity(`↑ 规则 [${temp.name}] 已上移`);
};

window.moveRuleDown = async function(index) {
    if (index < 0 || index >= appState.rules.length - 1) return;
    
    // 交换规则在数组中的位置
    const temp = appState.rules[index];
    appState.rules[index] = appState.rules[index + 1];
    appState.rules[index + 1] = temp;
    
    // 保存到后端
    await saveRulesOrder();
    
    // 重新渲染
    renderRules();
    
    addActivity(`↓ 规则 [${temp.name}] 已下移`);
};

// 保存规则顺序到后端
async function saveRulesOrder() {
    try {
        await invoke('reorder_rules', { 
            ruleIds: appState.rules.map(r => r.id) 
        });
        console.log('✓ 规则顺序已保存');
    } catch (error) {
        console.error('保存规则顺序失败:', error);
        showNotification('保存规则顺序失败', 'error');
    }
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
    
    // 显示删除确认模态框
    showDeleteConfirm({
        type: 'folder',
        id: folderId,
        name: folder.name,
        path: folder.path
    });
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
            const timeLabel = type === 'created' ? '创建时间' : '修改时间';
            container.innerHTML = `
                <input type="number" id="minDays" placeholder="至少N天前" min="0" style="flex: 1;" title="文件${timeLabel}距今至少多少天（留空表示不限制）" />
                <span style="margin: 0 8px; color: #999;">~</span>
                <input type="number" id="maxDays" placeholder="至多N天前" min="0" style="flex: 1;" title="文件${timeLabel}距今至多多少天（留空表示不限制）" />
                <p class="hint" style="margin-top: 8px; font-size: 12px; color: #666;">
                    📅 示例：<br>
                    • 最近7天${timeLabel}的文件：至少留空，至多填 7<br>
                    • 30天前或更早${timeLabel}的文件：至少填 30，至多留空<br>
                    • 7-30天前${timeLabel}的文件：至少填 7，至多填 30
                </p>
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
                displayText: min && max 
                    ? `创建时间: ${min}-${max}天前` 
                    : min 
                        ? `创建时间: ${min}天前或更早` 
                        : `创建时间: ${max}天内`
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
                displayText: min && max 
                    ? `修改时间: ${min}-${max}天前` 
                    : min 
                        ? `修改时间: ${min}天前或更早` 
                        : `修改时间: ${max}天内`
            };
            break;
        }
    }
    
    if (condition) {
        if (appState.editingConditionIndex >= 0) {
            // 更新现有条件
            appState.currentConditions[appState.editingConditionIndex] = condition;
            appState.editingConditionIndex = -1;
            document.getElementById('addConditionBtn').textContent = '添加条件';
        } else {
            // 添加新条件
            appState.currentConditions.push(condition);
        }
        renderConditions();
        
        // 清空输入
        const inputs = document.getElementById('conditionInputs').querySelectorAll('input');
        inputs.forEach(input => input.value = '');
    }
}

// 删除条件（全局暴露）
window.removeCondition = function(index) {
    appState.currentConditions.splice(index, 1);
    appState.editingConditionIndex = -1;
    document.getElementById('addConditionBtn').textContent = '添加条件';
    renderConditions();
};

// 编辑条件（全局暴露）
window.editCondition = function(index) {
    const condition = appState.currentConditions[index];
    appState.editingConditionIndex = index;
    
    // 根据条件类型设置下拉框
    const typeSelect = document.getElementById('conditionType');
    
    switch(condition.type) {
        case 'Extension':
            typeSelect.value = 'extension';
            break;
        case 'NameContains':
            typeSelect.value = 'name';
            break;
        case 'NameRegex':
            typeSelect.value = 'regex';
            break;
        case 'SizeRange':
            typeSelect.value = 'size';
            break;
        case 'CreatedDaysAgo':
            typeSelect.value = 'created';
            break;
        case 'ModifiedDaysAgo':
            typeSelect.value = 'modified';
            break;
    }
    
    // 触发类型改变事件，更新输入框
    updateConditionInputs();
    
    // 填充输入值
    setTimeout(() => {
        const inputField = document.getElementById('conditionInput');
        
        switch(condition.type) {
            case 'Extension':
                if (inputField) inputField.value = condition.values ? condition.values.join(', ') : '';
                break;
            case 'NameContains':
            case 'NameRegex':
                if (inputField) inputField.value = condition.pattern || '';
                break;
            case 'SizeRange':
                if (condition.min) document.getElementById('minSize').value = Math.round(condition.min / 1024 / 1024);
                if (condition.max) document.getElementById('maxSize').value = Math.round(condition.max / 1024 / 1024);
                break;
            case 'CreatedDaysAgo':
            case 'ModifiedDaysAgo':
                if (condition.min) document.getElementById('minDays').value = condition.min;
                if (condition.max) document.getElementById('maxDays').value = condition.max;
                break;
        }
        
        // 更新添加按钮文字
        document.getElementById('addConditionBtn').textContent = '更新条件';
    }, 10);
    
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
        <div class="condition-item ${appState.editingConditionIndex === index ? 'editing' : ''}">
            <div class="condition-content">
                <span class="condition-type">${getConditionTypeLabel(cond.type)}</span>
                <span class="condition-value">${cond.displayText}</span>
            </div>
            <div class="condition-actions">
                <button class="condition-edit" onclick="editCondition(${index})" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="condition-remove" onclick="removeCondition(${index})" title="删除">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
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
    appState.editingConditionIndex = -1; // 重置编辑状态
    
    const modal = document.getElementById('ruleModal');
    const title = document.getElementById('ruleModalTitle');
    const form = document.getElementById('ruleForm');
    
    form.reset();
    
    // 重置添加按钮文字
    document.getElementById('addConditionBtn').textContent = '添加条件';
    
    if (ruleId) {
        // 编辑模式
        const rule = appState.rules.find(r => r.id === ruleId);
        if (!rule) return;
        
        title.textContent = '✏️ 编辑规则';
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('targetFolder').value = rule.action.destination;
        
        // 加载逻辑运算符
        const logicOperator = rule.logic || 'or'; // 默认OR
        document.querySelector(`input[name="conditionLogic"][value="${logicOperator}"]`).checked = true;
        
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
                displayText = cond.min && cond.max 
                    ? `创建时间: ${cond.min}-${cond.max}天前` 
                    : cond.min 
                        ? `创建时间: ${cond.min}天前或更早` 
                        : `创建时间: ${cond.max}天内`;
            } else if (cond.type === 'ModifiedDaysAgo') {
                displayText = cond.min && cond.max 
                    ? `修改时间: ${cond.min}-${cond.max}天前` 
                    : cond.min 
                        ? `修改时间: ${cond.min}天前或更早` 
                        : `修改时间: ${cond.max}天内`;
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
    appState.editingConditionIndex = -1;
    document.getElementById('addConditionBtn').textContent = '添加条件';
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
    
    // 获取逻辑运算符
    const logicOperator = document.querySelector('input[name="conditionLogic"]:checked').value;
    
    // 将条件转换为后端格式（移除displayText）
    const conditions = appState.currentConditions.map(cond => {
        const { displayText, ...rest } = cond;
        return rest;
    });
    
    const rule = {
        id: appState.editingRuleId || `rule_${Date.now()}`,
        name,
        enabled: true,
        logic: logicOperator, // 添加逻辑运算符
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
    
    // 显示删除确认模态框
    showDeleteConfirm({
        type: 'rule',
        id: ruleId,
        name: rule.name,
        destination: rule.action ? rule.action.destination : null
    });
}

// 显示删除确认模态框
function showDeleteConfirm(item) {
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    
    // 根据类型设置消息内容
    if (item.type === 'rule') {
        message.innerHTML = `
            确定要删除规则 <strong style="color: #667eea;">"${item.name}"</strong> 吗？
            <br><br>
            ${item.destination ? `<span style="color: #666;">目标文件夹: ${item.destination}</span>` : ''}
        `;
    } else if (item.type === 'folder') {
        message.innerHTML = `
            确定要删除监控文件夹 <strong style="color: #667eea;">"${item.name}"</strong> 吗？
            <br><br>
            <span style="color: #666;">路径: ${item.path}</span>
            <br><br>
            <span style="color: #e74c3c; font-size: 13px;">⚠️ 删除后将停止监控此文件夹</span>
        `;
    }
    
    // 显示模态框
    modal.style.display = 'flex';
    
    // 保存待删除项目
    appState.pendingDeleteItem = item;
}

// 关闭删除确认模态框
function closeDeleteConfirm() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    appState.pendingDeleteItem = null;
}

// 执行删除操作
async function executeDelete() {
    const item = appState.pendingDeleteItem;
    if (!item) return;
    
    try {
        if (item.type === 'rule') {
            // 删除规则
            await invoke('remove_rule', { ruleId: item.id });
            showNotification(`规则 "${item.name}" 已删除`, 'success');
            addActivity(`🗑️ 删除规则: ${item.name}`);
            await loadRules();
            await loadFolders(); // 重新加载文件夹以更新关联
        } else if (item.type === 'folder') {
            // 删除文件夹
            await invoke('remove_folder', { folderId: item.id });
            showNotification(`文件夹 "${item.name}" 已删除`, 'success');
            addActivity(`🗑️ 删除文件夹: ${item.name}`);
            await loadFolders();
        }
        
        updateStats();
        closeDeleteConfirm();
    } catch (error) {
        console.error('删除失败:', error);
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

// 保存动画设置
async function saveAnimationSettings() {
    try {
        await invoke('save_animation_settings', {
            animation: appState.animation,
            animationSpeed: appState.animationSpeed
        });
        console.log(`✓ 动画设置已保存: ${appState.animation} (${appState.animationSpeed})`);
    } catch (error) {
        console.error('保存动画设置失败:', error);
    }
}

// 清空活动日志
async function clearActivity() {
    const activityLog = document.getElementById('activityLog');
    activityLog.innerHTML = `
        <div class="activity-item">
            <span class="activity-time">清空</span>
            <span class="activity-message">活动日志已清空</span>
        </div>
    `;
}

// 清除已处理文件记录
async function clearProcessedFiles() {
    if (!confirm('确定要清除所有已处理文件记录吗？\n\n清除后，之前处理过的文件将可以重新整理。')) {
        return;
    }
    
    appState.filesProcessed = 0;
    appState.processedFiles.clear(); // 清空前端记录
    
    // 调用后端清空已处理文件记录
    try {
        await invoke('clear_processed_files');
        console.log('✓ 已处理文件记录已清空');
        showNotification('已处理文件记录已清除', 'success');
        addActivity(`🔄 清除已处理文件记录`);
    } catch (error) {
        console.error('清空已处理文件记录失败:', error);
        showNotification('清除失败', 'error');
    }
    
    updateStats();
}

// 选择目标文件夹
async function selectTargetFolder() {
    console.log('[文件夹选择] 点击浏览按钮');
    try {
        console.log('[文件夹选择] 调用后端命令...');
        const selectedPath = await invoke('select_folder');
        console.log('[文件夹选择] 后端返回:', selectedPath);
        if (selectedPath) {
            document.getElementById('targetFolder').value = selectedPath;
            console.log('✓ 已选择文件夹:', selectedPath);
            showNotification('已选择文件夹', 'success');
        } else {
            console.log('[文件夹选择] 用户取消选择');
        }
    } catch (error) {
        console.error('[文件夹选择] 失败:', error);
        showNotification('选择文件夹失败: ' + error, 'error');
    }
}

// 打开文件夹
async function openFolder(path) {
    console.log('[打开文件夹] 路径:', path);
    try {
        await invoke('open_folder', { path });
        console.log('✓ 已打开文件夹');
    } catch (error) {
        console.error('[打开文件夹] 失败:', error);
        showNotification('无法打开文件夹: ' + error, 'error');
    }
}

// ========== 通知系统（状态栏） ==========
let statusTimeout = null;

function showNotification(message, type = 'info') {
    const statusBar = document.getElementById('statusBar');
    const statusIcon = document.getElementById('statusIcon');
    const statusMessage = document.getElementById('statusMessage');
    
    // 清除之前的定时器
    if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
    }
    
    // 设置图标
    const iconMap = {
        'success': '✓',
        'error': '✗',
        'info': 'ℹ️',
        'default': 'ℹ️'
    };
    statusIcon.textContent = iconMap[type] || iconMap['default'];
    
    // 设置消息
    statusMessage.textContent = message;
    
    // 移除所有状态类
    statusBar.classList.remove('status-success', 'status-error', 'status-info', 'status-default');
    
    // 添加新状态类
    statusBar.classList.add(`status-${type}`);
    
    // 触发动画（重新添加动画类）
    statusMessage.style.animation = 'none';
    statusIcon.style.animation = 'none';
    setTimeout(() => {
        statusMessage.style.animation = 'slideInBottom 0.3s ease';
        statusIcon.style.animation = 'fadeIn 0.3s ease';
    }, 10);
    
    // 3秒后恢复默认状态
    statusTimeout = setTimeout(() => {
        statusMessage.textContent = '就绪';
        statusIcon.textContent = 'ℹ️';
        statusBar.classList.remove('status-success', 'status-error', 'status-info');
        statusBar.classList.add('status-default');
    }, 3000);
}

// ========== 批量确认功能 ==========
async function showBatchConfirm() {
    const modal = document.getElementById('batchConfirmModal');
    const list = document.getElementById('batchFileList');
    
    // 重置模态框状态
    document.getElementById('batchProgress').style.display = 'none';
    list.style.display = 'block';
    document.getElementById('batchModalTitle').textContent = '批量整理确认';
    
    // 重置 subtitle 为原始 HTML（恢复 batchCount 元素）
    document.getElementById('batchModalSubtitle').innerHTML = `
        检测到 <span id="batchCount" style="color: #667eea; font-weight: bold;">${appState.pendingBatch.length}</span> 个文件待整理
    `;
    
    document.getElementById('confirmBatch').style.display = 'inline-block';
    document.getElementById('confirmBatch').disabled = false;
    document.getElementById('cancelBatch').disabled = false;
    document.getElementById('cancelBatch').textContent = '取消';
    
    // 重置进度
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('skipCount').textContent = '0';
    document.getElementById('failCount').textContent = '0';
    
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
    
    // 分离匹配和未匹配的文件
    const matchedFiles = filesPreviews.filter(f => f.matched);
    const unmatchedFiles = filesPreviews.filter(f => !f.matched);
    
    // 渲染文件列表（带目标路径）
    let html = '';
    
    // 匹配的文件（始终显示，不折叠）
    if (matchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map(file => `
                        <div class="batch-file-item">
                            <div class="file-icon">📄</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}${file.ruleName ? ` <span style="color: #667eea; font-size: 11px; font-weight: 500;">[${file.ruleName}]</span>` : ''}</div>
                                <div class="file-path from">从: ${file.path}</div>
                                <div class="file-path to matched">到: ${file.targetPath}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件（可折叠）
    if (unmatchedFiles.length > 0) {
        html += `
            <div class="batch-section">
                <div class="batch-section-header unmatched" onclick="toggleBatchSection(this)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="collapse-icon">
                        <path d="M4 6L8 10L12 6" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="warning-icon">
                        <path d="M8 2L14 13H2L8 2Z" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <line x1="8" y1="6" x2="8" y2="9" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="8" cy="11" r="0.5" fill="#e74c3c"/>
                    </svg>
                    <span class="section-title">未匹配规则的文件</span>
                    <span class="section-count">${unmatchedFiles.length}</span>
                    <span class="collapse-hint">点击折叠</span>
                </div>
                <div class="batch-section-content">
                    ${unmatchedFiles.map(file => `
                        <div class="batch-file-item">
                            <div class="file-icon">⚠️</div>
                            <div class="file-info">
                                <div class="file-name">${file.name}</div>
                                <div class="file-path from">从: ${file.path}</div>
                                <div class="file-path to unmatched">${file.targetPath}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    list.innerHTML = html;
    
    addActivity(`🔔 批量整理确认 (匹配: ${matchedFiles.length}, 未匹配: ${unmatchedFiles.length})`);
}

function closeBatchModal() {
    document.getElementById('batchConfirmModal').style.display = 'none';
    // 取消整理，清空队列和选中的规则
    appState.pendingBatch = [];
    appState.selectedRuleId = null;
    appState.selectedRuleIds = null;
    addActivity(`[取消] 已取消批量整理`);
}

// 切换批量确认部分的折叠状态
window.toggleBatchSection = function(header) {
    const content = header.nextElementSibling;
    const collapseIcon = header.querySelector('.collapse-icon');
    const hint = header.querySelector('.collapse-hint');
    
    const isCollapsed = content.classList.contains('collapsed');
    
    if (isCollapsed) {
        // 展开
        content.classList.remove('collapsed');
        collapseIcon.style.transform = 'rotate(0deg)';
        hint.textContent = '点击折叠';
    } else {
        // 折叠
        content.classList.add('collapsed');
        collapseIcon.style.transform = 'rotate(-90deg)';
        hint.textContent = '点击展开';
    }
};

async function confirmBatch() {
    const files = [...appState.pendingBatch];
    
    // 隐藏文件列表，显示进度条
    document.getElementById('batchFileList').style.display = 'none';
    document.getElementById('batchProgress').style.display = 'block';
    
    // 禁用按钮
    const confirmBtn = document.getElementById('confirmBatch');
    const cancelBtn = document.getElementById('cancelBatch');
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    
    // 更新标题
    document.getElementById('batchModalTitle').textContent = '正在整理文件';
    document.getElementById('batchModalSubtitle').textContent = '请稍候，不要关闭窗口...';
    
    addActivity(`[批量] 开始批量整理 (${files.length} 个文件)`);
    
    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;
    
    // 逐个处理文件
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progress = ((i + 1) / files.length) * 100;
        
        // 更新进度显示
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('progressCount').textContent = `${i + 1} / ${files.length}`;
        document.getElementById('progressText').textContent = `正在整理: ${file.name}`;
        
        try {
            let result;
            // 如果有选中的规则ID(s)，使用特定规则处理；否则使用所有规则
            if (appState.selectedRuleIds && appState.selectedRuleIds.length > 0) {
                // 多个规则：按顺序尝试每个规则
                for (const ruleId of appState.selectedRuleIds) {
                    result = await invoke('process_file_with_rule', { 
                        path: file.path,
                        ruleId: ruleId
                    });
                    if (result && result !== '文件未匹配任何规则') {
                        break; // 找到匹配的规则，停止尝试
                    }
                }
                // 如果没有赋值，说明没有匹配任何规则
                if (!result) {
                    result = '文件未匹配任何规则';
                }
            } else if (appState.selectedRuleId) {
                // 单个规则
                result = await invoke('process_file_with_rule', { 
                    path: file.path,
                    ruleId: appState.selectedRuleId
                });
            } else {
                // 使用所有规则
                result = await invoke('process_file', { path: file.path });
            }
            
            if (result === '') {
                // 文件被跳过（已处理过）
                skipCount++;
                document.getElementById('skipCount').textContent = skipCount;
            } else if (result === '文件未匹配任何规则') {
                // 文件未匹配任何规则，也算跳过
                skipCount++;
                document.getElementById('skipCount').textContent = skipCount;
            } else {
                // 成功处理（返回了新路径）
                successCount++;
                document.getElementById('successCount').textContent = successCount;
            }
        } catch (error) {
            console.error(`处理文件失败: ${file.name}`, error);
            addActivity(`❌ ${file.name} 处理失败: ${error}`, 'error');
            failCount++;
            document.getElementById('failCount').textContent = failCount;
        }
    }
    
    // 完成
    document.getElementById('progressText').textContent = '整理完成！';
    document.getElementById('batchModalTitle').textContent = '批量整理完成';
    document.getElementById('batchModalSubtitle').innerHTML = `
        成功: <span style="color: #2e7d32; font-weight: 600;">${successCount}</span> | 
        跳过: <span style="color: #f57c00; font-weight: 600;">${skipCount}</span> | 
        失败: <span style="color: #c62828; font-weight: 600;">${failCount}</span>
    `;
    
    // 更新按钮
    confirmBtn.style.display = 'none';
    cancelBtn.disabled = false;
    cancelBtn.textContent = '关闭';
    
    addActivity(`[批量] 批量整理完成 - 成功:${successCount} 跳过:${skipCount} 失败:${failCount}`);
    
    // 清除选中的规则ID(s)
    appState.selectedRuleId = null;
    appState.selectedRuleIds = null;
    
    // 刷新界面
    await loadFolders();
    await loadRules();
    updateStats();
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

// 鼠标位置监听（用于边缘展开检测）
let mousePositionCheckInterval = null;

function startMousePositionMonitoring() {
    if (mousePositionCheckInterval) return;
    
    // 监听全局鼠标移动
    document.addEventListener('mousemove', handleGlobalMouseMove);
    
    console.log('[鼠标监听] 已启动鼠标位置监听');
}

function stopMousePositionMonitoring() {
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    console.log('[鼠标监听] 已停止鼠标位置监听');
}

async function handleGlobalMouseMove(e) {
    // 只在折叠状态下检测
    if (!appState.isCollapsed) return;
    
    // 使用 screenX/screenY 获取鼠标在屏幕上的绝对位置
    const mouseX = e.screenX;
    const mouseY = e.screenY;
    
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    const edgeDetectZone = 50; // 鼠标接近边缘50px时触发展开
    
    let nearEdge = null;
    if (mouseX <= edgeDetectZone) {
        nearEdge = 'left';
    } else if (mouseX >= screenWidth - edgeDetectZone) {
        nearEdge = 'right';
    } else if (mouseY <= edgeDetectZone) {
        nearEdge = 'top';
    } else if (mouseY >= screenHeight - edgeDetectZone) {
        nearEdge = 'bottom';
    }
    
    // 如果鼠标接近窗口折叠的边缘，展开窗口
    if (nearEdge && nearEdge === appState.collapseEdge) {
        console.log(`[鼠标监听] 检测到鼠标在屏幕${nearEdge}边缘 (x:${mouseX}, y:${mouseY})，展开窗口`);
        await expandWindow();
    }
}

// 启动窗口位置监听
function startPositionMonitoring() {
    if (appState.positionCheckInterval) return;
    
    appState.positionCheckInterval = setInterval(async () => {
        // 冷却期内不检查（防止展开后立即折叠）
        if (appState.expandCooldown) return;
        
        // 鼠标在窗口上时不自动折叠
        if (appState.isMouseOver) return;
        
        // 全屏状态下不检查折叠
        if (appState.isFullscreen) return;
        
        // Mini 模式下不检查（Mini 窗口有自己的折叠逻辑）
        if (appState.isMiniMode) return;
        
        try {
            const { appWindow } = window.__TAURI__.window;
            const position = await appWindow.outerPosition();
            const size = await appWindow.outerSize();
            
            // 获取屏幕尺寸
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            
            // 边缘阈值：只有真正贴在边缘时才折叠（≤5px）
            const edgeThreshold = 5;
            
            let nearEdge = null;
            // 检查窗口是否真正贴在屏幕边缘
            if (position.x <= edgeThreshold) {
                nearEdge = 'left';
            } else if (position.x + size.width >= screenWidth - edgeThreshold) {
                nearEdge = 'right';
            } else if (position.y <= edgeThreshold) {
                nearEdge = 'top';
            } else if (position.y + size.height >= screenHeight - edgeThreshold) {
                nearEdge = 'bottom';
            }
            
            // 只在真正贴在边缘且未折叠时才折叠
            // 不自动展开，展开由 mouseenter 触发
            if (nearEdge && !appState.isCollapsed) {
                console.log(`[位置检测] 窗口贴在${nearEdge}边缘，准备折叠`, { position, size });
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

// 获取动画时长（毫秒）
function getAnimationDuration() {
    const speeds = {
        fast: 150,
        normal: 300,
        slow: 500
    };
    return speeds[appState.animationSpeed] || 300;
}

// 应用展开动画
async function applyExpandAnimation(element) {
    if (appState.animation === 'none') return;
    
    const duration = getAnimationDuration();
    
    if (appState.animation === 'fade') {
        // 淡入效果
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        await new Promise(resolve => requestAnimationFrame(resolve));
        element.style.opacity = '1';
        await new Promise(resolve => setTimeout(resolve, duration));
        element.style.transition = '';
    } else if (appState.animation === 'slide') {
        // 滑动效果（根据折叠边缘决定滑动方向）
        const edge = appState.collapseEdge;
        element.style.transition = `transform ${duration}ms ease`;
        
        if (edge === 'left') {
            element.style.transform = 'translateX(-100%)';
        } else if (edge === 'right') {
            element.style.transform = 'translateX(100%)';
        } else if (edge === 'top') {
            element.style.transform = 'translateY(-100%)';
        } else if (edge === 'bottom') {
            element.style.transform = 'translateY(100%)';
        }
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        element.style.transform = 'none';
        await new Promise(resolve => setTimeout(resolve, duration));
        element.style.transition = '';
    }
}

// 折叠窗口
async function collapseWindow(edge) {
    if (appState.isCollapsed && appState.collapseEdge === edge) return;
    
    // 如果处于全屏状态，不执行折叠
    if (appState.isFullscreen) {
        console.log('[折叠] 全屏状态下不折叠窗口');
        return;
    }
    
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
        const collapsedSize = 4; // 折叠后固定为4px，方便鼠标触发展开
        
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
                // 右边缘：窗口右边缘贴在屏幕右侧
                // 窗口左边缘 x = screenWidth - collapsedSize
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    screenWidth - collapsedSize,
                    position.y
                );
            } else if (edge === 'left') {
                // 左边缘：窗口左边缘贴在屏幕左侧
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    0,
                    position.y
                );
            }
        } else {
            // 上下折叠：高度缩小到2px
            newSize = new LogicalSize(baseSize.width, collapsedSize);
            
            if (edge === 'bottom') {
                // 底部边缘：窗口底边贴在屏幕底部
                // 窗口顶边 y = screenHeight - collapsedSize
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    position.x,
                    screenHeight - collapsedSize
                );
            } else if (edge === 'top') {
                // 顶部边缘：窗口顶边贴在屏幕顶部
                newPosition = new window.__TAURI__.window.LogicalPosition(
                    position.x,
                    0
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
        
        // 启动鼠标位置监听，用于检测鼠标接近边缘时展开
        startMousePositionMonitoring();
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
        
        // 只恢复原始尺寸，不恢复位置（让用户自由移动窗口）
        if (appState.originalSize) {
            const newSize = new LogicalSize(appState.originalSize.width, appState.originalSize.height);
            
            await appWindow.setSize(newSize);
            
            console.log('[展开] 恢复窗口尺寸（保持当前位置）:', {
                size: appState.originalSize
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
        const savedEdge = appState.collapseEdge;
        appState.originalSize = null;
        appState.originalPosition = null;
        
        // 应用展开动画
        const element = appState.isMiniMode ? 
            document.getElementById('miniWindow') : 
            document.getElementById('appContainer');
        
        // 临时保存边缘用于动画
        const tempEdge = savedEdge;
        appState.collapseEdge = tempEdge;
        await applyExpandAnimation(element);
        appState.collapseEdge = null;
        
        // 强制触发窗口resize事件，确保布局更新
        window.dispatchEvent(new Event('resize'));
        
        // 停止鼠标位置监听（窗口已展开）
        stopMousePositionMonitoring();
        
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
        if (!appState.isCollapsed && !appState.isMiniMode && !appState.isFullscreen) {
            appState.collapseTimer = setTimeout(async () => {
                // 如果正在拖拽、处于全屏或冷却期，不执行折叠
                if (appState.isDragging || appState.isFullscreen || appState.expandCooldown) {
                    console.log('[鼠标] 正在拖拽/全屏/冷却期中，取消折叠');
                    appState.collapseTimer = null;
                    return;
                }
                
                try {
                    const { appWindow } = window.__TAURI__.window;
                    const position = await appWindow.outerPosition();
                    const size = await appWindow.outerSize();
                    
                    const screenWidth = window.screen.width;
                    const screenHeight = window.screen.height;
                    // 边缘阈值：只有真正贴在边缘时才折叠（≤5px）
                    const edgeThreshold = 5;
                    
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
                    
                    // 如果窗口真正贴在边缘，执行折叠
                    if (nearEdge) {
                        console.log('[鼠标] 延迟检测到窗口贴边，执行折叠');
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
    // 如果处于全屏状态，先退出全屏
    if (appState.isFullscreen) {
        try {
            const { appWindow } = window.__TAURI__.window;
            await appWindow.setFullscreen(false);
            
            // 等待全屏状态完全退出
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 确保窗口可调整大小
            await appWindow.setResizable(true);
            
            appState.isFullscreen = false;
            console.log('[全屏] 退出全屏以进入Mini模式');
        } catch (error) {
            console.error('[全屏] 退出全屏失败:', error);
        }
    }
    
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


