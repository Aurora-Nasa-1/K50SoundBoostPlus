# Performance Optimization Guide

This guide covers performance optimization techniques for AuroraCore FileWatcher component to ensure efficient operation in Android root environments.

## 📊 Overview

AuroraCore is designed for high-performance file monitoring. Proper configuration and usage patterns can significantly impact system performance, battery life, and resource utilization.

## 📁 FileWatcher Performance Optimization

### inotify Limits

#### System Limits Configuration

```bash
# Check current limits
sysctl fs.inotify.max_user_watches
sysctl fs.inotify.max_user_instances
sysctl fs.inotify.max_queued_events

# Increase limits for heavy monitoring
echo 524288 > /proc/sys/fs/inotify/max_user_watches
echo 8192 > /proc/sys/fs/inotify/max_user_instances
echo 16384 > /proc/sys/fs/inotify/max_queued_events
```

#### Efficient Watch Management

```cpp
// Use specific event masks to reduce overhead
auto mask = FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::MODIFY,
    FileWatcherAPI::EventType::CREATE
    // Avoid ATTRIB and ACCESS for better performance
});

// Group related paths under common parent directories
watcher.add_watch("/data/config", callback, mask);  // Watch entire directory
// Instead of watching individual files:
// watcher.add_watch("/data/config/app.conf", callback, mask);
// watcher.add_watch("/data/config/db.conf", callback, mask);
```

### Callback Optimization

```cpp
// Efficient callback implementation
watcher.add_watch("/data/logs", [](const FileWatcherAPI::FileEvent& event) {
    // Minimize processing in callback
    if (event.type == FileWatcherAPI::EventType::MODIFY) {
        // Queue for background processing instead of immediate handling
        event_queue.push(event);
    }
}, mask);

// Background processing thread
std::thread processor([]() {
    while (running) {
        if (!event_queue.empty()) {
            auto event = event_queue.pop();
            // Heavy processing here
            process_file_change(event);
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
});
```

### Event Filtering and Debouncing

```cpp
// Implement debouncing to reduce event noise
class DebouncedWatcher {
private:
    FileWatcherAPI::FileWatcher watcher_;
    std::unordered_map<std::string, std::chrono::steady_clock::time_point> last_events_;
    std::mutex events_mutex_;
    const std::chrono::milliseconds debounce_time_{1000}; // 1 second
    
public:
    void add_watch(const std::string& path, std::function<void(const FileWatcherAPI::FileEvent&)> callback) {
        watcher_.add_watch(path, [this, callback](const FileWatcherAPI::FileEvent& event) {
            std::lock_guard<std::mutex> lock(events_mutex_);
            
            auto now = std::chrono::steady_clock::now();
            auto key = event.path + "/" + event.filename;
            
            auto it = last_events_.find(key);
            if (it == last_events_.end() || 
                (now - it->second) > debounce_time_) {
                last_events_[key] = now;
                callback(event);
            }
        }, FileWatcherAPI::make_event_mask({
            FileWatcherAPI::EventType::MODIFY,
            FileWatcherAPI::EventType::CREATE,
            FileWatcherAPI::EventType::DELETE
        }));
    }
    
    void start() { watcher_.start(); }
    void stop() { watcher_.stop(); }
};
```

## ⚡ System-Level Optimizations

### CPU Affinity

```bash
# Bind processes to specific CPU cores
taskset -c 2,3 ./filewatcher /data/config "process_config_change.sh"
```

### I/O Scheduling

```bash
# Use appropriate I/O scheduler for file monitoring workloads
echo deadline > /sys/block/sda/queue/scheduler

# Set I/O priority for filewatcher processes
ionice -c 2 -n 4 ./filewatcher /data/config "handle_change.sh"
```

### Memory Management

```bash
# Configure swappiness for better memory management
echo 10 > /proc/sys/vm/swappiness

# Monitor memory usage of filewatcher
watch -n 1 'ps -o pid,vsz,rss,comm -p $(pgrep filewatcher)'
```

## 📈 Performance Monitoring

### Built-in Metrics

```cpp
// Monitor FileWatcher performance
class PerformanceMonitor {
private:
    std::atomic<uint64_t> events_processed_{0};
    std::atomic<uint64_t> events_dropped_{0};
    std::chrono::steady_clock::time_point start_time_;
    
public:
    PerformanceMonitor() : start_time_(std::chrono::steady_clock::now()) {}
    
    void on_event_processed() {
        events_processed_++;
    }
    
    void on_event_dropped() {
        events_dropped_++;
    }
    
    void print_stats() {
        auto now = std::chrono::steady_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - start_time_).count();
        
        if (duration > 0) {
            std::cout << "Events/sec: " << events_processed_ / duration << std::endl;
            std::cout << "Drop rate: " << (events_dropped_ * 100.0) / (events_processed_ + events_dropped_) << "%" << std::endl;
        }
    }
};
```

