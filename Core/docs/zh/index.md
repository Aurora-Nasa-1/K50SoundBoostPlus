---
layout: home

hero:
  name: "AuroraCore"
  text: "Android Root 日志系统与文件监听工具"
  tagline: 专为Android root环境设计的高性能日志记录和文件监控解决方案
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
    details: 即用型二进制文件，包括logger_daemon、logger_client和filewatcher。直接部署到Android设备，无需编译。适合系统管理员和运维人员。
    
  - icon: 🛠️
    title: 开发API
    details: 现代C++头文件库，提供LoggerAPI和FileWatcherAPI。用于开发自定义应用程序和集成到现有项目中。适合开发者构建新的解决方案。
    
  - icon: ⚡
    title: 高性能与省电设计
    details: 针对Android root环境优化，采用智能缓冲、批量I/O操作和智能轮询机制，最大限度减少CPU使用率和功耗。
    
  - icon: 📝
    title: 先进的日志系统
    details: 守护进程-客户端架构，支持自动日志轮转、可配置缓冲区大小。支持多种日志级别和自定义格式。
    
  - icon: 👁️
    title: 智能文件监听
    details: 基于inotify的文件监控，支持自定义命令执行、回调机制和省电设计。完美适用于实时文件系统监控。
    
  - icon: 📱
    title: Android 原生支持
    details: 专为Android使用NDK构建，完全支持ARM64和ARMv7架构。针对Android的独特约束和要求进行优化。
---

## 开始使用

准备将AuroraCore集成到你的Android项目中？查看我们的[快速开始指南](/zh/guide/getting-started)或浏览[API参考](/zh/api/logger-api)获取详细文档。

## 社区与支持

- 📖 [文档](/zh/guide/introduction)
- 🐛 [问题跟踪](https://github.com/APMMDEVS/AuroraCore/issues)
- 💬 [讨论区](https://github.com/APMMDEVS/AuroraCore/discussions)