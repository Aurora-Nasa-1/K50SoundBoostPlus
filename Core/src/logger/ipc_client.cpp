#include "ipc_client.hpp"
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <cstdio>
#include <ctime>
#include <algorithm>
#include <sstream>

IPCClient::IPCClient(int daemon_pid) noexcept
    : daemon_pid_(daemon_pid) {
    generate_socket_path();
#ifdef ANDROID_DOZE_AWARE
    setup_doze_protection();
#endif
}

IPCClient::~IPCClient() noexcept {
    const int fd = sock_fd_.load(std::memory_order_relaxed);
    if (fd != -1) {
        close(fd);
    }
#ifdef ANDROID_DOZE_AWARE
    if (wake_fd_ != -1) {
        close(wake_fd_);
    }
#endif
}

bool IPCClient::ensure_connection() noexcept {
    int current_fd = sock_fd_.load(std::memory_order_acquire);
    
    if (current_fd != -1) {
        return true;
    }
    
    const int new_fd = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC | SOCK_NONBLOCK, 0);
    if (new_fd == -1) {
        return false;
    }
    
    struct sockaddr_un addr{};
    addr.sun_family = AF_UNIX;
    std::copy_n(socket_path_.data(), std::min(socket_path_.size(), sizeof(addr.sun_path) - 1), addr.sun_path);
    
    if (connect(new_fd, reinterpret_cast<const struct sockaddr*>(&addr), sizeof(addr)) == -1) {
        close(new_fd);
        return false;
    }
    
    sock_fd_.store(new_fd, std::memory_order_release);
    return true;
}

void IPCClient::generate_socket_path() noexcept {
    std::ostringstream oss;
    oss << "/tmp/aurora_" << daemon_pid_ << ".sock";
    const auto result = oss.str();
    std::copy_n(result.begin(), std::min(result.size(), socket_path_.size() - 1), socket_path_.begin());
    socket_path_[std::min(result.size(), socket_path_.size() - 1)] = '\0';
}

constexpr char IPCClient::level_to_char(LogLevel level) noexcept {
    switch (level) {
        case LogLevel::DEBUG: return 'd';
        case LogLevel::INFO: return 'i';
        case LogLevel::WARNING: return 'w';
        case LogLevel::ERROR: return 'e';
        case LogLevel::CRITICAL: return 'c';
        default: return 'i';
    }
}

bool IPCClient::send(std::string_view message, LogLevel level) noexcept {
    if (!ensure_connection()) {
        return false;
    }
    
    std::ostringstream oss;
    oss << level_to_char(level) << message << "\n";
    const auto formatted = oss.str();
    
    const int fd = sock_fd_.load(std::memory_order_acquire);
    const ssize_t sent = ::send(fd, formatted.data(), formatted.size(), MSG_DONTWAIT);
    
    if (sent == -1) {
        sock_fd_.store(-1, std::memory_order_release);
        close(fd);
        return false;
    }
    
    return sent == static_cast<ssize_t>(formatted.size());
}

bool IPCClient::batch_send(std::span<const std::string_view> messages, std::span<const LogLevel> levels) noexcept {
    if (!ensure_connection() || messages.empty() || messages.size() != levels.size()) {
        return false;
    }
    
    std::string batch_buffer;
    batch_buffer.reserve(4096);
    batch_buffer += 'B';
    
    const auto now = std::time(nullptr);
    
    for (size_t i = 0; i < messages.size() && batch_buffer.size() < 3584; ++i) {
        std::ostringstream entry_oss;
        entry_oss << level_to_char(levels[i]) << now << messages[i] << "\n";
        const auto entry = entry_oss.str();
        
        if (batch_buffer.size() + entry.size() >= 4096) {
            break;
        }
        
        batch_buffer += entry;
    }
    
    const int fd = sock_fd_.load(std::memory_order_acquire);
    const ssize_t sent = ::send(fd, batch_buffer.data(), batch_buffer.size(), MSG_DONTWAIT);
    
    if (sent == -1) {
        sock_fd_.store(-1, std::memory_order_release);
        close(fd);
        return false;
    }
    
    return sent == static_cast<ssize_t>(batch_buffer.size());
}

void IPCClient::set_daemon_pid(int pid) {
    if (daemon_pid_ != pid) {
        daemon_pid_ = pid;
        generate_socket_path();
        const int fd = sock_fd_.load(std::memory_order_acquire);
        if (fd != -1) {
            close(fd);
            sock_fd_.store(-1, std::memory_order_release);
        }
    }
}

#ifdef ANDROID_DOZE_AWARE
void IPCClient::setup_doze_protection() noexcept {
    wake_fd_ = eventfd(0, EFD_CLOEXEC | EFD_NONBLOCK);
}
#endif