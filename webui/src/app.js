import { I18n } from './i18n.js';
import { Modal } from '@components/modal.js';
import { getAllPageModuleConfigs, getOrderedModuleNames } from './main.js';

export class App {
    constructor() {
        this.state = { currentPage: null, theme: 'light', config: null, isLoading: true };
        this.cache = new Map();
        this.preloadCache = new Map();
        this.overlayManager = new OverlayManager();
        this.preloadQueue = [];
        this.isPreloading = false;
        window.addEventListener('language-changed', () => this.cache.clear());
    }

    initTheme() {
        const dark = matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(localStorage.getItem('theme') || (dark ? 'dark' : 'light'));
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) this.setTheme(e.matches ? 'dark' : 'light');
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.state.theme = theme;
        localStorage.setItem('theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
        this.updateThemeIcons();
    }

    updateThemeIcons() {
        const icon = this.state.theme === 'dark' ? 'dark_mode' : 'light_mode';
        ['theme-toggle', 'sidebar-theme-toggle'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                const iconEl = btn.querySelector('.material-symbols-rounded');
                if (iconEl) iconEl.textContent = icon;
            }
        });
    }

    toggleTheme() {
        this.setTheme(this.state.theme === 'dark' ? 'light' : 'dark');
    }

    async init(pageModules = {}, i18nPromise = null) {
        try {
            // 并行启动所有初始化任务
            const configPromise = this.loadConfig();
            const themeInitPromise = Promise.resolve().then(() => this.initTheme());
            
            this.router = new Router(pageModules);
            this.ui = new UI();
            
            this.router.ui = this.ui;
            this.ui.router = this.router;
            this.ui.app = this;
            
            const uiInitPromise = this.ui.init();
            const [config] = await Promise.all([configPromise]);
            this.state.config = config;
            await Promise.all([themeInitPromise, uiInitPromise]);
            await this.router.init();
            const currentPage = this.router.getCurrentPage();
            const navigationPromise = this.router.navigate(currentPage, false);
            const preloadingPromise = Promise.resolve().then(() => this.startPreloading(pageModules, currentPage));
            await navigationPromise;
            preloadingPromise.catch(error => console.warn('预加载启动失败:', error));
            this.finishLoading();
            if (i18nPromise) {
                i18nPromise.then(() => {
                    // 监听翻译文件加载完成事件
                    document.addEventListener('translationsLoaded', () => {
                        // 翻译文件加载完成后，更新UI翻译
                        this.ui?.updateNavLabels?.();
                        this.ui?.updatePageTitle?.(currentPage);
                    }, { once: true });
                }).catch(error => {
                    console.warn('I18n initialization failed:', error);
                });
            }
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError('应用初始化失败');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            return response.ok ? await response.json() : { title: 'AMMF WebUI', version: '1.0.0' };
        } catch {
            return { title: 'AMMF WebUI', version: '1.0.0' };
        }
    }

    startPreloading(pageModules, currentPage) {
        const startPreload = () => {
            this.preloadQueue = Object.keys(pageModules).filter(page => page !== currentPage);
            this.processPreloadQueue(pageModules);
        };
        
        if (window.requestIdleCallback) {
            requestIdleCallback(startPreload, { timeout: 2000 });
        } else {
            setTimeout(startPreload, 1000);
        }
    }

    async processPreloadQueue(pageModules) {
        if (this.isPreloading || !this.preloadQueue.length) return;
        this.isPreloading = true;
        
        while (this.preloadQueue.length > 0) {
            const page = this.preloadQueue.shift();
            if (pageModules[page]) {
                await this.preloadPage(page, pageModules[page]);
            }
            await new Promise(resolve => {
                if (window.requestIdleCallback) {
                    requestIdleCallback(resolve, { timeout: 500 });
                } else {
                    setTimeout(resolve, 100);
                }
            });
        }
        
        this.isPreloading = false;
    }

    async preloadPage(pageName, pageModule) {
        if (this.preloadCache.has(pageName)) return;
        if (this.router?.cache?.has(pageName)) {
            this.preloadCache.set(pageName, true);
            return;
        }
        
        this.preloadCache.set(pageName, true);
        try {
            if (pageModule?.preload) await pageModule.preload();
            if (pageModule?.getHTML) {
                const html = await pageModule.getHTML();
                this.cache.set(`${pageName}-html`, html);
            }
        } catch (error) {
            console.warn(`Failed to preload ${pageName}:`, error);
        }
    }

    finishLoading() {
        document.body.classList.add('app-loaded');
        this.state.isLoading = false;
        window.LoadingManager?.setAppReady?.(true);
        this.ui.initSystemButtons();
    }

    showError(error) {
        const main = document.getElementById('main-content');
        if (main) {
            main.innerHTML = `<div class="error-container"><h2>启动失败</h2><p>${error.message || error}</p><button onclick="location.reload()">重新加载</button></div>`;
        }
        window.LoadingManager?.setAppReady?.(true);
    }
}

