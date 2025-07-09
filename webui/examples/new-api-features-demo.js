/**
 * AMMF WebUI - 新API功能演示
 * 展示ApplicationInterface、UserManagerInterface、PackageManagerInterface和Shell文件系统操作
 */

// 引入核心模块
const Core = window.Core;

/**
 * 应用管理API演示
 */
class ApplicationManagementDemo {
    static async demonstrate() {
        console.log('=== 应用管理API演示 ===');
        
        try {
            // 获取当前Root管理器信息
            const rootManager = Core.getCurrentRootManager();
            if (rootManager) {
                console.log('当前Root管理器:', {
                    packageName: rootManager.packageName,
                    versionName: rootManager.versionName,
                    versionCode: rootManager.versionCode
                });
            } else {
                console.log('无法获取Root管理器信息');
            }
            
            // 获取当前应用信息
            const currentApp = Core.getCurrentApplication();
            if (currentApp) {
                console.log('当前应用信息:', {
                    packageName: currentApp.packageName,
                    name: currentApp.name,
                    version: currentApp.versionName
                });
            }
            
            // 获取系统应用信息
            const systemApps = [
                'com.android.settings',
                'com.android.systemui',
                'com.android.launcher3'
            ];
            
            for (const packageName of systemApps) {
                const appInfo = Core.getApplication(packageName);
                if (appInfo) {
                    console.log(`${packageName}:`, {
                        name: appInfo.name,
                        enabled: appInfo.enabled,
                        system: appInfo.system
                    });
                }
            }
            
        } catch (error) {
            console.error('应用管理API演示错误:', error);
        }
    }
}

/**
 * 用户管理API演示
 */
class UserManagementDemo {
    static async demonstrate() {
        console.log('=== 用户管理API演示 ===');
        
        try {
            // 获取系统用户列表
            const users = Core.getUsers();
            if (users && users.length > 0) {
                console.log(`系统用户数量: ${users.length}`);
                
                users.forEach((user, index) => {
                    console.log(`用户 ${index + 1}:`, {
                        id: user.id,
                        name: user.name,
                        type: user.userType,
                        running: user.isRunning
                    });
                });
                
                // 获取主用户详细信息
                const mainUser = users.find(user => user.id === 0);
                if (mainUser) {
                    const userInfo = Core.getUserInfo(0);
                    if (userInfo) {
                        console.log('主用户详细信息:', {
                            id: userInfo.id,
                            name: userInfo.name,
                            creationTime: userInfo.creationTime,
                            lastLoggedInTime: userInfo.lastLoggedInTime
                        });
                    }
                }
            } else {
                console.log('无法获取用户列表或用户列表为空');
            }
            
        } catch (error) {
            console.error('用户管理API演示错误:', error);
        }
    }
}

/**
 * 包管理API演示
 */
class PackageManagementDemo {
    static async demonstrate() {
        console.log('=== 包管理API演示 ===');
        
        try {
            const testPackages = [
                'com.android.settings',
                'com.android.chrome',
                'com.android.vending'
            ];
            
            for (const packageName of testPackages) {
                console.log(`\n--- ${packageName} ---`);
                
                // 获取包UID
                const uid = Core.getPackageUid(packageName);
                console.log('UID:', uid !== -1 ? uid : '未找到');
                
                // 获取应用图标
                const icon = Core.getApplicationIcon(packageName);
                console.log('图标:', icon ? '已获取' : '未找到');
                
                // 获取应用详细信息
                const appInfo = Core.getApplicationInfo(packageName);
                if (appInfo) {
                    console.log('应用信息:', {
                        name: appInfo.name,
                        versionName: appInfo.versionName,
                        versionCode: appInfo.versionCode,
                        targetSdk: appInfo.targetSdkVersion,
                        enabled: appInfo.enabled
                    });
                } else {
                    console.log('应用信息: 未找到');
                }
            }
            
            // 获取已安装包列表统计
            const installedPackages = Core.getInstalledPackages();
            if (installedPackages) {
                console.log(`\n已安装应用总数: ${installedPackages.length}`);
                
                // 统计系统应用和用户应用
                const systemApps = installedPackages.filter(pkg => pkg.system);
                const userApps = installedPackages.filter(pkg => !pkg.system);
                
                console.log(`系统应用: ${systemApps.length}`);
                console.log(`用户应用: ${userApps.length}`);
                
                // 显示前5个用户应用
                console.log('\n用户应用示例:');
                userApps.slice(0, 5).forEach((pkg, index) => {
                    console.log(`${index + 1}. ${pkg.name} (${pkg.packageName})`);
                });
            }
            
        } catch (error) {
            console.error('包管理API演示错误:', error);
        }
    }
}

/**
 * Shell文件系统操作演示
 */
