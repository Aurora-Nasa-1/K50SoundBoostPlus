#!/system/bin/sh
# 高性能日志系统 - 与C++日志组件集成
# 版本: 3.0.0 - 重构版本

# ============================
# Global Variables
# ============================
LOGGER_INITIALIZED=0
LOG_FILE_NAME="main"
LOGGER_DAEMON_PID=""
LOGGER_DAEMON_BIN="${MODPATH}/bin/logger_daemon"
LOGGER_CLIENT_BIN="${MODPATH}/bin/logger_client"
SOCKET_PATH="${MODPATH}/tmp/logger_daemon"
LOG_DIR="${MODPATH}/logs"
LOG_LEVEL="info"  # debug, info, warning, error, critical
LOW_POWER_MODE=0  # Default: Low power mode off
FLUSH_INTERVAL=5000  # 5 seconds in milliseconds
BUFFER_SIZE=65536    # 64KB buffer size
MAX_FILE_SIZE=10485760  # 10MB max file size
MAX_FILES=5          # Maximum number of log files

# ============================
# Core Functions
# ============================

# Initialize logger system
init_logger() {
    [ "$LOGGER_INITIALIZED" = "1" ] && return 0
    
    # Create necessary directories
    mkdir -p "$LOG_DIR" 2>/dev/null
    mkdir -p "$(dirname "$SOCKET_PATH")" 2>/dev/null
    
    # Check if daemon binary exists
    if [ ! -f "$LOGGER_DAEMON_BIN" ]; then
        ui_print "Logger daemon not found: $LOGGER_DAEMON_BIN" >&2
        return 1
    fi
    
    # Check if daemon is already running
    LOGGER_DAEMON_PID=$(pgrep -f "$LOGGER_DAEMON_BIN" 2>/dev/null)
    if [ -z "$LOGGER_DAEMON_PID" ]; then
        # Start logger daemon with configuration
        local log_file="$LOG_DIR/$LOG_FILE_NAME.log"
        
        if [ "$LOW_POWER_MODE" = "1" ]; then
            # Low power mode with longer flush interval
            "$LOGGER_DAEMON_BIN" -f "$log_file" -p "$SOCKET_PATH" \
                -s "$MAX_FILE_SIZE" -n "$MAX_FILES" -b "$BUFFER_SIZE" \
                -t $((FLUSH_INTERVAL * 2)) >/dev/null 2>&1 &
        else
            # Normal mode
            "$LOGGER_DAEMON_BIN" -f "$log_file" -p "$SOCKET_PATH" \
                -s "$MAX_FILE_SIZE" -n "$MAX_FILES" -b "$BUFFER_SIZE" \
                -t "$FLUSH_INTERVAL" >/dev/null 2>&1 &
        fi
        
        LOGGER_DAEMON_PID=$!
        sleep 0.2  # Wait for daemon to initialize
        
        # Verify daemon started successfully
        if ! kill -0 "$LOGGER_DAEMON_PID" 2>/dev/null; then
            ui_print "Failed to start logger daemon" >&2
            return 1
        fi
    fi
    
    LOGGER_INITIALIZED=1
    return 0
}

# Log a message with specified level
log() {
    local level="$1"
    local message="$2"
    [ -z "$level" ] && return 1
    [ -z "$message" ] && return 1
    
    # Initialize logger if not already done
    [ "$LOGGER_INITIALIZED" != "1" ] && init_logger
    
    # Check if client binary exists
    if [ ! -f "$LOGGER_CLIENT_BIN" ]; then
        echo "Logger client not found: $LOGGER_CLIENT_BIN" >&2
        return 1
    fi
    
    # Send log message using client
    "$LOGGER_CLIENT_BIN" -p "$SOCKET_PATH" -l "$level" -m "$message" 2>/dev/null
    return $?
}

# Convenience functions for different log levels
log_debug() { log "debug" "$1"; }
log_info() { log "info" "$1"; }
log_warn() { log "warning" "$1"; }
log_warning() { log "warning" "$1"; }
log_error() { log "error" "$1"; }
log_critical() { log "critical" "$1"; }

# Batch log from file
batch_log() {
    local batch_file="$1"
    local level="${2:-info}"  # Default to info level
    [ -z "$batch_file" ] && return 1
    [ ! -f "$batch_file" ] && return 1
    
    # Initialize logger if not already done
    [ "$LOGGER_INITIALIZED" != "1" ] && init_logger
    
    # Read file line by line and send each line as a log message
    while IFS= read -r line || [ -n "$line" ]; do
        [ -n "$line" ] && log "$level" "$line"
    done < "$batch_file"
    
    return 0
}

