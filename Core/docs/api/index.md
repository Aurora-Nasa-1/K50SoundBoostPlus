# API参考文档 (API Reference)

AuroraCore提供两种使用方式：系统工具和开发API。本文档详细介绍各种API和工具的使用方法。

## 🔧 系统工具 (System Tools)

预编译的二进制工具，可直接部署到Android设备使用：

- **[CLI工具参考](./cli-tools)** - 命令行工具详细说明
  - `logger_daemon` - 日志守护进程
  - `logger_client` - 日志客户端
  - `filewatcher` - 文件监控工具
  - 命令行参数和配置选项
  - 使用示例和最佳实践

## 🛠️ 开发API (Development APIs)

C++头文件库，用于开发自定义应用程序：

- **[FileWatcherAPI](./filewatcher-api)** - 实时文件系统监控库
  - 基于inotify的文件监控
  - 递归目录监控
  - 事件过滤和批处理
  - 高性能事件处理
  - 回调机制

## 🚀 快速开始

### 系统工具使用

```bash
# 监控文件变化
adb shell /data/local/tmp/filewatcher /data/config "echo 配置文件已更改" &
```

## 🔗 相关文档

### 使用指南
- [系统工具指南](/guide/system-tools) - 预编译工具的使用方法
- [开发API指南](/guide/development-api) - API开发和集成指南
- [性能优化](/guide/performance) - 性能调优建议
- [构建指南](/guide/building) - 从源码构建
- [FAQ](/guide/faq) - 常见问题解答

### 示例代码
- [基础使用示例](/examples/basic-usage) - 基本用法演示
- [高级配置示例](/examples/advanced-config) - 高级配置选项
- [集成示例](/examples/integration) - 项目集成案例

## 📞 技术支持

针对API相关问题：

- 查看各组件的详细API文档
- 查阅[FAQ](/guide/faq)了解常见问题
- 浏览[示例代码](/examples/basic-usage)学习使用模式
- 在[GitHub](https://github.com/APMMDEVS/AuroraCore/issues)提交问题

### 获取帮助的最佳方式

1. **系统工具问题**: 查看[系统工具指南](/guide/system-tools)
2. **开发API问题**: 查看[开发API指南](/guide/development-api)
3. **性能问题**: 查看[性能优化指南](/guide/performance)
4. **构建问题**: 查看[构建指南](/guide/building)