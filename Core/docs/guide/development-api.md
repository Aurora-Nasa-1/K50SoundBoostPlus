# 开发API指南 (Development API Guide)

本指南介绍如何使用AuroraCore的C++头文件库来开发自定义应用程序。这些API专为开发者设计，用于集成到现有项目或构建新的解决方案。

## 📚 API概览

### 可用API库

- **LoggerAPI** - 高性能日志记录库 (`loggerAPI/logger_api.hpp`)
- **FileWatcherAPI** - 文件系统监控库 (`filewatcherAPI/filewatcher_api.hpp`)

### API特点

- ✅ **头文件库** - 无需链接，直接包含即可使用
- ✅ **现代C++** - 使用C++17标准，支持最新特性
- ✅ **线程安全** - 内置线程安全机制
- ✅ **高性能** - 针对Android环境优化
- ✅ **易于集成** - 最小化依赖，简单的API设计

## 🚀 快速开始

### 1. 获取API头文件

#### 方法一：克隆仓库

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
```

#### 方法二：下载头文件

```bash
# 下载LoggerAPI
wget https://raw.githubusercontent.com/APMMDEVS/AuroraCore/main/src/loggerAPI/logger_api.hpp

# 下载FileWatcherAPI
wget https://raw.githubusercontent.com/APMMDEVS/AuroraCore/main/src/filewatcherAPI/filewatcher_api.hpp
```

### 2. 项目集成

#### CMake集成

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.10)
project(MyApp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加AuroraCore头文件路径
include_directories(${CMAKE_SOURCE_DIR}/AuroraCore/src)

# 查找线程库
find_package(Threads REQUIRED)

# 创建可执行文件
add_executable(myapp main.cpp)

# 链接线程库
target_link_libraries(myapp Threads::Threads)

# Android NDK配置
if(ANDROID)
    target_link_libraries(myapp log)
endif()
```

#### Android.mk集成

```makefile
# Android.mk
LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)
LOCAL_MODULE := myapp
LOCAL_SRC_FILES := main.cpp
LOCAL_C_INCLUDES := $(LOCAL_PATH)/AuroraCore/src
LOCAL_CPPFLAGS := -std=c++17 -pthread
LOCAL_LDLIBS := -llog -pthread
include $(BUILD_EXECUTABLE)
```

## 📝 LoggerAPI使用指南

### 基本使用

```cpp
#include "loggerAPI/logger_api.hpp"
#include <iostream>

int main() {
    // 配置日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/local/tmp/myapp.log";
    config.max_file_size = 10 * 1024 * 1024; // 10MB
    config.max_files = 5;
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    config.flush_interval_ms = 1000;
    
    // 创建日志器实例
    LoggerAPI::InternalLogger logger(config);
    
    // 记录不同级别的日志
    logger.log(LoggerAPI::LogLevel::INFO, "应用程序启动");
    logger.log(LoggerAPI::LogLevel::DEBUG, "调试信息");
    logger.log(LoggerAPI::LogLevel::ERROR, "发生错误");
    
    // 强制刷新
    logger.flush();
    
    // 停止日志器
    logger.stop();
    
    return 0;
}
```

### 全局API使用

```cpp
#include "loggerAPI/logger_api.hpp"

int main() {
    // 初始化全局日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/local/tmp/global.log";
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    
    LoggerAPI::init_logger(config);
    
    // 使用全局函数记录日志
    LoggerAPI::info("应用程序初始化完成");
    LoggerAPI::debug("处理用户请求");
    LoggerAPI::warn("内存使用率较高");
    LoggerAPI::error("网络连接超时");
    LoggerAPI::fatal("系统致命错误");
    
    // 清理
    LoggerAPI::flush_logs();
    LoggerAPI::shutdown_logger();
    
    return 0;
}
```

### 高级配置

```cpp
#include "loggerAPI/logger_api.hpp"

class MyApplication {
private:
    std::unique_ptr<LoggerAPI::InternalLogger> logger_;
    
public:
    void initialize() {
        LoggerAPI::InternalLogger::Config config;
        
        // 自定义日志格式
        config.log_format = "[{timestamp}] {level} | {thread_id} | {message}";
        
        // 性能优化配置
        config.buffer_size = 128 * 1024; // 128KB缓冲区
        config.flush_interval_ms = 2000;  // 2秒刷新间隔
        config.auto_flush = true;
        
        // 文件管理配置
        config.log_path = "/data/local/tmp/myapp.log";
        config.max_file_size = 50 * 1024 * 1024; // 50MB
        config.max_files = 10;
        
        // 日志级别过滤
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        
        logger_ = std::make_unique<LoggerAPI::InternalLogger>(config);
        
        logger_->log(LoggerAPI::LogLevel::INFO, "应用程序初始化完成");
    }
    
    void process_request(const std::string& request_id) {
        logger_->log(LoggerAPI::LogLevel::DEBUG, 
                    "开始处理请求: " + request_id);
        
        try {
            // 处理业务逻辑
            do_business_logic();
            
            logger_->log(LoggerAPI::LogLevel::INFO, 
                        "请求处理成功: " + request_id);
        } catch (const std::exception& e) {
            logger_->log(LoggerAPI::LogLevel::ERROR, 
                        "请求处理失败: " + request_id + ", 错误: " + e.what());
        }
    }
    
    void shutdown() {
        if (logger_) {
            logger_->log(LoggerAPI::LogLevel::INFO, "应用程序关闭");
            logger_->stop();
        }
    }
    
private:
    void do_business_logic() {
        // 业务逻辑实现
    }
};
```

## 👁️ FileWatcherAPI使用指南

### 基本文件监控

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"
#include <iostream>
#include <signal.h>

std::atomic<bool> running{true};

void signal_handler(int signal) {
    running = false;
}

