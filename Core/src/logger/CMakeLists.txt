# Logger System

add_executable(logger_daemon
    logger_daemon.cpp
    buffer_manager.cpp
    file_manager.cpp
)

add_executable(logger_client
    logger_client.cpp
    ipc_client.cpp
)

set_target_properties(logger_daemon logger_client PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
    CXX_EXTENSIONS OFF
)

if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(logger_daemon PRIVATE 
        -Os -fno-exceptions -fno-rtti -ffast-math -fno-stack-protector
        -fmerge-all-constants -fno-unwind-tables -fno-asynchronous-unwind-tables
        -fvisibility=hidden -fvisibility-inlines-hidden -flto=thin
        -DANDROID_DOZE_AWARE -DLOW_POWER_MODE
    )
    target_compile_options(logger_client PRIVATE 
        -Os -fno-exceptions -fno-rtti -ffast-math -fno-stack-protector
        -fmerge-all-constants -fno-unwind-tables -fno-asynchronous-unwind-tables
        -fvisibility=hidden -fvisibility-inlines-hidden -flto=thin
        -DANDROID_DOZE_AWARE -DLOW_POWER_MODE
    )
    target_link_options(logger_daemon PRIVATE -flto=thin -Wl,--gc-sections -Wl,--strip-all)
    target_link_options(logger_client PRIVATE -flto=thin -Wl,--gc-sections -Wl,--strip-all)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(logger_daemon PRIVATE 
        -Os -fno-exceptions -fno-rtti -ffast-math -fno-stack-protector
        -fmerge-all-constants -fno-unwind-tables -fno-asynchronous-unwind-tables
        -fvisibility=hidden -fvisibility-inlines-hidden -flto
        -DANDROID_DOZE_AWARE -DLOW_POWER_MODE
    )
    target_compile_options(logger_client PRIVATE 
        -Os -fno-exceptions -fno-rtti -ffast-math -fno-stack-protector
        -fmerge-all-constants -fno-unwind-tables -fno-asynchronous-unwind-tables
        -fvisibility=hidden -fvisibility-inlines-hidden -flto
        -DANDROID_DOZE_AWARE -DLOW_POWER_MODE
    )
    target_link_options(logger_daemon PRIVATE -flto -Wl,--gc-sections -Wl,--strip-all)
    target_link_options(logger_client PRIVATE -flto -Wl,--gc-sections -Wl,--strip-all)
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "MSVC")
    target_compile_options(logger_daemon PRIVATE /GR- /EHsc /Os /GL /Gy /DANDROID_DOZE_AWARE /DLOW_POWER_MODE)
    target_compile_options(logger_client PRIVATE /GR- /EHsc /Os /GL /Gy /DANDROID_DOZE_AWARE /DLOW_POWER_MODE)
    target_link_options(logger_daemon PRIVATE /LTCG /OPT:REF /OPT:ICF)
    target_link_options(logger_client PRIVATE /LTCG /OPT:REF /OPT:ICF)
endif()

target_link_libraries(logger_daemon PRIVATE Threads::Threads)
target_link_libraries(logger_client PRIVATE Threads::Threads)

target_include_directories(logger_daemon PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
target_include_directories(logger_client PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})

install(TARGETS logger_daemon logger_client
    RUNTIME DESTINATION bin
)