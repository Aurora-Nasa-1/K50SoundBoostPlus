import { Core } from '../core.js';
import { I18n } from '../i18n.js';

export const SettingsPage = {
    // 配置现在由main.js集中管理，通过模块加载时注入
    config: null,
    
    settings: {},
    settingsBackup: {},
    hasUnsavedChanges: false,
    tempFormState: {},
    excludedSettings: [],
    settingsDescriptions: {},
    settingsOptions: {},
    isLoading: false,
    isCancelled: false,
    preloadedData: null,

    async preload() {
        try {
            // 并行加载设置数据和元数据
            const [settingsData, settingsMetadata] = await Promise.all([
                this.loadSettingsData(),
                this.loadSettingsMetadata()
            ]);

            if (this.isCancelled) return;

            // 应用设置数据
            if (settingsData) {
                this.settings = settingsData;
            }

            // 应用元数据
            if (settingsMetadata) {
                this.settingsDescriptions = settingsMetadata.descriptions || {};
                this.settingsOptions = settingsMetadata.options || {};
                this.excludedSettings = settingsMetadata.excluded || [];
            } else {
                this.setupTestMetadata();
            }

            this.isPreloaded = true;
        } catch (error) {
            console.error('预加载设置失败:', error);
            // 预加载失败时使用测试数据
            this.setupTestMetadata();
        }
    },

    async init(ui) {
        this.ui = ui;
        try {
            this.isCancelled = false;
            this.registerActions();
            
            this.boundLanguageHandler = this.onLanguageChanged.bind(this);
            document.addEventListener('languageChanged', this.boundLanguageHandler);
            
            // 如果有临时表单状态且有未保存的更改，优先使用临时状态
            if (this.tempFormState && Object.keys(this.tempFormState).length > 0 && this.hasUnsavedChanges) {
                if (!this.settingsDescriptions) {
                    await this.loadSettingsMetadata();
                }
                this.settings = { ...this.tempFormState };
                // 确保临时状态也有备份用于恢复
                if (!this.settingsBackup || Object.keys(this.settingsBackup).length === 0) {
                    // 如果没有备份，尝试从原始数据创建备份
                    const originalData = this.preloadedData?.settingsData || await this.loadSettingsData();
                    if (originalData && Object.keys(originalData).length > 0) {
                        const cleanBackup = {};
                        for (const key in originalData) {
                            if (!key.startsWith('_')) {
                                cleanBackup[key] = originalData[key];
                            }
                        }
                        this.settingsBackup = JSON.parse(JSON.stringify(cleanBackup));
                    }
                }
                return true;
            }

            this.hasUnsavedChanges = false;
            
            if (this.preloadedData) {
                this.settings = this.preloadedData.settingsData || {};
                this.settingsDescriptions = this.preloadedData.settingsMetadata?.descriptions || {};
                this.settingsOptions = this.preloadedData.settingsMetadata?.options || {};
                this.excludedSettings = this.preloadedData.settingsMetadata?.excluded || [];
            } else {
                await Promise.all([
                    this.loadSettingsData(),
                    this.loadSettingsMetadata()
                ]);
            }

            this.createSettingsBackup();
            return true;
        } catch (error) {
            console.error('初始化设置页面失败:', error);
            return false;
        }
    },

    onLanguageChanged() {
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) {
            // 保存当前表单状态
            this.saveTemporaryFormState();
            // 重新渲染设置界面
            settingsContainer.innerHTML = this.renderSettings();
            // 恢复表单状态
            this.restoreFormState();
            // 语言切换时只需要重新绑定事件，不需要重新初始化
            requestAnimationFrame(() => this.bindSettingEvents());
        }
        
        // 更新页面操作按钮的翻译
        requestAnimationFrame(() => {
            this.registerActions();
        });
    },

    registerActions() {
        this.ui.registerPageActions('settings', [
            {
                id: 'save-settings',
                icon: 'save',
                title: I18n.translate('SAVE_SETTINGS', '保存设置'),
                onClick: 'saveSettings'
            },
            {
                id: 'restore-settings',
                icon: 'restore',
                title: I18n.translate('RESTORE_SETTINGS', '还原设置'),
                onClick: 'restoreSettings'
            }
        ]);
    },

    createSettingsBackup() {
        const cleanSettings = {};
        for (const key in this.settings) {
            if (!key.startsWith('_')) {
                cleanSettings[key] = this.settings[key];
            }
        }
        this.settingsBackup = JSON.parse(JSON.stringify(cleanSettings));
    },

    render() {
        return `
            <div class="settings-content">
                <div id="settings-container">
                    <div class="loading-placeholder">
                        ${I18n.translate('LOADING_SETTINGS', '正在加载设置...')}
                    </div>
                </div>
                <div id="settings-loading" class="loading-overlay">
                    <div class="loading-spinner"></div>
                </div>
            </div>
        `;
    },

    isExcluded(key) {
        return this.excludedSettings.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(key);
            }
            return pattern === key;
        });
    },

    renderSettings() {
        if (!this.settings || Object.keys(this.settings).filter(key => !key.startsWith('_')).length === 0) {
            this.settings = this.getTestSettings();
            this.createSettingsBackup();
        }

        const sortedSettings = Object.keys(this.settings)
            .filter(key => !key.startsWith('_') && !this.isExcluded(key))
            .sort();

        return sortedSettings.map(key => {
            const value = this.settings[key];
            const description = this.getSettingDescription(key);
            return `
                <div class="setting-item" data-key="${key}">
                    ${this.renderSettingControl(key, value, description)}
                </div>
            `;
        }).join('');
    },

    getTestSettings() {
        return {
            ENABLE_FEATURE_A: true,
            ENABLE_FEATURE_B: false,
            SERVER_PORT: 8080,
            API_KEY: "test_api_key_12345",
            LOG_LEVEL: "info",
            THEME: "auto",
            VOLUME: 75,
            BRIGHTNESS: 80,
            APP_TEST_1: "should_be_excluded",
            APP_TEST_2: "should_be_excluded",
            SYSTEM_TEMP: "should_be_excluded",
            ACTION_TEST: "should_be_excluded"
        };
    },

    renderSettingControl(key, value, description) {
        if (this.settingsOptions[key]) {
            return this.renderSelectControl(key, value, description);
        }

        if (typeof value === 'boolean') {
            return this.renderBooleanControl(key, value, description);
        } else if (typeof value === 'number') {
            return this.renderNumberControl(key, value, description);
        } else {
            return this.renderTextControl(key, value, description);
        }
    },

    renderBooleanControl(key, value, description) {
        return `
            <div class="switches">
                <label>
                    ${description}
                    <input type="checkbox" id="setting-${key}" ${value ? 'checked' : ''}>
                </label>
            </div>
        `;
    },

    renderNumberControl(key, value, description) {
        return `
            <label>
                <span>${description}</span>
                <input type="number" id="setting-${key}" value="${value}" class="md3-input">
            </label>
        `;
    },

    renderTextControl(key, value, description) {
        const safeValue = typeof value === 'string' ? this.escapeHtml(value) : value;
        return `
            <label>
                <span>${description}</span>
                <input type="text" id="setting-${key}" value="${safeValue}">
            </label>
        `;
    },

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    renderSelectControl(key, value, description) {
        const options = this.settingsOptions[key]?.options || [];
        if (options.length === 0) {
            return this.renderTextControl(key, value, description);
        }

        const optionsHtml = options.map(option => {
            const optionValue = option.value;
            let label = optionValue;
            
            // 处理标签的多语言支持
            if (option.label) {
                if (typeof option.label === 'string') {
                    label = option.label;
                } else {
                    const lang = I18n.currentLang;
                    label = option.label[lang] || option.label.en || optionValue;
                }
            }
            
            // 确保标签是字符串
            label = typeof label === 'string' ? label : optionValue;
            
            return `<option value="${optionValue}" ${optionValue === value ? 'selected' : ''}>${label}</option>`;
        }).join('');

        return `
            <label>
                <span>${description}</span>
                <select id="setting-${key}">
                    ${optionsHtml}
                </select>
            </label>
        `;
    },

    getSettingDescription(key) {
        if (this.settingsDescriptions[key]) {
            // 优先使用当前语言的描述，其次使用英文描述，最后使用键名
            const lang = I18n.currentLang;
            const description = this.settingsDescriptions[key][lang] || 
                              this.settingsDescriptions[key].en || 
                              key;
            
            // 确保返回字符串
            return typeof description === 'string' ? description : key;
        }
        return key;
    },

    async loadSettingsData() {
        try {
            if (this.settings && Object.keys(this.settings).filter(key => !key.startsWith('_')).length > 0) {
                return this.settings;
            }

            const configPath = `${Core.MODULE_PATH}module_settings/config.sh`;
            if (this.isCancelled) return;

            const configContent = await Promise.race([
                Core.execCommand(`cat "${configPath}"`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 5000))
            ]);

            if (this.isCancelled) return;

            if (!configContent) {
                console.warn('配置文件为空或不存在');
                return this.getTestSettings();
            }

            this.settings = this.parseConfigFile(configContent);
            return this.settings;
        } catch (error) {
            console.error('加载设置数据失败:', error);
            Core.showToast(I18n.translate('SETTINGS_LOAD_ERROR', '加载设置失败'), 'error');
            return this.getTestSettings();
        }
    },

    parseConfigFile(content) {
        const settings = {};
        const lines = content.split('\n');

        settings._configInfo = {
            lines: lines,
            formats: {}
        };

        for (const line of lines) {
            if (line.trim() === '') continue;

            const commentIndex = line.indexOf('#');
            const effectiveLine = commentIndex !== -1 ? line.substring(0, commentIndex) : line;
            const comment = commentIndex !== -1 ? line.substring(commentIndex) : '';
            const commentSpacing = commentIndex !== -1 ? line.substring(0, commentIndex).match(/\s*$/)[0] : '';

            if (effectiveLine.trim() === '') continue;

            const match = effectiveLine.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
            if (match) {
                const key = match[1];
                const originalValue = match[2].trim();
                let value = originalValue;

                settings._configInfo.formats[key] = {
                    comment,
                    commentSpacing,
                    hasDoubleQuotes: value.startsWith('"') && value.endsWith('"'),
                    hasSingleQuotes: value.startsWith("'") && value.endsWith("'")
                };

                if (settings._configInfo.formats[key].hasDoubleQuotes ||
                    settings._configInfo.formats[key].hasSingleQuotes) {
                    value = value.substring(1, value.length - 1);
                }

                const lowerValue = value.toLowerCase();
                if (lowerValue === 'true' || lowerValue === 'false') {
                    settings[key] = lowerValue === 'true';
                } else if (!isNaN(value) && value.trim() !== '' && !isNaN(parseFloat(value))) {
                    settings[key] = Number(value);
                } else {
                    settings[key] = value;
                }
            }
        }

        return settings;
    },

    async loadSettingsMetadata() {
        try {
            const metadataPath = `${Core.MODULE_PATH}module_settings/settings.json`;
            if (this.isCancelled) return null;

            const metadataContent = await Core.execCommand(`cat "${metadataPath}"`);
            if (this.isCancelled) return null;

            if (!metadataContent) {
                return this.getTestMetadata();
            }

            const metadata = JSON.parse(metadataContent);
            
            // 确保排除项、描述和选项正确应用
            const excluded = Array.isArray(metadata.excluded) ? metadata.excluded : [];
            const descriptions = metadata.descriptions || {};
            const options = metadata.options || {};
            
            // 验证语言选项
            for (const key in options) {
                if (options[key]?.options) {
                    options[key].options = options[key].options.map(opt => {
                        if (typeof opt === 'string') {
                            return { value: opt, label: { en: opt } };
                        }
                        return opt;
                    });
                }
            }
            
            return {
                excluded,
                descriptions,
                options
            };
        } catch (error) {
            console.error('加载设置元数据失败:', error);
            return this.getTestMetadata();
        }
    },

    getTestMetadata() {
        return {
            descriptions: {
                ENABLE_FEATURE_A: { zh: "启用功能A", en: "Enable Feature A" },
                ENABLE_FEATURE_B: { zh: "启用功能B", en: "Enable Feature B" },
                SERVER_PORT: { zh: "服务器端口", en: "Server Port" },
                API_KEY: { zh: "API密钥", en: "API Key" },
                LOG_LEVEL: { zh: "日志级别", en: "Log Level" },
                THEME: { zh: "主题", en: "Theme" },
                VOLUME: { zh: "音量", en: "Volume" },
                BRIGHTNESS: { zh: "亮度", en: "Brightness" }
            },
            options: {
                LOG_LEVEL: {
                    options: [
                        { value: "debug", label: { zh: "调试", en: "Debug" } },
                        { value: "info", label: { zh: "信息", en: "Info" } },
                        { value: "warn", label: { zh: "警告", en: "Warning" } },
                        { value: "error", label: { zh: "错误", en: "Error" } }
                    ]
                },
                THEME: {
                    options: [
                        { value: "auto", label: { zh: "自动", en: "Auto" } },
                        { value: "light", label: { zh: "浅色", en: "Light" } },
                        { value: "dark", label: { zh: "深色", en: "Dark" } }
                    ]
                }
            },
            excluded: [
                "APP_*",
                "SYSTEM_TEMP",
                "ACTION_*"
            ]
        };
    },

    setupTestMetadata() {
        const metadata = this.getTestMetadata();
        this.settingsDescriptions = metadata.descriptions;
        this.settingsOptions = metadata.options;
        this.excludedSettings = metadata.excluded;
    },

    async saveSettings() {
        try {
            this.showLoading();

            const updatedSettings = {};
            for (const key in this.settings) {
                if (key.startsWith('_') || this.isExcluded(key)) continue;

                const element = document.getElementById(`setting-${key}`);
                if (!element) continue;

                if (element.type === 'checkbox') {
                    updatedSettings[key] = element.checked;
                } else if (element.type === 'number' || element.type === 'range') {
                    updatedSettings[key] = Number(element.value);
                } else {
                    updatedSettings[key] = element.value;
                }
            }

            const configPath = `${Core.MODULE_PATH}module_settings/config.sh`;

            if (!this.settings._configInfo) {
                const originalConfig = await Core.execCommand(`cat "${configPath}"`);
                if (originalConfig) {
                    const tempSettings = this.parseConfigFile(originalConfig);
                    this.settings._configInfo = tempSettings._configInfo;
                } else {
                    this.settings._configInfo = { lines: [], formats: {} };
                }
            }

            let configContent = '';

            if (this.settings._configInfo.lines) {
                for (const line of this.settings._configInfo.lines) {
                    const match = line.match(/^([A-Za-z0-9_]+)\s*=/);
                    if (match && this.isExcluded(match[1])) {
                        configContent += line + '\n';
                    }
                }
            }

            for (const key in updatedSettings) {
                let value = updatedSettings[key];
                const format = this.settings._configInfo.formats[key] || {};

                if (typeof value === 'string') {
                    if (this.settingsOptions[key]) {
                        value = `"${value}"`;
                    } else if (format.hasDoubleQuotes) {
                        value = `"${value}"`;
                    } else if (format.hasSingleQuotes) {
                        value = `'${value}'`;
                    } else if (value.includes(' ') || value === '') {
                        value = `"${value}"`;
                    }
                } else if (typeof value === 'boolean') {
                    value = value ? 'true' : 'false';
                }

                configContent += `${key}=${value}${format.comment ? `${format.commentSpacing || ' '}${format.comment}` : ''}\n`;
            }

            if (this.isCancelled) return;

            await Core.execCommand(`echo '${configContent.replace(/'/g, "'\\''")}'> "${configPath}"`);

            if (this.isCancelled) return;

            const configInfo = this.settings._configInfo;
            for (const key in this.settings) {
                if (!key.startsWith('_')) {
                    delete this.settings[key];
                }
            }

            for (const key in updatedSettings) {
                this.settings[key] = updatedSettings[key];
            }

            this.settings._configInfo = configInfo;
            this.createSettingsBackup();
            this.hasUnsavedChanges = false;
            this.tempFormState = {};

            Core.showToast(I18n.translate('SETTINGS_SAVED', '设置已保存'));
        } catch (error) {
            console.error('保存设置失败:', error);
            if (!this.isCancelled) {
                Core.showToast(I18n.translate('SETTINGS_SAVE_ERROR', '保存设置失败'), 'error');
            }
        } finally {
            if (!this.isCancelled) {
                this.hideLoading();
            }
        }
    },

    restoreSettings() {
        if (!this.settingsBackup || Object.keys(this.settingsBackup).length === 0) {
            Core.showToast(I18n.translate('NO_SETTINGS_BACKUP', '没有可用的设置备份'), 'error');
            return;
        }

        const configInfo = this.settings._configInfo;
        this.settings = JSON.parse(JSON.stringify(this.settingsBackup));
        
        if (configInfo) {
            this.settings._configInfo = configInfo;
        }

        this.updateSettingsDisplay();
        this.hasUnsavedChanges = false;
        this.tempFormState = {};

        Core.showToast(I18n.translate('SETTINGS_RESTORED', '设置已还原'));
    },

    checkForUnsavedChanges() {
        if (!this.settings || !this.settingsBackup) return false;

        const currentSettings = {};
        for (const key in this.settings) {
            if (key.startsWith('_') || this.isExcluded(key)) continue;

            const element = document.getElementById(`setting-${key}`);
            if (!element) continue;

            if (element.type === 'checkbox') {
                currentSettings[key] = element.checked;
            } else if (element.type === 'number' || element.type === 'range') {
                currentSettings[key] = Number(element.value);
            } else {
                currentSettings[key] = element.value;
            }
        }

        for (const key in currentSettings) {
            if (this.isExcluded(key)) continue;

            const currentValue = currentSettings[key];
            const backupValue = this.settingsBackup[key];

            if (typeof currentValue !== typeof backupValue) return true;
            if (typeof currentValue === 'object') {
                if (JSON.stringify(currentValue) !== JSON.stringify(backupValue)) return true;
            } else if (currentValue !== backupValue) {
                return true;
            }
        }

        return false;
    },

    updateSettingsDisplay() {
        const settingsContainer = document.getElementById('settings-container');
        if (settingsContainer) {
            settingsContainer.innerHTML = this.renderSettings();
        }
    },

    showLoading() {
        if (this.isLoading) return;
        this.isLoading = true;
        const loadingElement = document.getElementById('settings-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
            loadingElement.style.visibility = 'visible';
            loadingElement.style.opacity = '1';
        }
    },

    hideLoading() {
        if (!this.isLoading) return;
        this.isLoading = false;
        const loadingElement = document.getElementById('settings-loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            loadingElement.style.visibility = 'hidden';
            setTimeout(() => {
                if (!this.isLoading) {
                    loadingElement.style.display = 'none';
                }
            }, 300);
        }
    },

    saveTemporaryFormState() {
        const tempSettings = { ...this.settings };
        let hasFormData = false;
        
        for (const key in this.settings) {
            if (key.startsWith('_') || this.isExcluded(key)) continue;

            const element = document.getElementById(`setting-${key}`);
            if (!element) continue;

            hasFormData = true;
            if (element.type === 'checkbox') {
                tempSettings[key] = element.checked;
            } else if (element.type === 'number' || element.type === 'range') {
                tempSettings[key] = Number(element.value);
            } else {
                tempSettings[key] = element.value;
            }
        }

        // 只有当有表单数据时才保存临时状态
        if (hasFormData) {
            // 保留配置信息
            if (this.settings._configInfo) {
                tempSettings._configInfo = this.settings._configInfo;
            }
            this.tempFormState = tempSettings;
        }
    },

    restoreFormState() {
        if (!this.tempFormState || Object.keys(this.tempFormState).length === 0) return;
        
        for (const key in this.tempFormState) {
            if (key.startsWith('_') || this.isExcluded(key)) continue;

            const element = document.getElementById(`setting-${key}`);
            if (!element) continue;

            const value = this.tempFormState[key];
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (element.type === 'number' || element.type === 'range') {
                element.value = Number(value);
                // 更新range输入的显示值
                if (element.type === 'range') {
                    const output = element.nextElementSibling;
                    if (output && output.tagName === 'OUTPUT') {
                        output.textContent = value;
                    }
                }
            } else {
                element.value = String(value);
            }
        }
    },

    async afterRender() {
        try {
            this.showLoading();
            // 避免重复初始化，只在必要时调用 init
            if (!this.settings || Object.keys(this.settings).filter(key => !key.startsWith('_')).length === 0) {
                await this.init(this.ui);
            }
            this.updateSettingsDisplay();
            // 恢复表单状态（如果有临时状态）
            this.restoreFormState();
            this.bindSettingEvents();
        } catch (error) {
            console.error('设置页面初始化失败:', error);
            Core.showToast(I18n.translate('SETTINGS_INIT_ERROR', '设置页面初始化失败'), 'error');
        } finally {
            this.hideLoading();
        }
    },

    bindSettingEvents() {
        const container = document.getElementById('settings-container');
        if (container) {
            container.addEventListener('change', (e) => {
                const target = e.target;
                if (target.tagName === 'SELECT' || target.tagName === 'INPUT') {
                    this.hasUnsavedChanges = this.checkForUnsavedChanges();
                    this.saveTemporaryFormState();
                }
            });

            container.addEventListener('input', (e) => {
                const target = e.target;
                if (target.type === 'range') {
                    const output = target.nextElementSibling;
                    if (output && output.tagName === 'OUTPUT') {
                        output.textContent = target.value;
                    }
                    this.hasUnsavedChanges = this.checkForUnsavedChanges();
                    this.saveTemporaryFormState();
                }
            });
        }
    },

    onActivate() {
        this.isCancelled = false;
        // 重新注册操作按钮，防止页面切换后按钮消失
        this.registerActions();
    },

    onDeactivate() {
        // 检查是否有未保存的更改
        const hasChanges = this.hasUnsavedChanges || this.checkForUnsavedChanges();
        
        if (hasChanges) {
            // 保存临时表单状态
            this.saveTemporaryFormState();
            
            // 如果没有备份，创建一个备份供下次进入时使用
            if (!this.settingsBackup || Object.keys(this.settingsBackup).length === 0) {
                this.createSettingsBackup();
            }
            
            Core.showToast(I18n.translate('UNSAVED_SETTINGS', '设置有未保存的更改'), 'warning');
        } else {
            // 如果没有未保存的更改，清除临时状态
            this.tempFormState = {};
            this.hasUnsavedChanges = false;
        }
        
        if (this.boundLanguageHandler) {
            document.removeEventListener('languageChanged', this.boundLanguageHandler);
            this.boundLanguageHandler = null;
        }
        
        this.ui?.clearPageActions?.();
        this.isCancelled = true;
        this.cleanupResources();
    },

    cleanupResources() {
        const container = document.getElementById('settings-container');
        if (container) {
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
        }

        ['restore-settings', 'refresh-settings', 'save-settings'].forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.replaceWith(button.cloneNode(true));
            }
        });
    }
};