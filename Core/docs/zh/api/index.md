# API 参考

AuroraCore 组件的完整 API 文档。

## 📚 可用 API

### 核心组件

- **[Logger API](./logger-api)** - 高性能日志系统
  - 同步和异步日志记录
  - 多种输出格式和目标
  - 日志轮转和压缩
  - 系统级日志的守护进程模式

- **[FileWatcher API](./filewatcher-api)** - 实时文件系统监控
  - 基于 inotify 的文件监视
  - 递归目录监控
  - 事件过滤和批处理
  - 高性能事件处理

- **[CLI 工具](./cli-tools)** - 命令行实用程序
  - Logger 守护进程管理
  - 文件监控工具
  - 配置实用程序
  - 性能测试工具

## 🚀 快速开始

### 基本 Logger 使用

```cpp
#include "AuroraCore/logger_api.hpp"

// 初始化日志器
LoggerConfig config;
config.log_dir = "/sdcard/logs";
config.max_file_size = 10 * 1024 * 1024;  // 10MB

Logger logger(config);

// 记录日志消息
logger.info("应用程序已启动");
logger.error("发生错误: {}", error_message);
```

### 基本 FileWatcher 使用

```cpp
#include "AuroraCore/filewatcher_api.hpp"

// 设置文件监视器
FileWatcherConfig config;
config.recursive = true;
config.events = FileEvent::CREATED | FileEvent::MODIFIED;

FileWatcher watcher("/path/to/watch", config);

// 设置回调函数
watcher.set_callback([](const FileEvent& event) {
    std::cout << "文件 " << event.path << " 被 " << event.type << std::endl;
});

watcher.start();
```

## 📖 API 分类

### 日志 API

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| Logger | 核心日志功能 | 应用程序日志记录 |
| LoggerDaemon | 系统级日志服务 | 集中式日志记录 |
| LoggerClient | 守护进程通信客户端 | 多进程日志记录 |

### 文件监控 API

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| FileWatcher | 文件系统事件监控 | 实时文件跟踪 |
| WatcherCore | 低级 inotify 包装器 | 自定义监控解决方案 |

### 实用工具 API

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| BufferManager | 内存缓冲区管理 | 高性能 I/O |
| FileManager | 文件操作和轮转 | 日志文件管理 |
| IPCClient | 进程间通信 | 守护进程通信 |

## 🔧 配置

### Logger 配置

```cpp
struct LoggerConfig {
    std::string log_dir = "/tmp/logs";
    size_t max_file_size = 10 * 1024 * 1024;
    int max_files = 5;
    LogLevel min_level = LogLevel::INFO;
    bool async_mode = true;
    size_t buffer_size = 1024 * 1024;
    int flush_interval = 5000;
};
```

### FileWatcher 配置

```cpp
struct FileWatcherConfig {
    bool recursive = false;
    int max_depth = -1;
    FileEventMask events = FileEvent::ALL;
    std::vector<std::string> exclude_patterns;
    std::function<bool(const std::string&)> file_filter;
};
```

## 📊 性能考虑

### Logger 性能

- **缓冲区大小**: 更大的缓冲区减少 I/O 频率
- **异步模式**: 非阻塞日志记录以获得更好的性能
- **压缩**: 减少磁盘使用但增加 CPU 负载
- **守护进程模式**: 集中化日志开销

### FileWatcher 性能

- **事件过滤**: 减少不必要的事件
- **批处理**: 一起处理多个事件
- **递归限制**: 避免深层目录结构
- **inotify 限制**: 系统级监视限制

## 🔗 相关文档

- [入门指南](/zh/guide/getting-started)
- [性能优化](/zh/guide/performance)
- [从源码构建](/zh/guide/building)
- [常见问题](/zh/guide/faq)
- [基本使用示例](/zh/examples/basic-usage)

## 📞 支持

对于 API 特定问题：

- 查看每个组件的详细 API 文档
- 查阅[常见问题](/zh/guide/faq)了解常见问题
- 浏览[示例](/zh/examples/basic-usage)了解使用模式
- 在 [GitHub](https://github.com/APMMDEVS/AuroraCore/issues) 上提交问题