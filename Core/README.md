# AuroraCore

[![Build Status](https://github.com/APMMDEVS/AuroraCore/workflows/CI/badge.svg)](https://github.com/APMMDEVS/AuroraCore/actions)
[![Documentation](https://img.shields.io/badge/docs-VitePress-blue)](https://APMMDEVS.github.io/AuroraCore/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

AuroraCore 是一个高性能的 Android root 日志记录和文件监控框架，专为系统级应用和服务设计。

## 🚀 特性

- **高性能日志记录** - 异步写入、智能缓冲、自动文件轮转
- **实时文件监控** - 基于 inotify 的高效文件系统事件监控
- **守护进程模式** - 支持后台运行的日志守护进程
- **多语言支持** - C++ API 和命令行工具
- **线程安全** - 完全的多线程支持
- **内存高效** - 可配置的缓冲策略和资源管理

## 📚 文档

完整的文档可在以下地址查看：

- **[在线文档](https://APMMDEVS.github.io/AuroraCore/)** - 完整的 API 参考和使用指南
- **[快速开始](/docs/guide/getting-started.md)** - 快速入门指南
- **[API 参考](/docs/api/)** - 详细的 API 文档
- **[示例代码](/docs/examples/)** - 实际使用示例

### 文档语言

- [English Documentation](https://APMMDEVS.github.io/AuroraCore/)
- [中文文档](https://APMMDEVS.github.io/AuroraCore/zh/)

## 🛠️ 快速开始

### 系统要求

- Android NDK r21 或更高版本
- CMake 3.10 或更高版本
- Linux 内核 2.6.13+ (支持 inotify)
- Root 权限 (用于系统级操作)

### 构建

```bash
# 克隆仓库
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore

# 设置 Android NDK 路径
export ANDROID_NDK=/path/to/android-ndk

# 创建构建目录
mkdir build && cd build

# 配置 CMake (ARM64)
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21

# 编译
make -j$(nproc)
```

### 基本使用

#### Logger API

```cpp
#include "logger_api.hpp"

int main() {
    // 初始化日志记录器
    init_logger("/data/local/tmp/app.log");
    
    // 记录日志
    log_info("Application started");
    log_errorf("Error code: %d", 404);
    
    // 清理
    cleanup_logger();
    return 0;
}
```

#### FileWatcher API

```cpp
#include "filewatcher_api.hpp"

int main() {
    FileWatcher watcher;
    
    // 添加文件监控
    watcher.add_watch("/data/config", EventType::MODIFY,
        [](const FileEvent& event) {
            std::cout << "File modified: " << event.path << std::endl;
        });
    
    // 启动监控
    watcher.start();
    
    // 保持运行
    std::this_thread::sleep_for(std::chrono::hours(1));
    
    return 0;
}
```

#### 命令行工具

```bash
# 启动日志守护进程
./logger_daemon -f /data/local/tmp/app.log -d

# 发送日志消息
./logger_client "Application event occurred"

# 监控文件变化
./filewatcher /data/config "echo 'Config changed: %f'"
```

## 📦 组件

### 核心库

- **logger** - 核心日志记录引擎
- **loggerAPI** - C++ 日志记录 API
- **filewatcher** - 核心文件监控引擎
- **filewatcherAPI** - C++ 文件监控 API

### 命令行工具

- **logger_daemon** - 高性能日志守护进程
- **logger_client** - 日志客户端工具
- **filewatcher** - 文件监控命令行工具

## 🏗️ 架构

```
AuroraCore/
├── logger/              # 核心日志记录引擎
├── loggerAPI/           # C++ 日志 API
├── filewatcher/         # 核心文件监控引擎
├── filewatcherAPI/      # C++ 文件监控 API
├── tests/               # 单元测试
├── docs/                # VitePress 文档
└── examples/            # 使用示例
```

## 🧪 测试

```bash
# 构建测试
make tests

# 运行测试
./tests/test_logger_api
./tests/test_filewatcher_api
```

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献

欢迎贡献！请查看我们的[贡献指南](CONTRIBUTING.md)了解如何参与项目开发。

## 📞 支持

- **问题报告**: [GitHub Issues](https://github.com/APMMDEVS/AuroraCore/issues)
- **功能请求**: [GitHub Discussions](https://github.com/APMMDEVS/AuroraCore/discussions)
- **文档**: [在线文档](https://APMMDEVS.github.io/AuroraCore/)

## 🔗 相关链接

- [Android NDK](https://developer.android.com/ndk)
- [CMake](https://cmake.org/)
- [inotify(7)](https://man7.org/linux/man-pages/man7/inotify.7.html)

---

**注意**: 此项目需要 Android root 权限才能正常工作。请确保在支持的环境中使用。