// 规则图标管理功能

// 初始化图标选择器
function initIconPicker() {
    const iconSelector = document.getElementById('ruleIconSelector');
    const colorPicker = document.getElementById('ruleColorPicker');
    const iconPreview = document.getElementById('ruleIconPreview');
    
    if (!iconSelector || !colorPicker || !iconPreview) return;
    
    // 左键点击图标选择器打开图标选择窗口
    iconSelector.addEventListener('click', (e) => {
        if (e.button === 0) {  // 左键
            openIconPicker();
        }
    });
    
    // 颜色选择器变化
    colorPicker.addEventListener('change', (e) => {
        appState.selectedColor = e.target.value;
        iconPreview.style.color = e.target.value;
    });
    
    // 让div可以获得焦点以接收paste事件
    iconSelector.setAttribute('tabindex', '0');
    iconSelector.setAttribute('contenteditable', 'false');
    
    // Ctrl+V 粘贴SVG
    iconSelector.addEventListener('paste', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const pastedText = e.clipboardData.getData('text');
        
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
    
    // 右键菜单
    iconSelector.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showIconContextMenu(e.clientX, e.clientY);
    });
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
        <div class="context-menu-item" onclick="pasteFromClipboard()">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M5.5 2A1.5 1.5 0 0 0 4 3.5v9A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 10.5 2h-5z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M6 1h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            粘贴 SVG (Ctrl+V)
        </div>
        <div class="context-menu-item" onclick="openIconPicker(); closeIconContextMenu();">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M8 5v3M8 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            从图标库选择
        </div>
        <div class="context-menu-item" onclick="resetToDefaultIcon(); closeIconContextMenu();">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2a6 6 0 0 0-6 6h2a4 4 0 0 1 4-4V2z" fill="currentColor"/>
                <path d="M2 8a6 6 0 0 0 6 6v-2a4 4 0 0 1-4-4H2z" fill="currentColor"/>
            </svg>
            恢复默认图标
        </div>
    `;
    
    document.body.appendChild(menu);
    
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
    }
    document.removeEventListener('click', closeIconContextMenu);
}

// 从剪贴板粘贴
window.pasteFromClipboard = async function() {
    closeIconContextMenu();
    
    try {
        const text = await navigator.clipboard.readText();
        
        if (text.trim().startsWith('<svg')) {
            appState.selectedIconSvg = text;
            appState.selectedIcon = null;
            
            const preview = document.getElementById('ruleIconPreview');
            if (preview) {
                preview.outerHTML = `<div id="ruleIconPreview" style="color: ${appState.selectedColor};">${text}</div>`;
            }
            
            showNotification('✅ SVG图标已设置', 'success');
        } else {
            showNotification('❌ 剪贴板中不是有效的SVG代码', 'error');
        }
    } catch (error) {
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

