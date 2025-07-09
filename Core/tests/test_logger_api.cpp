#include "../src/loggerAPI/logger_api.hpp"
#include <iostream>
#include <thread>
#include <chrono>
#include <fstream>

int main() {
    std::cout << "Testing Logger API..." << std::endl;
    
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
        LoggerAPI::info("Rotation test message " + std::to_string(i));
    }
    
    LoggerAPI::flush_logs();
    
    // Check if log file exists
    std::ifstream log_file("test_data/test.log");
    if (log_file.good()) {
        std::cout << "✓ Log file created successfully" << std::endl;
        
        std::string line;
        int line_count = 0;
        while (std::getline(log_file, line) && line_count < 5) {
            std::cout << "  Log: " << line << std::endl;
            line_count++;
        }
    } else {
        std::cout << "✗ Log file not found" << std::endl;
        return 1;
    }
    
    LoggerAPI::shutdown_logger();
    
    std::cout << "Logger API test completed successfully!" << std::endl;
    return 0;
}