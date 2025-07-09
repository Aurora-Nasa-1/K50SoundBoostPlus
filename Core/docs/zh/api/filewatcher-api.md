# FileWatcher API 参考

FileWatcher API 提供高效的文件系统监控功能，基于 Linux inotify 机制实现。它能够实时监控文件和目录的变化，并执行用户定义的回调函数。

## 概述

FileWatcher API 的核心功能包括：

- **实时文件监控** - 基于 inotify 的高效事件检测
- **多种事件类型** - 支持创建、修改、删除等多种文件事件
- **灵活的回调机制** - 用户自定义的事件处理函数
- **多监控点支持** - 同时监控多个文件或目录
- **线程安全** - 安全的多线程操作
- **低资源消耗** - 高效的事件循环和内存管理

## FileWatcher 类

### 构造函数和析构函数

```cpp
// 默认构造函数
FileWatcher();

// 析构函数 - 自动停止监控并清理资源
~FileWatcher();

// 禁用拷贝构造和赋值
FileWatcher(const FileWatcher&) = delete;
FileWatcher& operator=(const FileWatcher&) = delete;

// 支持移动语义
FileWatcher(FileWatcher&& other) noexcept;
FileWatcher& operator=(FileWatcher&& other) noexcept;
```

## 事件类型

### EventType 枚举

```cpp
enum class EventType : uint32_t {
    ACCESS = 0x00000001,      // 文件被访问
    MODIFY = 0x00000002,      // 文件内容被修改
    ATTRIB = 0x00000004,      // 文件属性被修改
    CLOSE_WRITE = 0x00000008, // 可写文件被关闭
    CLOSE_NOWRITE = 0x00000010, // 只读文件被关闭
    OPEN = 0x00000020,        // 文件被打开
    MOVED_FROM = 0x00000040,  // 文件被移出监控目录
    MOVED_TO = 0x00000080,    // 文件被移入监控目录
    CREATE = 0x00000100,      // 文件或目录被创建
    DELETE = 0x00000200,      // 文件或目录被删除
    DELETE_SELF = 0x00000400, // 监控的文件/目录本身被删除
    MOVE_SELF = 0x00000800    // 监控的文件/目录本身被移动
};
```

#### 常用事件组合

```cpp
// 预定义的事件掩码
const uint32_t ALL_EVENTS = 0xFFFFFFFF;           // 所有事件
const uint32_t CLOSE = CLOSE_WRITE | CLOSE_NOWRITE; // 文件关闭
const uint32_t MOVE = MOVED_FROM | MOVED_TO;        // 文件移动

// 常用组合
const uint32_t BASIC_EVENTS = CREATE | MODIFY | DELETE;           // 基本文件操作
const uint32_t CONTENT_EVENTS = MODIFY | CLOSE_WRITE;             // 内容变化
const uint32_t STRUCTURE_EVENTS = CREATE | DELETE | MOVE;         // 结构变化
```

### 事件使用指南

| 事件类型 | 使用场景 | 示例 |
|----------|----------|------|
| `CREATE` | 新文件检测 | 监控上传目录 |
| `MODIFY` | 内容变化监控 | 配置文件更新 |
| `DELETE` | 文件删除监控 | 安全审计 |
| `MOVE` | 文件重命名/移动 | 文件组织监控 |
| `ATTRIB` | 权限变化监控 | 安全监控 |
| `ACCESS` | 文件访问跟踪 | 使用统计 |

## FileEvent 结构体

```cpp
struct FileEvent {
    std::string path;        // 事件发生的文件/目录路径
    EventType type;          // 事件类型
    uint32_t mask;          // 原始事件掩码
    uint32_t cookie;        // 用于关联 MOVED_FROM 和 MOVED_TO 事件
    std::string name;       // 文件名（仅当监控目录时）
    
    // 便捷方法
    bool is_directory() const;  // 检查是否为目录事件
    std::string full_path() const; // 获取完整路径
};
```

### FileEvent 使用示例

```cpp
void handle_event(const FileEvent& event) {
    std::cout << "Event: " << event_type_to_string(event.type) 
              << " on " << event.path << std::endl;
    
    if (event.is_directory()) {
        std::cout << "Directory event detected" << std::endl;
    }
    
    if (event.type == EventType::MOVED_FROM || event.type == EventType::MOVED_TO) {
        std::cout << "Move cookie: " << event.cookie << std::endl;
    }
}
```

## EventCallback 类型

```cpp
using EventCallback = std::function<void(const FileEvent&)>;
```

### 回调函数示例

