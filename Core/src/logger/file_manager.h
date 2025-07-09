#pragma once
#include <string>
#include <cstddef>

class FileManager {
public:
    explicit FileManager(const char* base_path, size_t max_size = 10 * 1024 * 1024, int max_files = 5);
    ~FileManager();
    
    // Write data to current log file
    bool write_data(const char* data, size_t len);
    
    // Force sync to disk
    void force_sync();
    
private:
    void rotate_file();
    void open_current_file();
    
    std::string base_path_;
    size_t max_file_size_;
    int max_files_;
    int current_fd_;
    size_t current_size_;
};