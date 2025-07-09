# 创建页面模块指南

本指南将教你如何创建和配置页面模块，实现基本功能。

## 📋 基本概念

页面模块是ModuleWebUI的核心组成部分，每个页面都是一个独立的模块，具有以下特点：

- **独立性** - 每个模块都是独立的，可以单独开发和维护
- **生命周期** - 完整的生命周期钩子函数
- **配置驱动** - 通过配置文件管理模块属性
- **国际化** - 内置多语言支持

## 🚀 快速开始

### 1. 创建模块文件

在 `src/pages/` 目录下创建新的模块文件：

```javascript
// src/pages/example.js
export const ExamplePage = {
    // 模块配置（由main.js注入）
    config: null,
    
    // 必需：渲染页面内容
    render() {
        return `
            <div class="page-content">
                <div class="page-header">
                    <h1 data-i18n="EXAMPLE_TITLE">示例页面</h1>
                    <p data-i18n="EXAMPLE_DESC">这是一个示例页面</p>
                </div>
                
                <div class="content-section">
                    <button id="example-btn" class="btn-primary">
                        <span class="material-symbols-rounded">star</span>
                        <span data-i18n="EXAMPLE_BUTTON">点击我</span>
                    </button>
                    
                    <div id="example-result" class="result-area"></div>
                </div>
            </div>
        `;
    },
    
    // 可选：模块初始化（仅首次加载时调用）
    async init(ui) {
        this.ui = ui;
        console.log('ExamplePage 模块初始化');
        return true; // 返回 false 表示初始化失败
    },
    
    // 可选：页面激活时调用
    async onActivate() {
        console.log('ExamplePage 激活');
        this.bindEvents();
    },
    
    // 可选：页面停用时调用
    async onDeactivate() {
        console.log('ExamplePage 停用');
        this.unbindEvents();
    },
    
    // 可选：DOM渲染完成后调用
    async afterRender() {
        console.log('ExamplePage DOM渲染完成');
        // 可以在这里进行DOM操作
    },
    
    // 事件绑定
    bindEvents() {
        const btn = document.getElementById('example-btn');
        if (btn) {
            btn.addEventListener('click', this.handleClick.bind(this));
        }
    },
    
    // 事件解绑
    unbindEvents() {
        const btn = document.getElementById('example-btn');
        if (btn) {
            btn.removeEventListener('click', this.handleClick.bind(this));
        }
    },
    
    // 事件处理
    handleClick() {
        const result = document.getElementById('example-result');
        if (result) {
            result.innerHTML = `<p>按钮被点击了！时间：${new Date().toLocaleString()}</p>`;
        }
    }
};
```

### 2. 注册模块配置

在 `src/main.js` 中添加模块配置：

```javascript
// 在 PAGE_MODULE_CONFIGS 对象中添加配置
const PAGE_MODULE_CONFIGS = {
    // ... 其他配置
    example: {
        id: 'example',
        name: '示例页面',
        icon: 'star',                    // Material Symbols 图标
        module: 'ExamplePage',           // 模块导出名称
        i18n_key: 'NAV_EXAMPLE',        // 国际化键名
        order: 5                        // 显示顺序
    }
};
```

### 3. 添加样式（可选）

在 `src/assets/css/pages/` 目录下创建样式文件：

```css
/* src/assets/css/pages/example.css */
.page-content .example-specific {
    /* 页面特定样式 */
}

.result-area {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--surface-variant);
    border-radius: 8px;
    min-height: 60px;
}
```

然后在 `src/main.js` 中导入样式：

```javascript
// 在样式导入部分添加
import '@assets/css/pages/example.css';
```

### 4. 添加国际化（可选）

在翻译文件中添加对应的翻译：

```json
// src/assets/translations/zh.json
{
    "NAV_EXAMPLE": "示例",
    "EXAMPLE_TITLE": "示例页面",
    "EXAMPLE_DESC": "这是一个示例页面，展示基本功能",
    "EXAMPLE_BUTTON": "点击我"
}
```

```json
// src/assets/translations/en.json
{
    "NAV_EXAMPLE": "Example",
    "EXAMPLE_TITLE": "Example Page",
    "EXAMPLE_DESC": "This is an example page showing basic functionality",
    "EXAMPLE_BUTTON": "Click Me"
}
```

