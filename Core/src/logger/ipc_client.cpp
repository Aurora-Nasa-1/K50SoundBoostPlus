#include "ipc_client.h"
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <cstring>
#include <cstdio>

IPCClient::IPCClient(const char* socket_path) 
    : socket_path_(socket_path), sock_fd_(-1), connected_(false) {
}

IPCClient::~IPCClient() {
    if (sock_fd_ >= 0) {
        close(sock_fd_);
    }
}

bool IPCClient::connect() {
    sock_fd_ = socket(AF_UNIX, SOCK_DGRAM, 0);
    if (sock_fd_ < 0) {
        connected_ = false;
        return false;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, socket_path_.c_str(), sizeof(addr.sun_path) - 1);
    
    // For DGRAM sockets, we don't need to connect, just store the address
    memcpy(&server_addr_, &addr, sizeof(addr));
    connected_ = true;
    
    return true;
}

bool IPCClient::send_log(const char* message, LogLevel level) {
    if (sock_fd_ < 0 || !connected_) {
        return false;
    }
    
    std::string formatted_msg = format_log_message(message, level);
    ssize_t sent = sendto(sock_fd_, formatted_msg.c_str(), formatted_msg.length(), 0,
                         reinterpret_cast<const struct sockaddr*>(&server_addr_), sizeof(server_addr_));
    
    return sent > 0;
}

bool IPCClient::is_connected() const {
    return connected_ && sock_fd_ >= 0;
}

bool IPCClient::log_debug(const char* message) {
    return send_log(message, LogLevel::DEBUG);
}

bool IPCClient::log_info(const char* message) {
    return send_log(message, LogLevel::INFO);
}

bool IPCClient::log_warning(const char* message) {
    return send_log(message, LogLevel::WARNING);
}

bool IPCClient::log_error(const char* message) {
    return send_log(message, LogLevel::ERROR);
}

bool IPCClient::log_critical(const char* message) {
    return send_log(message, LogLevel::CRITICAL);
}

std::string IPCClient::format_log_message(const char* message, LogLevel level) {
    char buffer[4096];
    snprintf(buffer, sizeof(buffer), "[%s] %s", level_to_string(level), message);
    return std::string(buffer);
}

const char* IPCClient::level_to_string(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG:    return "DEBUG";
        case LogLevel::INFO:     return "INFO";
        case LogLevel::WARNING:  return "WARNING";
        case LogLevel::ERROR:    return "ERROR";
        case LogLevel::CRITICAL: return "CRITICAL";
        default:                 return "UNKNOWN";
    }
}