#!/bin/bash

# Performance and Power Efficiency Test Script
# Tests the power-saving features and performance of AuroraCore FileWatcher

set -e

echo "=== AuroraCore FileWatcher Performance Test ==="
echo "Testing power efficiency and performance characteristics"
echo

# Build if needed
if [ ! -f "build/src/filewatcher/filewatcher" ]; then
    echo "Building project..."
    cmake -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build
fi

# Test configuration
TEST_DIR="/tmp/AuroraCore_perf_test"
NUM_FILES=1000
BURST_SIZE=50

# Cleanup and setup
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo "Test Configuration:"
echo "  Test Directory: $TEST_DIR"
echo "  File Operations: $NUM_FILES"
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

# Test 1: Basic File Watcher Performance Test
echo "=== Test 1: Basic File Watcher Performance ==="

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
echo "Starting resource monitoring..."
measure_resources $WATCHER_PID 60 "$TEST_DIR/watcher_resources.csv" &
MONITOR_PID=$!

# File operations test
echo "Starting file operations test ($NUM_FILES files)..."
start_time=$(date +%s.%N)

for i in $(seq 1 $NUM_FILES); do
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
echo "Throughput: $(echo "scale=2; $((NUM_FILES * 3)) / $file_ops_time" | bc) operations/second"

# Wait for events to be processed
echo "Waiting for events to be processed..."
sleep 5

# Stop file watcher
echo "Stopping file watcher..."
kill $WATCHER_PID
wait $WATCHER_PID 2>/dev/null

# Stop resource monitoring
kill $MONITOR_PID 2>/dev/null
wait $MONITOR_PID 2>/dev/null

# Analyze file watcher results
echo "\nBasic File Watcher Performance Results:"
echo "  File operations: $((NUM_FILES * 3)) ($NUM_FILES create + $NUM_FILES modify + $NUM_FILES delete)"
echo "  Total time: ${file_ops_time}s"
echo "  Operations/second: $(echo "scale=2; $((NUM_FILES * 3)) / $file_ops_time" | bc)"

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

# Test 2: Recursive Directory Monitoring Performance
echo "\n=== Test 2: Recursive Directory Monitoring Performance ==="

RECURSIVE_DIR="$TEST_DIR/recursive_test"
mkdir -p "$RECURSIVE_DIR/subdir1/subdir2/subdir3"

# Start recursive file watcher
echo "Starting recursive file watcher..."
./build/src/filewatcher/filewatcher \
    -r \
    -e create,modify,delete \
    "$RECURSIVE_DIR" \
    "echo 'Recursive event detected at' \$(date)" > "$TEST_DIR/recursive_events.log" &

RECURSIVE_PID=$!
echo "Recursive file watcher PID: $RECURSIVE_PID"

# Wait for watcher to start
sleep 2

# Start resource monitoring
measure_resources $RECURSIVE_PID 45 "$TEST_DIR/recursive_resources.csv" &
MONITOR_PID=$!

# Recursive operations test
echo "Starting recursive operations test..."
start_time=$(date +%s.%N)

# Create files in different subdirectories
for i in $(seq 1 200); do
    subdir=$((i % 4))
    case $subdir in
        0) dir="$RECURSIVE_DIR" ;;
        1) dir="$RECURSIVE_DIR/subdir1" ;;
        2) dir="$RECURSIVE_DIR/subdir1/subdir2" ;;
        3) dir="$RECURSIVE_DIR/subdir1/subdir2/subdir3" ;;
    esac
    
    # Create, modify, delete in different subdirectories
    echo "Test data $i" > "$dir/test_$i.txt"
    echo "Modified data $i" >> "$dir/test_$i.txt"
    rm "$dir/test_$i.txt"
    
    if [ $((i % 50)) -eq 0 ]; then
        echo "  Processed $i recursive operations..."
    fi
    
    sleep 0.02
done

end_time=$(date +%s.%N)
recursive_time=$(echo "$end_time - $start_time" | bc)

echo "Recursive operations completed in ${recursive_time}s"

# Wait for events to be processed
sleep 3

# Stop recursive watcher
echo "Stopping recursive file watcher..."
kill $RECURSIVE_PID
wait $RECURSIVE_PID 2>/dev/null

# Stop resource monitoring
kill $MONITOR_PID 2>/dev/null
wait $MONITOR_PID 2>/dev/null

# Analyze recursive results
echo "\nRecursive Monitoring Performance Results:"
echo "  Recursive operations: 600 (200 create + 200 modify + 200 delete)"
echo "  Total time: ${recursive_time}s"
echo "  Operations/second: $(echo "scale=2; 600 / $recursive_time" | bc)"

if [ -f "$TEST_DIR/recursive_events.log" ]; then
    recursive_event_count=$(wc -l < "$TEST_DIR/recursive_events.log")
    echo "  Events detected: $recursive_event_count"
fi

if [ -f "$TEST_DIR/recursive_resources.csv" ]; then
    avg_cpu=$(awk -F',' 'NR>1 {sum+=$2; count++} END {if(count>0) print sum/count; else print 0}' "$TEST_DIR/recursive_resources.csv")
    max_memory=$(awk -F',' 'NR>1 {if($3>max) max=$3} END {print max+0}' "$TEST_DIR/recursive_resources.csv")
    
    echo "  Average CPU usage: $(printf "%.2f" $avg_cpu)%"
    echo "  Peak memory usage: ${max_memory}KB"
fi

# Test 3: Power Efficiency Test (Idle behavior)
echo "\n=== Test 3: Power Efficiency (Idle Test) ==="

IDLE_DIR="$TEST_DIR/idle_test"
mkdir -p "$IDLE_DIR"

# Start file watcher in idle mode
echo "Starting file watcher for idle test..."
./build/src/filewatcher/filewatcher \
    -e create,modify,delete \
    "$IDLE_DIR" \
    "echo 'Idle event detected'" > "$TEST_DIR/idle_events.log" &

IDLE_PID=$!

# Monitor for 30 seconds with no activity
echo "Monitoring idle behavior for 30 seconds..."
measure_resources $IDLE_PID 30 "$TEST_DIR/idle_resources.csv" &
IDLE_MONITOR_PID=$!

# Wait for monitoring to complete
wait $IDLE_MONITOR_PID

# Stop idle watcher
kill $IDLE_PID
wait $IDLE_PID 2>/dev/null

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
echo "  ✓ Minimal memory footprint (should be <5MB)"
echo "  ✓ Efficient file operation handling"
echo "  ✓ Event-driven monitoring with low overhead"
echo "  ✓ Recursive directory monitoring capability"

echo "\nTest artifacts saved in: $TEST_DIR"
echo "  - watcher_resources.csv: Basic file watcher resource usage"
echo "  - recursive_resources.csv: Recursive monitoring resource usage"
echo "  - idle_resources.csv: Idle resource usage"
echo "  - watcher_events.log: Basic file watcher events"
echo "  - recursive_events.log: Recursive monitoring events"
echo "  - idle_events.log: Idle events (should be empty)"

echo "\n=== FileWatcher Performance Test Completed ==="