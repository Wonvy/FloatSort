// 规则图标管理功能

// 初始化图标选择器
window.initIconPicker = function() {
    const iconSelector = document.getElementById('ruleIconSelector');
    const colorPicker = document.getElementById('ruleColorPicker');
    const iconPreview = document.getElementById('ruleIconPreview');
    
    if (!iconSelector || !colorPicker || !iconPreview) {
        console.warn('[图标选择器] 元素未找到，跳过初始化');
        return;
    }
    
    console.log('[图标选择器] 开始初始化事件监听器');
    
    // 移除旧的事件监听器（通过克隆节点）
    const newIconSelector = iconSelector.cloneNode(true);
    iconSelector.parentNode.replaceChild(newIconSelector, iconSelector);
    const iconSelectorFresh = document.getElementById('ruleIconSelector');
    
    // 让div可以获得焦点以接收paste事件
    iconSelectorFresh.setAttribute('tabindex', '0');
    iconSelectorFresh.style.outline = 'none';
    
    // 左键点击图标选择器打开图标选择窗口
    iconSelectorFresh.addEventListener('click', (e) => {
        console.log('[图标选择器] 点击事件触发');
        openIconPicker();
        iconSelectorFresh.focus();  // 聚焦以便接收粘贴
    });
    
    // 颜色选择器变化
    colorPicker.addEventListener('change', (e) => {
        appState.selectedColor = e.target.value;
        const preview = document.getElementById('ruleIconPreview');
        if (preview) {
            preview.style.color = e.target.value;
        }
    });
    
    // Ctrl+V 粘贴SVG
    iconSelectorFresh.addEventListener('paste', (e) => {
        console.log('[图标选择器] 粘贴事件触发');
        e.preventDefault();
        e.stopPropagation();
        
        const pastedText = e.clipboardData.getData('text');
        console.log('[图标选择器] 粘贴内容:', pastedText.substring(0, 50));
        
        // 检查是否是SVG代码
        if (pastedText.trim().startsWith('<svg')) {
            appState.selectedIconSvg = pastedText;
            appState.selectedIcon = null;  // 清除bootstrap图标类
            
            // 在预览中显示SVG
            const preview = document.getElementById('ruleIconPreview');
            if (preview) {
                preview.outerHTML = `<div id="ruleIconPreview" style="color: ${appState.selectedColor};">${pastedText}</div>`;
            }
            
            showNotification('✅ SVG图标已设置', 'success');
        } else {
            showNotification('❌ 请粘贴有效的SVG代码（以<svg开头）', 'error');
        }
    });
    
    // 键盘事件支持 Ctrl+V
    iconSelectorFresh.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            console.log('[图标选择器] Ctrl+V 按键检测');
        }
    });
    
    // 右键菜单
    iconSelectorFresh.addEventListener('contextmenu', (e) => {
        console.log('[图标选择器] 右键菜单触发');
        e.preventDefault();
        e.stopPropagation();
        showIconContextMenu(e.clientX, e.clientY);
    });
    
    console.log('[图标选择器] 初始化完成');
}

// 打开图标选择器
function openIconPicker() {
    const modal = document.getElementById('iconPickerModal');
    const iconGrid = document.getElementById('iconGrid');
    const searchInput = document.getElementById('iconSearchInput');
    
    if (!modal) return;
    
    // 渲染图标网格
    renderIconGrid(BOOTSTRAP_ICONS);
    
    // 搜索功能
    searchInput.value = '';
    searchInput.oninput = (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = BOOTSTRAP_ICONS.filter(icon => 
            icon.toLowerCase().includes(keyword)
        );
        renderIconGrid(filtered);
    };
    
    modal.style.display = 'flex';
}

