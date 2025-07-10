#pragma once

#include <cstddef>
#include <chrono>
#include <memory>
#include <atomic>
#include <string_view>
#include <span>

enum class LogLevel : std::uint8_t {
    DEBUG = 1,
    INFO = 2,
    WARNING = 3,
    ERROR = 4,
    CRITICAL = 5
};

class BufferManager final {
public:
    explicit BufferManager(size_t buffer_size = 262144) noexcept; // 256KB for better batching
    ~BufferManager() noexcept;
    
    BufferManager(const BufferManager&) = delete;
    BufferManager& operator=(const BufferManager&) = delete;
    BufferManager(BufferManager&&) = delete;
    BufferManager& operator=(BufferManager&&) = delete;
    
    [[nodiscard]] bool add_log(std::string_view data, LogLevel level = LogLevel::INFO) noexcept;
    [[nodiscard]] bool should_flush() const noexcept;
    [[nodiscard]] bool should_force_flush() const noexcept;
    [[nodiscard]] std::span<const char> get_data() noexcept;
    void clear() noexcept;
    [[nodiscard]] bool is_empty() const noexcept;
    [[nodiscard]] size_t get_pending_size() const noexcept;
    
private:
    std::unique_ptr<char[]> buffer_;
    std::atomic<size_t> write_pos_{0};
    size_t buffer_size_;
    size_t flush_threshold_;
    std::atomic<bool> has_critical_logs_{false};
    mutable std::chrono::steady_clock::time_point last_flush_time_;
    
#ifdef ANDROID_DOZE_AWARE
    static constexpr int flush_interval_ms_ = 60000; // 1 minute for power saving
#else
    static constexpr int flush_interval_ms_ = 30000; // 30 seconds
#endif
};