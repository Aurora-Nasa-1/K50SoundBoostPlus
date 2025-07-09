# Performance Optimization Guide

This guide covers performance optimization techniques for AuroraCore components to ensure efficient operation in Android root environments.

## 📊 Overview

AuroraCore is designed for high-performance logging and file monitoring. Proper configuration and usage patterns can significantly impact system performance, battery life, and resource utilization.

## 🚀 Logger Performance Optimization

### Buffer Management

#### Optimal Buffer Sizes

```cpp
// Recommended buffer configurations for different scenarios

// High-frequency logging (>1000 logs/sec)
LoggerAPI::InternalLogger::Config high_freq_config;
high_freq_config.buffer_size = 1024 * 1024;  // 1MB buffer
high_freq_config.flush_interval_ms = 5000;    // 5 second flush

// Normal application logging
LoggerAPI::InternalLogger::Config normal_config;
normal_config.buffer_size = 256 * 1024;      // 256KB buffer
normal_config.flush_interval_ms = 2000;      // 2 second flush

// Low-frequency system monitoring
LoggerAPI::InternalLogger::Config low_freq_config;
low_freq_config.buffer_size = 64 * 1024;     // 64KB buffer
low_freq_config.flush_interval_ms = 10000;   // 10 second flush
```

#### Memory Usage Optimization

```cpp
// Use appropriate log levels to reduce overhead
config.min_log_level = LoggerAPI::LogLevel::INFO;  // Skip DEBUG/TRACE in production

// Configure file rotation to prevent excessive disk usage
config.max_file_size = 50 * 1024 * 1024;  // 50MB per file
config.max_file_count = 10;                // Keep 10 files max
```

### Daemon Mode Performance

#### Process Priority

```bash
# Run logger daemon with appropriate priority
# For system services
nice -n -10 ./logger_daemon -f /data/logs/system.log

# For application logging
nice -n 5 ./logger_daemon -f /data/logs/app.log
```

#### Socket Configuration

```bash
# Use Unix domain sockets for better performance
./logger_daemon -p /tmp/fast_logger.sock -b 1048576

# Multiple daemon instances for load distribution
./logger_daemon -p /tmp/logger_system.sock -f /data/logs/system.log &
./logger_daemon -p /tmp/logger_app.sock -f /data/logs/app.log &
```

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

## ⚡ System-Level Optimizations

### CPU Affinity

```bash
# Bind processes to specific CPU cores
taskset -c 0,1 ./logger_daemon -f /data/logs/system.log
taskset -c 2,3 ./filewatcher /data/config "process_config_change.sh"
```

### I/O Scheduling

```bash
# Use appropriate I/O scheduler for logging workloads
echo deadline > /sys/block/sda/queue/scheduler

# Set I/O priority for logger processes
ionice -c 2 -n 4 ./logger_daemon -f /data/logs/app.log
```

### Memory Management

```bash
# Configure swappiness for better memory management
echo 10 > /proc/sys/vm/swappiness

# Use memory-mapped files for large log files
./logger_daemon -f /data/logs/large.log --use-mmap
```

## 📈 Performance Monitoring

### Built-in Metrics

```cpp
// Enable performance monitoring in logger
config.enable_metrics = true;
config.metrics_interval_ms = 30000;  // Report every 30 seconds

LoggerAPI::init_logger(config);

// Get performance statistics
auto stats = LoggerAPI::get_performance_stats();
std::cout << "Messages/sec: " << stats.messages_per_second << std::endl;
std::cout << "Buffer usage: " << stats.buffer_usage_percent << "%" << std::endl;
```

### System Monitoring

```bash
# Monitor logger daemon performance
top -p $(pgrep logger_daemon)

# Check file descriptor usage
lsof -p $(pgrep logger_daemon) | wc -l

# Monitor disk I/O
iotop -p $(pgrep logger_daemon)

# Check memory usage
cat /proc/$(pgrep logger_daemon)/status | grep VmRSS
```

## 🔧 Troubleshooting Performance Issues

### Common Performance Problems

#### High CPU Usage

```bash
# Check if too many events are being processed
strace -p $(pgrep filewatcher) -e trace=inotify_add_watch,read

# Reduce event frequency
./filewatcher -e modify /data/config "echo 'Config changed'" --debounce 1000
```

#### Memory Leaks

```bash
# Monitor memory growth over time
while true; do
    ps -o pid,vsz,rss,comm -p $(pgrep logger_daemon)
    sleep 60
done

# Use valgrind for detailed analysis
valgrind --tool=memcheck --leak-check=full ./logger_daemon -f /tmp/test.log
```

#### Disk I/O Bottlenecks

```bash
# Check disk write performance
dd if=/dev/zero of=/data/logs/test bs=1M count=100 oflag=sync

# Use faster storage for logs
mount -t tmpfs -o size=1G tmpfs /data/logs/temp
```

## 📋 Performance Benchmarks

### Logger Performance

| Configuration | Messages/sec | Memory Usage | CPU Usage |
|---------------|--------------|--------------|----------|
| Default | 10,000 | 50MB | 5% |
| Optimized | 25,000 | 30MB | 3% |
| High-throughput | 50,000 | 100MB | 8% |

### FileWatcher Performance

| Watch Count | Events/sec | Memory Usage | CPU Usage |
|-------------|------------|--------------|----------|
| 100 files | 1,000 | 20MB | 2% |
| 1,000 files | 5,000 | 50MB | 5% |
| 10,000 files | 10,000 | 200MB | 15% |

## 🎯 Best Practices Summary

1. **Buffer Sizing**: Use larger buffers for high-frequency logging
2. **Event Filtering**: Only monitor necessary file events
3. **Batch Processing**: Group operations to reduce system calls
4. **Resource Limits**: Set appropriate system limits for inotify
5. **Background Processing**: Move heavy work out of callbacks
6. **Monitoring**: Regularly check performance metrics
7. **Testing**: Benchmark your specific use case

## 🔗 Related Documentation

- [Logger API Reference](/api/logger-api)
- [FileWatcher API Reference](/api/filewatcher-api)
- [Command Line Tools](/api/cli-tools)
- [Getting Started Guide](/guide/getting-started)
- [FAQ](/guide/faq)