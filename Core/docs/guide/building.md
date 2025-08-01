# Building from Source

Complete guide for building AuroraCore from source code on different platforms and configurations.

## 📋 Prerequisites

### Required Tools

- **CMake**: Version 3.10 or higher
- **Android NDK**: r21 or higher (r25c+ recommended)
- **Git**: For cloning the repository
- **Make**: GNU Make or Ninja build system

### System Requirements

- **Host OS**: Linux, macOS, or Windows (with WSL)
- **Target**: Android ARM64/ARMv7
- **Disk Space**: ~300MB for full build
- **RAM**: 4GB minimum, 8GB recommended

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/APMMDEVS/AuroraCore.git
cd AuroraCore
```

### 2. Setup Android NDK

```bash
# Download NDK (if not already installed)
wget https://dl.google.com/android/repository/android-ndk-r25c-linux.zip
unzip android-ndk-r25c-linux.zip

# Set environment variable
export ANDROID_NDK=/path/to/android-ndk-r25c
export PATH=$ANDROID_NDK:$PATH
```

### 3. Build for ARM64 (Recommended)

```bash
mkdir build-arm64 && cd build-arm64

cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release

make -j$(nproc)
```

## 🔧 Detailed Build Configuration

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `CMAKE_BUILD_TYPE` | `Release` | Build type: Debug, Release, RelWithDebInfo |
| `ANDROID_ABI` | `arm64-v8a` | Target architecture |
| `ANDROID_PLATFORM` | `android-21` | Minimum Android API level |
| `BUILD_TESTING` | `ON` | Build test programs |
| `BUILD_EXAMPLES` | `ON` | Build example programs |
| `ENABLE_LOGGING` | `ON` | Enable internal debug logging |

### Architecture Support

#### ARM64 (Recommended)

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21
```

#### ARMv7 (Legacy Support)

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=armeabi-v7a \
  -DANDROID_PLATFORM=android-21
```

#### x86_64 (Emulator)

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=x86_64 \
  -DANDROID_PLATFORM=android-21
```

### Build Types

#### Debug Build

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_LOGGING=ON

make -j$(nproc)
```

**Features**:
- Debug symbols included
- Assertions enabled
- Internal logging enabled
- No optimization

#### Release Build

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=Release \
  -DENABLE_LOGGING=OFF

make -j$(nproc)
```

**Features**:
- Optimized for performance
- Minimal binary size
- No debug symbols
- Assertions disabled

#### Release with Debug Info

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo

make -j$(nproc)
```

**Features**:
- Optimized performance
- Debug symbols included
- Suitable for profiling

## 🏗️ Build Components

### Core Libraries

```bash
# Build only filewatcher components
make filewatcher filewatcherAPI

# Build all libraries
make filewatcherAPI
```

### Test Programs

```bash
# Build and run tests
make tests
ctest --output-on-failure

# Run specific tests
./tests/test_filewatcher_api
```

### Example Programs

```bash
# Build examples
make examples

# Run examples
./examples/filewatcher_example
```

## 🔍 Advanced Build Options

### Custom Compiler Flags

```bash
cmake .. \
  -DCMAKE_TOOLCHAIN_FILE=$ANDROID_NDK/build/cmake/android.toolchain.cmake \
  -DANDROID_ABI=arm64-v8a \
  -DANDROID_PLATFORM=android-21 \
  -DCMAKE_CXX_FLAGS="-O3 -flto -fno-exceptions" \
  -DCMAKE_C_FLAGS="-O3 -flto"
```

### Static vs Shared Libraries

```bash
# Build static libraries (default)
cmake .. -DBUILD_SHARED_LIBS=OFF

# Build shared libraries
cmake .. -DBUILD_SHARED_LIBS=ON
```

### Cross-compilation for Multiple Architectures

```bash
#!/bin/bash
# build_all.sh - Build for all supported architectures

ARCHS=("arm64-v8a" "armeabi-v7a" "x86_64")

for arch in "${ARCHS[@]}"; do
    echo "Building for $arch..."
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

