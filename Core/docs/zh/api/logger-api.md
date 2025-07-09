# Logger API 参考

Logger API 提供高性能、线程安全的日志记录功能，专为 Android root 环境设计。它支持自动文件轮转、可配置的缓冲和多种日志级别。

## 概述

Logger API 围绕 `InternalLogger` 类构建，提供：

- **高性能日志记录** - 异步写入和智能缓冲
- **自动文件轮转** - 基于文件大小的自动轮转
- **多日志级别** - 从调试到致命错误的分级日志
- **线程安全** - 多线程环境下的安全操作
- **可配置格式** - 自定义时间戳和消息格式
- **内存高效** - 可配置的缓冲区大小和刷新策略

## InternalLogger 类

### 配置选项

```cpp
struct LoggerConfig {
    std::string log_path;           // 日志文件路径
    size_t max_file_size;          // 最大文件大小（字节）
    int max_file_count;            // 最大文件数量
    size_t buffer_size;            // 缓冲区大小（字节）
    int flush_interval_ms;         // 刷新间隔（毫秒）
    LogLevel min_level;            // 最小日志级别
    std::string format;            // 日志格式字符串
};
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `log_path` | `std::string` | 必需 | 日志文件的完整路径 |
| `max_file_size` | `size_t` | 10MB | 单个日志文件的最大大小 |
| `max_file_count` | `int` | 5 | 保留的日志文件数量 |
| `buffer_size` | `size_t` | 64KB | 内存缓冲区大小 |
| `flush_interval_ms` | `int` | 1000 | 自动刷新间隔 |
| `min_level` | `LogLevel` | `INFO` | 记录的最小日志级别 |
| `format` | `std::string` | 默认格式 | 自定义日志格式 |

### 日志级别

```cpp
enum class LogLevel {
    TRACE = 0,    // 详细跟踪信息
    DEBUG = 1,    // 调试信息
    INFO = 2,     // 一般信息
    WARN = 3,     // 警告信息
    ERROR = 4,    // 错误信息
    FATAL = 5     // 致命错误
};
```

#### 级别使用指南

- **TRACE**: 非常详细的执行跟踪，通常仅在开发时使用
- **DEBUG**: 调试信息，帮助诊断问题
- **INFO**: 一般信息性消息，记录正常操作
- **WARN**: 警告消息，表示潜在问题但不影响功能
- **ERROR**: 错误消息，表示操作失败但程序可以继续
- **FATAL**: 致命错误，表示严重问题可能导致程序终止

### 构造函数

```cpp
// 使用配置结构体
InternalLogger(const LoggerConfig& config);

// 使用单独参数
InternalLogger(
    const std::string& log_path,
    size_t max_file_size = 10 * 1024 * 1024,  // 10MB
    int max_file_count = 5,
    size_t buffer_size = 64 * 1024,           // 64KB
    int flush_interval_ms = 1000,             // 1秒
    LogLevel min_level = LogLevel::INFO
);
```

### 日志记录方法

#### 基本日志记录

```cpp
// 通用日志方法
void log(LogLevel level, const std::string& message);

// 级别特定的便捷方法
void trace(const std::string& message);
void debug(const std::string& message);
void info(const std::string& message);
void warn(const std::string& message);
void error(const std::string& message);
void fatal(const std::string& message);
```

#### 格式化日志记录

```cpp
// printf 风格的格式化
template<typename... Args>
void logf(LogLevel level, const char* format, Args... args);

// 级别特定的格式化方法
template<typename... Args>
void tracef(const char* format, Args... args);

template<typename... Args>
void debugf(const char* format, Args... args);

template<typename... Args>
void infof(const char* format, Args... args);

template<typename... Args>
void warnf(const char* format, Args... args);

template<typename... Args>
void errorf(const char* format, Args... args);

template<typename... Args>
void fatalf(const char* format, Args... args);
```

### 控制方法

```cpp
// 立即刷新缓冲区到磁盘
void flush();

