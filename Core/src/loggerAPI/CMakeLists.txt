# Logger API library for developers

add_library(loggerAPI INTERFACE)

target_include_directories(loggerAPI INTERFACE
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Header-only library, no source files to compile
target_compile_features(loggerAPI INTERFACE cxx_std_20)

# Install headers
install(FILES
    logger_api.hpp
    DESTINATION include/loggerAPI
)