# Logger API Reference

The Logger API provides a high-performance, power-efficient logging solution designed specifically for Android root environments. It features a daemon-client architecture with intelligent buffering and automatic log rotation.

## Overview

The Logger API consists of two main components:

- **InternalLogger**: Header-only C++ API for embedded logging within applications
- **External Tools**: `logger_daemon` and `logger_client` for system-wide logging

## InternalLogger Class

### Configuration

```cpp
struct Config {
    std::string log_path;           // Path to log file
    size_t max_file_size;          // Maximum size per log file (bytes)
    int max_files;                 // Maximum number of log files to keep
    size_t buffer_size;            // Internal buffer size (bytes)
    int flush_interval_ms;         // Auto-flush interval (milliseconds)
    bool auto_flush;               // Enable automatic flushing
    LogLevel min_log_level;        // Minimum log level to record
    std::string log_format;        // Custom log format string
};
```

#### Default Configuration

```cpp
Config() :
    log_path("app.log"),
    max_file_size(10 * 1024 * 1024),  // 10MB
    max_files(5),
    buffer_size(64 * 1024),           // 64KB
    flush_interval_ms(1000),          // 1 second
    auto_flush(true),
    min_log_level(LogLevel::INFO),
    log_format("{timestamp} [{level}] [{thread_id}] {message}")
{}
```

### Log Levels

```cpp
enum class LogLevel {
    TRACE,      // Most verbose, detailed execution flow
    DEBUG,      // Debug information for development
    INFO,       // General information messages
    WARNING,    // Warning conditions
    ERROR,      // Error conditions
    FATAL       // Fatal error conditions
};
```

### Constructor

```cpp
explicit InternalLogger(const Config& config = Config{});
```

Creates a new logger instance with the specified configuration.

**Parameters:**
- `config`: Logger configuration (optional, uses defaults if not provided)

**Example:**
```cpp
LoggerAPI::InternalLogger::Config config;
config.log_path = "/data/local/tmp/app.log";
config.max_file_size = 5 * 1024 * 1024;  // 5MB
config.min_log_level = LoggerAPI::LogLevel::DEBUG;

LoggerAPI::InternalLogger logger(config);
```

### Logging Methods

#### log()

```cpp
void log(LogLevel level, const std::string& message);
```

Logs a message at the specified level.

**Parameters:**
- `level`: Log level for this message
- `message`: Message content to log

**Example:**
```cpp
logger.log(LoggerAPI::LogLevel::INFO, "Application started");
logger.log(LoggerAPI::LogLevel::ERROR, "Failed to open file");
```

#### Level-Specific Methods

```cpp
void trace(const std::string& message);
void debug(const std::string& message);
void info(const std::string& message);
void warn(const std::string& message);
void error(const std::string& message);
void fatal(const std::string& message);
```

**Example:**
```cpp
logger.info("User logged in successfully");
logger.debug("Processing request with ID: 12345");
logger.error("Database connection failed");
logger.fatal("Critical system failure");
```

### Control Methods

#### flush()

```cpp
void flush();
```

Forces immediate flush of buffered log data to disk.

**Example:**
```cpp
logger.info("Important message");
logger.flush();  // Ensure message is written immediately
```

#### stop()

```cpp
void stop();
```

Stops the logger and flushes any remaining buffered data.

**Example:**
```cpp
logger.stop();  // Clean shutdown
```

## Global API Functions

For convenience, the Logger API provides global functions that work with a singleton logger instance.

### Initialization

```cpp
void init_logger(const InternalLogger::Config& config = InternalLogger::Config{});
```

Initializes the global logger instance.

**Parameters:**
- `config`: Logger configuration (optional)

**Example:**
```cpp
LoggerAPI::InternalLogger::Config config;
config.log_path = "global.log";
config.min_log_level = LoggerAPI::LogLevel::DEBUG;

LoggerAPI::init_logger(config);
```

### Global Logging Functions

```cpp
void trace(const std::string& message);
void debug(const std::string& message);
void info(const std::string& message);
void warn(const std::string& message);
void error(const std::string& message);
void fatal(const std::string& message);
```

**Example:**
```cpp
LoggerAPI::info("Application initialized");
LoggerAPI::debug("Processing user request");
LoggerAPI::error("Network timeout occurred");
```

### Global Control Functions

```cpp
void flush_logs();
void shutdown_logger();
```

**Example:**
```cpp
LoggerAPI::flush_logs();     // Force flush
LoggerAPI::shutdown_logger(); // Clean shutdown
```

## Log Format Customization

The log format string supports the following placeholders:

- `{timestamp}`: Unix timestamp
- `{level}`: Log level name (TRACE, DEBUG, INFO, etc.)
- `{thread_id}`: Thread ID
- `{message}`: Log message content

