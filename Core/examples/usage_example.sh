#!/bin/bash

# AuroraCore Usage Examples
# This script demonstrates how to use the filewatcher tool

echo "=== AuroraCore FileWatcher Usage Examples ==="

# Build the project first
echo "Building project..."
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

echo "\n1. Basic File Watcher Example"
echo "============================="

# Create test directory
mkdir -p /tmp/watch_test

# Start file watcher in background
echo "Starting file watcher for /tmp/watch_test..."
./build/src/filewatcher/filewatcher \
    -e create,modify,delete \
    /tmp/watch_test \
    "echo '[FileWatcher] Event detected: \$FILE'" &

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

echo "\n2. Recursive Directory Monitoring"
echo "=================================="

# Create nested directory structure
mkdir -p /tmp/watch_recursive/subdir1/subdir2

# Start recursive file watcher
echo "Starting recursive file watcher..."
./build/src/filewatcher/filewatcher \
    -r \
    -e create,modify,delete \
    /tmp/watch_recursive \
    "echo '[Recursive] Event: \$EVENT on \$FILE'" &

WATCHER_PID=$!
echo "Recursive file watcher started with PID: $WATCHER_PID"

# Wait for watcher to initialize
sleep 1

# Test operations in different subdirectories
echo "\nTesting recursive monitoring..."
echo "Creating files in different directories..."
echo "Root file" > /tmp/watch_recursive/root.txt
echo "Subdir1 file" > /tmp/watch_recursive/subdir1/file1.txt
echo "Subdir2 file" > /tmp/watch_recursive/subdir1/subdir2/file2.txt
sleep 2

echo "Modifying files..."
echo "Modified" >> /tmp/watch_recursive/root.txt
echo "Modified" >> /tmp/watch_recursive/subdir1/file1.txt
sleep 2

echo "Deleting files..."
rm /tmp/watch_recursive/root.txt
rm /tmp/watch_recursive/subdir1/file1.txt
rm /tmp/watch_recursive/subdir1/subdir2/file2.txt
sleep 1

# Stop recursive watcher
echo "\nStopping recursive file watcher..."
kill $WATCHER_PID
wait $WATCHER_PID 2>/dev/null

echo "\n3. Configuration File Monitoring"
echo "================================="

# Create config directory
mkdir -p /tmp/config_watch

# Create initial config file
cat > /tmp/config_watch/app.conf << EOF
app_name=TestApp
log_level=INFO
max_connections=100
EOF

# Start config file watcher
echo "Starting configuration file watcher..."
./build/src/filewatcher/filewatcher \
    -e modify \
    /tmp/config_watch/app.conf \
    "echo '[Config] Configuration file changed: \$FILE - reloading application...'" &

WATCHER_PID=$!
echo "Config watcher started with PID: $WATCHER_PID"

# Wait for watcher to initialize
sleep 1

# Simulate config changes
echo "\nSimulating configuration changes..."
echo "Adding debug mode..."
echo "debug_mode=true" >> /tmp/config_watch/app.conf
sleep 2

echo "Changing log level..."
sed -i 's/log_level=INFO/log_level=DEBUG/' /tmp/config_watch/app.conf
sleep 2

echo "Adding new setting..."
echo "timeout=30" >> /tmp/config_watch/app.conf
sleep 2

# Stop config watcher
echo "\nStopping config file watcher..."
kill $WATCHER_PID
wait $WATCHER_PID 2>/dev/null

# Cleanup
echo "\nCleaning up..."
rm -rf /tmp/watch_test /tmp/watch_recursive /tmp/config_watch

echo "\n=== FileWatcher Examples completed ==="
echo "Check the README.md for more detailed usage information."