```cpp
// 简单回调
auto simple_callback = [](const FileEvent& event) {
    std::cout << "File event: " << event.path << std::endl;
};

// 复杂回调
auto complex_callback = [](const FileEvent& event) {
    switch (event.type) {
        case EventType::CREATE:
            handle_file_creation(event.path);
            break;
        case EventType::MODIFY:
            handle_file_modification(event.path);
            break;
        case EventType::DELETE:
            handle_file_deletion(event.path);
            break;
        default:
            handle_other_event(event);
            break;
    }
};

// 类成员函数回调
class FileHandler {
public:
    void on_file_event(const FileEvent& event) {
        // 处理文件事件
    }
};

FileHandler handler;
auto member_callback = [&handler](const FileEvent& event) {
    handler.on_file_event(event);
};
```

## 核心方法

### add_watch

添加文件或目录监控。

```cpp
bool add_watch(
    const std::string& path,
    uint32_t event_mask,
    EventCallback callback
);

bool add_watch(
    const std::string& path,
    EventType event_type,
    EventCallback callback
);
```

#### 参数说明

- `path`: 要监控的文件或目录路径
- `event_mask`: 事件掩码（多个事件的按位或）
- `event_type`: 单个事件类型
- `callback`: 事件回调函数

#### 返回值

- `true`: 监控添加成功
- `false`: 监控添加失败（路径不存在、权限不足等）

#### 使用示例

```cpp
FileWatcher watcher;

// 监控单个事件
watcher.add_watch("/data/config/app.conf", EventType::MODIFY, 
    [](const FileEvent& event) {
        std::cout << "Config file modified" << std::endl;
    });

// 监控多个事件
uint32_t mask = static_cast<uint32_t>(EventType::CREATE) | 
                static_cast<uint32_t>(EventType::DELETE) |
                static_cast<uint32_t>(EventType::MODIFY);

watcher.add_watch("/data/logs", mask,
    [](const FileEvent& event) {
        std::cout << "Log directory event: " 
                  << event_type_to_string(event.type) << std::endl;
    });
```

### start

启动文件监控。

```cpp
bool start();
```

#### 返回值

- `true`: 监控启动成功
- `false`: 监控启动失败

#### 使用说明

- 必须在添加监控点后调用
- 启动后会在后台线程中运行事件循环
- 可以多次调用，重复调用会被忽略

### stop

停止文件监控。

```cpp
void stop();
```

#### 使用说明

- 停止事件循环并清理资源
- 可以安全地多次调用
- 析构函数会自动调用此方法

### is_running

检查监控是否正在运行。

```cpp
bool is_running() const;
```

#### 返回值

- `true`: 监控正在运行
- `false`: 监控已停止

### remove_watch

移除特定路径的监控。

```cpp
bool remove_watch(const std::string& path);
```

#### 参数说明

- `path`: 要移除监控的路径

#### 返回值

- `true`: 移除成功
- `false`: 移除失败（路径未被监控）

### clear_watches

清除所有监控点。

```cpp
void clear_watches();
```

## 工具函数

### make_event_mask

创建事件掩码的便捷函数。

```cpp
template<typename... EventTypes>
uint32_t make_event_mask(EventTypes... events);
```

#### 使用示例

```cpp
// 创建多事件掩码
auto mask = make_event_mask(EventType::CREATE, EventType::MODIFY, EventType::DELETE);

// 等价于
uint32_t mask = static_cast<uint32_t>(EventType::CREATE) |
                static_cast<uint32_t>(EventType::MODIFY) |
                static_cast<uint32_t>(EventType::DELETE);
```

### event_type_to_string

将事件类型转换为字符串。

```cpp
std::string event_type_to_string(EventType type);
```

#### 使用示例

```cpp
EventType type = EventType::MODIFY;
std::string type_str = event_type_to_string(type); // "MODIFY"

std::cout << "Event type: " << type_str << std::endl;
```

### string_to_event_type

将字符串转换为事件类型。

```cpp
EventType string_to_event_type(const std::string& str);
```

#### 使用示例

```cpp
EventType type = string_to_event_type("CREATE"); // EventType::CREATE
```

## 使用模式

### 基本文件监控

```cpp
#include "filewatcher_api.hpp"
#include <iostream>

int main() {
    FileWatcher watcher;
    
    // 监控配置文件
    watcher.add_watch("/data/config/app.conf", EventType::MODIFY,
        [](const FileEvent& event) {
            std::cout << "Configuration file updated: " << event.path << std::endl;
            // 重新加载配置
            reload_configuration();
        });
    
    // 启动监控
    if (watcher.start()) {
        std::cout << "File monitoring started" << std::endl;
        
        // 保持程序运行
        std::this_thread::sleep_for(std::chrono::hours(1));
    } else {
        std::cerr << "Failed to start file monitoring" << std::endl;
        return -1;
    }
    
    return 0;
}
```

