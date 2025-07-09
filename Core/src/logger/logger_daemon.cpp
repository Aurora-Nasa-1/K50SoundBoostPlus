#include "buffer_manager.h"
#include "file_manager.h"
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <signal.h>
#include <poll.h>
#include <cstring>
#include <cstdlib>
#include <cstdio>
#include <ctime>
#include <chrono>
#include <thread>

static volatile bool running = true;
static volatile bool force_flush = false;
static const char* socket_path = "/tmp/logger_daemon";
static BufferManager* global_buffer = nullptr;
static FileManager* global_file_mgr = nullptr;

// Signal handler for SIGUSR1 - force flush without shutdown
void usr1_signal_handler(int sig) {
    (void)sig;  // Suppress unused parameter warning
    printf("\nReceived SIGUSR1, forcing buffer flush...\n");
    force_flush = true;
}

// Enhanced signal handler for graceful shutdown
void signal_handler(int sig) {
    (void)sig;  // Suppress unused parameter warning
    printf("\nReceived signal %d, initiating graceful shutdown...\n", sig);
    running = false;
    force_flush = true;
}

// Emergency signal handler for unexpected termination
void emergency_signal_handler(int sig) {
    printf("\nEmergency signal %d received, flushing logs immediately...\n", sig);
    if (global_buffer && global_file_mgr && !global_buffer->is_empty()) {
        char* data;
        size_t data_len = global_buffer->get_data(&data);
        if (data_len > 0) {
            global_file_mgr->write_data(data, data_len);
            global_file_mgr->force_sync();
        }
    }
    _exit(1);  // Force exit after emergency flush
}

// Parse log level from message
LogLevel parse_log_level(const char* message) {
    if (strncmp(message, "[DEBUG]", 7) == 0) return LogLevel::DEBUG;
    if (strncmp(message, "[INFO]", 6) == 0) return LogLevel::INFO;
    if (strncmp(message, "[WARNING]", 9) == 0) return LogLevel::WARNING;
    if (strncmp(message, "[ERROR]", 7) == 0) return LogLevel::ERROR;
    if (strncmp(message, "[CRITICAL]", 10) == 0) return LogLevel::CRITICAL;
    return LogLevel::INFO;  // Default level
}

