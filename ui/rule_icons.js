// 规则图标管理功能

// 初始化图标选择器
function initIconPicker() {
    const iconSelector = document.getElementById('ruleIconSelector');
    const colorPicker = document.getElementById('ruleColorPicker');
    const iconPreview = document.getElementById('ruleIconPreview');
    
    if (!iconSelector || !colorPicker || !iconPreview) return;
    
    // 点击图标选择器打开图标选择窗口
    iconSelector.addEventListener('click', openIconPicker);
    
    // 颜色选择器变化
    colorPicker.addEventListener('change', (e) => {
        appState.selectedColor = e.target.value;
        iconPreview.style.color = e.target.value;
    });
    
    // Ctrl+V 粘贴SVG
    iconSelector.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        
        // 检查是否是SVG代码
        if (pastedText.trim().startsWith('<svg')) {
            appState.selectedIconSvg = pastedText;
            appState.selectedIcon = null;  // 清除bootstrap图标类
            
            // 在预览中显示SVG
            iconPreview.outerHTML = `<div id="ruleIconPreview" style="color: ${appState.selectedColor};">${pastedText}</div>`;
            
            showNotification('SVG图标已设置', 'success');
        } else {
            showNotification('请粘贴有效的SVG代码', 'error');
        }
    });
    
    // 让div可以获得焦点以接收paste事件
    iconSelector.setAttribute('tabindex', '0');
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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    initIconPicker();
});

