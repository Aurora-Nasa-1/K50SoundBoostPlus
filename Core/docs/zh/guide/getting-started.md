# 快速开始

本指南将帮助您快速在Android root环境中开始使用AuroraCore。

## 前置要求

开始之前，请确保您具备以下条件：

- **Android设备**: 需要root权限
- **开发环境**: 
  - CMake 3.20 或更高版本
  - Android NDK r25c 或更高版本
  - 支持C++20的编译器（NDK自带）
- **目标架构**: ARM64（推荐）或ARMv7

## 快速安装

### 1. 克隆仓库

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
```

### 2. 设置Android NDK

```bash
# 设置Android NDK环境变量
export ANDROID_NDK_ROOT=/path/to/android-ndk

# 验证NDK安装
$ANDROID_NDK_ROOT/ndk-build --version
```

### 3. 构建ARM64版本（推荐）

```bash
# 配置构建
cmake -B build-arm64 \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release

# 构建项目
cmake --build build-arm64
```

### 4. 部署到设备

```bash
# 推送二进制文件到设备
adb push build-arm64/src/logger/logger_daemon /data/local/tmp/
adb push build-arm64/src/logger/logger_client /data/local/tmp/
adb push build-arm64/src/filewatcher/filewatcher /data/local/tmp/

# 设置可执行权限
adb shell chmod +x /data/local/tmp/logger_daemon
adb shell chmod +x /data/local/tmp/logger_client
adb shell chmod +x /data/local/tmp/filewatcher
```

## 第一步

### 测试日志系统

1. **启动日志守护进程**:
   ```bash
   adb shell
   cd /data/local/tmp
   ./logger_daemon -f app.log -s 10485760 -n 5
   ```

2. **发送测试消息**:
   ```bash
   # 在另一个终端中
   adb shell
   cd /data/local/tmp
   ./logger_client "来自AuroraCore的问候！"
   ./logger_client "这是一条测试消息"
   ```

3. **验证日志**:
   ```bash
   cat app.log
   ```

### 测试文件监听

1. **启动文件监听器**:
   ```bash
   adb shell
   cd /data/local/tmp
   mkdir test_dir
   ./filewatcher test_dir "echo '文件已更改: %f'" &
   ```

2. **触发事件**:
   ```bash
   # 创建文件以触发监听器
   echo "测试内容" > test_dir/test.txt
   echo "修改内容" >> test_dir/test.txt
   ```

## 使用API

### Logger API集成

创建一个使用Logger API的简单应用程序：

```cpp
// my_app.cpp
#include "loggerAPI/logger_api.hpp"
#include <iostream>

int main() {
    // 配置日志器
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/local/tmp/my_app.log";
    config.max_file_size = 5 * 1024 * 1024; // 5MB
    config.max_files = 3;
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    config.flush_interval_ms = 1000;
    
    // 初始化日志器
    LoggerAPI::init_logger(config);
    
    // 记录不同级别的日志消息
    LoggerAPI::info("应用程序启动成功");
    LoggerAPI::debug("调试模式已启用");
    LoggerAPI::warn("这是一条警告消息");
    LoggerAPI::error("发生了一个错误");
    
    // 模拟一些工作
    for (int i = 0; i < 10; ++i) {
        LoggerAPI::info("正在处理项目 " + std::to_string(i));
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    LoggerAPI::info("应用程序完成");
    
    // 清理关闭
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### FileWatcher API集成

```cpp
// file_monitor.cpp
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
    
    // 初始化日志器
    LoggerAPI::InternalLogger::Config log_config;
    log_config.log_path = "/data/local/tmp/monitor.log";
    LoggerAPI::init_logger(log_config);
    
    // 创建文件监听器
    FileWatcherAPI::FileWatcher watcher;
    
    // 为配置目录添加监听
    watcher.add_watch("/data/local/tmp/config", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::string message = "文件事件: " + 
                FileWatcherAPI::event_type_to_string(event.type) + 
                " 在 " + event.path;
            
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
    
    // 开始监控
    watcher.start();
    LoggerAPI::info("文件监控已启动");
    
    // 保持运行直到收到信号
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    // 清理关闭
    watcher.stop();
    LoggerAPI::info("文件监控已停止");
    LoggerAPI::shutdown_logger();
    
    return 0;
}
```

### 构建您的应用程序

为您的应用程序创建CMakeLists.txt：

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyApp)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 添加AuroraCore作为子目录或find_package
add_subdirectory(path/to/AuroraCore)

# 创建您的可执行文件
add_executable(my_app my_app.cpp)
add_executable(file_monitor file_monitor.cpp)

# 链接AuroraCore API
target_link_libraries(my_app PRIVATE loggerAPI)
target_link_libraries(file_monitor PRIVATE loggerAPI filewatcherAPI)

# 包含目录
target_include_directories(my_app PRIVATE path/to/AuroraCore/src)
target_include_directories(file_monitor PRIVATE path/to/AuroraCore/src)
```

## 下一步

现在您已经让AuroraCore运行起来了：

1. **探索高级功能**: 查看[API参考](/zh/api/logger-api)获取详细文档
2. **性能调优**: 阅读我们的[性能指南](/zh/guide/performance)获取优化技巧
3. **集成示例**: 浏览[示例](/zh/examples/basic-usage)了解实际使用案例
4. **故障排除**: 如果遇到问题，请访问我们的[常见问题](/zh/guide/faq)

## 常见问题

### 权限被拒绝
确保您的设备具有root权限，并且二进制文件具有执行权限：
```bash
adb shell su -c "chmod +x /data/local/tmp/logger_daemon"
```

### 找不到NDK
验证您的NDK安装和环境变量：
```bash
echo $ANDROID_NDK_ROOT
ls $ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake
```

### 构建错误
确保您使用的是兼容的NDK版本（r25c+）和CMake 3.20+：
```bash
cmake --version
$ANDROID_NDK_ROOT/ndk-build --version
```

如需更详细的故障排除，请参阅我们的[构建指南](/zh/guide/building)。