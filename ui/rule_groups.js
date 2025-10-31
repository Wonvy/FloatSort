// FloatSort - 规则分组功能模块

// 渲染分组后的规则列表
function renderRulesGrouped() {
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
    
    // 按目标文件夹分组
    const groups = new Map();
    appState.rules.forEach(rule => {
        const dest = rule.action.destination || '';
        if (!groups.has(dest)) {
            groups.set(dest, { rules: [], enabled: true });
        }
        groups.get(dest).rules.push(rule);
        if (!rule.enabled) {
            groups.get(dest).enabled = false;
        }
    });
    
    // 将分组转为数组
    const groupArray = Array.from(groups.entries()).map(([dest, data]) => ({
        destination: dest,
        rules: data.rules,
        allEnabled: data.enabled && data.rules.every(r => r.enabled),
        someEnabled: data.rules.some(r => r.enabled),
    }));
    
    // 渲染分组
    rulesList.innerHTML = groupArray.map((group, groupIndex) => {
        const isCollapsed = appState.collapsedGroups.has(group.destination);
        const destination = group.destination;
        const isRecycleBin = destination === '{recycle}';
        const isAbsolutePath = /^[A-Z]:\\/i.test(destination);
        let displayPath = destination || '(未设置)';
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
            } else {
                displayPath = `${destination}`;
            }
        } else if (destination) {
            // 相对路径处理
            const parts = destination.split(/[\\/]/);
            if (parts.length > 1) {
                // 多层相对路径：显示为 ..\完整路径（如 ..\文档\数据）
                displayPath = `..\\${destination}`;
            } else {
                // 单层相对路径：显示为 ...\名称（如 ...\图片）
                displayPath = `...\\${destination}`;
            }
        }
        
        // 渲染组头
        let html = `
            <div class="rule-group" data-destination="${destination}" data-group-index="${groupIndex}">
                <div class="rule-group-header ${!group.someEnabled ? 'disabled' : ''}">
                    <button class="group-collapse-btn" onclick="toggleGroupCollapse('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" title="${isCollapsed ? '展开' : '折叠'}">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" class="${isCollapsed ? '' : 'expanded'}">
                            <path d="M6 4L10 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="group-info">
                        <span class="group-destination" style="color: ${iconColor};" title="${destination}">${displayPath}</span>
                        <span class="group-count">${group.rules.length} 个规则</span>
                    </div>
                    <button class="btn-icon btn-sm group-add-rule" onclick="addRuleToGroup('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', event)" title="添加规则到此分组">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <div class="group-order-controls">
                        <button class="order-btn order-left" onclick="moveGroupUp(${groupIndex})" ${groupIndex === 0 ? 'disabled' : ''} title="上移组">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                        <button class="order-btn order-right" onclick="moveGroupDown(${groupIndex})" ${groupIndex === groupArray.length - 1 ? 'disabled' : ''} title="下移组">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <div class="group-actions">
                        <button class="btn-icon btn-sm" onclick="deleteGroup('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', ${groupIndex})" title="删除组">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M3 4H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M5 4V3C5 2.5 5.5 2 6 2H10C10.5 2 11 2.5 11 3V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M5 4V13C5 13.5 5.5 14 6 14H10C10.5 14 11 13.5 11 13V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M7 7V11M9 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                    <button class="rule-toggle ${group.allEnabled ? 'active' : (group.someEnabled ? 'partial' : '')}" 
                            onclick="toggleGroup('${destination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" 
                            title="${group.allEnabled ? '全部禁用' : '全部启用'}">
                    </button>
                </div>
                <div class="rule-group-content ${isCollapsed ? 'collapsed' : ''}">
        `;
        
        // 渲染组内规则
        html += group.rules.map((rule, ruleIndex) => {
            return renderRuleInGroup(rule, ruleIndex, group.rules.length, destination);
        }).join('');
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }).join('');
    
    // 为规则卡片添加点击选择事件监听
    setupRuleSelection();
}

