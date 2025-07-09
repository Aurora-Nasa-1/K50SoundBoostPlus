# Logger daemon and client executables

# Logger library components

# Logger daemon - main logging service
add_executable(logger_daemon
    logger_daemon.cpp
    buffer_manager.cpp
    file_manager.cpp
)

# Logger client - lightweight log sender
add_executable(logger_client
    logger_client.cpp
    ipc_client.cpp
)

# Set target properties
set_target_properties(logger_daemon PROPERTIES
    OUTPUT_NAME "logger_daemon"
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
)

set_target_properties(logger_client PROPERTIES
    OUTPUT_NAME "logger_client"
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
)

# Compiler-specific optimizations
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(logger_daemon PRIVATE -fno-exceptions -fno-rtti -O2)
    target_compile_options(logger_client PRIVATE -fno-exceptions -fno-rtti -O2)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(logger_daemon PRIVATE /GR- /EHsc)
    target_compile_options(logger_client PRIVATE /GR- /EHsc)
endif()

# Link libraries
target_link_libraries(logger_daemon PRIVATE Threads::Threads)
target_link_libraries(logger_client PRIVATE Threads::Threads)

# Include directories
target_include_directories(logger_daemon PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(logger_client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

# Install binaries
install(TARGETS logger_daemon logger_client
    RUNTIME DESTINATION bin
)