int main() {
    // 设置信号处理
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // 初始化日志
    LoggerAPI::InternalLogger::Config log_config;
    log_config.log_path = "/data/local/tmp/watcher.log";
    LoggerAPI::init_logger(log_config);
    
    // 创建文件监控器
    FileWatcherAPI::FileWatcher watcher;
    
    // 添加监控路径
    watcher.add_watch("/data/local/tmp/config", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::string message = "文件事件: " + 
                FileWatcherAPI::event_type_to_string(event.type) + 
                " 路径: " + event.path;
            
            if (!event.filename.empty()) {
                message += "/" + event.filename;
            }
            
            LoggerAPI::info(message);
            std::cout << message << std::endl;
        },
        FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::CREATE,
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::DELETE
        })
    );
    
    // 启动监控
    watcher.start();
    LoggerAPI::info("文件监控已启动");
    
    // 主循环
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    // 停止监控
    watcher.stop();
    LoggerAPI::info("文件监控已停止");
    
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### 高级监控应用

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"
#include <unordered_map>
#include <chrono>

class ConfigurationManager {
private:
    FileWatcherAPI::FileWatcher watcher_;
    std::unordered_map<std::string, std::chrono::steady_clock::time_point> last_reload_;
    std::mutex reload_mutex_;
    
public:
    void initialize() {
        // 监控配置目录
        watcher_.add_watch("/data/app/config",
            [this](const FileWatcherAPI::FileEvent& event) {
                handle_config_change(event);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE
            })
        );
        
        // 监控插件目录
        watcher_.add_watch("/data/app/plugins",
            [this](const FileWatcherAPI::FileEvent& event) {
                handle_plugin_change(event);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::DELETE
            })
        );
        
        watcher_.start();
        LoggerAPI::info("配置管理器初始化完成");
    }
    
    void shutdown() {
        watcher_.stop();
        LoggerAPI::info("配置管理器已关闭");
    }
    
private:
    void handle_config_change(const FileWatcherAPI::FileEvent& event) {
        std::lock_guard<std::mutex> lock(reload_mutex_);
        
        std::string full_path = event.path + "/" + event.filename;
        auto now = std::chrono::steady_clock::now();
        
        // 防抖动：避免短时间内重复重载
        auto it = last_reload_.find(full_path);
        if (it != last_reload_.end()) {
            auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>
                          (now - it->second).count();
            if (elapsed < 1000) { // 1秒内不重复处理
                return;
            }
        }
        
        last_reload_[full_path] = now;
        
        LoggerAPI::info("配置文件变更: " + full_path);
        
        // 重载配置
        if (event.filename.ends_with(".conf")) {
            reload_configuration(full_path);
        } else if (event.filename.ends_with(".json")) {
            reload_json_config(full_path);
        }
    }
    
    void handle_plugin_change(const FileWatcherAPI::FileEvent& event) {
        std::string plugin_path = event.path + "/" + event.filename;
        
        if (event.type == FileWatcherAPI::EventType::CREATE) {
            LoggerAPI::info("检测到新插件: " + plugin_path);
            load_plugin(plugin_path);
        } else if (event.type == FileWatcherAPI::EventType::DELETE) {
            LoggerAPI::info("插件已删除: " + plugin_path);
            unload_plugin(plugin_path);
        }
    }
    
    void reload_configuration(const std::string& config_path) {
        try {
            // 实现配置重载逻辑
            LoggerAPI::info("配置重载成功: " + config_path);
        } catch (const std::exception& e) {
            LoggerAPI::error("配置重载失败: " + config_path + ", 错误: " + e.what());
        }
    }
    
    void reload_json_config(const std::string& json_path) {
        // 实现JSON配置重载
    }
    
    void load_plugin(const std::string& plugin_path) {
        // 实现插件加载
    }
    
    void unload_plugin(const std::string& plugin_path) {
        // 实现插件卸载
    }
};
```

## 🔧 构建配置

### Android NDK构建

```bash
# 配置环境变量
export ANDROID_NDK_ROOT=/path/to/android-ndk

# ARM64构建
cmake -B build-arm64 \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release

cmake --build build-arm64
```

### 交叉编译配置

```cmake
# toolchain.cmake
set(CMAKE_SYSTEM_NAME Android)
set(CMAKE_SYSTEM_VERSION 21)
set(CMAKE_ANDROID_ARCH_ABI arm64-v8a)
set(CMAKE_ANDROID_NDK $ENV{ANDROID_NDK_ROOT})
set(CMAKE_ANDROID_STL_TYPE c++_shared)

# 编译器设置
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -O3")
```

## 📊 性能优化建议

### LoggerAPI优化

```cpp
// 高性能配置
LoggerAPI::InternalLogger::Config config;
config.buffer_size = 256 * 1024;      // 更大的缓冲区
config.flush_interval_ms = 5000;       // 较长的刷新间隔
config.auto_flush = true;              // 启用自动刷新
config.min_log_level = LoggerAPI::LogLevel::INFO; // 过滤调试日志
```

### FileWatcherAPI优化

```cpp
// 事件过滤，只监控需要的事件
uint32_t events = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::MODIFY,
    FileWatcherAPI::EventType::CREATE
    // 不监控ACCESS事件，减少噪音
});

// 在回调中使用异步处理
watcher.add_watch(path, [](const FileWatcherAPI::FileEvent& event) {
    // 将事件放入队列，异步处理
    event_queue.push(event);
}, events);
```

## 🔗 相关资源

- [系统工具指南](/guide/system-tools) - 了解预编译二进制工具的使用
- [API参考文档](/api/) - 详细的API文档
- [示例代码](/examples/) - 更多使用示例
- [性能调优](/guide/performance) - 性能优化指南
- [构建指南](/guide/building) - 详细的构建说明