# Set log file name
set_log_file() {
    [ -z "$1" ] && return 1
    LOG_FILE_NAME="$1"
    
    # If logger is already initialized, restart with new file name
    if [ "$LOGGER_INITIALIZED" = "1" ]; then
        stop_logger
        init_logger
    fi
    return 0
}

# Set log level (for filtering, though daemon handles all levels)
set_log_level() {
    [ -z "$1" ] && return 1
    case "$1" in
        debug|info|warning|error|critical)
            LOG_LEVEL="$1"
            ;;
        *)
            echo "Invalid log level: $1. Use: debug, info, warning, error, critical" >&2
            return 1
            ;;
    esac
    return 0
}

# Enable/disable low power mode
set_low_power_mode() {
    case "$1" in
        1|true|on) LOW_POWER_MODE=1 ;;
        *) LOW_POWER_MODE=0 ;;
    esac
    
    # If logger is already initialized, restart with new power mode
    if [ "$LOGGER_INITIALIZED" = "1" ]; then
        stop_logger
        init_logger
    fi
    return 0
}

# Flush logs (force daemon to flush buffers)
flush_logs() {
    if [ "$LOGGER_INITIALIZED" = "1" ] && [ -n "$LOGGER_DAEMON_PID" ]; then
        # Send SIGUSR1 to force flush without shutdown
        kill -USR1 "$LOGGER_DAEMON_PID" 2>/dev/null
        return $?
    fi
    return 1
}

# Clean logs (remove log files)
clean_logs() {
    if [ -d "$LOG_DIR" ]; then
        # Stop logger first to avoid conflicts
        local was_running=0
        [ "$LOGGER_INITIALIZED" = "1" ] && was_running=1 && stop_logger
        
        # Remove log files
        rm -f "$LOG_DIR"/*.log* 2>/dev/null
        
        # Restart logger if it was running
        [ "$was_running" = "1" ] && init_logger
        return 0
    fi
    return 1
}

# Stop logger system
stop_logger() {
    if [ "$LOGGER_INITIALIZED" = "1" ] && [ -n "$LOGGER_DAEMON_PID" ]; then
        # Send SIGTERM for graceful shutdown
        kill -TERM "$LOGGER_DAEMON_PID" 2>/dev/null
        
        # Wait for daemon to shutdown gracefully
        local count=0
        while [ $count -lt 10 ] && kill -0 "$LOGGER_DAEMON_PID" 2>/dev/null; do
            sleep 0.1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if kill -0 "$LOGGER_DAEMON_PID" 2>/dev/null; then
            kill -KILL "$LOGGER_DAEMON_PID" 2>/dev/null
        fi
        
        # Clean up socket file
        rm -f "$SOCKET_PATH" 2>/dev/null
        
        LOGGER_DAEMON_PID=""
        LOGGER_INITIALIZED=0
    fi
    return 0
}
# Additional utility functions

# Get logger status
get_logger_status() {
    if [ "$LOGGER_INITIALIZED" = "1" ] && [ -n "$LOGGER_DAEMON_PID" ]; then
        if kill -0 "$LOGGER_DAEMON_PID" 2>/dev/null; then
            echo "Logger daemon running (PID: $LOGGER_DAEMON_PID)"
            echo "Socket: $SOCKET_PATH"
            echo "Log directory: $LOG_DIR"
            echo "Log file: $LOG_FILE_NAME.log"
            echo "Log level: $LOG_LEVEL"
            echo "Low power mode: $LOW_POWER_MODE"
            return 0
        else
            echo "Logger daemon not responding (stale PID: $LOGGER_DAEMON_PID)"
            LOGGER_DAEMON_PID=""
            LOGGER_INITIALIZED=0
            return 1
        fi
    else
        echo "Logger daemon not running"
        return 1
    fi
}

# Test logger functionality
test_logger() {
    echo "Testing logger functionality..."
    
    # Test all log levels
    log_debug "Debug message test"
    log_info "Info message test"
    log_warning "Warning message test"
    log_error "Error message test"
    log_critical "Critical message test"
    
    echo "Test messages sent. Check log file: $LOG_DIR/$LOG_FILE_NAME.log"
    return 0
}

# Set configuration and initialize
set_log_file "main"
init_logger
