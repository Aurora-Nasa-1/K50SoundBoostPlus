#include "ipc_client.hpp"
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <string_view>
#include <vector>
#include <fstream>
#include <memory>
#include <span>

constexpr LogLevel parse_level(char c) noexcept {
    switch (c) {
        case 'd': return LogLevel::DEBUG;
        case 'i': return LogLevel::INFO;
        case 'w': return LogLevel::WARNING;
        case 'e': return LogLevel::ERROR;
        case 'c': return LogLevel::CRITICAL;
        default: return LogLevel::INFO;
    }
}

void print_usage(std::string_view prog) noexcept {
    std::printf("Usage: %s [-p PID] [-l LEVEL] MESSAGE\n", prog.data());
    std::printf("       %s [-p PID] -b FILE\n", prog.data());
}



bool process_batch_file(std::string_view filename, IPCClient& client) noexcept {
    std::ifstream file{filename.data()};
    if (!file.is_open()) {
        return false;
    }
    
    std::vector<std::string> messages;
    std::vector<LogLevel> levels;
    messages.reserve(50);
    levels.reserve(50);
    
    std::string line;
    while (std::getline(file, line) && messages.size() < 50) {
        if (line.empty()) continue;
        
        char level_char = 'i';
        std::string_view message = line;
        
        if (line.size() > 2 && line[1] == ' ') {
            level_char = line[0];
            message = std::string_view{line}.substr(2);
        }
        
        levels.emplace_back(parse_level(level_char));
        messages.emplace_back(message);
    }
    
    if (messages.empty()) {
        return false;
    }
    
    std::vector<std::string_view> message_views;
    message_views.reserve(messages.size());
    for (const auto& msg : messages) {
        message_views.emplace_back(msg);
    }
    
    return client.batch_send(std::span{message_views}, std::span{levels});
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        print_usage(argv[0]);
        return 1;
    }
    
    int daemon_pid = 0;
    LogLevel level = LogLevel::INFO;
    std::string_view batch_file;
    std::string_view message;
    
    for (int i = 1; i < argc; i++) {
        const std::string_view arg{argv[i]};
        if (arg == "-p" && i + 1 < argc) {
            daemon_pid = std::atoi(argv[++i]);
        } else if (arg == "-l" && i + 1 < argc) {
            level = parse_level(argv[++i][0]);
        } else if (arg == "-b" && i + 1 < argc) {
            batch_file = argv[++i];
        } else if (!arg.starts_with('-')) {
            message = arg;
            break;
        }
    }
    
    IPCClient client(daemon_pid);
    
    bool success = false;
    if (!batch_file.empty()) {
        success = process_batch_file(batch_file, client);
    } else if (!message.empty()) {
        success = client.send(message, level);
    } else {
        print_usage(argv[0]);
        return 1;
    }
    
    return success ? 0 : 1;
}