// 设置最小日志级别
void set_min_level(LogLevel level);

// 获取当前最小日志级别
LogLevel get_min_level() const;

// 检查特定级别是否会被记录
bool should_log(LogLevel level) const;

// 获取当前日志文件路径
std::string get_log_path() const;

// 获取当前日志文件大小
size_t get_current_file_size() const;
```

## 全局 API 函数

为了方便使用，提供了全局函数接口：

```cpp
// 初始化全局日志记录器
bool init_logger(const LoggerConfig& config);
bool init_logger(
    const std::string& log_path,
    size_t max_file_size = 10 * 1024 * 1024,
    int max_file_count = 5,
    size_t buffer_size = 64 * 1024,
    int flush_interval_ms = 1000,
    LogLevel min_level = LogLevel::INFO
);

// 全局日志记录函数
void log_trace(const std::string& message);
void log_debug(const std::string& message);
void log_info(const std::string& message);
void log_warn(const std::string& message);
void log_error(const std::string& message);
void log_fatal(const std::string& message);

// 全局格式化日志记录函数
template<typename... Args>
void log_tracef(const char* format, Args... args);

template<typename... Args>
void log_debugf(const char* format, Args... args);

template<typename... Args>
void log_infof(const char* format, Args... args);

template<typename... Args>
void log_warnf(const char* format, Args... args);

template<typename... Args>
void log_errorf(const char* format, Args... args);

template<typename... Args>
void log_fatalf(const char* format, Args... args);

// 全局控制函数
void flush_logger();
void set_log_level(LogLevel level);
LogLevel get_log_level();

// 清理全局日志记录器
void cleanup_logger();
```

## 日志格式自定义

### 默认格式

默认日志格式为：
```
[YYYY-MM-DD HH:MM:SS.mmm] [LEVEL] message
```

示例输出：
```
[2024-01-15 14:30:25.123] [INFO] Application started
[2024-01-15 14:30:25.456] [DEBUG] Loading configuration
[2024-01-15 14:30:25.789] [ERROR] Failed to connect to database
```

### 自定义格式

可以使用格式字符串自定义日志格式：

```cpp
LoggerConfig config;
config.format = "[%timestamp%] [%level%] [%thread%] %message%";
```

#### 支持的格式占位符

| 占位符 | 描述 | 示例 |
|--------|------|------|
| `%timestamp%` | 完整时间戳 | `2024-01-15 14:30:25.123` |
| `%date%` | 日期部分 | `2024-01-15` |
| `%time%` | 时间部分 | `14:30:25.123` |
| `%level%` | 日志级别 | `INFO`, `ERROR` |
| `%message%` | 日志消息 | 用户提供的消息 |
| `%thread%` | 线程ID | `12345` |
| `%file%` | 源文件名 | `main.cpp` |
| `%line%` | 源代码行号 | `42` |

## 文件轮转

### 轮转机制

当当前日志文件达到 `max_file_size` 时，自动进行文件轮转：

1. 当前文件重命名为 `.1` 后缀
2. 现有的编号文件依次递增
3. 超出 `max_file_count` 的文件被删除
4. 创建新的当前日志文件

### 轮转示例

假设 `max_file_count = 3`：

**轮转前：**
```
app.log      (当前，5MB)
app.log.1    (10MB)
app.log.2    (10MB)
```

**轮转后：**
```
app.log      (新文件，0MB)
app.log.1    (之前的 app.log，5MB)
app.log.2    (之前的 app.log.1，10MB)
```

### 轮转配置建议

```cpp
// 高频日志应用
config.max_file_size = 50 * 1024 * 1024;  // 50MB
config.max_file_count = 10;               // 保留10个文件

// 低频日志应用
config.max_file_size = 5 * 1024 * 1024;   // 5MB
config.max_file_count = 3;                // 保留3个文件

