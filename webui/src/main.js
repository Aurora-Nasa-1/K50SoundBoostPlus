import { app } from './app.js';
import { I18n } from './i18n.js';

// 使用Vite的静态资源导入 - 基础样式
import '@assets/css/base.css';
import '@assets/css/md3.css';
import '@assets/css/components.css';
import '@assets/css/style.css';
import '@assets/css/animations.css';
import '@assets/css/mmrl-compat.css';

// 页面样式
import '@assets/css/pages/status.css';
import '@assets/css/pages/logs.css';
import '@assets/css/pages/settings.css';
import '@assets/css/pages/about.css';

class LoadingManager {
    static ready = { dom: false, app: false };
    
    static check() {
        if (this.ready.dom && this.ready.app) {
            const loading = document.getElementById('loading-screen');
            if (loading) {
                loading.style.opacity = '0';
                setTimeout(() => loading.remove(), 300);
            }
            document.body.classList.add('app-loaded');
        }
    }
    
    static mark(type) {
        this.ready[type] = true;
        this.check();
    }
}

// 页面模块配置管理 - 集中管理所有页面模块的基础配置
const PAGE_MODULE_CONFIGS = {
    status: {
        id: 'status',
        name: '状态',
        icon: 'dashboard',
        module: 'StatusPage',
        i18n_key: 'NAV_STATUS',
        order: 1
    },
    logs: {
        id: 'logs',
        name: '日志',
        icon: 'article',
        module: 'LogsPage',
        i18n_key: 'NAV_LOGS',
        order: 2
    },
    settings: {
        id: 'settings',
        name: '设置',
        icon: 'settings',
        module: 'SettingsPage',
        i18n_key: 'NAV_SETTINGS',
        order: 3
    },
    about: {
        id: 'about',
        name: '关于',
        icon: 'info',
        module: 'AboutPage',
        i18n_key: 'NAV_ABOUT',
        order: 4
    }
};

// 获取页面模块配置
export const getPageModuleConfig = (moduleId) => {
    return PAGE_MODULE_CONFIGS[moduleId] || null;
};

// 获取所有页面模块配置
export const getAllPageModuleConfigs = () => {
    return { ...PAGE_MODULE_CONFIGS };
};

// 获取按顺序排列的模块名称
export const getOrderedModuleNames = () => {
    return Object.keys(PAGE_MODULE_CONFIGS).sort((a, b) => {
        return PAGE_MODULE_CONFIGS[a].order - PAGE_MODULE_CONFIGS[b].order;
    });
};

// 添加新的页面模块配置（用于开发者扩展）
export const addPageModuleConfig = (moduleId, config) => {
    if (!moduleId || !config) {
        console.error('添加页面模块配置失败：moduleId和config参数不能为空');
        return false;
    }
    
    if (PAGE_MODULE_CONFIGS[moduleId]) {
        console.warn(`页面模块 ${moduleId} 已存在，将被覆盖`);
    }
    
    // 确保配置包含必要的字段
    const requiredFields = ['id', 'name', 'icon', 'module'];
    for (const field of requiredFields) {
        if (!config[field]) {
            console.error(`添加页面模块配置失败：缺少必要字段 ${field}`);
            return false;
        }
    }
    
    // 设置默认值
    const moduleConfig = {
        order: Object.keys(PAGE_MODULE_CONFIGS).length + 1,
        i18n_key: `NAV_${moduleId.toUpperCase()}`,
        ...config,
        id: moduleId // 确保id与moduleId一致
    };
    
    PAGE_MODULE_CONFIGS[moduleId] = moduleConfig;
    console.log(`页面模块 ${moduleId} 配置已添加`);
    return true;
};

// 移除页面模块配置
export const removePageModuleConfig = (moduleId) => {
    if (!moduleId || !PAGE_MODULE_CONFIGS[moduleId]) {
        console.error(`移除页面模块配置失败：模块 ${moduleId} 不存在`);
        return false;
    }
    
    delete PAGE_MODULE_CONFIGS[moduleId];
    console.log(`页面模块 ${moduleId} 配置已移除`);
    return true;
};

// 使用Vite的动态导入优化模块加载
const moduleCache = new Map();
const moduleLoadingPromises = new Map();

const loadModules = async () => {
    const moduleNames = getOrderedModuleNames();
    
    // 创建模块加载函数，带缓存机制
    const loadModule = async (name) => {
        if (moduleCache.has(name)) {
            return moduleCache.get(name);
        }
        
        if (moduleLoadingPromises.has(name)) {
            return await moduleLoadingPromises.get(name);
        }
        
        // 使用Vite的动态导入，支持代码分割和预加载
        const promise = import(/* webpackChunkName: "[request]" */ `@pages/${name}.js`);
        moduleLoadingPromises.set(name, promise);
        
        try {
            const module = await promise;
            moduleCache.set(name, module);
            moduleLoadingPromises.delete(name);
            return module;
        } catch (error) {
            moduleLoadingPromises.delete(name);
            throw error;
        }
    };
    
    // 并行加载所有模块
    const modulePromises = moduleNames.map(name => loadModule(name));
    const moduleResults = await Promise.allSettled(modulePromises);
    
    // 创建模块映射对象
    const modules = {};
    
    moduleResults.forEach((result, index) => {
        const name = moduleNames[index];
        const config = PAGE_MODULE_CONFIGS[name];
        if (result.status === 'fulfilled' && config) {
            const moduleInstance = result.value[config.module];
            if (moduleInstance) {
                // 将配置注入到模块实例中
                moduleInstance.config = config;
                modules[name] = moduleInstance;
            }
        } else {
            console.warn(`模块 ${name} 加载失败:`, result.reason);
        }
    });
    
    return modules;
};

const init = async () => {
    try {
        // 环境检测和MMRL WebUI X初始化
        const { Core } = await import('./core.js');
        const env = Core.getEnvironment();
        
        // 为body添加环境标识类
        document.body.classList.add(`env-${env}`);
        if (env === 'mmrl') {
            document.body.classList.add('mmrl-webui');
        }
        
        // 输出环境信息到控制台
        console.log('AMMF WebUI Environment:', Core.getEnvironmentInfo());
        
        const i18nPromise = I18n?.init?.() || Promise.resolve();
        const modulesPromise = loadModules();
        
        // 获取模块，立即初始化app
        const modules = await modulesPromise;
        await app.init(modules, i18nPromise);
        
        LoadingManager.mark('app');
    } catch (error) {
        console.error('Init failed:', error);
        document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:system-ui;"><h2 style="color:#d32f2f;margin-bottom:1rem;">加载失败</h2><p style="color:#666;margin-bottom:2rem;">${error.message}</p><button onclick="location.reload()" style="padding:0.75rem 1.5rem;background:#1976d2;color:white;border:none;border-radius:4px;cursor:pointer;">重新加载</button></div>`;
        LoadingManager.mark('app');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    LoadingManager.mark('dom');
    document.body.classList.add('app-loaded');
});

init();

setTimeout(() => {
    if (!document.body.classList.contains('app-loaded')) {
        document.body.classList.add('app-loaded');
        const loading = document.getElementById('loading-screen');
        if (loading) loading.remove();
    }
}, 2000);
