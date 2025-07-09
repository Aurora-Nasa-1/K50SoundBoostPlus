/**
 * AMMF WebUI 核心功能模块
 * 提供Shell命令执行能力
 * 支持KernelSU和MMRL WebUI X
 */

export const Core = {
    // 模块路径
    MODULE_PATH: '/data/adb/modules/AMMF/',

    // 检测运行环境
    getEnvironment() {
        if (typeof ksu !== 'undefined') {
            return 'kernelsu';
        } else if (typeof mmrl !== 'undefined') {
            return 'mmrl';
        } else if (this._getModuleInterface()) {
            return 'mmrl-webui-x';
        } else {
            return 'unknown';
        }
    },

    // 获取MMRL WebUI X的ModuleInterface实例
    _getModuleInterface() {
        // 检查是否存在模块接口（格式：$module_id）
        const moduleKeys = Object.keys(window).filter(key => key.startsWith('$') && key !== '$');
        return moduleKeys.length > 0 ? window[moduleKeys[0]] : null;
    },

    // 获取MMRL WebUI X的FileInterface实例
    _getFileInterface() {
        return window.$BiFile || null;
    },

    // 获取MMRL WebUI X的FileInputInterface实例
    _getFileInputInterface() {
        return window.$BiFileInputStream || null;
    },

    // 获取MMRL WebUI X的ApplicationInterface实例
    _getApplicationInterface() {
        return window.webui || null;
    },

    // 获取MMRL WebUI X的UserManagerInterface实例
    _getUserManagerInterface() {
        return window.$userManager || null;
    },

    // 获取MMRL WebUI X的PackageManagerInterface实例
    _getPackageManagerInterface() {
        return window.$packageManager || null;
    },

    // 检查是否支持Shell命令执行
    isShellSupported() {
        const env = this.getEnvironment();
        return env === 'kernelsu' || env === 'mmrl' || env === 'mmrl-webui-x';
    },

    // 检查是否支持文件操作
    isFileSupported() {
        const env = this.getEnvironment();
        return env === 'mmrl-webui-x' && this._getFileInterface() !== null;
    },

    // 检查是否支持文件流操作
    isFileStreamSupported() {
        const env = this.getEnvironment();
        return env === 'mmrl-webui-x' && this._getFileInputInterface() !== null;
    },

    // 执行Shell命令
    async execCommand(command) {
        const env = this.getEnvironment();
        
        if (!this.isShellSupported()) {
            throw new Error('Shell execution not supported in current environment');
        }
        
        const callbackName = `exec_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return new Promise((resolve, reject) => {
            window[callbackName] = (errno, stdout, stderr) => {
                delete window[callbackName];
                errno === 0 ? resolve(stdout) : reject(stderr);
            };
            
            // 根据环境选择合适的API
            if (env === 'kernelsu') {
                ksu.exec(command, "{}", callbackName);
            } else if (env === 'mmrl') {
                // MMRL WebUI X API调用
                mmrl.exec(command, "{}", callbackName);
            }
        });
    },

    // 并行执行多个Shell命令
    async execCommandsParallel(commands) {
        if (!Array.isArray(commands)) {
            throw new Error('Commands must be an array');
        }
        
        const promises = commands.map(command => {
            if (typeof command === 'string') {
                return this.execCommand(command);
            } else if (command && typeof command.command === 'string') {
                // 支持带标识的命令对象 {id: 'identifier', command: 'shell command'}
                return this.execCommand(command.command).then(result => ({
                    id: command.id,
                    result: result
                })).catch(error => ({
                    id: command.id,
                    error: error
                }));
            } else {
                return Promise.reject(new Error('Invalid command format'));
            }
        });
        
        return Promise.allSettled(promises);
    },

    // 并行执行命令并返回结果映射
    async execCommandsParallelMap(commandMap) {
        if (typeof commandMap !== 'object' || commandMap === null) {
            throw new Error('Command map must be an object');
        }
        
        const commands = Object.entries(commandMap).map(([key, command]) => ({
            id: key,
            command: command
        }));
        
        const results = await this.execCommandsParallel(commands);
        const resultMap = {};
        
        results.forEach((result, index) => {
            const key = commands[index].id;
            if (result.status === 'fulfilled') {
                if (result.value.error) {
                    resultMap[key] = { error: result.value.error };
                } else {
                    resultMap[key] = { result: result.value.result };
                }
            } else {
                resultMap[key] = { error: result.reason };
            }
        });
        
        return resultMap;
    },
    /**
     * 显示Toast消息
     * @param {string} message - 要显示的消息文本
     * @param {string} type - 消息类型 ('info', 'success', 'warning', 'error')
     * @param {number} duration - 消息显示时长 (毫秒)
     */
    showToast(message, type = 'info', duration = 3000) {
        const env = this.getEnvironment();
        
        // 优先使用MMRL原生Toast
        if (env === 'mmrl' && typeof mmrl !== 'undefined' && mmrl.toast) {
            mmrl.toast(message, type, duration);
            return;
        }
        
        // 回退到自定义Toast实现
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            console.error('Toast container not found!');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');

            setTimeout(() => {
                if (toast.parentElement === toastContainer) {
                    toastContainer.removeChild(toast);
                }
            }, 150);
        }, duration);
    },

    // ==================== 文件操作 API ====================

    /**
     * 读取文件内容
     * @param {string} path - 文件路径
     * @returns {string|null} 文件内容或null
     */
    async readFile(path) {
        const env = this.getEnvironment();
        
        if (env === 'mmrl-webui-x' && this.isFileSupported()) {
            // MMRL WebUI X 原生文件操作
            const fileInterface = this._getFileInterface();
            return fileInterface.read(path);
        } else if (env === 'kernelsu' || env === 'mmrl') {
            // KernelSU/MMRL Shell实现
            try {
                const result = await this.execCommand(`cat "${path}"`);
                return result;
            } catch (error) {
                console.error('Failed to read file via shell:', error);
                return null;
            }
        } else {
            throw new Error('File operations not supported in current environment');
        }
    },

    /**
     * 写入文件内容
     * @param {string} path - 文件路径
     * @param {string} data - 要写入的数据
     */
    async writeFile(path, data) {
        const env = this.getEnvironment();
        
        if (env === 'mmrl-webui-x' && this.isFileSupported()) {
            // MMRL WebUI X 原生文件操作
            const fileInterface = this._getFileInterface();
            fileInterface.write(path, data);
        } else if (env === 'kernelsu' || env === 'mmrl') {
            // KernelSU/MMRL Shell实现
            try {
                // 使用echo写入文件，处理特殊字符
                const escapedData = data.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
                await this.execCommand(`echo "${escapedData}" > "${path}"`);
            } catch (error) {
                console.error('Failed to write file via shell:', error);
                throw error;
            }
        } else {
            throw new Error('File operations not supported in current environment');
        }
    },

    /**
     * 写入二进制文件
     * @param {string} path - 文件路径
     * @param {number[]} data - 字节数组
     */
    writeFileBytes(path, data) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        fileInterface.writeBytes(path, data);
    },

    /**
     * 读取文件为Base64格式
     * @param {string} path - 文件路径
     * @returns {string|null} Base64编码的内容或null
     */
    readFileAsBase64(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.readAsBase64(path);
    },

    /**
     * 列出目录内容
     * @param {string} path - 目录路径
     * @param {string} delimiter - 分隔符（可选）
     * @returns {string|null} 目录内容或null
     */
    listDirectory(path, delimiter = '\n') {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.list(path, delimiter);
    },

    /**
     * 获取文件或目录大小
     * @param {string} path - 文件或目录路径
     * @param {boolean} recursive - 是否递归计算子目录大小
     * @returns {number} 大小（字节）
     */
    getFileSize(path, recursive = false) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.size(path, recursive);
    },

    /**
     * 获取文件或目录元数据
     * @param {string} path - 文件或目录路径
     * @param {boolean} total - 是否包含额外元数据
     * @returns {number} 元数据的数值表示
     */
    getFileStat(path, total = false) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.stat(path, total);
    },

    /**
     * 删除文件或目录
     * @param {string} path - 文件或目录路径
     * @returns {boolean} 是否删除成功
     */
    deleteFile(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.delete(path);
    },

    /**
     * 检查文件或目录是否存在
     * @param {string} path - 文件或目录路径
     * @returns {boolean} 是否存在
     */
    async fileExists(path) {
        const env = this.getEnvironment();
        
        if (env === 'mmrl-webui-x' && this.isFileSupported()) {
            // MMRL WebUI X 原生文件操作
            const fileInterface = this._getFileInterface();
            return fileInterface.exists(path);
        } else if (env === 'kernelsu' || env === 'mmrl') {
            // KernelSU/MMRL Shell实现
            try {
                await this.execCommand(`test -e "${path}"`);
                return true;
            } catch (error) {
                return false;
            }
        } else {
            throw new Error('File operations not supported in current environment');
        }
    },

    /**
     * 检查路径是否为目录
     * @param {string} path - 路径
     * @returns {boolean} 是否为目录
     */
    isDirectory(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.isDirectory(path);
    },

    /**
     * 检查路径是否为文件
     * @param {string} path - 路径
     * @returns {boolean} 是否为文件
     */
    isFile(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.isFile(path);
    },

    /**
     * 检查路径是否为符号链接
     * @param {string} path - 路径
     * @returns {boolean} 是否为符号链接
     */
    isSymLink(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.isSymLink(path);
    },

    /**
     * 创建目录
     * @param {string} path - 目录路径
     * @returns {boolean} 是否创建成功
     */
    createDirectory(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.mkdir(path);
    },

    /**
     * 创建目录及其父目录
     * @param {string} path - 目录路径
     * @returns {boolean} 是否创建成功
     */
    createDirectories(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.mkdirs(path);
    },

    /**
     * 创建新文件
     * @param {string} path - 文件路径
     * @returns {boolean} 是否创建成功
     */
    createNewFile(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.createNewFile(path);
    },

    /**
     * 重命名文件或目录
     * @param {string} target - 当前路径
     * @param {string} dest - 新路径
     * @returns {boolean} 是否重命名成功
     */
    renameFile(target, dest) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.renameTo(target, dest);
    },

    /**
     * 复制文件或目录
     * @param {string} path - 源路径
     * @param {string} target - 目标路径
     * @param {boolean} overwrite - 是否覆盖已存在的文件
     * @returns {boolean} 是否复制成功
     */
    copyFile(path, target, overwrite = false) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.copyTo(path, target, overwrite);
    },

    /**
     * 检查文件是否可执行
     * @param {string} path - 文件路径
     * @returns {boolean} 是否可执行
     */
    canExecute(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.canExecute(path);
    },

    /**
     * 检查文件是否可写
     * @param {string} path - 文件路径
     * @returns {boolean} 是否可写
     */
    canWrite(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.canWrite(path);
    },

    /**
     * 检查文件是否可读
     * @param {string} path - 文件路径
     * @returns {boolean} 是否可读
     */
    canRead(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.canRead(path);
    },

    /**
     * 检查文件是否隐藏
     * @param {string} path - 文件路径
     * @returns {boolean} 是否隐藏
     */
    isHidden(path) {
        if (!this.isFileSupported()) {
            throw new Error('File operations not supported in current environment');
        }
        const fileInterface = this._getFileInterface();
        return fileInterface.isHidden(path);
    },

    // ==================== MMRL WebUI X 文件流操作 API ====================

    /**
     * 打开文件流进行读取
     * @param {string} path - 文件路径
     * @returns {Object|null} 文件流对象或null
     */
    openFileStream(path) {
        if (!this.isFileStreamSupported()) {
            throw new Error('File stream operations not supported in current environment');
        }
        const fileInputInterface = this._getFileInputInterface();
        return fileInputInterface.open(path);
    },

    // ==================== MMRL WebUI X ModuleInterface API ====================

    /**
     * 获取窗口顶部安全区域
     * @returns {number} 顶部安全区域像素值
     */
    getWindowTopInset() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getWindowTopInset !== 'function') {
            return 0;
        }
        return moduleInterface.getWindowTopInset();
    },

    /**
     * 获取窗口底部安全区域
     * @returns {number} 底部安全区域像素值
     */
    getWindowBottomInset() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getWindowBottomInset !== 'function') {
            return 0;
        }
        return moduleInterface.getWindowBottomInset();
    },

    /**
     * 获取窗口左侧安全区域
     * @returns {number} 左侧安全区域像素值
     */
    getWindowLeftInset() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getWindowLeftInset !== 'function') {
            return 0;
        }
        return moduleInterface.getWindowLeftInset();
    },

    /**
     * 获取窗口右侧安全区域
     * @returns {number} 右侧安全区域像素值
     */
    getWindowRightInset() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getWindowRightInset !== 'function') {
            return 0;
        }
        return moduleInterface.getWindowRightInset();
    },

    /**
     * 检查是否为浅色导航栏
     * @returns {boolean} 是否为浅色导航栏
     */
    isLightNavigationBars() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.isLightNavigationBars !== 'function') {
            return false;
        }
        return moduleInterface.isLightNavigationBars();
    },

    /**
     * 检查是否为暗色模式
     * @returns {boolean} 是否为暗色模式
     */
    isDarkMode() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.isDarkMode !== 'function') {
            return false;
        }
        return moduleInterface.isDarkMode();
    },

    /**
     * 设置导航栏颜色模式
     * @param {boolean} isLight - 是否为浅色模式
     */
    setLightNavigationBars(isLight) {
        const moduleInterface = this._getModuleInterface();
        if (moduleInterface && typeof moduleInterface.setLightNavigationBars === 'function') {
            moduleInterface.setLightNavigationBars(isLight);
        }
    },

    /**
     * 检查是否为浅色状态栏
     * @returns {boolean} 是否为浅色状态栏
     */
    isLightStatusBars() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.isLightStatusBars !== 'function') {
            return false;
        }
        return moduleInterface.isLightStatusBars();
    },

    /**
     * 设置状态栏颜色模式
     * @param {boolean} isLight - 是否为浅色模式
     */
    setLightStatusBars(isLight) {
        const moduleInterface = this._getModuleInterface();
        if (moduleInterface && typeof moduleInterface.setLightStatusBars === 'function') {
            moduleInterface.setLightStatusBars(isLight);
        }
    },

    /**
     * 获取Android SDK版本
     * @returns {number} SDK版本号
     */
    getSdk() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getSdk !== 'function') {
            return 0;
        }
        return moduleInterface.getSdk();
    },

    /**
     * 分享文本
     * @param {string} text - 要分享的文本
     * @param {string} type - 分享类型（可选）
     */
    shareText(text, type = null) {
        const moduleInterface = this._getModuleInterface();
        if (moduleInterface && typeof moduleInterface.shareText === 'function') {
            if (type) {
                moduleInterface.shareText(text, type);
            } else {
                moduleInterface.shareText(text);
            }
        }
    },

    /**
     * 获取重组次数
     * @returns {number} 重组次数
     */
    getRecomposeCount() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.getRecomposeCount !== 'function') {
            return 0;
        }
        return moduleInterface.getRecomposeCount();
    },

    /**
     * 重新加载整个WebUI
     */
    recompose() {
        const moduleInterface = this._getModuleInterface();
        if (moduleInterface && typeof moduleInterface.recompose === 'function') {
            moduleInterface.recompose();
        }
    },

    /**
     * 创建快捷方式
     * @param {string} title - 快捷方式标题（可选）
     * @param {string} icon - 快捷方式图标（可选）
     */
    createShortcut(title = null, icon = null) {
        const moduleInterface = this._getModuleInterface();
        if (moduleInterface && typeof moduleInterface.createShortcut === 'function') {
            if (title || icon) {
                moduleInterface.createShortcut(title, icon);
            } else {
                moduleInterface.createShortcut();
            }
        }
    },

    /**
     * 检查是否已有快捷方式
     * @returns {boolean} 是否已有快捷方式
     */
    hasShortcut() {
        const moduleInterface = this._getModuleInterface();
        if (!moduleInterface || typeof moduleInterface.hasShortcut !== 'function') {
            return false;
        }
        return moduleInterface.hasShortcut();
    },

    /**
     * 获取环境信息
     * @returns {Object} 环境详细信息
     */
    getEnvironmentInfo() {
        const env = this.getEnvironment();
        const info = {
            environment: env,
            shellSupported: this.isShellSupported(),
            fileSupported: this.isFileSupported(),
            fileStreamSupported: this.isFileStreamSupported(),
            features: {
                execCommand: this.isShellSupported(),
                showToast: true,
                fileOperations: this.isFileSupported(),
                fileStreams: this.isFileStreamSupported(),
                windowInsets: env === 'mmrl-webui-x',
                themeDetection: env === 'mmrl-webui-x',
                systemIntegration: env === 'mmrl-webui-x'
            }
        };

        if (env === 'kernelsu') {
            info.ksu = {
                available: typeof window.ksu !== 'undefined',
                version: window.ksu?.version || 'unknown'
            };
        } else if (env === 'mmrl') {
            info.mmrl = {
                available: typeof window.mmrl !== 'undefined',
                version: window.mmrl?.version || 'unknown'
            };
        } else if (env === 'mmrl-webui-x') {
            const moduleInterface = this._getModuleInterface();
            const fileInterface = this._getFileInterface();
            const fileInputInterface = this._getFileInputInterface();
            
            info.mmrlWebUIX = {
                moduleInterface: {
                    available: !!moduleInterface,
                    methods: moduleInterface ? Object.getOwnPropertyNames(Object.getPrototypeOf(moduleInterface)).filter(name => name !== 'constructor') : []
                },
                fileInterface: {
                    available: !!fileInterface,
                    methods: fileInterface ? Object.getOwnPropertyNames(Object.getPrototypeOf(fileInterface)).filter(name => name !== 'constructor') : []
                },
                fileInputInterface: {
                    available: !!fileInputInterface,
                    methods: fileInputInterface ? Object.getOwnPropertyNames(Object.getPrototypeOf(fileInputInterface)).filter(name => name !== 'constructor') : []
                }
            };
            
            // 添加API支持信息
            info.fileSupported = this.isFileSupported();
            info.fileStreamSupported = this.isFileStreamSupported();
            info.applicationSupported = this._getApplicationInterface() !== null;
            info.userManagerSupported = this._getUserManagerInterface() !== null;
            info.packageManagerSupported = this._getPackageManagerInterface() !== null;
            
            // 详细的API方法列表
            info.availableAPIs = {
                ModuleInterface: [
                    'getWindowTopInset', 'isDarkMode', 'setLightNavigationBars',
                    'getSdk', 'shareText', 'recompose', 'createShortcut'
                ],
                FileInterface: [
                    'readFile', 'writeFile', 'deleteFile', 'listDirectory',
                    'getFileSize', 'fileExists', 'createDirectory', 'renameFile',
                    'copyFile', 'canExecute', 'canWrite', 'canRead', 'isHidden'
                ],
                FileInputInterface: [
                    'openFileStream'
                ],
                ApplicationInterface: [
                    'getCurrentRootManager', 'getCurrentApplication', 'getApplication'
                ],
                UserManagerInterface: [
                    'getUsers', 'getUserInfo'
                ],
                PackageManagerInterface: [
                    'getPackageUid', 'getApplicationIcon', 'getInstalledPackages', 'getApplicationInfo'
                ]
            };
        }
        
        // 添加Shell文件系统操作支持信息
        if (env === 'kernelsu' || env === 'mmrl') {
            info.shellFileSystemSupported = true;
            info.availableShellAPIs = [
                'listDirectoryShell', 'createDirectoryShell', 'deleteFileShell',
                'copyFileShell', 'moveFileShell', 'getFilePermissionsShell',
                'setFilePermissionsShell', 'getFileTypeShell'
            ];
        }

        return info;
    },

    // ==================== MMRL WebUI X ApplicationInterface API ====================

    /**
     * 获取当前Root管理器应用信息
     * @returns {Object|null} Root管理器应用信息
     */
    getCurrentRootManager() {
        const appInterface = this._getApplicationInterface();
        if (!appInterface || typeof appInterface.getCurrentRootManager !== 'function') {
            return null;
        }
        return appInterface.getCurrentRootManager();
    },

    /**
     * 获取当前应用信息
     * @returns {Object|null} 当前应用信息
     */
    getCurrentApplication() {
        const appInterface = this._getApplicationInterface();
        if (!appInterface || typeof appInterface.getCurrentApplication !== 'function') {
            return null;
        }
        return appInterface.getCurrentApplication();
    },

    /**
     * 根据包名获取应用信息
     * @param {string} packageName - 应用包名
     * @returns {Object|null} 应用信息
     */
    getApplication(packageName) {
        const appInterface = this._getApplicationInterface();
        if (!appInterface || typeof appInterface.getApplication !== 'function') {
            return null;
        }
        return appInterface.getApplication(packageName);
    },

    // ==================== MMRL WebUI X UserManagerInterface API ====================

    /**
     * 获取系统用户列表
     * @returns {Array|null} 用户列表
     */
    getUsers() {
        const userManager = this._getUserManagerInterface();
        if (!userManager || typeof userManager.getUsers !== 'function') {
            return null;
        }
        try {
            const usersJson = userManager.getUsers();
            return JSON.parse(usersJson);
        } catch (error) {
            console.error('Failed to parse users JSON:', error);
            return null;
        }
    },

    /**
     * 根据用户ID获取用户信息
     * @param {number} userId - 用户ID
     * @returns {Object|null} 用户信息
     */
    getUserInfo(userId) {
        const userManager = this._getUserManagerInterface();
        if (!userManager || typeof userManager.getUserInfo !== 'function') {
            return null;
        }
        return userManager.getUserInfo(userId);
    },

    // ==================== MMRL WebUI X PackageManagerInterface API ====================

    /**
     * 获取应用包的UID
     * @param {string} packageName - 包名
     * @param {number} flags - 标志位
     * @param {number} userId - 用户ID
     * @returns {number} 包的UID
     */
    getPackageUid(packageName, flags = 0, userId = 0) {
        const packageManager = this._getPackageManagerInterface();
        if (!packageManager || typeof packageManager.getPackageUid !== 'function') {
            return -1;
        }
        return packageManager.getPackageUid(packageName, flags, userId);
    },

    /**
     * 获取应用图标
     * @param {string} packageName - 包名
     * @param {number} flags - 标志位
     * @param {number} userId - 用户ID
     * @returns {Object|null} 应用图标流
     */
    getApplicationIcon(packageName, flags = 0, userId = 0) {
        const packageManager = this._getPackageManagerInterface();
        if (!packageManager || typeof packageManager.getApplicationIcon !== 'function') {
            return null;
        }
        return packageManager.getApplicationIcon(packageName, flags, userId);
    },

    /**
     * 获取已安装的应用包列表
     * @param {number} flags - 标志位
     * @param {number} userId - 用户ID
     * @returns {Array|null} 已安装应用包列表
     */
    getInstalledPackages(flags = 0, userId = 0) {
        const packageManager = this._getPackageManagerInterface();
        if (!packageManager || typeof packageManager.getInstalledPackages !== 'function') {
            return null;
        }
        try {
            const packagesJson = packageManager.getInstalledPackages(flags, userId);
            return JSON.parse(packagesJson);
        } catch (error) {
            console.error('Failed to parse installed packages JSON:', error);
            return null;
        }
    },

    /**
     * 获取应用详细信息
     * @param {string} packageName - 包名
     * @param {number} flags - 标志位
     * @param {number} userId - 用户ID
     * @returns {Object|null} 应用详细信息
     */
    getApplicationInfo(packageName, flags = 0, userId = 0) {
        const packageManager = this._getPackageManagerInterface();
        if (!packageManager || typeof packageManager.getApplicationInfo !== 'function') {
            return null;
        }
        return packageManager.getApplicationInfo(packageName, flags, userId);
    },

    // ==================== 高级文件系统操作（Shell实现） ====================

    /**
     * 列出目录内容（Shell实现）
     * @param {string} path - 目录路径
     * @param {string} delimiter - 分隔符
     * @returns {string|null} 目录内容
     */
    async listDirectoryShell(path, delimiter = '\n') {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                const result = await this.execCommand(`ls -la "${path}"`);
                return result;
            } catch (error) {
                console.error('Failed to list directory via shell:', error);
                return null;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 创建目录（Shell实现）
     * @param {string} path - 目录路径
     * @returns {boolean} 是否创建成功
     */
    async createDirectoryShell(path) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                await this.execCommand(`mkdir -p "${path}"`);
                return true;
            } catch (error) {
                console.error('Failed to create directory via shell:', error);
                return false;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 删除文件或目录（Shell实现）
     * @param {string} path - 文件或目录路径
     * @returns {boolean} 是否删除成功
     */
    async deleteFileShell(path) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                await this.execCommand(`rm -rf "${path}"`);
                return true;
            } catch (error) {
                console.error('Failed to delete file via shell:', error);
                return false;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 复制文件或目录（Shell实现）
     * @param {string} source - 源路径
     * @param {string} target - 目标路径
     * @param {boolean} overwrite - 是否覆盖
     * @returns {boolean} 是否复制成功
     */
    async copyFileShell(source, target, overwrite = false) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                const flags = overwrite ? '-rf' : '-r';
                await this.execCommand(`cp ${flags} "${source}" "${target}"`);
                return true;
            } catch (error) {
                console.error('Failed to copy file via shell:', error);
                return false;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 移动/重命名文件或目录（Shell实现）
     * @param {string} source - 源路径
     * @param {string} target - 目标路径
     * @returns {boolean} 是否移动成功
     */
    async moveFileShell(source, target) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                await this.execCommand(`mv "${source}" "${target}"`);
                return true;
            } catch (error) {
                console.error('Failed to move file via shell:', error);
                return false;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 获取文件权限（Shell实现）
     * @param {string} path - 文件路径
     * @returns {string|null} 文件权限
     */
    async getFilePermissionsShell(path) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                const result = await this.execCommand(`stat -c "%a" "${path}"`);
                return result.trim();
            } catch (error) {
                console.error('Failed to get file permissions via shell:', error);
                return null;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 设置文件权限（Shell实现）
     * @param {string} path - 文件路径
     * @param {string} permissions - 权限（如 "755"）
     * @returns {boolean} 是否设置成功
     */
    async setFilePermissionsShell(path, permissions) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                await this.execCommand(`chmod ${permissions} "${path}"`);
                return true;
            } catch (error) {
                console.error('Failed to set file permissions via shell:', error);
                return false;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },

    /**
     * 检查文件类型（Shell实现）
     * @param {string} path - 文件路径
     * @returns {Object|null} 文件类型信息
     */
    async getFileTypeShell(path) {
        const env = this.getEnvironment();
        
        if (env === 'kernelsu' || env === 'mmrl') {
            try {
                const result = await this.execCommand(`file "${path}"`);
                const isDirectory = await this.execCommand(`test -d "${path}" && echo "true" || echo "false"`);
                const isFile = await this.execCommand(`test -f "${path}" && echo "true" || echo "false"`);
                const isSymLink = await this.execCommand(`test -L "${path}" && echo "true" || echo "false"`);
                
                return {
                    type: result.trim(),
                    isDirectory: isDirectory.trim() === 'true',
                    isFile: isFile.trim() === 'true',
                    isSymLink: isSymLink.trim() === 'true'
                };
            } catch (error) {
                console.error('Failed to get file type via shell:', error);
                return null;
            }
        } else {
            throw new Error('Shell operations not supported in current environment');
        }
    },
};