export class Router {
    constructor(pageModules) {
        this.pageModules = pageModules || {};
        this.cache = new Map();
        this.loading = new Map();
        this.currentPage = null;
    }

    async init() {
        addEventListener('popstate', () => this.navigate(this.getCurrentPage(), false));
    }

    getCurrentPage() {
        return location.hash.slice(1) || 'status';
    }

    async navigate(pageName, updateHistory = true) {
        if (this.currentPage === pageName) return;
        
        try {
            const [module] = await Promise.all([
                this.loadModule(pageName),
                this.deactivateCurrent()
            ]);
            
            this.currentPage = pageName;
            this.ui?.updateNav?.(pageName);
            
            if (updateHistory) history.pushState(null, '', `#${pageName}`);
            
            await this.renderPage(module, pageName);
            await this.activatePage(module, pageName);
        } catch (error) {
            console.error('Navigation failed:', error);
            this.ui?.showError?.('页面加载失败', error.message);
        }
    }

    async loadModule(pageName, forceReload = false) {
        if (forceReload) {
            this.cache.delete(pageName);
            this.loading.delete(pageName);
        }
        
        if (this.cache.has(pageName)) return this.cache.get(pageName);
        if (this.loading.has(pageName)) return await this.loading.get(pageName);
        
        const promise = this.loadModuleInternal(pageName, forceReload);
        this.loading.set(pageName, promise);
        
        try {
            const module = await promise;
            this.loading.delete(pageName);
            return module;
        } catch (error) {
            this.loading.delete(pageName);
            throw error;
        }
    }

    async loadModuleInternal(pageName, forceReload = false) {
        let module = this.pageModules[pageName];
        
        // 如果模块还未加载（延迟加载的情况），等待一段时间
        if (!module) {
            let retries = 0;
            const maxRetries = 30; // 增加重试次数
            
            while (!module && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 50)); // 减少等待间隔
                module = this.pageModules[pageName];
                retries++;
            }
            
            if (!module) {
                throw new Error(`Module not found after waiting: ${pageName}`);
            }
        }
        
        if (forceReload) {
            module._initialized = false;
        }
        
        if (!module._initialized && module.init) {
            const result = await module.init(this.ui);
            if (result === false) throw new Error(`Init failed: ${pageName}`);
            module._initialized = true;
        }
        
        this.cache.set(pageName, module);
        return module;
    }

    async deactivateCurrent() {
        if (!this.currentPage) return;
        const current = this.cache.get(this.currentPage) || this.pageModules[this.currentPage];
        if (current?.onDeactivate) {
            try { await current.onDeactivate(); } catch (e) { console.warn('Deactivate failed:', e); }
        }
    }

    async renderPage(module, pageName) {
        const main = document.getElementById('main-content');
        if (!main) return;
        
        main.querySelector('.page-container')?.remove();
        
        const container = document.createElement('div');
        container.className = 'page-container';
        
        const cachedHTML = window.app?.cache?.get(`${pageName}-html`);
        container.innerHTML = cachedHTML || module.render();
        
        main.appendChild(container);
        requestAnimationFrame(() => container.classList.add('slide-in'));
    }

    async activatePage(module, pageName) {
        try {
            await module.afterRender?.();
            await module.onActivate?.();
        } catch (e) {
            console.warn('Page activation failed:', e);
        }
        
        requestAnimationFrame(() => {
            this.ui?.updatePageTitle?.(pageName);
            this.ui?.updatePageActions?.(pageName);
        });
    }
}

