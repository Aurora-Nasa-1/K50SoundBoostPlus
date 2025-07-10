#include "buffer_manager.hpp"
#include <cstring>

BufferManager::BufferManager(size_t buffer_size) noexcept
    : buffer_(std::make_unique<char[]>(buffer_size)),
      buffer_size_(buffer_size),
      flush_threshold_(buffer_size * 7 / 8), // Higher threshold for better batching
      last_flush_time_(std::chrono::steady_clock::now()) {
}

BufferManager::~BufferManager() noexcept = default;

bool BufferManager::add_log(std::string_view data, LogLevel level) noexcept {
    const size_t len = data.size();
    const size_t current_pos = write_pos_.load(std::memory_order_relaxed);
    
    if (current_pos + len > buffer_size_) {
        return false;
    }
    
    std::memcpy(buffer_.get() + current_pos, data.data(), len);
    write_pos_.store(current_pos + len, std::memory_order_release);
    
    if (level >= LogLevel::ERROR) {
        has_critical_logs_.store(true, std::memory_order_relaxed);
    }
    
    return true;
}

bool BufferManager::should_flush() const noexcept {
    const size_t current_size = write_pos_.load(std::memory_order_acquire);
    
    // Only flush when buffer is nearly full or has critical logs
    if (current_size >= flush_threshold_ || has_critical_logs_.load(std::memory_order_relaxed)) {
        return true;
    }
    
    // Less frequent time-based flushing for power saving
    const auto now = std::chrono::steady_clock::now();
    const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(now - last_flush_time_).count();
    return elapsed >= flush_interval_ms_ && current_size > 0;
}

bool BufferManager::should_force_flush() const noexcept {
    return write_pos_.load(std::memory_order_relaxed) >= buffer_size_ || 
           has_critical_logs_.load(std::memory_order_relaxed);
}

std::span<const char> BufferManager::get_data() noexcept {
    const size_t len = write_pos_.load(std::memory_order_acquire);
    return std::span<const char>{buffer_.get(), len};
}

size_t BufferManager::get_pending_size() const noexcept {
    return write_pos_.load(std::memory_order_relaxed);
}

void BufferManager::clear() noexcept {
    write_pos_.store(0, std::memory_order_release);
    has_critical_logs_.store(false, std::memory_order_relaxed);
    last_flush_time_ = std::chrono::steady_clock::now();
}

bool BufferManager::is_empty() const noexcept {
    return write_pos_.load(std::memory_order_relaxed) == 0;
}