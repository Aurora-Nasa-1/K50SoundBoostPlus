#pragma once
#include <string>
#include <functional>
#include <thread>
#include <atomic>
#include <unordered_map>
#include <sys/inotify.h>
#include <unistd.h>
#include <poll.h>

namespace FileWatcherAPI {

enum class EventType {
    MODIFY = IN_MODIFY,
    CREATE = IN_CREATE,
    DELETE = IN_DELETE,
    MOVE = IN_MOVE,
    ATTRIB = IN_ATTRIB,
    ACCESS = IN_ACCESS
};

struct FileEvent {
    std::string path;
    std::string filename;
    EventType type;
    uint32_t mask;
};

using EventCallback = std::function<void(const FileEvent&)>;

class FileWatcher {
public:
    FileWatcher() : inotify_fd_(-1), running_(false) {
        inotify_fd_ = inotify_init1(IN_NONBLOCK | IN_CLOEXEC);
    }
    
    ~FileWatcher() {
        stop();
        if (inotify_fd_ >= 0) {
            close(inotify_fd_);
        }
    }
    
    bool add_watch(const std::string& path, EventCallback callback, 
                   uint32_t events = IN_MODIFY | IN_CREATE | IN_DELETE) {
        if (inotify_fd_ < 0) {
            return false;
        }
        
        int wd = inotify_add_watch(inotify_fd_, path.c_str(), events);
        if (wd < 0) {
            return false;
        }
        
        watches_[wd] = {path, callback, events};
        return true;
    }
    
    void start() {
        if (running_.exchange(true)) {
            return; // Already running
        }
        
        worker_thread_ = std::thread(&FileWatcher::worker_loop, this);
    }
    
    void stop() {
        if (running_.exchange(false)) {
            if (worker_thread_.joinable()) {
                worker_thread_.join();
            }
        }
    }
    
    bool is_running() const {
        return running_;
    }
    
private:
    struct WatchInfo {
        std::string path;
        EventCallback callback;
        uint32_t events;
    };
    
    void worker_loop() {
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
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }
        }
    }
    
    void process_events(const char* buffer, ssize_t len) {
        const struct inotify_event* event;
        ssize_t offset = 0;
        
        while (offset < len) {
            event = reinterpret_cast<const struct inotify_event*>(buffer + offset);
            
            auto it = watches_.find(event->wd);
            if (it != watches_.end()) {
                FileEvent file_event;
                file_event.path = it->second.path;
                file_event.filename = event->len > 0 ? event->name : "";
                file_event.type = static_cast<EventType>(event->mask & it->second.events);
                file_event.mask = event->mask;
                
                // Call user callback
                it->second.callback(file_event);
            }
            
            offset += sizeof(struct inotify_event) + event->len;
        }
    }
    
    int inotify_fd_;
    std::atomic<bool> running_;
    std::thread worker_thread_;
    std::unordered_map<int, WatchInfo> watches_;
};

// Utility functions
inline uint32_t make_event_mask(std::initializer_list<EventType> events) {
    uint32_t mask = 0;
    for (auto event : events) {
        mask |= static_cast<uint32_t>(event);
    }
    return mask;
}

inline std::string event_type_to_string(EventType type) {
    switch (type) {
        case EventType::MODIFY: return "MODIFY";
        case EventType::CREATE: return "CREATE";
        case EventType::DELETE: return "DELETE";
        case EventType::MOVE: return "MOVE";
        case EventType::ATTRIB: return "ATTRIB";
        case EventType::ACCESS: return "ACCESS";
        default: return "UNKNOWN";
    }
}

} // namespace FileWatcherAPI