### System Monitoring

```bash
# Monitor filewatcher performance
top -p $(pgrep filewatcher)

# Check file descriptor usage
lsof -p $(pgrep filewatcher) | wc -l

# Monitor inotify usage
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | wc -l

# Check memory usage
cat /proc/$(pgrep filewatcher)/status | grep VmRSS
```

## 🔧 Troubleshooting Performance Issues

### Common Performance Problems

#### High CPU Usage

```bash
# Check if too many events are being processed
strace -p $(pgrep filewatcher) -e trace=inotify_add_watch,read

# Reduce event frequency with debouncing
./filewatcher -e modify /data/config "echo 'Config changed'" --debounce 1000
```

#### Memory Leaks

```bash
# Monitor memory growth over time
while true; do
    ps -o pid,vsz,rss,comm -p $(pgrep filewatcher)
    sleep 60
done

# Use valgrind for detailed analysis
valgrind --tool=memcheck --leak-check=full ./filewatcher /tmp/test "echo 'changed'"
```

#### Too Many Open Files

```bash
# Check current file descriptor limits
ulimit -n

# Increase limits if needed
ulimit -n 65536

# Check inotify watch count
find /proc/*/fd -lname anon_inode:inotify 2>/dev/null | \
  xargs -I {} ls -l {} 2>/dev/null | wc -l
```

#### Event Queue Overflow

```bash
# Monitor inotify queue
watch -n 1 'cat /proc/sys/fs/inotify/max_queued_events'

# Increase queue size if needed
echo 32768 > /proc/sys/fs/inotify/max_queued_events
```

## 📋 Performance Benchmarks

### FileWatcher Performance

| Watch Count | Events/sec | Memory Usage | CPU Usage | Notes |
|-------------|------------|--------------|-----------|-------|
| 100 files | 1,000 | 20MB | 2% | Light monitoring |
| 1,000 files | 5,000 | 50MB | 5% | Medium load |
| 10,000 files | 10,000 | 200MB | 15% | Heavy monitoring |
| 50,000 files | 15,000 | 500MB | 25% | Extreme load |

### Event Type Performance Impact

| Event Types | Overhead | Recommendation |
|-------------|----------|----------------|
| MODIFY only | Low | Best for config monitoring |
| CREATE + DELETE | Medium | Good for directory monitoring |
| All events | High | Use only when necessary |
| ACCESS events | Very High | Avoid in production |

## 🎯 Optimization Strategies

### 1. Selective Monitoring

```cpp
// Monitor only specific file types
watcher.add_watch("/data/config", [](const FileWatcherAPI::FileEvent& event) {
    // Filter by file extension
    if (event.filename.ends_with(".conf") || 
        event.filename.ends_with(".json")) {
        handle_config_change(event);
    }
}, FileWatcherAPI::make_event_mask({
    FileWatcherAPI::EventType::MODIFY
}));
```

### 2. Hierarchical Watching

```cpp
// Watch parent directory instead of individual files
// More efficient than watching 100 individual files
watcher.add_watch("/data/app/configs", [](const FileWatcherAPI::FileEvent& event) {
    // Handle all config changes in one callback
    if (event.path.find("/configs/") != std::string::npos) {
        reload_config(event.path + "/" + event.filename);
    }
}, mask);
```

### 3. Batch Processing

```cpp
// Collect events and process in batches
class BatchProcessor {
private:
    std::vector<FileWatcherAPI::FileEvent> event_batch_;
    std::mutex batch_mutex_;
    std::thread processor_thread_;
    
public:
    void add_event(const FileWatcherAPI::FileEvent& event) {
        std::lock_guard<std::mutex> lock(batch_mutex_);
        event_batch_.push_back(event);
        
        // Process batch when it reaches certain size
        if (event_batch_.size() >= 50) {
            process_batch();
        }
    }
    
private:
    void process_batch() {
        // Process all events together
        for (const auto& event : event_batch_) {
            handle_event(event);
        }
        event_batch_.clear();
    }
};
```

## 🔗 Best Practices Summary

1. **Event Filtering**: Only monitor necessary file events
2. **Debouncing**: Implement debouncing to reduce event noise
3. **Batch Processing**: Group operations to reduce system calls
4. **Resource Limits**: Set appropriate system limits for inotify
5. **Background Processing**: Move heavy work out of callbacks
6. **Monitoring**: Regularly check performance metrics
7. **Testing**: Benchmark your specific use case
8. **Selective Watching**: Monitor directories instead of individual files when possible

## 🔗 Related Documentation

- [FileWatcher API Reference](/api/filewatcher-api)
- [Command Line Tools](/api/cli-tools)
- [Getting Started Guide](/guide/getting-started)
- [System Tools Guide](/guide/system-tools)
- [Building Guide](/guide/building)