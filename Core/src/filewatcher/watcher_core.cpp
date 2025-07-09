#include "watcher_core.h"
#include <sys/inotify.h>
#include <sys/stat.h>
#include <unistd.h>
#include <poll.h>
#include <cstring>
#include <cstdlib>
#include <cstdio>

WatcherCore::WatcherCore() : inotify_fd_(-1), running_(false), one_shot_(false), periodic_interval_(0) {
    inotify_fd_ = inotify_init1(IN_NONBLOCK | IN_CLOEXEC);
}

WatcherCore::~WatcherCore() {
    stop();
    if (inotify_fd_ >= 0) {
        close(inotify_fd_);
    }
}

bool WatcherCore::add_watch(const std::string& path, const std::string& command, uint32_t events) {
    if (inotify_fd_ < 0) {
        return false;
    }
    
    int wd = inotify_add_watch(inotify_fd_, path.c_str(), events);
    if (wd < 0) {
        return false;
    }
    
    watches_[wd] = {path, command, events, std::chrono::steady_clock::now()};
    return true;
}

void WatcherCore::start() {
    running_ = true;
    
    char buffer[4096];
    struct pollfd pfd = {inotify_fd_, POLLIN, 0};
    
    while (running_) {
        // Poll with timeout for power saving
        int poll_result = poll(&pfd, 1, 1000); // 1 second timeout
        
        if (poll_result > 0 && (pfd.revents & POLLIN)) {
            ssize_t len = read(inotify_fd_, buffer, sizeof(buffer));
            if (len > 0) {
                process_events(buffer, len);
            }
        } else if (poll_result == 0) {
            // Timeout - power saving sleep
            usleep(100000); // 100ms
        }
    }
}

void WatcherCore::stop() {
    running_ = false;
}

void WatcherCore::process_events(const char* buffer, ssize_t len) {
    ssize_t offset = 0;
    
    while (offset < len) {
        const struct inotify_event* event = reinterpret_cast<const struct inotify_event*>(buffer + offset);
        
        auto it = watches_.find(event->wd);
        if (it != watches_.end()) {
            execute_command(it->second.command, it->second.path, event);
        }
        
        offset += sizeof(struct inotify_event) + event->len;
    }
}

void WatcherCore::execute_command(const std::string& command, const std::string& path, 
                                 const struct inotify_event* event) {
    // Simple command execution - replace $FILE with actual filename
    std::string cmd = command;
    size_t pos = cmd.find("$FILE");
    if (pos != std::string::npos) {
        std::string filename = path;
        if (event->len > 0) {
            filename += "/" + std::string(event->name);
        }
        cmd.replace(pos, 5, filename);
    }
    
    // Execute in background to avoid blocking
    if (fork() == 0) {
        system(cmd.c_str());
        exit(0);
    }
}

void WatcherCore::set_periodic_check(int interval_seconds) {
    periodic_interval_ = interval_seconds;
}

void WatcherCore::set_one_shot(bool enabled) {
    one_shot_ = enabled;
}
