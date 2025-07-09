#include "file_manager.h"
#include <unistd.h>
#include <fcntl.h>
#include <cstring>
#include <cstdio>

FileManager::FileManager(const char* base_path, size_t max_size, int max_files)
    : base_path_(base_path), max_file_size_(max_size), max_files_(max_files), 
      current_fd_(-1), current_size_(0) {
    open_current_file();
}

FileManager::~FileManager() {
    if (current_fd_ >= 0) {
        close(current_fd_);
    }
}

bool FileManager::write_data(const char* data, size_t len) {
    if (current_fd_ < 0) {
        return false;
    }
    
    // Check if rotation needed
    if (current_size_ + len > max_file_size_) {
        rotate_file();
    }
    
    ssize_t written = write(current_fd_, data, len);
    if (written > 0) {
        current_size_ += static_cast<size_t>(written);
        return written == static_cast<ssize_t>(len);
    }
    
    return false;
}

void FileManager::rotate_file() {
    if (current_fd_ >= 0) {
        fsync(current_fd_); // Ensure data is written
        close(current_fd_);
    }
    
    // Rotate existing files
    for (int i = max_files_ - 1; i > 0; --i) {
        char old_name[256], new_name[256];
        snprintf(old_name, sizeof(old_name), "%s.%d", base_path_.c_str(), i - 1);
        snprintf(new_name, sizeof(new_name), "%s.%d", base_path_.c_str(), i);
        rename(old_name, new_name);
    }
    
    // Move current to .0
    char backup_name[256];
    snprintf(backup_name, sizeof(backup_name), "%s.0", base_path_.c_str());
    rename(base_path_.c_str(), backup_name);
    
    open_current_file();
}

void FileManager::open_current_file() {
    current_fd_ = open(base_path_.c_str(), O_WRONLY | O_CREAT | O_APPEND, 0644);
    off_t file_size = current_fd_ >= 0 ? lseek(current_fd_, 0, SEEK_END) : 0;
    current_size_ = file_size >= 0 ? static_cast<size_t>(file_size) : 0;
}

void FileManager::force_sync() {
    if (current_fd_ >= 0) {
        fsync(current_fd_);
    }
}