### 目录监控

```cpp
class DirectoryMonitor {
private:
    FileWatcher watcher_;
    std::string watch_path_;
    
public:
    DirectoryMonitor(const std::string& path) : watch_path_(path) {}
    
    bool start_monitoring() {
        // 监控目录中的文件创建和删除
        auto mask = make_event_mask(EventType::CREATE, EventType::DELETE);
        
        watcher_.add_watch(watch_path_, mask,
            [this](const FileEvent& event) {
                this->handle_directory_event(event);
            });
        
        return watcher_.start();
    }
    
    void stop_monitoring() {
        watcher_.stop();
    }
    
private:
    void handle_directory_event(const FileEvent& event) {
        switch (event.type) {
            case EventType::CREATE:
                std::cout << "New file created: " << event.name << std::endl;
                process_new_file(event.full_path());
                break;
                
            case EventType::DELETE:
                std::cout << "File deleted: " << event.name << std::endl;
                cleanup_file_references(event.full_path());
                break;
                
            default:
                break;
        }
    }
    
    void process_new_file(const std::string& file_path) {
        // 处理新文件
    }
    
    void cleanup_file_references(const std::string& file_path) {
        // 清理文件引用
    }
};
```

### 多监控点管理

```cpp
class MultiPathWatcher {
private:
    FileWatcher watcher_;
    std::map<std::string, EventCallback> watch_callbacks_;
    
public:
    bool add_path(const std::string& path, uint32_t event_mask, EventCallback callback) {
        if (watcher_.add_watch(path, event_mask, callback)) {
            watch_callbacks_[path] = callback;
            return true;
        }
        return false;
    }
    
    bool remove_path(const std::string& path) {
        if (watcher_.remove_watch(path)) {
            watch_callbacks_.erase(path);
            return true;
        }
        return false;
    }
    
    bool start() {
        return watcher_.start();
    }
    
    void stop() {
        watcher_.stop();
    }
    
    std::vector<std::string> get_watched_paths() const {
        std::vector<std::string> paths;
        for (const auto& pair : watch_callbacks_) {
            paths.push_back(pair.first);
        }
        return paths;
    }
};

// 使用示例
MultiPathWatcher multi_watcher;

// 添加多个监控路径
multi_watcher.add_path("/data/config", 
    make_event_mask(EventType::MODIFY),
    [](const FileEvent& event) {
        std::cout << "Config changed: " << event.path << std::endl;
    });

multi_watcher.add_path("/data/logs",
    make_event_mask(EventType::CREATE, EventType::DELETE),
    [](const FileEvent& event) {
        std::cout << "Log event: " << event_type_to_string(event.type) 
                  << " on " << event.path << std::endl;
    });

multi_watcher.start();
```

## 性能考虑

### inotify 限制

```cpp
// 检查系统限制
#include <fstream>

void check_inotify_limits() {
    std::ifstream max_watches("/proc/sys/fs/inotify/max_user_watches");
    std::ifstream max_instances("/proc/sys/fs/inotify/max_user_instances");
    
    int watches, instances;
    max_watches >> watches;
    max_instances >> instances;
    
    std::cout << "Max watches per user: " << watches << std::endl;
    std::cout << "Max instances per user: " << instances << std::endl;
}
```

### 性能优化建议

1. **合理选择事件类型**: 只监控必要的事件类型
2. **避免监控大目录**: 大目录会消耗更多 inotify 资源
3. **批量处理事件**: 在回调中避免耗时操作
4. **及时清理监控**: 不需要的监控点应及时移除

```cpp
// 好的做法：只监控必要的事件
watcher.add_watch("/data/config", EventType::MODIFY, callback);

// 避免：监控所有事件
watcher.add_watch("/data/config", ALL_EVENTS, callback);

// 好的做法：异步处理
auto async_callback = [](const FileEvent& event) {
    // 快速记录事件
    event_queue.push(event);
};

// 避免：在回调中执行耗时操作
auto blocking_callback = [](const FileEvent& event) {
    // 耗时的文件处理
    process_large_file(event.path); // 不推荐
};
```

## 错误处理

### 常见错误情况

