#!/system/bin/sh
# Aurora Advanced Logging System
# 高效智能日志系统，支持缓冲区、批量写入、日志轮转等功能

# 全局配置
LOG_FILE_NAME="install"
LOG_DIR="${MODPATH}/logs"
LOG_LEVEL=4  # 1=ERROR, 2=WARN, 3=INFO, 4=DEBUG
LOG_MAX_SIZE=1048576  # 1MB
LOG_MAX_FILES=5
LOG_BUFFER_SIZE=50
LOG_AUTO_FLUSH_INTERVAL=30  # 秒
LOG_ENABLE_TIMESTAMP=true
LOG_ENABLE_PID=true
LOG_ENABLE_BUFFER=true

# 内部变量
LOG_BUFFER=""
LOG_BUFFER_COUNT=0
LOG_LAST_FLUSH=0
LOG_INITIALIZED=false
LOG_PID=$$

# 初始化日志系统
init_logger() {
    [ "$LOG_INITIALIZED" = "true" ] && return 0
    
    # 创建日志目录
    mkdir -p "$LOG_DIR" 2>/dev/null || {
        echo "[ERROR] Failed to create log directory: $LOG_DIR" >&2
        return 1
    }
    
    # 设置权限
    chmod 755 "$LOG_DIR" 2>/dev/null
    
    # 检查并轮转日志
    rotate_logs_if_needed
    
    # 记录启动信息
    LOG_INITIALIZED=true
    log_info "Logger system initialized - PID: $LOG_PID, Buffer: $LOG_ENABLE_BUFFER"
    
    return 0
}

# 获取当前时间戳
get_timestamp() {
    if [ "$LOG_ENABLE_TIMESTAMP" = "true" ]; then
        date '+%Y-%m-%d %H:%M:%S'
    fi
}

# 获取PID信息
get_pid_info() {
    if [ "$LOG_ENABLE_PID" = "true" ]; then
        echo "[$LOG_PID]"
    fi
}

# 格式化日志消息
format_log_message() {
    local level="$1"
    local message="$2"
    local timestamp=$(get_timestamp)
    local pid_info=$(get_pid_info)
    
    if [ -n "$timestamp" ] && [ -n "$pid_info" ]; then
        echo "$timestamp $pid_info $level $message"
    elif [ -n "$timestamp" ]; then
        echo "$timestamp $level $message"
    elif [ -n "$pid_info" ]; then
        echo "$pid_info $level $message"
    else
        echo "$level $message"
    fi
}

# 检查是否需要轮转日志
rotate_logs_if_needed() {
    local log_file="$LOG_DIR/$LOG_FILE_NAME.log"
    [ ! -f "$log_file" ] && return 0
    
    local file_size=$(wc -c < "$log_file" 2>/dev/null || echo 0)
    [ "$file_size" -lt "$LOG_MAX_SIZE" ] && return 0
    
    # 执行日志轮转
    local i=$LOG_MAX_FILES
    while [ $i -gt 1 ]; do
        local prev=$((i - 1))
        [ -f "$log_file.$prev" ] && mv "$log_file.$prev" "$log_file.$i"
        i=$prev
    done
    
    [ -f "$log_file" ] && mv "$log_file" "$log_file.1"
    touch "$log_file"
    chmod 644 "$log_file" 2>/dev/null
}

# 写入日志到文件
write_to_file() {
    local content="$1"
    local log_file="$LOG_DIR/$LOG_FILE_NAME.log"
    
    # 检查日志轮转
    rotate_logs_if_needed
    
    # 写入文件
    echo "$content" >> "$log_file" 2>/dev/null || {
        echo "[ERROR] Failed to write to log file: $log_file" >&2
        return 1
    }
}

# 刷新缓冲区
flush_logs() {
    [ "$LOG_ENABLE_BUFFER" != "true" ] && return 0
    [ -z "$LOG_BUFFER" ] && return 0
    
    # 写入缓冲区内容
    write_to_file "$LOG_BUFFER"
    
    # 清空缓冲区
    LOG_BUFFER=""
    LOG_BUFFER_COUNT=0
    LOG_LAST_FLUSH=$(date +%s 2>/dev/null || echo 0)
    
    return 0
}

# 检查是否需要自动刷新
check_auto_flush() {
    [ "$LOG_ENABLE_BUFFER" != "true" ] && return 0
    
    local current_time=$(date +%s 2>/dev/null || echo 0)
    local time_diff=$((current_time - LOG_LAST_FLUSH))
    
    if [ "$time_diff" -ge "$LOG_AUTO_FLUSH_INTERVAL" ] || [ "$LOG_BUFFER_COUNT" -ge "$LOG_BUFFER_SIZE" ]; then
        flush_logs
    fi
}

