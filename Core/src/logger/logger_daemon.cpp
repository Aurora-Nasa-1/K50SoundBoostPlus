#include "buffer_manager.hpp"
#include "file_manager.hpp"
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <signal.h>
#include <poll.h>
#include <cstring>
#include <cstdio>
#include <ctime>
#include <string_view>
#include <atomic>
#include <memory>
#include <sstream>
#include <iomanip>

static std::atomic<bool> running{true};
static std::atomic<bool> force_flush{false};
static std::unique_ptr<BufferManager> global_buffer;
static std::unique_ptr<FileManager> global_file_mgr;
static int daemon_pid = 0;

void usr1_signal_handler(int sig) noexcept {
    (void)sig;
    force_flush.store(true, std::memory_order_relaxed);
}

void signal_handler(int sig) noexcept {
    (void)sig;
    running.store(false, std::memory_order_relaxed);
    force_flush.store(true, std::memory_order_relaxed);
}

void emergency_signal_handler(int) noexcept {
    if (global_buffer && global_file_mgr && !global_buffer->is_empty()) {
        const auto data = global_buffer->get_data();
        if (!data.empty()) {
            (void)global_file_mgr->write(std::string_view{data.data(), data.size()});
            global_buffer->clear();
        }
    }
    _exit(1);
}

constexpr LogLevel parse_log_level_char(char level_char) noexcept {
    switch (level_char) {
        case 'd': return LogLevel::DEBUG;
        case 'i': return LogLevel::INFO;
        case 'w': return LogLevel::WARNING;
        case 'e': return LogLevel::ERROR;
        case 'c': return LogLevel::CRITICAL;
        default:  return LogLevel::INFO;
    }
}



void process_batch_message(std::string_view buffer, BufferManager& buf_mgr, FileManager& file_mgr) noexcept {
    if (buffer.size() < 2) return;
    
    size_t offset = 1;
    bool has_critical = false;
    
    while (offset < buffer.size()) {
        if (offset >= buffer.size()) break;
        
        const char level_char = buffer[offset++];
        const LogLevel level = parse_log_level_char(level_char);
        if (level >= LogLevel::CRITICAL) has_critical = true;
        
        if (offset + sizeof(std::time_t) >= buffer.size()) break;
        
        std::time_t timestamp;
        std::memcpy(&timestamp, buffer.data() + offset, sizeof(timestamp));
        offset += sizeof(timestamp);
        
        const auto msg_start = buffer.find('\n', offset);
        if (msg_start == std::string_view::npos) break;
        
        const auto message = buffer.substr(offset, msg_start - offset);
        std::ostringstream oss;
        oss << "[" << timestamp << "] [" << level_char << "] " << message << "\n";
        const auto log_entry = oss.str();
        
        if (!buf_mgr.add_log(log_entry, level)) {
            const auto data = buf_mgr.get_data();
            if (!data.empty()) {
                (void)file_mgr.write(std::string_view{data.data(), data.size()});
                buf_mgr.clear();
            }
            (void)buf_mgr.add_log(log_entry, level);
        }
        
        offset = msg_start + 1;
    }
    
    if (has_critical) {
        const auto data = buf_mgr.get_data();
        if (!data.empty()) {
            (void)file_mgr.write(std::string_view{data.data(), data.size()});
            file_mgr.flush();
            buf_mgr.clear();
        }
    }
}

void process_single_message(std::string_view buffer, BufferManager& buf_mgr, FileManager& file_mgr) noexcept {
    if (buffer.size() < 2) return;
    
    const char level_char = buffer[0];
    const LogLevel level = parse_log_level_char(level_char);
    const auto now = std::time(nullptr);
    const auto message = buffer.substr(1);
    
    std::ostringstream oss;
    oss << "[" << now << "] [" << level_char << "] " << message << "\n";
    const auto log_entry = oss.str();
    
    if (!buf_mgr.add_log(log_entry, level)) {
        const auto data = buf_mgr.get_data();
        if (!data.empty()) {
            (void)file_mgr.write(std::string_view{data.data(), data.size()});
            buf_mgr.clear();
        }
        (void)buf_mgr.add_log(log_entry, level);
    }
    
    if (level >= LogLevel::CRITICAL) {
        const auto data = buf_mgr.get_data();
        if (!data.empty()) {
            (void)file_mgr.write(std::string_view{data.data(), data.size()});
            file_mgr.flush();
            buf_mgr.clear();
        }
    }
}

int main(int argc, const char* const argv[]) {
    const char* log_path = "/data/local/tmp/app.log";
    size_t max_size = 5 * 1024 * 1024;
    int max_files = 3;
    size_t buffer_size = 64 * 1024;
    int sleep_ms = 500;
    
    daemon_pid = getpid();
    

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-f") == 0 && i + 1 < argc) {
            log_path = argv[++i];
        } else if (strcmp(argv[i], "-h") == 0) {
            printf("Usage: %s [-f <path>]\n", argv[0]);
            return 0;
        }
    }
    

    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    signal(SIGUSR1, usr1_signal_handler);
    signal(SIGSEGV, emergency_signal_handler);
    signal(SIGABRT, emergency_signal_handler);
    

    global_buffer = std::make_unique<BufferManager>(buffer_size);
    global_file_mgr = std::make_unique<FileManager>(log_path, max_size, max_files);

    const int server_fd = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC | SOCK_NONBLOCK, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }
    
    struct sockaddr_un addr{};
    addr.sun_family = AF_UNIX;
    std::ostringstream path_oss;
    path_oss << "/tmp/aurora_" << daemon_pid << ".sock";
    const auto socket_path = path_oss.str();
    std::copy_n(socket_path.begin(), std::min(socket_path.size(), sizeof(addr.sun_path) - 1), addr.sun_path);
    
    if (bind(server_fd, reinterpret_cast<const struct sockaddr*>(&addr), sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return 1;
    }
    

    
    std::array<char, 4096> recv_buffer{};
    struct pollfd pfd = {server_fd, POLLIN, 0};
    
    while (running.load(std::memory_order_relaxed)) {
        const int poll_result = poll(&pfd, 1, sleep_ms);
        
        if (poll_result > 0 && (pfd.revents & POLLIN)) {
            const ssize_t len = recv(server_fd, recv_buffer.data(), recv_buffer.size(), MSG_DONTWAIT);
            if (len > 0) {
                const std::string_view buffer_view{recv_buffer.data(), static_cast<size_t>(len)};
                if (recv_buffer[0] == 'B') {
                    process_batch_message(buffer_view, *global_buffer, *global_file_mgr);
                } else {
                    process_single_message(buffer_view, *global_buffer, *global_file_mgr);
                }
            }
        }
        
        const bool should_force = force_flush.load(std::memory_order_relaxed);
        if (global_buffer->should_flush() || global_buffer->should_force_flush() || should_force) {
            const auto data = global_buffer->get_data();
            if (!data.empty()) {
                (void)global_file_mgr->write(std::string_view{data.data(), data.size()});
                if (should_force) {
                    global_file_mgr->flush();
                }
                global_buffer->clear();
            }
            force_flush.store(false, std::memory_order_relaxed);
        }
    }
    
    const auto data = global_buffer->get_data();
    if (!data.empty()) {
        (void)global_file_mgr->write(std::string_view{data.data(), data.size()});
        global_file_mgr->flush();
    }
    
    close(server_fd);
    return 0;
}