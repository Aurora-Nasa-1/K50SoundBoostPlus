#!/bin/bash

# AuroraCore Usage Examples
# This script demonstrates how to use the logger and filewatcher tools

echo "=== AuroraCore Usage Examples ==="

# Build the project first
echo "Building project..."
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

echo "\n1. Logger System Example"
echo "========================"

# Start logger daemon in background
echo "Starting logger daemon..."
./build/src/logger/logger_daemon \
    -f /tmp/example.log \
    -s 1048576 \
    -n 3 \
    -p /tmp/example_logger &

LOGGER_PID=$!
echo "Logger daemon started with PID: $LOGGER_PID"

# Wait for daemon to initialize
sleep 1

# Send some test logs
echo "Sending test logs..."
./build/src/logger/logger_client -p /tmp/example_logger "Application started"
./build/src/logger/logger_client -p /tmp/example_logger "Processing user request"
./build/src/logger/logger_client -p /tmp/example_logger "Database connection established"
./build/src/logger/logger_client -p /tmp/example_logger "Task completed successfully"

# Wait for logs to be written
sleep 2

echo "\nLog file contents:"
cat /tmp/example.log

# Stop logger daemon
echo "\nStopping logger daemon..."
kill $LOGGER_PID
wait $LOGGER_PID 2>/dev/null

echo "\n2. File Watcher Example"
echo "======================="

# Create test directory
mkdir -p /tmp/watch_test

# Start file watcher in background
echo "Starting file watcher for /tmp/watch_test..."
./build/src/filewatcher/filewatcher \
    -e create,modify,delete \
    /tmp/watch_test \
    "echo '[FileWatcher] Event detected: $FILE'" &

WATCHER_PID=$!
echo "File watcher started with PID: $WATCHER_PID"

# Wait for watcher to initialize
sleep 1

# Perform file operations to trigger events
echo "\nPerforming file operations..."
echo "Creating file..."
echo "Hello World" > /tmp/watch_test/test.txt
sleep 1

echo "Modifying file..."
echo "Modified content" >> /tmp/watch_test/test.txt
sleep 1

echo "Creating another file..."
touch /tmp/watch_test/another.txt
sleep 1

echo "Deleting files..."
rm /tmp/watch_test/test.txt
rm /tmp/watch_test/another.txt
sleep 1

# Stop file watcher
echo "\nStopping file watcher..."
kill $WATCHER_PID
wait $WATCHER_PID 2>/dev/null

echo "\n3. Combined Example: Log File Monitoring"
echo "========================================"

# Start logger daemon
echo "Starting logger daemon..."
./build/src/logger/logger_daemon \
    -f /tmp/monitored.log \
    -p /tmp/monitor_logger &

LOGGER_PID=$!

# Start file watcher to monitor the log file
echo "Starting file watcher to monitor log file..."
./build/src/filewatcher/filewatcher \
    -e modify \
    /tmp/monitored.log \
    "echo '[Monitor] Log file updated: $FILE'" &

WATCHER_PID=$!

# Wait for services to initialize
sleep 1

# Send logs and watch for file changes
echo "\nSending logs and monitoring changes..."
for i in {1..5}; do
    ./build/src/logger/logger_client -p /tmp/monitor_logger "Log entry #$i"
    sleep 1
done

# Cleanup
echo "\nCleaning up..."
kill $LOGGER_PID $WATCHER_PID
wait $LOGGER_PID $WATCHER_PID 2>/dev/null

echo "\nFinal log file contents:"
cat /tmp/monitored.log

# Cleanup test files
rm -f /tmp/example.log* /tmp/monitored.log* /tmp/example_logger /tmp/monitor_logger
rmdir /tmp/watch_test 2>/dev/null

echo "\n=== Examples completed ==="
echo "Check the README.md for more detailed usage information."