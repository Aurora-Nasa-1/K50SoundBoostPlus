#!/bin/sh

LOGGER_DAEMON_PATH="/system/bin/logger_daemon"
LOGGER_CLIENT_PATH="/system/bin/logger_client"
LOG_DIR="/data/local/tmp"

BUFFER_SIZE=65536
MAX_FILE_SIZE=5242880
MAX_FILES=3

DAEMON_INSTANCE_ID=0
MAX_DAEMON_INSTANCES=3

SHELL_BUFFER_ENABLED=1
SHELL_BUFFER_SIZE=20
SHELL_BUFFER_TIMEOUT=10
SHELL_BUFFER_COUNT=0
SHELL_BUFFER_LAST_FLUSH=0
SHELL_BUFFER_FILE="/tmp/logger_buffer_${DAEMON_INSTANCE_ID}.tmp"

get_daemon_pid() {
    instance_id="${1:-$DAEMON_INSTANCE_ID}"
    pid_file="/tmp/logger_daemon_${instance_id}.pid"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        else
            rm -f "$pid_file"
        fi
    fi
    return 1
}

init_logger() {
    log_file="${1:-app}"
    instance_id="${2:-$DAEMON_INSTANCE_ID}"
    
    if [ "$instance_id" -ge "$MAX_DAEMON_INSTANCES" ]; then
        return 1
    fi
    
    log_path="$LOG_DIR/${log_file}_${instance_id}.log"
    
    "$LOGGER_DAEMON_PATH" -f "$log_path" &
    daemon_pid=$!
    
    echo "$daemon_pid" > "/tmp/logger_daemon_${instance_id}.pid"
    sleep 1
    
    if kill -0 "$daemon_pid" 2>/dev/null; then
        DAEMON_INSTANCE_ID="$instance_id"
        return 0
    else
        return 1
    fi
}

add_to_buffer() {
    level="$1"
    message="$2"
    
    echo "$level $message" >> "$SHELL_BUFFER_FILE"
    SHELL_BUFFER_COUNT=$((SHELL_BUFFER_COUNT + 1))
}

check_buffer_flush() {
    current_time=$(date +%s)
    time_diff=$((current_time - SHELL_BUFFER_LAST_FLUSH))
    
    if [ "$SHELL_BUFFER_COUNT" -ge "$SHELL_BUFFER_SIZE" ] || [ "$time_diff" -ge "$SHELL_BUFFER_TIMEOUT" ]; then
        flush_buffer
    fi
}

flush_buffer() {
    if [ "$SHELL_BUFFER_COUNT" -eq 0 ] || [ ! -f "$SHELL_BUFFER_FILE" ]; then
        return 0
    fi
    
    daemon_pid=$(get_daemon_pid "$DAEMON_INSTANCE_ID")
    if [ -n "$daemon_pid" ]; then
        "$LOGGER_CLIENT_PATH" -p "$daemon_pid" -b "$SHELL_BUFFER_FILE"
        rm -f "$SHELL_BUFFER_FILE"
        SHELL_BUFFER_COUNT=0
        SHELL_BUFFER_LAST_FLUSH=$(date +%s)
    fi
}

log() {
    level="$1"
    message="$2"
    
    if [ -z "$level" ] || [ -z "$message" ]; then
        return 1
    fi
    
    daemon_pid=$(get_daemon_pid "$DAEMON_INSTANCE_ID")
    if [ -z "$daemon_pid" ]; then
        return 1
    fi
    
    if [ "$level" = "critical" ] || [ "$level" = "error" ]; then
        "$LOGGER_CLIENT_PATH" -p "$daemon_pid" -l "$level" "$message"
        return $?
    fi
    
    if [ "$SHELL_BUFFER_ENABLED" = "1" ]; then
        add_to_buffer "$level" "$message"
        check_buffer_flush
    else
        "$LOGGER_CLIENT_PATH" -p "$daemon_pid" -l "$level" "$message"
    fi
}

log_debug() { log "debug" "$1"; }
log_info() { log "info" "$1"; }
log_warning() { log "warning" "$1"; }
log_error() { log "error" "$1"; }
log_critical() { log "critical" "$1"; }

flush_logs() {
    flush_buffer
}

stop_logger() {
    daemon_pid=$(get_daemon_pid "$DAEMON_INSTANCE_ID")
    
    if [ -n "$daemon_pid" ]; then
        flush_buffer
        kill "$daemon_pid"
        rm -f "/tmp/logger_daemon_${DAEMON_INSTANCE_ID}.pid"
    fi
}

benchmark_logger() {
    count="${1:-50}"
    
    start=$(date +%s)
    i=1
    while [ $i -le $count ]; do
        log_info "Test $i"
        i=$((i + 1))
    done
    end=$(date +%s)
    
    echo "$count messages in $((end - start))s"
    flush_logs
}

status() {
    daemon_pid=$(get_daemon_pid "$DAEMON_INSTANCE_ID")
    
    if [ -n "$daemon_pid" ]; then
        echo "Logger running (PID: $daemon_pid)"
        return 0
    else
        echo "Logger not running"
        return 1
    fi
}

cleanup() {
    flush_buffer
    rm -f "$SHELL_BUFFER_FILE"
}

trap cleanup EXIT

if [ "$0" != "sh" ] && [ "$0" != "-sh" ]; then
    echo "Ultra-lightweight logging system loaded"
fi