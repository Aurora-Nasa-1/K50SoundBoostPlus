/**
 * MMRL WebUI X API 演示示例
 * 展示如何使用新的文件操作、系统集成和主题检测功能
 */

// 导入 Core 对象
import { Core } from '../src/core.js';

/**
 * 环境检测示例
 */
function demonstrateEnvironmentDetection() {
    console.log('=== 环境检测演示 ===');
    
    // 检测当前环境
    const environment = Core.getEnvironment();
    console.log('当前环境:', environment);
    
    // 检查各种功能支持
    console.log('Shell 支持:', Core.isShellSupported());
    console.log('文件操作支持:', Core.isFileSupported());
    console.log('文件流支持:', Core.isFileStreamSupported());
    
    // 获取详细环境信息
    const envInfo = Core.getEnvironmentInfo();
    console.log('环境详细信息:', envInfo);
}

/**
 * 文件操作示例
 */
async function demonstrateFileOperations() {
    console.log('=== 文件操作演示 ===');
    
    if (!Core.isFileSupported()) {
        console.log('当前环境不支持文件操作');
        return;
    }
    
    try {
        const testFile = '/data/local/tmp/test.txt';
        const testDir = '/data/local/tmp/test_dir';
        
        // 创建目录
        console.log('创建目录:', testDir);
        await Core.createDirectory(testDir);
        
        // 写入文件
        console.log('写入文件:', testFile);
        await Core.writeFile(testFile, 'Hello MMRL WebUI X!');
        
        // 检查文件是否存在
        const exists = await Core.fileExists(testFile);
        console.log('文件存在:', exists);
        
        // 读取文件内容
        if (exists) {
            const content = await Core.readFile(testFile);
            console.log('文件内容:', content);
        }
        
        // 获取文件信息
        const isFile = await Core.isFile(testFile);
        const isDir = await Core.isDirectory(testDir);
        const size = await Core.getFileSize(testFile);
        
        console.log('是文件:', isFile);
        console.log('是目录:', isDir);
        console.log('文件大小:', size, '字节');
        
        // 检查文件权限
        const canRead = await Core.canRead(testFile);
        const canWrite = await Core.canWrite(testFile);
        const canExecute = await Core.canExecute(testFile);
        
        console.log('可读:', canRead);
        console.log('可写:', canWrite);
        console.log('可执行:', canExecute);
        
        // 复制文件
        const copyFile = testFile + '.copy';
        await Core.copyFile(testFile, copyFile, true);
        console.log('文件已复制到:', copyFile);
        
        // 列出目录内容
        const dirContent = await Core.listDirectory('/data/local/tmp');
        console.log('目录内容:', dirContent);
        
        // 清理测试文件
        await Core.deleteFile(testFile);
        await Core.deleteFile(copyFile);
        await Core.deleteFile(testDir);
        console.log('测试文件已清理');
        
    } catch (error) {
        console.error('文件操作错误:', error);
    }
}

/**
 * 主题和外观示例
 */
function demonstrateThemeAndAppearance() {
    console.log('=== 主题和外观演示 ===');
    
    if (Core.getEnvironment() !== 'mmrl-webui-x') {
        console.log('当前环境不支持主题检测');
        return;
    }
    
    // 检查当前主题
    const isDark = Core.isDarkMode();
    console.log('暗色模式:', isDark);
    
    // 检查导航栏和状态栏
    const isLightNav = Core.isLightNavigationBars();
    const isLightStatus = Core.isLightStatusBars();
    
    console.log('浅色导航栏:', isLightNav);
    console.log('浅色状态栏:', isLightStatus);
    
    // 获取窗口安全区域
    const topInset = Core.getWindowTopInset();
    const bottomInset = Core.getWindowBottomInset();
    const leftInset = Core.getWindowLeftInset();
    const rightInset = Core.getWindowRightInset();
    
    console.log('窗口安全区域:');
    console.log('  顶部:', topInset, 'px');
    console.log('  底部:', bottomInset, 'px');
    console.log('  左侧:', leftInset, 'px');
    console.log('  右侧:', rightInset, 'px');
    
    // 应用安全区域到页面样式
    document.documentElement.style.setProperty('--window-top-inset', topInset + 'px');
    document.documentElement.style.setProperty('--window-bottom-inset', bottomInset + 'px');
    document.documentElement.style.setProperty('--window-left-inset', leftInset + 'px');
    document.documentElement.style.setProperty('--window-right-inset', rightInset + 'px');
}

