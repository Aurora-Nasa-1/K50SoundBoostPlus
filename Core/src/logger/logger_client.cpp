#include "ipc_client.h"
#include <cstring>
#include <cstdio>
#include <unistd.h>
#include <cstdlib>

LogLevel parse_level_string(const char* level_str) {
    if (strcasecmp(level_str, "debug") == 0) return LogLevel::DEBUG;
    if (strcasecmp(level_str, "info") == 0) return LogLevel::INFO;
    if (strcasecmp(level_str, "warning") == 0 || strcasecmp(level_str, "warn") == 0) return LogLevel::WARNING;
    if (strcasecmp(level_str, "error") == 0) return LogLevel::ERROR;
    if (strcasecmp(level_str, "critical") == 0 || strcasecmp(level_str, "crit") == 0) return LogLevel::CRITICAL;
    return LogLevel::INFO;  // Default
}

void print_usage(const char* program_name) {
    printf("Usage: %s [options] <message>\n", program_name);
    printf("Options:\n");
    printf("  -p <path>     Socket path (default: /tmp/logger_daemon)\n");
    printf("  -l <level>    Log level: debug, info, warning, error, critical (default: info)\n");
    printf("  -m <message>  Log message (alternative to positional argument)\n");
    printf("  -h, --help    Show this help message\n");
    printf("\nExamples:\n");
    printf("  %s \"Application started\"\n", program_name);
    printf("  %s -l error \"Database connection failed\"\n", program_name);
    printf("  %s -p /custom/socket -l critical \"System failure\"\n", program_name);
}

int main(int argc, const char* const argv[]) {
    const char* socket_path = "/tmp/logger_daemon";
    const char* message = nullptr;
    LogLevel level = LogLevel::INFO;
    
    // Parse arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-p") == 0 && i + 1 < argc) {
            socket_path = argv[++i];
        } else if (strcmp(argv[i], "-l") == 0 && i + 1 < argc) {
            level = parse_level_string(argv[++i]);
        } else if (strcmp(argv[i], "-m") == 0 && i + 1 < argc) {
            message = argv[++i];
        } else if (strcmp(argv[i], "-h") == 0 || strcmp(argv[i], "--help") == 0) {
            print_usage(argv[0]);
            return 0;
        } else if (argv[i][0] != '-' && !message) {
            message = argv[i];
        }
    }
    
    if (!message) {
        fprintf(stderr, "Error: No message provided\n\n");
        print_usage(argv[0]);
        return 1;
    }
    
    IPCClient client(socket_path);
    if (!client.connect()) {
        fprintf(stderr, "Failed to connect to daemon at %s\n", socket_path);
        fprintf(stderr, "Make sure the logger daemon is running\n");
        return 1;
    }
    
    if (!client.send_log(message, level)) {
        fprintf(stderr, "Failed to send log message\n");
        return 1;
    }
    
    printf("Log sent successfully\n");
    return 0;
}