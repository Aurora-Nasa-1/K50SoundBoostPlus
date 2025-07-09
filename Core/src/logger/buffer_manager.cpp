#include "buffer_manager.h"
#include <unistd.h>
#include <cstring>
#include <algorithm>

BufferManager::BufferManager(size_t buffer_size) 
    : buffer_size_(buffer_size), write_pos_(0), flush_threshold_(static_cast<size_t>(buffer_size * 0.8)),
      has_critical_logs_(false), last_flush_time_(std::chrono::steady_clock::now()), flush_interval_ms_(5000) {  // Default 5 second flush interval
    buffer_ = new char[buffer_size_];
}

BufferManager::~BufferManager() {
    delete[] buffer_;
}

bool BufferManager::add_log(const char* data, size_t len, LogLevel level) {
    if (write_pos_ + len > buffer_size_) {
        return false; // Buffer full
    }
    
    std::memcpy(buffer_ + write_pos_, data, len);
    write_pos_ += len;
    
    // Mark if this is a critical or error log
    if (level >= LogLevel::ERROR) {
        has_critical_logs_ = true;
    }
    
    return true;
}

bool BufferManager::should_flush() const {
    // Check size-based flush
    if (write_pos_ >= flush_threshold_) {
        return true;
    }
    
    // Check time-based flush
    auto now = std::chrono::steady_clock::now();
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_flush_time_).count();
    
    return elapsed >= flush_interval_ms_ && write_pos_ > 0;
}

bool BufferManager::should_force_flush() const {
    return has_critical_logs_;
}

size_t BufferManager::get_data(char** data) {
    *data = buffer_;
    return write_pos_;
}

void BufferManager::clear() {
    write_pos_ = 0;
    has_critical_logs_ = false;
    last_flush_time_ = std::chrono::steady_clock::now();
}

size_t BufferManager::available_space() const {
    return buffer_size_ - write_pos_;
}

bool BufferManager::is_empty() const {
    return write_pos_ == 0;
}

void BufferManager::set_flush_interval(int interval_ms) {
    flush_interval_ms_ = interval_ms;
}