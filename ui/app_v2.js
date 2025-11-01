// FloatSort V2 - 主应用逻辑

// ========== 多语言支持 ==========
let currentLanguage = 'zh-CN';  // 默认语言
let i18nData = null;  // 当前语言数据

// 加载语言文件
async function loadLanguage(lang) {
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load language file: ${lang}`);
        }
        i18nData = await response.json();
        currentLanguage = lang;
        console.log(`✓ 语言已加载: ${lang}`);
        return true;
    } catch (error) {
        console.error(`✗ 语言加载失败: ${lang}`, error);
        // 如果加载失败且不是中文，尝试加载中文作为后备
        if (lang !== 'zh-CN') {
            console.log('尝试加载默认语言 zh-CN...');
            return await loadLanguage('zh-CN');
        }
        return false;
    }
}

// 翻译函数 - 支持嵌套键（如 'common.cancel'）
function t(key, replacements = {}) {
    if (!i18nData) {
        return key;
    }
    
    // 分割键路径
    const keys = key.split('.');
    let value = i18nData;
    
    // 逐层访问嵌套对象
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            console.warn(`翻译键不存在: ${key}`);
            return key;
        }
    }
    
    // 如果最终值不是字符串，返回原键
    if (typeof value !== 'string') {
        console.warn(`翻译值不是字符串: ${key}`);
        return key;
    }
    
    // 替换变量 {{variable}}
    let result = value;
    for (const [placeholder, replacement] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{{${placeholder}}}`, 'g'), replacement);
    }
    
    return result;
}