// 渲染组内的单个规则
function renderRuleInGroup(rule, ruleIndexInGroup, totalInGroup, groupDestination) {
    const globalIndex = appState.rules.findIndex(r => r.id === rule.id);
    const usedByFolders = appState.folders.filter(f => f.rule_ids.includes(rule.id));
    const condition = rule.conditions && rule.conditions.length > 0 ? rule.conditions[0] : null;
    let conditionText = '';
    
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
    
    return `
        <div class="rule-card compact in-group ${!rule.enabled ? 'disabled' : ''}" data-rule-id="${rule.id}" data-index="${globalIndex}" title="${fullConditionTooltip}">
            <span class="rule-order-number">${globalIndex + 1}</span>
            <div class="rule-name-col">
                <div class="rule-name">${rule.name}</div>
            </div>
            <div class="rule-condition-col" title="${fullConditionTooltip}">
                <div class="rule-condition-label">条件</div>
                <div class="rule-condition-value">${conditionText}</div>
            </div>
            <div class="rule-usage" title="${folderNames}">
                <span class="usage-badge">${usedByFolders.length}</span>
                <span class="usage-text">个文件夹</span>
            </div>
            <div class="rule-order-controls">
                <button class="order-btn order-left" onclick="moveRuleUpInGroup('${rule.id}', '${groupDestination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")})"  ${ruleIndexInGroup === 0 ? 'disabled' : ''} title="上移">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M4 10L8 6L12 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <button class="order-btn order-right" onclick="moveRuleDownInGroup('${rule.id}', '${groupDestination.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" ${ruleIndexInGroup === totalInGroup - 1 ? 'disabled' : ''} title="下移">
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
}

// ========== 分组操作函数 ==========

// 折叠/展开组
window.toggleGroupCollapse = function(destination) {
    if (appState.collapsedGroups.has(destination)) {
        appState.collapsedGroups.delete(destination);
    } else {
        appState.collapsedGroups.add(destination);
    }
    renderRulesGrouped();
};

// 切换组的启用/禁用状态
window.toggleGroup = async function(destination) {
    const rulesInGroup = appState.rules.filter(r => r.action.destination === destination);
    const allEnabled = rulesInGroup.every(r => r.enabled);
    
    // 如果全部启用，则全部禁用；否则全部启用
    const newState = !allEnabled;
    
    // 更新规则状态并批量保存
    for (const rule of rulesInGroup) {
        rule.enabled = newState;
        try {
            await invoke('update_rule', { ruleId: rule.id, rule });
        } catch (error) {
            console.error(`更新规则 ${rule.name} 失败:`, error);
        }
    }
    
    // 重新加载规则以确保状态同步
    await loadRules();
    addActivity(`${newState ? '✅ 启用' : '❌ 禁用'}组 [${destination || '(未设置)'}] 的所有规则`);
};

// 删除整个组
window.deleteGroup = function(destination, groupIndex) {
    const rulesInGroup = appState.rules.filter(r => r.action.destination === destination);
    
    // 显示删除确认模态框
    showDeleteConfirm({
        type: 'group',
        destination: destination,
        ruleCount: rulesInGroup.length
    });
};

// 上移组
window.moveGroupUp = async function(groupIndex) {
    if (groupIndex <= 0) return;
    
    // 获取所有组
    const groups = getGroupedRules();
    if (groupIndex >= groups.length) return;
    
    // 交换两个组
    const currentGroup = groups[groupIndex];
    const prevGroup = groups[groupIndex - 1];
    
    // 重新排列规则数组
    const newRules = [];
    groups.forEach((group, index) => {
        if (index === groupIndex - 1) {
            newRules.push(...currentGroup.rules);
        } else if (index === groupIndex) {
            newRules.push(...prevGroup.rules);
        } else {
            newRules.push(...group.rules);
        }
    });
    
    appState.rules = newRules;
    await saveRulesOrder();
    renderRulesGrouped();
    
    addActivity(`↑ 组 [${currentGroup.destination || '(未设置)'}] 已上移`);
};

// 下移组
window.moveGroupDown = async function(groupIndex) {
    const groups = getGroupedRules();
    if (groupIndex < 0 || groupIndex >= groups.length - 1) return;
    
    // 交换两个组
    const currentGroup = groups[groupIndex];
    const nextGroup = groups[groupIndex + 1];
    
    // 重新排列规则数组
    const newRules = [];
    groups.forEach((group, index) => {
        if (index === groupIndex) {
            newRules.push(...nextGroup.rules);
        } else if (index === groupIndex + 1) {
            newRules.push(...currentGroup.rules);
        } else {
            newRules.push(...group.rules);
        }
    });
    
    appState.rules = newRules;
    await saveRulesOrder();
    renderRulesGrouped();
    
    addActivity(`↓ 组 [${currentGroup.destination || '(未设置)'}] 已下移`);
};

// 在组内上移规则
window.moveRuleUpInGroup = async function(ruleId, groupDestination) {
    const rulesInGroup = appState.rules.filter(r => r.action.destination === groupDestination);
    const ruleIndexInGroup = rulesInGroup.findIndex(r => r.id === ruleId);
    
    if (ruleIndexInGroup <= 0) return;
    
    // 找到全局索引
    const globalIndex = appState.rules.findIndex(r => r.id === ruleId);
    const prevGlobalIndex = appState.rules.findIndex(r => r.id === rulesInGroup[ruleIndexInGroup - 1].id);
    
    // 交换
    const temp = appState.rules[globalIndex];
    appState.rules[globalIndex] = appState.rules[prevGlobalIndex];
    appState.rules[prevGlobalIndex] = temp;
    
    await saveRulesOrder();
    renderRulesGrouped();
    
    addActivity(`↑ 规则 [${temp.name}] 已上移`);
};

// 在组内下移规则
window.moveRuleDownInGroup = async function(ruleId, groupDestination) {
    const rulesInGroup = appState.rules.filter(r => r.action.destination === groupDestination);
    const ruleIndexInGroup = rulesInGroup.findIndex(r => r.id === ruleId);
    
    if (ruleIndexInGroup < 0 || ruleIndexInGroup >= rulesInGroup.length - 1) return;
    
    // 找到全局索引
    const globalIndex = appState.rules.findIndex(r => r.id === ruleId);
    const nextGlobalIndex = appState.rules.findIndex(r => r.id === rulesInGroup[ruleIndexInGroup + 1].id);
    
    // 交换
    const temp = appState.rules[globalIndex];
    appState.rules[globalIndex] = appState.rules[nextGlobalIndex];
    appState.rules[nextGlobalIndex] = temp;
    
    await saveRulesOrder();
    renderRulesGrouped();
    
    addActivity(`↓ 规则 [${temp.name}] 已下移`);
};

// 获取分组后的规则
function getGroupedRules() {
    const groups = new Map();
    appState.rules.forEach(rule => {
        const dest = rule.action.destination || '';
        if (!groups.has(dest)) {
            groups.set(dest, { destination: dest, rules: [] });
        }
        groups.get(dest).rules.push(rule);
    });
    return Array.from(groups.values());
}

// 为分组添加规则
window.addRuleToGroup = function(destination, event) {
    // 阻止事件冒泡，防止触发折叠/展开
    if (event) {
        event.stopPropagation();
    }
    
    // 设置预设目标路径
    appState.presetDestination = destination;
    
    // 打开规则模态框
    openRuleModal();
}

