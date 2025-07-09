#ifndef BUFFER_MANAGER_H
#define BUFFER_MANAGER_H

#include <cstddef>
#include <chrono>

// Log levels enumeration
enum class LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARNING = 2,
    ERROR = 3,
    CRITICAL = 4
};

class BufferManager {
public:
    explicit BufferManager(size_t buffer_size = 64 * 1024); // 64KB default
    ~BufferManager();
    
    // Disable copy constructor and assignment operator to prevent issues with dynamic memory
    BufferManager(const BufferManager&) = delete;
    BufferManager& operator=(const BufferManager&) = delete;
    
    // Add log data to buffer with level support
    bool add_log(const char* data, size_t len, LogLevel level = LogLevel::INFO);
    
    // Check if buffer should be flushed (time-based or size-based)
    bool should_flush() const;
    
    // Force flush for critical logs
    bool should_force_flush() const;
    
    // Get buffer data for writing
    size_t get_data(char** data);
    
    // Clear buffer after flush
    void clear();
    
    // Get available space
    size_t available_space() const;
    
    // Check if buffer is empty
    bool is_empty() const;
    
    // Set flush interval in milliseconds
    void set_flush_interval(int interval_ms);
    
private:
    char* buffer_;
    size_t buffer_size_;
    size_t write_pos_;
    size_t flush_threshold_;
    bool has_critical_logs_;  // Flag to track if buffer contains critical/error logs
    std::chrono::steady_clock::time_point last_flush_time_;
    int flush_interval_ms_;   // Time-based flush interval
};

#endif