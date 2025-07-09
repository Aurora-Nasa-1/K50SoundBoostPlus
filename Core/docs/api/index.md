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

- **[LoggerAPI](./logger-api)** - 高性能日志记录库
  - 同步和异步日志记录
  - 多种输出格式和目标
  - 日志轮转和压缩
  - 线程安全的日志操作
  - 自定义日志格式

- **[FileWatcherAPI](./filewatcher-api)** - 实时文件系统监控库
  - 基于inotify的文件监控
  - 递归目录监控
  - 事件过滤和批处理
  - 高性能事件处理
  - 回调机制

## 🚀 快速开始

### 系统工具使用

```bash
# 部署系统工具
adb push logger_daemon logger_client filewatcher /data/local/tmp/
adb shell chmod +x /data/local/tmp/*

# 启动日志服务
adb shell /data/local/tmp/logger_daemon -f /data/logs/app.log &

# 发送日志消息
adb shell /data/local/tmp/logger_client "应用程序启动"
adb shell /data/local/tmp/logger_client -l error "发生错误"

# 监控文件变化
adb shell /data/local/tmp/filewatcher /data/config "echo 配置文件已更改" &
```

### 开发API使用

```cpp
#include "loggerAPI/logger_api.hpp"
#include "filewatcherAPI/filewatcher_api.hpp"

int main() {
    // 初始化日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/local/tmp/app.log";
    config.max_file_size = 10 * 1024 * 1024;  // 10MB
    
    LoggerAPI::InternalLogger logger(config);
    
    // 记录日志
    logger.log(LoggerAPI::LogLevel::INFO, "应用程序启动");
    logger.log(LoggerAPI::LogLevel::ERROR, "发生错误");
    
    // 设置文件监控
    FileWatcherAPI::FileWatcher watcher;
    watcher.add_watch("/data/config", [](const auto& event) {
        std::cout << "文件 " << event.filename << " 发生变化" << std::endl;
    });
    watcher.start();
    
    return 0;
}
```

## 📖 组件分类

### 系统工具组件

| 工具 | 描述 | 使用场景 |
|------|------|----------|
| logger_daemon | 系统级日志守护进程 | 集中式日志收集 |
| logger_client | 日志客户端工具 | 多进程日志记录 |
| filewatcher | 文件监控工具 | 实时文件变化监控 |

### 开发API组件

| API | 描述 | 使用场景 |
|-----|------|----------|
| LoggerAPI::InternalLogger | 核心日志功能 | 应用程序内部日志 |
| FileWatcherAPI::FileWatcher | 文件系统事件监控 | 实时文件跟踪 |
| LoggerAPI全局函数 | 便捷的全局日志接口 | 简单日志记录 |

### 内部组件

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| BufferManager | 内存缓冲区管理 | 高性能I/O |
| FileManager | 文件操作和轮转 | 日志文件管理 |
| IPCClient | 进程间通信 | 守护进程通信 |

## 🔧 配置说明

### 系统工具配置

```bash
# logger_daemon 配置参数
./logger_daemon \
  -f /data/logs/app.log \     # 日志文件路径
  -s 10485760 \              # 最大文件大小(字节)
  -n 5 \                     # 保留文件数量
  -b 65536 \                 # 缓冲区大小(字节)
  -p /data/logs/logger.sock \ # Unix socket路径
  -t 1000                    # 刷新间隔(毫秒)

# filewatcher 配置参数
./filewatcher \
  -r \                       # 递归监控
  -d 3 \                     # 监控深度
  -e create,modify \         # 事件类型
  /data/config \             # 监控路径
  "echo 文件变化: %f"         # 执行命令
```

### 开发API配置

```cpp
// LoggerAPI配置
LoggerAPI::InternalLogger::Config config;
config.log_path = "/data/local/tmp/app.log";
config.max_file_size = 10 * 1024 * 1024;  // 10MB
config.max_files = 5;
config.min_log_level = LoggerAPI::LogLevel::INFO;
config.buffer_size = 64 * 1024;           // 64KB
config.flush_interval_ms = 1000;           // 1秒
config.log_format = "{timestamp} [{level}] {message}";

// FileWatcherAPI配置
uint32_t events = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::CREATE,
    FileWatcherAPI::EventType::MODIFY,
    FileWatcherAPI::EventType::DELETE
});
```

## 📊 性能考虑

### 日志系统性能

- **缓冲区大小**: 更大的缓冲区减少I/O频率
- **异步模式**: 非阻塞日志记录提高性能
- **日志级别过滤**: 减少不必要的日志输出
- **守护进程模式**: 集中化日志处理开销
- **批量刷新**: 定期批量写入磁盘

### 文件监控性能

- **事件过滤**: 减少不必要的事件处理
- **监控深度限制**: 避免深层目录结构
- **回调优化**: 在回调中使用异步处理
- **inotify限制**: 注意系统级监控限制
- **防抖动**: 避免短时间内重复处理

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