export class UI {
    constructor() {
        this.elements = {};
        this.pageActions = new Map();
        this.activeActions = new Set();
        this.navItems = new Map();
        this.systemButtons = new Map();
    }

    async init() {
        this.updateElements();
        this.initNav();
        this.initLanguage();
        
        document.addEventListener('languageChanged', () => {
            if (this.router?.currentPage) {
                this.updatePageTitle(this.router.currentPage);
                this.updateNavLabels();
            }
        });
        
        window.addEventListener('resize', () => {
            if (this.router?.currentPage) {
                this.updatePageActions(this.router.currentPage);
            }
            this.updateSystemButtonsVisibility();
        });
    }

    updateElements() {
        this.elements = {
            app: document.getElementById('app'),
            header: document.querySelector('.app-header'),
            main: document.getElementById('main-content'),
            title: document.getElementById('page-title'),
            actions: document.getElementById('page-actions'),
            nav: document.getElementById('app-nav')
        };
    }

    initNav() {
        if (!this.elements.nav) return;
        
        this.elements.nav.innerHTML = '';
        const nav = document.createElement('div');
        nav.className = 'nav-content';
        
        const pageOrder = getOrderedModuleNames();
        const pageConfigs = getAllPageModuleConfigs();
        const list = document.createElement('ul');
        
        pageOrder.forEach(pageId => {
            const config = pageConfigs[pageId];
            if (config) {
                const item = this.createNavItem(pageId, config);
                list.appendChild(item);
                this.navItems.set(pageId, item);
            }
        });
        
        nav.appendChild(list);
        nav.appendChild(this.createSystemActions());
        this.elements.nav.appendChild(nav);
    }
    
    createNavItem(pageId, config) {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.page = pageId;
        item.innerHTML = `<span class="material-symbols-rounded">${config.icon || 'page_info'}</span><span class="nav-label">${this.getPageName(pageId, config)}</span>`;
        item.onclick = () => this.router?.navigate?.(pageId);
        return item;
    }
    
    createSystemActions() {
        const systemActions = document.createElement('div');
        systemActions.className = 'system-actions';
        
        const buttons = [
            { id: 'sidebar-language-button', icon: 'language', action: () => this.showLanguageSelector() },
            { id: 'sidebar-theme-toggle', icon: 'light_mode', action: () => this.app.toggleTheme() }
        ];
        
        buttons.forEach(({ id, icon, action }) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = 'icon-button';
            btn.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
            btn.onclick = action;
            systemActions.appendChild(btn);
            this.systemButtons.set(id, { element: btn, action });
        });
        