## 🐛 Troubleshooting Build Issues

### Common Problems

#### NDK Not Found

```bash
# Error: Could not find Android NDK
# Solution: Set correct NDK path
export ANDROID_NDK=/correct/path/to/android-ndk
```

#### CMake Version Too Old

```bash
# Error: CMake 3.10 or higher is required
# Solution: Update CMake
wget https://github.com/Kitware/CMake/releases/download/v3.25.0/cmake-3.25.0-linux-x86_64.tar.gz
tar -xzf cmake-3.25.0-linux-x86_64.tar.gz
export PATH=/path/to/cmake-3.25.0-linux-x86_64/bin:$PATH
```

#### Compilation Errors

```bash
# Error: C++20 features not supported
# Solution: Use newer NDK or fallback to C++17
cmake .. -DCMAKE_CXX_STANDARD=17

# Error: Missing headers
# Solution: Clean and reconfigure
rm -rf build/
mkdir build && cd build
cmake ..
```

#### Linking Errors

```bash
# Error: undefined reference to pthread functions
# Solution: Ensure pthread linking
cmake .. -DCMAKE_EXE_LINKER_FLAGS="-pthread"

# Error: library not found
# Solution: Check library paths
make VERBOSE=1
```

### Debug Build Issues

```bash
# Enable verbose output
make VERBOSE=1

# Check compiler commands
cmake .. --debug-output

# Verify toolchain
cmake .. -DCMAKE_VERBOSE_MAKEFILE=ON
```

## 📦 Packaging and Distribution

### Create Installation Package

```bash
# Build and package
make package

# Create tarball
cpack -G TGZ

# Create ZIP archive
cpack -G ZIP
```

### Install to System

```bash
# Install to default prefix (/usr/local)
sudo make install

# Install to custom location
cmake .. -DCMAKE_INSTALL_PREFIX=/opt/AuroraCore
make install
```

### Android APK Integration

```bash
# Copy libraries to Android project
cp build-arm64/src/filewatcher/libfilewatcherAPI.so android-project/app/src/main/jniLibs/arm64-v8a/
cp build-armv7/src/filewatcher/libfilewatcherAPI.so android-project/app/src/main/jniLibs/armeabi-v7a/
```

## 🔧 Development Setup

### IDE Configuration

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

### Git Hooks

```bash
# Setup pre-commit hook for formatting
cp scripts/pre-commit .git/hooks/
chmod +x .git/hooks/pre-commit

# Format code before commit
clang-format -i src/**/*.cpp src/**/*.hpp
```

## 📊 Build Performance

### Parallel Builds

```bash
# Use all CPU cores
make -j$(nproc)

# Limit parallel jobs
make -j4

# Use Ninja for faster builds
cmake .. -GNinja
ninja
```

### Ccache Integration

```bash
# Install ccache
sudo apt-get install ccache

# Configure CMake to use ccache
cmake .. -DCMAKE_CXX_COMPILER_LAUNCHER=ccache

# Check ccache statistics
ccache -s
```

### Build Time Optimization

```bash
# Disable unnecessary features for faster builds
cmake .. \
  -DBUILD_TESTING=OFF \
  -DBUILD_EXAMPLES=OFF \
  -DENABLE_LOGGING=OFF

# Use precompiled headers (if supported)
cmake .. -DUSE_PRECOMPILED_HEADERS=ON
```

## 🔗 Related Documentation

- [Getting Started Guide](/guide/getting-started)
- [Performance Optimization](/guide/performance)
- [FAQ](/guide/faq)
- [API Reference](/api/)
- [Examples](/examples/basic-usage)

## 📞 Build Support

If you encounter build issues:

1. Check this guide for common solutions
2. Review [FAQ](/guide/faq) for troubleshooting
3. Search [GitHub Issues](https://github.com/APMMDEVS/AuroraCore/issues)
4. Create a new issue with:
   - Build environment details
   - Complete error messages
   - CMake configuration used
   - NDK version and host OS