// 调试环境
config.max_file_size = 100 * 1024 * 1024; // 100MB
config.max_file_count = 20;               // 保留20个文件
```

## 性能考虑

### 缓冲策略

```cpp
// 高性能配置（大缓冲区，低刷新频率）
config.buffer_size = 1024 * 1024;      // 1MB 缓冲区
config.flush_interval_ms = 5000;       // 5秒刷新

// 低延迟配置（小缓冲区，高刷新频率）
config.buffer_size = 16 * 1024;        // 16KB 缓冲区
config.flush_interval_ms = 100;        // 100毫秒刷新

// 平衡配置
config.buffer_size = 64 * 1024;        // 64KB 缓冲区
config.flush_interval_ms = 1000;       // 1秒刷新
```

### 性能优化技巧

1. **适当的缓冲区大小**: 根据日志频率调整缓冲区大小
2. **合理的刷新间隔**: 平衡性能和数据安全性
3. **级别过滤**: 在生产环境中使用较高的最小日志级别
4. **避免频繁的 flush()**: 仅在关键时刻手动刷新

## 线程安全

Logger API 完全线程安全，可以在多线程环境中安全使用：

```cpp
// 多线程示例
#include <thread>
#include <vector>

void worker_thread(int thread_id) {
    for (int i = 0; i < 1000; ++i) {
        log_infof("Thread %d: Processing item %d", thread_id, i);
    }
}

int main() {
    // 初始化日志记录器
    init_logger("/data/local/tmp/multithread.log");
    
    // 启动多个工作线程
    std::vector<std::thread> threads;
    for (int i = 0; i < 4; ++i) {
        threads.emplace_back(worker_thread, i);
    }
    
    // 等待所有线程完成
    for (auto& t : threads) {
        t.join();
    }
    
    // 清理
    cleanup_logger();
    return 0;
}
```

## 错误处理

### 初始化错误

```cpp
if (!init_logger("/invalid/path/app.log")) {
    std::cerr << "Failed to initialize logger" << std::endl;
    return -1;
}
```

### 运行时错误

Logger API 内部处理大多数错误情况：

- **磁盘空间不足**: 尝试清理旧日志文件
- **权限错误**: 记录错误并继续运行
- **文件系统错误**: 自动重试机制

### 错误回调

```cpp
// 设置错误回调函数
logger.set_error_callback([](const std::string& error) {
    std::cerr << "Logger error: " << error << std::endl;
});
```

## 集成示例

### 基本集成

```cpp
#include "logger_api.hpp"

int main() {
    // 初始化日志记录器
    LoggerConfig config;
    config.log_path = "/data/local/tmp/myapp.log";
    config.max_file_size = 20 * 1024 * 1024;  // 20MB
    config.max_file_count = 5;
    config.min_level = LogLevel::DEBUG;
    
    if (!init_logger(config)) {
        return -1;
    }
    
    // 使用日志记录
    log_info("Application started");
    log_debugf("Processing %d items", 100);
    
    try {
        // 应用程序逻辑
        throw std::runtime_error("Something went wrong");
    } catch (const std::exception& e) {
        log_errorf("Exception caught: %s", e.what());
    }
    
    log_info("Application finished");
    
    // 清理
    cleanup_logger();
    return 0;
}
```

### 类集成

```cpp
class MyApplication {
private:
    std::unique_ptr<InternalLogger> logger_;
    
public:
    MyApplication() {
        LoggerConfig config;
        config.log_path = "/data/local/tmp/myapp.log";
        config.min_level = LogLevel::INFO;
        
        logger_ = std::make_unique<InternalLogger>(config);
        logger_->info("MyApplication initialized");
    }
    
    void process_data(const std::vector<int>& data) {
        logger_->infof("Processing %zu items", data.size());
        
        for (size_t i = 0; i < data.size(); ++i) {
            if (data[i] < 0) {
                logger_->warnf("Negative value at index %zu: %d", i, data[i]);
            }
            
            logger_->tracef("Processing item %zu: %d", i, data[i]);
        }
        
        logger_->info("Data processing completed");
    }
    
