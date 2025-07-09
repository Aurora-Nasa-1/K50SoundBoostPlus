# FileWatcherAPI参考 (FileWatcher API Reference)

FileWatcherAPI为Android root环境提供高效、低功耗的文件系统监控功能。基于Linux inotify机制，提供实时文件变化检测和可定制的事件处理。

## 📚 API概览

FileWatcherAPI使应用程序能够以最小的CPU使用率和功耗监控文件系统变化。主要特性：

- **实时监控**: 基于inotify的事件检测
- **自定义回调**: 用户定义的事件处理器
- **节能高效**: 智能轮询和休眠机制
- **多监控点**: 同时监控多个文件/目录
- **事件过滤**: 可配置的事件类型

## 🔧 核心类详解

### FileWatcher类

主要的文件系统监控类。

```cpp
class FileWatcher {
public:
    FileWatcher();
    ~FileWatcher();
    
    bool add_watch(const std::string& path, EventCallback callback, 
                   uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE);
    void start();
    void stop();
    bool is_running() const;
};
```

## 📋 事件类型

### EventType枚举

```cpp
enum class EventType {
    MODIFY = IN_MODIFY,    // 文件被修改
    CREATE = IN_CREATE,    // 文件/目录被创建
    DELETE = IN_DELETE,    // 文件/目录被删除
    MOVE   = IN_MOVE,      // 文件/目录被移动
    ATTRIB = IN_ATTRIB,    // 元数据变化（权限、时间戳等）
    ACCESS = IN_ACCESS     // 文件被访问（读取）
};
```

### 事件类型说明

| 事件类型 | 描述 | 使用场景 |
|---------|------|----------|
| `MODIFY` | 文件内容变化 | 配置文件更新、日志文件变化 |
| `CREATE` | 新文件/目录创建 | 新文件检测、目录监控 |
| `DELETE` | 文件/目录删除 | 清理检测、文件移除监控 |
| `MOVE` | 文件/目录移动/重命名 | 文件组织跟踪 |
| `ATTRIB` | 元数据变化 | 权限变更、时间戳更新 |
| `ACCESS` | 文件访问（读取） | 使用跟踪、安全监控 |

## 📊 事件结构

### FileEvent结构体

```cpp
struct FileEvent {
    std::string path;        // 被监控的路径
    std::string filename;    // 受影响的文件名（目录事件时为空）
    EventType type;          // 发生的事件类型
    uint32_t mask;          // 原始inotify事件掩码
};
```

**事件示例:**
```cpp
FileEvent {
    path = "/data/config",
    filename = "app.conf",
    type = EventType::MODIFY,
    mask = IN_MODIFY
}
```

## 🔄 回调函数

### EventCallback类型

```cpp
using EventCallback = std::function<void(const FileEvent&)>;
```

**回调示例:**
```cpp
auto callback = [](const FileWatcherAPI::FileEvent& event) {
    std::cout << "文件 " << event.filename 
              << " 在 " << event.path << " 中被" 
              << FileWatcherAPI::event_type_to_string(event.type) << std::endl;
};
```

## 🏗️ 构造函数和析构函数

### FileWatcher()

```cpp
FileWatcher();
```

创建新的FileWatcher实例并初始化inotify文件描述符。

**示例:**
```cpp
FileWatcherAPI::FileWatcher watcher;
```

### ~FileWatcher()

```cpp
~FileWatcher();
```

自动停止监控并清理资源。

## 🔧 核心方法

### add_watch()

```cpp
bool add_watch(const std::string& path, EventCallback callback, 
               uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE);
```

为指定路径添加监控点。

**参数:**
- `path`: 要监控的文件或目录路径
- `callback`: 事件发生时调用的函数
- `events`: 要监控的事件位掩码（可选）

**返回值:**
- `true`: 监控添加成功
- `false`: 添加监控失败（路径不存在、权限被拒绝等）

**示例:**
```cpp
// 监控文件修改
bool success = watcher.add_watch("/data/config/app.conf", 
    [](const FileWatcherAPI::FileEvent& event) {
        std::cout << "配置文件已更改!" << std::endl;
    },
    static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
);

if (!success) {
    std::cerr << "添加监控失败" << std::endl;
}
```

### start()

```cpp
void start();
```

在后台线程中启动文件监控。可以安全地多次调用。

**示例:**
```cpp
watcher.start();
std::cout << "文件监控已启动" << std::endl;
```

### stop()

