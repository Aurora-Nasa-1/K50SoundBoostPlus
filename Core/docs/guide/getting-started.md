# Getting Started

This guide will help you quickly get up and running with AuroraCore file monitoring in your Android root environment.

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
adb push build-arm64/src/filewatcher/filewatcher /data/local/tmp/

# Set executable permissions
adb shell chmod +x /data/local/tmp/filewatcher
```

## First Steps

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
   rm test_dir/test.txt
   ```

3. **Advanced Testing**:
   ```bash
   # Test recursive monitoring
   ./filewatcher -r test_dir "echo '[%t] %e: %f'" &
   
   # Create subdirectories and files
   mkdir test_dir/subdir
   echo "data" > test_dir/subdir/data.txt
   
   # Test with file filtering
   ./filewatcher -r --include="\.txt$" test_dir "echo 'Text file changed: %f'" &
   ```

## Using the FileWatcher API

### Basic FileWatcher Integration

Create a simple application using the FileWatcher API:

```cpp
// file_monitor.cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <signal.h>
#include <atomic>
#include <thread>
#include <chrono>

std::atomic<bool> running{true};

void signal_handler(int signal) {
    running = false;
}

int main() {
    // Setup signal handling
    signal(SIGINT, signal_handler);
    signal(SIGTERM, signal_handler);
    
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
    std::cout << "File monitoring started" << std::endl;
    
    // Keep running until signal received
    while (running) {
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    // Clean shutdown
    watcher.stop();
    std::cout << "File monitoring stopped" << std::endl;
    
    return 0;
}
```

### Advanced FileWatcher Usage

```cpp
// advanced_monitor.cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <regex>
#include <unordered_set>

class AdvancedFileMonitor {
private:
    FileWatcherAPI::FileWatcher watcher;
    std::unordered_set<std::string> watched_extensions;
    std::regex filename_pattern;
    
public:
    AdvancedFileMonitor() : filename_pattern(R"(\.(cpp|hpp|h|c)$)") {
        watched_extensions = {".cpp", ".hpp", ".h", ".c", ".conf", ".json"};
    }
    
    void start_monitoring(const std::string& path) {
        // Add recursive watch with custom filter
        watcher.add_watch(path,
            [this](const FileWatcherAPI::FileEvent& event) {
                handle_file_event(event);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::DELETE,
                FileWatcherAPI::EventType::MOVE
            }),
            true  // recursive
        );
        
        watcher.start();
        std::cout << "Advanced monitoring started for: " << path << std::endl;
    }
    
    void stop_monitoring() {
        watcher.stop();
        std::cout << "Monitoring stopped" << std::endl;
    }
    
private:
    void handle_file_event(const FileWatcherAPI::FileEvent& event) {
        // Filter by file extension
        if (!is_watched_file(event.filename)) {
            return;
        }
        
        std::string full_path = event.path;
        if (!event.filename.empty()) {
            full_path += "/" + event.filename;
        }
        
        switch (event.type) {
            case FileWatcherAPI::EventType::CREATE:
                std::cout << "[CREATE] New file: " << full_path << std::endl;
                trigger_build_if_source_file(full_path);
                break;
                
            case FileWatcherAPI::EventType::MODIFY:
                std::cout << "[MODIFY] File changed: " << full_path << std::endl;
                trigger_build_if_source_file(full_path);
                break;
                
            case FileWatcherAPI::EventType::DELETE:
                std::cout << "[DELETE] File removed: " << full_path << std::endl;
                break;
                
            case FileWatcherAPI::EventType::MOVE:
                std::cout << "[MOVE] File moved: " << full_path << std::endl;
                break;
                
            default:
                std::cout << "[OTHER] Event on: " << full_path << std::endl;
                break;
        }
    }
    
    bool is_watched_file(const std::string& filename) {
        if (filename.empty()) return false;
        
        // Check if file matches our pattern
        return std::regex_search(filename, filename_pattern);
    }
    
    void trigger_build_if_source_file(const std::string& filepath) {
        if (std::regex_search(filepath, filename_pattern)) {
            std::cout << "  -> Triggering build for source file change" << std::endl;
            // Here you could trigger a build system
            // system("make -j4");
        }
    }
};

int main() {
    AdvancedFileMonitor monitor;
    
    // Start monitoring source directory
    monitor.start_monitoring("/data/local/tmp/src");
    
    // Keep running
    std::cout << "Press Ctrl+C to stop..." << std::endl;
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    return 0;
}
```

