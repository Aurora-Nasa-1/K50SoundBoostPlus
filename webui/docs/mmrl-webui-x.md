# MMRL WebUI X 适配指南

本文档介绍了AMMF WebUI对MMRL WebUI X的适配实现。

## 概述

AMMF WebUI现在支持在以下环境中运行：
- **KernelSU**: 原生支持
- **MMRL WebUI X**: 新增支持
- **标准浏览器**: 基础功能支持

## 新增功能

### 1. 环境检测

```javascript
import { Core } from './core.js';

// 检测当前运行环境
const env = Core.getEnvironment(); // 'kernelsu' | 'mmrl' | 'unknown'

// 检查是否支持Shell命令
const supported = Core.isShellSupported();

// 检查是否支持文件操作
const fileSupported = Core.isFileSupported();

// 检查是否支持文件流操作
const streamSupported = Core.isFileStreamSupported();

// 获取详细环境信息
const info = Core.getEnvironmentInfo();
console.log(info);
```

### 2. 兼容的Shell命令执行

```javascript
// 自动适配不同环境的API
try {
    const result = await Core.execCommand('ls -la');
    console.log(result);
} catch (error) {
    console.error('命令执行失败:', error);
}
```

### 3. 增强的Toast通知

```javascript
// 优先使用MMRL原生Toast，回退到自定义实现
Core.showToast('操作成功', 'success');
Core.showToast('警告信息', 'warning');
Core.showToast('错误信息', 'error');
```

### 4. MMRL WebUI X 文件操作 API

#### 基础文件操作
```javascript
// 读取文件内容
const content = await Core.readFile('/path/to/file.txt');

// 写入文件内容
await Core.writeFile('/path/to/file.txt', 'Hello World');

// 写入二进制文件
await Core.writeFileBytes('/path/to/file.bin', binaryData);

// 读取文件为Base64格式
const base64 = await Core.readFileAsBase64('/path/to/image.png');

// 删除文件或目录
await Core.deleteFile('/path/to/file.txt');

// 检查文件或目录是否存在
const exists = await Core.fileExists('/path/to/file.txt');
```

#### 目录操作
```javascript
// 列出目录内容
const files = await Core.listDirectory('/path/to/directory', '\n');

// 创建目录
await Core.createDirectory('/path/to/new/directory');

// 创建目录及其父目录
await Core.createDirectories('/path/to/new/nested/directory');

// 检查路径是否为目录
const isDir = await Core.isDirectory('/path/to/check');
```

#### 文件属性检查
```javascript
// 检查路径是否为文件
const isFile = await Core.isFile('/path/to/check');

// 检查路径是否为符号链接
const isSymLink = await Core.isSymLink('/path/to/check');

// 检查文件是否隐藏
const isHidden = await Core.isHidden('/path/to/file');

// 获取文件或目录大小
const size = await Core.getFileSize('/path/to/file', false);

// 获取文件或目录元数据
const stat = await Core.getFileStat('/path/to/file', true);
```

#### 文件权限检查
```javascript
// 检查文件是否可读
const canRead = await Core.canRead('/path/to/file');

// 检查文件是否可写
const canWrite = await Core.canWrite('/path/to/file');

// 检查文件是否可执行
const canExecute = await Core.canExecute('/path/to/file');
```

#### 文件操作
```javascript
// 创建新文件
await Core.createNewFile('/path/to/new/file.txt');

// 重命名文件或目录
await Core.renameFile('/old/path', '/new/path');

// 复制文件或目录
await Core.copyFile('/source/path', '/target/path', true);
```

### 5. MMRL WebUI X 文件流操作 API

```javascript
// 打开文件流进行读取
const stream = await Core.openFileStream('/path/to/large/file.txt');
```

### 6. MMRL WebUI X 模块接口 API

#### 窗口安全区域
```javascript
// 获取窗口安全区域
const topInset = Core.getWindowTopInset();
const bottomInset = Core.getWindowBottomInset();
const leftInset = Core.getWindowLeftInset();
const rightInset = Core.getWindowRightInset();
```

#### 主题和外观
```javascript
// 检查是否为暗色模式
const isDark = Core.isDarkMode();

// 导航栏颜色控制
const isLightNav = Core.isLightNavigationBars();
Core.setLightNavigationBars(true);

// 状态栏颜色控制
const isLightStatus = Core.isLightStatusBars();
Core.setLightStatusBars(false);
```

#### 系统集成
```javascript
// 获取Android SDK版本
const sdk = Core.getSdk();

// 分享文本
Core.shareText('Hello World', 'text/plain');

// 创建快捷方式
Core.createShortcut('AMMF WebUI', 'icon.png');

// 检查是否已有快捷方式
const hasShortcut = Core.hasShortcut();

// 重新加载整个WebUI
Core.recompose();

// 获取重组次数
const count = Core.getRecomposeCount();
```

## 配置文件

### config.mmrl.json

项目根目录下的`config.mmrl.json`文件是MMRL WebUI X的必需配置：

```json
{
  "title": "AMMF WebUI",
  "icon": "ammf-icon.png",
  "description": "AMMF模块管理界面",
  "version": "1.0.0",
  "author": "AMMF Team",
  "require": {
    "packages": [
      {
        "code": 33661,
        "packageName": "com.dergoogler.mmrl",
        "supportText": "需要MMRL v33661或更高版本",
        "supportLink": "https://github.com/MMRLApp/MMRL"
      }
    ]
  }
}
```