```cpp
void stop();
```

停止文件监控并等待后台线程完成。可以安全地多次调用。

**示例:**
```cpp
watcher.stop();
std::cout << "文件监控已停止" << std::endl;
```

### is_running()

```cpp
bool is_running() const;
```

检查文件监控器是否正在运行。

**返回值:**
- `true`: 监控器处于活动状态
- `false`: 监控器已停止

**示例:**
```cpp
if (watcher.is_running()) {
    std::cout << "监控器处于活动状态" << std::endl;
} else {
    std::cout << "监控器已停止" << std::endl;
}
```

## 🛠️ 工具函数

### make_event_mask()

```cpp
uint32_t make_event_mask(std::initializer_list<EventType> events);
```

从事件类型列表创建事件掩码。

**参数:**
- `events`: EventType值的列表

**返回值:**
- 用于`add_watch()`的组合事件掩码

**示例:**
```cpp
auto mask = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::CREATE,
    FileWatcherAPI::EventType::DELETE,
    FileWatcherAPI::EventType::MODIFY
});

watcher.add_watch("/data/logs", callback, mask);
```

### event_type_to_string()

```cpp
std::string event_type_to_string(EventType type);
```

将EventType转换为其字符串表示。

**参数:**
- `type`: 要转换的EventType

**返回值:**
- 事件类型的字符串表示

**示例:**
```cpp
std::string event_name = FileWatcherAPI::event_type_to_string(FileWatcherAPI::EventType::MODIFY);
// event_name = "MODIFY"
```

## 🚀 使用模式

### 基本文件监控

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>

int main() {
    FileWatcherAPI::FileWatcher watcher;
    
    // 监控配置文件
    watcher.add_watch("/data/config/app.conf", 
        [](const FileWatcherAPI::FileEvent& event) {
            if (event.type == FileWatcherAPI::EventType::MODIFY) {
                std::cout << "配置文件已更新!" << std::endl;
                // 重新加载配置
            }
        },
        static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
    );
    
    watcher.start();
    
    // 保持应用程序运行
    std::cout << "按Enter键停止监控..." << std::endl;
    std::cin.get();
    
    watcher.stop();
    return 0;
}
```

### 目录监控

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>

class DirectoryMonitor {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    void startMonitoring(const std::string& directory) {
        // 监控目录中的所有文件操作
        auto events = FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::CREATE,
            FileWatcherAPI::EventType::DELETE,
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::MOVE
        });
        
        watcher_.add_watch(directory, 
            [this](const FileWatcherAPI::FileEvent& event) {
                handleFileEvent(event);
            }, events);
        
        watcher_.start();
        std::cout << "正在监控目录: " << directory << std::endl;
    }
    
    void stopMonitoring() {
        watcher_.stop();
        std::cout << "目录监控已停止" << std::endl;
    }
    
private:
    void handleFileEvent(const FileWatcherAPI::FileEvent& event) {
        std::string action = FileWatcherAPI::event_type_to_string(event.type);
        
        if (!event.filename.empty()) {
            std::cout << "文件 " << event.filename 
                      << " 在 " << event.path << " 中被" << action << std::endl;
        } else {
            std::cout << "目录事件: " << action 
                      << " 在 " << event.path << std::endl;
        }
        
        // 处理特定事件
        switch (event.type) {
            case FileWatcherAPI::EventType::CREATE:
                onFileCreated(event.path + "/" + event.filename);
                break;
            case FileWatcherAPI::EventType::DELETE:
                onFileDeleted(event.path + "/" + event.filename);
                break;
            case FileWatcherAPI::EventType::MODIFY:
                onFileModified(event.path + "/" + event.filename);
                break;
            default:
                break;
        }
    }
    
    void onFileCreated(const std::string& filepath) {
        std::cout << "检测到新文件: " << filepath << std::endl;
    }
    
    void onFileDeleted(const std::string& filepath) {
        std::cout << "文件已删除: " << filepath << std::endl;
    }
    
    void onFileModified(const std::string& filepath) {
        std::cout << "文件已更新: " << filepath << std::endl;
    }
};
```

### 多监控点

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <vector>