# 核心日志函数
log() {
    local level="$1"
    local message="$2"
    
    # 参数验证
    [ -z "$level" ] && return 1
    [ -z "$message" ] && return 1
    
    # 级别过滤
    [ "$level" -gt "$LOG_LEVEL" ] && return 0
    
    # 初始化检查
    [ "$LOG_INITIALIZED" != "true" ] && init_logger
    
    # 级别转换
    local level_str
    case "$level" in
        1) level_str="[ERROR]" ;;
        2) level_str="[WARN]" ;;
        3) level_str="[INFO]" ;;
        4) level_str="[DEBUG]" ;;
        *) level_str="[UNKNOWN]" ;;
    esac
    
    # 格式化消息
    local formatted_message=$(format_log_message "$level_str" "$message")
    
    # 缓冲区处理
    if [ "$LOG_ENABLE_BUFFER" = "true" ]; then
        if [ -z "$LOG_BUFFER" ]; then
            LOG_BUFFER="$formatted_message"
        else
            LOG_BUFFER="$LOG_BUFFER\n$formatted_message"
        fi
        LOG_BUFFER_COUNT=$((LOG_BUFFER_COUNT + 1))
        
        # 检查自动刷新
        check_auto_flush
    else
        # 直接写入文件
        write_to_file "$formatted_message"
    fi
    
    # 错误级别同时输出到stderr
    [ "$level" = "1" ] && echo "$formatted_message" >&2
    
    return 0
}

# 便捷日志函数
log_error() { log 1 "$1"; }
log_warn()  { log 2 "$1"; }
log_info()  { log 3 "$1"; }
log_debug() { log 4 "$1"; }

# 批量日志函数
batch_log() {
    local level="$1"
    shift
    
    for message in "$@"; do
        log "$level" "$message"
    done
}

# 设置日志文件名
set_log_file() {
    [ -z "$1" ] && return 1
    
    # 刷新当前缓冲区
    flush_logs
    
    LOG_FILE_NAME="$1"
    log_info "Log file changed to: $LOG_FILE_NAME"
    return 0
}

# 设置日志级别
set_log_level() {
    [ -z "$1" ] && return 1
    
    local old_level=$LOG_LEVEL
    LOG_LEVEL="$1"
    log_info "Log level changed from $old_level to $LOG_LEVEL"
    return 0
}

# 设置缓冲区大小
set_buffer_size() {
    [ -z "$1" ] && return 1
    
    flush_logs
    LOG_BUFFER_SIZE="$1"
    log_info "Buffer size set to: $LOG_BUFFER_SIZE"
    return 0
}

# 启用/禁用缓冲区
set_buffer_enabled() {
    local enabled="$1"
    
    if [ "$enabled" = "true" ] || [ "$enabled" = "false" ]; then
        [ "$LOG_ENABLE_BUFFER" = "true" ] && flush_logs
        LOG_ENABLE_BUFFER="$enabled"
        log_info "Buffer enabled: $LOG_ENABLE_BUFFER"
        return 0
    fi
    return 1
}

# 清理日志文件
clean_logs() {
    local keep_current="$1"
    
    flush_logs
    
    if [ "$keep_current" = "true" ]; then
        # 只清理轮转的日志文件
        rm -f "$LOG_DIR/$LOG_FILE_NAME.log."* 2>/dev/null
        log_info "Rotated log files cleaned"
    else
        # 清理所有日志文件
        rm -f "$LOG_DIR/$LOG_FILE_NAME.log"* 2>/dev/null
        log_info "All log files cleaned"
    fi
    
    return 0
}

# 获取日志统计信息
log_stats() {
    local log_file="$LOG_DIR/$LOG_FILE_NAME.log"
    
    if [ -f "$log_file" ]; then
        local size=$(wc -c < "$log_file" 2>/dev/null || echo 0)
        local lines=$(wc -l < "$log_file" 2>/dev/null || echo 0)
        echo "Log file: $log_file"
        echo "Size: $size bytes"
        echo "Lines: $lines"
        echo "Buffer count: $LOG_BUFFER_COUNT"
        echo "Buffer enabled: $LOG_ENABLE_BUFFER"
    else
        echo "Log file not found: $log_file"
    fi
}

# 停止日志系统
stop_logger() {
    log_info "Stopping logger system..."
    flush_logs
    LOG_INITIALIZED=false
    return 0
}

# 导出主要函数
export -f log log_error log_warn log_info log_debug
export -f batch_log flush_logs clean_logs stop_logger
export -f set_log_file set_log_level set_buffer_size set_buffer_enabled
export -f log_stats init_logger

# 自动初始化
init_logger
