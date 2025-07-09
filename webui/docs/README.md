# ModuleWebUI 页面模块管理系统

一个现代化的安卓Root通用模块管理Web界面，基于Vite构建，提供模块化的页面管理系统。

**现已支持 MMRL WebUI X！** 🎉

- ✅ KernelSU 原生支持
- ✅ MMRL WebUI X 完整适配
- ✅ 动态主题和安全区域
- ✅ 跨平台兼容性
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

### 安装与运行

```bash
# 克隆项目
git clone <repository-url>
cd ModuleWebUI

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📚 文档导航

- **[MMRL WebUI X 适配](./mmrl-webui-x.md)** - MMRL WebUI X 支持和使用指南 🆕
- **[创建页面模块](./create-module.md)** - 学习如何创建和配置页面模块
- **[高级API参考](./advanced-api.md)** - 详细的API文档和高级功能
- **[架构设计](./architecture.md)** - 系统架构和设计理念

## 🏗️ 项目结构

```
ModuleWebUI/
├── src/
│   ├── app.js              # 应用核心类
│   ├── main.js             # 入口文件和模块配置
│   ├── core.js             # 核心功能
│   ├── i18n.js             # 国际化系统
│   ├── pages/              # 页面模块
│   │   ├── status.js       # 状态页面
│   │   ├── logs.js         # 日志页面
│   │   ├── settings.js     # 设置页面
│   │   └── about.js        # 关于页面
│   ├── components/         # 可复用组件
│   │   └── modal.js        # 模态框组件
│   └── assets/             # 静态资源
│       ├── css/            # 样式文件
│       ├── fonts/          # 字体文件
│       └── translations/   # 翻译文件
├── docs/                   # 文档
└── index.html              # 主页面
```

## ✨ 核心特性

### 🔧 模块化架构
- **页面模块系统** - 每个页面都是独立的模块，支持热插拔
- **生命周期管理** - 完整的模块生命周期钩子
- **配置驱动** - 通过配置文件管理页面模块

### 🎨 现代化UI
- **Material Design 3** - 遵循最新设计规范
- **响应式设计** - 适配桌面和移动设备
- **主题切换** - 支持明暗主题自动切换

### 🌍 国际化支持
- **多语言** - 支持中文、英文、俄文
- **动态切换** - 运行时切换语言无需刷新
- **扩展性** - 易于添加新语言

### ⚡ 性能优化
- **代码分割** - 按需加载页面模块
- **缓存机制** - 智能缓存提升性能
- **预加载** - 后台预加载提升用户体验

## 🛠️ 开发脚本

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run build:prod   # 构建优化的生产版本
npm run preview      # 预览构建结果
npm run analyze      # 分析构建包大小
```

## 🔧 配置说明

### Vite 配置特性
- **代码分割** - 自动分割代码块，优化加载性能
- **资源优化** - CSS/JS压缩，文件哈希缓存
- **路径别名** - 使用 `@` 等别名简化导入
- **环境适配** - 自动适配开发/生产环境

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。