class MultiWatcher {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    void setupWatches() {
        // 监控配置文件
        watcher_.add_watch("/data/config", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[配置] " << event.filename 
                          << " " << FileWatcherAPI::event_type_to_string(event.type) 
                          << std::endl;
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE
            })
        );
        
        // 监控日志目录
        watcher_.add_watch("/data/logs", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[日志] " << event.filename 
                          << " " << FileWatcherAPI::event_type_to_string(event.type) 
                          << std::endl;
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::CREATE)
        );
        
        // 监控特定重要文件
        watcher_.add_watch("/data/important.dat", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::cout << "[关键] 重要文件已被修改!" << std::endl;
                // 立即采取行动
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::MODIFY)
        );
        
        watcher_.start();
    }
    
    void shutdown() {
        watcher_.stop();
    }
};
```

## 📊 性能考虑

### 节能效率

FileWatcher专为最小功耗设计：

- **事件驱动**: 仅在文件系统事件发生时激活
- **智能轮询**: 使用1秒超时和100毫秒休眠来节省电力
- **高效I/O**: 非阻塞inotify操作

### 内存使用

- **最小开销**: 每个监控点的内存占用很小
- **高效缓冲**: 4KB事件缓冲区用于批处理
- **自动清理**: 监控器销毁时释放资源

### CPU使用

- **低CPU影响**: 基于inotify的监控非常高效
- **后台处理**: 事件在单独线程中处理
- **优化轮询**: 空闲期间CPU使用率极低

## 🛠️ 错误处理

FileWatcher优雅地处理各种错误条件：

### 常见错误

1. **路径不存在**: `add_watch()`返回`false`
2. **权限被拒绝**: `add_watch()`返回`false`
3. **监控点过多**: 达到系统限制，`add_watch()`返回`false`
4. **inotify初始化失败**: 构造函数优雅处理

### 最佳实践

```cpp
// 始终检查add_watch()的返回值
if (!watcher.add_watch(path, callback)) {
    std::cerr << "添加监控失败: " << path << std::endl;
    // 适当处理错误
}

// 确保正确清理
class SafeWatcher {
    FileWatcherAPI::FileWatcher watcher_;
public:
    ~SafeWatcher() {
        watcher_.stop();  // 自动清理
    }
};
```

## 🔒 线程安全

FileWatcher API在设计时考虑了线程安全：

- **线程安全操作**: `start()`、`stop()`和`add_watch()`都是线程安全的
- **回调执行**: 回调在监控器的后台线程中执行
- **并发访问**: 多个线程可以安全地与同一个监控器实例交互

**重要提示**: 如果回调访问共享数据，回调本身应该是线程安全的。

## 🔗 与LoggerAPI集成

```cpp
#include "filewatcherAPI/filewatcher_api.hpp"
#include "loggerAPI/logger_api.hpp"

class MonitoredApplication {
private:
    FileWatcherAPI::FileWatcher watcher_;
    
public:
    MonitoredApplication() {
        // 初始化日志器
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "monitor.log";
        LoggerAPI::init_logger(config);
        
        // 设置带日志记录的文件监控
        setupFileMonitoring();
    }
    
private:
    void setupFileMonitoring() {
        watcher_.add_watch("/data/config", 
            [](const FileWatcherAPI::FileEvent& event) {
                std::string message = "文件事件: " + 
                    FileWatcherAPI::event_type_to_string(event.type) + 
                    " 在 " + event.path;
                
                if (!event.filename.empty()) {
                    message += "/" + event.filename;
                }
                
                LoggerAPI::info(message);
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::DELETE
            })
        );
        
        watcher_.start();
        LoggerAPI::info("文件监控已启动");
    }
    
public:
    ~MonitoredApplication() {
        watcher_.stop();
        LoggerAPI::info("文件监控已停止");
        LoggerAPI::shutdown_logger();
    }
};
```

## ⚠️ 限制说明

1. **仅限Linux/Android**: 使用Linux inotify，不可移植到其他平台
2. **Root权限**: 某些系统目录可能需要root访问权限
3. **监控限制**: 系统对inotify监控数量有限制
4. **递归监控**: 不会自动监控子目录（必须单独添加每个目录）
5. **网络文件系统**: 在网络挂载的文件系统上可能无法可靠工作

## 🔗 相关文档

- [LoggerAPI参考](/api/logger-api) - 日志记录功能
- [CLI工具参考](/api/cli-tools) - 命令行文件监控工具
- [系统工具指南](/guide/system-tools) - 系统工具使用指南
- [开发API指南](/guide/development-api) - API开发和集成指南
- [基础使用示例](/examples/basic-usage) - 完整使用示例
- [性能优化指南](/guide/performance) - 优化技巧