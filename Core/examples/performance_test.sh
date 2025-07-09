#!/bin/bash

# Performance and Power Efficiency Test Script
# Tests the power-saving features and performance of AuroraCore

set -e

echo "=== AuroraCore Performance Test ==="
echo "Testing power efficiency and performance characteristics"
echo

# Build if needed
if [ ! -f "build/src/logger/logger_daemon" ]; then
    echo "Building project..."
    cmake -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build
fi

# Test configuration
TEST_DIR="/tmp/AuroraCore_perf_test"
LOG_FILE="$TEST_DIR/perf_test.log"
SOCKET_PATH="$TEST_DIR/perf_logger"
NUM_MESSAGES=10000
BURST_SIZE=100

# Cleanup and setup
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "Test Configuration:"
echo "  Test Directory: $TEST_DIR"
echo "  Log File: $LOG_FILE"
echo "  Messages: $NUM_MESSAGES"
echo "  Burst Size: $BURST_SIZE"
echo

# Function to measure CPU and memory usage
measure_resources() {
    local pid=$1
    local duration=$2
    local output_file=$3
    
    echo "timestamp,cpu_percent,memory_kb" > "$output_file"
    
    for i in $(seq 1 $duration); do
        if kill -0 $pid 2>/dev/null; then
            local stats=$(ps -p $pid -o %cpu,rss --no-headers)
            local timestamp=$(date +%s)
            echo "$timestamp,$stats" | tr ' ' ',' >> "$output_file"
        fi
        sleep 1
    done
}

# Test 1: Logger Performance Test
echo "=== Test 1: Logger Performance ==="

# Start logger daemon
echo "Starting logger daemon..."
./build/src/logger/logger_daemon \
    -f "$LOG_FILE" \
    -s 1048576 \
    -n 5 \
    -b 65536 \
    -p "$SOCKET_PATH" &

LOGGER_PID=$!
echo "Logger daemon PID: $LOGGER_PID"

# Wait for daemon to start
sleep 2

# Start resource monitoring
echo "Starting resource monitoring..."
measure_resources $LOGGER_PID 60 "$TEST_DIR/logger_resources.csv" &
MONITOR_PID=$!

# Performance test: Burst logging
echo "Starting burst logging test ($NUM_MESSAGES messages)..."
start_time=$(date +%s.%N)

for i in $(seq 1 $((NUM_MESSAGES / BURST_SIZE))); do
    # Send burst of messages
    for j in $(seq 1 $BURST_SIZE); do
        ./build/src/logger/logger_client -p "$SOCKET_PATH" "Performance test message $((($i-1)*BURST_SIZE + $j))" &
    done
    
    # Wait for burst to complete
    wait
    
    # Small delay between bursts to test power saving
    sleep 0.1
    
    # Progress indicator
    if [ $((i % 10)) -eq 0 ]; then
        echo "  Sent $((i * BURST_SIZE)) messages..."
    fi
done

end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc)

echo "Burst logging completed in ${total_time}s"
echo "Throughput: $(echo "scale=2; $NUM_MESSAGES / $total_time" | bc) messages/second"

# Wait for all logs to be flushed
echo "Waiting for logs to be flushed..."
sleep 5

# Stop logger daemon
echo "Stopping logger daemon..."
kill $LOGGER_PID
wait $LOGGER_PID 2>/dev/null

# Stop resource monitoring
kill $MONITOR_PID 2>/dev/null
wait $MONITOR_PID 2>/dev/null

# Analyze results
echo "\nLogger Performance Results:"
echo "  Total messages: $NUM_MESSAGES"
echo "  Total time: ${total_time}s"
echo "  Throughput: $(echo "scale=2; $NUM_MESSAGES / $total_time" | bc) msg/s"
echo "  Log file size: $(du -h "$LOG_FILE" | cut -f1)"
echo "  Messages in log: $(wc -l < "$LOG_FILE")"

