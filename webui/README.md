# AMMF WebUI

现代化的 Android Root 模块管理 Web 界面，基于 Vite 构建。

## 🎉 MMRL WebUI X 支持

本项目现已完全支持 MMRL WebUI X 平台，提供以下新功能：

- ✅ **KernelSU 原生支持** - 完全兼容现有 KernelSU 环境
- ✅ **完整 MMRL WebUI X 适配** - 支持最新的 MMRL WebUI X 平台
- ✅ **动态主题和安全区域** - 自动适配 MMRL 的主题系统和设备安全区域
- ✅ **跨平台兼容性** - 一套代码，多平台运行
- 🆕 **文件系统操作** - 完整的文件读写、目录管理和权限检查
- 🆕 **系统深度集成** - 主题检测、快捷方式创建、文本分享等系统功能
- 🆕 **窗口安全区域** - 自动适配设备的刘海屏和导航栏

### 🚀 新功能亮点

- **📁 文件系统操作** - 支持文件读写、目录管理、权限控制等完整文件系统操作
- **🔗 系统集成** - 深度集成Android系统，支持快捷方式创建、文本分享等功能
- **🖼️ 窗口安全区域** - 智能适配刘海屏、挖孔屏等异形屏幕的安全显示区域
- **📱 应用管理** - 获取Root管理器信息、当前应用信息及指定应用详情
- **👥 用户管理** - 系统用户列表查询和用户信息获取
- **📦 包管理** - 应用包UID获取、图标提取、已安装包列表和应用详细信息
- **⚡ Shell文件系统** - KernelSU/MMRL环境下的Shell命令文件操作支持

## 🚀 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn
- KernelSU 或 MMRL WebUI X 环境

### 安装和运行

```bash
# 克隆项目
git clone <repository-url>
cd ModuleWebUI

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

## 📚 文档

- [完整文档](docs/README.md) - 详细的使用指南和API文档
- [MMRL WebUI X 适配指南](docs/mmrl-webui-x.md) - MMRL WebUI X 特性和API使用
- [API 参考](docs/api-reference.md) - 完整的API文档
- [架构设计](docs/architecture.md) - 项目架构和设计理念
- [模块创建指南](docs/create-module.md) - 如何创建自定义模块

## 🔧 API 示例

```javascript
import { Core } from './src/core.js';

// 环境检测
const env = Core.getEnvironment(); // 'kernelsu' | 'mmrl' | 'mmrl-webui-x'
console.log('当前环境:', env);

// 执行Shell命令（兼容所有环境）
const result = await Core.execCommand('ls -la');

// 文件操作 (MMRL WebUI X)
if (Core.isFileSupported()) {
    await Core.writeFile('/path/to/file.txt', '内容');
    const content = await Core.readFile('/path/to/file.txt');
    const exists = await Core.fileExists('/path/to/file.txt');
}

// Shell文件操作 (KernelSU/MMRL)
if (env === 'kernelsu' || env === 'mmrl') {
    await Core.createDirectoryShell('/data/local/tmp/test');
    await Core.copyFileShell('/source/file.txt', '/target/file.txt');
    const permissions = await Core.getFilePermissionsShell('/path/to/file.txt');
}

// 应用管理 (MMRL WebUI X)
const rootManager = Core.getCurrentRootManager();
const appInfo = Core.getApplication('com.android.settings');
const installedPackages = Core.getInstalledPackages();

// 用户管理 (MMRL WebUI X)
const users = Core.getUsers();
const userInfo = Core.getUserInfo(0);

// 主题检测（MMRL WebUI X）
if (Core.getEnvironment() === 'mmrl-webui-x') {
    const isDark = Core.isDarkMode();
    const topInset = Core.getWindowTopInset();
    if (isDark) {
        document.body.classList.add('dark-theme');
    }
    document.documentElement.style.setProperty('--safe-area-top', `${topInset}px`);
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。