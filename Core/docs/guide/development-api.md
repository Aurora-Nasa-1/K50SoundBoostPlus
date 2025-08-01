# 开发API指南 (Development API Guide)

本指南介绍如何使用AuroraCore的C++头文件库来开发自定义应用程序。这些API专为开发者设计，用于集成到现有项目或构建新的解决方案。

## 📚 API概览

### 可用API库

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

## 👁️ FileWatcherAPI使用指南

### 基本文件监控

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
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
    std::cout << "文件监控已启动" << std::endl;
    
    // 主循环
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    // 停止监控
    watcher.stop();
    std::cout << "文件监控已停止" << std::endl;
    
    return 0;
}
```

### 高级监控应用

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <unordered_map>
#include <chrono>
#include <iostream>

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
        std::cout << "配置管理器初始化完成" << std::endl;
    }
    
    void shutdown() {
        watcher_.stop();
        std::cout << "配置管理器已关闭" << std::endl;
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
        
        std::cout << "配置文件变更: " << full_path << std::endl;
        
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
            std::cout << "检测到新插件: " << plugin_path << std::endl;
            load_plugin(plugin_path);
        } else if (event.type == FileWatcherAPI::EventType::DELETE) {
            std::cout << "插件已删除: " << plugin_path << std::endl;
            unload_plugin(plugin_path);
        }
    }
    
    void reload_configuration(const std::string& config_path) {
        try {
            // 实现配置重载逻辑
            std::cout << "配置重载成功: " << config_path << std::endl;
        } catch (const std::exception& e) {
            std::cout << "配置重载失败: " << config_path << ", 错误: " << e.what() << std::endl;
        }
    }
    
    void reload_json_config(const std::string& json_path) {
        // 实现JSON配置重载
        std::cout << "JSON配置重载: " << json_path << std::endl;
    }
    
    void load_plugin(const std::string& plugin_path) {
        // 实现插件加载
        std::cout << "加载插件: " << plugin_path << std::endl;
    }
    
    void unload_plugin(const std::string& plugin_path) {
        // 实现插件卸载
        std::cout << "卸载插件: " << plugin_path << std::endl;
    }
};
```

### 多路径监控示例

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <vector>
#include <string>

class MultiPathWatcher {
private:
    FileWatcherAPI::FileWatcher watcher_;
    std::vector<std::string> watch_paths_;
    
public:
    void add_paths(const std::vector<std::string>& paths) {
        for (const auto& path : paths) {
            watch_paths_.push_back(path);
            
            watcher_.add_watch(path,
                [this, path](const FileWatcherAPI::FileEvent& event) {
                    handle_event(path, event);
                },
                FileWatcherAPI::make_event_mask({
                    FileWatcherAPI::EventType::CREATE,
                    FileWatcherAPI::EventType::MODIFY,
                    FileWatcherAPI::EventType::DELETE,
                    FileWatcherAPI::EventType::MOVE
                })
            );
        }
    }
    
    void start_monitoring() {
        watcher_.start();
        std::cout << "开始监控 " << watch_paths_.size() << " 个路径" << std::endl;
    }
    
    void stop_monitoring() {
        watcher_.stop();
        std::cout << "停止监控" << std::endl;
    }
    
private:
    void handle_event(const std::string& base_path, const FileWatcherAPI::FileEvent& event) {
        std::cout << "[" << base_path << "] "
                  << FileWatcherAPI::event_type_to_string(event.type)
                  << ": " << event.path;
        
        if (!event.filename.empty()) {
            std::cout << "/" << event.filename;
        }
        
        std::cout << std::endl;
    }
};

int main() {
    MultiPathWatcher watcher;
    
    // 添加多个监控路径
    watcher.add_paths({
        "/data/local/tmp/logs",
        "/data/local/tmp/config",
        "/data/local/tmp/cache"
    });
    
    watcher.start_monitoring();
    
    // 运行一段时间
    std::this_thread::sleep_for(std::chrono::seconds(30));
    
    watcher.stop_monitoring();
    
    return 0;
}
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

### 内存和CPU优化

```cpp
class OptimizedWatcher {
private:
    FileWatcherAPI::FileWatcher watcher_;
    std::queue<FileWatcherAPI::FileEvent> event_queue_;
    std::mutex queue_mutex_;
    std::condition_variable queue_cv_;
    std::thread processor_thread_;
    std::atomic<bool> running_{true};
    
public:
    void start() {
        // 启动事件处理线程
        processor_thread_ = std::thread([this]() {
            process_events();
        });
        
        // 配置监控器
        watcher_.add_watch("/data/local/tmp",
            [this](const FileWatcherAPI::FileEvent& event) {
                // 快速入队，避免阻塞监控线程
                {
                    std::lock_guard<std::mutex> lock(queue_mutex_);
                    event_queue_.push(event);
                }
                queue_cv_.notify_one();
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY
            })
        );
        
        watcher_.start();
    }
    
    void stop() {
        running_ = false;
        queue_cv_.notify_all();
        
        if (processor_thread_.joinable()) {
            processor_thread_.join();
        }
        
        watcher_.stop();
    }
    
private:
    void process_events() {
        while (running_) {
            std::unique_lock<std::mutex> lock(queue_mutex_);
            queue_cv_.wait(lock, [this]() {
                return !event_queue_.empty() || !running_;
            });
            
            while (!event_queue_.empty()) {
                auto event = event_queue_.front();
                event_queue_.pop();
                lock.unlock();
                
                // 处理事件（可能耗时的操作）
                handle_event_async(event);
                
                lock.lock();
            }
        }
    }
    
    void handle_event_async(const FileWatcherAPI::FileEvent& event) {
        // 异步处理事件，不阻塞监控
        std::cout << "异步处理: " << event.path << std::endl;
    }
};
```

## 🔗 相关资源

- [系统工具指南](/guide/system-tools) - 了解预编译二进制工具的使用
- [API参考文档](/api/) - 详细的API文档
- [示例代码](/examples/) - 更多使用示例
- [性能调优](/guide/performance) - 性能优化指南
- [构建指南](/guide/building) - 详细的构建说明