int main(int argc, const char* const argv[]) {
    const char* log_path = "/data/local/tmp/app.log";
    size_t max_size = 10 * 1024 * 1024; // 10MB
    int max_files = 5;
    size_t buffer_size = 64 * 1024; // 64KB
    int sleep_ms = 100; // 100ms sleep for power saving
    int flush_interval_ms = 5000; // 5 second flush interval
    
    // Parse command line arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-f") == 0 && i + 1 < argc) {
            log_path = argv[++i];
        } else if (strcmp(argv[i], "-s") == 0 && i + 1 < argc) {
            max_size = static_cast<size_t>(atol(argv[++i]));
        } else if (strcmp(argv[i], "-n") == 0 && i + 1 < argc) {
            max_files = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-b") == 0 && i + 1 < argc) {
            buffer_size = static_cast<size_t>(atol(argv[++i]));
        } else if (strcmp(argv[i], "-p") == 0 && i + 1 < argc) {
            socket_path = argv[++i];
        } else if (strcmp(argv[i], "-t") == 0 && i + 1 < argc) {
            flush_interval_ms = atoi(argv[++i]);
        } else if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0) {
            printf("Usage: %s [options]\n", argv[0]);
            printf("Options:\n");
            printf("  -f <path>     Log file path (default: /data/local/tmp/app.log)\n");
            printf("  -s <size>     Max file size in bytes (default: 10MB)\n");
            printf("  -n <count>    Max number of log files (default: 5)\n");
            printf("  -b <size>     Buffer size in bytes (default: 64KB)\n");
            printf("  -p <path>     Socket path (default: /tmp/logger_daemon)\n");
            printf("  -t <ms>       Flush interval in milliseconds (default: 5000)\n");
            printf("  -h, --help    Show this help message\n");
            return 0;
        }
    }
    
    // Setup signal handlers for graceful shutdown
    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    signal(SIGQUIT, signal_handler);
    signal(SIGUSR1, usr1_signal_handler);  // Handle USR1 for testing (flush only)
    
    // Setup emergency signal handlers for unexpected termination
    signal(SIGSEGV, emergency_signal_handler);
    signal(SIGABRT, emergency_signal_handler);
    signal(SIGFPE, emergency_signal_handler);
    
    // Initialize components
    BufferManager buffer(buffer_size);
    FileManager file_mgr(log_path, max_size, max_files);
    
    // Set global pointers for signal handlers
    global_buffer = &buffer;
    global_file_mgr = &file_mgr;
    
    // Configure buffer flush interval
    buffer.set_flush_interval(flush_interval_ms);
    
    // Create Unix domain socket
    int server_fd = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (server_fd < 0) {
        perror("socket");
        return 1;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path, sizeof(addr.sun_path) - 1);
    
    unlink(socket_path); // Remove existing socket
    if (bind(server_fd, reinterpret_cast<const struct sockaddr*>(&addr), sizeof(addr)) < 0) {
        perror("bind");
        close(server_fd);
        return 1;
    }
    
    printf("Logger daemon started, socket: %s\n", socket_path);
    
    char recv_buffer[4096];
    struct pollfd pfd = {server_fd, POLLIN, 0};
    
    printf("Logger daemon ready to receive logs...\n");
    
    while (running) {
        // Poll with timeout for power saving
        int poll_result = poll(&pfd, 1, sleep_ms);
        
        if (poll_result > 0 && (pfd.revents & POLLIN)) {
            ssize_t len = recv(server_fd, recv_buffer, sizeof(recv_buffer) - 1, 0);
            if (len > 0) {
                recv_buffer[len] = '\0';
                
                // Parse log level from message
                LogLevel level = parse_log_level(recv_buffer);
                
                // Add timestamp and format log entry
                time_t now = time(nullptr);
                const struct tm* tm_info = localtime(&now);
                char timestamp[64];
                strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", tm_info);
                
                char log_entry[4200];
                int entry_len = snprintf(log_entry, sizeof(log_entry), 
                    "[%s] %s\n", timestamp, recv_buffer);
                
                // Try to add to buffer
                if (!buffer.add_log(log_entry, static_cast<size_t>(entry_len), level)) {
                    // Buffer full, flush first
                    char* data;
                    size_t data_len = buffer.get_data(&data);
                    if (data_len > 0) {
                        file_mgr.write_data(data, data_len);
                        buffer.clear();
                    }
                    buffer.add_log(log_entry, static_cast<size_t>(entry_len), level);
                }
                
                // Immediately flush for ERROR and CRITICAL logs
                if (level >= LogLevel::ERROR) {
                    char* data;
                    size_t data_len = buffer.get_data(&data);
                    if (data_len > 0) {
                        file_mgr.write_data(data, data_len);
                        file_mgr.force_sync();  // Ensure immediate write to disk
                        buffer.clear();
                    }
                }
            }
        }
        
        // Check if buffer should be flushed (time-based or size-based)
        if (buffer.should_flush() || buffer.should_force_flush() || force_flush) {
            char* data;
            size_t data_len = buffer.get_data(&data);
            if (data_len > 0) {
                file_mgr.write_data(data, data_len);
                if (force_flush) {
                    file_mgr.force_sync();  // Force sync on shutdown
                }
                buffer.clear();
            }
            force_flush = false;
        }
        
        // Power saving sleep when no activity
        if (poll_result == 0) {
            usleep(static_cast<useconds_t>(sleep_ms * 1000));
        }
    }
    
    // Flush remaining buffer on exit
    char* data;
    size_t data_len = buffer.get_data(&data);
    if (data_len > 0) {
        file_mgr.write_data(data, data_len);
        file_mgr.force_sync();
    }
    
    close(server_fd);
    unlink(socket_path);
    printf("Logger daemon stopped\n");
    
    return 0;
}