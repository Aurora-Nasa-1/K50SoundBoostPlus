    LOG_FILE_NAME="install"
    LOG_DIR="${MODPATH}/logs"
    mkdir -p "$LOG_DIR" 2>/dev/null
    LOG_LEVEL=333444
log() {
    local level="$1"
    local message="$2"
    [ -z "$level" ] && return 1
    [ -z "$message" ] && return 1
    [ "$level" -gt "$LOG_LEVEL" ] && return 0
    if [ "$level" = "1" ]; then level="[INFO]"
    elif [ "$level" = "2" ]; then level="[WARN]"
    elif [ "$level" = "3" ]; then level="[INFO]"
    elif [ "$level" = "4" ]; then level="[DEBUG]"
    fi
    echo "$level $message" >> "$LOG_DIR/$LOG_FILE_NAME.log"
}

log_error() { log 1 "$1"; }
log_warn()  { log 2 "$1"; }
log_info()  { log 3 "$1"; }
log_debug() { log 4 "$1"; }

# Set log file name
set_log_file() {
    [ -z "$1" ] && return 1
    LOG_FILE_NAME="$1"
    return 0
}

# Set log level
set_log_level() {
    [ -z "$1" ] && return 1
    LOG_LEVEL="$1"
    return 0
}

batch_log() {
    log_warn "Batch log is not supported in this version."
    return 0
}
# Flush logs
flush_logs() {
    log_warn "Flush log is not supported in this version."
    return 0
}

# Clean logs
clean_logs() {
    log_warn "Clean log is not supported in this version."
    return 0
}

# Stop logger system
stop_logger() {
    log_warn "Stop log is not supported in this version."
    return 0
}
