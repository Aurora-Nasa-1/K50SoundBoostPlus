# API 参考

AuroraCore FileWatcher 组件的完整 API 文档。

## 📚 可用 API

### 核心组件

- **[FileWatcher API](./filewatcher-api)** - 实时文件系统监控
  - 基于 inotify 的文件监视
  - 递归目录监控
  - 事件过滤和批处理
  - 高性能事件处理

- **[CLI 工具](./cli-tools)** - 命令行实用程序
  - 文件监控工具
  - 配置实用程序
  - 性能测试工具

## 🚀 快速开始

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

### 高级监控示例

```cpp
#include "AuroraCore/filewatcher_api.hpp"

// 创建多路径监控器
MultiPathWatcher multi_watcher;

// 添加多个监控路径
multi_watcher.add_path("/data/config", {
    .recursive = true,
    .events = FileEvent::MODIFIED | FileEvent::CREATED,
    .exclude_patterns = {"\\.tmp$", "\\.bak$"}
});

multi_watcher.add_path("/data/app", {
    .recursive = false,
    .events = FileEvent::ALL,
    .max_depth = 2
});

// 设置全局事件处理器
multi_watcher.set_global_callback([](const FileEvent& event) {
    std::cout << "[" << event.timestamp << "] "
              << "路径: " << event.path << ", "
              << "事件: " << event_type_to_string(event.type) << std::endl;
});

multi_watcher.start();
```

## 📖 API 分类

### 文件监控 API

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| FileWatcher | 文件系统事件监控 | 实时文件跟踪 |
| MultiPathWatcher | 多路径监控管理器 | 复杂监控场景 |
| WatcherCore | 低级 inotify 包装器 | 自定义监控解决方案 |

### 实用工具 API

| 组件 | 描述 | 使用场景 |
|------|------|----------|
| EventFilter | 事件过滤器 | 选择性事件处理 |
| PathMatcher | 路径模式匹配 | 文件过滤和排除 |
| EventBatcher | 事件批处理器 | 高效事件处理 |

## 🔧 配置

### FileWatcher 配置

```cpp
struct FileWatcherConfig {
    bool recursive = false;
    int max_depth = -1;
    FileEventMask events = FileEvent::ALL;
    std::vector<std::string> exclude_patterns;
    std::function<bool(const std::string&)> file_filter;
    size_t event_buffer_size = 4096;
    int debounce_ms = 100;
};
```

### 事件类型配置

```cpp
enum class FileEvent : uint32_t {
    CREATED = 0x01,
    MODIFIED = 0x02,
    DELETED = 0x04,
    MOVED = 0x08,
    ATTRIB = 0x10,
    ACCESS = 0x20,
    ALL = 0xFF
};

// 创建事件掩码
auto mask = FileEvent::CREATED | FileEvent::MODIFIED | FileEvent::DELETED;
```

### 高级配置选项

```cpp
struct AdvancedWatcherConfig {
    // 性能优化
    size_t inotify_buffer_size = 16384;
    int max_events_per_read = 1000;
    bool use_event_batching = true;
    
    // 过滤选项
    std::vector<std::regex> exclude_regex;
    std::function<bool(const FileEvent&)> event_filter;
    
    // 错误处理
    std::function<void(const std::string&)> error_callback;
    bool auto_restart_on_error = true;
    
    // 监控限制
    size_t max_watch_count = 8192;
    int watch_timeout_ms = 5000;
};
```

## 📊 性能考虑

### FileWatcher 性能

- **事件过滤**: 减少不必要的事件处理
- **批处理**: 一起处理多个事件以提高效率
- **递归限制**: 避免深层目录结构造成的性能问题
- **inotify 限制**: 注意系统级监视限制
- **缓冲区大小**: 适当的缓冲区大小平衡内存和性能
- **去抖动**: 减少频繁事件的噪音

### 最佳实践

```cpp
// 1. 使用特定事件类型而不是 ALL
auto specific_events = FileEvent::CREATED | FileEvent::MODIFIED;

// 2. 设置合理的排除模式
config.exclude_patterns = {
    "\\.tmp$",      // 临时文件
    "\\.swp$",      // Vim 交换文件
    "\\.log$",      // 日志文件
    "~$"           // 备份文件
};

// 3. 使用去抖动减少事件噪音
config.debounce_ms = 500;  // 500ms 去抖动

// 4. 限制递归深度
config.max_depth = 5;  // 最多 5 层深度

// 5. 使用事件批处理
config.use_event_batching = true;
```

## 🔗 相关文档

- [入门指南](/zh/guide/getting-started)
- [性能优化](/zh/guide/performance)
- [从源码构建](/zh/guide/building)
- [系统工具指南](/zh/guide/system-tools)
- [基本使用示例](/zh/examples/basic-usage)

## 📞 支持

对于 API 特定问题：

- 查看 [FileWatcher API 详细文档](./filewatcher-api)
- 查阅[系统工具指南](/zh/guide/system-tools)了解命令行使用
- 浏览[示例](/zh/examples/basic-usage)了解使用模式
- 在 [GitHub](https://github.com/APMMDEVS/AuroraCore/issues) 上提交问题

## 🛠️ 故障排除

### 常见问题

1. **监视器无法启动**
   - 检查路径是否存在
   - 验证权限设置
   - 确认 inotify 限制

2. **事件丢失**
   - 增加缓冲区大小
   - 检查系统 inotify 限制
   - 使用事件批处理

3. **高 CPU 使用率**
   - 添加事件过滤
   - 使用去抖动
   - 限制监控深度

4. **内存使用过高**
   - 减少监控路径数量
   - 调整缓冲区大小
   - 使用更严格的过滤条件