        return systemActions;
    }

    initSystemButtons() {
        const buttons = [
            { id: 'theme-toggle', action: () => this.app.toggleTheme() },
            { id: 'language-button', action: () => this.showLanguageSelector() }
        ];
        
        buttons.forEach(({ id, action }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    action();
                };
                this.systemButtons.set(id, { element: btn, action });
            }
        });
        
        this.updateSystemButtonsVisibility();
    }

    updateSystemButtonsVisibility() {
        const isLandscape = window.innerWidth >= 768;
        const headerButtons = ['theme-toggle', 'language-button'];
        const sidebarButtons = ['sidebar-theme-toggle', 'sidebar-language-button'];
        
        headerButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = isLandscape ? 'none' : 'flex';
        });
        
        sidebarButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.style.display = isLandscape ? 'flex' : 'none';
        });
    }

    showLanguageSelector() {
        this.updateLanguageOptions();
        
        const languageOptionsHtml = this.generateLanguageOptionsHtml();
        
        const modal = Modal.custom({
            title: I18n?.translate?.('SELECT_LANGUAGE', '选择语言'),
            icon: '🌐',
            content: `
                <div class="language-options">
                    ${languageOptionsHtml}
                </div>
            `,
            buttons: [
                {
                    text: I18n?.translate?.('CANCEL', '取消'),
                    type: 'text',
                    action: 'cancel',
                    onClick: () => modal.hide()
                }
            ],
            customClass: 'language-selector-modal',
            closeOnOverlay: true
        });
        
        // 绑定语言选择事件
        const container = modal.element.querySelector('.language-options');
        if (container) {
            this.bindLanguageEventsForModal(container, modal);
        }
        
        modal.show();
    }
    
    updateNavLabels() {
        this.navItems.forEach((item, pageId) => {
            const label = item.querySelector('.nav-label');
            if (label) label.textContent = this.getPageName(pageId);
        });
    }

    getPageName(page, config = null) {
        if (config) {
            const translatedName = I18n?.translate?.(config.i18n_key, config.name);
            return translatedName || config.name;
        }
        
        // 优先从main.js的配置中获取
        const pageConfigs = getAllPageModuleConfigs();
        const pageConfig = pageConfigs[page];
        if (pageConfig) {
            const translatedName = I18n?.translate?.(pageConfig.i18n_key, pageConfig.name);
            return translatedName || pageConfig.name;
        }
    }

    updateNav(pageName) {
        this.navItems.forEach((item, pageId) => {
            item.classList.toggle('active', pageId === pageName);
        });
    }

    updatePageTitle(pageName) {
        if (!this.elements.title) return;
        this.elements.title.textContent = this.getPageName(pageName) || 'AMMF WebUI';
    }

    registerPageActions(pageName, actions) {
        const valid = actions.filter(a => a.id && a.icon);
        this.pageActions.set(pageName, valid);
        if (this.router?.currentPage === pageName) this.updatePageActions(pageName);
    }

    updatePageActions(pageName) {
        this.clearActiveActions();
        const actions = this.pageActions.get(pageName) || [];
        const isLandscape = window.innerWidth >= 768;
        
        if (isLandscape) {
            this.renderActions(this.getSidebarActionsContainer(), actions, pageName);
            this.clearContainer(this.elements.actions);
        } else {
            this.renderActions(this.elements.actions, actions, pageName);
            this.clearContainer(this.getSidebarActionsContainer());
        }
    }
    
    clearActiveActions() {
        this.activeActions.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.replaceWith(btn.cloneNode(true));
        });
        this.activeActions.clear();
    }
    
    getSidebarActionsContainer() {
        let container = document.querySelector('.nav-content .page-actions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'page-actions';
            
            const navContent = document.querySelector('.nav-content');
            const systemActions = document.querySelector('.nav-content .system-actions');
            
            if (navContent) {
                navContent.insertBefore(container, systemActions || null);
            }
        }
        return container;
    }
    
    clearContainer(container) {
        if (container) container.innerHTML = '';
    }
    
    renderActions(container, actions, pageName) {
        if (!container) return;
        
        container.innerHTML = actions.map(a => 
            `<button id="${a.id}" class="icon-button" title="${a.title}">
                <span class="material-symbols-rounded">${a.icon}</span>
            </button>`
        ).join('');
        
        this.bindActionEvents(actions, pageName);
    }
    
    bindActionEvents(actions, pageName) {
        actions.forEach(action => {
            const btn = document.getElementById(action.id);
            if (btn && action.onClick) {
                this.activeActions.add(action.id);
                btn.onclick = () => {
                    const module = this.router?.pageModules?.[pageName];
                    module?.[action.onClick]?.();
                };
            }
        });
    }

    clearPageActions(pageName) {
        this.clearActiveActions();
        this.clearContainer(this.elements.actions);
        this.clearContainer(this.getSidebarActionsContainer());
        if (pageName) this.pageActions.delete(pageName);
    }

    initLanguage() {
        const selector = document.getElementById('language-selector');
        if (!selector) return;
        
        selector.onclick = e => {
            if (e.target === selector) {
                e.preventDefault();
                e.stopPropagation();
                this.app.overlayManager.hide(selector);
            }
        };
        
        const cancelBtn = document.getElementById('cancel-language');
        if (cancelBtn) {
            cancelBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.overlayManager.hide(selector);
            };
        }
        
        this.updateLanguageOptions();
    }

    updateLanguageOptions() {
        // 保留原有方法用于兼容性，但主要逻辑移至generateLanguageOptionsHtml
        const container = document.getElementById('language-options');
        if (container) {
            container.innerHTML = this.generateLanguageOptionsHtml();
            this.bindLanguageEvents(container);
        }
    }
    
    generateLanguageOptionsHtml() {
        if (!I18n?.supportedLangs?.length) {
            if (!I18n?.supportedLangs?.length) {
                document.addEventListener('i18nReady', () => this.updateLanguageOptions(), { once: true });
            }
            return '<div class="no-languages">Loading languages...</div>';
        }
        
        return I18n.supportedLangs.map(lang => 
            `<div class="language-option ${lang === I18n.currentLang ? 'selected' : ''}" data-lang="${lang}">
                <input type="radio" name="language" id="lang-${lang}" value="${lang}" ${lang === I18n.currentLang ? 'checked' : ''} class="radio">
                <label for="lang-${lang}">${this.getLanguageName(lang)}</label>
            </div>`
        ).join('');
    }

    bindLanguageEventsForModal(container, modal) {
        container.onclick = async e => {
            e.preventDefault();
            e.stopPropagation();
            
            const option = e.target.closest('.language-option');
            if (!option) return;
            
            const lang = option.dataset.lang;
            if (lang && lang !== I18n.currentLang) {
                await I18n.setLanguage(lang);
                modal.hide();
            }
        };
    }
    
    bindLanguageEvents(container) {
        const selector = document.getElementById('language-selector');
        
        container.onclick = async e => {
            e.preventDefault();
            e.stopPropagation();
            const option = e.target.closest('.language-option');
            if (option) {
                const lang = option.dataset.lang;
                this.app.overlayManager.hide(selector);
                
                if (lang !== I18n.currentLang) {
                    await I18n.setLanguage(lang);
                }
            }
        };
    }

    getLanguageName(lang) {
        return { 'zh': '中文', 'en': 'English', 'ru': 'Русский' }[lang] || lang.toUpperCase();
    }

    showError(title, message) {
        if (this.elements.main) {
            this.elements.main.innerHTML = `<div class="page-container"><div class="error-container"><h2>${title}</h2><p>${message}</p></div></div>`;
        }
    }
}

export class OverlayManager {
    constructor() {
        this.activeOverlays = new Set();
        this.animationDuration = 200;
    }

    show(element) {
        if (!element || this.activeOverlays.has(element)) return;
        
        this.activeOverlays.add(element);
        element.style.display = 'flex';
        
        requestAnimationFrame(() => {
            element.classList.add('active');
        });
    }

    hide(element) {
        if (!element || !this.activeOverlays.has(element) || element.classList.contains('closing')) {
            return;
        }
        
        element.classList.remove('active');
        element.classList.add('closing');
        
        const handleTransitionEnd = () => {
            element.classList.remove('closing');
            element.style.display = 'none';
            this.activeOverlays.delete(element);
            element.removeEventListener('transitionend', handleTransitionEnd);
        };
        
        element.addEventListener('transitionend', handleTransitionEnd, { once: true });
        
        setTimeout(() => {
            if (element.classList.contains('closing')) {
                handleTransitionEnd();
            }
        }, this.animationDuration);
    }

    hideAll() {
        this.activeOverlays.forEach(element => this.hide(element));
    }

    isActive(element) {
        return this.activeOverlays.has(element);
    }
}

export const app = new App();