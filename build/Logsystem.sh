#!/bin/sh

# Aurora Logger System - 协调的日志系统
# 管理daemon启动、内存socket通信和shell级缓冲
# 基础配置
# 检查并设置环境变量
if [ -z "$MODPATH" ]; then
    # 尝试从脚本位置推断MODPATH
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    MODPATH="$(dirname "$SCRIPT_DIR")"
    echo "Warning: MODPATH not set, using inferred path: $MODPATH" >&2
fi

if [ -z "$MODID" ]; then
    MODID="aurora_module"
    echo "Warning: MODID not set, using default: $MODID" >&2
fi

# 确保临时目录存在
mkdir -p "/tmp/$MODID"

# 日志系统配置
LOGGER_INITIALIZED=0
LOG_FILE_NAME="main"
LOGGER_DAEMON_BIN="${MODPATH}/bin/logger_daemon"
LOGGER_CLIENT_BIN="${MODPATH}/bin/logger_client"
LOG_DIR="${MODPATH}/logs"
LOG_LEVEL="info"
DAEMON_PID_FILE="/tmp/$MODID/aurora_daemon.pid"
DAEMON_PID=0

# Shell缓冲配置
SHELL_BUFFER_FILE="/tmp/$MODID/aurora_shell_buffer.tmp"
SHELL_BUFFER_SIZE=50
SHELL_BUFFER_TIMEOUT=5
SHELL_BUFFER_COUNT=0
LAST_FLUSH_TIME=$(date +%s)

# 创建必要的目录
mkdir -p "$LOG_DIR" 2>/dev/null

# 启动daemon进程
start_daemon() {
    # 检查是否已有daemon运行
    if [ -f "$DAEMON_PID_FILE" ]; then
        DAEMON_PID=$(cat "$DAEMON_PID_FILE")
        if kill -0 "$DAEMON_PID" 2>/dev/null; then
            return 0
        fi
        rm -f "$DAEMON_PID_FILE"
    fi
    
    # 检查daemon二进制文件
    if [ ! -f "$LOGGER_DAEMON_BIN" ]; then
        echo "Error: Logger daemon not found at $LOGGER_DAEMON_BIN" >&2
        return 1
    fi
    
    # 检查日志目录权限
    if [ ! -w "$LOG_DIR" ]; then
        echo "Error: Log directory $LOG_DIR is not writable" >&2
        return 1
    fi
    
    # 检查二进制文件权限
    if [ ! -x "$LOGGER_DAEMON_BIN" ]; then
        echo "Error: Logger daemon $LOGGER_DAEMON_BIN is not executable" >&2
        return 1
    fi
    
    # 启动daemon，使用内存中的socket路径，并捕获错误输出
    local daemon_log="/tmp/$MODID/daemon_startup.log"
    "$LOGGER_DAEMON_BIN" -f "$LOG_DIR/$LOG_FILE_NAME.log" > "$daemon_log" 2>&1 &
    DAEMON_PID=$!
    echo $DAEMON_PID > "$DAEMON_PID_FILE"
    
    # 等待daemon初始化
    sleep 2
    
    # 验证daemon是否正在运行
    if ! kill -0 "$DAEMON_PID" 2>/dev/null; then
        echo "Error: Failed to start logger daemon" >&2
        echo "Daemon PID: $DAEMON_PID" >&2
        echo "Log file: $LOG_DIR/$LOG_FILE_NAME.log" >&2
        echo "Binary: $LOGGER_DAEMON_BIN" >&2
        if [ -f "$daemon_log" ]; then
            echo "Daemon startup log:" >&2
            cat "$daemon_log" >&2
        fi
        rm -f "$DAEMON_PID_FILE"
        return 1
    fi
    
    return 0
}

# 日志级别映射函数
map_log_level() {
    case "$1" in
        "trace"|"t") echo "d" ;;  # 使用debug字符代替trace
        "debug"|"d") echo "d" ;;
        "info"|"i") echo "i" ;;
        "warning"|"warn"|"w") echo "w" ;;
        "error"|"e") echo "e" ;;
        "fatal"|"critical"|"c") echo "c" ;;
        *) echo "i" ;;  # 默认为info
    esac
}

