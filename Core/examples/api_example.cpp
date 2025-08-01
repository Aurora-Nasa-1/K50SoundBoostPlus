#include "../src/filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <fstream>
#include <atomic>

// Example: Using FileWatcher API
class ApplicationMonitor {
public:
    ApplicationMonitor() : running_(false) {
        std::cout << "ApplicationMonitor initialized" << std::endl;
        
        // Setup file watcher
        setup_file_watcher();
    }
    
    ~ApplicationMonitor() {
        stop();
    }
    
    void start() {
        if (running_.exchange(true)) {
            return; // Already running
        }
        
        std::cout << "ApplicationMonitor started" << std::endl;
        
        // Start file watcher
        watcher_.start();
        
        // Simulate application work
        worker_thread_ = std::thread(&ApplicationMonitor::worker_loop, this);
    }
    
    void stop() {
        if (running_.exchange(false)) {
            std::cout << "ApplicationMonitor stopping..." << std::endl;
            
            watcher_.stop();
            
            if (worker_thread_.joinable()) {
                worker_thread_.join();
            }
            
            std::cout << "ApplicationMonitor stopped" << std::endl;
        }
    }
    
private:
    void setup_file_watcher() {
        // Watch for configuration file changes
        watcher_.add_watch("config.txt", 
            [this](const FileWatcherAPI::FileEvent& event) {
                std::string msg = "Config file event: " + 
                    FileWatcherAPI::event_type_to_string(event.type) + 
                    " on " + event.path;
                
                std::cout << msg << std::endl;
                
                if (event.type == FileWatcherAPI::EventType::MODIFY) {
                    reload_config();
                }
            },
            FileWatcherAPI::make_event_mask({
                FileWatcherAPI::EventType::MODIFY,
                FileWatcherAPI::EventType::CREATE,
                FileWatcherAPI::EventType::DELETE
            })
        );
        
        // Watch for data directory changes
        watcher_.add_watch("data", 
            [this](const FileWatcherAPI::FileEvent& event) {
                if (!event.filename.empty()) {
                    std::string msg = "Data file " + event.filename + " was " +
                        FileWatcherAPI::event_type_to_string(event.type);
                    std::cout << msg << std::endl;
                }
            },
            static_cast<uint32_t>(FileWatcherAPI::EventType::CREATE) |
            static_cast<uint32_t>(FileWatcherAPI::EventType::DELETE)
        );
    }
    
    void worker_loop() {
        int counter = 0;
        
        while (running_) {
            // Simulate periodic work
            std::cout << "Periodic task #" << ++counter << " executed" << std::endl;
            
            // Simulate some processing time
            std::this_thread::sleep_for(std::chrono::seconds(2));
            
            // Occasionally create test files to trigger watcher
            if (counter % 5 == 0) {
                create_test_data_file(counter);
            }
        }
    }
    
    void reload_config() {
        std::cout << "Reloading configuration..." << std::endl;
        
        // Simulate config reload
        std::ifstream config_file("config.txt");
        if (config_file.good()) {
            std::string line;
            while (std::getline(config_file, line)) {
                std::cout << "Config: " << line << std::endl;
            }
        } else {
            std::cout << "Failed to open config.txt for reloading." << std::endl;
        }
        
        std::cout << "Configuration reloaded successfully" << std::endl;
    }
    
    void create_test_data_file(int counter) {
        // Create data directory if it doesn't exist
        system("mkdir -p data");
        
        std::string filename = "data/test_" + std::to_string(counter) + ".txt";
        std::ofstream file(filename);
        file << "Test data file #" << counter << std::endl;
        file << "Created at: " << std::time(nullptr) << std::endl;
        
        std::cout << "Created test data file: " << filename << std::endl;
    }
    
    std::atomic<bool> running_;
    std::thread worker_thread_;
    FileWatcherAPI::FileWatcher watcher_;
};

int main() {
    std::cout << "AuroraCore API Example" << std::endl;
    std::cout << "=====================" << std::endl;
    
    // Create initial config file
    {
        std::ofstream config("config.txt");
        config << "app_name=AuroraCore-Example" << std::endl;
        config << "log_level=INFO" << std::endl;
        config << "max_connections=100" << std::endl;
    }
    
    ApplicationMonitor monitor;
    monitor.start();
    
    std::cout << "Application monitor started. Press Enter to modify config..." << std::endl;
    std::cin.get();
    
    // Modify config to trigger file watcher
    {
        std::ofstream config("config.txt", std::ios::app);
        config << "debug_mode=true" << std::endl;
        config << "updated_at=" << std::time(nullptr) << std::endl;
    }
    
    std::cout << "Config modified. Press Enter to stop..." << std::endl;
    std::cin.get();
    
    monitor.stop();
    
    // Cleanup
    system("rm -f config.txt");
    system("rm -rf data");
    
    std::cout << "\nFileWatcher example completed." << std::endl;
    
    return 0;
}