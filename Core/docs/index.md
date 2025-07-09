---
layout: home

hero:
  name: "AuroraCore"
  text: "Android Root Logger & File Watcher"
  tagline: High-performance logging and file monitoring solution designed specifically for Android root environment
  image:
    src: ./.vitepress/public/logo.svg
    alt: AuroraCore
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: View on GitHub
      link: https://github.com/APMMDEVS/AuroraCore
    - theme: alt
      text: 中文文档
      link: /zh/

features:
  - icon: 🔧
    title: System Tools
    details: Ready-to-use binary files including logger_daemon, logger_client, and filewatcher. Deploy directly to Android devices without compilation. Perfect for system administrators and DevOps.
    
  - icon: 🛠️
    title: Development APIs
    details: Modern C++ header-only libraries providing LoggerAPI and FileWatcherAPI. Build custom applications and integrate into existing projects with ease.
    
  - icon: ⚡
    title: High Performance & Power Efficient
    details: Optimized for Android root environment with intelligent buffering, batch I/O operations, and smart polling mechanisms to minimize CPU usage and power consumption.
    
  - icon: 📝
    title: Advanced Logging System
    details: Daemon-client architecture with automatic log rotation, configurable buffer sizes, multiple log levels, and custom formatting support.
    
  - icon: 👁️
    title: Smart File Monitoring
    details: inotify-based file monitoring with custom command execution, callback mechanisms, and power-efficient design for real-time filesystem monitoring.
    
  - icon: 📱
    title: Android Native
    details: Built specifically for Android using NDK with full ARM64 and ARMv7 architecture support. Optimized for Android's unique constraints and requirements.
---

## Getting Started

Ready to integrate AuroraCore into your Android project? Check out our [Getting Started Guide](/guide/getting-started) or explore the [API Reference](/api/logger-api) for detailed documentation.

## Community & Support

- 📖 [Documentation](/guide/introduction)
- 🐛 [Issue Tracker](https://github.com/APMMDEVS/AuroraCore/issues)
- 💬 [Discussions](https://github.com/APMMDEVS/AuroraCore/discussions)