#include "file_manager.hpp"
#include <fcntl.h>
#include <unistd.h>
#include <cstring>
#include <cstdio>
#include <string>

FileManager::FileManager(std::string_view base_path, size_t max_size, int max_files) noexcept
    : base_path_(base_path), fd_(-1), max_file_size_(max_size), max_files_(max_files) {
    (void)open_file();
}

FileManager::~FileManager() noexcept {
    if (fd_ != -1) {
        fsync(fd_);
        close(fd_);
    }
}

bool FileManager::open_file() noexcept {
    if (fd_ != -1) {
        close(fd_);
    }
    
    fd_ = open(base_path_.c_str(), O_WRONLY | O_CREAT | O_APPEND | O_CLOEXEC, 0644);
    if (fd_ == -1) {
        return false;
    }
    
    current_size_.store(lseek(fd_, 0, SEEK_END), std::memory_order_relaxed);
    return true;
}

bool FileManager::write(std::string_view data) noexcept {
    if (fd_ == -1) {
        return false;
    }
    
    const size_t len = data.size();
    const size_t current = current_size_.load(std::memory_order_relaxed);
    
    if (current + len > max_file_size_) {
        rotate_file();
    }
    
    ssize_t written = ::write(fd_, data.data(), len);
    if (written == static_cast<ssize_t>(len)) {
        current_size_.fetch_add(len, std::memory_order_relaxed);
        return true;
    }
    
    return false;
}

void FileManager::flush() noexcept {
    if (fd_ != -1) {
        fsync(fd_);
    }
}

void FileManager::rotate_file() noexcept {
    if (fd_ != -1) {
        fsync(fd_);
        close(fd_);
        fd_ = -1;
    }
    
    // Rotate existing backup files
    for (int i = max_files_ - 1; i > 0; --i) {
        std::string old_path = base_path_ + "." + std::to_string(i - 1);
        std::string new_path = base_path_ + "." + std::to_string(i);
        
        // Use Linux native rename, ignore errors for non-existent files
        rename(old_path.c_str(), new_path.c_str());
    }
    
    // Move current log to .0
    std::string backup_path = base_path_ + ".0";
    rename(base_path_.c_str(), backup_path.c_str());
    
    current_size_.store(0, std::memory_order_relaxed);
    (void)open_file();
}