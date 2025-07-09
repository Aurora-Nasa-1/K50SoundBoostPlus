# File watcher API library for developers

add_library(filewatcherAPI INTERFACE)

target_include_directories(filewatcherAPI INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Header-only library
target_compile_features(filewatcherAPI INTERFACE cxx_std_20)

# Install headers
install(FILES
    filewatcher_api.hpp
    DESTINATION include/filewatcherAPI
)