import { Core } from '../core.js';
import { I18n } from '../i18n.js';
import { Modal } from '@components/modal.js';
export const StatusPage = {
    // 配置现在由main.js集中管理，通过模块加载时注入
    config: null,
    
    moduleStatus: 'UNKNOWN',
    refreshTimer: null,
    deviceInfo: {},
    moduleInfo: {},
    version: null,
    logCount: 0,
    currentVersion: '20240503',
    GitHubRepo: 'Aurora-Nasa-1/AMMF',
    latestVersion: null,
    updateAvailable: false,
    updateChecking: false,

    CACHE_KEYS: {
        MODULE_INFO: 'status_module_info',
        DEVICE_INFO: 'status_device_info',
        LOG_COUNT: 'status_log_count'
    },

    CACHE_DURATION: {
        MODULE_INFO: 5 * 60 * 1000,
        DEVICE_INFO: 10 * 60 * 1000,
        LOG_COUNT: 30 * 1000
    },

    async init(ui) {
        this.ui = ui;
        this.registerActions();
        this.boundLanguageHandler = this.onLanguageChanged.bind(this);
        document.addEventListener('languageChanged', this.boundLanguageHandler);
        this.loadCachedData();
        this.loadDataAsync();
        return true;
    },

    loadCachedData() {
        const cachedModuleInfo = this.getCachedData(this.CACHE_KEYS.MODULE_INFO);
        if (cachedModuleInfo) {
            this.moduleInfo = cachedModuleInfo;
            this.version = this.moduleInfo.version || 'Unknown';
        }

        const cachedDeviceInfo = this.getCachedData(this.CACHE_KEYS.DEVICE_INFO);
        if (cachedDeviceInfo) this.deviceInfo = cachedDeviceInfo;

        const cachedLogCount = this.getCachedData(this.CACHE_KEYS.LOG_COUNT);
        if (cachedLogCount !== null) this.logCount = cachedLogCount;
    },

    async loadDataAsync() {
        const tasks = [
            this.loadModuleInfoWithCache(),
            this.loadDeviceInfoWithCache(),
            this.getLogCountWithCache(),
            this.loadModuleStatus()
        ];

        Promise.allSettled(tasks).then(() => this.updatePageIfActive());
        
        setTimeout(() => {
            this.startAutoRefresh();
            this.checkUpdate();
        }, 100);
    },

    async loadModuleInfoWithCache() {
        const cached = this.getCachedData(this.CACHE_KEYS.MODULE_INFO);
        if (cached) {
            this.moduleInfo = cached;
            this.version = this.moduleInfo.version || 'Unknown';
            return;
        }
        await this.loadModuleInfo();
        this.setCachedData(this.CACHE_KEYS.MODULE_INFO, this.moduleInfo);
    },

    async loadModuleInfo() {
        try {
            const configOutput = await Core.execCommand(`cat "${Core.MODULE_PATH}module.prop"`);
            if (configOutput) {
                const config = {};
                configOutput.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        config[parts[0].trim()] = parts.slice(1).join('=').trim();
                    }
                });
                this.moduleInfo = config;
                this.version = config.version || 'Unknown';
            } else {
                this.moduleInfo = {};
                this.version = 'Unknown';
            }
        } catch (error) {
            this.moduleInfo = {};
            this.version = 'Unknown';
        }
    },

    async getLogCountWithCache() {
        const cached = this.getCachedData(this.CACHE_KEYS.LOG_COUNT);
        if (cached !== null) {
            this.logCount = cached;
            return;
        }
        await this.getLogCount();
        this.setCachedData(this.CACHE_KEYS.LOG_COUNT, this.logCount);
    },

    async getLogCount() {
        try {
            const result = await Core.execCommand(`find "${Core.MODULE_PATH}logs/" -type f -name "*.log" | wc -l 2>/dev/null || echo "0"`);
            this.logCount = parseInt(result.trim()) || 0;
        } catch (error) {
            this.logCount = 0;
        }
    },

    async loadDeviceInfoWithCache() {
        const cached = this.getCachedData(this.CACHE_KEYS.DEVICE_INFO);
        if (cached) {
            this.deviceInfo = cached;
            return;
        }
        await this.loadDeviceInfo();
        this.setCachedData(this.CACHE_KEYS.DEVICE_INFO, this.deviceInfo);
    },

    async loadDeviceInfo() {
        try {
            const basicCommands = {
                model: 'getprop ro.product.model',
                android: 'getprop ro.build.version.release',
                kernel: 'uname -r',
                device_abi: 'getprop ro.product.cpu.abi'
            };
            
            const [basicResults, rootInfo] = await Promise.all([
                Core.execCommandsParallelMap(basicCommands),
                this.getRootImplementation()
            ]);
            
            this.deviceInfo = {
                model: basicResults.model?.result?.trim() || 'Unknown',
                android: basicResults.android?.result?.trim() || 'Unknown',
                kernel: basicResults.kernel?.result?.trim() || 'Unknown',
                device_abi: basicResults.device_abi?.result?.trim() || 'Unknown',
                root: rootInfo
            };
        } catch (error) {
            this.deviceInfo = {
                model: await this.getDeviceModel(),
                android: await this.getAndroidVersion(),
                kernel: await this.getKernelVersion(),
                root: await this.getRootImplementation(),
                device_abi: await this.getDeviceABI()
            };
        }
    },

    async getDeviceModel() {
        try {
            const result = await Core.execCommand('getprop ro.product.model');
            return result.trim() || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    },

    async getAndroidVersion() {
        try {
            const result = await Core.execCommand('getprop ro.build.version.release');
            return result.trim() || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    },

    async getDeviceABI() {
        try {
            const result = await Core.execCommand('getprop ro.product.cpu.abi');
            return result.trim() || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    },

    async getKernelVersion() {
        try {
            const result = await Core.execCommand('uname -r');
            return result.trim() || 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    },

    async getRootImplementation() {
        try {
            const rootCommands = {
                magisk_check: '[ -e "/data/adb/magisk" ] && echo "true" || echo "false"',
                magisk_version: 'magisk -v 2>/dev/null || echo "not found"',
                kernelsu: 'ksu -V 2>/dev/null || ksud -V 2>/dev/null || echo "not found"',
                apatch: 'apd -V 2>/dev/null || echo "not found"',
                su_check: 'which su 2>/dev/null || command -v su 2>/dev/null || echo "not found"'
            };
            
            const results = await Core.execCommandsParallelMap(rootCommands);
            let rootInfo = [];
            
            if (results.magisk_check?.result?.trim() === 'true') {
                const magiskVersion = results.magisk_version?.result;
                if (magiskVersion && !magiskVersion.includes('not found')) {
                    const version = magiskVersion.trim().split(':')[0];
                    rootInfo.push(version ? `Magisk ${version}` : 'Magisk');
                } else {
                    rootInfo.push('Magisk');
                }
            }
            
            const ksuResult = results.kernelsu?.result;
            if (ksuResult && !ksuResult.includes('not found')) {
                rootInfo.push(`KernelSU ${ksuResult.trim()}`);
            }
            
            const apatchResult = results.apatch?.result;
            if (apatchResult && !apatchResult.includes('not found')) {
                rootInfo.push(`APatch ${apatchResult.trim()}`);
            }
            
            const suResult = results.su_check?.result;
            if (suResult && !suResult.includes('not found') && !rootInfo.length) {
                rootInfo.push('Root (Unknown)');
            }
            
            return rootInfo.length ? rootInfo.join(' + ') : 'No Root';
        } catch (error) {
            return 'Unknown';
        }
    },

    async loadModuleStatus() {
        try {
            const statusPath = `${Core.MODULE_PATH}status.txt`;
            const statusCommands = {
                file_exists: `[ -f "${statusPath}" ] && echo "true" || echo "false"`,
                status_content: `cat "${statusPath}" 2>/dev/null || echo "UNKNOWN"`,
                process_check: `ps -ef | grep "${Core.MODULE_PATH}service.sh" | grep -v grep | wc -l`
            };
            
            const results = await Core.execCommandsParallelMap(statusCommands);
            
            const fileExists = results.file_exists?.result?.trim() === 'true';
            if (!fileExists) {
                this.moduleStatus = 'UNKNOWN';
                return;
            }
            
            const status = results.status_content?.result?.trim() || 'UNKNOWN';
            if (status === 'UNKNOWN') {
                this.moduleStatus = 'UNKNOWN';
                return;
            }
            
            const processCount = parseInt(results.process_check?.result?.trim() || '0');
            const isRunning = processCount > 0;
            
            if (status === 'RUNNING' && !isRunning) {
                this.moduleStatus = 'STOPPED';
                return;
            }
            
            this.moduleStatus = status;
        } catch (error) {
            this.moduleStatus = 'ERROR';
        }
    },

    registerActions() {
        this.ui.registerPageActions('status', [
            {
                id: 'refresh-status',
                icon: 'refresh',
                title: I18n.translate('REFRESH', '刷新'),
                onClick: 'refreshStatus'
            },
            {
                id: 'run-action',
                icon: 'play_arrow',
                title: I18n.translate('RUN_ACTION', '运行Action'),
                onClick: 'runAction'
            }
        ]);
        this.updateActionButtonTitles();
    },

    async prerender() {
        this.loadCachedData();
        if (this.moduleInfo && Object.keys(this.moduleInfo).length > 0) {
            return this.render();
        }
        
        try {
            await Promise.race([
                Promise.all([
                    this.loadModuleInfo(),
                    this.loadDeviceInfo(),
                    this.getLogCount()
                ]),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            return this.render();
        } catch (e) {
            return this.renderSkeleton();
        }
    },

    renderSkeleton() {
        return `
        <div class="status-page">
            <div class="status-card module-status-card loading">
                <div class="status-card-content">
                    <div class="status-icon-container">
                        <span class="material-symbols-rounded">hourglass_empty</span>
                    </div>
                    <div class="status-info-container">
                        <div class="status-title-row">
                            <span class="status-value">加载中...</span>
                        </div>
                        <div class="status-details">
                            <div class="status-detail-row">版本: --</div>
                            <div class="status-detail-row">最后更新时间: --</div>
                            <div class="status-detail-row">日志数: --</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="status-card device-info-card">
                <div class="device-info-grid">
                    <div class="device-info-item"><span class="device-info-label">设备型号:</span><span class="device-info-value">--</span></div>
                    <div class="device-info-item"><span class="device-info-label">Android版本:</span><span class="device-info-value">--</span></div>
                    <div class="device-info-item"><span class="device-info-label">内核版本:</span><span class="device-info-value">--</span></div>
                    <div class="device-info-item"><span class="device-info-label">架构:</span><span class="device-info-value">--</span></div>
                </div>
            </div>
        </div>`;
    },

    render() {
        return `
        <div class="status-page">
            <div class="update-banner-container">
                ${this.updateAvailable ? this.renderUpdateBanner() : ''}
            </div>
            <div class="status-card module-status-card ${this.getStatusClass()}">
                <div class="status-card-content">
                    <div class="status-icon-container">
                        <span class="material-symbols-rounded">${this.getStatusIcon()}</span>
                    </div>
                    <div class="status-info-container">
                        <div class="status-title-row">
                            <span class="status-value" data-i18n="${this.getStatusI18nKey()}">${this.getStatusText()}</span>
                        </div>
                        <div class="status-details">
                            <div class="status-detail-row">${I18n.translate('VERSION', '版本')}: ${this.version}</div>
                            <div class="status-detail-row">${I18n.translate('UPDATE_TIME', '最后更新时间')}: ${new Date().toLocaleTimeString()}</div>
                            <div class="status-detail-row">${I18n.translate('LOG_COUNT', '日志数')}: ${this.logCount}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="status-card device-info-card">
                <div class="device-info-grid">
                    ${this.renderDeviceInfo()}
                </div>
            </div>
            <!-- Action输出模态窗口 -->
            <div class="action-output-overlay" id="action-output-overlay" style="display: none;">
                <div class="action-output-modal">
                    <div class="action-output-header">
                        <div class="action-output-title">
                            <span class="material-symbols-rounded">terminal</span>
                            <h3>${I18n.translate('ACTION_OUTPUT', 'Action输出')}</h3>
                        </div>
                        <button class="action-close-btn" id="action-close-btn">
                            <span class="material-symbols-rounded">close</span>
                        </button>
                    </div>
                    <div class="action-output-content">
                        <pre id="action-output-text"></pre>
                    </div>
                    <div class="action-output-footer">
                        <button class="action-clear-btn" id="action-clear-btn">
                            <span class="material-symbols-rounded">delete</span>
                            ${I18n.translate('CLEAR_LOGS', '清除日志')}
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async refreshStatus(showToast = false) {
        try {
            const oldStatus = this.moduleStatus;
            const oldDeviceInfo = JSON.stringify(this.deviceInfo);

            await Promise.all([
                this.loadModuleStatus(),
                this.loadModuleInfo(),
                this.loadDeviceInfo(),
                this.getLogCount()
            ]);
            
            this.setCachedData(this.CACHE_KEYS.MODULE_INFO, this.moduleInfo);
            this.setCachedData(this.CACHE_KEYS.DEVICE_INFO, this.deviceInfo);
            this.setCachedData(this.CACHE_KEYS.LOG_COUNT, this.logCount);

            const newDeviceInfo = JSON.stringify(this.deviceInfo);
            if (oldStatus !== this.moduleStatus || oldDeviceInfo !== newDeviceInfo) {
                const statusPage = document.querySelector('.status-page');
                if (statusPage) {
                    statusPage.innerHTML = this.render();
                    this.afterRender();
                }
            }

            if (showToast) {
                Core.showToast(I18n.translate('STATUS_REFRESHED', '状态已刷新'));
            }
        } catch (error) {
            if (showToast) {
                Core.showToast(I18n.translate('STATUS_REFRESH_ERROR', '刷新状态失败'), 'error');
            }
        }
    },

    afterRender() {
        const refreshBtn = document.getElementById('refresh-status');
        const actionBtn = document.getElementById('run-action');

        if (refreshBtn && !refreshBtn.dataset.bound) {
            refreshBtn.addEventListener('click', () => this.refreshStatus(true));
            refreshBtn.dataset.bound = 'true';
        }

        if (actionBtn && !actionBtn.dataset.bound) {
            actionBtn.addEventListener('click', () => this.runAction());
            actionBtn.dataset.bound = 'true';
        }
    },

    getStatusI18nKey() {
        const statusMap = {
            'RUNNING': 'RUNNING',
            'STOPPED': 'STOPPED',
            'ERROR': 'ERROR',
            'PAUSED': 'PAUSED',
            'NORMAL_EXIT': 'NORMAL_EXIT'
        };
        return statusMap[this.moduleStatus] || 'UNKNOWN';
    },

    getStatusClass() {
        const classMap = {
            'RUNNING': 'running',
            'STOPPED': 'stopped',
            'ERROR': 'error',
            'PAUSED': 'paused',
            'NORMAL_EXIT': 'normal-exit'
        };
        return classMap[this.moduleStatus] || 'unknown';
    },

    getStatusIcon() {
        const iconMap = {
            'RUNNING': 'play_circle',
            'STOPPED': 'stop_circle',
            'ERROR': 'error',
            'PAUSED': 'pause_circle',
            'NORMAL_EXIT': 'check_circle'
        };
        return iconMap[this.moduleStatus] || 'help';
    },

    getStatusText() {
        const textMap = {
            'RUNNING': I18n.translate('RUNNING', '运行中'),
            'STOPPED': I18n.translate('STOPPED', '已停止'),
            'ERROR': I18n.translate('ERROR', '错误'),
            'PAUSED': I18n.translate('PAUSED', '已暂停'),
            'NORMAL_EXIT': I18n.translate('NORMAL_EXIT', '正常退出')
        };
        return textMap[this.moduleStatus] || I18n.translate('UNKNOWN', '未知');
    },

    renderDeviceInfo() {
        if (!this.deviceInfo || Object.keys(this.deviceInfo).length === 0) {
            return `<div class="no-info" data-i18n="NO_DEVICE_INFO">无设备信息</div>`;
        }

        const infoItems = [
            { key: 'model', label: 'DEVICE_MODEL', icon: 'smartphone' },
            { key: 'android', label: 'ANDROID_VERSION', icon: 'android' },
            { key: 'device_abi', label: 'DEVICE_ABI', icon: 'architecture' },
            { key: 'kernel', label: 'KERNEL_VERSION', icon: 'terminal' },
            { key: 'root', label: 'ROOT_IMPLEMENTATION', icon: 'security' }
        ];

        let html = '';
        infoItems.forEach(item => {
            if (this.deviceInfo[item.key]) {
                html += `
                    <div class="device-info-item">
                        <div class="device-info-icon">
                            <span class="material-symbols-rounded">${item.icon}</span>
                        </div>
                        <div class="device-info-content">
                            <div class="device-info-label" data-i18n="${item.label}">${I18n.translate(item.label, item.key)}</div>
                            <div class="device-info-value">${this.deviceInfo[item.key]}</div>
                        </div>
                    </div>`;
            }
        });

        return html || `<div class="no-info" data-i18n="NO_DEVICE_INFO">无设备信息</div>`;
    },

    startAutoRefresh() {
        if (this.refreshTimer) clearInterval(this.refreshTimer);
        this.refreshTimer = setInterval(() => this.refreshStatus(), 60000);
    },

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    },

    onLanguageChanged() {
        this.updateActionButtonTitles();
        this.updatePageContent();
    },

    updatePageContent() {
        const statusPage = document.querySelector('.status-page');
        if (statusPage) {
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                if (key) element.textContent = I18n.translate(key, element.textContent);
            });
        }
    },

    onDeactivate() {
        if (this.boundLanguageHandler) {
            document.removeEventListener('languageChanged', this.boundLanguageHandler);
        }
        this.stopAutoRefresh();
        this.ui.clearPageActions('status');
    },

    updateActionButtonTitles() {
        const refreshBtn = document.getElementById('refresh-status');
        const actionBtn = document.getElementById('run-action');
        
        if (refreshBtn) refreshBtn.title = I18n.translate('REFRESH', '刷新');
        if (actionBtn) actionBtn.title = I18n.translate('RUN_ACTION', '运行Action');
    },

    onActivate() {
        this.startAutoRefresh();
        // 重新注册操作按钮，防止页面切换后按钮消失
        this.registerActions();
        if (!this.moduleStatus || Object.keys(this.deviceInfo).length === 0) {
            setTimeout(() => this.refreshStatus(), 100);
        }
    },

    getCachedData(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const now = Date.now();
            
            let duration;
            if (key.includes('MODULE_INFO')) {
                duration = this.CACHE_DURATION.MODULE_INFO;
            } else if (key.includes('DEVICE_INFO')) {
                duration = this.CACHE_DURATION.DEVICE_INFO;
            } else if (key.includes('LOG_COUNT')) {
                duration = this.CACHE_DURATION.LOG_COUNT;
            } else {
                duration = 5 * 60 * 1000;
            }
            
            if (data.timestamp && (now - data.timestamp) < duration) {
                return data.value;
            }
            
            sessionStorage.removeItem(key);
            return null;
        } catch (error) {
            return null;
        }
    },

    setCachedData(key, value) {
        try {
            const data = { value: value, timestamp: Date.now() };
            sessionStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            // Ignore cache errors
        }
    },

    clearCache() {
        Object.values(this.CACHE_KEYS).forEach(key => {
            sessionStorage.removeItem(key);
        });
    },

    updatePageIfActive() {
        if (this.ui?.router?.currentPage === 'status') {
            const statusPage = document.querySelector('.status-page');
            if (statusPage) this.updatePageContent();
        }
    },

    async checkUpdate() {
        if (this.updateChecking) return;
        this.updateChecking = true;
    
        try {
            const versionInfo = await this.getLatestVersion();
            
            if (versionInfo) {
                this.latestVersion = versionInfo;
                this.updateAvailable = parseInt(versionInfo.formattedDate) > parseInt(this.currentVersion);
                this.updateError = null;
            } else {
                this.updateAvailable = false;
                this.updateError = null;
            }
    
            window.dispatchEvent(new CustomEvent('updateCheckComplete', {
                detail: { available: this.updateAvailable, version: this.latestVersion }
            }));
        } catch (error) {
            this.updateAvailable = false;
            this.updateError = error.message;
        } finally {
            this.updateChecking = false;
            const updateBannerContainer = document.querySelector('.update-banner-container');
            if (updateBannerContainer) {
                updateBannerContainer.innerHTML = this.renderUpdateBanner();
            }
        }
    },

    renderUpdateBanner() {
        if (this.updateChecking) {
            return `
                <div class="update-banner checking">
                    <div class="update-info">
                        <div class="update-icon">
                            <span class="material-symbols-rounded rotating">sync</span>
                        </div>
                        <div class="update-text">
                            <div class="update-title">${I18n.translate('CHECKING_UPDATE', '正在检查更新...')}</div>
                        </div>
                    </div>
                </div>`;
        }

        if (this.updateError) {
            return `
                <div class="update-banner error">
                    <div class="update-info">
                        <div class="update-icon">
                            <span class="material-symbols-rounded">error</span>
                        </div>
                        <div class="update-text">
                            <div class="update-title">${I18n.translate('UPDATE_CHECK_FAILED', '检查更新失败')}</div>
                            <div class="update-subtitle">${this.updateError}</div>
                        </div>
                    </div>
                </div>`;
        }

        if (this.updateAvailable) {
            return `
                <div class="update-banner available">
                    <div class="update-info">
                        <div class="update-icon">
                            <span class="material-symbols-rounded">system_update</span>
                        </div>
                        <div class="update-text">
                            <div class="update-title">${I18n.translate('UPDATE_AVAILABLE', '有新版本可用')}</div>
                            <div class="update-version">
                                <span class="version-tag">${this.latestVersion.tagName}</span>
                                <span class="version-date">${this.formatDate(this.latestVersion.formattedDate)}</span>
                            </div>
                        </div>
                    </div>
                    <button class="update-button md3-button" onclick="app.OpenUrl('https://github.com/${this.GitHubRepo}/releases/latest', '_blank')">
                        <span class="material-symbols-rounded">open_in_new</span>
                        <span>${I18n.translate('VIEW_UPDATE', '查看更新')}</span>
                    </button>
                </div>`;
        }

        return '';
    },

    formatDate(dateString) {
        if (!dateString || dateString.length !== 8) return dateString;
        const year = dateString.substring(2, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${year}/${month}/${day}`;
    },

    // 刷新状态页面数据
    async refreshStatus() {
        try {
            // 清除缓存
            this.clearCache();
            
            // 显示加载状态
            const statusPage = document.querySelector('.status-page');
            if (statusPage) {
                statusPage.classList.add('loading');
            }
            
            // 重新加载所有数据
            await Promise.all([
                this.loadModuleInfo(),
                this.loadDeviceInfo(),
                this.getLogCount(),
                this.loadModuleStatus()
            ]);
            
            // 更新缓存
            this.setCachedData(this.CACHE_KEYS.MODULE_INFO, this.moduleInfo);
            this.setCachedData(this.CACHE_KEYS.DEVICE_INFO, this.deviceInfo);
            this.setCachedData(this.CACHE_KEYS.LOG_COUNT, this.logCount);
            
            // 更新页面内容
            this.updatePageContent();
            
            // 移除加载状态
            if (statusPage) {
                statusPage.classList.remove('loading');
            }
            
            // 显示成功提示
            if (typeof Core !== 'undefined' && Core.showToast) {
                Core.showToast(I18n.translate('STATUS_REFRESHED', '状态已刷新'), 'success');
            }
        } catch (error) {
            console.error('刷新状态失败:', error);
            if (typeof Core !== 'undefined' && Core.showToast) {
                Core.showToast(I18n.translate('REFRESH_FAILED', '刷新失败'), 'error');
            }
        }
    },

    // 运行Action
    async runAction() {
        try {
            // 显示确认对话框
            const confirmed = await this.showConfirmDialog(
                I18n.translate('RUN_ACTION_CONFIRM', '确认运行Action'),
                I18n.translate('RUN_ACTION_CONFIRM_MSG', '这将执行模块的主要功能，是否继续？')
            );
            
            if (!confirmed) return;
            
            // 显示输出容器
            this.showActionOutput();
            
            // 显示执行中状态
            this.appendActionOutput(I18n.translate('ACTION_RUNNING', '正在执行Action...') + '\n');
            if (typeof Core !== 'undefined' && Core.showToast) {
                Core.showToast(I18n.translate('ACTION_RUNNING', '正在执行Action...'), 'info');
            }
            
            // 执行Action命令
            Core.execCommand(`chmod 755 "${Core.MODULE_PATH}action.sh"`);
            const result = await Core.execCommand(`sh "${Core.MODULE_PATH}action.sh"`);
            
            if (result) {
                // 显示输出结果
                this.appendActionOutput('\n' + I18n.translate('ACTION_OUTPUT_RESULT', '执行结果:') + '\n');
                this.appendActionOutput(result + '\n');
                
                // 执行成功
                this.appendActionOutput('\n' + I18n.translate('ACTION_SUCCESS', 'Action执行成功') + '\n');
                if (typeof Core !== 'undefined' && Core.showToast) {
                    Core.showToast(I18n.translate('ACTION_SUCCESS', 'Action执行成功'), 'success');
                }
                
                // 刷新状态
                setTimeout(() => {
                    this.refreshStatus();
                }, 1000);
            } else {
                this.appendActionOutput('\n' + I18n.translate('ACTION_FAILED', 'Action执行失败') + '\n');
                throw new Error('Action执行失败');
            }
        } catch (error) {
            console.error('运行Action失败:', error);
            this.appendActionOutput('\n' + I18n.translate('ACTION_ERROR', '错误:') + ' ' + error.message + '\n');
            if (typeof Core !== 'undefined' && Core.showToast) {
                Core.showToast(I18n.translate('ACTION_FAILED', 'Action执行失败'), 'error');
            }
        }
    },

    // 显示Action输出模态窗口
    showActionOutput() {
        const outputOverlay = document.getElementById('action-output-overlay');
        if (outputOverlay) {
            outputOverlay.style.display = 'flex';
            // 添加事件监听器
            this.setupActionOutputEvents();
            // 防止body滚动
            document.body.style.overflow = 'hidden';
        }
    },

    // 添加Action输出内容
    appendActionOutput(text) {
        const outputText = document.getElementById('action-output-text');
        if (outputText) {
            outputText.textContent += text;
            // 滚动到底部
            outputText.scrollTop = outputText.scrollHeight;
        }
    },

    // 隐藏Action输出模态窗口
    hideActionOutput() {
        const outputOverlay = document.getElementById('action-output-overlay');
        if (outputOverlay) {
            outputOverlay.style.display = 'none';
            // 恢复body滚动
            document.body.style.overflow = '';
        }
    },

    // 清除Action输出内容
    clearActionOutput() {
        const outputText = document.getElementById('action-output-text');
        if (outputText) {
            outputText.textContent = '';
        }
    },

    // 设置Action输出事件监听器
    setupActionOutputEvents() {
        const closeBtn = document.getElementById('action-close-btn');
        const clearBtn = document.getElementById('action-clear-btn');
        const overlay = document.getElementById('action-output-overlay');
        
        // 关闭按钮事件
        if (closeBtn) {
            closeBtn.onclick = () => this.hideActionOutput();
        }
        
        // 清除按钮事件
        if (clearBtn) {
            clearBtn.onclick = () => this.clearActionOutput();
        }
        
        // 点击遮罩层关闭
        if (overlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    this.hideActionOutput();
                }
            };
        }
        
        // ESC键关闭
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hideActionOutput();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // 显示确认对话框
    async showConfirmDialog(title, message) {
        return new Promise((resolve) => {
            if (typeof Modal !== 'undefined') {
                Modal.confirm({
                    title: title,
                    content: message,
                    onConfirm: () => resolve(true),
                    onCancel: () => resolve(false)
                });
            } else {
                // 降级到原生确认对话框
                resolve(confirm(`${title}\n\n${message}`));
            }
        });
    },

    async getLatestVersion() {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                const response = await fetch(`https://api.github.com/repos/${this.GitHubRepo}/releases/latest`);
                if (!response.ok) throw new Error(`GitHub API请求失败: ${response.status}`);

                const data = await response.json();
                const tagName = data.tag_name;
                const publishDate = new Date(data.published_at);
                const formattedDate = publishDate.getFullYear() +
                    String(publishDate.getMonth() + 1).padStart(2, '0') +
                    String(publishDate.getDate()).padStart(2, '0');
                return { tagName, formattedDate };
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) return null;
                await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 5000)));
            }
        }
        return null;
    }
};