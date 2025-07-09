# 开发API

AuroraCore 提供现代 C++ 头文件库，让开发者能够轻松集成日志记录和文件监控功能到自己的 Android 应用程序中。

## API 概览

### LoggerAPI
高性能日志记录库，提供线程安全的日志记录功能。

**核心特性：**
- 头文件库，易于集成
- 多种日志级别
- 自动日志轮转
- 可配置缓冲区
- 线程安全

### FileWatcherAPI
基于 inotify 的文件监控库，提供实时文件系统事件监控。

**核心特性：**
- 实时事件监控
- 回调机制
- 多路径监控
- 事件过滤
- 低功耗设计

## 快速集成

### 项目结构
```
your_project/
├── src/
│   └── main.cpp
├── include/
│   └── auroracore/
│       ├── loggerAPI/
│       │   └── logger_api.hpp
│       └── filewatcherAPI/
│           └── filewatcher_api.hpp
└── CMakeLists.txt
```

### CMakeLists.txt 配置
```cmake
cmake_minimum_required(VERSION 3.18)
project(MyApp)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加 AuroraCore 头文件路径
include_directories(include)

# 创建可执行文件
add_executable(myapp src/main.cpp)

# Android 特定配置
if(ANDROID)
    find_library(log-lib log)
    target_link_libraries(myapp ${log-lib})
endif()
```

## LoggerAPI 使用示例

### 基本用法
```cpp
#include "auroracore/loggerAPI/logger_api.hpp"

int main() {
    // 配置日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/data/com.yourapp/files/app.log";
    config.max_file_size = 10 * 1024 * 1024; // 10MB
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    config.buffer_size = 8192;
    
    // 初始化日志器
    LoggerAPI::init_logger(config);
    
    // 记录日志
    LoggerAPI::info("应用程序启动");
    LoggerAPI::debug("调试信息: 用户ID = {}", user_id);
    LoggerAPI::warn("警告: 内存使用率较高");
    LoggerAPI::error("错误: 无法连接到服务器");
    
    // 关闭日志器
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### 高级配置
```cpp
// 自定义日志格式
config.enable_timestamp = true;
config.enable_thread_id = true;
config.enable_file_info = true;

// 性能优化
config.buffer_size = 16384;        // 增大缓冲区
config.flush_interval_ms = 1000;    // 延迟刷新
config.async_mode = true;           // 异步模式

// 日志轮转
config.max_file_size = 50 * 1024 * 1024;  // 50MB
config.max_backup_files = 5;               // 保留5个备份
```

## FileWatcherAPI 使用示例

### 基本文件监控
```cpp
#include "auroracore/filewatcherAPI/filewatcher_api.hpp"
#include <iostream>

int main() {
    FileWatcherAPI::FileWatcher watcher;
    
    // 添加文件监控
    watcher.add_watch("/data/data/com.yourapp/files/config.json", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::cout << "配置文件被 " 
                      << FileWatcherAPI::event_type_to_string(event.type) 
                      << std::endl;
            
            // 重新加载配置
            reload_config();
        },
        FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::MOVE
        })
    );
    
    // 启动监控
    watcher.start();
    
    // 应用程序主循环
    run_application();
    
    // 停止监控
    watcher.stop();
    return 0;
}
```

### 目录监控
```cpp
// 监控日志目录
watcher.add_watch("/data/data/com.yourapp/files/logs", 
    [](const FileWatcherAPI::FileEvent& event) {
        if (event.type == FileWatcherAPI::EventType::CREATE) {
            std::cout << "新日志文件: " << event.filename << std::endl;
            
            // 检查磁盘空间
            check_disk_space();
        }
    },
    FileWatcherAPI::make_event_mask({
        FileWatcherAPI::EventType::CREATE,
        FileWatcherAPI::EventType::DELETE
    })
);
```

## 集成最佳实践

### 错误处理
```cpp
try {
    LoggerAPI::init_logger(config);
} catch (const std::exception& e) {
    // 降级到 Android Log
    __android_log_print(ANDROID_LOG_ERROR, "MyApp", 
                        "Logger初始化失败: %s", e.what());
    
    // 使用备用日志方案
    use_fallback_logging();
}
```

### 资源管理
```cpp
class Application {
public:
    Application() {
        // 初始化日志器
        LoggerAPI::init_logger(config_);
        
        // 初始化文件监控
        watcher_.start();
    }
    
    ~Application() {
        // 确保资源清理
        watcher_.stop();
        LoggerAPI::shutdown_logger();
    }
    
private:
    LoggerAPI::InternalLogger::Config config_;
    FileWatcherAPI::FileWatcher watcher_;
};
```

### 线程安全
```cpp
// LoggerAPI 是线程安全的
std::thread worker([&]() {
    while (running_) {
        // 在工作线程中安全记录日志
        LoggerAPI::debug("工作线程处理: {}", task_id);
        process_task();
    }
});

// FileWatcher 回调在独立线程中执行
watcher.add_watch(path, [](const auto& event) {
    // 回调函数需要线程安全
    std::lock_guard<std::mutex> lock(mutex_);
    handle_file_event(event);
});
```

## 性能优化

### 日志性能
```cpp
// 高吞吐量配置
config.buffer_size = 32768;         // 32KB 缓冲区
config.flush_interval_ms = 2000;    // 2秒刷新间隔
config.async_mode = true;           // 异步写入

// 低延迟配置
config.buffer_size = 4096;          // 4KB 缓冲区
config.flush_interval_ms = 100;     // 100ms 刷新间隔
config.async_mode = false;          // 同步写入
```

### 文件监控优化
```cpp
// 避免监控大目录
watcher.add_watch("/data/specific_file.txt", callback);

// 而不是
// watcher.add_watch("/data", callback);  // 可能产生大量事件

// 使用事件过滤
auto mask = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::MODIFY  // 只监控修改事件
});
```

## Android 特定注意事项

### 权限要求
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### 文件路径
```cpp
// 推荐使用应用私有目录
std::string app_dir = "/data/data/" + package_name + "/files/";
config.log_path = app_dir + "app.log";

// 避免使用 /sdcard 等公共目录
// config.log_path = "/sdcard/app.log";  // 不推荐
```

### 生命周期管理
```cpp
// 在 Activity/Service 生命周期中正确管理
void onCreate() {
    LoggerAPI::init_logger(config);
    watcher_.start();
}

void onDestroy() {
    watcher_.stop();
    LoggerAPI::shutdown_logger();
}
```

## 相关文档

- [系统工具](/zh/guide/system-tools) - 了解命令行工具
- [Logger API](/zh/api/logger-api) - 详细的 Logger API 文档
- [FileWatcher API](/zh/api/filewatcher-api) - 详细的 FileWatcher API 文档
- [构建指南](/zh/guide/building) - 从源码构建项目