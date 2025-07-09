# 从源码构建

在不同平台和配置下从源码构建 AuroraCore 的完整指南。

## 📋 前置要求

### 必需工具

- **CMake**: 3.10 或更高版本
- **Android NDK**: r21 或更高版本（推荐 r25c+）
- **Git**: 用于克隆仓库
- **Make**: GNU Make 或 Ninja 构建系统

### 系统要求

- **主机操作系统**: Linux、macOS 或 Windows（使用 WSL）
- **目标平台**: Android ARM64/ARMv7
- **磁盘空间**: 完整构建约需 500MB
- **内存**: 最低 4GB，推荐 8GB

## 🚀 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
```

### 2. 设置 Android NDK

```bash
# 下载 NDK（如果尚未安装）
wget https://dl.google.com/android/repository/android-ndk-r25c-linux.zip
unzip android-ndk-r25c-linux.zip

# 设置环境变量
export ANDROID_NDK=/path/to/android-ndk-r25c
export PATH=$ANDROID_NDK:$PATH
```

### 3. 构建 ARM64 版本（推荐）

```bash
mkdir build-arm64 && cd build-arm64

cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release

make -j$(nproc)
```

## 🔧 详细构建配置

### CMake 选项

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `CMAKE_BUILD_TYPE` | `Release` | 构建类型：Debug、Release、RelWithDebInfo |
| `ANDROID_ABI` | `arm64-v8a` | 目标架构 |
| `ANDROID_PLATFORM` | `android-21` | 最低 Android API 级别 |
| `BUILD_TESTING` | `ON` | 构建测试程序 |
| `BUILD_EXAMPLES` | `ON` | 构建示例程序 |
| `ENABLE_LOGGING` | `ON` | 启用内部调试日志 |

### 架构支持

#### ARM64（推荐）

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21
```

#### ARMv7（传统支持）

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=armeabi-v7a \
  -DANDROID_PLATFORM=android-21
```

#### x86_64（模拟器）

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=x86_64 \
  -DANDROID_PLATFORM=android-21
```

### 构建类型

#### 调试构建

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_LOGGING=ON

make -j$(nproc)
```

**特性**：
- 包含调试符号
- 启用断言
- 启用内部日志
- 无优化

#### 发布构建

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_LOGGING=OFF

make -j$(nproc)
```

**特性**：
- 性能优化
- 最小二进制大小
- 无调试符号
- 禁用断言

#### 带调试信息的发布版本

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo

make -j$(nproc)
```

**特性**：
- 优化性能
- 包含调试符号
- 适合性能分析

## 🏗️ 构建组件

### 核心库

```bash
# 仅构建日志组件
make logger logger_daemon logger_client

# 仅构建文件监视器组件
make filewatcher filewatcherAPI

# 构建所有库
make loggerAPI filewatcherAPI
```

### 测试程序

```bash
# 构建并运行测试
make tests
ctest --output-on-failure

# 运行特定测试
./tests/test_logger_api
./tests/test_filewatcher_api
```

### 示例程序

```bash
# 构建示例
make examples

# 运行示例
./examples/logger_example
./examples/filewatcher_example
```

## 🔍 高级构建选项

### 自定义编译器标志

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_CXX_FLAGS="-O3 -flto -fno-exceptions" \
  -DCMAKE_C_FLAGS="-O3 -flto"
```

### 静态库 vs 动态库

```bash
# 构建静态库（默认）
cmake .. -DBUILD_SHARED_LIBS=OFF

# 构建动态库
cmake .. -DBUILD_SHARED_LIBS=ON
```

### 多架构交叉编译

```bash
#!/bin/bash
# build_all.sh - 为所有支持的架构构建

ARCHS=("arm64-v8a" "armeabi-v7a" "x86_64")

for arch in "${ARCHS[@]}"; do
    echo "正在为 $arch 构建..."
    mkdir -p build-$arch
    cd build-$arch
    
    cmake .. \
        -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
        -DANDROID_ABI=$arch \
        -DANDROID_PLATFORM=android-21 \
        -DCMAKE_BUILD_TYPE=Release
    
    make -j$(nproc)
    cd ..
done
```

## 🐛 构建问题排查

### 常见问题

#### 找不到 NDK

```bash
# 错误：Could not find Android NDK
# 解决方案：设置正确的 NDK 路径
export ANDROID_NDK=/correct/path/to/android-ndk
```

#### CMake 版本过旧

