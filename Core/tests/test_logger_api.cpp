#include "../src/loggerAPI/logger_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <fstream>
#include <string_view>
#include <sstream>
#include <sys/stat.h>
#include <unistd.h>

int main() {
    std::cout << "Testing Logger API...\n";
    
    // Create test directory using mkdir
    constexpr std::string_view test_dir = "test_data";
    mkdir(test_dir.data(), 0755);
    
    // Test 1: Basic logging
    LoggerAPI::InternalLogger::Config config;
    config.log_path = "test_data/test.log";
    config.max_file_size = 1024; // 1KB for testing
    config.max_files = 3;
    config.flush_interval_ms = 100;
    
    LoggerAPI::init_logger(config);
    
    // Test logging
    LoggerAPI::info("Test message 1");
    LoggerAPI::info("Test message 2");
    LoggerAPI::info("Test message 3");
    
    // Wait for flush
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    
    // Test file rotation by logging many messages
    for (int i = 0; i < 100; ++i) {
        std::ostringstream oss;
        oss << "Rotation test message " << i;
        LoggerAPI::info(oss.str());
    }
    
    LoggerAPI::flush_logs();
    
    // Check if log file exists using stat
    const std::string log_file_path = std::string{test_dir} + "/test.log";
    struct stat file_stat;
    
    if (stat(log_file_path.c_str(), &file_stat) == 0) {
        std::cout << "✓ Log file created successfully\n";
        
        std::ifstream log_file(log_file_path);
        std::string line;
        int line_count = 0;
        while (std::getline(log_file, line) && line_count < 5) {
            std::cout << "  Log: " << line << "\n";
            ++line_count;
        }
    } else {
        std::cout << "✗ Log file not found\n";
        return 1;
    }
    
    LoggerAPI::shutdown_logger();
    
    std::cout << "Logger API test completed successfully!\n";
    return 0;
}