# Shell缓冲管理
add_to_shell_buffer() {
    local level="$1"
    local message="$2"
    local level_char
    
    # 转换日志级别为字符
    level_char=$(map_log_level "$level")
    
    # 添加到缓冲区
    echo "$level_char $message" >> "$SHELL_BUFFER_FILE"
    SHELL_BUFFER_COUNT=$((SHELL_BUFFER_COUNT + 1))
    
    # 检查是否需要刷新
    check_shell_buffer_flush
}

check_shell_buffer_flush() {
    local current_time=$(date +%s)
    local time_diff=$((current_time - LAST_FLUSH_TIME))
    
    # 如果缓冲区满了或超时，则刷新
    if [ "$SHELL_BUFFER_COUNT" -ge "$SHELL_BUFFER_SIZE" ] || [ "$time_diff" -ge "$SHELL_BUFFER_TIMEOUT" ]; then
        flush_shell_buffer
    fi
}

flush_shell_buffer() {
    if [ -f "$SHELL_BUFFER_FILE" ] && [ "$SHELL_BUFFER_COUNT" -gt 0 ]; then
        # 使用批量发送
        "$LOGGER_CLIENT_BIN" -p "$DAEMON_PID" -b "$SHELL_BUFFER_FILE" 2>/dev/null
        
        # 清空缓冲区
        echo "" > "$SHELL_BUFFER_FILE"
        SHELL_BUFFER_COUNT=0
        LAST_FLUSH_TIME=$(date +%s)
    fi
}

# 检查logger系统状态
check_logger() {
    [ "$LOGGER_INITIALIZED" = "1" ] && return 0
    
    # 检查客户端二进制文件
    if [ ! -f "$LOGGER_CLIENT_BIN" ]; then
        echo "Error: Logger client not found at $LOGGER_CLIENT_BIN" >&2
        return 1
    fi
    
    # 启动daemon
    if ! start_daemon; then
        return 1
    fi
    
    LOGGER_INITIALIZED=1
    return 0
}

# 初始化logger系统
init_logger() {
    check_logger
}

# 主要的日志记录函数（使用shell缓冲）
log() {
    [ -z "$1" ] || [ -z "$2" ] && return 1
    
    check_logger || return 1
    
    local level_char
    level_char=$(map_log_level "$1")
    
    # 对于critical/fatal级别的日志，立即发送
    case "$1" in
        "fatal"|"critical"|"error")
            # 先刷新缓冲区
            flush_shell_buffer
            # 立即发送critical日志
            "$LOGGER_CLIENT_BIN" -p "$DAEMON_PID" -l "$level_char" "$2" 2>/dev/null
            ;;
        *)
            # 其他级别使用缓冲
            add_to_shell_buffer "$1" "$2"
            ;;
    esac
}

# 立即发送日志（绕过缓冲）
log_immediate() {
    [ -z "$1" ] || [ -z "$2" ] && return 1
    
    check_logger || return 1
    
    local level_char
    level_char=$(map_log_level "$1")
    
    "$LOGGER_CLIENT_BIN" -p "$DAEMON_PID" -l "$level_char" "$2" 2>/dev/null
}

# 便捷的日志级别函数
log_trace() { log "trace" "$1"; }
log_debug() { log "debug" "$1"; }
log_info() { log "info" "$1"; }
log_warn() { log "warning" "$1"; }
log_error() { log "error" "$1"; }
log_fatal() { log "fatal" "$1"; }

# 立即发送的日志级别函数
log_trace_immediate() { log_immediate "trace" "$1"; }
log_debug_immediate() { log_immediate "debug" "$1"; }
log_info_immediate() { log_immediate "info" "$1"; }
log_warn_immediate() { log_immediate "warning" "$1"; }
log_error_immediate() { log_immediate "error" "$1"; }
log_fatal_immediate() { log_immediate "fatal" "$1"; }