/**
 * 系统集成示例
 */
function demonstrateSystemIntegration() {
    console.log('=== 系统集成演示 ===');
    
    if (Core.getEnvironment() !== 'mmrl-webui-x') {
        console.log('当前环境不支持系统集成');
        return;
    }
    
    // 获取系统信息
    const sdk = Core.getSdk();
    console.log('Android SDK 版本:', sdk);
    
    // 检查快捷方式
    const hasShortcut = Core.hasShortcut();
    console.log('已有快捷方式:', hasShortcut);
    
    // 获取重组次数
    const recomposeCount = Core.getRecomposeCount();
    console.log('重组次数:', recomposeCount);
}

/**
 * 应用管理示例
 */
function demonstrateApplicationManagement() {
    console.log('=== 应用管理演示 ===');
    
    // 获取当前Root管理器信息
    const rootManager = Core.getCurrentRootManager();
    console.log('当前Root管理器:', rootManager);
    
    // 获取当前应用信息
    const currentApp = Core.getCurrentApplication();
    console.log('当前应用:', currentApp);
    
    // 获取指定应用信息
    const appInfo = Core.getApplication('com.android.settings');
    console.log('设置应用信息:', appInfo);
}

/**
 * 用户管理示例
 */
function demonstrateUserManagement() {
    console.log('=== 用户管理演示 ===');
    
    // 获取系统用户列表
    const users = Core.getUsers();
    console.log('系统用户列表:', users);
    
    // 获取指定用户信息
    if (users && users.length > 0) {
        const userInfo = Core.getUserInfo(users[0].id);
        console.log('用户信息:', userInfo);
    }
}

/**
 * 包管理示例
 */
function demonstratePackageManagement() {
    console.log('=== 包管理演示 ===');
    
    const packageName = 'com.android.settings';
    
    // 获取包UID
    const uid = Core.getPackageUid(packageName);
    console.log(`${packageName} UID:`, uid);
    
    // 获取应用图标
    const icon = Core.getApplicationIcon(packageName);
    console.log(`${packageName} 图标:`, icon);
    
    // 获取已安装包列表
    const installedPackages = Core.getInstalledPackages();
    console.log('已安装包数量:', installedPackages ? installedPackages.length : 0);
    
    // 获取应用详细信息
    const appInfo = Core.getApplicationInfo(packageName);
    console.log(`${packageName} 详细信息:`, appInfo);
}

/**
 * Shell文件系统操作示例
 */
async function demonstrateShellFileSystem() {
    console.log('=== Shell文件系统操作演示 ===');
    
    const testDir = '/data/local/tmp/ammf_test';
    const testFile = `${testDir}/test.txt`;
    
    try {
        // 创建测试目录
        const dirCreated = await Core.createDirectoryShell(testDir);
        console.log('目录创建:', dirCreated ? '成功' : '失败');
        
        // 写入测试文件
        const fileWritten = await Core.writeFile(testFile, 'Shell文件系统测试内容');
        console.log('文件写入:', fileWritten ? '成功' : '失败');
        
        // 列出目录内容
        const dirContent = await Core.listDirectoryShell(testDir);
        console.log('目录内容:', dirContent);
        
        // 获取文件权限
        const permissions = await Core.getFilePermissionsShell(testFile);
        console.log('文件权限:', permissions);
        
        // 设置文件权限
        const permissionSet = await Core.setFilePermissionsShell(testFile, '644');
        console.log('权限设置:', permissionSet ? '成功' : '失败');
        
        // 获取文件类型
        const fileType = await Core.getFileTypeShell(testFile);
        console.log('文件类型:', fileType);
        
        // 复制文件
        const copyTarget = `${testDir}/test_copy.txt`;
        const fileCopied = await Core.copyFileShell(testFile, copyTarget);
        console.log('文件复制:', fileCopied ? '成功' : '失败');
        
        // 移动文件
        const moveTarget = `${testDir}/test_moved.txt`;
        const fileMoved = await Core.moveFileShell(copyTarget, moveTarget);
        console.log('文件移动:', fileMoved ? '成功' : '失败');
        
        // 清理测试文件
        await Core.deleteFileShell(testDir);
        console.log('测试目录清理完成');
        
    } catch (error) {
        console.error('Shell文件系统操作错误:', error);
    }
}