// 关闭图标选择器
window.closeIconPicker = function() {
    const modal = document.getElementById('iconPickerModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 渲染图标网格
function renderIconGrid(icons) {
    const iconGrid = document.getElementById('iconGrid');
    if (!iconGrid) return;
    
    iconGrid.innerHTML = icons.map(icon => `
        <div class="icon-grid-item" onclick="selectIcon('bi bi-${icon}')" title="${icon}">
            <i class="bi bi-${icon}"></i>
        </div>
    `).join('');
}

// 选择图标
window.selectIcon = function(iconClass) {
    appState.selectedIcon = iconClass;
    appState.selectedIconSvg = null;  // 清除自定义SVG
    
    const iconPreview = document.getElementById('ruleIconPreview');
    if (iconPreview) {
        iconPreview.outerHTML = `<i class="bi ${iconClass}" id="ruleIconPreview" style="color: ${appState.selectedColor};"></i>`;
    }
    
    closeIconPicker();
}

// 在打开规则编辑窗口时加载图标和颜色
window.loadRuleIconAndColor = function(rule) {
    if (!rule) {
        // 新建规则，使用默认值
        appState.selectedIcon = 'bi bi-file-earmark';
        appState.selectedIconSvg = null;
        appState.selectedColor = '#667eea';
    } else {
        // 编辑规则，加载现有值
        appState.selectedIcon = rule.icon || 'bi bi-file-earmark';
        appState.selectedIconSvg = rule.icon_svg || null;
        appState.selectedColor = rule.color || '#667eea';
    }
    
    // 更新UI
    const iconPreview = document.getElementById('ruleIconPreview');
    const colorPicker = document.getElementById('ruleColorPicker');
    
    if (iconPreview && colorPicker) {
        colorPicker.value = appState.selectedColor;
        
        if (appState.selectedIconSvg) {
            // 显示自定义SVG
            iconPreview.outerHTML = `<div id="ruleIconPreview" style="color: ${appState.selectedColor};">${appState.selectedIconSvg}</div>`;
        } else {
            // 显示bootstrap图标
            iconPreview.outerHTML = `<i class="${appState.selectedIcon}" id="ruleIconPreview" style="color: ${appState.selectedColor};"></i>`;
        }
    }
    
    // 重新初始化图标选择器（重新绑定事件）
    setTimeout(() => {
        initIconPicker();
    }, 100);
}

// 获取当前图标和颜色信息
window.getRuleIconData = function() {
    return {
        icon: appState.selectedIcon,
        icon_svg: appState.selectedIconSvg,
        color: appState.selectedColor
    };
}

// 渲染规则图标（用于规则列表）
window.renderRuleIcon = function(rule) {
    const color = rule.color || '#667eea';
    
    if (rule.icon_svg) {
        // 自定义SVG
        return `<div class="rule-icon-display" style="background: ${color}20;">${rule.icon_svg}</div>`;
    } else {
        // Bootstrap图标
        const iconClass = rule.icon || 'bi bi-file-earmark';
        return `<div class="rule-icon-display" style="background: ${color}20;"><i class="${iconClass}" style="color: ${color};"></i></div>`;
    }
}

// 显示图标右键菜单
function showIconContextMenu(x, y) {
    console.log('[右键菜单] 显示菜单在位置:', x, y);
    
    // 移除已存在的菜单
    const existingMenu = document.getElementById('iconContextMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    // 创建菜单
    const menu = document.createElement('div');
    menu.id = 'iconContextMenu';
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    menu.innerHTML = `
        <div class="context-menu-item" onclick="pasteFromClipboard(); event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M5.5 2A1.5 1.5 0 0 0 4 3.5v9A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 10.5 2h-5z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 1h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            粘贴 SVG (Ctrl+V)
        </div>
        <div class="context-menu-item" onclick="openIconPicker(); closeIconContextMenu(); event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M8 5v3M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            从图标库选择
        </div>
        <div class="context-menu-item" onclick="resetToDefaultIcon(); closeIconContextMenu(); event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2a6 6 0 0 0-6 6h2a4 4 0 0 1 4-4V2z" fill="currentColor"/>
                <path d="M2 8a6 6 0 0 0 6 6v-2a4 4 0 0 1-4-4H2z" fill="currentColor"/>
            </svg>
            恢复默认图标
        </div>
    `;
    
    document.body.appendChild(menu);
    console.log('[右键菜单] 菜单已添加到页面');
    
    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', closeIconContextMenu);
    }, 0);
}

// 关闭右键菜单
function closeIconContextMenu() {
    const menu = document.getElementById('iconContextMenu');
    if (menu) {
        menu.remove();
        console.log('[右键菜单] 菜单已关闭');
    }
    document.removeEventListener('click', closeIconContextMenu);
}

// 从剪贴板粘贴
window.pasteFromClipboard = async function() {
    console.log('[粘贴功能] 开始从剪贴板读取');
    closeIconContextMenu();
    
    try {
        const text = await navigator.clipboard.readText();
        console.log('[粘贴功能] 读取到文本:', text.substring(0, 100));
        
        if (text.trim().startsWith('<svg')) {
            appState.selectedIconSvg = text;
            appState.selectedIcon = null;
            
            const preview = document.getElementById('ruleIconPreview');
            if (preview) {
                preview.outerHTML = `<div id="ruleIconPreview" style="color: ${appState.selectedColor};">${text}</div>`;
            }
            
            showNotification('✅ SVG图标已设置', 'success');
            console.log('[粘贴功能] SVG图标设置成功');
        } else {
            showNotification('❌ 剪贴板中不是有效的SVG代码', 'error');
            console.warn('[粘贴功能] 无效的SVG代码');
        }
    } catch (error) {
        console.error('[粘贴功能] 读取剪贴板失败:', error);
        showNotification('❌ 无法读取剪贴板: ' + error.message, 'error');
    }
}

// 恢复默认图标
window.resetToDefaultIcon = function() {
    appState.selectedIcon = 'bi bi-file-earmark';
    appState.selectedIconSvg = null;
    
    const preview = document.getElementById('ruleIconPreview');
    if (preview) {
        preview.outerHTML = `<i class="bi bi-file-earmark" id="ruleIconPreview" style="color: ${appState.selectedColor};"></i>`;
    }
    
    showNotification('✅ 已恢复默认图标', 'success');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initIconPicker();
});