```cpp
class RobustFileWatcher {
private:
    FileWatcher watcher_;
    std::function<void(const std::string&)> error_handler_;
    
public:
    void set_error_handler(std::function<void(const std::string&)> handler) {
        error_handler_ = handler;
    }
    
    bool add_watch_safe(const std::string& path, uint32_t mask, EventCallback callback) {
        // 检查路径是否存在
        if (!std::filesystem::exists(path)) {
            if (error_handler_) {
                error_handler_("Path does not exist: " + path);
            }
            return false;
        }
        
        // 检查权限
        if (!std::filesystem::is_readable(path)) {
            if (error_handler_) {
                error_handler_("No read permission for: " + path);
            }
            return false;
        }
        
        // 添加监控
        if (!watcher_.add_watch(path, mask, callback)) {
            if (error_handler_) {
                error_handler_("Failed to add watch for: " + path);
            }
            return false;
        }
        
        return true;
    }
};
```

### 错误恢复机制

```cpp
class SelfHealingWatcher {
private:
    FileWatcher watcher_;
    std::map<std::string, std::pair<uint32_t, EventCallback>> watch_config_;
    std::thread monitor_thread_;
    std::atomic<bool> should_monitor_{true};
    
public:
    void start_with_recovery() {
        watcher_.start();
        
        // 启动监控线程
        monitor_thread_ = std::thread([this]() {
            while (should_monitor_) {
                std::this_thread::sleep_for(std::chrono::seconds(10));
                
                if (!watcher_.is_running()) {
                    std::cout << "Watcher stopped, attempting recovery..." << std::endl;
                    recover_watches();
                }
            }
        });
    }
    
    void stop() {
        should_monitor_ = false;
        if (monitor_thread_.joinable()) {
            monitor_thread_.join();
        }
        watcher_.stop();
    }
    
private:
    void recover_watches() {
        // 重新创建监控器
        watcher_ = FileWatcher();
        
        // 重新添加所有监控点
        for (const auto& config : watch_config_) {
            const std::string& path = config.first;
            uint32_t mask = config.second.first;
            const EventCallback& callback = config.second.second;
            
            if (std::filesystem::exists(path)) {
                watcher_.add_watch(path, mask, callback);
            }
        }
        
        // 重新启动
        watcher_.start();
    }
};
```

## 线程安全

FileWatcher API 是线程安全的，可以在多线程环境中安全使用：

```cpp
#include <thread>
#include <vector>
#include <mutex>

class ThreadSafeEventHandler {
private:
    std::mutex event_mutex_;
    std::vector<FileEvent> event_history_;
    
public:
    void handle_event(const FileEvent& event) {
        std::lock_guard<std::mutex> lock(event_mutex_);
        
        // 线程安全地处理事件
        event_history_.push_back(event);
        
        std::cout << "[Thread " << std::this_thread::get_id() << "] "
                  << "Event: " << event_type_to_string(event.type)
                  << " on " << event.path << std::endl;
    }
    
    std::vector<FileEvent> get_event_history() {
        std::lock_guard<std::mutex> lock(event_mutex_);
        return event_history_;
    }
};

// 多线程使用示例
ThreadSafeEventHandler handler;
FileWatcher watcher;

// 从多个线程添加监控
std::vector<std::thread> setup_threads;
for (int i = 0; i < 4; ++i) {
    setup_threads.emplace_back([&watcher, &handler, i]() {
        std::string path = "/data/monitor/" + std::to_string(i);
        watcher.add_watch(path, EventType::MODIFY,
            [&handler](const FileEvent& event) {
                handler.handle_event(event);
            });
    });
}

// 等待所有设置完成
for (auto& t : setup_threads) {
    t.join();
}

watcher.start();
```

## 与 Logger API 集成