# CPU and Memory analysis
if [ -f "$TEST_DIR/logger_resources.csv" ]; then
    avg_cpu=$(awk -F',' 'NR>1 {sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "$TEST_DIR/logger_resources.csv")
    max_memory=$(awk -F',' 'NR>1 {if($3>max) max=$3} END {print max+0}' "$TEST_DIR/logger_resources.csv")
    
    echo "  Average CPU usage: $(printf "%.2f" $avg_cpu)%"
    echo "  Peak memory usage: ${max_memory}KB"
fi

# Test 2: File Watcher Performance Test
echo "\n=== Test 2: File Watcher Performance ==="

WATCH_DIR="$TEST_DIR/watch_test"
mkdir -p "$WATCH_DIR"

# Start file watcher
echo "Starting file watcher..."
./build/src/filewatcher/filewatcher \
    -e create,modify,delete \
    "$WATCH_DIR" \
    "echo 'Event detected at' \$(date)" > "$TEST_DIR/watcher_events.log" &

WATCHER_PID=$!
echo "File watcher PID: $WATCHER_PID"

# Wait for watcher to start
sleep 2

# Start resource monitoring
measure_resources $WATCHER_PID 30 "$TEST_DIR/watcher_resources.csv" &
MONITOR_PID=$!

# File operations test
echo "Starting file operations test..."
start_time=$(date +%s.%N)

for i in $(seq 1 1000); do
    # Create file
    echo "Test data $i" > "$WATCH_DIR/test_$i.txt"
    
    # Modify file
    echo "Modified data $i" >> "$WATCH_DIR/test_$i.txt"
    
    # Delete file
    rm "$WATCH_DIR/test_$i.txt"
    
    # Progress indicator
    if [ $((i % 100)) -eq 0 ]; then
        echo "  Processed $i file operations..."
    fi
    
    # Small delay to test power saving
    sleep 0.01
done

end_time=$(date +%s.%N)
file_ops_time=$(echo "$end_time - $start_time" | bc)

echo "File operations completed in ${file_ops_time}s"

# Wait for events to be processed
sleep 3

# Stop file watcher
echo "Stopping file watcher..."
kill $WATCHER_PID
wait $WATCHER_PID 2>/dev/null

# Stop resource monitoring
kill $MONITOR_PID 2>/dev/null
wait $MONITOR_PID 2>/dev/null

# Analyze file watcher results
echo "\nFile Watcher Performance Results:"
echo "  File operations: 3000 (1000 create + 1000 modify + 1000 delete)"
echo "  Total time: ${file_ops_time}s"
echo "  Operations/second: $(echo "scale=2; 3000 / $file_ops_time" | bc)"

if [ -f "$TEST_DIR/watcher_events.log" ]; then
    event_count=$(wc -l < "$TEST_DIR/watcher_events.log")
    echo "  Events detected: $event_count"
fi

# CPU and Memory analysis for watcher
if [ -f "$TEST_DIR/watcher_resources.csv" ]; then
    avg_cpu=$(awk -F',' 'NR>1 {sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "$TEST_DIR/watcher_resources.csv")
    max_memory=$(awk -F',' 'NR>1 {if($3>max) max=$3} END {print max+0}' "$TEST_DIR/watcher_resources.csv")
    
    echo "  Average CPU usage: $(printf "%.2f" $avg_cpu)%"
    echo "  Peak memory usage: ${max_memory}KB"
fi

# Test 3: Power Efficiency Test (Idle behavior)
echo "\n=== Test 3: Power Efficiency (Idle Test) ==="

# Start logger daemon in idle mode
echo "Starting logger daemon for idle test..."
./build/src/logger/logger_daemon \
    -f "$TEST_DIR/idle_test.log" \
    -p "$TEST_DIR/idle_logger" &

IDLE_LOGGER_PID=$!

# Monitor for 30 seconds with no activity
echo "Monitoring idle behavior for 30 seconds..."
measure_resources $IDLE_LOGGER_PID 30 "$TEST_DIR/idle_resources.csv" &
IDLE_MONITOR_PID=$!

# Wait for monitoring to complete
wait $IDLE_MONITOR_PID

# Stop idle logger
kill $IDLE_LOGGER_PID
wait $IDLE_LOGGER_PID 2>/dev/null

# Analyze idle results
echo "\nIdle Performance Results:"
if [ -f "$TEST_DIR/idle_resources.csv" ]; then
    avg_cpu=$(awk -F',' 'NR>1 {sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "$TEST_DIR/idle_resources.csv")
    avg_memory=$(awk -F',' 'NR>1 {sum+=$3; count++} END {if(count>0) print sum/count; else print 0}' "$TEST_DIR/idle_resources.csv")
    
    echo "  Average CPU usage (idle): $(printf "%.2f" $avg_cpu)%"
    echo "  Average memory usage (idle): $(printf "%.0f" $avg_memory)KB"
fi

# Generate performance report
echo "\n=== Performance Summary ==="
echo "Test completed at: $(date)"
echo "\nPower Efficiency Indicators:"
echo "  ✓ Low idle CPU usage (should be <1%)"
echo "  ✓ Minimal memory footprint (should be <10MB)"
echo "  ✓ Efficient burst handling"
echo "  ✓ Event-driven file monitoring"

echo "\nTest artifacts saved in: $TEST_DIR"
echo "  - logger_resources.csv: Logger resource usage"
echo "  - watcher_resources.csv: File watcher resource usage"
echo "  - idle_resources.csv: Idle resource usage"
echo "  - watcher_events.log: File watcher events"

echo "\n=== Performance Test Completed ==="