## 🔧 模块生命周期

页面模块具有完整的生命周期，按以下顺序执行：

1. **模块加载** - 动态导入模块文件
2. **init()** - 模块初始化（仅首次加载）
3. **render()** - 渲染页面内容
4. **afterRender()** - DOM渲染完成
5. **onActivate()** - 页面激活
6. **onDeactivate()** - 页面停用（切换到其他页面时）

```javascript
export const MyPage = {
    // 1. 模块初始化（仅首次加载时调用）
    async init(ui) {
        this.ui = ui;
        // 初始化逻辑，如注册页面操作按钮
        this.registerActions();
        return true;
    },
    
    // 2. 渲染页面内容（每次导航到页面时调用）
    render() {
        return '<div>页面内容</div>';
    },
    
    // 3. DOM渲染完成后调用
    async afterRender() {
        // DOM操作，如绑定事件
        this.bindEvents();
    },
    
    // 4. 页面激活时调用
    async onActivate() {
        // 页面激活逻辑，如开始定时器
        this.startTimer();
    },
    
    // 5. 页面停用时调用
    async onDeactivate() {
        // 清理逻辑，如停止定时器
        this.stopTimer();
    }
};
```

## 🎯 最佳实践

### 1. 模块结构

```javascript
export const MyPage = {
    // 配置和状态
    config: null,
    ui: null,
    timer: null,
    
    // 生命周期方法
    async init(ui) { /* ... */ },
    render() { /* ... */ },
    async afterRender() { /* ... */ },
    async onActivate() { /* ... */ },
    async onDeactivate() { /* ... */ },
    
    // 页面操作
    registerActions() { /* ... */ },
    
    // 事件处理
    bindEvents() { /* ... */ },
    unbindEvents() { /* ... */ },
    
    // 业务逻辑
    loadData() { /* ... */ },
    updateUI() { /* ... */ }
};
```

### 2. 错误处理

```javascript
async onActivate() {
    try {
        await this.loadData();
        this.updateUI();
    } catch (error) {
        console.error('页面激活失败:', error);
        this.ui?.showError?.('加载失败', error.message);
    }
}
```

### 3. 资源清理

```javascript
async onDeactivate() {
    // 清理定时器
    if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
    }
    
    // 解绑事件
    this.unbindEvents();
    
    // 清理页面操作按钮
    this.ui?.clearPageActions?.(this.config?.id);
}
```

### 4. 国际化支持

```javascript
render() {
    return `
        <div class="page-content">
            <h1 data-i18n="MY_PAGE_TITLE">默认标题</h1>
            <p data-i18n="MY_PAGE_DESC">默认描述</p>
        </div>
    `;
}

// 动态翻译
updateUI() {
    const title = I18n?.translate?.('MY_PAGE_TITLE', '默认标题');
    document.getElementById('dynamic-title').textContent = title;
}
```

## 🔍 调试技巧

### 1. 生命周期调试

```javascript
export const MyPage = {
    async init(ui) {
        console.log('[MyPage] 初始化开始');
        // 初始化逻辑
        console.log('[MyPage] 初始化完成');
        return true;
    },
    
    async onActivate() {
        console.log('[MyPage] 页面激活');
    },
    
    async onDeactivate() {
        console.log('[MyPage] 页面停用');
    }
};
```

### 2. 模块状态检查

```javascript
// 在浏览器控制台中检查模块状态
console.log('当前页面:', window.app.router.currentPage);
console.log('页面模块:', window.app.router.pageModules);
console.log('模块缓存:', window.app.router.cache);
```

## 📝 注意事项

1. **模块名称** - 导出的模块名称必须与配置中的 `module` 字段一致
2. **生命周期** - `init()` 方法只在首次加载时调用，`render()` 每次导航都会调用
3. **事件清理** - 在 `onDeactivate()` 中清理所有事件监听器和定时器
4. **错误处理** - 所有异步操作都应该有适当的错误处理
5. **性能考虑** - 避免在 `render()` 中进行耗时操作

通过遵循这些指南，你可以创建功能完整、性能良好的页面模块。