```cpp
#include "logger_api.hpp"
#include "filewatcher_api.hpp"

class LoggingFileWatcher {
private:
    std::unique_ptr<InternalLogger> logger_;
    FileWatcher watcher_;
    
public:
    LoggingFileWatcher(const std::string& log_path) {
        LoggerConfig config;
        config.log_path = log_path;
        config.min_level = LogLevel::INFO;
        logger_ = std::make_unique<InternalLogger>(config);
        
        logger_->info("LoggingFileWatcher initialized");
    }
    
    bool add_monitored_path(const std::string& path, uint32_t event_mask) {
        logger_->infof("Adding watch for path: %s", path.c_str());
        
        bool success = watcher_.add_watch(path, event_mask,
            [this](const FileEvent& event) {
                this->log_file_event(event);
            });
        
        if (success) {
            logger_->infof("Successfully added watch for: %s", path.c_str());
        } else {
            logger_->errorf("Failed to add watch for: %s", path.c_str());
        }
        
        return success;
    }
    
    bool start() {
        logger_->info("Starting file watcher");
        
        if (watcher_.start()) {
            logger_->info("File watcher started successfully");
            return true;
        } else {
            logger_->error("Failed to start file watcher");
            return false;
        }
    }
    
    void stop() {
        logger_->info("Stopping file watcher");
        watcher_.stop();
        logger_->info("File watcher stopped");
    }
    
private:
    void log_file_event(const FileEvent& event) {
        std::string event_str = event_type_to_string(event.type);
        
        switch (event.type) {
            case EventType::CREATE:
                logger_->infof("File created: %s", event.path.c_str());
                break;
            case EventType::MODIFY:
                logger_->infof("File modified: %s", event.path.c_str());
                break;
            case EventType::DELETE:
                logger_->warnf("File deleted: %s", event.path.c_str());
                break;
            case EventType::MOVED_FROM:
            case EventType::MOVED_TO:
                logger_->infof("File moved: %s (cookie: %u)", 
                              event.path.c_str(), event.cookie);
                break;
            default:
                logger_->debugf("File event %s: %s", 
                               event_str.c_str(), event.path.c_str());
                break;
        }
    }
};

// 使用示例
int main() {
    LoggingFileWatcher watcher("/data/local/tmp/filewatcher.log");
    
    // 添加监控路径
    watcher.add_monitored_path("/data/config", 
        make_event_mask(EventType::MODIFY, EventType::CREATE, EventType::DELETE));
    
    watcher.add_monitored_path("/data/critical",
        make_event_mask(EventType::DELETE, EventType::MOVED_FROM));
    
    // 启动监控
    if (watcher.start()) {
        // 运行一段时间
        std::this_thread::sleep_for(std::chrono::minutes(30));
        
        // 停止监控
        watcher.stop();
    }
    
    return 0;
}
```

## 限制和注意事项

### 系统限制

1. **inotify 实例限制**: 每个用户的 inotify 实例数量有限
2. **监控点限制**: 每个用户的监控点数量有限
3. **事件队列限制**: 事件队列大小有限，可能丢失事件

### 平台限制

1. **仅支持 Linux**: 基于 inotify，仅在 Linux 系统上可用
2. **需要内核支持**: 需要内核版本 2.6.13 或更高
3. **文件系统支持**: 某些文件系统可能不完全支持 inotify

### 使用注意事项

1. **避免监控 /proc 和 /sys**: 这些虚拟文件系统可能导致问题
2. **注意符号链接**: inotify 监控符号链接的目标，而非链接本身
3. **递归监控**: API 不自动递归监控子目录，需要手动添加
4. **事件合并**: 某些快速连续的事件可能被内核合并

```cpp
// 检查系统支持
bool check_inotify_support() {
    int fd = inotify_init();
    if (fd == -1) {
        std::cerr << "inotify not supported" << std::endl;
        return false;
    }
    close(fd);
    return true;
}

// 递归添加目录监控
void add_recursive_watch(FileWatcher& watcher, const std::string& root_path) {
    // 添加根目录监控
    watcher.add_watch(root_path, EventType::CREATE | EventType::DELETE,
        [&watcher](const FileEvent& event) {
            if (event.type == EventType::CREATE && event.is_directory()) {
                // 新目录创建时，添加监控
                watcher.add_watch(event.path, EventType::CREATE | EventType::DELETE,
                    /* 递归回调 */);
            }
        });
    
    // 遍历现有子目录
    for (const auto& entry : std::filesystem::recursive_directory_iterator(root_path)) {
        if (entry.is_directory()) {
            watcher.add_watch(entry.path(), EventType::CREATE | EventType::DELETE,
                /* 回调函数 */);
        }
    }
}
```

## 最佳实践

1. **合理选择事件类型**: 只监控必要的事件
2. **及时处理事件**: 避免在回调中执行耗时操作
3. **资源管理**: 及时清理不需要的监控点
4. **错误处理**: 实现适当的错误处理和恢复机制
5. **性能监控**: 监控 inotify 资源使用情况
6. **日志记录**: 记录重要的文件系统事件

## 另请参阅

- [Logger API](/zh/api/logger-api) - 日志记录 API
- [命令行工具](/zh/api/cli-tools) - filewatcher 命令行工具
- [基本用法示例](/zh/examples/basic-usage) - 完整使用示例
- [入门指南](/zh/guide/getting-started) - 快速开始