# 批量日志记录（直接发送到daemon）
batch_log() {
    [ -z "$1" ] || [ ! -f "$1" ] && return 1
    
    check_logger || return 1
    
    # 先刷新shell缓冲区
    flush_shell_buffer
    
    # 直接使用客户端的批量发送功能
    "$LOGGER_CLIENT_BIN" -p "$DAEMON_PID" -b "$1" 2>/dev/null
}

# 配置函数
set_log_file() {
    if [ -n "$1" ]; then
        LOG_FILE_NAME="$1"
        # 如果daemon已运行，需要重启以应用新的日志文件
        if [ "$LOGGER_INITIALIZED" = "1" ]; then
            stop_logger
            init_logger
        fi
    fi
}

set_log_level() {
    case "$1" in
        trace|debug|info|warning|error|fatal) LOG_LEVEL="$1" ;;
    esac
}

# 设置shell缓冲参数
set_shell_buffer_size() {
    [ -n "$1" ] && [ "$1" -gt 0 ] && SHELL_BUFFER_SIZE="$1"
}

set_shell_buffer_timeout() {
    [ -n "$1" ] && [ "$1" -gt 0 ] && SHELL_BUFFER_TIMEOUT="$1"
}

# 强制刷新所有缓冲区
flush_logs() {
    # 刷新shell缓冲区
    flush_shell_buffer
    
    # 向daemon发送刷新信号
    if [ "$DAEMON_PID" -gt 0 ] && kill -0 "$DAEMON_PID" 2>/dev/null; then
        kill -USR1 "$DAEMON_PID" 2>/dev/null
    fi
}

# 清理日志文件
clean_logs() {
    # 先停止logger
    stop_logger
    
    # 清理日志文件
    [ -d "$LOG_DIR" ] && rm -f "$LOG_DIR"/*.log* 2>/dev/null
    
    # 清理缓冲文件
    rm -f "$SHELL_BUFFER_FILE" 2>/dev/null
}

# 停止日志系统
stop_logger() {
    # 刷新shell缓冲区
    flush_shell_buffer
    
    # 停止daemon
    if [ -f "$DAEMON_PID_FILE" ]; then
        DAEMON_PID=$(cat "$DAEMON_PID_FILE")
        if kill -0 "$DAEMON_PID" 2>/dev/null; then
            kill -TERM "$DAEMON_PID" 2>/dev/null
            sleep 1
            # 如果还在运行，强制杀死
            if kill -0 "$DAEMON_PID" 2>/dev/null; then
                kill -KILL "$DAEMON_PID" 2>/dev/null
            fi
        fi
        rm -f "$DAEMON_PID_FILE"
    fi
    
    # 清理状态
    LOGGER_INITIALIZED=0
    DAEMON_PID=0
    SHELL_BUFFER_COUNT=0
    
    # 清理缓冲文件
    rm -f "$SHELL_BUFFER_FILE" 2>/dev/null
}

# 获取日志系统状态
get_logger_status() {
    echo "=== Aurora Logger System Status ==="
    
    if [ "$LOGGER_INITIALIZED" = "1" ]; then
        echo "Status: Initialized"
        echo "Log file: $LOG_DIR/$LOG_FILE_NAME.log"
        echo "Log level: $LOG_LEVEL"
        
        if [ -f "$DAEMON_PID_FILE" ]; then
            DAEMON_PID=$(cat "$DAEMON_PID_FILE")
            if kill -0 "$DAEMON_PID" 2>/dev/null; then
                echo "Daemon: Running (PID: $DAEMON_PID)"
                echo "Socket: /tmp/aurora_${DAEMON_PID}.sock"
            else
                echo "Daemon: Not running (stale PID file)"
            fi
        else
            echo "Daemon: No PID file found"
        fi
        
        echo "Shell buffer: $SHELL_BUFFER_COUNT/$SHELL_BUFFER_SIZE entries"
        echo "Buffer timeout: ${SHELL_BUFFER_TIMEOUT}s"
    else
        echo "Status: Not initialized"
    fi
}

# 清理函数（在脚本退出时调用）
cleanup_on_exit() {
    flush_shell_buffer
}
init_logger