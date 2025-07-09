# Getting Started

This guide will help you quickly get up and running with AuroraCore in your Android root environment.

## Prerequisites

Before you begin, ensure you have the following:

- **Android Device**: Root access required
- **Development Environment**: 
  - CMake 3.20 or higher
  - Android NDK r25c or higher
  - C++20 compatible compiler (included with NDK)
- **Target Architecture**: ARM64 (recommended) or ARMv7

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
```

### 2. Set Up Android NDK

```bash
# Set Android NDK environment variable
export ANDROID_NDK_ROOT=/path/to/android-ndk

# Verify NDK installation
$ANDROID_NDK_ROOT/ndk-build --version
```

### 3. Build for ARM64 (Recommended)

```bash
# Configure build
cmake -B build-arm64 \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release

# Build the project
cmake --build build-arm64
```

### 4. Deploy to Device

```bash
# Push binaries to device
adb push build-arm64/src/logger/logger_daemon /data/local/tmp/
adb push build-arm64/src/logger/logger_client /data/local/tmp/
adb push build-arm64/src/filewatcher/filewatcher /data/local/tmp/

# Set executable permissions
adb shell chmod +x /data/local/tmp/logger_daemon
adb shell chmod +x /data/local/tmp/logger_client
adb shell chmod +x /data/local/tmp/filewatcher
```

## First Steps

### Testing the Logger System

1. **Start the Logger Daemon**:
   ```bash
   adb shell
   cd /data/local/tmp
   ./logger_daemon -f app.log -s 10485760 -n 5
   ```

2. **Send Test Messages**:
   ```bash
   # In another terminal
   adb shell
   cd /data/local/tmp
   ./logger_client "Hello from AuroraCore!"
   ./logger_client "This is a test message"
   ```

3. **Verify Logs**:
   ```bash
   cat app.log
   ```

### Testing the File Watcher

1. **Start File Watcher**:
   ```bash
   adb shell
   cd /data/local/tmp
   mkdir test_dir
   ./filewatcher test_dir "echo 'File changed: %f'" &
   ```

2. **Trigger Events**:
   ```bash
   # Create a file to trigger the watcher
   echo "test content" > test_dir/test.txt
   echo "modified content" >> test_dir/test.txt
   ```

## Using the APIs

### Logger API Integration

Create a simple application using the Logger API:

```cpp
// my_app.cpp
#include "loggerAPI/logger_api.hpp"
#include <iostream>

int main() {
    // Configure logger
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "/data/local/tmp/my_app.log";
    config.max_file_size = 5 * 1024 * 1024; // 5MB
    config.max_files = 3;
    config.min_log_level = LoggerAPI::LogLevel::DEBUG;
    config.flush_interval_ms = 1000;
    
    // Initialize logger
    LoggerAPI::init_logger(config);
    
    // Log messages at different levels
    LoggerAPI::info("Application started successfully");
    LoggerAPI::debug("Debug mode enabled");
    LoggerAPI::warn("This is a warning message");
    LoggerAPI::error("An error occurred");
    
    // Simulate some work
    for (int i = 0; i < 10; ++i) {
        LoggerAPI::info("Processing item " + std::to_string(i));
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    LoggerAPI::info("Application finished");
    
    // Clean shutdown
    LoggerAPI::shutdown_logger();
    return 0;
}
```

### FileWatcher API Integration

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
    // Setup signal handling
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
    // Initialize logger
    LoggerAPI::InternalLogger::Config log_config;
    log_config.log_path = "/data/local/tmp/monitor.log";
    LoggerAPI::init_logger(log_config);
    
    // Create file watcher
    FileWatcherAPI::FileWatcher watcher;
    
    // Add watch for configuration directory
    watcher.add_watch("/data/local/tmp/config", 
        [](const FileWatcherAPI::FileEvent& event) {
            std::string message = "File event: " + 
                FileWatcherAPI::event_type_to_string(event.type) + 
                " on " + event.path;
            
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
    
    // Start monitoring
    watcher.start();
    LoggerAPI::info("File monitoring started");
    
    // Keep running until signal received
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    // Clean shutdown
    watcher.stop();
    LoggerAPI::info("File monitoring stopped");
    LoggerAPI::shutdown_logger();
    
    return 0;
}
```

### Building Your Application

Create a CMakeLists.txt for your application:

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyApp)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add AuroraCore as subdirectory or find_package
add_subdirectory(path/to/AuroraCore)

# Create your executable
add_executable(my_app my_app.cpp)
add_executable(file_monitor file_monitor.cpp)

# Link against AuroraCore APIs
target_link_libraries(my_app PRIVATE loggerAPI)
target_link_libraries(file_monitor PRIVATE loggerAPI filewatcherAPI)

# Include directories
target_include_directories(my_app PRIVATE path/to/AuroraCore/src)
target_include_directories(file_monitor PRIVATE path/to/AuroraCore/src)
```

## Next Steps

Now that you have AuroraCore up and running:

1. **Explore Advanced Features**: Check out the [API Reference](/api/logger-api) for detailed documentation
2. **Performance Tuning**: Read our [Performance Guide](/guide/performance) for optimization tips
3. **Integration Examples**: Browse [Examples](/examples/basic-usage) for real-world use cases
4. **Troubleshooting**: Visit our [FAQ](/guide/faq) if you encounter issues

## Common Issues

### Permission Denied
Ensure your device has root access and the binaries have execute permissions:
```bash
adb shell su -c "chmod +x /data/local/tmp/logger_daemon"
```

### NDK Not Found
Verify your NDK installation and environment variable:
```bash
echo $ANDROID_NDK_ROOT
ls $ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake
```

### Build Errors
Ensure you're using a compatible NDK version (r25c+) and CMake 3.20+:
```bash
cmake --version
$ANDROID_NDK_ROOT/ndk-build --version
```

For more detailed troubleshooting, see our [Building Guide](/guide/building).