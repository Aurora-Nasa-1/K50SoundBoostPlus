/**
 * AMMF WebUI 关于页面模块
 * 显示应用信息和版本详情
 */

import { app } from '../app.js';
import { Core } from '../core.js';
import { I18n } from '../i18n.js';
import { Modal } from '@components/modal.js';

export const AboutPage = {
    // 配置现在由main.js集中管理，通过模块加载时注入
    config: null,
    
    // 模块信息
    moduleInfo: {},
    version: '10.0.0',
    // 其他配置项
    otherConfig: {
        showThemeToggle: false  // 控制是否显示主题切换按钮
    },
    
    // 预加载数据
    async preloadData() {
        try {
            // 检查是否有缓存的模块信息
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                return JSON.parse(cachedInfo);
            }
            
            // 尝试从配置文件获取模块信息
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            if (configOutput) {
                const lines = configOutput.split('\n');
                const config = {};
                
                lines.forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        config[key] = value;
                    }
                });
                
                // 缓存模块信息
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                return config;
            }
            return {};
        } catch (error) {
            console.warn('预加载模块信息失败:', error);
            return {};
        }
    },
    
    // 修改初始化方法
    async init(ui) {
        // 保存 UI 实例
        this.ui = ui;
        try {
            this.registerActions();
            // 加载页面数据
            this.moduleInfo = await this.preloadData();
            
            // 注册语言切换处理器
            this.boundLanguageHandler = this.onLanguageChanged.bind(this);
            document.addEventListener('languageChanged', this.boundLanguageHandler);
            
            return true;
        } catch (error) {
            console.error('初始化关于页面失败:', error);
            return false;
        }
    },

    // 添加语言切换处理方法
    onLanguageChanged(event) {
        const aboutContent = document.querySelector('.about-container');
        if (aboutContent) {
            aboutContent.outerHTML = this.render().trim();
            this.afterRender();
        }
    },

    // 添加清理方法
    onDeactivate() {
        // 移除语言变化事件监听器
        if (this.boundLanguageHandler) {
            document.removeEventListener('languageChanged', this.boundLanguageHandler);
            this.boundLanguageHandler = null;
        }
        // 清理页面操作按钮
        this.ui.clearPageActions();
    },
    registerActions() {
        // 注册页面操作按钮
        this.ui.registerPageActions('about', [
            {
                id: 'refresh-about',
                icon: 'refresh',
                title: I18n.translate('REFRESH', '刷新'),
                onClick: 'refreshModuleInfo'
            },
            {
                id: 'color-picker',
                icon: 'palette',
                title: I18n.translate('COLOR_PICKER', '颜色选择器'),
                onClick: 'showColorPicker'
            }
        ]);
        
        if (this.config.showThemeToggle) {
            this.ui.registerPageActions('about', [
                {
                    id: 'toggle-css',
                    icon: 'palette',
                    title: I18n.translate('TOGGLE_CSS', '切换样式'),
                    onClick: 'toggleCSS'
                }
            ]);
        }
    },
    
    render() {
        return `
        <div class="about-container">
            <div class="about-header">
                <div class="app-logo">
                    <span class="material-symbols-rounded">dashboard_customize</span>
                </div>
                <div class="about-header-content">
                    <h2>AMMF WebUI</h2>
                    <div class="version-badge">
                        ${I18n.translate('VERSION', '版本')} ${this.version}
                    </div>
                    <p class="about-description">${I18n.translate('ABOUT_DESCRIPTION', 'AMMF模块管理界面')}</p>
                </div>
            </div>
            
            <div class="about-card">
                <div class="about-section">
                    <h3 class="section-title">
                        <span class="material-symbols-rounded">info</span>
                        ${I18n.translate('MODULE_INFO', '模块信息')}
                    </h3>
                    <div class="info-list">
                        ${this.renderModuleInfo()}
                    </div>
                </div>
                
                <div class="about-section">
                    <h3 class="section-title">
                        <span class="material-symbols-rounded">person</span>
                        ${I18n.translate('MODULE_DEVELOPER', '模块开发者')}
                    </h3>
                    <div class="developer-info">
                        <div class="developer-name">
                            ${this.moduleInfo.author || I18n.translate('UNKNOWN', '未知')}
                        </div>
                        ${this.moduleInfo.github ? `
                        <a href="#" class="social-link" id="module-github-link">
                            <span class="material-symbols-rounded">code</span>
                            <span>GitHub</span>
                        </a>
                        ` : ''}
                    </div>
                </div>
                
                <div class="about-section">
                    <h3 class="section-title">
                        <span class="material-symbols-rounded">engineering</span>
                        ${I18n.translate('FRAMEWORK_DEVELOPER', '框架开发者')}
                    </h3>
                    <div class="developer-info">
                        <div class="developer-name">
                            AuroraNasa
                        </div>
                        <a href="#" class="social-link" id="github-link">
                            <span class="material-symbols-rounded">code</span>
                            <span>GitHub</span>
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="about-footer">
                <p>${I18n.translate('COPYRIGHT_INFO', `© ${new Date().getFullYear()} Aurora星空. All rights reserved.`)}</p>
            </div>
        </div>
    `;
    },
    showColorPicker() {
        // Material Design 3 标准色调值
        const presetHues = [
            { value: 0, name: I18n.translate('RED', '红色') },
            { value: 37, name: I18n.translate('ORANGE', '橙色') },
            { value: 66, name: I18n.translate('YELLOW', '黄色') },
            { value: 97, name: I18n.translate('LIME', '青柠') },
            { value: 124, name: I18n.translate('GREEN', '绿色') },
            { value: 148, name: I18n.translate('TEAL', '青色') },
            { value: 176, name: I18n.translate('CYAN', '蓝绿') },
            { value: 212, name: I18n.translate('BLUE', '蓝色') },
            { value: 255, name: I18n.translate('INDIGO', '靛蓝') },
            { value: 300, name: I18n.translate('PURPLE', '紫色') },
            { value: 325, name: I18n.translate('PINK', '粉色') }
        ];

        const currentHue = this.getCurrentHue();
        const originalHue = currentHue;

        // 创建颜色选择器内容
        const content = `
            <div class="color-picker-content">
                <div class="preset-colors">
                    ${presetHues.map(hue => `
                        <div class="preset-color ${hue.value == currentHue ? 'selected' : ''}" 
                             data-hue="${hue.value}" 
                             title="${hue.name}">
                            <div class="color-preview" style="--preview-hue: ${hue.value}"></div>
                        </div>
                    `).join('')}
                </div>
                <div class="hue-control">
                    <label>${I18n.translate('HUE_VALUE', '色调值')}</label>
                    <div class="hue-slider-container">
                        <input type="range" 
                               class="hue-slider" 
                               id="hue-slider" 
                               min="0" 
                               max="360" 
                               value="${currentHue}">
                        <output class="hue-value" id="hue-value">${currentHue}°</output>
                    </div>
                </div>
            </div>
        `;

        // 创建弹出框
        const modal = new Modal({
            title: I18n.translate('COLOR_PICKER', '颜色选择器'),
            icon: 'palette',
            content: content,
            className: 'color-picker-modal',
            buttons: [
                {
                    text: I18n.translate('CANCEL', '取消'),
                    type: 'text',
                    action: 'cancel',
                    onClick: () => {
                        // 恢复原始颜色值
                        this.setHueValue(originalHue);
                        return true; // 允许关闭
                    }
                },
                {
                    text: I18n.translate('APPLY', '应用'),
                    type: 'filled',
                    action: 'apply',
                    onClick: () => {
                        const slider = document.getElementById('hue-slider');
                        if (slider) {
                            this.setHueValue(slider.value);
                            Core.showToast(I18n.translate('COLOR_CHANGED', '颜色已更新'));
                        }
                        return true; // 允许关闭
                    }
                }
            ]
        });

        modal.show();

        // 等待DOM渲染完成后绑定事件
        requestAnimationFrame(() => {
            const slider = document.getElementById('hue-slider');
            const output = document.getElementById('hue-value');
            const presetColors = document.querySelectorAll('.preset-color');
            const colorPreviews = document.querySelectorAll('.color-preview');

            // 添加预设色调点击事件
            presetColors.forEach(preset => {
                preset.addEventListener('click', () => {
                    const hue = preset.dataset.hue;
                    
                    // 更新选中状态
                    presetColors.forEach(p => p.classList.remove('selected'));
                    preset.classList.add('selected');
                    
                    // 更新滑块和显示
                    if (slider && output) {
                        slider.value = hue;
                        output.textContent = hue + '°';
                    }
                    
                    // 实时预览颜色
                    this.previewColor(hue);
                });
            });

            // 添加滑块实时预览
            if (slider && output) {
                slider.addEventListener('input', () => {
                    const value = slider.value;
                    output.textContent = value + '°';
                    
                    // 更新预设色调选中状态
                    presetColors.forEach(p => {
                        p.classList.toggle('selected', p.dataset.hue == value);
                    });
                    
                    // 实时预览颜色
                    this.previewColor(value);
                    
                    // 添加颜色预览动画
                    colorPreviews.forEach(preview => {
                        preview.classList.add('updating');
                        setTimeout(() => preview.classList.remove('updating'), 300);
                    });
                });
            }
        });
    },
    
    getCurrentHue() {
        // 从CSS变量获取当前色调值
        const root = document.documentElement;
        const hue = getComputedStyle(root).getPropertyValue('--hue').trim();
        return parseInt(hue) || 300; // 默认值300
    },
    
    /**
     * 预览颜色变化（不保存）
     */
    previewColor(hue) {
        document.documentElement.style.setProperty('--hue', hue);
    },
    
    setHueValue(hue) {
        // 更新CSS变量
        const root = document.documentElement;
        root.style.setProperty('--hue', hue);
        
        // 保存到localStorage
        localStorage.setItem('ammf_color_hue', hue);
        
        // 触发颜色变化事件
        document.dispatchEvent(new CustomEvent('colorChanged', {
            detail: { hue: hue }
        }));
    },
    // 修改模块信息渲染方法，只保留模块名称和版本信息
    renderModuleInfo() {
        const infoItems = [
            { key: 'module_name', label: 'MODULE_NAME', icon: 'tag' },
            { key: 'version', label: 'MODULE_VERSION', icon: 'new_releases' },
            { key: 'versionCode', label: 'VERSION_DATE', icon: 'update' }
        ];
        
        let html = '';
        
        infoItems.forEach(item => {
            if (this.moduleInfo[item.key]) {
                html += `
                    <div class="info-item">
                        <div class="info-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="info-content">
                            <div class="info-label" data-i18n="${item.label}">${I18n.translate(item.label, item.key)}</div>
                            <div class="info-value">${this.moduleInfo[item.key]}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        return html || `<div class="empty-state" data-i18n="NO_INFO">${I18n.translate('NO_INFO', '无可用信息')}</div>`;
    },
    
    // 加载模块信息
    async loadModuleInfo() {
        try {
            // 检查是否有缓存的模块信息
            const cachedInfo = sessionStorage.getItem('moduleInfo');
            if (cachedInfo) {
                this.moduleInfo = JSON.parse(cachedInfo);
                console.log('从缓存加载模块信息:', this.moduleInfo);
                return;
            }
            
            // 尝试从配置文件获取模块信息
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            
            if (configOutput) {
                // 解析配置文件
                const lines = configOutput.split('\n');
                const config = {};
                
                lines.forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const value = parts.slice(1).join('=').trim();
                        config[key] = value;
                    }
                });
                
                this.moduleInfo = config;
                // 缓存模块信息
                sessionStorage.setItem('moduleInfo', JSON.stringify(config));
                console.log('模块信息加载成功:', this.moduleInfo);
            } else {
                console.warn('无法读取模块配置文件');
                this.moduleInfo = {};
            }
        } catch (error) {
            console.error('加载模块信息失败:', error);
            this.moduleInfo = {};
        }
    },
    
    // 刷新模块信息
    async refreshModuleInfo() {
        try {
            // 清除缓存
            sessionStorage.removeItem('moduleInfo');
            
            // 重新加载模块信息
            await this.loadModuleInfo();
            
            const aboutContent = document.querySelector('.about-container');
            if (aboutContent) {
                // 只更新关于容器的内容，而不是整个main-content
                aboutContent.outerHTML = this.render().trim();
                
                // 重新绑定事件
                this.afterRender();
                
                // 显示成功提示
                Core.showToast(I18n.translate('MODULE_INFO_REFRESHED', '模块信息已刷新'));
            } else {
                // 如果找不到关于容器，则使用更安全的方式更新
                App.loadPage('about');
            }
        } catch (error) {
            console.error('刷新模块信息失败:', error);
            Core.showToast(I18n.translate('MODULE_INFO_REFRESH_ERROR', '刷新模块信息失败'), 'error');
        }
    },
    
    // 渲染后的回调
    afterRender() {
        // 添加GitHub链接点击事件
        const githubLink = document.getElementById('github-link');
        if (githubLink) {
            githubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openGitHubLink();
            });
        }
        
        // 添加模块GitHub链接点击事件
        const moduleGithubLink = document.getElementById('module-github-link');
        if (moduleGithubLink) {
            moduleGithubLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.openModuleGitHubLink();
            });
        }
        
        // 添加刷新按钮点击事件
        const refreshButton = document.getElementById('refresh-about');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshModuleInfo();
            });
        }
        const colorPickerButton = document.getElementById('color-picker');
        if (colorPickerButton) {
            colorPickerButton.addEventListener('click', () => {
                this.showColorPicker();
            });
        }
        // 添加切换CSS样式按钮点击事件
        const toggleCssButton = document.getElementById('toggle-css');
        if (toggleCssButton) {
            // 更新按钮标题显示当前样式
            this.updateCssButtonStatus(toggleCssButton);
            
            toggleCssButton.addEventListener('click', () => {
                // CSS切换功能暂时不可用
                console.warn('CSS切换功能暂时不可用');
                Core.showToast(I18n.translate('CSS_LOADER_ERROR', 'CSS切换功能暂时不可用'), 'warning');
            });
        }
    },

    onActivate() {
        // 重新注册操作按钮，防止页面切换后按钮消失
        this.registerActions();
    },

    onDeactivate() {
        // 清理页面操作
        this.ui?.clearPageActions?.('about');
    },
    
    // 打开GitHub链接
    async openGitHubLink() {
        try {
            // 获取GitHub链接
            let githubUrl = "https://github.com/Aurora-Nasa-1/AM" + "MF2";
            
            // 如果模块信息中有GitHub链接，则使用模块信息中的链接
            if (this.moduleInfo.github) {
                githubUrl = this.moduleInfo.github;
            }
            
            // 使用安卓浏览器打开链接
            app.OpenUrl(githubUrl);
            console.log('已打开GitHub链接:', githubUrl);
        } catch (error) {
            console.error('打开GitHub链接失败:', error);
            Core.showToast('打开GitHub链接失败', 'error');
        }
    },
    
    // 打开模块GitHub链接
    async openModuleGitHubLink() {
        try {
            if (!this.moduleInfo.github) {
                Core.showToast('模块未提供GitHub链接', 'warning');
                return;
            }
            
            // 使用安卓浏览器打开链接
            await Core.execCommand(`am start -a android.intent.action.VIEW -d "${this.moduleInfo.github}"`);
            console.log('已打开模块GitHub链接:', this.moduleInfo.github);
        } catch (error) {
            console.error('打开模块GitHub链接失败:', error);
            Core.showToast('打开模块GitHub链接失败', 'error');
        }
    },
    
    // 更新CSS切换按钮状态
    updateCssButtonStatus(button) {
        if (!button) return;
        
        // CSS切换功能暂时不可用，设置默认标题
        const title = I18n.translate('TOGGLE_CSS_CUSTOM', '切换到自定义样式');
        button.setAttribute('title', title);
    }
};