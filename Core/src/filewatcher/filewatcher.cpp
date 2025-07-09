#include "watcher_core.h"
#include <sys/inotify.h>
#include <signal.h>
#include <cstring>
#include <cstdio>
#include <cstdlib>

static WatcherCore* g_watcher = nullptr;

void signal_handler(int sig) {
    (void)sig;  // Suppress unused parameter warning
    if (g_watcher) {
        g_watcher->stop();
    }
}

void print_usage(const char* prog_name) {
    printf("Usage: %s [options] <path> <command>\n", prog_name);
    printf("Options:\n");
    printf("  -e <events>  Event mask (default: modify,create,delete)\n");
    printf("               Available: modify,create,delete,move,attrib,access\n");
    printf("  -p <seconds> Enable periodic check every N seconds (0 to disable)\n");
    printf("  -o           One-shot mode: exit after first event detection\n");
    printf("  -h           Show this help\n");
    printf("\nExamples:\n");
    printf("  %s /tmp/test.txt \"echo File changed: $FILE\"\n", prog_name);
    printf("  %s -e create,delete /tmp/ \"logger_client File event: $FILE\"\n", prog_name);
    printf("  %s -p 30 /tmp/test.txt \"echo Periodic check: $FILE\"\n", prog_name);
    printf("  %s -o -p 10 /tmp/test.txt \"echo One-time check: $FILE\"\n", prog_name);
}

uint32_t parse_events(const char* events_str) {
    uint32_t events = 0;
    char* events_copy = strdup(events_str);
    const char* token = strtok(events_copy, ",");
    
    while (token) {
        if (strcmp(token, "modify") == 0) {
            events |= IN_MODIFY;
        } else if (strcmp(token, "create") == 0) {
            events |= IN_CREATE;
        } else if (strcmp(token, "delete") == 0) {
            events |= IN_DELETE;
        } else if (strcmp(token, "move") == 0) {
            events |= IN_MOVE;
        } else if (strcmp(token, "attrib") == 0) {
            events |= IN_ATTRIB;
        } else if (strcmp(token, "access") == 0) {
            events |= IN_ACCESS;
        }
        token = strtok(nullptr, ",");
    }
    
    free(events_copy);
    return events ? events : (IN_MODIFY | IN_CREATE | IN_DELETE);
}

int main(int argc, char* argv[]) {
    const char* path = nullptr;
    const char* command = nullptr;
    uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE;
    int periodic_interval = 0;
    bool one_shot = false;
    
    // Parse arguments
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-e") == 0 && i + 1 < argc) {
            events = parse_events(argv[++i]);
        } else if (strcmp(argv[i], "-p") == 0 && i + 1 < argc) {
            periodic_interval = atoi(argv[++i]);
            if (periodic_interval < 0) {
                fprintf(stderr, "Invalid periodic interval: %d\n", periodic_interval);
                return 1;
            }
        } else if (strcmp(argv[i], "-o") == 0) {
            one_shot = true;
        } else if (strcmp(argv[i], "-h") == 0) {
            print_usage(argv[0]);
            return 0;
        } else if (!path) {
            path = argv[i];
        } else if (!command) {
            command = argv[i];
        }
    }
    
    if (!path || !command) {
        print_usage(argv[0]);
        return 1;
    }
    
    // Setup signal handlers
    signal(SIGTERM, signal_handler);
    signal(SIGINT, signal_handler);
    
    WatcherCore watcher;
    g_watcher = &watcher;
    
    // Configure watcher options
    if (periodic_interval > 0) {
        watcher.set_periodic_check(periodic_interval);
    }
    if (one_shot) {
        watcher.set_one_shot(true);
    }
    
    if (!watcher.add_watch(path, command, events)) {
        fprintf(stderr, "Failed to add watch for: %s\n", path);
        return 1;
    }
    
    printf("Watching: %s\n", path);
    printf("Command: %s\n", command);
    if (!one_shot) {
        printf("Press Ctrl+C to stop\n");
    }
    
    watcher.start();
    
    printf("File watcher stopped\n");
    return 0;
}