#pragma once

#include <cstddef>
#include <cstdint>
#include <string_view>
#include <array>
#include <span>
#include <atomic>

#ifdef ANDROID_DOZE_AWARE
#include <sys/timerfd.h>
#include <sys/eventfd.h>
#endif

enum class LogLevel : std::uint8_t {
    DEBUG = 1,
    INFO = 2,
    WARNING = 3,
    ERROR = 4,
    CRITICAL = 5
};

class IPCClient final {
public:
    explicit IPCClient(int daemon_pid = 0) noexcept;
    ~IPCClient() noexcept;
    
    IPCClient(const IPCClient&) = delete;
    IPCClient& operator=(const IPCClient&) = delete;
    IPCClient(IPCClient&&) = delete;
    IPCClient& operator=(IPCClient&&) = delete;
    
    [[nodiscard]] bool send(std::string_view message, LogLevel level = LogLevel::INFO) noexcept;
    [[nodiscard]] bool batch_send(std::span<const std::string_view> messages, std::span<const LogLevel> levels) noexcept;
    
    void debug(std::string_view message) noexcept { (void)send(message, LogLevel::DEBUG); }
    void info(std::string_view message) noexcept { (void)send(message, LogLevel::INFO); }
    void warning(std::string_view message) noexcept { (void)send(message, LogLevel::WARNING); }
    void error(std::string_view message) noexcept { (void)send(message, LogLevel::ERROR); }
    void critical(std::string_view message) noexcept { (void)send(message, LogLevel::CRITICAL); }
    
    void set_daemon_pid(int pid);
    
private:
    std::atomic<int> sock_fd_{-1};
    int daemon_pid_;
    std::array<char, 64> socket_path_;
    
#ifdef ANDROID_DOZE_AWARE
    int wake_fd_;
    void setup_doze_protection() noexcept;
#endif
    
    [[nodiscard]] bool ensure_connection() noexcept;
    void generate_socket_path() noexcept;
    [[nodiscard]] static constexpr char level_to_char(LogLevel level) noexcept;
};