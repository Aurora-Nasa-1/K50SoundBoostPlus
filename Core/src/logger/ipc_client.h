#ifndef IPC_CLIENT_H
#define IPC_CLIENT_H

#include <string>
#include <sys/un.h>
#include "buffer_manager.h"  // For LogLevel enum

class IPCClient {
public:
    explicit IPCClient(const char* socket_path);
    ~IPCClient();
    
    bool connect();
    bool send_log(const char* message, LogLevel level = LogLevel::INFO);
    bool is_connected() const;
    
    // Utility methods for different log levels
    bool log_debug(const char* message);
    bool log_info(const char* message);
    bool log_warning(const char* message);
    bool log_error(const char* message);
    bool log_critical(const char* message);
    
private:
    std::string format_log_message(const char* message, LogLevel level);
    const char* level_to_string(LogLevel level);
    
    std::string socket_path_;
    int sock_fd_;
    struct sockaddr_un server_addr_;
    bool connected_;
};

#endif