class ShellFileSystemDemo {
    static async demonstrate() {
        console.log('=== Shell文件系统操作演示 ===');
        
        const env = Core.getEnvironment();
        if (env !== 'kernelsu' && env !== 'mmrl') {
            console.log('当前环境不支持Shell文件系统操作');
            return;
        }
        
        const testDir = '/data/local/tmp/ammf_shell_test';
        const testFile = `${testDir}/demo.txt`;
        const testContent = `AMMF WebUI Shell测试\n时间: ${new Date().toISOString()}\n环境: ${env}`;
        
        try {
            console.log('开始Shell文件系统操作测试...');
            
            // 1. 创建测试目录
            console.log('\n1. 创建测试目录');
            const dirCreated = await Core.createDirectoryShell(testDir);
            console.log(`目录创建: ${dirCreated ? '成功' : '失败'}`);
            
            // 2. 写入测试文件
            console.log('\n2. 写入测试文件');
            const fileWritten = await Core.writeFile(testFile, testContent);
            console.log(`文件写入: ${fileWritten ? '成功' : '失败'}`);
            
            // 3. 验证文件存在
            console.log('\n3. 验证文件存在');
            const fileExists = await Core.fileExists(testFile);
            console.log(`文件存在: ${fileExists ? '是' : '否'}`);
            
            // 4. 读取文件内容
            console.log('\n4. 读取文件内容');
            const content = await Core.readFile(testFile);
            console.log('文件内容:', content);
            
            // 5. 列出目录内容
            console.log('\n5. 列出目录内容');
            const dirContent = await Core.listDirectoryShell(testDir);
            console.log('目录内容:', dirContent);
            
            // 6. 获取和设置文件权限
            console.log('\n6. 文件权限操作');
            const originalPermissions = await Core.getFilePermissionsShell(testFile);
            console.log('原始权限:', originalPermissions);
            
            const permissionSet = await Core.setFilePermissionsShell(testFile, '644');
            console.log(`权限设置: ${permissionSet ? '成功' : '失败'}`);
            
            const newPermissions = await Core.getFilePermissionsShell(testFile);
            console.log('新权限:', newPermissions);
            
            // 7. 获取文件类型信息
            console.log('\n7. 获取文件类型信息');
            const fileType = await Core.getFileTypeShell(testFile);
            if (fileType) {
                console.log('文件类型:', {
                    type: fileType.type,
                    isFile: fileType.isFile,
                    isDirectory: fileType.isDirectory,
                    isSymLink: fileType.isSymLink
                });
            }
            
            // 8. 复制文件
            console.log('\n8. 复制文件');
            const copyTarget = `${testDir}/demo_copy.txt`;
            const fileCopied = await Core.copyFileShell(testFile, copyTarget);
            console.log(`文件复制: ${fileCopied ? '成功' : '失败'}`);
            
            // 9. 移动文件
            console.log('\n9. 移动文件');
            const moveTarget = `${testDir}/demo_moved.txt`;
            const fileMoved = await Core.moveFileShell(copyTarget, moveTarget);
            console.log(`文件移动: ${fileMoved ? '成功' : '失败'}`);
            
            // 10. 清理测试文件
            console.log('\n10. 清理测试文件');
            const cleaned = await Core.deleteFileShell(testDir);
            console.log(`清理完成: ${cleaned ? '成功' : '失败'}`);
            
        } catch (error) {
            console.error('Shell文件系统操作错误:', error);
            
            // 尝试清理
            try {
                await Core.deleteFileShell(testDir);
                console.log('错误后清理完成');
            } catch (cleanupError) {
                console.error('清理失败:', cleanupError);
            }
        }
    }
}

/**
 * 综合API功能演示
 */
class ComprehensiveAPIDemo {
    static async demonstrate() {
        console.log('=== AMMF WebUI 新API功能综合演示 ===');
        
        // 环境信息
        const env = Core.getEnvironment();
        const envInfo = Core.getEnvironmentInfo();
        
        console.log('\n环境信息:', {
            environment: env,
            shellSupported: envInfo.shellSupported,
            fileSupported: envInfo.fileSupported,
            applicationSupported: envInfo.applicationSupported,
            userManagerSupported: envInfo.userManagerSupported,
            packageManagerSupported: envInfo.packageManagerSupported,
            shellFileSystemSupported: envInfo.shellFileSystemSupported
        });
        
        // 根据环境支持情况运行相应演示
        if (envInfo.applicationSupported) {
            await ApplicationManagementDemo.demonstrate();
        }
        
        if (envInfo.userManagerSupported) {
            await UserManagementDemo.demonstrate();
        }
        
        if (envInfo.packageManagerSupported) {
            await PackageManagementDemo.demonstrate();
        }
        
        if (envInfo.shellFileSystemSupported) {
            await ShellFileSystemDemo.demonstrate();
        }
        
        console.log('\n=== 演示完成 ===');
    }
}

// 页面加载完成后自动运行演示
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // 添加运行按钮
        const button = document.createElement('button');
        button.textContent = '运行新API功能演示';
        button.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        button.addEventListener('click', () => {
            ComprehensiveAPIDemo.demonstrate();
        });
        
        document.body.appendChild(button);
        
        // 自动运行一次演示
        setTimeout(() => {
            ComprehensiveAPIDemo.demonstrate();
        }, 1000);
    });
}

// 导出演示类供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ApplicationManagementDemo,
        UserManagementDemo,
        PackageManagementDemo,
        ShellFileSystemDemo,
        ComprehensiveAPIDemo
    };
}