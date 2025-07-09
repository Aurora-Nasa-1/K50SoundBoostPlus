/**
 * AMMF WebUI 国际化模块
 * 提供多语言支持功能
 */

export const I18n = {
    currentLang: 'zh',
    supportedLangs: ['zh', 'en', 'ru'],
    translations: {
        zh: {},
        en: {},
        ru: {}
    },
    moduleTranslations: {
        zh: {},
        en: {},
        ru: {}
    },
    config: {
        enableModuleTranslations: false,
        reloadOnLanguageChange: false
    },

    configure(options = {}) {
        Object.assign(this.config, options);
        return this;
    },

    async init() {
        try {
            console.log('开始初始化语言模块...');
            
            // 立即确定初始语言，不等待翻译文件加载
            await this.determineInitialLanguage();
            this.observeDOMChanges();
            
            // 异步加载翻译文件，不阻塞主流程
            this.loadTranslationsAsync();
            
            console.log(`语言模块初始化完成: ${this.currentLang}`);
            
            // 分发初始化完成事件
            document.dispatchEvent(new CustomEvent('i18nReady', {
                detail: { language: this.currentLang }
            }));
            
            return true;
        } catch (error) {
            console.error('初始化语言模块失败:', error);
            this.currentLang = 'zh';
            return false;
        }
    },

    // 异步加载翻译文件 - 符合Vite规范的动态导入
    async loadTranslationsAsync() {
        try {
            // 先加载基础翻译文件
            await this.loadTranslations();
            
            // 翻译文件加载完成后立即应用
            this.applyTranslations();
            
            // 分发翻译加载完成事件
            document.dispatchEvent(new CustomEvent('translationsLoaded', {
                detail: { language: this.currentLang }
            }));
            
            // 只有在配置允许时才加载模块扩展翻译
            if (this.config.enableModuleTranslations) {
                try {
                    await this.loadModuleTranslations();
                    this.applyTranslations(); // 重新应用包含模块翻译的内容
                } catch (error) {
                    console.log('模块翻译加载失败，继续使用基础翻译:', error.message);
                }
            }
        } catch (error) {
            console.warn('翻译文件加载失败:', error);
            // 使用基础翻译作为后备
            this.translations.zh = this.getBaseTranslations();
            this.applyTranslations();
        }
    },



    async loadTranslations() {
        try {
            // 加载每种语言的翻译文件
            const loadPromises = this.supportedLangs.map(async lang => {
                try {
                    // 使用动态导入加载JSON文件
                    const module = await import(`./assets/translations/${lang}.json`);
                    const translations = module.default;
                    // 验证加载的翻译数据
                    if (typeof translations === 'object' && Object.keys(translations).length > 0) {
                        this.translations[lang] = translations;
                        console.log(`成功加载${lang}语言文件，包含 ${Object.keys(translations).length} 个翻译项`);
                    } else {
                        throw new Error(`${lang}语言文件格式无效`);
                    }
                } catch (error) {
                    console.error(`加载${lang}语言文件失败:`, error);
                    // 如果是中文翻译加载失败，使用基础翻译
                    if (lang === 'zh') {
                        this.translations.zh = this.getBaseTranslations();
                    }
                }
            });

            await Promise.all(loadPromises);

            // 验证所有语言是否都有基本的翻译内容
            this.supportedLangs.forEach(lang => {
                if (!this.translations[lang] || Object.keys(this.translations[lang]).length === 0) {
                    console.warn(`${lang}语言翻译内容为空，使用基础翻译`);
                    this.translations[lang] = this.getBaseTranslations();
                }
            });
        } catch (error) {
            console.error('加载翻译文件失败:', error);
            // 确保至少有基础的中文翻译
            this.translations.zh = this.getBaseTranslations();
        }
    },

    // 新增：加载模块扩展翻译（可选功能）
    async loadModuleTranslations() {
        console.log('尝试加载模块扩展翻译...');
        
        // 使用 import.meta.glob 来静态分析可用的模块翻译文件
        const moduleFiles = import.meta.glob('./assets/translations/module/*.json');
        
        if (Object.keys(moduleFiles).length === 0) {
            console.log('未找到模块翻译文件，跳过模块翻译加载');
            return;
        }
        
        // 加载找到的模块翻译文件
        const loadPromises = Object.entries(moduleFiles).map(async ([path, loader]) => {
            try {
                const lang = path.match(/\/([^/]+)\.json$/)?.[1];
                if (!lang || !this.supportedLangs.includes(lang)) {
                    return;
                }
                
                const module = await loader();
                const moduleTranslations = module.default;
                
                // 验证加载的翻译数据
                if (typeof moduleTranslations === 'object' && Object.keys(moduleTranslations).length > 0) {
                    // 存储模块翻译
                    this.moduleTranslations[lang] = moduleTranslations;
                    
                    // 将模块翻译合并到主翻译中（模块翻译优先级低于主翻译）
                    this.translations[lang] = {
                        ...moduleTranslations,
                        ...this.translations[lang]  // 主翻译覆盖同名的模块翻译
                    };
                    
                    console.log(`成功加载${lang}模块翻译文件，包含 ${Object.keys(moduleTranslations).length} 个翻译项`);
                } else {
                    console.warn(`${lang}模块翻译文件格式无效或为空`);
                }
            } catch (error) {
                console.warn(`加载模块翻译文件失败:`, error.message);
            }
        });

        await Promise.all(loadPromises);
        console.log('模块扩展翻译加载完成');
    },

    async determineInitialLanguage() {
        try {
            // 1. 优先从localStorage获取保存的语言设置
            const savedLang = localStorage.getItem('currentLanguage');
            if (savedLang && this.supportedLangs.includes(savedLang)) {
                this.currentLang = savedLang;
                return;
            }
            
            // 2. 检测浏览器语言设置
            const browserLang = navigator.language.split('-')[0];
            if (this.supportedLangs.includes(browserLang)) {
                this.currentLang = browserLang;
                // 保存检测到的语言
                localStorage.setItem('currentLanguage', browserLang);
                return;
            }
            
            // 3. 使用默认语言并保存
            localStorage.setItem('currentLanguage', this.currentLang);
        } catch (error) {
            console.warn('语言检测失败，使用默认语言:', error);
            localStorage.setItem('currentLanguage', this.currentLang);
        }
    },

    applyTranslations() {
        // 更新页面标题
        const pageTitle = this.translate('PAGE_TITLE');
        if (pageTitle && pageTitle !== 'PAGE_TITLE') {
            document.title = pageTitle;
        }

        // 处理带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });

        // 处理带有 data-i18n-placeholder 属性的元素
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                el.setAttribute('placeholder', translation);
            }
        });

        // 处理带有 data-i18n-title 属性的元素
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                el.setAttribute('title', translation);
            }
        });

        // 处理带有 data-i18n-label 属性的元素
        const labelElements = document.querySelectorAll('[data-i18n-label]');
        labelElements.forEach(el => {
            const key = el.getAttribute('data-i18n-label');
            const translation = this.translate(key);
            if (translation && translation !== key && el.querySelector('.switch-label')) {
                el.querySelector('.switch-label').textContent = translation;
            }
        });
        
        // 处理带有 data-i18n-aria-label 属性的元素
        const ariaLabelElements = document.querySelectorAll('[data-i18n-aria-label]');
        ariaLabelElements.forEach(el => {
            const key = el.getAttribute('data-i18n-aria-label');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                el.setAttribute('aria-label', translation);
            }
        });
        
        // 处理带有 data-i18n-value 属性的元素（如按钮值）
        const valueElements = document.querySelectorAll('[data-i18n-value]');
        valueElements.forEach(el => {
            const key = el.getAttribute('data-i18n-value');
            const translation = this.translate(key);
            if (translation && translation !== key) {
                el.setAttribute('value', translation);
            }
        });
        
        console.log(`已应用翻译到 ${elements.length + placeholderElements.length + titleElements.length + labelElements.length + ariaLabelElements.length + valueElements.length} 个元素`);
    },

    translate(key, defaultText = '') {
        if (!key) return defaultText;

        // 支持参数替换，例如：translate('HELLO', '你好 {name}', {name: '张三'})
        if (arguments.length > 2 && typeof arguments[2] === 'object') {
            let text = this.translations[this.currentLang][key] || defaultText || key;
            const params = arguments[2];

            for (const param in params) {
                if (Object.prototype.hasOwnProperty.call(params, param)) {
                    text = text.replace(new RegExp(`{${param}}`, 'g'), params[param]);
                }
            }

            return text;
        }

        return this.translations[this.currentLang][key] || defaultText || key;
    },


    async setLanguage(lang) {
        if (!this.supportedLangs.includes(lang) || lang === this.currentLang) return lang === this.currentLang;

        try {
            const oldLang = this.currentLang;
            this.currentLang = lang;
            localStorage.setItem('currentLanguage', lang);
            
            if (this.config.reloadOnLanguageChange) {
                // 重新初始化当前页面模块
                window.dispatchEvent(new CustomEvent('language-changed', { detail: { newLang: lang, oldLang, reload: true } }));
                
                // 触发页面模块重新加载
                if (window.app && window.app.router && window.app.router.currentPage) {
                    await window.app.router.loadModule(window.app.router.currentPage, true);
                }
                
                // 应用翻译到全局UI元素
                this.applyTranslations();
                
                // 触发语言变更事件
                document.dispatchEvent(new CustomEvent('languageChanged', {
                    detail: { language: lang, oldLanguage: oldLang }
                }));
                
                return true;
            }
            
            // 传统方式：清理缓存并应用翻译
            window.dispatchEvent(new CustomEvent('language-changed', { detail: { newLang: lang, oldLang } }));
            this.applyTranslations();
            
            document.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language: lang, oldLanguage: oldLang }
            }));
            
            return true;
        } catch (error) {
            console.error('语言切换失败:', error);
            return false;
        }
    },



    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    },

    observeDOMChanges() {
        if (this.observer) this.observer.disconnect();

        const debouncedApply = this.debounce(() => this.applyTranslations(), 300);
        const i18nAttrs = ['data-i18n', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-label'];

        this.observer = new MutationObserver((mutations) => {
            const shouldUpdate = mutations.some(mutation => {
                if (mutation.type === 'childList') {
                    return Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && (
                            i18nAttrs.some(attr => node.hasAttribute?.(attr)) ||
                            node.querySelector?.(`[${i18nAttrs.join('], [')}]`)
                        )
                    );
                }
                return mutation.type === 'attributes' && i18nAttrs.includes(mutation.attributeName);
            });
            
            if (shouldUpdate) debouncedApply();
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: i18nAttrs
        });
    }

};