### Building Your Application

Create a CMakeLists.txt for your application:

```cmake
cmake_minimum_required(VERSION 3.20)
project(FileMonitorApp)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add AuroraCore as subdirectory or find_package
add_subdirectory(path/to/AuroraCore)

# Create your executables
add_executable(file_monitor file_monitor.cpp)
add_executable(advanced_monitor advanced_monitor.cpp)

# Link against AuroraCore FileWatcher API
target_link_libraries(file_monitor PRIVATE filewatcherAPI)
target_link_libraries(advanced_monitor PRIVATE filewatcherAPI)

# Include directories
target_include_directories(file_monitor PRIVATE path/to/AuroraCore/src)
target_include_directories(advanced_monitor PRIVATE path/to/AuroraCore/src)
```

## Command Line Usage Examples

### Basic File Monitoring

```bash
# Monitor a single file
./filewatcher /data/config.txt "echo 'Config changed'"

# Monitor a directory
./filewatcher /data/uploads "echo 'New upload: %f'"

# Recursive monitoring
./filewatcher -r /data/project "echo 'Project file changed: %f'"
```

### Advanced Monitoring

```bash
# Monitor specific file types
./filewatcher -r --include="\.(cpp|hpp)$" /data/src "echo 'Source changed: %f'"

# Exclude temporary files
./filewatcher -r --exclude="\.(tmp|bak)$" /data/project "echo 'Important file changed: %f'"

# Monitor specific events
./filewatcher -e create,modify /data/uploads "process_upload.sh '%f'"

# Run as daemon
./filewatcher --daemon -r /data/critical "echo '[%t] Critical change: %f' >> /data/logs/critical.log"
```

### Real-World Scenarios

```bash
# Development auto-build
./filewatcher -r --include="\.(cpp|hpp|h)$" /data/src \
  "cd /data && make -j4 && echo 'Build completed'"

# Configuration reload
./filewatcher /etc/myapp/config.json \
  "systemctl reload myapp && echo 'Config reloaded'"

# Backup trigger
./filewatcher -e create /data/important \
  "rsync -av '%f' /backup/ && echo 'Backed up: %f'"

# Log rotation monitoring
./filewatcher /var/log/app.log \
  "if [ $(stat -c%s '%f') -gt 104857600 ]; then logrotate /etc/logrotate.d/app; fi"
```

## Next Steps

Now that you have AuroraCore file monitoring up and running:

1. **Explore Advanced Features**: Check out the [FileWatcher API Reference](/api/filewatcher-api) for detailed documentation
2. **Performance Tuning**: Read our [Performance Guide](/guide/performance) for optimization tips
3. **System Integration**: Learn about [System Tools](/guide/system-tools) for production deployment
4. **Troubleshooting**: Visit our [Building Guide](/guide/building) if you encounter issues

## Common Issues

### Permission Denied
Ensure your device has root access and the binaries have execute permissions:
```bash
adb shell su -c "chmod +x /data/local/tmp/filewatcher"
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

### File Monitoring Issues

**Too many files to watch**:
```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase limit (requires root)
echo 524288 > /proc/sys/fs/inotify/max_user_watches
```

**Events not triggering**:
```bash
# Test with verbose output
./filewatcher -v /path/to/watch "echo 'Event: %e on %f'"

# Check if path exists and is accessible
ls -la /path/to/watch
```

**High CPU usage**:
```bash
# Limit monitoring depth
./filewatcher -r -d 3 /path/to/watch "echo 'Change: %f'"

# Use file filtering to reduce events
./filewatcher -r --include="\.(conf|json)$" /path/to/watch "echo 'Config change: %f'"
```

For more detailed troubleshooting, see our [Building Guide](/guide/building) and [System Tools Guide](/guide/system-tools).