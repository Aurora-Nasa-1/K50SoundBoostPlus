---
layout: home

hero:
  name: "AuroraCore"
  text: "Android Root 文件监控工具"
  tagline: 专为Android root环境设计的高性能文件监控解决方案
  image:
    src: ../.vitepress/public/logo.svg
    alt: AuroraCore
  actions:
    - theme: brand
      text: 系统工具
      link: /zh/guide/system-tools
    - theme: alt
      text: 开发API
      link: /zh/guide/development-api
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/APMMDEVS/AuroraCore
    - theme: alt
      text: English Docs
      link: /

features:
  - icon: 🔧
    title: 系统工具
    details: 即用型二进制文件filewatcher。直接部署到Android设备，无需编译。适合系统管理员和运维人员进行实时文件监控。
    
  - icon: 🛠️
    title: 开发API
    details: 现代C++头文件库，提供FileWatcherAPI。用于开发自定义应用程序和集成到现有项目中。适合开发者构建文件监控解决方案。
    
  - icon: ⚡
    title: 高性能与省电设计
    details: 针对Android root环境优化，采用智能事件过滤、批量处理和去抖动机制，最大限度减少CPU使用率和功耗。
    
  - icon: 👁️
    title: 智能文件监控
    details: 基于inotify的高效文件监控，支持递归目录监控、事件过滤、自定义命令执行和回调机制。完美适用于实时文件系统监控。
    
  - icon: 🎯
    title: 灵活的事件处理
    details: 支持多种文件事件类型（创建、修改、删除、移动），可配置的事件掩码和排除模式，满足各种监控需求。
    
  - icon: 📱
    title: Android 原生支持
    details: 专为Android使用NDK构建，完全支持ARM64和ARMv7架构。针对Android的独特约束和要求进行优化。
---

## 开始使用

准备将AuroraCore集成到你的Android项目中？查看我们的[快速开始指南](/zh/guide/getting-started)或浏览[API参考](/zh/api/)获取详细文档。

## 主要特性

### 🚀 高性能文件监控

- **基于inotify**: 利用Linux内核的inotify机制，提供高效的文件系统事件监控
- **事件过滤**: 支持精确的事件类型过滤，减少不必要的处理开销
- **批量处理**: 智能的事件批处理机制，提高处理效率
- **去抖动**: 内置去抖动功能，减少频繁事件的噪音

### 📁 灵活的监控配置

- **递归监控**: 支持递归监控整个目录树
- **排除模式**: 灵活的文件排除模式，支持正则表达式
- **深度限制**: 可配置的监控深度限制，避免过深的目录结构
- **多路径监控**: 同时监控多个不同的路径

### 🔧 易于使用

- **命令行工具**: 提供功能完整的命令行工具，支持各种监控场景
- **C++ API**: 现代化的C++ API，易于集成到现有项目
- **丰富的回调**: 支持自定义回调函数和命令执行
- **详细文档**: 完整的文档和示例代码

## 使用场景

### 📊 系统监控
- 监控系统配置文件变化
- 跟踪应用程序文件修改
- 检测恶意文件操作
- 实时备份重要文件

### 🔄 自动化任务
- 配置文件变化时自动重启服务
- 新文件创建时自动处理
- 文件删除时发送警报
- 日志文件轮转管理

### 🛠️ 开发调试
- 监控构建输出目录
- 跟踪源代码变化
- 自动触发测试
- 实时同步文件

## 社区与支持

- 📖 [文档](/zh/guide/introduction)
- 🐛 [问题跟踪](https://github.com/APMMDEVS/AuroraCore/issues)
- 💬 [讨论区](https://github.com/APMMDEVS/AuroraCore/discussions)
- 🚀 [快速开始](/zh/guide/getting-started)
- 📚 [API 参考](/zh/api/)

## 快速示例

### 命令行使用

```bash
# 监控配置目录，文件变化时输出信息
./filewatcher /data/config "echo '配置文件变化: %f'"

# 递归监控应用目录，排除临时文件
./filewatcher -r --exclude="\.(tmp|log)$" /data/app "echo '应用文件变化: %f'"

# 后台运行，监控关键文件
./filewatcher --daemon /data/critical "echo '[%t] 关键文件变化: %f' >> /data/monitor.log"
```

### API 使用

```cpp
#include "filewatcher_api.hpp"

// 创建文件监控器
FileWatcher watcher;

// 添加监控路径
watcher.add_watch("/data/config", 
    FileWatcherAPI::EventType::MODIFY | FileWatcherAPI::EventType::CREATE,
    [](const FileWatcherAPI::FileEvent& event) {
        std::cout << "文件事件: " << event.path << std::endl;
    });

// 启动监控
watcher.start();
```