    ~MyApplication() {
        logger_->info("MyApplication destroyed");
        logger_->flush();
    }
};
```

### 与 FileWatcher 集成

```cpp
#include "logger_api.hpp"
#include "filewatcher_api.hpp"

class MonitoringService {
private:
    std::unique_ptr<InternalLogger> logger_;
    std::unique_ptr<FileWatcher> watcher_;
    
public:
    MonitoringService() {
        // 初始化日志记录器
        LoggerConfig config;
        config.log_path = "/data/local/tmp/monitor.log";
        config.min_level = LogLevel::INFO;
        logger_ = std::make_unique<InternalLogger>(config);
        
        // 初始化文件监控器
        watcher_ = std::make_unique<FileWatcher>();
        
        logger_->info("MonitoringService initialized");
    }
    
    void start_monitoring(const std::string& path) {
        logger_->infof("Starting monitoring of: %s", path.c_str());
        
        // 添加文件监控
        watcher_->add_watch(path, 
            EventType::CREATE | EventType::MODIFY | EventType::DELETE,
            [this](const FileEvent& event) {
                this->handle_file_event(event);
            });
        
        // 启动监控
        if (watcher_->start()) {
            logger_->info("File monitoring started successfully");
        } else {
            logger_->error("Failed to start file monitoring");
        }
    }
    
private:
    void handle_file_event(const FileEvent& event) {
        logger_->infof("File event: %s on %s", 
                      event_type_to_string(event.type).c_str(),
                      event.path.c_str());
        
        switch (event.type) {
            case EventType::CREATE:
                logger_->infof("New file created: %s", event.path.c_str());
                break;
            case EventType::MODIFY:
                logger_->infof("File modified: %s", event.path.c_str());
                break;
            case EventType::DELETE:
                logger_->warnf("File deleted: %s", event.path.c_str());
                break;
            default:
                logger_->debugf("Other file event on: %s", event.path.c_str());
                break;
        }
    }
};
```

## 最佳实践

### 1. 日志级别使用

```cpp
// 开发环境
config.min_level = LogLevel::TRACE;

// 测试环境
config.min_level = LogLevel::DEBUG;

// 生产环境
config.min_level = LogLevel::INFO;

// 关键系统
config.min_level = LogLevel::WARN;
```

### 2. 结构化日志记录

```cpp
// 好的做法：结构化信息
log_infof("User login: user_id=%d, ip=%s, timestamp=%ld", 
          user_id, ip_address.c_str(), timestamp);

// 避免：非结构化信息
log_info("User logged in");
```

### 3. 错误上下文

```cpp
// 好的做法：提供上下文
log_errorf("Database connection failed: host=%s, port=%d, error=%s",
           host.c_str(), port, error_msg.c_str());

// 避免：缺少上下文
log_error("Connection failed");
```

### 4. 性能敏感代码

```cpp
// 检查日志级别以避免不必要的字符串构造
if (logger->should_log(LogLevel::DEBUG)) {
    std::string expensive_debug_info = build_debug_info();
    logger->debugf("Debug info: %s", expensive_debug_info.c_str());
}
```

### 5. 资源管理

```cpp
// 在应用程序退出前刷新日志
void cleanup() {
    log_info("Application shutting down");
    flush_logger();
    cleanup_logger();
}

// 注册清理函数
std::atexit(cleanup);
```

## 另请参阅

- [FileWatcher API](/zh/api/filewatcher-api) - 文件监控 API
- [命令行工具](/zh/api/cli-tools) - logger_daemon 和 logger_client
- [基本用法示例](/zh/examples/basic-usage) - 完整使用示例
- [入门指南](/zh/guide/getting-started) - 快速开始