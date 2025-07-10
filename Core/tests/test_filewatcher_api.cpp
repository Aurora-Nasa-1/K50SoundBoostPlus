#include "../src/filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <fstream>
#include <thread>
#include <chrono>
#include <atomic>
#include <string_view>
#include <sys/stat.h>
#include <unistd.h>

std::atomic<int> event_count{0};

void file_event_handler(const FileWatcherAPI::FileEvent& event) noexcept {
    std::cout << "File event: " << FileWatcherAPI::event_type_to_string(event.type)
              << " on " << event.path;
    if (!event.filename.empty()) {
        std::cout << "/" << event.filename;
    }
    std::cout << '\n';
    event_count.fetch_add(1, std::memory_order_relaxed);
}

int main() {
    std::cout << "Testing FileWatcher API...\n";
    
    // Create test directory using mkdir
    constexpr std::string_view test_dir = "test_data";
    mkdir(test_dir.data(), 0755);
    
    FileWatcherAPI::FileWatcher watcher;
    
    // Add watch for test directory
    const auto events = FileWatcherAPI::make_event_mask({
        FileWatcherAPI::EventType::CREATE,
        FileWatcherAPI::EventType::MODIFY,
        FileWatcherAPI::EventType::DELETE
    });
    
    if (!watcher.add_watch(std::string{test_dir}, file_event_handler, events)) {
        std::cout << "✗ Failed to add watch\n";
        return 1;
    }
    
    std::cout << "✓ Watch added successfully\n";
    
    // Start watcher in background
    watcher.start();
    std::cout << "✓ Watcher started\n";
    
    // Give watcher time to initialize
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Test file operations using native file operations
    const std::string test_file_path = std::string{test_dir} + "/test_watch.txt";
    
    std::cout << "Creating test file...\n";
    {
        std::ofstream test_file(test_file_path);
        test_file << "Hello, World!\n";
    }
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    std::cout << "Modifying test file...\n";
    {
        std::ofstream test_file(test_file_path, std::ios::app);
        test_file << "Modified content\n";
    }
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    std::cout << "Deleting test file...\n";
    unlink(test_file_path.c_str());
    
    // Wait for events to be processed
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    watcher.stop();
    std::cout << "✓ Watcher stopped\n";
    
    const int final_count = event_count.load(std::memory_order_relaxed);
    if (final_count > 0) {
        std::cout << "✓ Detected " << final_count << " file events\n";
        std::cout << "FileWatcher API test completed successfully!\n";
        return 0;
    } else {
        std::cout << "✗ No file events detected\n";
        return 1;
    }
}