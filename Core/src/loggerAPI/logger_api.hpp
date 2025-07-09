#pragma once
#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <fstream>
#include <chrono>
#include <sstream> // Required for std::stringstream
#include <cstring>  // Required for std::memcpy

namespace LoggerAPI {

// Define LogLevel enum
enum class LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARNING,
    ERROR,
    FATAL
};

// Helper function to convert LogLevel to string
inline const char* level_to_string(LogLevel level) {
    switch (level) {
        case LogLevel::TRACE: return "TRACE";
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO: return "INFO";
        case LogLevel::WARNING: return "WARNING";
        case LogLevel::ERROR: return "ERROR";
        case LogLevel::FATAL: return "FATAL";
        default: return "UNKNOWN";
    }
}

class InternalLogger {
public:
    struct Config {
        std::string log_path;
        size_t max_file_size;
        int max_files;
        size_t buffer_size;
        int flush_interval_ms;
        bool auto_flush;
        LogLevel min_log_level; // Minimum log level
        std::string log_format; // Customizable log format

        Config() :
            log_path("app.log"),
            max_file_size(10 * 1024 * 1024), // 10MB
            max_files(5),
            buffer_size(64 * 1024), // 64KB
            flush_interval_ms(1000), // 1 second
            auto_flush(true),
            min_log_level(LogLevel::INFO),
            log_format("{timestamp} [{level}] [{thread_id}] {message}")
        {}
    };
    
    explicit InternalLogger(const Config& config = Config{})
        : config_(config), running_(true), buffer_pos_(0) {
        buffer_.resize(config_.buffer_size);
        
        if (config_.auto_flush) {
            flush_thread_ = std::thread(&InternalLogger::flush_worker, this);
        }
    }
    
    ~InternalLogger() {
        stop();
    }
    
    void log(LogLevel level, const std::string& message) {
        if (level < config_.min_log_level) {
            return;
        }

        auto now = std::chrono::system_clock::now();
        auto time_t_now = std::chrono::system_clock::to_time_t(now);
        std::string timestamp_str = std::to_string(time_t_now);
        std::string level_str = level_to_string(level);

        std::stringstream thread_id_ss;
        thread_id_ss << std::this_thread::get_id();
        std::string thread_id_str = thread_id_ss.str();

        std::string current_format = config_.log_format;

        // Replace {timestamp}
        size_t pos = current_format.find("{timestamp}");
        if (pos != std::string::npos) {
            current_format.replace(pos, std::string("{timestamp}").length(), timestamp_str);
        }

        // Replace {level}
        pos = current_format.find("{level}");
        if (pos != std::string::npos) {
            current_format.replace(pos, std::string("{level}").length(), level_str);
        }
        
        // Replace {thread_id}
        pos = current_format.find("{thread_id}");
        if (pos != std::string::npos) {
            current_format.replace(pos, std::string("{thread_id}").length(), thread_id_str);
        }

        // Replace {message}
        pos = current_format.find("{message}");
        if (pos != std::string::npos) {
            current_format.replace(pos, std::string("{message}").length(), message);
        }

        std::string log_entry = current_format + "\n";
        
        std::lock_guard<std::mutex> lock(buffer_mutex_);
        
        if (buffer_pos_ + log_entry.size() > buffer_.size()) {
            flush_buffer_unsafe();
        }
        
        std::memcpy(buffer_.data() + buffer_pos_, log_entry.c_str(), log_entry.size());
        buffer_pos_ += log_entry.size();
        
        if (buffer_pos_ > buffer_.size() * 0.8) {
            cv_.notify_one();
        }
    }
    
    void flush() {
        std::lock_guard<std::mutex> lock(buffer_mutex_);
        flush_buffer_unsafe();
    }
    
    void stop() {
        if (running_.exchange(false)) {
            cv_.notify_all();
            if (flush_thread_.joinable()) {
                flush_thread_.join();
            }
            flush();
        }
    }
    
private:
    void flush_worker() {
        while (running_) {
            std::unique_lock<std::mutex> lock(buffer_mutex_);
            cv_.wait_for(lock, std::chrono::milliseconds(config_.flush_interval_ms),
                        [this] { return !running_ || buffer_pos_ > buffer_.size() * 0.8; });
            
            if (buffer_pos_ > 0) {
                flush_buffer_unsafe();
            }
        }
    }
    
    void flush_buffer_unsafe() {
        if (buffer_pos_ == 0) return;
        
        if (!file_.is_open() || file_.tellp() > static_cast<std::streampos>(config_.max_file_size)) {
            rotate_file();
        }
        
        file_.write(buffer_.data(), buffer_pos_);
        file_.flush();
        buffer_pos_ = 0;
    }
    
    void rotate_file() {
        if (file_.is_open()) {
            file_.close();
        }
        
        // Rotate existing files
        for (int i = config_.max_files - 1; i > 0; --i) {
            std::string old_name = config_.log_path + "." + std::to_string(i - 1);
            std::string new_name = config_.log_path + "." + std::to_string(i);
            std::rename(old_name.c_str(), new_name.c_str());
        }
        
        // Move current to .0
        std::string backup_name = config_.log_path + ".0";
        std::rename(config_.log_path.c_str(), backup_name.c_str());
        
        file_.open(config_.log_path, std::ios::out | std::ios::app);
    }
    
    Config config_;
    std::atomic<bool> running_;
    std::vector<char> buffer_;
    size_t buffer_pos_;
    std::mutex buffer_mutex_;
    std::condition_variable cv_;
    std::thread flush_thread_;
    std::ofstream file_;
};

// Global logger instance
static std::unique_ptr<InternalLogger> g_logger;
static std::once_flag g_logger_init_flag;

inline void init_logger(const InternalLogger::Config& config = InternalLogger::Config{}) {
    std::call_once(g_logger_init_flag, [&config]() {
        g_logger = std::make_unique<InternalLogger>(config);
    });
}

inline void flush_logs() {
    if (g_logger) {
        g_logger->flush();
    }
}

inline void shutdown_logger() {
    if (g_logger) {
        g_logger->stop();
        g_logger.reset();
    }
}

// New public inline functions for each log level
inline void trace(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::TRACE, message);
}

inline void debug(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::DEBUG, message);
}

inline void info(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::INFO, message);
}

inline void warn(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::WARNING, message);
}

inline void error(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::ERROR, message);
}

inline void fatal(const std::string& message) {
    if (!g_logger) {
        init_logger();
    }
    g_logger->log(LogLevel::FATAL, message);
}

} // namespace LoggerAPI