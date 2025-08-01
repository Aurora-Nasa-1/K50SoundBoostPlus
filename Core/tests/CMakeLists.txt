# Tests for AuroraCore

# Simple test executables
add_executable(test_filewatcher_api
    test_filewatcher_api.cpp
)

# Performance optimizations for tests - inherit from parent CMakeLists.txt
target_compile_options(test_filewatcher_api PRIVATE -fno-exceptions -fno-rtti)

# Link with our libraries
target_link_libraries(test_filewatcher_api PRIVATE filewatcherAPI)

# Add tests
add_test(NAME FileWatcherAPITest COMMAND test_filewatcher_api)

# Test data directory
file(MAKE_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/test_data)