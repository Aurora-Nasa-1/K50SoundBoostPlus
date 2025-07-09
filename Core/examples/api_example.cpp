#include "../src/loggerAPI/logger_api.hpp"
#include "../src/filewatcherAPI/filewatcher_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <fstream>
#include <atomic>

// Example: Using Logger API and FileWatcher API together
class ApplicationMonitor {
public:
    ApplicationMonitor() : running_(false) {
        // Configure logger
        LoggerAPI::InternalLogger::Config log_config;
        log_config.log_path = "app_monitor.log";
        log_config.max_file_size = 5 * 1024 * 1024; // 5MB
        log_config.max_files = 3;
        log_config.flush_interval_ms = 500;
        log_config.min_log_level = LoggerAPI::LogLevel::DEBUG; // Set min log level
        log_config.log_format = "[{timestamp}] thread:{thread_id} {level} - {message}"; // Custom log format
        
        LoggerAPI::init_logger(log_config);
        LoggerAPI::info("ApplicationMonitor initialized"); // Changed to info
        
        // Setup file watcher
        setup_file_watcher();
    }
    
    ~ApplicationMonitor() {
        stop();
        LoggerAPI::shutdown_logger();
    }
    
    void start() {
        if (running_.exchange(true)) {
            return; // Already running
        }
        
        LoggerAPI::info("ApplicationMonitor started"); // Changed to info
        LoggerAPI::debug("Debug mode: enabled"); // Example debug message
        LoggerAPI::trace("Trace: Detailed trace information here."); // Example trace (should be filtered)
        
        // Start file watcher
        watcher_.start();
        
        // Simulate application work
        worker_thread_ = std::thread(&ApplicationMonitor::worker_loop, this);
    }
    
    void stop() {
        if (running_.exchange(false)) {
            LoggerAPI::warn("ApplicationMonitor stopping..."); // Changed to warn
            
            watcher_.stop();
            
            if (worker_thread_.joinable()) {
                worker_thread_.join();
            }
            
            LoggerAPI::info("ApplicationMonitor stopped"); // Changed to info
            LoggerAPI::fatal("Example of a FATAL error if something went critically wrong before stopping."); // Example fatal
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
                
                LoggerAPI::debug(msg); // Changed to debug
                
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
                    LoggerAPI::debug(msg); // Changed to debug
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
            LoggerAPI::info("Periodic task #" + std::to_string(++counter) + " executed"); // Changed to info
            LoggerAPI::trace("Trace: Inside worker_loop iteration."); // Example trace (should be filtered)
            
            // Simulate some processing time
            std::this_thread::sleep_for(std::chrono::seconds(2));
            
            // Occasionally create test files to trigger watcher
            if (counter % 5 == 0) {
                create_test_data_file(counter);
            }
        }
    }
    
    void reload_config() {
        LoggerAPI::info("Reloading configuration..."); // Changed to info
        
        // Simulate config reload
        std::ifstream config_file("config.txt");
        if (config_file.good()) {
            std::string line;
            while (std::getline(config_file, line)) {
                LoggerAPI::debug("Config: " + line); // Changed to debug
            }
        } else {
            LoggerAPI::error("Failed to open config.txt for reloading."); // Example error
        }
        
        LoggerAPI::info("Configuration reloaded successfully"); // Changed to info
    }
    
    void create_test_data_file(int counter) {
        // Create data directory if it doesn't exist
        system("mkdir -p data");
        
        std::string filename = "data/test_" + std::to_string(counter) + ".txt";
        std::ofstream file(filename);
        file << "Test data file #" << counter << std::endl;
        file << "Created at: " << std::time(nullptr) << std::endl;
        
        LoggerAPI::debug("Created test data file: " + filename); // Changed to debug
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
    
    std::cout << "\nCheck app_monitor.log for the complete log output." << std::endl;
    
    return 0;
}