```bash
# 错误：CMake 3.10 or higher is required
# 解决方案：更新 CMake
wget https://github.com/Kitware/CMake/releases/download/v3.25.0/cmake-3.25.0-linux-x86_64.tar.gz
tar -xzf cmake-3.25.0-linux-x86_64.tar.gz
export PATH=/path/to/cmake-3.25.0-linux-x86_64/bin:$PATH
```

#### 编译错误

```bash
# 错误：C++20 features not supported
# 解决方案：使用更新的 NDK 或回退到 C++17
cmake .. -DCMAKE_CXX_STANDARD=17

# 错误：Missing headers
# 解决方案：清理并重新配置
rm -rf build/
mkdir build && cd build
cmake ..
```

#### 链接错误

```bash
# 错误：undefined reference to pthread functions
# 解决方案：确保 pthread 链接
cmake .. -DCMAKE_EXE_LINKER_FLAGS="-pthread"

# 错误：library not found
# 解决方案：检查库路径
make VERBOSE=1
```

### 调试构建问题

```bash
# 启用详细输出
make VERBOSE=1

# 检查编译器命令
cmake .. --debug-output

# 验证工具链
cmake .. -DCMAKE_VERBOSE_MAKEFILE=ON
```

## 📦 打包和分发

### 创建安装包

```bash
# 构建并打包
make package

# 创建 tarball
cpack -G TGZ

# 创建 ZIP 归档
cpack -G ZIP
```

### 安装到系统

```bash
# 安装到默认前缀（/usr/local）
sudo make install

# 安装到自定义位置
cmake .. -DCMAKE_INSTALL_PREFIX=/opt/AuroraCore
make install
```

### Android APK 集成

```bash
# 复制库到 Android 项目
cp build-arm64/src/logger/libloggerAPI.so android-project/app/src/main/jniLibs/arm64-v8a/
cp build-armv7/src/logger/libloggerAPI.so android-project/app/src/main/jniLibs/armeabi-v7a/
```

## 🔧 开发环境设置

### IDE 配置

#### CLion

```cmake
# .idea/cmake.xml
<component name="CMakeSettings">
  <configurations>
    <configuration PROFILE_NAME="Debug-ARM64" CONFIG_NAME="Debug"
                   TOOLCHAIN_NAME="Android NDK"
                   CMAKE_ARGS="-DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-21" />
  </configurations>
</component>
```

#### VS Code

```json
// .vscode/settings.json
{
    "cmake.configureArgs": [
        "-DCMAKE_TOOLCHAIN_FILE=${env:ANDROID_NDK}/build/cmake/android.toolchain.cmake",
        "-DANDROID_ABI=arm64-v8a",
        "-DANDROID_PLATFORM=android-21"
    ]
}
```

### Git 钩子

```bash
# 设置预提交钩子进行格式化
cp scripts/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit

# 提交前格式化代码
clang-format -i src/**/*.cpp src/**/*.hpp
```

## 📊 构建性能

### 并行构建

```bash
# 使用所有 CPU 核心
make -j$(nproc)

# 限制并行作业数
make -j4

# 使用 Ninja 进行更快构建
cmake .. -GNinja
ninja
```

### Ccache 集成

```bash
# 安装 ccache
sudo apt-get install ccache

# 配置 CMake 使用 ccache
cmake .. -DCMAKE_CXX_COMPILER_LAUNCHER=ccache

# 检查 ccache 统计
ccache -s
```

### 构建时间优化

```bash
# 禁用不必要的功能以加快构建
cmake .. \
  -DBUILD_TESTING=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DENABLE_LOGGING=OFF

# 使用预编译头文件（如果支持）
cmake .. -DUSE_PRECOMPILED_HEADERS=ON
```

## 🔗 相关文档

- [入门指南](/zh/guide/getting-started)
- [性能优化](/zh/guide/performance)
- [常见问题](/zh/guide/faq)
- [API 参考](/zh/api/)
- [示例](/zh/examples/basic-usage)

## 📞 构建支持

如果遇到构建问题：

1. 查看本指南的常见解决方案
2. 查阅[常见问题](/zh/guide/faq)进行故障排除
3. 搜索 [GitHub Issues](https://github.com/APMMDEVS/AuroraCore/issues)
4. 创建新问题并包含：
   - 构建环境详细信息
   - 完整错误消息
   - 使用的 CMake 配置
   - NDK 版本和主机操作系统