#pragma once

#include <string>
#include <string_view>
#include <cstddef>
#include <atomic>
#include <unistd.h>
#include <fcntl.h>
#include <sys/stat.h>

class FileManager final {
public:
    explicit FileManager(std::string_view base_path, size_t max_size = 5242880, int max_files = 3) noexcept;
    ~FileManager() noexcept;
    
    FileManager(const FileManager&) = delete;
    FileManager& operator=(const FileManager&) = delete;
    FileManager(FileManager&&) = delete;
    FileManager& operator=(FileManager&&) = delete;
    
    [[nodiscard]] bool write(std::string_view data) noexcept;
    void flush() noexcept;
    
private:
    std::string base_path_;
    int fd_;
    std::atomic<size_t> current_size_{0};
    size_t max_file_size_;
    int max_files_;
    
    void rotate_file() noexcept;
    [[nodiscard]] bool open_file() noexcept;
};