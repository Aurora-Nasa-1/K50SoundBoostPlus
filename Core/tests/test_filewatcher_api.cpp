#include "../src/filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <fstream>
#include <thread>
#include <chrono>
#include <atomic>

std::atomic<int> event_count{0};

void file_event_handler(const FileWatcherAPI::FileEvent& event) {
    std::cout << "File event: " << FileWatcherAPI::event_type_to_string(event.type)
              << " on " << event.path;
    if (!event.filename.empty()) {
        std::cout << "/" << event.filename;
    }
    std::cout << std::endl;
    event_count++;
}

int main() {
    std::cout << "Testing FileWatcher API..." << std::endl;
    
    // Create test directory
    system("mkdir -p test_data");
    
    FileWatcherAPI::FileWatcher watcher;
    
    // Add watch for test directory
    auto events = FileWatcherAPI::make_event_mask({
        FileWatcherAPI::EventType::CREATE,
        FileWatcherAPI::EventType::MODIFY,
        FileWatcherAPI::EventType::DELETE
    });
    
    if (!watcher.add_watch("test_data", file_event_handler, events)) {
        std::cout << "✗ Failed to add watch" << std::endl;
        return 1;
    }
    
    std::cout << "✓ Watch added successfully" << std::endl;
    
    // Start watcher in background
    watcher.start();
    std::cout << "✓ Watcher started" << std::endl;
    
    // Give watcher time to initialize
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    // Test file operations
    std::cout << "Creating test file..." << std::endl;
    {
        std::ofstream test_file("test_data/test_watch.txt");
        test_file << "Hello, World!" << std::endl;
    }
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    std::cout << "Modifying test file..." << std::endl;
    {
        std::ofstream test_file("test_data/test_watch.txt", std::ios::app);
        test_file << "Modified content" << std::endl;
    }
    
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    
    std::cout << "Deleting test file..." << std::endl;
    system("rm -f test_data/test_watch.txt");
    
    // Wait for events to be processed
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    watcher.stop();
    std::cout << "✓ Watcher stopped" << std::endl;
    
    if (event_count > 0) {
        std::cout << "✓ Detected " << event_count << " file events" << std::endl;
        std::cout << "FileWatcher API test completed successfully!" << std::endl;
        return 0;
    } else {
        std::cout << "✗ No file events detected" << std::endl;
        return 1;
    }
}