## 样式适配

### MMRL主题变量

新增的`mmrl-compat.css`文件提供了完整的MMRL主题支持：

```css
/* 使用MMRL提供的主题变量 */
body {
    background-color: var(--background, #fef7ff);
    color: var(--onBackground, #1d1b20);
}

/* 安全区域支持 */
body {
    padding-top: var(--window-inset-top, 0px);
    padding-bottom: var(--window-inset-bottom, 0px);
}
```

### 动态主题

- 自动适配MMRL的Material You动态主题
- 支持明暗模式切换
- 响应系统主题变化

## HTML适配

在`index.html`中添加了MMRL WebUI X所需的样式链接：

```html
<!-- MMRL WebUI X Required Styles -->
<link rel="stylesheet" type="text/css" href="https://mui.kernelsu.org/internal/insets.css" />
<link rel="stylesheet" type="text/css" href="https://mui.kernelsu.org/internal/colors.css" />
```

## 环境标识

应用会自动为`<body>`元素添加环境标识类：

- `env-kernelsu`: KernelSU环境
- `env-mmrl`: MMRL环境
- `env-unknown`: 未知环境
- `mmrl-webui`: MMRL特定标识

## 兼容性

### 支持的MMRL版本
- 最低要求: MMRL v33661
- 推荐版本: 最新版本

### 功能支持矩阵

| 功能 | KernelSU | MMRL | MMRL WebUI X |
|------|----------|------|-------------|
| Shell命令执行 | ✅ | ✅ | ✅ |
| Toast消息 | ❌ | ✅ | ✅ |
| 文件操作 | ❌ | ❌ | ✅ |
| 文件流操作 | ❌ | ❌ | ✅ |
| 主题检测 | ❌ | ❌ | ✅ |
| 系统集成 | ❌ | ❌ | ✅ |
| 窗口控制 | ❌ | ❌ | ✅ |
| 应用管理 | ❌ | ❌ | ✅ |
| 用户管理 | ❌ | ❌ | ✅ |
| 包管理 | ❌ | ❌ | ✅ |
| Shell文件系统 | ✅ | ✅ | ❌ |

## 开发建议

1. **环境检测**: 始终在使用特定功能前检测环境支持
2. **优雅降级**: 为不支持的环境提供替代方案
3. **错误处理**: 妥善处理API调用失败的情况
4. **测试**: 在不同环境中测试功能

## 故障排除

### 常见问题

1. **Shell命令无法执行**
   - 检查环境是否支持: `Core.isShellSupported()`
   - 确认权限设置正确

2. **主题样式不生效**
   - 确认MMRL版本支持
   - 检查CSS变量是否正确加载

3. **Toast不显示**
   - 检查Toast容器是否存在
   - 确认MMRL API可用性

### 调试信息

```javascript
// 获取详细的环境和功能信息
const debugInfo = Core.getEnvironmentInfo();
console.log('Debug Info:', debugInfo);
```

### Module Interface APIs

#### Window Insets
- `getWindowTopInset()` - 获取窗口顶部安全区域高度

#### Theme and Appearance
- `isDarkMode()` - 检测是否为深色主题
- `setLightNavigationBars(light)` - 设置导航栏为浅色模式

#### System Integration
- `getSdk()` - 获取SDK版本信息
- `shareText(text)` - 分享文本内容
- `recompose()` - 触发界面重新组合
- `createShortcut(name, icon, intent)` - 创建应用快捷方式

### Application Interface APIs

#### Root Manager Information
- `getCurrentRootManager()` - 获取当前Root管理器应用信息
- `getCurrentApplication()` - 获取当前应用信息
- `getApplication(packageName)` - 根据包名获取应用信息

### User Manager Interface APIs

#### User Management
- `getUsers()` - 获取系统用户列表
- `getUserInfo(userId)` - 根据用户ID获取用户信息

### Package Manager Interface APIs

#### Package Information
- `getPackageUid(packageName, flags, userId)` - 获取应用包的UID
- `getApplicationIcon(packageName, flags, userId)` - 获取应用图标
- `getInstalledPackages(flags, userId)` - 获取已安装的应用包列表
- `getApplicationInfo(packageName, flags, userId)` - 获取应用详细信息

### Shell File System APIs (KernelSU/MMRL)

#### Directory Operations
- `listDirectoryShell(path, delimiter)` - 列出目录内容
- `createDirectoryShell(path)` - 创建目录

#### File Operations
- `deleteFileShell(path)` - 删除文件或目录
- `copyFileShell(source, target, overwrite)` - 复制文件或目录
- `moveFileShell(source, target)` - 移动/重命名文件或目录

#### File Permissions
- `getFilePermissionsShell(path)` - 获取文件权限
- `setFilePermissionsShell(path, permissions)` - 设置文件权限

#### File Type Detection
- `getFileTypeShell(path)` - 检查文件类型信息

## 更新日志

### v1.0.0
- 初始MMRL WebUI X适配
- 环境检测功能
- 兼容的Shell命令执行
- MMRL主题支持
- 安全区域适配