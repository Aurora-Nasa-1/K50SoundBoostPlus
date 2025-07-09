# 高级API参考

本文档介绍ModuleWebUI提供的开发者API和高级功能。

## 🎯 核心API

### 应用实例访问

在页面模块中，可以通过以下方式访问应用功能：

```javascript
export const MyPage = {
    async init(ui) {
        // ui参数提供了UI管理功能
        this.ui = ui;
        
        // 通过ui访问应用实例
        this.app = ui.app;
        this.router = ui.router;
    }
};
```

### 主题控制

```javascript
// 在页面模块中控制主题
this.app.setTheme('dark')      // 设置为暗色主题
this.app.setTheme('light')     // 设置为亮色主题
this.app.toggleTheme()         // 切换主题

// 获取当前主题
const currentTheme = this.app.state.theme;
```

### 页面导航

```javascript
// 导航到其他页面
this.router.navigate('status');     // 导航到状态页面
this.router.navigate('logs');       // 导航到日志页面

// 获取当前页面
const currentPage = this.router.getCurrentPage();
```

## 🌍 国际化系统

在页面模块中使用多语言功能。

```javascript
// 基本翻译
const text = I18n.translate('BUTTON_SAVE', '保存');  // 翻译文本，提供默认值
const title = I18n.translate('PAGE_TITLE', '页面标题');

// 在页面模块中使用
export const MyPage = {
    render() {
        return `
            <h1>${I18n.translate('MY_PAGE_TITLE', '我的页面')}</h1>
            <button>${I18n.translate('BUTTON_REFRESH', '刷新')}</button>
        `;
    }
};

// 监听语言变化事件
document.addEventListener('languageChanged', () => {
    // 语言切换时重新渲染页面内容
    this.updateContent();
});
```

## 📦 模块配置管理

页面模块的配置管理功能。

```javascript
// 导入配置管理函数
import { 
    getPageModuleConfig,
    getAllPageModuleConfigs,
    getOrderedModuleNames,
    addPageModuleConfig,
    removePageModuleConfig
} from './main.js';

// 获取配置
const config = getPageModuleConfig('status');  // 获取单个模块配置
const allConfigs = getAllPageModuleConfigs();   // 获取所有模块配置
const orderedNames = getOrderedModuleNames();   // 获取排序后的模块名

// 动态添加模块
const success = addPageModuleConfig('newPage', {
    id: 'newPage',
    name: '新页面',
    icon: 'new_releases',
    module: 'NewPage',
    i18n_key: 'NAV_NEW_PAGE',
    order: 10
});

// 移除模块
const removed = removePageModuleConfig('oldPage');
```

## 🎨 页面操作按钮

为页面添加操作按钮。

```javascript
export const MyPage = {
    async init(ui) {
        this.ui = ui;
    },
    
    async onActivate() {
        // 注册页面操作按钮
        this.ui.registerPageActions(this.config.id, [
            {
                id: 'refresh-btn',
                icon: 'refresh',                // Material Symbols图标
                title: '刷新数据',               // 悬停提示
                onClick: 'handleRefresh'        // 点击处理方法名
            },
            {
                id: 'export-btn',
                icon: 'download',
                title: '导出数据',
                onClick: 'handleExport'
            }
        ]);
    },
    
    // 实现点击处理方法
    handleRefresh() {
        console.log('刷新按钮被点击');
        this.loadData();
    },
    
    handleExport() {
        console.log('导出按钮被点击');
    },
    
    async onDeactivate() {
        // 清理操作按钮
        this.ui.clearPageActions(this.config.id);
    }
};
```

## 🔧 模态框组件

在页面模块中使用模态框。

```javascript
import { Modal } from '@components/modal.js';

export const MyPage = {
    showConfirmDialog() {
        // 确认对话框
        Modal.confirm({
            title: '确认删除',
            message: '确定要删除这个项目吗？',
            onConfirm: () => {
                this.deleteItem();
            },
            onCancel: () => {
                console.log('用户取消删除');
            }
        });
    },
    
    showAlert() {
        // 警告对话框
        Modal.alert({
            title: '警告',
            message: '操作无法撤销！'
        });
    },
    
    showCustomModal() {
        // 自定义模态框
        const modal = Modal.show({
            title: '设置',
            content: `
                <div class="settings-form">
                    <label>名称：</label>
                    <input type="text" id="name-input" placeholder="输入名称" />
                </div>
            `,
            buttons: [
                {
                    text: '保存',
                    type: 'primary',
                    onClick: () => {
                        const input = modal.element.querySelector('#name-input');
                        this.saveName(input.value);
                        modal.hide();
                    }
                },
                {
                    text: '取消',
                    type: 'text',
                    onClick: () => modal.hide()
                }
            ]
        });
    }
};
```

## 🎯 事件系统

在页面模块中使用事件。

```javascript
export const MyPage = {
    async onActivate() {
        // 监听语言变化事件
        document.addEventListener('languageChanged', this.handleLanguageChange.bind(this));
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
    },
    
    handleLanguageChange() {
        // 语言切换时重新渲染内容
        this.updateContent();
    },
    
    handleResize() {
        // 窗口大小变化时调整布局
        this.adjustLayout();
    },
    
    // 触发自定义事件
    notifyDataUpdate(data) {
        const event = new CustomEvent('dataUpdated', {
            detail: { data }
        });
        document.dispatchEvent(event);
    },
    
    async onDeactivate() {
        // 清理事件监听器
        document.removeEventListener('languageChanged', this.handleLanguageChange);
        window.removeEventListener('resize', this.handleResize);
    }
};
```

## 🔍 开发工具

开发模式下的调试功能。

```javascript
export const MyPage = {
    async init(ui) {
        this.ui = ui;
        
        // 开发模式下的调试信息
        if (import.meta.env.DEV) {
            console.log('MyPage 初始化完成');
        }
    },
    
    // 性能监控示例
    async loadData() {
        const startTime = performance.now();
        
        try {
            const data = await this.fetchData();
            
            if (import.meta.env.DEV) {
                const endTime = performance.now();
                console.log(`数据加载耗时: ${endTime - startTime}ms`);
            }
            
            return data;
        } catch (error) {
            console.error('数据加载失败:', error);
        }
    }
};
```

## 📱 响应式设计

在页面模块中处理不同屏幕尺寸。

```javascript
export const MyPage = {
    async onActivate() {
        // 初始化时检查屏幕尺寸
        this.updateLayout();
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
    },
    
    updateLayout() {
        const isLandscape = window.innerWidth >= 768;
        const container = document.getElementById('page-content');
        
        if (isLandscape) {
            // 桌面端布局
            container.classList.add('desktop-layout');
            container.classList.remove('mobile-layout');
        } else {
            // 移动端布局
            container.classList.add('mobile-layout');
            container.classList.remove('desktop-layout');
        }
    },
    
    handleResize() {
        this.updateLayout();
    },
    
    async onDeactivate() {
        window.removeEventListener('resize', this.handleResize);
    }
};
```

通过这些API，你可以创建功能丰富的页面模块，充分利用ModuleWebUI的模块化架构。