/**
 * 实用工具函数示例
 */
class MMRLWebUIXUtils {
    /**
     * 自适应主题的 Toast 显示
     */
    static showAdaptiveToast(message, type = 'info') {
        const isDark = Core.isDarkMode();
        const toastClass = isDark ? 'toast-dark' : 'toast-light';
        
        Core.showToast(message, {
            duration: 3000,
            className: toastClass
        });
    }
    
    /**
     * 安全的文件读取（带错误处理）
     */
    static async safeReadFile(path) {
        if (!Core.isFileSupported()) {
            throw new Error('文件操作不受支持');
        }
        
        try {
            const exists = await Core.fileExists(path);
            if (!exists) {
                throw new Error(`文件不存在: ${path}`);
            }
            
            const canRead = await Core.canRead(path);
            if (!canRead) {
                throw new Error(`文件不可读: ${path}`);
            }
            
            return await Core.readFile(path);
        } catch (error) {
            console.error('读取文件失败:', error);
            throw error;
        }
    }
    
    /**
     * 安全的文件写入（带备份）
     */
    static async safeWriteFile(path, content, createBackup = true) {
        if (!Core.isFileSupported()) {
            throw new Error('文件操作不受支持');
        }
        
        try {
            // 创建备份
            if (createBackup && await Core.fileExists(path)) {
                const backupPath = path + '.backup';
                await Core.copyFile(path, backupPath, true);
                console.log('已创建备份:', backupPath);
            }
            
            // 写入文件
            await Core.writeFile(path, content);
            console.log('文件写入成功:', path);
            
        } catch (error) {
            console.error('写入文件失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取设备信息摘要
     */
    static getDeviceInfo() {
        const info = {
            environment: Core.getEnvironment(),
            features: {
                shell: Core.isShellSupported(),
                file: Core.isFileSupported(),
                stream: Core.isFileStreamSupported()
            }
        };
        
        if (Core.getEnvironment() === 'mmrl-webui-x') {
            info.theme = {
                isDark: Core.isDarkMode(),
                lightNav: Core.isLightNavigationBars(),
                lightStatus: Core.isLightStatusBars()
            };
            
            info.system = {
                sdk: Core.getSdk(),
                hasShortcut: Core.hasShortcut(),
                recomposeCount: Core.getRecomposeCount()
            };
            
            info.insets = {
                top: Core.getWindowTopInset(),
                bottom: Core.getWindowBottomInset(),
                left: Core.getWindowLeftInset(),
                right: Core.getWindowRightInset()
            };
        }
        
        return info;
    }
}

/**
 * 主演示函数
 */
async function runDemo() {
    console.log('MMRL WebUI X API 演示开始');
    console.log('========================');
    
    // 环境检测
    demonstrateEnvironmentDetection();
    
    // 主题和外观
    demonstrateThemeAndAppearance();
    
    // 系统集成
    demonstrateSystemIntegration();
    
    // 应用管理
    demonstrateApplicationManagement();
    
    // 用户管理
    demonstrateUserManagement();
    
    // 包管理
    demonstratePackageManagement();
    
    // 文件操作（异步）
    await demonstrateFileOperations();
    
    // Shell文件系统操作（异步）
    await demonstrateShellFileSystem();
    
    // 显示设备信息摘要
    console.log('=== 设备信息摘要 ===');
    const deviceInfo = MMRLWebUIXUtils.getDeviceInfo();
    console.log(JSON.stringify(deviceInfo, null, 2));
    
    console.log('========================');
    console.log('MMRL WebUI X API 演示完成');
}

// 导出工具类和演示函数
export { MMRLWebUIXUtils, runDemo };

// 如果直接运行此文件，执行演示
if (typeof window !== 'undefined' && window.location) {
    // 在页面加载完成后运行演示
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDemo);
    } else {
        runDemo();
    }
}