// 切换语言并更新界面
window.changeLanguage = async function(lang) {
    const success = await loadLanguage(lang);
    if (success) {
        try {
            // 保存语言设置
            await invoke('save_language_setting', {
                language: lang
            });
            
            // 更新国旗按钮的active状态
            document.querySelectorAll('.flag-btn').forEach(btn => {
                if (btn.dataset.lang === lang) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // 更新整个界面的文本
            updateUILanguage();
            
            // 显示通知
            showNotification(t('notifications.languageChanged'), 'success');
        } catch (error) {
            console.error('保存语言设置失败:', error);
            showNotification('保存语言设置失败', 'error');
        }
    }
}

// 更新界面所有文本为当前语言
function updateUILanguage() {
    console.log('[翻译] 开始更新UI语言，当前语言:', currentLanguage);
    
    // 1. 更新主界面标签页
    const foldersTab = document.querySelector('[data-tab="folders"]');
    if (foldersTab) foldersTab.textContent = t('folders.title');
    
    const rulesTab = document.querySelector('[data-tab="rules"]');
    if (rulesTab) rulesTab.textContent = t('rules.title');
    
    const activityTab = document.querySelector('[data-tab="activity"]');
    if (activityTab) activityTab.textContent = t('activity.title');
    
    // 2. 更新文件夹面板
    const foldersPaneTitle = document.getElementById('foldersPaneTitle');
    if (foldersPaneTitle) {
        foldersPaneTitle.textContent = t('folders.title');
        console.log('[翻译] 文件夹标题:', t('folders.title'));
    }
    
    const addFolderBtnText = document.getElementById('addFolderBtnText');
    if (addFolderBtnText) {
        addFolderBtnText.textContent = `+ ${t('folders.add')}`;
        console.log('[翻译] 添加文件夹按钮:', t('folders.add'));
    }
    
    // 更新空状态文本
    const noFoldersText = document.getElementById('noFoldersText');
    if (noFoldersText) noFoldersText.textContent = t('folders.noFolders');
    
    const noFoldersHint = document.getElementById('noFoldersHint');
    if (noFoldersHint) noFoldersHint.textContent = t('folders.emptyHint');
    
    // 更新统计标签
    const foldersStatLabel = document.getElementById('foldersStatLabel');
    if (foldersStatLabel) foldersStatLabel.textContent = t('folders.title');
    
    // 3. 更新规则面板
    const rulesPaneTitle = document.getElementById('rulesPaneTitle');
    if (rulesPaneTitle) {
        rulesPaneTitle.textContent = t('rules.title');
        console.log('[翻译] 规则标题:', t('rules.title'));
    }
    
    const addRuleBtnText = document.getElementById('addRuleBtnText');
    if (addRuleBtnText) {
        addRuleBtnText.textContent = `+ ${t('rules.add')}`;
        console.log('[翻译] 添加规则按钮:', t('rules.add'));
    }
    
    // 更新规则空状态文本
    const noRulesText = document.getElementById('noRulesText');
    if (noRulesText) noRulesText.textContent = t('rules.noRules');
    
    const noRulesHint = document.getElementById('noRulesHint');
    if (noRulesHint) noRulesHint.textContent = t('rules.noRulesHint');
    
    // 更新视图模式标签
    const viewModeLabel = document.getElementById('viewModeLabel');
    if (viewModeLabel) {
        const currentViewMode = document.querySelector('.view-option.active')?.dataset.value || 'grouped';
        if (currentViewMode === 'grouped') {
            viewModeLabel.textContent = t('rules.viewGrouped');
        } else if (currentViewMode === 'list') {
            viewModeLabel.textContent = t('rules.viewList');
        } else if (currentViewMode === 'split') {
            viewModeLabel.textContent = t('rules.viewSplit');
        }
    }
    
    // 更新视图下拉选项
    const viewOptions = document.querySelectorAll('.view-option span');
    if (viewOptions.length >= 3) {
        viewOptions[0].textContent = t('rules.viewGrouped');
        viewOptions[1].textContent = t('rules.viewList');
        viewOptions[2].textContent = t('rules.viewSplit');
    }
    
    // 4. 更新设置面板
    const settingsPaneTitle = document.getElementById('settingsPaneTitle');
    if (settingsPaneTitle) settingsPaneTitle.textContent = t('settings.title');
    
    // 更新设置部分的标题
    const interfaceTitle = document.getElementById('interfaceSettingsTitle');
    if (interfaceTitle) interfaceTitle.textContent = t('settings.interface');
    
    const animationTitle = document.getElementById('animationSettingsTitle');
    if (animationTitle) animationTitle.textContent = t('settings.animation');
    
    const stabilityTitle = document.getElementById('stabilitySettingsTitle');
    if (stabilityTitle) stabilityTitle.textContent = t('settings.fileStability');
    
    const configTitle = document.getElementById('configManagementTitle');
    if (configTitle) configTitle.textContent = t('settings.configManagement');
    
    // 更新设置项标签和描述
    const stabilityDesc = document.getElementById('stabilityDescription');
    if (stabilityDesc) stabilityDesc.textContent = t('settings.stabilityDescription');
    
    const stabilityHint = document.getElementById('stabilityHint');
    if (stabilityHint) stabilityHint.textContent = t('settings.stabilityHint');
    
    const configHint = document.getElementById('configManagementHint');
    if (configHint) configHint.textContent = t('settings.configManagementHint');
    
    // 更新配置管理按钮
    const exportText = document.getElementById('exportConfigText');
    if (exportText) exportText.textContent = t('settings.exportConfig');
    
    const importText = document.getElementById('importConfigText');
    if (importText) importText.textContent = t('settings.importConfig');
    
    // 更新设置项标签
    const languageLabel = document.getElementById('languageLabel');
    if (languageLabel) languageLabel.textContent = t('settings.language');
    
    const animationLabel = document.getElementById('animationLabel');
    if (animationLabel) animationLabel.textContent = t('settings.animation');
    
    const animationSpeedLabel = document.getElementById('animationSpeedLabel');
    if (animationSpeedLabel) animationSpeedLabel.textContent = t('settings.animationSpeed');
    
    const stabilityDelayLabel = document.getElementById('stabilityDelayLabel');
    if (stabilityDelayLabel) stabilityDelayLabel.textContent = t('settings.stabilityDelay');
    
    const stabilityChecksLabel = document.getElementById('stabilityChecksLabel');
    if (stabilityChecksLabel) stabilityChecksLabel.textContent = t('settings.stabilityChecks');
    
    // 更新动画效果选项
    const animationSelect = document.getElementById('animationSelect');
    if (animationSelect) {
        animationSelect.options[0].textContent = t('settings.animationNone');
        animationSelect.options[1].textContent = t('settings.animationFade');
        animationSelect.options[2].textContent = t('settings.animationSlide');
    }
    
    // 更新动画速度选项
    const speedSelect = document.getElementById('animationSpeedSelect');
    if (speedSelect) {
        speedSelect.options[0].textContent = t('settings.speedFast');
        speedSelect.options[1].textContent = t('settings.speedNormal');
        speedSelect.options[2].textContent = t('settings.speedSlow');
    }
    
    // 更新稳定性检查延迟选项
    const delaySelect = document.getElementById('stabilityDelaySelect');
    if (delaySelect) {
        delaySelect.options[0].textContent = t('settings.delay1s');
        delaySelect.options[1].textContent = t('settings.delay2s');
        delaySelect.options[2].textContent = t('settings.delay3s');
        delaySelect.options[3].textContent = t('settings.delay5s');
        delaySelect.options[4].textContent = t('settings.delay10s');
    }
    
    // 更新稳定性检查次数选项
    const checksSelect = document.getElementById('stabilityChecksSelect');
    if (checksSelect) {
        checksSelect.options[0].textContent = t('settings.checks1');
        checksSelect.options[1].textContent = t('settings.checks2');
        checksSelect.options[2].textContent = t('settings.checks3');
        checksSelect.options[3].textContent = t('settings.checks5');
    }
    
    // 6. 更新日志管理部分
    const logManagementTitle = document.getElementById('logManagementTitle');
    if (logManagementTitle) logManagementTitle.textContent = t('settings.logManagement');
    
    const logManagementDescription = document.getElementById('logManagementDescription');
    if (logManagementDescription) logManagementDescription.textContent = t('settings.logManagementDescription');
    
    const logRetentionDaysLabel = document.getElementById('logRetentionDaysLabel');
    if (logRetentionDaysLabel) logRetentionDaysLabel.textContent = t('settings.logRetentionDays');
    
    const logManagementHint = document.getElementById('logManagementHint');
    if (logManagementHint) logManagementHint.textContent = t('settings.logManagementHint');
    
    const logRetentionSelect = document.getElementById('logRetentionDaysSelect');
    if (logRetentionSelect) {
        logRetentionSelect.options[0].textContent = t('settings.days7');
        logRetentionSelect.options[1].textContent = t('settings.days15');
        logRetentionSelect.options[2].textContent = t('settings.days30');
        logRetentionSelect.options[3].textContent = t('settings.days60');
        logRetentionSelect.options[4].textContent = t('settings.days90');
        logRetentionSelect.options[5].textContent = t('settings.daysForever');
    }
    
    // 5. 更新活动日志面板
    const activityLogTitle = document.getElementById('activityLogTitle');
    if (activityLogTitle) activityLogTitle.textContent = t('activity.title');
    
    const clearActivityBtnText = document.getElementById('clearActivityBtnText');
    if (clearActivityBtnText) clearActivityBtnText.textContent = t('activity.clearLog');
    
    const openLogFolderBtnText = document.getElementById('openLogFolderBtnText');
    if (openLogFolderBtnText) openLogFolderBtnText.textContent = t('activity.openLogFolder');
    
    // 更新按钮的 title 属性
    const openLogFolderBtn = document.getElementById('openLogFolderBtn');
    if (openLogFolderBtn) openLogFolderBtn.title = t('activity.openLogFolderHint');
    
    const todayBtnText = document.getElementById('todayBtnText');
    if (todayBtnText) todayBtnText.textContent = t('activity.today');
    
    // 更新初始活动消息
    const initialActivityTime = document.getElementById('initialActivityTime');
    if (initialActivityTime) initialActivityTime.textContent = t('activity.startup');
    
    const initialActivityMessage = document.getElementById('initialActivityMessage');
    if (initialActivityMessage) initialActivityMessage.textContent = t('activity.appReady');
    
    // 6. 更新文件夹和规则列表
    renderFolders();
    renderRules();
    
    // 7. 更新规则模态框
    const ruleModalTitle = document.getElementById('ruleModalTitle');
    if (ruleModalTitle) {
        // 根据是否在编辑模式来设置标题
        ruleModalTitle.textContent = appState.editingRuleId ? t('rules.edit') : t('rules.add');
    }
    
    // 更新规则表单中的标签
    const ruleNameLabel = document.getElementById('ruleNameLabel');
    if (ruleNameLabel) ruleNameLabel.innerHTML = t('rules.name') + ' <span class="required">*</span>';
    
    const fileExtensionsLabel = document.getElementById('fileExtensionsLabel');
    if (fileExtensionsLabel) fileExtensionsLabel.textContent = t('rules.fileExtensions');
    
    const otherConditionsLabel = document.getElementById('otherConditionsLabel');
    if (otherConditionsLabel) otherConditionsLabel.textContent = t('rules.otherConditions');
    
    const targetFolderLabel = document.getElementById('targetFolderLabel');
    if (targetFolderLabel) targetFolderLabel.innerHTML = t('rules.targetFolder') + ' <span class="required">*</span>';
    
    const conflictStrategyLabel = document.getElementById('conflictStrategyLabel');
    if (conflictStrategyLabel) conflictStrategyLabel.textContent = t('rules.conflictHandling');
    
    // 更新规则表单中的按钮
    const saveRuleBtn = document.getElementById('saveRuleBtn');
    if (saveRuleBtn) saveRuleBtn.textContent = t('common.save');
    
    const cancelRuleBtn = document.getElementById('cancelRuleBtn');
    if (cancelRuleBtn) cancelRuleBtn.textContent = t('common.cancel');
    
    // 更新冲突策略选项
    const conflictStrategySelect = document.getElementById('conflictStrategy');
    if (conflictStrategySelect) {
        conflictStrategySelect.options[0].textContent = t('rules.conflictSkip');
        conflictStrategySelect.options[1].textContent = t('rules.conflictReplace');
        conflictStrategySelect.options[2].textContent = t('rules.conflictRename');
    }
    
    // 8. 更新文件夹模态框
    const folderModalTitle = document.getElementById('folderModalTitle');
    if (folderModalTitle) {
        folderModalTitle.textContent = appState.editingFolderId ? t('folders.edit') : t('folders.add');
    }
    
    const folderPathLabel = document.getElementById('folderPathLabel');
    if (folderPathLabel) folderPathLabel.innerHTML = t('folders.path') + ' <span class="required">*</span>';
    
    const folderNameLabel = document.getElementById('folderNameLabel');
    if (folderNameLabel) folderNameLabel.innerHTML = t('common.name') + ' <span class="required">*</span>';
    
    const saveFolderBtn = document.getElementById('saveFolderBtn');
    if (saveFolderBtn) saveFolderBtn.textContent = t('common.save');
    
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    if (cancelFolderBtn) cancelFolderBtn.textContent = t('common.cancel');
    
    const browseFolderBtn = document.getElementById('browseFolderBtn');
    if (browseFolderBtn) browseFolderBtn.textContent = t('common.select');
    
    // 9. 更新批量确认窗口
    const batchModal = document.getElementById('batchConfirmModal');
    if (batchModal) {
        const batchTitle = document.getElementById('batchModalTitle');
        if (batchTitle) batchTitle.textContent = t('batch.title');
        
        const confirmBtn = document.getElementById('confirmBatch');
        if (confirmBtn) confirmBtn.textContent = t('batch.confirmAndOrganize');
        
        const cancelBtn = document.getElementById('cancelBatch');
        if (cancelBtn) cancelBtn.textContent = t('common.cancel');
    }
    
    // 10. 更新删除确认对话框
    const deleteModalTitle = document.querySelector('#deleteConfirmModal .modal-header h2');
    if (deleteModalTitle) deleteModalTitle.textContent = t('deleteConfirm.title');
    
    // 11. 更新统计卡片
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 3) {
        statLabels[0].textContent = t('activity.filesProcessed');
        statLabels[1].textContent = t('folders.title');
        statLabels[2].textContent = t('rules.title');
    }
    
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    if (confirmDeleteBtn) confirmDeleteBtn.textContent = t('common.delete');
    
    const cancelDeleteBtn = document.getElementById('cancelDelete');
    if (cancelDeleteBtn) cancelDeleteBtn.textContent = t('common.cancel');
    
    // 11. 更新空状态提示
    const emptyRulesHint = document.querySelector('#rules-pane .empty-hint');
    if (emptyRulesHint) emptyRulesHint.textContent = t('rules.noRules');
    
    const emptyFoldersHint = document.querySelector('#folders-pane .empty-hint');
    if (emptyFoldersHint) emptyFoldersHint.textContent = t('folders.noFolders');
    
    console.log(`✓ 界面语言已更新: ${currentLanguage}`);
}

// ========== 全局状态 ==========
const appState = {
    folders: [],
    rules: [],
    windowDragging: false, // 窗口是否正在被拖动
    snapEdge: null, // 当前准备折叠的边缘 ('top', 'left', 'right')
    collapsed: false, // 窗口是否已折叠
    lastCollapsedEdge: 'Top', // 上次折叠的边缘，默认为顶部
    tempExpanded: false, // 临时展开状态（鼠标靠近边缘自动展开）
    monitoring: false,
    filesProcessed: 0,
    editingFolderId: null,
    editingRuleId: null,
    pendingBatch: [],  // 待整理文件队列
    batchThreshold: 1,  // 批量确认阈值（从配置读取）
    currentConditions: [],  // 当前规则的条件列表
    currentExtensions: [],  // 当前规则的扩展名列表
    currentRuleIndex: -1,  // 当前选中的规则索引（-1表示所有规则）
    editingConditionIndex: -1,  // 正在编辑的条件索引（-1表示新增）
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
    fileStabilityDelay: 3,  // 文件稳定性检查延迟（秒）
    fileStabilityChecks: 2,  // 文件稳定性检查次数
    processedFiles: new Set(),  // 记录已处理过的文件路径，避免重复处理
    isFullscreen: false,  // 窗口是否处于全屏状态
    selectedRuleId: null,  // 选中的单个规则ID（用于拖拽文件到特定规则）
    selectedRuleIds: null,  // 选中的多个规则IDs（用于拖拽文件到多个规则）
    pendingDeleteItem: null,  // 待删除的项目 { type: 'rule'|'folder', id: string, name: string }
    pendingFilesByFolder: {},  // 按文件夹分组的待处理文件队列 { folderId: [{ path, name }, ...] }
    currentBatchFolderId: null,  // 当前批量管理窗口显示的文件夹ID
    collapsedGroups: new Set(),  // 折叠的规则组（存储目标路径）
    viewMode: 'grouped',  // 规则列表视图模式：'grouped' 分组视图 | 'list' 列表视图 | 'split' 分栏视图
    selectedFolderId: null,  // 分栏视图中选中的文件夹ID
    presetDestination: null,  // 预设的目标文件夹路径（用于分组视图快速添加规则）
    currentLogDate: null,  // 当前查看的日志日期（null表示今天）
    logRetentionDays: 30  // 日志保留天数
};

// 为规则生成字母编号
function getRuleLabel(index) {
    return String.fromCharCode(65 + index); // A, B, C, ...
}

// 更新视图图标
// 切换视图下拉菜单
window.toggleViewDropdown = function() {
    const viewSwitcher = document.querySelector('.view-switcher');
    if (viewSwitcher) {
        viewSwitcher.classList.toggle('active');
    }
}

// 选择视图模式
window.selectViewMode = function(mode) {
    appState.viewMode = mode;
    updateViewDisplay(mode);
    renderRules();
    
    // 关闭下拉菜单
    const viewSwitcher = document.querySelector('.view-switcher');
    if (viewSwitcher) {
        viewSwitcher.classList.remove('active');
    }
    
    const modeNames = {
        'grouped': t('rules.viewGrouped'),
        'list': t('rules.viewList'),
        'split': t('rules.viewSplit')
    };
    console.log('[视图切换] 切换到:', modeNames[mode]);
}

// 更新视图显示（图标、标签、选中状态）
function updateViewDisplay(viewMode) {
    const iconPaths = {
        'grouped': 'M2 3h5v5H2V3zm7 0h5v5H9V3zM2 10h5v5H2v-5zm7 0h5v5H9v-5z',
        'list': 'M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z',
        'split': 'M2 2h5v12H2V2zM9 2h5v12H9V2z'
    };
    
    const modeNames = {
        'grouped': t('rules.viewGrouped'),
        'list': t('rules.viewList'),
        'split': t('rules.viewSplit')
    };
    
    // 更新按钮图标
    const currentIcon = document.getElementById('view-icon-current');
    if (currentIcon) {
        currentIcon.setAttribute('d', iconPaths[viewMode]);
    }
    
    // 更新按钮标签
    const label = document.getElementById('viewModeLabel');
    if (label) {
        label.textContent = modeNames[viewMode];
    }
    
    // 更新下拉菜单选中状态
    document.querySelectorAll('.view-option').forEach(option => {
        if (option.dataset.value === viewMode) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
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

async function initializeApp() {
    console.log('FloatSort V2 初始化中...');
    
    // 1. 首先加载设置以获取用户的语言偏好
    const settings = await getSettings();
    const savedLanguage = settings?.language || 'zh-CN';
    
    // 2. 加载语言文件
    await loadLanguage(savedLanguage);
    
    // 3. 初始化其他组件
    setupTabs();
    setupEventListeners();
    setupBackendListeners();
    setupWindowListeners();
    setupWindowSnap(); // 新的窗口折叠功能
    
    // 4. 加载数据（会触发渲染，需要在语言加载后）
    await loadAppData();
    
    // 5. 加载今天的日志
    const today = formatDate(new Date());
    await loadLogByDate(today);
    
    // 6. 更新界面语言（确保所有静态文本都被翻译）
    updateUILanguage();
    
    // ❌ 移除定时刷新：会覆盖前端添加的实时日志
    // setInterval(loadActivityLogs, 10000);
    
    // 添加启动日志
    addActivity(`<strong>${t('activity.appReady')}</strong>`, 'info');
    
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
            
            // 移除活动日志，切换tab不需要记录
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
    document.getElementById('minimizeBtn').addEventListener('click', minimizeToTray);
    document.getElementById('closeWindowBtn').addEventListener('click', exitProgram);
    
    // 拖拽区域监听（检测拖拽状态）
    // 注释：拖动检测已移至 setupWindowSnap() 函数中
    const appHeader = document.querySelector('.app-header');
    if (appHeader) {
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
    
    // 注意：全局 mouseup 监听已移至 setupWindowSnap() 中统一处理
    
    // 文件夹管理
    document.getElementById('addFolderBtn').addEventListener('click', () => openFolderModal());
    document.getElementById('closeFolderModal').addEventListener('click', closeFolderModal);
    document.getElementById('cancelFolderBtn').addEventListener('click', closeFolderModal);
    document.getElementById('saveFolderBtn').addEventListener('click', saveFolder);
    document.getElementById('browseFolderBtn').addEventListener('click', browseFolder);
    
    // 触发模式切换
    document.querySelectorAll('input[name="triggerMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const scheduledConfig = document.getElementById('scheduledConfig');
            if (e.target.value === 'scheduled') {
                scheduledConfig.style.display = 'block';
            } else {
                scheduledConfig.style.display = 'none';
            }
        });
    });
    
    // 调度类型切换
    document.querySelectorAll('input[name="scheduleType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // 隐藏所有配置
            document.getElementById('intervalConfig').style.display = 'none';
            document.getElementById('dailyConfig').style.display = 'none';
            document.getElementById('weeklyConfig').style.display = 'none';
            
            // 显示选中的配置
            const selectedType = e.target.value;
            if (selectedType === 'interval') {
                document.getElementById('intervalConfig').style.display = 'block';
            } else if (selectedType === 'daily') {
                document.getElementById('dailyConfig').style.display = 'block';
            } else if (selectedType === 'weekly') {
                document.getElementById('weeklyConfig').style.display = 'block';
            }
        });
    });
    
    // 视图模式初始化
    updateViewDisplay(appState.viewMode);
    
    // 点击页面其他区域关闭下拉菜单
    document.addEventListener('click', (e) => {
        const viewSwitcher = document.querySelector('.view-switcher');
        if (viewSwitcher && !viewSwitcher.contains(e.target)) {
            viewSwitcher.classList.remove('active');
        }
    });
    
    // 规则管理
    document.getElementById('addRuleBtn').addEventListener('click', () => openRuleModal());
    document.getElementById('closeRuleModal').addEventListener('click', closeRuleModal);
    document.getElementById('cancelRuleBtn').addEventListener('click', closeRuleModal);
    document.getElementById('saveRuleBtn').addEventListener('click', saveRule);
    
    // 条件构建器
    document.getElementById('conditionType').addEventListener('change', updateConditionInputs);
    document.getElementById('addConditionBtn').addEventListener('click', addCondition);
    
    // 扩展名标签管理
    const extensionInput = document.getElementById('extensionInput');
    const addExtensionBtn = document.getElementById('addExtensionBtn');
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    
    if (extensionInput) {
        // 回车键添加扩展名
        extensionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addExtension();
            }
        });
    }
    
    if (addExtensionBtn) {
        addExtensionBtn.addEventListener('click', addExtension);
    }
    
    // 监听扩展名启用/禁用按钮
    if (enableExtensionsBtn) {
        enableExtensionsBtn.addEventListener('click', toggleExtensionState);
    }
    
    // 监听应用范围复选框，自动禁用/启用扩展名
    const applyToFiles = document.getElementById('applyToFiles');
    const applyToFolders = document.getElementById('applyToFolders');
    
    if (applyToFiles) {
        applyToFiles.addEventListener('change', updateExtensionAvailability);
    }
    
    if (applyToFolders) {
        applyToFolders.addEventListener('change', updateExtensionAvailability);
    }
    
    // 占位符标签按钮
    setupPlaceholderButtons();
    
    // 导入/导出配置
    document.getElementById('exportConfigBtn').addEventListener('click', exportConfig);
    document.getElementById('importConfigBtn').addEventListener('click', importConfig);
    
    // 设置
    // 语言切换 - 使用国旗按钮，在HTML中通过onclick直接调用changeLanguage
    
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
    
    document.getElementById('stabilityDelaySelect').addEventListener('change', (e) => {
        appState.fileStabilityDelay = parseInt(e.target.value);
        saveStabilitySettings();
        console.log(`[设置] 文件稳定性延迟已更改为: ${e.target.value}秒`);
    });
    
    document.getElementById('stabilityChecksSelect').addEventListener('change', (e) => {
        appState.fileStabilityChecks = parseInt(e.target.value);
        saveStabilitySettings();
        console.log(`[设置] 文件稳定性检查次数已更改为: ${e.target.value}次`);
    });
    
    // 日志相关
    document.getElementById('clearActivityBtn').addEventListener('click', clearActivity);
    document.getElementById('openLogFolderBtn').addEventListener('click', openLogFolder);
    document.getElementById('prevDayBtn').addEventListener('click', showPreviousDay);
    document.getElementById('nextDayBtn').addEventListener('click', showNextDay);
    document.getElementById('todayBtn').addEventListener('click', showToday);
    document.getElementById('logDatePicker').addEventListener('change', onDatePickerChange);
    document.getElementById('logRetentionDaysSelect').addEventListener('change', saveLogRetentionSetting);
    
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
    
    // 所有模态框不允许点击背景关闭，只能通过按钮关闭（防止误操作）
    // document.getElementById('folderModal').addEventListener('click', (e) => {
    //     if (e.target.id === 'folderModal') closeFolderModal();
    // });
    // document.getElementById('ruleModal').addEventListener('click', (e) => {
    //     if (e.target.id === 'ruleModal') closeRuleModal();
    // });
    // document.getElementById('batchConfirmModal').addEventListener('click', (e) => {
    //     if (e.target.id === 'batchConfirmModal') closeBatchModal();
    // });
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
    // 监听文件整理事件
    listen('file-organized', event => {
        const { from, to } = event.payload;
        const fileName = from.split('\\').pop() || from.split('/').pop();
        const toPath = to.split('\\').pop() || to.split('/').pop();
        
        console.log('[文件整理] 文件已整理:', from, '->', to);
        addActivity(
            `<strong>${fileName}</strong> → ${toPath}`,
            'success',
            `${t('activity.from')}: ${from}<br>${t('activity.to')}: ${to}`
        );
    });
    
    listen('file-detected', async event => {
        const filePath = event.payload.file_path;
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop();
        
        console.log('[文件检测] 检测到文件:', fileName);
        addActivity(`${t('activity.fileDetected')}: ${fileName}`);
        
        // 找到文件所属的文件夹
        const folder = appState.folders.find(f => filePath.startsWith(f.path));
        
        if (!folder) {
            console.warn('[文件检测] 未找到对应的监控文件夹');
            return;
        }
        
        // 根据文件夹的处理模式决定处理方式
        if (folder.processing_mode === 'auto') {
            // 自动处理模式：立即整理文件
            console.log('[文件检测] 自动处理模式，立即整理');
            try {
                const result = await invoke('process_file', { path: filePath });
                if (!result) {
                    console.log('[文件检测] 文件未匹配任何规则');
                    addActivity(`${t('activity.fileNotMatched')}: ${fileName}`);
                }
                // 成功的整理信息由 file-organized 事件处理
                appState.filesProcessed++;
                updateStats();
            } catch (error) {
                console.error('[文件检测] 处理文件失败:', error);
                addActivity(`${fileName} ${t('activity.fileFailed')}: ${error}`, 'error');
            }
        } else {
            // 手动处理模式：添加到待处理队列
            console.log('[文件检测] 手动处理模式，加入待处理队列');
            addActivity(`<strong>${fileName}</strong> ${t('activity.fileAddedToQueue')}（${folder.name}）`, 'info');
            
            if (!appState.pendingFilesByFolder[folder.id]) {
                appState.pendingFilesByFolder[folder.id] = [];
            }
            
            // 检查文件是否已经在待处理列表中（去重）
            const existingFile = appState.pendingFilesByFolder[folder.id].find(f => f.path === filePath);
            if (!existingFile) {
                appState.pendingFilesByFolder[folder.id].push({
                    path: filePath,
                    name: fileName
                });
                console.log('[文件检测] 文件已加入待处理队列:', fileName);
            } else {
                console.log('[文件检测] 文件已在待处理队列中，跳过:', fileName);
            }
            
            // 更新文件夹列表显示
            renderFolders();
            
            // 如果批量管理窗口已经打开，且显示的是当前文件夹的待处理文件，则刷新窗口
            const batchModal = document.getElementById('batchConfirmModal');
            if (batchModal && batchModal.style.display === 'flex' && appState.currentBatchFolderId === folder.id) {
                console.log('[文件检测] 批量管理窗口已打开，刷新窗口内容');
                // 重新显示该文件夹的待处理文件
                await showFolderPendingFiles(folder.id);
            }
        }
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
            addActivity(`${t('activity.filesDropped')}: ${files.length}`);
            
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
                // 清除选中的规则ID，使用所有规则
                appState.selectedRuleIds = null;
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
        addActivity(`${t('activity.windowRestored')}`, 'info');
        
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
            addActivity(`${t('activity.fileProcessing')}: ${fileName}`);
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
                addActivity(`${t('activity.fileNotMatched')}: ${fileName}`);
                appState.pendingBatch = appState.pendingBatch.filter(f => f.path !== filePath);
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            addActivity(`❌ ${fileName} ${t('activity.fileFailed')}: ${error}`, 'error');
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
                
                // 更新分栏视图中文件夹的选中状态
                updateSplitFolderSelectionState();
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
                
                const selectedCards = document.querySelectorAll('.rule-card.selected');
                const selectedCount = selectedCards.length;
                if (selectedCount > 1) {
                    // 获取前2个规则名称
                    const ruleNames = Array.from(selectedCards).slice(0, 2).map(card => {
                        const nameEl = card.querySelector('.rule-name');
                        return nameEl ? nameEl.textContent : '';
                    }).filter(name => name);
                    
                    const displayText = ruleNames.join('，');
                    showNotification(`已应用规则 ${displayText} ${selectedCount} 个规则`, 'success');
                } else {
                    showNotification(`已应用规则 ${ruleName}`, 'success');
                }
                
                // 更新分栏视图中文件夹的选中状态
                updateSplitFolderSelectionState();
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

// 渲染按扩展名分组的未匹配文件
function renderUnmatchedFilesGrouped(unmatchedFiles) {
    if (unmatchedFiles.length === 0) return '';
    
    // 分离文件夹和文件
    const folders = [];
    const files = [];
    unmatchedFiles.forEach(file => {
        if (file.is_directory) {
            folders.push(file);
        } else {
            files.push(file);
        }
    });
    
    // 按扩展名分组（仅对文件）
    const groupedByExt = {};
    files.forEach(file => {
        const ext = file.name.includes('.') 
            ? file.name.split('.').pop().toLowerCase() 
            : '无扩展名';
        if (!groupedByExt[ext]) {
            groupedByExt[ext] = [];
        }
        groupedByExt[ext].push(file);
    });
    
    let html = '';
    
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
                <span class="section-title">不符合规则的项目</span>
                <span class="section-count">${unmatchedFiles.length}</span>
                <span class="collapse-hint">点击收起</span>
            </div>
            <div class="batch-section-content">`;
    
    // 先显示文件夹
    if (folders.length > 0) {
        html += `
            <div class="ext-group">
                <div class="ext-group-header">
                    <span class="ext-badge">文件夹</span>
                    <span class="ext-count">${folders.length} 个</span>
                </div>
                ${folders.map(folder => {
                    const pathParts = folder.path.replace(/\\/g, '/').split('/');
                    const folderName = pathParts.pop();
                    const dirPath = pathParts.join('/');
                    
                    return `
                        <div class="batch-file-item-compact unmatched">
                            <div class="file-path-full">
                                <span class="dir-path">${dirPath}/</span><span class="file-name-red">${folderName}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // 然后显示按扩展名分组的文件
    html += Object.entries(groupedByExt).map(([ext, files]) => `
        <div class="ext-group">
            <div class="ext-group-header">
                <span class="ext-badge">.${ext}</span>
                <span class="ext-count">${files.length} 个文件</span>
            </div>
            ${files.map(file => {
                const pathParts = file.path.replace(/\\/g, '/').split('/');
                const fileName = pathParts.pop();
                const dirPath = pathParts.join('/');
                
                return `
                    <div class="batch-file-item-compact unmatched">
                        <div class="file-path-full">
                            <span class="dir-path">${dirPath}/</span><span class="file-name-red">${fileName}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `).join('');
    
    html += `
            </div>
        </div>
    `;
    
    return html;
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
            <div class="batch-section matched">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map((file, index) => {
                        // 提取源文件名
                        const sourceFileName = file.path.split(/[\\/]/).pop();
                        const sourcePath = file.path.substring(0, file.path.lastIndexOf(sourceFileName));
                        // 提取目标文件名
                        const targetFileName = file.targetPath.split(/[\\/]/).pop();
                        const targetPath = file.targetPath.substring(0, file.targetPath.lastIndexOf(targetFileName));
                        
                        return `
                        <div class="batch-file-item-compact-two-line" data-file-path="${file.path.replace(/"/g, '&quot;')}" data-file-index="${index}">
                            <div class="batch-file-status"></div>
                            <div class="batch-file-rule">${file.ruleName || '规则'}</div>
                            <div class="batch-file-paths">
                                <div class="batch-file-from">从: <span class="path-dir">${sourcePath}</span><span class="path-file">${sourceFileName}</span></div>
                                <div class="batch-file-to">到: <span class="path-dir">${targetPath}</span><span class="path-file">${targetFileName}</span></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件（按扩展名分组）
    html += renderUnmatchedFilesGrouped(unmatchedFiles);
    
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
            <div class="batch-section matched">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map((file, index) => {
                        // 提取源文件名
                        const sourceFileName = file.path.split(/[\\/]/).pop();
                        const sourcePath = file.path.substring(0, file.path.lastIndexOf(sourceFileName));
                        // 提取目标文件名
                        const targetFileName = file.targetPath.split(/[\\/]/).pop();
                        const targetPath = file.targetPath.substring(0, file.targetPath.lastIndexOf(targetFileName));
                        
                        return `
                        <div class="batch-file-item-compact-two-line" data-file-path="${file.path.replace(/"/g, '&quot;')}" data-file-index="${index}">
                            <div class="batch-file-status"></div>
                            <div class="batch-file-rule">${file.ruleName || '规则'}</div>
                            <div class="batch-file-paths">
                                <div class="batch-file-from">从: <span class="path-dir">${sourcePath}</span><span class="path-file">${sourceFileName}</span></div>
                                <div class="batch-file-to">到: <span class="path-dir">${targetPath}</span><span class="path-file">${targetFileName}</span></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件（按扩展名分组）
    html += renderUnmatchedFilesGrouped(unmatchedFiles);
    
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
    addActivity(`${t('activity.usingRule')} [${rule.name}] ${t('activity.processingWithRule')} ${files.length}`);
    
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
                addActivity(`⊘ ${file.name} ${t('activity.fileNotMatched')} [${rule.name}]`);
                skipCount++;
            }
        } catch (error) {
            console.error('处理文件失败:', error);
            addActivity(`❌ ${file.name} ${t('activity.fileFailed')}: ${error}`, 'error');
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
    
    addActivity(`✓ ${t('activity.completed')} - ${t('activity.success')}:${successCount} ${t('activity.skipped')}:${skipCount} ${t('activity.failed')}:${failCount}`);
}

// ========== 加载数据 ==========
async function loadAppData() {
    try {
        await loadConfig();
        await loadRules();    // 先加载规则
        await loadFolders();  // 再加载文件夹（这样渲染时能找到关联的规则）
        updateStats();
        
        // 启动文件监控
        await startFileMonitoring();
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败', 'error');
    }
}

// 辅助函数：获取当前设置
async function getSettings() {
    try {
        const config = await invoke('get_config');
        return {
            language: config.language || 'zh-CN',
            batchThreshold: config.batch_threshold || 1,
            animation: config.animation || 'none',
            animationSpeed: config.animation_speed || 'normal',
            fileStabilityDelay: config.file_stability_delay || 3,
            fileStabilityChecks: config.file_stability_checks || 2
        };
    } catch (error) {
        console.error('获取设置失败:', error);
        return {
            language: 'zh-CN',
            batchThreshold: 1,
            animation: 'none',
            animationSpeed: 'normal',
            fileStabilityDelay: 3,
            fileStabilityChecks: 2
        };
    }
}

async function loadConfig() {
    try {
        const config = await invoke('get_config');
        
        // 加载语言设置
        const savedLanguage = config.language || 'zh-CN';
        if (savedLanguage !== currentLanguage) {
            await loadLanguage(savedLanguage);
        }
        
        appState.batchThreshold = config.batch_threshold || 1;
        console.log(`✓ 批量确认阈值: ${appState.batchThreshold}`);
        
        // 加载动画设置
        appState.animation = config.animation || 'none';
        appState.animationSpeed = config.animation_speed || 'normal';
        
        // 加载文件稳定性检查设置
        appState.fileStabilityDelay = config.file_stability_delay || 3;
        appState.fileStabilityChecks = config.file_stability_checks || 2;
        
        // 加载日志保留天数设置
        appState.logRetentionDays = config.log_retention_days !== undefined ? config.log_retention_days : 30;
        
        // 更新UI中的选项和国旗按钮
        const animationSelect = document.getElementById('animationSelect');
        const speedSelect = document.getElementById('animationSpeedSelect');
        const stabilityDelaySelect = document.getElementById('stabilityDelaySelect');
        const stabilityChecksSelect = document.getElementById('stabilityChecksSelect');
        const logRetentionDaysSelect = document.getElementById('logRetentionDaysSelect');
        
        // 更新国旗按钮的active状态
        document.querySelectorAll('.flag-btn').forEach(btn => {
            if (btn.dataset.lang === currentLanguage) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        if (animationSelect) animationSelect.value = appState.animation;
        if (speedSelect) speedSelect.value = appState.animationSpeed;
        if (stabilityDelaySelect) stabilityDelaySelect.value = appState.fileStabilityDelay.toString();
        if (stabilityChecksSelect) stabilityChecksSelect.value = appState.fileStabilityChecks.toString();
        if (logRetentionDaysSelect) logRetentionDaysSelect.value = appState.logRetentionDays.toString();
        
        // 初始化日期选择器为今天
        const logDatePicker = document.getElementById('logDatePicker');
        if (logDatePicker) logDatePicker.value = formatDate(new Date());
        
        console.log(`✓ 动画设置: ${appState.animation} (${appState.animationSpeed})`);
        console.log(`✓ 文件稳定性检查: 延迟${appState.fileStabilityDelay}秒, ${appState.fileStabilityChecks}次检查`);
        console.log(`✓ 日志保留天数: ${appState.logRetentionDays === -1 ? '永久保留' : appState.logRetentionDays + '天'}`);
        
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
            
            // 窗口大小调整完成后显示窗口（避免启动时闪烁）
            await appWindow.show();
            console.log('✓ 窗口已显示');
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        // 使用默认值
        appState.batchThreshold = 1;
        appState.animation = 'none';
        
        // 即使加载失败也要显示窗口
        if (!appState.isMiniMode) {
            try {
                const { appWindow } = window.__TAURI__.window;
                await appWindow.show();
                console.log('✓ 窗口已显示（使用默认值）');
            } catch (showError) {
                console.error('显示窗口失败:', showError);
            }
        }
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

// ========== 触发模式显示文本 ==========
function getTriggerModeDisplay(folder) {
    // 兼容旧版本：如果没有 trigger_mode，使用 processing_mode
    if (!folder.trigger_mode && folder.processing_mode) {
        folder.trigger_mode = folder.processing_mode === 'auto' ? 'immediate' : 'manual';
    }
    
    const triggerMode = folder.trigger_mode || 'manual';
    
    switch (triggerMode) {
        case 'immediate':
            return t('folders.triggerImmediate');
        case 'manual':
            return t('folders.triggerManual');
        case 'on_startup':
            return t('folders.triggerStartup');
        case 'scheduled':
            const scheduleType = folder.schedule_type;
            if (scheduleType === 'interval') {
                const minutes = folder.schedule_interval_minutes || 30;
                if (minutes < 60) {
                    return t('folders.everyMinutes', { minutes });
                } else {
                    const hours = Math.floor(minutes / 60);
                    return t('folders.everyHours', { hours });
                }
            } else if (scheduleType === 'daily') {
                const time = folder.schedule_daily_time || '09:00';
                return `${t('folders.everyDay')} ${time}`;
            } else if (scheduleType === 'weekly') {
                const day = folder.schedule_weekly_day || 1;
                const time = folder.schedule_weekly_time || '09:00';
                const dayNames = [
                    t('folders.sunday'), 
                    t('folders.monday'), 
                    t('folders.tuesday'), 
                    t('folders.wednesday'), 
                    t('folders.thursday'), 
                    t('folders.friday'), 
                    t('folders.saturday')
                ];
                return `${dayNames[day]} ${time}`;
            }
            return t('folders.triggerScheduled');
        default:
            return t('folders.triggerManual');
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
        const pendingCount = (appState.pendingFilesByFolder[folder.id] || []).length;
        
        // 根据数量决定徽章颜色
        let badgeClass = 'pending-badge';
        if (pendingCount > 0) {
            if (pendingCount <= 5) {
                badgeClass += ' badge-low';
            } else if (pendingCount <= 20) {
                badgeClass += ' badge-medium';
            } else {
                badgeClass += ' badge-high';
            }
        }
        
        // 获取触发模式显示文本
        const triggerDisplay = getTriggerModeDisplay(folder);
        
        return `
            <div class="folder-card compact ${!folder.enabled ? 'disabled' : ''}" data-folder-id="${folder.id}">
                <button class="folder-toggle ${folder.enabled ? 'active' : ''}" 
                        onclick="toggleFolderMonitoring('${folder.id}')" title="${folder.enabled ? '禁用' : '启用'}">
                </button>
                
                <div class="folder-name-col">
                    <div class="folder-name">${folder.name}</div>
                    <div class="folder-trigger">${triggerDisplay}</div>
                </div>
                
                <div class="folder-path-col">
                    <div class="folder-path" title="${folder.path}" onclick="openFolderInExplorer('${folder.path.replace(/\\/g, '\\\\')}')">${folder.path}</div>
                </div>
                
                <div class="folder-rules-col">
                    ${associatedRules.length > 0 
                        ? associatedRules.map(r => `
                            <span class="rule-tag-with-edit">
                                <span class="rule-tag-name">${r.name}</span>
                                <button class="rule-tag-edit-btn" onclick="event.stopPropagation(); editRule('${r.id}')" title="编辑规则">
                                    <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                        <path d="M11.5 2L14 4.5L5.5 13H3V10.5L11.5 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </span>
                        `).join('')
                        : '<span class="hint-text">未关联规则</span>'}
                </div>
                
                ${pendingCount > 0 ? `
                <div class="folder-pending">
                    <button class="${badgeClass}" onclick="showFolderPendingFiles('${folder.id}')" title="点击查看待处理文件">
                        ${pendingCount}
                    </button>
                </div>
                ` : '<div class="folder-pending"></div>'}
                
                <div class="folder-actions">
                    <button class="btn-icon" onclick="editFolder('${folder.id}')" title="编辑">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="deleteFolder('${folder.id}')" title="删除">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 显示文件夹的待处理文件
async function showFolderPendingFiles(folderId) {
    const folder = appState.folders.find(f => f.id === folderId);
    if (!folder) {
        showNotification('文件夹不存在', 'error');
        return;
    }
    
    const pendingFiles = appState.pendingFilesByFolder[folderId] || [];
    if (pendingFiles.length === 0) {
        showNotification('没有待处理文件', 'info');
        return;
    }
    
    console.log('[待处理文件] 显示文件夹待处理文件:', folder.name, pendingFiles.length);
    
    // 使用批量确认窗口显示待处理文件
    appState.pendingBatch = [...pendingFiles];
    
    // 记录当前批量窗口显示的文件夹ID
    appState.currentBatchFolderId = folderId;
    
    // 如果文件夹关联了规则，使用这些规则；否则使用所有规则
    if (folder.rule_ids && folder.rule_ids.length > 0) {
        console.log('[待处理文件] 使用文件夹关联的规则:', folder.rule_ids);
        // 设置选中的规则ID，供 confirmBatch 使用
        appState.selectedRuleIds = [...folder.rule_ids];
        await showBatchConfirmWithMultipleRules(folder.rule_ids);
    } else {
        console.log('[待处理文件] 文件夹未关联规则，使用所有规则');
        // 清除选中的规则ID，使用所有规则
        appState.selectedRuleIds = null;
        await showBatchConfirm();
    }
}

// ========== 渲染规则列表 ==========
function renderRules() {
    // 根据视图模式选择渲染方式
    if (appState.viewMode === 'grouped' && typeof renderRulesGrouped === 'function') {
        renderRulesGrouped();
        return;
    }
    
    if (appState.viewMode === 'split') {
        renderSplitView();
        return;
    }
    
    // 列表视图渲染
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
            fullConditionTooltip = t('rules.noCondition');
        }
        
        if (condition) {
            conditionText = formatCondition(condition);
        } else {
            conditionText = t('rules.noCondition');
        }
        
        // 如果有多个条件，添加提示
        if (rule.conditions && rule.conditions.length > 1) {
            conditionText += ` (+${rule.conditions.length - 1})`;
        }
        
        // 生成文件夹列表的 tooltip
        const folderNames = usedByFolders.map(f => f.name).join('、') || '暂未被任何文件夹使用';
        
        // 处理目标路径显示
        const destination = rule.action.destination;
        const isRecycleBin = destination === '{recycle}'; // 检测回收站
        const isAbsolutePath = /^[A-Z]:\\/i.test(destination); // 检测绝对路径（Windows）
        let displayPath = destination;
        let iconColor = '#667eea'; // 默认紫色
        
        if (isRecycleBin) {
            iconColor = '#ef4444'; // 红色（回收站）
            displayPath = '回收站';
        } else if (isAbsolutePath) {
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
                    <div class="rule-condition-label">${t('rules.condition')}</div>
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
                    <button class="btn-icon btn-sm btn-always-visible" onclick="editRule('${rule.id}')" title="编辑">
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

// ========== 分栏视图渲染 ==========
function renderSplitView() {
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
    
    // 按目标文件夹分组规则
    const groups = new Map();
    appState.rules.forEach(rule => {
        const dest = rule.action.destination || '(未设置)';
        if (!groups.has(dest)) {
            groups.set(dest, []);
        }
        groups.get(dest).push(rule);
    });
    
    const groupArray = Array.from(groups.entries()).map(([dest, rules]) => ({
        destination: dest,
        rules: rules
    }));
    
    // 如果没有选中目标文件夹，默认选中第一个
    if (!appState.selectedFolderId && groupArray.length > 0) {
        appState.selectedFolderId = groupArray[0].destination;
    }
    
    const selectedGroup = groupArray.find(g => g.destination === appState.selectedFolderId);
    const groupRules = selectedGroup ? selectedGroup.rules : [];
    
    // 从localStorage读取分栏宽度
    const savedSidebarWidth = localStorage.getItem('splitSidebarWidth') || '280';
    
    rulesList.innerHTML = `
        <div class="split-view-container">
            <div class="split-view-sidebar" style="width: ${savedSidebarWidth}px;">
                ${groupArray.map(group => {
                    const destination = group.destination;
                    const isRecycleBin = destination === '{recycle}';
                    const isAbsolutePath = /^[A-Z]:\\/i.test(destination);
                    let displayPath = destination;
                    let iconColor = '#667eea';
                    
                    if (isRecycleBin) {
                        iconColor = '#ef4444';
                        displayPath = '🗑️ 回收站';
                    } else if (isAbsolutePath) {
                        iconColor = '#f97316';
                        const parts = destination.split(/[\\/]/);
                        const drive = parts[0];
                        const lastName = parts[parts.length - 1];
                        if (parts.length > 2) {
                            displayPath = `${drive}\\...\\${lastName}`;
                        }
                    } else if (destination && destination !== '(未设置)') {
                        const parts = destination.split(/[\\/]/);
                        if (parts.length > 1) {
                            displayPath = `..\\${destination}`;
                        } else {
                            displayPath = `...\\${destination}`;
                        }
                    }
                    
                    // 检查该组所有规则是否都被选中
                    const groupRuleIds = group.rules.map(r => r.id);
                    const allSelected = groupRuleIds.length > 0 && groupRuleIds.every(id => 
                        document.querySelector(`.rule-card[data-rule-id="${id}"]`)?.classList.contains('selected')
                    );
                    
                    return `
                        <div class="split-folder-item ${destination === appState.selectedFolderId ? 'active' : ''} ${allSelected ? 'selected' : ''}"
                             data-destination="${destination}"
                             onclick="selectFolderInSplit('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', event)">
                            <div class="split-folder-info" title="${destination}">
                                <div class="split-folder-name" style="color: ${iconColor};">${displayPath}</div>
                                <div class="split-folder-count">${group.rules.length} ${t('rules.rulesCount')}</div>
                            </div>
                            <div class="split-folder-actions">
                                <button class="btn-icon btn-sm split-apply-rule" onclick="applyRulesToFolder('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', event)" title="应用规则到监控文件夹">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <path d="M13 3L6 10L3 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <button class="btn-icon btn-sm split-add-rule" onclick="addRuleToSplitFolder('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', event)" title="添加规则到此文件夹">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                        <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="split-view-resizer"></div>
            <div class="split-view-content">
                <div class="split-view-header">
                    <div class="split-view-title">
                        ${(() => {
                            if (!selectedGroup) return '<span style="font-size: 14px; color: #9ca3af;">未选择</span>';
                            
                            const destination = selectedGroup.destination;
                            const isRecycleBin = destination === '{recycle}';
                            const isAbsolutePath = /^[A-Z]:\\/i.test(destination);
                            let displayPath = destination;
                            let iconColor = '#667eea';
                            
                            if (isRecycleBin) {
                                iconColor = '#ef4444';
                                displayPath = '🗑️ 回收站';
                            } else if (isAbsolutePath) {
                                iconColor = '#f97316';
                                const parts = destination.split(/[\\/]/);
                                const drive = parts[0];
                                const lastName = parts[parts.length - 1];
                                if (parts.length > 2) {
                                    displayPath = `${drive}\\...\\${lastName}`;
                                }
                            } else if (destination && destination !== '(未设置)') {
                                const parts = destination.split(/[\\/]/);
                                if (parts.length > 1) {
                                    displayPath = `..\\${destination}`;
                                } else {
                                    displayPath = `...\\${destination}`;
                                }
                            }
                            
                            return `
                                <span style="font-size: 14px; font-weight: 600; color: ${iconColor};" title="${destination}">
                                    ${displayPath}
                                </span>
                                <span style="font-size: 12px; color: #9ca3af; margin-left: 8px;">
                                    ${groupRules.length} ${t('rules.rulesCount')}
                                </span>
                            `;
                        })()}
                    </div>
                    <button class="btn-primary btn-sm" onclick="addRuleToSplitFolder('${selectedGroup ? selectedGroup.destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : ''}', event)">
                        + ${t('rules.add')}
                    </button>
                </div>
                <div class="split-view-body">
                    ${groupRules.length === 0 ? `
                        <div class="split-empty-state">
                            <span style="font-size: 48px;">📋</span>
                            <p style="margin-top: 16px; font-size: 14px;">${t('rules.noRulesForFolder')}</p>
                            <p style="font-size: 12px; margin-top: 8px;">${t('rules.clickToAddRule')}</p>
                        </div>
                    ` : groupRules.map((rule, index) => {
                    const condition = rule.conditions && rule.conditions.length > 0 ? rule.conditions[0] : null;
                    let conditionText = '';
                    
                    // 格式化条件
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
                        } else {
                            return `条件: ${cond.type}`;
                        }
                    };
                    
                    // 生成完整条件提示文本
                    let fullConditionTooltip = '';
                    if (rule.conditions && rule.conditions.length > 0) {
                        fullConditionTooltip = rule.conditions.map((c, i) => `${i + 1}. ${formatCondition(c)}`).join('\n');
                    } else {
                        fullConditionTooltip = t('rules.noCondition');
                    }
                    
                    if (condition) {
                        conditionText = formatCondition(condition);
                    } else {
                        conditionText = t('rules.noCondition');
                    }
                    
                    // 如果有多个条件，添加提示
                    if (rule.conditions && rule.conditions.length > 1) {
                        conditionText += ` (+${rule.conditions.length - 1})`;
                    }
                    
                    const globalIndex = appState.rules.findIndex(r => r.id === rule.id);
                    const usedByFolders = appState.folders.filter(f => f.rule_ids.includes(rule.id));
                    
                    return `
                        <div class="rule-card compact ${!rule.enabled ? 'disabled' : ''}" data-rule-id="${rule.id}" data-index="${globalIndex}" title="${fullConditionTooltip}">
                            <span class="rule-order-number">${globalIndex + 1}</span>
                            <div class="rule-name-col">
                                <div class="rule-name">${rule.name}</div>
                            </div>
                            <div class="rule-condition-col" title="${fullConditionTooltip}">
                                <div class="rule-condition-label">${t('rules.condition')}</div>
                                <div class="rule-condition-value">${conditionText}</div>
                            </div>
                            <div class="rule-usage" title="${usedByFolders.map(f => f.name).join('、') || '暂未被任何文件夹使用'}">
                                <span class="usage-badge">${usedByFolders.length}</span>
                                <span class="usage-text">个文件夹</span>
                            </div>
                            <div class="rule-order-controls">
                                <button class="order-btn order-left" onclick="moveRuleSplitUp(${index})" ${index === 0 ? 'disabled' : ''} title="上移">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                                <button class="order-btn order-right" onclick="moveRuleSplitDown(${index})" ${index === groupRules.length - 1 ? 'disabled' : ''} title="下移">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="rule-actions">
                                <button class="btn-icon btn-sm btn-always-visible" onclick="editRule('${rule.id}')" title="编辑">
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
                }).join('')}
                </div>
            </div>
        </div>
    `;
    
    // 初始化拖拽调整功能
    initSplitViewResizer();
    
    // 为规则卡片添加点击选择事件监听
    setupRuleSelection();
}

// 初始化分栏视图拖拽调整功能
function initSplitViewResizer() {
    const resizer = document.querySelector('.split-view-resizer');
    const sidebar = document.querySelector('.split-view-sidebar');
    const container = document.querySelector('.split-view-container');
    
    if (!resizer || !sidebar || !container) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        
        // 添加拖拽状态样式
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        resizer.classList.add('resizing');
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const newWidth = startWidth + deltaX;
        
        // 限制最小和最大宽度
        const minWidth = 200;
        const maxWidth = container.offsetWidth - 300; // 至少留300px给右侧
        const clampedWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
        
        sidebar.style.width = clampedWidth + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        
        isResizing = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        resizer.classList.remove('resizing');
        
        // 保存宽度到localStorage
        const currentWidth = sidebar.offsetWidth;
        localStorage.setItem('splitSidebarWidth', currentWidth.toString());
        
        console.log(`[分栏视图] 侧边栏宽度已保存: ${currentWidth}px`);
    });
}

// 更新分栏视图中文件夹的选中状态
function updateSplitFolderSelectionState() {
    if (appState.viewMode !== 'split') return;
    
    // 遍历所有文件夹项
    document.querySelectorAll('.split-folder-item').forEach(folderItem => {
        // 获取该文件夹对应的目标路径
        const destination = folderItem.getAttribute('data-destination');
        if (!destination) return;
        
        // 获取该组的所有规则
        const groupRules = appState.rules.filter(r => (r.action.destination || '(未设置)') === destination);
        const groupRuleIds = groupRules.map(r => r.id);
        
        // 检查是否所有规则都被选中
        const allSelected = groupRuleIds.length > 0 && groupRuleIds.every(id => 
            document.querySelector(`.rule-card[data-rule-id="${id}"]`)?.classList.contains('selected')
        );
        
        // 更新文件夹项的选中状态
        if (allSelected) {
            folderItem.classList.add('selected');
        } else {
            folderItem.classList.remove('selected');
        }
    });
}

// 选择分栏视图中的文件夹
window.selectFolderInSplit = function(destination, event) {
    // 如果点击的是操作按钮区域，不处理
    if (event && (event.target.closest('.split-folder-actions') || event.target.closest('button'))) {
        return;
    }
    
    // 切换显示的目标文件夹
    const previousFolder = appState.selectedFolderId;
    appState.selectedFolderId = destination;
    
    // 获取该组的所有规则ID
    const groupRules = appState.rules.filter(r => (r.action.destination || '(未设置)') === destination);
    const groupRuleIds = groupRules.map(r => r.id);
    
    if (event && event.ctrlKey) {
        // Ctrl + 点击：切换该组所有规则的选中状态
        const allSelected = groupRuleIds.every(id => 
            document.querySelector(`.rule-card[data-rule-id="${id}"]`)?.classList.contains('selected')
        );
        
        if (allSelected) {
            // 如果已全选，则取消选中
            groupRuleIds.forEach(ruleId => {
                const card = document.querySelector(`.rule-card[data-rule-id="${ruleId}"]`);
                if (card) card.classList.remove('selected');
            });
        } else {
            // 否则选中该组所有规则
            groupRuleIds.forEach(ruleId => {
                const card = document.querySelector(`.rule-card[data-rule-id="${ruleId}"]`);
                if (card) card.classList.add('selected');
            });
        }
        
        const selectedCount = document.querySelectorAll('.rule-card.selected').length;
        if (selectedCount > 0) {
            showNotification(`已选中 ${selectedCount} 个规则`, 'success');
        }
        
        // 更新左侧文件夹选中状态
        updateSplitFolderSelectionState();
    } else {
        // 普通点击：切换文件夹视图
        if (previousFolder !== destination) {
            // 切换到不同文件夹时，清除所有选中状态
            document.querySelectorAll('.rule-card.selected').forEach(card => {
                card.classList.remove('selected');
            });
        }
        renderRules();
    }
}

// 为分栏视图的文件夹添加规则
window.addRuleToSplitFolder = function(destination, event) {
    // 阻止事件冒泡，防止触发文件夹选择
    if (event) {
        event.stopPropagation();
    }
    
    // 设置预设目标路径
    appState.presetDestination = destination;
    
    // 打开规则模态框
    openRuleModal();
}

// 应用规则到监控文件夹
window.applyRulesToFolder = function(destination, event) {
    // 阻止事件冒泡，防止触发文件夹选择
    if (event) {
        event.stopPropagation();
    }
    
    // 获取该目标文件夹的所有规则
    const rules = appState.rules.filter(r => (r.action.destination || '(未设置)') === destination);
    
    if (rules.length === 0) {
        showNotification('该文件夹没有规则', 'warning');
        return;
    }
    
    // 生成监控文件夹选择对话框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'applyRulesModal';
    modal.style.display = 'flex';
    
    const folderCheckboxes = appState.folders.map(folder => `
        <label class="checkbox-item">
            <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" value="${folder.id}" ${folder.rule_ids.some(id => rules.find(r => r.id === id)) ? 'checked' : ''}>
                <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 500;">${folder.name}</div>
                    <div style="font-size: 11px; color: #9ca3af;">${folder.path}</div>
                </div>
            </div>
        </label>
    `).join('');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>应用规则到监控文件夹</h3>
                <button class="btn-close" onclick="closeApplyRulesModal()">✕</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 16px; color: #6b7280;">
                    将 <strong style="color: #667eea;">${destination}</strong> 的 <strong>${rules.length}</strong> 个规则应用到以下监控文件夹：
                </p>
                <div style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                    ${folderCheckboxes}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="closeApplyRulesModal()">取消</button>
                <button class="btn-primary" onclick="confirmApplyRules('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')">应用</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// 关闭应用规则模态框
window.closeApplyRulesModal = function() {
    const modal = document.getElementById('applyRulesModal');
    if (modal) {
        modal.remove();
    }
}

// 确认应用规则
window.confirmApplyRules = async function(destination) {
    const modal = document.getElementById('applyRulesModal');
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        showNotification('请至少选择一个监控文件夹', 'warning');
        return;
    }
    
    const selectedFolderIds = Array.from(checkboxes).map(cb => cb.value);
    const rules = appState.rules.filter(r => (r.action.destination || '(未设置)') === destination);
    const ruleIds = rules.map(r => r.id);
    
    try {
        // 更新每个选中的监控文件夹
        for (const folderId of selectedFolderIds) {
            const folder = appState.folders.find(f => f.id === folderId);
            if (!folder) continue;
            
            // 合并规则ID，去重
            const newRuleIds = [...new Set([...folder.rule_ids, ...ruleIds])];
            
            await invoke('update_folder', {
                folderId: folderId,
                folderData: {
                    ...folder,
                    rule_ids: newRuleIds
                }
            });
        }
        
        showNotification(`已将 ${rules.length} 个规则应用到 ${selectedFolderIds.length} 个文件夹`, 'success');
        addActivity(`${t('activity.ruleApplied')} ${destination} ${rules.length} ${t('rules.rulesCount')}`);
        
        closeApplyRulesModal();
        await loadFolders();
        
    } catch (error) {
        console.error('应用规则失败:', error);
        showNotification(`应用规则失败: ${error}`, 'error');
    }
}

// 分栏视图中的规则排序
window.moveRuleSplitUp = async function(index) {
    // 按目标文件夹分组
    const groups = new Map();
    appState.rules.forEach(rule => {
        const dest = rule.action.destination || '(未设置)';
        if (!groups.has(dest)) {
            groups.set(dest, []);
        }
        groups.get(dest).push(rule);
    });
    
    const groupRules = groups.get(appState.selectedFolderId);
    if (!groupRules || index <= 0 || index >= groupRules.length) return;
    
    // 在全局规则列表中交换
    const rule1 = groupRules[index];
    const rule2 = groupRules[index - 1];
    const globalIdx1 = appState.rules.findIndex(r => r.id === rule1.id);
    const globalIdx2 = appState.rules.findIndex(r => r.id === rule2.id);
    
    const temp = appState.rules[globalIdx1];
    appState.rules[globalIdx1] = appState.rules[globalIdx2];
    appState.rules[globalIdx2] = temp;
    
    await saveRulesOrder();
    renderRules();
}

window.moveRuleSplitDown = async function(index) {
    // 按目标文件夹分组
    const groups = new Map();
    appState.rules.forEach(rule => {
        const dest = rule.action.destination || '(未设置)';
        if (!groups.has(dest)) {
            groups.set(dest, []);
        }
        groups.get(dest).push(rule);
    });
    
    const groupRules = groups.get(appState.selectedFolderId);
    if (!groupRules || index < 0 || index >= groupRules.length - 1) return;
    
    // 在全局规则列表中交换
    const rule1 = groupRules[index];
    const rule2 = groupRules[index + 1];
    const globalIdx1 = appState.rules.findIndex(r => r.id === rule1.id);
    const globalIdx2 = appState.rules.findIndex(r => r.id === rule2.id);
    
    const temp = appState.rules[globalIdx1];
    appState.rules[globalIdx1] = appState.rules[globalIdx2];
    appState.rules[globalIdx2] = temp;
    
    await saveRulesOrder();
    renderRules();
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
    
    addActivity(`${t('activity.ruleMovedUp')} [${temp.name}]`);
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
    
    addActivity(`${t('activity.ruleMovedDown')} [${temp.name}]`);
};

// 从文件夹移除关联规则
window.removeFolderRule = async function(ruleId) {
    if (!appState.editingFolderId) return;
    
    const rule = appState.rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    // 显示确认对话框
    if (!confirm(`确定要将规则"${rule.name}"从此文件夹的关联中移除吗？\n\n移除后，该规则将不再应用于此文件夹中的文件。\n规则本身不会被删除。`)) {
        return;
    }
    
    // 取消勾选对应的复选框
    const checkbox = document.querySelector(`#folderRules input[value="${ruleId}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    addActivity(`${t('activity.ruleUnlinked')} [${rule.name}]`, 'info');
    
    console.log(`[规则移除] 已取消关联规则: ${rule.name}`);
};

// 保存规则顺序到后端
async function saveRulesOrder() {
    try {
        const ruleIds = appState.rules.map(r => r.id);
        console.log(`[保存顺序] 当前规则数量: ${ruleIds.length}, IDs:`, ruleIds);
        await invoke('reorder_rules', { ruleIds });
        console.log('✓ 规则顺序已保存');
    } catch (error) {
        console.error(`保存规则顺序失败 (当前 ${appState.rules.length} 个规则):`, error);
        showNotification(`保存规则顺序失败: ${error}`, 'error');
    }
}

// ========== 文件夹管理函数 ==========
async function openFolderModal(folderId = null) {
    appState.editingFolderId = folderId;
    const modal = document.getElementById('folderModal');
    const title = document.getElementById('folderModalTitle');
    const form = document.getElementById('folderForm');
    
    // 更新模态框标题
    title.textContent = folderId ? t('folders.edit') : t('folders.add');
    
    // 更新所有表单标签
    const folderPathLabel = document.getElementById('folderPathLabel');
    if (folderPathLabel) folderPathLabel.innerHTML = t('folders.path') + ' <span class="required">*</span>';
    
    const folderNameLabel = document.getElementById('folderNameLabel');
    if (folderNameLabel) folderNameLabel.innerHTML = t('common.name') + ' <span class="required">*</span>';
    
    const folderRulesLabel = document.getElementById('folderRulesLabel');
    if (folderRulesLabel) folderRulesLabel.textContent = t('folders.associatedRules');
    
    const triggerModeLabel = document.getElementById('triggerModeLabel');
    if (triggerModeLabel) triggerModeLabel.textContent = t('folders.triggerMode');
    
    // 更新触发模式选项
    const triggerImmediateLabel = document.getElementById('triggerImmediateLabel');
    if (triggerImmediateLabel) triggerImmediateLabel.textContent = t('folders.triggerImmediate');
    
    const triggerImmediateDesc = document.getElementById('triggerImmediateDesc');
    if (triggerImmediateDesc) triggerImmediateDesc.textContent = t('folders.triggerImmediateDesc');
    
    const triggerManualLabel = document.getElementById('triggerManualLabel');
    if (triggerManualLabel) triggerManualLabel.textContent = '✋ ' + t('folders.triggerManual');
    
    const triggerManualDesc = document.getElementById('triggerManualDesc');
    if (triggerManualDesc) triggerManualDesc.textContent = t('folders.triggerManualDesc');
    
    const triggerStartupLabel = document.getElementById('triggerStartupLabel');
    if (triggerStartupLabel) triggerStartupLabel.textContent = t('folders.triggerStartup');
    
    const triggerStartupDesc = document.getElementById('triggerStartupDesc');
    if (triggerStartupDesc) triggerStartupDesc.textContent = t('folders.triggerStartupDesc');
    
    const triggerScheduledLabel = document.getElementById('triggerScheduledLabel');
    if (triggerScheduledLabel) triggerScheduledLabel.textContent = t('folders.triggerScheduled');
    
    const triggerScheduledDesc = document.getElementById('triggerScheduledDesc');
    if (triggerScheduledDesc) triggerScheduledDesc.textContent = t('folders.triggerScheduledDesc');
    
    const folderEnabledLabel = document.getElementById('folderEnabledLabel');
    if (folderEnabledLabel) folderEnabledLabel.textContent = t('folders.enableMonitoring');
    
    // 更新按钮
    const saveFolderBtn = document.getElementById('saveFolderBtn');
    if (saveFolderBtn) saveFolderBtn.textContent = t('common.save');
    
    const cancelFolderBtn = document.getElementById('cancelFolderBtn');
    if (cancelFolderBtn) cancelFolderBtn.textContent = t('common.cancel');
    
    const browseFolderBtn = document.getElementById('browseFolderBtn');
    if (browseFolderBtn) browseFolderBtn.textContent = t('common.select');
    
    // 更新输入框 placeholder
    const folderNameInput = document.getElementById('folderName');
    if (folderNameInput) folderNameInput.placeholder = t('folders.namePlaceholder');
    
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
        
        rulesCheckboxes.innerHTML = orderedRules.map((rule, index) => {
            const destPath = rule.action?.destination || '(未设置)';
            return `
            <div class="rule-sort-item" data-rule-id="${rule.id}" data-index="${index}">
                <label class="checkbox-label">
                    <input type="checkbox" value="${rule.id}" ${folderId && appState.folders.find(f => f.id === folderId)?.rule_ids.includes(rule.id) ? 'checked' : ''}>
                    <span>${rule.name} <span style="color: #999; font-size: 0.9em;">→ ${destPath}</span></span>
                </label>
                <div class="rule-item-actions">
                    <div class="rule-sort-buttons">
                        <button type="button" class="sort-btn" onclick="moveRuleUp(${index})" ${index === 0 ? 'disabled' : ''} title="上移">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button type="button" class="sort-btn" onclick="moveRuleDown(${index})" ${index === orderedRules.length - 1 ? 'disabled' : ''} title="下移">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <button type="button" class="rule-quick-edit-btn" onclick="event.preventDefault(); editRule('${rule.id}')" title="快速编辑规则">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 2L14 4.5L5.5 13H3V10.5L11.5 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button type="button" class="rule-delete-btn" onclick="event.preventDefault(); removeFolderRule('${rule.id}')" title="从文件夹移除">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        }).join('');
    }
    
    if (folderId) {
        // 编辑模式
        const folder = appState.folders.find(f => f.id === folderId);
        if (!folder) return;
        
        // title.textContent 已经在函数开头设置为翻译后的文本
        document.getElementById('folderPath').value = folder.path;
        document.getElementById('folderName').value = folder.name;
        document.getElementById('folderEnabled').checked = folder.enabled;
        
        // 设置触发模式（兼容旧版本）
        let triggerMode = folder.trigger_mode || 'manual';
        if (!folder.trigger_mode && folder.processing_mode) {
            triggerMode = folder.processing_mode === 'auto' ? 'immediate' : 'manual';
        }
        document.querySelector(`input[name="triggerMode"][value="${triggerMode}"]`).checked = true;
        
        // 显示/隐藏调度配置
        const scheduledConfig = document.getElementById('scheduledConfig');
        if (triggerMode === 'scheduled') {
            scheduledConfig.style.display = 'block';
            
            // 设置调度类型
            const scheduleType = folder.schedule_type || 'interval';
            document.querySelector(`input[name="scheduleType"][value="${scheduleType}"]`).checked = true;
            
            // 设置调度详细配置
            document.getElementById('intervalConfig').style.display = scheduleType === 'interval' ? 'block' : 'none';
            document.getElementById('dailyConfig').style.display = scheduleType === 'daily' ? 'block' : 'none';
            document.getElementById('weeklyConfig').style.display = scheduleType === 'weekly' ? 'block' : 'none';
            
            if (scheduleType === 'interval') {
                document.getElementById('scheduleInterval').value = folder.schedule_interval_minutes || 30;
            } else if (scheduleType === 'daily') {
                document.getElementById('scheduleDailyTime').value = folder.schedule_daily_time || '09:00';
            } else if (scheduleType === 'weekly') {
                document.getElementById('scheduleWeeklyDay').value = folder.schedule_weekly_day || 1;
                document.getElementById('scheduleWeeklyTime').value = folder.schedule_weekly_time || '09:00';
            }
        } else {
            scheduledConfig.style.display = 'none';
        }
    } else {
        // 新增模式
        // title.textContent 已经在函数开头设置为翻译后的文本
        document.querySelector('input[name="triggerMode"][value="manual"]').checked = true;
        document.getElementById('scheduledConfig').style.display = 'none';
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
    
    // 获取触发模式
    const triggerMode = document.querySelector('input[name="triggerMode"]:checked').value;
    
    // 构建文件夹对象
    const folderData = {
        path,
        name,
        enabled,
        trigger_mode: triggerMode
    };
    
    // 如果是定时执行，收集调度配置
    if (triggerMode === 'scheduled') {
        const scheduleType = document.querySelector('input[name="scheduleType"]:checked').value;
        folderData.schedule_type = scheduleType;
        
        if (scheduleType === 'interval') {
            folderData.schedule_interval_minutes = parseInt(document.getElementById('scheduleInterval').value);
        } else if (scheduleType === 'daily') {
            folderData.schedule_daily_time = document.getElementById('scheduleDailyTime').value;
        } else if (scheduleType === 'weekly') {
            folderData.schedule_weekly_day = parseInt(document.getElementById('scheduleWeeklyDay').value);
            folderData.schedule_weekly_time = document.getElementById('scheduleWeeklyTime').value;
        }
    }
    
    // 获取选中的规则（按照DOM顺序，体现排序结果）
    const allRuleItems = document.querySelectorAll('#folderRules .rule-sort-item');
    const ruleIds = Array.from(allRuleItems)
        .filter(item => item.querySelector('input[type="checkbox"]').checked)
        .map(item => item.getAttribute('data-rule-id'));
    
    const folder = {
        id: appState.editingFolderId || `folder_${Date.now()}`,
        ...folderData,
        rule_ids: ruleIds,
    };
    
    try {
        if (appState.editingFolderId) {
            await invoke('update_folder', { folderId: appState.editingFolderId, folder });
            showNotification(`文件夹 "${name}" 已更新`, 'success');
            addActivity(`${t('activity.folderUpdated')}: ${name}`);
        } else {
            await invoke('add_folder', { folder });
            showNotification(`文件夹 "${name}" 已添加`, 'success');
            addActivity(`${t('activity.folderAdded')}: ${name}`);
        }
        
        await loadFolders();
        closeFolderModal();
        updateStats();
        
        // 重新启动文件监控
        await startFileMonitoring();
    } catch (error) {
        console.error('保存文件夹失败:', error);
        showNotification(`保存失败: ${error}`, 'error');
    }
}

// 启动文件监控
async function startFileMonitoring() {
    try {
        // 检查是否有已启用的文件夹
        const enabledFolders = appState.folders.filter(f => f.enabled);
        if (enabledFolders.length === 0) {
            console.log('没有已启用的监控文件夹，跳过启动监控');
            return;
        }
        
        await invoke('start_monitoring');
        console.log(`✓ 文件监控已启动，监控 ${enabledFolders.length} 个文件夹`);
    } catch (error) {
        console.error('启动文件监控失败:', error);
        // 不显示错误通知，因为这是后台操作
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
            addActivity(`${folder.name} ${t('activity.folderMonitoring')}${newState ? t('activity.enabled') : t('activity.disabled')}`);
            
            // 重新启动文件监控以应用更改
            await startFileMonitoring();
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
        case 'name':
            container.innerHTML = `
                <input type="text" id="conditionInput" placeholder="输入文件名关键字" />
            `;
            break;
        case 'regex':
            container.innerHTML = `
                <input type="text" id="conditionInput" placeholder="输入正则表达式（如：^report_.*\\.pdf$）" />
                <div style="margin-top: 8px; padding: 10px; background: #f8f9fa; border-radius: 6px; font-size: 12px; color: #6b7280; line-height: 1.6;">
                    <strong style="color: #374151;">💡 正则捕获组使用说明：</strong><br>
                    <span style="color: #dc2626;">⚠️ 正则匹配的是<strong>包含扩展名</strong>的完整文件名</span><br><br>
                    
                    <strong style="color: #374151;">📌 两种使用模式：</strong><br>
                    <strong>模式1 - 只用正则</strong>（精确控制）<br>
                    • 正则：<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">^(\\d{4})-(\\d{2})-(\\d{2}).*\\.txt$</code><br>
                    • 扩展名：不填<br>
                    ✓ 适合需要精确匹配扩展名的场景<br><br>
                    
                    <strong>模式2 - 扩展名 + 简化正则</strong>（推荐）<br>
                    • 正则：<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">^(\\d{4})-(\\d{2})-(\\d{2}).*</code> ← 不用写扩展名<br>
                    • 扩展名：<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">txt, pdf, docx</code><br>
                    ✓ 适合同一规则适配多种扩展名<br><br>
                    
                    <strong>捕获组引用：</strong>使用 <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">$1</code>, <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">$2</code> 在目标路径中引用 <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px; color: #1f2937;">()</code> 捕获的内容
                </div>
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
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <select id="timeMode" style="flex: 1;">
                            <option value="relative">相对时间（最近N天）</option>
                            <option value="absolute">绝对时间（具体日期）</option>
                        </select>
                        <select id="timeComparison" style="flex: 1;">
                            <option value="before">在此之前</option>
                            <option value="after">在此之后</option>
                        </select>
                    </div>
                    
                    <!-- 相对时间选择 -->
                    <div id="relativeTimeContainer" style="display: flex; flex-direction: column; gap: 8px;">
                        <select id="timePreset" style="width: 100%;">
                            <option value="">自定义天数</option>
                            <option value="1">最近1天（24小时内）</option>
                            <option value="3">最近3天</option>
                            <option value="7">最近一周（7天）</option>
                            <option value="14">最近两周（14天）</option>
                            <option value="30">最近一个月（30天）</option>
                            <option value="90">最近三个月（90天）</option>
                            <option value="180">最近半年（180天）</option>
                            <option value="365">最近一年（365天）</option>
                        </select>
                        <input type="number" id="customDays" placeholder="或输入自定义天数" min="1" style="width: 100%;" />
                    </div>
                    
                    <!-- 绝对时间选择 -->
                    <div id="absoluteTimeContainer" style="display: none;">
                        <input type="datetime-local" id="absoluteDateTime" style="width: 100%;" />
                    </div>
                    
                    <p class="hint" style="margin: 0; font-size: 12px; color: #666;">
                        <strong>相对时间</strong>示例：<br>
                        • "最近7天 + 在此之后" = 最近7天内的文件<br>
                        • "30天 + 在此之前" = 30天前或更早的文件<br><br>
                        <strong>绝对时间</strong>示例：<br>
                        • "2024-01-01 + 在此之后" = 2024年1月1日之后的文件<br>
                        • "2023-12-31 23:59 + 在此之前" = 2023年及之前的文件
                    </p>
                </div>
            `;
            
            // 添加事件监听器
            const timeModeSelect = container.querySelector('#timeMode');
            const relativeContainer = container.querySelector('#relativeTimeContainer');
            const absoluteContainer = container.querySelector('#absoluteTimeContainer');
            const presetSelect = container.querySelector('#timePreset');
            const customInput = container.querySelector('#customDays');
            
            timeModeSelect.addEventListener('change', function() {
                if (this.value === 'relative') {
                    relativeContainer.style.display = 'flex';
                    absoluteContainer.style.display = 'none';
                } else {
                    relativeContainer.style.display = 'none';
                    absoluteContainer.style.display = 'block';
                }
            });
            
            presetSelect.addEventListener('change', function() {
                if (this.value) {
                    customInput.value = '';
                    customInput.disabled = true;
                } else {
                    customInput.disabled = false;
                }
            });
            
            customInput.addEventListener('input', function() {
                if (this.value) {
                    presetSelect.value = '';
                }
            });
            break;
    }
}

// 添加条件
function addCondition() {
    const type = document.getElementById('conditionType').value;
    
    // 检查是否已经添加了相同类型的条件（编辑模式除外）
    if (appState.editingConditionIndex < 0) {
        const typeMap = {
            'extension': 'Extension',
            'name': 'NameContains',
            'regex': 'NameRegex',
            'size': 'SizeRange',
            'created': ['CreatedTime', 'CreatedDaysAgo'],  // 兼容新旧条件类型
            'modified': ['ModifiedTime', 'ModifiedDaysAgo']  // 兼容新旧条件类型
        };
        
        const backendTypes = typeMap[type];
        
        let exists = false;
        if (Array.isArray(backendTypes)) {
            // 检查多个可能的类型（用于时间条件）
            exists = appState.currentConditions.some(cond => backendTypes.includes(cond.type));
        } else {
            // 检查单个类型
            exists = appState.currentConditions.some(cond => cond.type === backendTypes);
        }
        
        if (exists) {
            const typeName = {
                'extension': '扩展名',
                'name': '文件名包含',
                'regex': '正则表达式',
                'size': '文件大小',
                'created': '创建时间',
                'modified': '修改时间'
            }[type];
            showNotification(`"${typeName}"条件已存在，每种条件只能添加一次。\n请编辑现有条件或删除后重新添加。`, 'error');
            return;
        }
    }
    
    let condition = null;
    
    switch (type) {
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
        case 'created':
        case 'modified': {
            const timeMode = document.getElementById('timeMode').value;
            const timeComparison = document.getElementById('timeComparison').value;
            const timeLabel = type === 'created' ? '创建时间' : '修改时间';
            const conditionTypeName = type === 'created' ? 'CreatedTime' : 'ModifiedTime';
            const comparisonText = timeComparison === 'before' ? '之前' : '之后';
            
            let days = null;
            let datetime = null;
            let displayText = '';
            
            if (timeMode === 'relative') {
                // 相对时间
                const presetValue = document.getElementById('timePreset').value;
                const customValue = document.getElementById('customDays').value;
                
                if (presetValue) {
                    days = parseInt(presetValue);
                } else if (customValue) {
                    days = parseInt(customValue);
                } else {
                    showNotification('请选择预设时间或输入自定义天数', 'error');
                    return;
                }
                
                const dayText = days === 1 ? '1天（24小时）' : 
                               days === 7 ? '7天（一周）' : 
                               days === 30 ? '30天（一个月）' : 
                               `${days}天`;
                
                if (timeComparison === 'after') {
                    displayText = `${timeLabel}: 最近${dayText}内`;
                } else {
                    displayText = `${timeLabel}: ${dayText}前或更早`;
                }
            } else {
                // 绝对时间
                const datetimeValue = document.getElementById('absoluteDateTime').value;
                if (!datetimeValue) {
                    showNotification('请选择具体日期时间', 'error');
                    return;
                }
                
                // 转换为ISO 8601格式（RFC 3339）
                const localDatetime = new Date(datetimeValue);
                datetime = localDatetime.toISOString();
                
                const formattedDate = new Date(datetimeValue).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                displayText = `${timeLabel}: ${formattedDate}${comparisonText}`;
            }
            
            condition = {
                type: conditionTypeName,
                time_type: timeMode,
                comparison: timeComparison,
                days: days,
                datetime: datetime,
                displayText: displayText
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

// 删除条件的逻辑已移至 renderConditions() 中的事件监听器

// 编辑条件
function editCondition(index) {
    const condition = appState.currentConditions[index];
    appState.editingConditionIndex = index;
    
    // 根据条件类型设置下拉框
    const typeSelect = document.getElementById('conditionType');
    
    switch(condition.type) {
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
}

// 渲染条件列表
function renderConditions() {
    const container = document.getElementById('conditionsList');
    
    if (appState.currentConditions.length === 0) {
        container.innerHTML = '<div class="conditions-empty">暂无条件，请添加至少一个条件</div>';
        updateConditionTypeOptions();
        return;
    }
    
    container.innerHTML = appState.currentConditions.map((cond, index) => `
        <div class="condition-item ${appState.editingConditionIndex === index ? 'editing' : ''}" data-index="${index}">
            <div class="condition-content">
                <span class="condition-type">${getConditionTypeLabel(cond.type)}</span>
                <span class="condition-value">${cond.displayText}</span>
            </div>
            <div class="condition-actions">
                <button class="condition-edit" data-index="${index}" title="编辑">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="condition-remove" data-index="${index}" title="删除">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
    
    // 绑定编辑和删除按钮的事件监听器
    container.querySelectorAll('.condition-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            editCondition(index);
        });
    });
    
    container.querySelectorAll('.condition-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const index = parseInt(btn.dataset.index);
            console.log('Delete button clicked, index:', index);
            
            const condition = appState.currentConditions[index];
            if (!condition) {
                console.error('Condition not found at index:', index);
                return;
            }
            
            console.log('Condition to delete:', condition);
            
            try {
                // 显示删除确认模态框
                showDeleteConfirm({
                    type: 'condition',
                    index: index,
                    displayText: condition.displayText,
                    conditionType: getConditionTypeLabel(condition.type)
                });
                console.log('showDeleteConfirm called successfully');
            } catch (error) {
                console.error('Error calling showDeleteConfirm:', error);
                alert('删除确认窗口打开失败：' + error.message);
            }
        });
    });
    
    // 更新条件类型下拉列表，禁用已添加的条件类型
    updateConditionTypeOptions();
}

// 更新条件类型下拉列表，禁用已添加的条件类型
function updateConditionTypeOptions() {
    const typeSelect = document.getElementById('conditionType');
    if (!typeSelect) return;
    
    // 获取已添加的条件类型
    const addedTypes = new Set(appState.currentConditions.map(cond => {
        // 将后端类型映射到前端下拉框的value
        const typeMap = {
            'NameContains': 'name',
            'NameRegex': 'regex',
            'SizeRange': 'size',
            'CreatedDaysAgo': 'created',
            'ModifiedDaysAgo': 'modified'
        };
        return typeMap[cond.type];
    }));
    
    // 如果正在编辑某个条件，则允许选择该条件的类型
    if (appState.editingConditionIndex >= 0) {
        const editingType = appState.currentConditions[appState.editingConditionIndex].type;
        const typeMap = {
            'NameContains': 'name',
            'NameRegex': 'regex',
            'SizeRange': 'size',
            'CreatedDaysAgo': 'created',
            'ModifiedDaysAgo': 'modified'
        };
        addedTypes.delete(typeMap[editingType]);
    }
    
    // 遍历所有选项，禁用已添加的类型
    let currentValueDisabled = false;
    Array.from(typeSelect.options).forEach(option => {
        if (addedTypes.has(option.value)) {
            option.disabled = true;
            option.style.color = '#999';
            // 检查当前选中的选项是否被禁用
            if (typeSelect.value === option.value) {
                currentValueDisabled = true;
            }
        } else {
            option.disabled = false;
            option.style.color = '';
        }
    });
    
    // 如果当前选中的选项被禁用，自动切换到第一个可用的选项
    if (currentValueDisabled) {
        const firstAvailable = Array.from(typeSelect.options).find(opt => !opt.disabled);
        if (firstAvailable) {
            typeSelect.value = firstAvailable.value;
            updateConditionInputs(); // 更新输入框以匹配新选择的类型
        }
    }
}

// 获取条件类型标签
function getConditionTypeLabel(type) {
    const labels = {
        'Extension': '',
        'NameContains': '',
        'NameRegex': '',
        'SizeRange': '',
        'CreatedDaysAgo': '',
        'ModifiedDaysAgo': ''
    };
    return labels[type] || '';
}

// ========== 扩展名标签管理 ==========

// 切换扩展名启用/禁用状态
function toggleExtensionState() {
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    const extensionContainer = document.getElementById('extensionContainer');
    
    if (!enableExtensionsBtn || !extensionContainer) return;
    
    const isEnabled = enableExtensionsBtn.getAttribute('data-enabled') === 'true';
    const newState = !isEnabled;
    
    enableExtensionsBtn.setAttribute('data-enabled', newState);
    // 按钮文字与状态相反：启用时显示"禁用"，禁用时显示"启用"
    enableExtensionsBtn.textContent = newState ? t('rules.disableExtensions') : t('rules.enableExtensions');
    
    if (newState) {
        extensionContainer.classList.remove('disabled');
    } else {
        extensionContainer.classList.add('disabled');
    }
}

// 更新扩展名区域的启用/禁用状态
function updateExtensionState() {
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    const extensionContainer = document.getElementById('extensionContainer');
    
    if (!enableExtensionsBtn || !extensionContainer) return;
    
    const isEnabled = enableExtensionsBtn.getAttribute('data-enabled') === 'true';
    
    if (isEnabled) {
        extensionContainer.classList.remove('disabled');
    } else {
        extensionContainer.classList.add('disabled');
    }
}

// 根据应用范围自动更新扩展名的可用性
function updateExtensionAvailability() {
    const applyToFiles = document.getElementById('applyToFiles');
    const applyToFolders = document.getElementById('applyToFolders');
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    const extensionContainer = document.getElementById('extensionContainer');
    
    if (!applyToFiles || !applyToFolders || !enableExtensionsBtn || !extensionContainer) return;
    
    // 如果只勾选了文件夹（没有勾选文件），则禁用扩展名功能
    if (!applyToFiles.checked && applyToFolders.checked) {
        enableExtensionsBtn.setAttribute('data-enabled', 'false');
        enableExtensionsBtn.textContent = t('rules.enableExtensions'); // 禁用状态显示"启用"按钮
        enableExtensionsBtn.disabled = true;
        extensionContainer.classList.add('disabled');
    } else {
        // 如果勾选了文件，则允许启用扩展名
        enableExtensionsBtn.disabled = false;
        updateExtensionState();
    }
}

function renderExtensionTags() {
    const container = document.getElementById('extensionTags');
    if (!appState.currentExtensions || appState.currentExtensions.length === 0) {
        container.innerHTML = '<div style="color: #999; font-size: 12px;">暂无扩展名，请在下方输入添加</div>';
        return;
    }
    
    container.innerHTML = appState.currentExtensions.map(ext => `
        <div class="extension-tag">
            <span class="extension-tag-text">${ext}</span>
            <button class="extension-tag-remove" onclick="removeExtension('${ext}')" type="button">×</button>
        </div>
    `).join('');
}

function addExtension() {
    const input = document.getElementById('extensionInput');
    let extension = input.value.trim().toLowerCase();
    
    if (!extension) {
        showNotification('请输入扩展名', 'error');
        return;
    }
    
    // 移除开头的点号（如果有）
    extension = extension.replace(/^\.+/, '');
    
    // 验证扩展名（只允许字母、数字、横线）
    if (!/^[a-z0-9\-]+$/.test(extension)) {
        showNotification('扩展名只能包含字母、数字和横线', 'error');
        return;
    }
    
    // 检查是否已存在
    if (appState.currentExtensions.includes(extension)) {
        showNotification('该扩展名已添加', 'error');
        return;
    }
    
    // 添加扩展名
    appState.currentExtensions.push(extension);
    renderExtensionTags();
    
    // 清空输入框
    input.value = '';
    input.focus();
}

window.removeExtension = function(extension) {
    appState.currentExtensions = appState.currentExtensions.filter(ext => ext !== extension);
    renderExtensionTags();
};

// ========== 规则管理函数 ==========
async function openRuleModal(ruleId = null) {
    appState.editingRuleId = ruleId;
    appState.currentConditions = [];
    appState.currentExtensions = [];  // 重置扩展名列表
    appState.editingConditionIndex = -1; // 重置编辑状态
    
    const modal = document.getElementById('ruleModal');
    const title = document.getElementById('ruleModalTitle');
    const form = document.getElementById('ruleForm');
    
    form.reset();
    
    // 更新模态框标题和按钮文本（使用当前语言）
    title.textContent = ruleId ? t('rules.edit') : t('rules.add');
    document.getElementById('addConditionBtn').textContent = t('rules.addCondition');
    
    // 更新所有表单标签
    const ruleNameLabel = document.getElementById('ruleNameLabel');
    if (ruleNameLabel) ruleNameLabel.innerHTML = t('rules.name') + ' <span class="required">*</span>';
    
    const fileScopeLabel = document.getElementById('fileScopeLabel');
    if (fileScopeLabel) fileScopeLabel.textContent = t('rules.fileScope');
    
    const applyToFilesLabel = document.getElementById('applyToFilesLabel');
    if (applyToFilesLabel) applyToFilesLabel.textContent = t('rules.fileTypeFile');
    
    const applyToFoldersLabel = document.getElementById('applyToFoldersLabel');
    if (applyToFoldersLabel) applyToFoldersLabel.textContent = t('rules.fileTypeFolder');
    
    const fileExtensionsLabel = document.getElementById('fileExtensionsLabel');
    if (fileExtensionsLabel) fileExtensionsLabel.textContent = t('rules.fileExtensions');
    
    const otherConditionsLabel = document.getElementById('otherConditionsLabel');
    if (otherConditionsLabel) otherConditionsLabel.textContent = t('rules.otherConditions');
    
    const targetFolderLabel = document.getElementById('targetFolderLabel');
    if (targetFolderLabel) targetFolderLabel.innerHTML = t('rules.targetFolder') + ' <span class="required">*</span>';
    
    const conflictStrategyLabel = document.getElementById('conflictStrategyLabel');
    if (conflictStrategyLabel) conflictStrategyLabel.textContent = t('rules.conflictHandling');
    
    // 更新占位符标签
    const filePropsLabel = document.getElementById('filePropsLabel');
    if (filePropsLabel) filePropsLabel.textContent = t('rules.fileProperties');
    
    const dateTimeLabel = document.getElementById('dateTimeLabel');
    if (dateTimeLabel) dateTimeLabel.textContent = t('rules.dateTime');
    
    const regexCaptureLabel = document.getElementById('regexCaptureLabel');
    if (regexCaptureLabel) regexCaptureLabel.textContent = t('rules.regexCapture');
    
    const systemPathLabel = document.getElementById('systemPathLabel');
    if (systemPathLabel) systemPathLabel.textContent = t('rules.systemPath');
    
    const specialActionLabel = document.getElementById('specialActionLabel');
    if (specialActionLabel) specialActionLabel.textContent = t('rules.specialAction');
    
    // 更新按钮
    const saveRuleBtn = document.getElementById('saveRuleBtn');
    if (saveRuleBtn) saveRuleBtn.textContent = t('common.save');
    
    const cancelRuleBtn = document.getElementById('cancelRuleBtn');
    if (cancelRuleBtn) cancelRuleBtn.textContent = t('common.cancel');
    
    // 更新输入框 placeholder
    const ruleNameInput = document.getElementById('ruleName');
    if (ruleNameInput) ruleNameInput.placeholder = t('rules.namePlaceholder');
    
    const extensionInput = document.getElementById('extensionInput');
    if (extensionInput) extensionInput.placeholder = t('rules.extensionPlaceholder');
    
    const targetFolderInput = document.getElementById('targetFolder');
    if (targetFolderInput) targetFolderInput.placeholder = t('rules.targetFolderPlaceholder');
    
    // 更新启用/禁用扩展名按钮
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    if (enableExtensionsBtn) {
        const isEnabled = enableExtensionsBtn.dataset.enabled === 'true';
        enableExtensionsBtn.textContent = isEnabled ? t('rules.disableExtensions') : t('rules.enableExtensions');
    }
    
    // 更新冲突策略选项
    const conflictStrategySelect = document.getElementById('conflictStrategy');
    if (conflictStrategySelect) {
        conflictStrategySelect.options[0].textContent = t('rules.conflictSkip');
        conflictStrategySelect.options[1].textContent = t('rules.conflictReplace');
        conflictStrategySelect.options[2].textContent = t('rules.conflictRename');
    }
    
    // 更新条件类型选项
    const conditionTypeSelect = document.getElementById('conditionType');
    if (conditionTypeSelect) {
        conditionTypeSelect.options[0].textContent = t('rules.conditionNameContains');
        conditionTypeSelect.options[1].textContent = t('rules.conditionRegex');
        conditionTypeSelect.options[2].textContent = t('rules.conditionSize');
        conditionTypeSelect.options[3].textContent = t('rules.conditionCreated');
        conditionTypeSelect.options[4].textContent = t('rules.conditionModified');
    }
    
    // 重置复选框为默认状态（仅文件）
    document.getElementById('applyToFiles').checked = true;
    document.getElementById('applyToFolders').checked = false;
    
    if (ruleId) {
        // 编辑模式
        const rule = appState.rules.find(r => r.id === ruleId);
        if (!rule) return;
        document.getElementById('ruleName').value = rule.name;
        document.getElementById('targetFolder').value = rule.action.destination;
        
        // 设置文件冲突处理策略
        const conflictStrategy = rule.conflict_strategy || 'skip';
        document.getElementById('conflictStrategy').value = conflictStrategy;
        
        // 检查是否有 FileType 条件，并设置复选框
        const fileTypeCondition = rule.conditions.find(c => c.type === 'FileType');
        if (fileTypeCondition) {
            if (fileTypeCondition.file_type === 'file') {
                document.getElementById('applyToFiles').checked = true;
                document.getElementById('applyToFolders').checked = false;
            } else if (fileTypeCondition.file_type === 'folder') {
                document.getElementById('applyToFiles').checked = false;
                document.getElementById('applyToFolders').checked = true;
            } else if (fileTypeCondition.file_type === 'both') {
                document.getElementById('applyToFiles').checked = true;
                document.getElementById('applyToFolders').checked = true;
            }
        }
        
        // 加载现有条件（过滤掉 FileType 和 Extension 条件）
        // Extension现在由标签处理，FileType由复选框处理
        appState.currentConditions = rule.conditions
            .filter(cond => cond.type !== 'FileType' && cond.type !== 'Extension')
            .map(cond => {
            let displayText = '';
            if (cond.type === 'NameContains') {
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
        
        // 加载扩展名标签
        const extensionCondition = rule.conditions.find(c => c.type === 'Extension');
        if (extensionCondition && extensionCondition.values) {
            appState.currentExtensions = [...extensionCondition.values];
            const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
            if (enableExtensionsBtn) {
                enableExtensionsBtn.setAttribute('data-enabled', 'true');
                enableExtensionsBtn.textContent = t('rules.disableExtensions'); // 启用状态显示"禁用"按钮
            }
        } else {
            const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
            if (enableExtensionsBtn) {
                enableExtensionsBtn.setAttribute('data-enabled', 'false');
                enableExtensionsBtn.textContent = t('rules.enableExtensions'); // 禁用状态显示"启用"按钮
            }
        }
    } else {
        // 新增模式
        // title.textContent 已经在函数开头设置为翻译后的文本
        
        // 如果有预设的目标文件夹，填充到目标文件夹输入框
        if (appState.presetDestination) {
            document.getElementById('targetFolder').value = appState.presetDestination;
            appState.presetDestination = null; // 使用后清除
        }
    }
    
    // 初始化条件构建器和扩展名标签
    updateConditionInputs();
    renderConditions();
    renderExtensionTags();
    
    // 更新扩展名的可用性
    updateExtensionAvailability();
    updateExtensionState();
    
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
    
    // 检查文件类型复选框
    const applyToFiles = document.getElementById('applyToFiles').checked;
    const applyToFolders = document.getElementById('applyToFolders').checked;
    
    if (!applyToFiles && !applyToFolders) {
        showNotification('请至少选择应用到文件或文件夹', 'error');
        return;
    }
    
    if (appState.currentConditions.length === 0 && appState.currentExtensions.length === 0) {
        showNotification('请至少添加一个条件或扩展名', 'error');
        return;
    }
    
    // 将条件转换为后端格式（移除displayText）
    const conditions = appState.currentConditions.map(cond => {
        const { displayText, ...rest } = cond;
        return rest;
    });
    
    // 如果扩展名功能已启用且有扩展名，添加 Extension 条件
    const enableExtensionsBtn = document.getElementById('enableExtensionsBtn');
    const isExtensionEnabled = enableExtensionsBtn && enableExtensionsBtn.getAttribute('data-enabled') === 'true';
    if (isExtensionEnabled && appState.currentExtensions.length > 0) {
        conditions.push({
            type: 'Extension',
            values: [...appState.currentExtensions]
        });
    }
    
    // 根据复选框状态添加 FileType 条件
    let fileType;
    if (applyToFiles && applyToFolders) {
        fileType = 'both';
    } else if (applyToFiles) {
        fileType = 'file';
    } else {
        fileType = 'folder';
    }
    
    conditions.unshift({
        type: 'FileType',
        file_type: fileType
    });
    
    // 获取文件冲突处理策略
    const conflictStrategy = document.getElementById('conflictStrategy').value || 'skip';
    
    const rule = {
        id: appState.editingRuleId || `rule_${Date.now()}`,
        name,
        enabled: true,
        logic: "and", // 所有条件必须同时满足
        conditions: conditions,
        action: { type: 'MoveTo', destination: target },
        priority: 0,
        conflict_strategy: conflictStrategy,
    };
    
    try {
        if (appState.editingRuleId) {
            await invoke('update_rule', { ruleId: appState.editingRuleId, rule });
            showNotification(`规则 "${name}" 已更新`, 'success');
            addActivity(`${t('activity.ruleUpdated')}: ${name}`);
        } else {
            await invoke('add_rule', { rule });
            showNotification(`规则 "${name}" 已添加`, 'success');
            addActivity(`${t('activity.ruleAdded')}: ${name}`);
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
    console.log('showDeleteConfirm called with item:', item);
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    
    if (!modal || !message) {
        console.error('Delete confirm modal elements not found!');
        return;
    }
    
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
    } else if (item.type === 'group') {
        message.innerHTML = `
            确定要删除规则组 <strong style="color: #667eea;">"${item.destination || '(未设置)'}"</strong> 吗？
            <br><br>
            <span style="color: #666;">此操作将删除该组内的 <strong style="color: #e74c3c;">${item.ruleCount}</strong> 个规则</span>
            <br><br>
            <span style="color: #e74c3c; font-size: 13px;">⚠️ 组内所有规则都将被删除</span>
        `;
    } else if (item.type === 'condition') {
        message.innerHTML = `
            确定要删除此条件吗？
            <br><br>
            <span style="color: #666;">${item.conditionType} ${item.displayText}</span>
        `;
    } else if (item.type === 'clearLog') {
        message.innerHTML = `
            确定要清空日志记录吗？
            <br><br>
            <span style="color: #e74c3c; font-size: 13px;">⚠️ 此操作无法撤销，日志文件将被清空</span>
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
            addActivity(`${t('activity.ruleDeleted')}: ${item.name}`);
            await loadRules();
            await loadFolders(); // 重新加载文件夹以更新关联
        } else if (item.type === 'folder') {
            // 删除文件夹
            await invoke('remove_folder', { folderId: item.id });
            showNotification(`文件夹 "${item.name}" 已删除`, 'success');
            addActivity(`${t('activity.folderDeleted')}: ${item.name}`);
            await loadFolders();
        } else if (item.type === 'group') {
            // 删除规则组（删除组内所有规则）
            const rulesInGroup = appState.rules.filter(r => r.action.destination === item.destination);
            let deletedCount = 0;
            for (const rule of rulesInGroup) {
                try {
                    await invoke('remove_rule', { ruleId: rule.id });
                    deletedCount++;
                } catch (error) {
                    console.error(`删除规则 ${rule.name} 失败:`, error);
                }
            }
            showNotification(`规则组 "${item.destination || '(未设置)'}" 已删除（${deletedCount} 个规则）`, 'success');
            addActivity(`${t('activity.groupDeleted')} [${item.destination || '(未设置)'}] ${deletedCount} ${t('rules.rulesCount')}`);
            await loadRules();
            await loadFolders(); // 重新加载文件夹以更新关联
        } else if (item.type === 'condition') {
            // 删除条件（仅前端操作）
            appState.currentConditions.splice(item.index, 1);
            appState.editingConditionIndex = -1;
            document.getElementById('addConditionBtn').textContent = '添加条件';
            renderConditions();
            showNotification('条件已删除', 'success');
            closeDeleteConfirm();
            return; // 条件删除不需要更新后端统计
        } else if (item.type === 'clearLog') {
            // 清空日志
            await invoke('clear_activity_logs');
            
            // 清空前端显示
            const activityLog = document.getElementById('activityLog');
            activityLog.innerHTML = '<div class="activity-empty">活动日志已清空</div>';
            
            console.log('[活动日志] 日志已清空');
            
            // 添加一条清空记录
            addActivity(`${t('activity.logCleared')}`, 'info');
            showNotification('日志已清空', 'success');
            closeDeleteConfirm();
            return; // 清空日志不需要更新统计
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
        addActivity(`${rule.enabled ? '[' + t('activity.enabled') + ']' : '[' + t('activity.disabled') + ']'} ${t('activity.ruleStatusChanged')}: ${rule.name}`);
        
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
    const filesProcessedElement = document.getElementById('filesProcessedCount');
    const foldersCountElement = document.getElementById('foldersCount');
    const rulesCountElement = document.getElementById('rulesCount');
    
    if (filesProcessedElement) {
        filesProcessedElement.textContent = appState.filesProcessed;
        console.log('[统计] 更新已处理文件数:', appState.filesProcessed);
    }
    if (foldersCountElement) {
        foldersCountElement.textContent = appState.folders.filter(f => f.enabled).length;
    }
    if (rulesCountElement) {
        rulesCountElement.textContent = appState.rules.filter(r => r.enabled).length;
    }
}

// ========== 配置导入导出 ==========
async function exportConfig() {
    try {
        // 获取当前配置
        const config = await invoke('export_config');
        
        // 创建JSON文件
        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // 生成文件名（包含时间戳）
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = `floatsort-config-${timestamp}.json`;
        
        // 使用Tauri的save命令
        const { save } = window.__TAURI__.dialog;
        const filePath = await save({
            defaultPath: fileName,
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }]
        });
        
        if (filePath) {
            // 保存文件
            await invoke('save_file', { path: filePath, content: dataStr });
            showNotification('配置已导出', 'success');
            addActivity(`${t('activity.configExported')}: ${filePath}`);
        }
    } catch (error) {
        console.error('导出配置失败:', error);
        showNotification(`导出失败: ${error}`, 'error');
    }
}

async function importConfig() {
    try {
        // 打开文件选择对话框
        const { open } = window.__TAURI__.dialog;
        const selected = await open({
            multiple: false,
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }]
        });
        
        if (selected) {
            // 读取文件内容
            const content = await invoke('read_file', { path: selected });
            
            // 解析JSON
            const config = JSON.parse(content);
            
            // 导入配置
            await invoke('import_config', { config });
            
            showNotification('配置已导入，正在重新加载...', 'success');
            addActivity(`${t('activity.configImported')}: ${selected}`);
            
            // 重新加载所有数据
            setTimeout(async () => {
                await loadRules();    // 先加载规则
                await loadFolders();  // 再加载文件夹
                updateStats();
                await startFileMonitoring(); // 重新启动文件监控
                showNotification('配置导入完成', 'success');
            }, 1000);
        }
    } catch (error) {
        console.error('导入配置失败:', error);
        showNotification(`导入失败: ${error}`, 'error');
    }
}

// ========== 活动日志 ==========
// 加载活动日志
async function loadActivityLogs() {
    try {
        const logs = await invoke('get_activity_logs');
        const activityLog = document.getElementById('activityLog');
        
        if (!logs || logs.length === 0) {
            activityLog.innerHTML = '<div class="activity-empty">暂无活动记录</div>';
            return;
        }
        
        activityLog.innerHTML = logs.map(log => `
            <div class="activity-item">
                <div class="activity-log-line">${log}</div>
            </div>
        `).join('');
        
        // 滚动到底部
        activityLog.scrollTop = activityLog.scrollHeight;
    } catch (error) {
        console.error('加载活动日志失败:', error);
    }
}

function addActivity(message, type = 'info', details = null, customTime = null) {
    const activityLog = document.getElementById('activityLog');
    
    // 如果是空状态提示，先清空
    const emptyState = activityLog.querySelector('.activity-empty');
    if (emptyState) {
        activityLog.innerHTML = '';
    }
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    
    // 使用自定义时间或当前时间
    let timeStr;
    if (customTime) {
        timeStr = customTime;
    } else {
        const now = new Date();
        // 使用完整的时间戳格式: YYYY-MM-DD HH:MM:SS
        timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ` +
                        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }
    
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
    
    // 限制日志条目数量（保留最新的200条）
    while (activityLog.children.length > 200) {
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

// 保存文件稳定性设置
async function saveStabilitySettings() {
    try {
        await invoke('save_stability_settings', {
            fileStabilityDelay: appState.fileStabilityDelay,
            fileStabilityChecks: appState.fileStabilityChecks
        });
        console.log(`✓ 文件稳定性设置已保存: 延迟${appState.fileStabilityDelay}秒, ${appState.fileStabilityChecks}次检查`);
        
        // 重启文件监控以应用新设置
        await startFileMonitoring();
        showNotification(`文件稳定性设置已更新`, 'success');
    } catch (error) {
        console.error('保存文件稳定性设置失败:', error);
        showNotification('保存设置失败: ' + error, 'error');
    }
}

// 清空活动日志
async function clearActivity() {
    // 统计当前日志数量
    const activityLog = document.getElementById('activityLog');
    const activityItems = activityLog.querySelectorAll('.activity-item');
    const count = activityItems.length;
    
    if (count === 0) {
        showNotification('没有日志可清空', 'info');
        return;
    }
    
    // 使用自定义确认对话框
    showDeleteConfirm({
        type: 'clearLog'
    });
}

// 打开日志文件夹
async function openLogFolder() {
    try {
        await invoke('open_log_folder');
        console.log('✓ 日志文件夹已打开');
    } catch (error) {
        console.error('打开日志文件夹失败:', error);
        showNotification('打开日志文件夹失败: ' + error, 'error');
    }
    
    updateStats();
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 加载指定日期的日志
async function loadLogByDate(dateStr) {
    try {
        console.log(`[日志加载] 尝试加载日期: ${dateStr}`);
        const content = await invoke('read_log_by_date', { date: dateStr });
        console.log(`[日志加载] 接收到内容长度: ${content ? content.length : 0} 字节`);
        
        const activityLog = document.getElementById('activityLog');
        
        if (!content || content.trim().length === 0) {
            console.log(`[日志加载] 日志内容为空`);
            const today = formatDate(new Date());
            if (dateStr === today) {
                console.log(`[日志加载] 这是今天，显示默认消息`);
                activityLog.innerHTML = `<div class="activity-item">
                    <span class="activity-time">${t('activity.startup')}</span>
                    <span class="activity-message">${t('activity.appReady')}</span>
                </div>`;
            } else {
                console.log(`[日志加载] 历史日期 ${dateStr} 没有日志`);
                activityLog.innerHTML = `<div class="activity-empty">${dateStr} ${t('activity.noActivity')}</div>`;
            }
            return;
        }
        
        // 解析日志内容并显示
        const lines = content.trim().split('\n').filter(line => line.trim().length > 0);
        activityLog.innerHTML = '';
        
        let logCount = 0;
        for (const line of lines) {
            // 解析日志行：时间戳 + 级别 + 消息
            // 新格式: 2025-11-01 12:34:56  INFO 消息内容
            const timeMatch = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
            
            // 提取消息部分（去掉时间、级别、模块名）
            let message = line;
            if (line.includes('INFO')) {
                message = line.split('INFO')[1].trim();
            } else if (line.includes('WARN')) {
                message = line.split('WARN')[1].trim();
            } else if (line.includes('ERROR')) {
                message = line.split('ERROR')[1].trim();
            }
            
            // 去掉模块前缀（如 floatsort::file_monitor:）
            message = message.replace(/^[a-z_:]+:\s*/, '');
            
            if (timeMatch && message) {
                // 使用完整的日期时间：YYYY-MM-DD HH:MM:SS
                const timeStr = timeMatch[1]; // 保持完整格式 "2025-11-01 12:34:56"
                
                // 根据消息内容确定类型
                let type = 'info';
                if (message.includes('成功') || message.includes('完成')) type = 'success';
                else if (message.includes('错误') || message.includes('失败') || line.includes('ERROR')) type = 'error';
                else if (message.includes('警告') || line.includes('WARN')) type = 'warning';
                
                addActivity(message, type, '', timeStr);
                logCount++;
            }
        }
        
        console.log(`✓ 已加载 ${dateStr} 的日志，共 ${logCount} 条记录`);
        if (logCount === 0) {
            activityLog.innerHTML = `<div class="activity-empty">${dateStr} ${t('activity.noActivity')}</div>`;
        }
    } catch (error) {
        console.error('加载日志失败:', error);
        showNotification('加载日志失败: ' + error, 'error');
    }
}

// 显示上一天的日志
async function showPreviousDay() {
    const currentDate = appState.currentLogDate ? new Date(appState.currentLogDate) : new Date();
    currentDate.setDate(currentDate.getDate() - 1);
    appState.currentLogDate = formatDate(currentDate);
    
    document.getElementById('logDatePicker').value = appState.currentLogDate;
    await loadLogByDate(appState.currentLogDate);
}

// 显示下一天的日志
async function showNextDay() {
    const currentDate = appState.currentLogDate ? new Date(appState.currentLogDate) : new Date();
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);
    
    // 不能查看未来的日志
    if (nextDate > today) {
        showNotification('不能查看未来的日志', 'info');
        return;
    }
    
    appState.currentLogDate = formatDate(nextDate);
    document.getElementById('logDatePicker').value = appState.currentLogDate;
    await loadLogByDate(appState.currentLogDate);
}

// 显示今天的日志
async function showToday() {
    appState.currentLogDate = null;
    const today = formatDate(new Date());
    document.getElementById('logDatePicker').value = today;
    
    // 加载今天的日志文件内容
    console.log('正在加载今天的日志...');
    await loadLogByDate(today);
}

// 日期选择器变化事件
async function onDatePickerChange(e) {
    const selectedDate = e.target.value;
    if (!selectedDate) return;
    
    const today = formatDate(new Date());
    if (selectedDate === today) {
        await showToday();
    } else {
        appState.currentLogDate = selectedDate;
        await loadLogByDate(selectedDate);
    }
}

// 保存日志保留天数设置
async function saveLogRetentionSetting(e) {
    const retentionDays = parseInt(e.target.value);
    appState.logRetentionDays = retentionDays;
    
    try {
        await invoke('save_log_retention_setting', { retentionDays });
        console.log(`✓ 日志保留天数已保存: ${retentionDays}天`);
        showNotification(`日志保留天数已设置为 ${retentionDays === -1 ? '永久保留' : retentionDays + '天'}`, 'success');
        
        // 立即执行一次清理
        if (retentionDays > 0) {
            const removedCount = await invoke('cleanup_old_logs', { retentionDays });
            if (removedCount > 0) {
                console.log(`✓ 已清理 ${removedCount} 个过期日志文件`);
                showNotification(`已清理 ${removedCount} 个过期日志文件`, 'success');
            }
        }
    } catch (error) {
        console.error('保存日志保留天数设置失败:', error);
        showNotification('保存设置失败: ' + error, 'error');
    }
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

// ========== 文件夹操作 ==========

// 在系统文件管理器中打开文件夹
async function openFolderInExplorer(folderPath) {
    try {
        await invoke('open_folder', { path: folderPath });
    } catch (error) {
        console.error('打开文件夹失败:', error);
        showNotification('打开文件夹失败: ' + error, 'error');
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
        'info': '',
        'default': ''
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
        statusMessage.textContent = t('activity.ready');
        statusIcon.textContent = '';
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
            <div class="batch-section matched">
                <div class="batch-section-header matched">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#27ae60" stroke-width="2" fill="none"/>
                        <path d="M5 8L7 10L11 6" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="section-title">将被整理的文件</span>
                    <span class="section-count">${matchedFiles.length}</span>
                </div>
                <div class="batch-section-content">
                    ${matchedFiles.map((file, index) => {
                        // 提取源文件名
                        const sourceFileName = file.path.split(/[\\/]/).pop();
                        const sourcePath = file.path.substring(0, file.path.lastIndexOf(sourceFileName));
                        // 提取目标文件名
                        const targetFileName = file.targetPath.split(/[\\/]/).pop();
                        const targetPath = file.targetPath.substring(0, file.targetPath.lastIndexOf(targetFileName));
                        
                        return `
                        <div class="batch-file-item-compact-two-line" data-file-path="${file.path.replace(/"/g, '&quot;')}" data-file-index="${index}">
                            <div class="batch-file-status"></div>
                            <div class="batch-file-rule">${file.ruleName || '规则'}</div>
                            <div class="batch-file-paths">
                                <div class="batch-file-from">从: <span class="path-dir">${sourcePath}</span><span class="path-file">${sourceFileName}</span></div>
                                <div class="batch-file-to">到: <span class="path-dir">${targetPath}</span><span class="path-file">${targetFileName}</span></div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    // 未匹配的文件（按扩展名分组，紧凑显示）
    html += renderUnmatchedFilesGrouped(unmatchedFiles);
    
    list.innerHTML = html;
    
    addActivity(`批量整理确认 (匹配: ${matchedFiles.length}, 未匹配: ${unmatchedFiles.length})`);
}

function closeBatchModal() {
    document.getElementById('batchConfirmModal').style.display = 'none';
    // 取消整理，清空队列和选中的规则
    appState.pendingBatch = [];
    appState.selectedRuleId = null;
    appState.selectedRuleIds = null;
    appState.currentBatchFolderId = null;
    addActivity(`[${t('common.cancel')}] ${t('activity.cancelled')}`);
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
    
    // 保持文件列表显示，隐藏进度条
    document.getElementById('batchFileList').style.display = 'block';
    document.getElementById('batchProgress').style.display = 'none';
    
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
        
        // 找到对应的文件项元素（需要转义CSS选择器中的特殊字符）
        // 在CSS选择器中，反斜杠需要被转义为 \\
        const escapedPath = file.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const fileItem = document.querySelector(`[data-file-path="${escapedPath}"]`);
        const statusEl = fileItem?.querySelector('.batch-file-status');
        
        if (!fileItem) {
            console.warn('[批量整理] 找不到文件项:', file.path);
        }
        
        // 标记为正在处理
        if (statusEl) {
            statusEl.innerHTML = '<span style="color: #2196F3;">⏳</span>';
        }
        
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
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: #FF9800;" title="已处理过，跳过">⊘</span>';
                    fileItem?.classList.add('file-skipped');
                }
            } else if (result === '文件未匹配任何规则') {
                // 文件/文件夹未匹配任何规则，也算跳过
                skipCount++;
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: #FF9800;" title="未匹配任何规则">⊘</span>';
                    fileItem?.classList.add('file-skipped');
                }
            } else {
                // 成功处理（返回了新路径）
                successCount++;
                if (statusEl) {
                    statusEl.innerHTML = '<span style="color: #4CAF50;" title="整理成功">✓</span>';
                    fileItem?.classList.add('file-success');
                    
                    // 添加点击打开文件功能
                    const toPathEl = fileItem?.querySelector('.batch-file-to');
                    if (toPathEl && result) {
                        toPathEl.setAttribute('data-target-path', result);
                        toPathEl.style.cursor = 'pointer';
                        toPathEl.title = '点击打开文件';
                        toPathEl.addEventListener('click', async () => {
                            try {
                                await invoke('open_file_location', { path: result });
                                console.log('[批量整理] 打开文件:', result);
                            } catch (error) {
                                console.error('[批量整理] 打开文件失败:', error);
                                showNotification('打开文件失败: ' + error, 'error');
                            }
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`处理文件失败: ${file.name}`, error);
            addActivity(`❌ ${file.name} ${t('activity.fileFailed')}: ${error}`, 'error');
            failCount++;
            if (statusEl) {
                statusEl.innerHTML = '<span style="color: #F44336;" title="处理失败">✗</span>';
                fileItem?.classList.add('file-failed');
            }
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
    
    addActivity(`[${t('batch.title')}] ${t('activity.batchComplete')} - ${t('activity.success')}:${successCount} ${t('activity.skipped')}:${skipCount} ${t('activity.failed')}:${failCount}`);
    
    // 清除已处理的文件批次
    appState.pendingBatch = [];
    
    // 清除选中的规则ID(s)，但保留 currentBatchFolderId
    appState.selectedRuleId = null;
    appState.selectedRuleIds = null;
    // 注意：保留 currentBatchFolderId，以便新文件加入时窗口能自动刷新
    
    // 清除已处理文件对应的待处理队列
    for (const folderId in appState.pendingFilesByFolder) {
        const filePaths = files.map(f => f.path);
        appState.pendingFilesByFolder[folderId] = (appState.pendingFilesByFolder[folderId] || [])
            .filter(f => !filePaths.includes(f.path));
        // 如果队列为空，删除该键
        if (appState.pendingFilesByFolder[folderId].length === 0) {
            delete appState.pendingFilesByFolder[folderId];
        }
    }
    
    // 刷新界面
    await loadRules();    // 先加载规则
    await loadFolders();  // 再加载文件夹
    updateStats();
}

// ========== 窗口控制 ==========

// 最小化到托盘
async function minimizeToTray() {
    try {
        await invoke('hide_to_tray');
        addActivity(`${t('activity.windowMinimized')}`, 'info');
        showNotification('已最小化到托盘', 'info');
    } catch (error) {
        console.error('最小化到托盘失败:', error);
        showNotification('最小化失败', 'error');
    }
}

// 退出程序
async function exitProgram() {
    try {
        // 在退出前保存窗口状态
        const { appWindow } = window.__TAURI__.window;
        const position = await appWindow.outerPosition();
        
        await invoke('save_window_state', {
            x: position.x,
            y: position.y,
            isCollapsed: appState.collapsed,
            collapsedEdge: appState.lastCollapsedEdge
        });
        
        console.log('[退出] 窗口状态已保存');
        
        await invoke('exit_app');
    } catch (error) {
        console.error('退出程序失败:', error);
        showNotification('退出失败', 'error');
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
    
    addActivity(`[${t('activity.miniMode')}] ${t('activity.enterMini')}`);
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
        
        // 窗口大小调整完成后显示窗口（避免启动时闪烁）
        await appWindow.show();
        console.log('✓ 窗口已显示');
    } catch (error) {
        console.error('恢复窗口大小失败:', error);
        // 即使失败也要显示窗口
        try {
            await appWindow.show();
        } catch (showError) {
            console.error('显示窗口失败:', showError);
        }
    }
    
    // 重新启动位置监听
    startPositionMonitoring();
    
    addActivity(`[${t('activity.miniMode')}] ${t('activity.exitMini')}`);
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

// ========== 窗口折叠功能 ==========
function setupWindowSnap() {
    const indicatorTop = document.getElementById('snapIndicatorTop');
    const indicatorLeft = document.getElementById('snapIndicatorLeft');
    const indicatorRight = document.getElementById('snapIndicatorRight');
    const appHeader = document.querySelector('.app-header');
    
    console.log('[窗口折叠] setupWindowSnap 已调用');
    console.log('[窗口折叠] 标记线元素:', {
        top: indicatorTop,
        left: indicatorLeft,
        right: indicatorRight,
        header: appHeader
    });
    
    if (!appHeader) {
        console.error('[窗口折叠] 未找到 .app-header 元素');
        return;
    }
    
    let checkInterval = null;
    let tempExpandedTimer = null;
    
    // 使用 appState 存储拖拽状态，确保全局一致性
    appState.mouseDown = false;
    appState.isDraggingWindow = false;
    appState.dragStartPos = { x: 0, y: 0 };
    appState.windowStartPos = { x: 0, y: 0 };
    
    // 直接在标题栏上监听鼠标按下事件
    appHeader.addEventListener('mousedown', async (e) => {
        // 忽略按钮点击
        if (e.target.closest('button')) {
            return;
        }
        console.log('[窗口折叠] 检测到拖动标题栏');
        
        // 如果窗口处于折叠状态，理论上用户无法点击标题栏（因为太小了）
        // 但如果真的点到了，直接返回不处理
        if (appState.collapsed) {
            console.log('[窗口折叠] 窗口当前是折叠状态，无法拖拽');
            return;
        }
        
        appState.mouseDown = true;
        appState.isDraggingWindow = true;
        appState.isDragging = true; // 保持与其他拖动逻辑一致
        
        console.log('[窗口折叠] 设置拖拽状态: mouseDown=true, isDraggingWindow=true');
        
        // 清除临时展开状态（如果有）
        if (appState.tempExpanded) {
            console.log('[窗口折叠] 用户开始拖拽，清除临时展开状态');
            appState.tempExpanded = false;
            if (tempExpandedTimer) {
                clearTimeout(tempExpandedTimer);
                tempExpandedTimer = null;
            }
        }
        
        // 记录鼠标和窗口的初始位置
        appState.dragStartPos = { x: e.screenX, y: e.screenY };
        
        try {
            const { appWindow } = window.__TAURI__.window;
            const position = await appWindow.outerPosition();
            appState.windowStartPos = { x: position.x, y: position.y };
        } catch (error) {
            console.error('[窗口折叠] 获取窗口位置失败:', error);
            return;
        }
        
        startSnapCheck();
    });
    
    // 监听鼠标移动事件来拖动窗口
    document.addEventListener('mousemove', async (e) => {
        // 严格检查拖拽状态
        if (!appState.isDraggingWindow || !appState.mouseDown) {
            return;
        }
        
        try {
            const { appWindow } = window.__TAURI__.window;
            const deltaX = e.screenX - appState.dragStartPos.x;
            const deltaY = e.screenY - appState.dragStartPos.y;
            
            await appWindow.setPosition(new window.__TAURI__.window.PhysicalPosition(
                appState.windowStartPos.x + deltaX,
                appState.windowStartPos.y + deltaY
            ));
        } catch (error) {
            // 忽略拖拽过程中的错误
        }
    });
    
    // 监听全局鼠标松开事件
    document.addEventListener('mouseup', async () => {
        if (!appState.mouseDown) return; // 如果没有按下，不处理
        
        console.log('[窗口折叠] 鼠标松开, snapEdge:', appState.snapEdge);
        console.log('[窗口折叠] 重置所有拖拽状态');
        
        // 立即重置所有拖拽状态
        appState.mouseDown = false;
        appState.isDraggingWindow = false;
        appState.isDragging = false;
        
        stopSnapCheck();
        
        // 如果有准备折叠的边缘，执行折叠
        if (appState.snapEdge) {
            try {
                console.log('[窗口折叠] 调用 trigger_window_snap:', appState.snapEdge);
                await invoke('trigger_window_snap', { edge: appState.snapEdge });
                appState.collapsed = true;
                appState.tempExpanded = false; // 手动折叠后清除临时展开状态
                appState.lastCollapsedEdge = appState.snapEdge; // 记住折叠的边缘
                console.log(`[窗口折叠] 窗口已折叠到${appState.snapEdge}边缘`);
                
                // 保存折叠状态
                await invoke('save_window_state', {
                    x: null,
                    y: null,
                    isCollapsed: true,
                    collapsedEdge: appState.snapEdge
                });
            } catch (error) {
                console.error('[窗口折叠] 折叠窗口失败:', error);
            }
        }
        
        // 隐藏所有标记线
        indicatorTop.classList.remove('active');
        indicatorLeft.classList.remove('active');
        indicatorRight.classList.remove('active');
        appState.snapEdge = null;
    });
    
    // 开始检查窗口位置
    function startSnapCheck() {
        if (checkInterval) return;
        
        console.log('[窗口折叠] startSnapCheck 已启动');
        
        checkInterval = setInterval(async () => {
            if (!appState.mouseDown) {
                stopSnapCheck();
                return;
            }
            
            try {
                // 询问后端窗口是否接近边缘
                const result = await invoke('check_window_near_edge');
                console.log('[窗口折叠] check_window_near_edge 返回:', result);
                
                // 隐藏所有标记线
                indicatorTop.classList.remove('active');
                indicatorLeft.classList.remove('active');
                indicatorRight.classList.remove('active');
                appState.snapEdge = null;
                
                    // 根据结果显示对应的标记线
                    if (result === 'Top') {
                        console.log('[窗口折叠] 显示顶部标记线，设置 snapEdge = Top');
                        indicatorTop.classList.add('active');
                        appState.snapEdge = 'Top';
                    } else if (result === 'Left') {
                        console.log('[窗口折叠] 显示左侧标记线，设置 snapEdge = Left');
                        indicatorLeft.classList.add('active');
                        appState.snapEdge = 'Left';
                    } else if (result === 'Right') {
                        console.log('[窗口折叠] 显示右侧标记线，设置 snapEdge = Right');
                        indicatorRight.classList.add('active');
                        appState.snapEdge = 'Right';
                    }
                    console.log('[窗口折叠] 当前 snapEdge 状态:', appState.snapEdge);
            } catch (error) {
                console.error('[窗口折叠] check_window_near_edge 错误:', error);
            }
        }, 50); // 每50ms检查一次
    }
    
    // 停止检查
    function stopSnapCheck() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }
    
    // 监听展开事件（鼠标移到边缘时后端会触发）
    listen('window_expand', async () => {
        appState.collapsed = false;
        appState.tempExpanded = true; // 标记为临时展开
        console.log('[窗口折叠] 窗口已自动展开（临时状态）');
        
        // 临时展开不保存状态，只有用户主动操作才保存
    });
    
    // 鼠标进入窗口时，延迟清除临时展开状态
    // 如果用户只是快速查看（1秒内离开），窗口会自动折叠
    // 如果用户停留超过1秒，则认为是正常使用，不再自动折叠
    document.addEventListener('mouseenter', () => {
        if (appState.tempExpanded) {
            console.log('[窗口折叠] 鼠标进入窗口，1秒后清除临时展开状态');
            // 清除之前的定时器
            if (tempExpandedTimer) {
                clearTimeout(tempExpandedTimer);
            }
            // 1秒后清除临时展开状态
            tempExpandedTimer = setTimeout(() => {
                appState.tempExpanded = false;
                console.log('[窗口折叠] 停留超过1秒，清除临时展开状态，窗口变为正常状态');
            }, 1000);
        }
    });
    
    // 鼠标离开窗口自动折叠功能：只在临时展开状态时触发
    document.addEventListener('mouseleave', async () => {
        // 清除临时展开定时器
        if (tempExpandedTimer) {
            clearTimeout(tempExpandedTimer);
            tempExpandedTimer = null;
        }
        
        // 只有在临时展开状态下，鼠标离开才自动折叠
        if (!appState.tempExpanded) {
            console.log('[窗口折叠] 窗口不是临时展开状态，不自动折叠');
            return;
        }
        
        // 如果窗口已经折叠或正在拖动，不处理
        if (appState.collapsed || appState.windowDragging) {
            console.log('[窗口折叠] 跳过自动折叠:', { collapsed: appState.collapsed, dragging: appState.windowDragging });
            return;
        }
        
        // 立即折叠到上次折叠的边缘
        try {
            const edge = appState.lastCollapsedEdge || 'Top';
            console.log(`[窗口折叠] 临时展开窗口，鼠标离开，立即折叠到${edge}边缘`);
            await invoke('trigger_window_snap', { edge: edge });
            appState.collapsed = true;
            appState.tempExpanded = false; // 重置临时展开状态
            
            // 保存折叠状态
            await invoke('save_window_state', {
                x: null,
                y: null,
                isCollapsed: true,
                collapsedEdge: edge
            });
        } catch (error) {
            console.error('[窗口折叠] 自动折叠失败:', error);
        }
    });
}