**Default Format:**
```
{timestamp} [{level}] [{thread_id}] {message}
```

**Example Output:**
```
1703123456 [INFO] [140234567890] Application started successfully
1703123457 [DEBUG] [140234567890] Processing user request ID: 12345
1703123458 [ERROR] [140234567891] Database connection timeout
```

**Custom Format Example:**
```cpp
config.log_format = "[{level}] {timestamp} | {message}";
// Output: [INFO] 1703123456 | Application started successfully
```

## File Rotation

The Logger API automatically handles log file rotation based on the configured parameters:

- **max_file_size**: When a log file reaches this size, it's rotated
- **max_files**: Maximum number of log files to keep (oldest files are deleted)

**Rotation Example:**
```
app.log         (current log file)
app.log.1       (previous log file)
app.log.2       (older log file)
app.log.3       (oldest log file)
```

## Performance Considerations

### Buffer Management

- **buffer_size**: Larger buffers reduce I/O frequency but use more memory
- **flush_interval_ms**: Longer intervals improve performance but may delay log visibility
- **auto_flush**: Disable for maximum performance in high-throughput scenarios

**High-Performance Configuration:**
```cpp
config.buffer_size = 256 * 1024;      // 256KB buffer
config.flush_interval_ms = 5000;      // 5-second flush interval
config.auto_flush = false;            // Manual flush control
```

### Log Level Filtering

Use `min_log_level` to filter out verbose logs in production:

```cpp
// Development
config.min_log_level = LoggerAPI::LogLevel::DEBUG;

// Production
config.min_log_level = LoggerAPI::LogLevel::WARNING;
```

## Thread Safety

The Logger API is fully thread-safe. Multiple threads can log simultaneously without external synchronization:

```cpp
// Thread 1
LoggerAPI::info("Thread 1 message");

// Thread 2 (concurrent)
LoggerAPI::debug("Thread 2 message");
```

## Error Handling

The Logger API handles errors gracefully:

- **File I/O errors**: Logged to stderr, logging continues in memory
- **Disk full**: Automatic cleanup of old log files
- **Permission errors**: Fallback to alternative log locations

## Integration Examples

### Basic Application Logging

```cpp
#include "loggerAPI/logger_api.hpp"

class MyApplication {
public:
    MyApplication() {
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "myapp.log";
        config.min_log_level = LoggerAPI::LogLevel::INFO;
        LoggerAPI::init_logger(config);
        
        LoggerAPI::info("MyApplication initialized");
    }
    
    void processRequest(int requestId) {
        LoggerAPI::debug("Processing request: " + std::to_string(requestId));
        
        try {
            // Process request
            LoggerAPI::info("Request " + std::to_string(requestId) + " completed");
        } catch (const std::exception& e) {
            LoggerAPI::error("Request failed: " + std::string(e.what()));
        }
    }
    
    ~MyApplication() {
        LoggerAPI::info("MyApplication shutting down");
        LoggerAPI::shutdown_logger();
    }
};
```

### Service with Custom Configuration

```cpp
#include "loggerAPI/logger_api.hpp"

class SystemService {
private:
    LoggerAPI::InternalLogger logger_;
    
public:
    SystemService() {
        LoggerAPI::InternalLogger::Config config;
        config.log_path = "/data/local/tmp/service.log";
        config.max_file_size = 50 * 1024 * 1024;  // 50MB
        config.max_files = 10;
        config.buffer_size = 128 * 1024;          // 128KB
        config.flush_interval_ms = 2000;          // 2 seconds
        config.min_log_level = LoggerAPI::LogLevel::DEBUG;
        config.log_format = "[{level}] {timestamp} {message}";
        
        logger_ = LoggerAPI::InternalLogger(config);
        logger_.info("SystemService started");
    }
    
    void handleEvent(const std::string& event) {
        logger_.debug("Handling event: " + event);
        
        // Process event
        if (event == "critical") {
            logger_.fatal("Critical event detected!");
            logger_.flush();  // Immediate flush for critical events
        } else {
            logger_.info("Event processed: " + event);
        }
    }
};
```

## Best Practices

1. **Initialize Early**: Set up logging as early as possible in your application
2. **Use Appropriate Levels**: Reserve FATAL for truly critical errors
3. **Structured Messages**: Include relevant context in log messages
4. **Performance**: Use DEBUG/TRACE levels sparingly in production
5. **Cleanup**: Always call `shutdown_logger()` before application exit
6. **File Paths**: Use absolute paths for log files in Android environment
7. **Permissions**: Ensure write permissions for log file locations

## See Also

- [FileWatcher API](/api/filewatcher-api) - File monitoring capabilities
- [Command Line Tools](/api/cli-tools) - External logger daemon and client
- [Examples](/examples/basic-usage) - Complete usage examples
- [Performance Guide](/guide/performance) - Optimization tips