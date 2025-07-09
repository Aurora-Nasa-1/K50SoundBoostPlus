# Aurora Module Build System

现代化的Magisk模块构建系统，支持多架构C++组件、WebUI和智能打包。

## 开始

### 1. 配置模块

克隆此仓库或下载此仓库

模块在`module`目录下，作为模块的根目录

可以从现有模块复制到`module`目录，或者作为git模块导入为子模块，但必须有`module/settings.json`.

编辑 `module/settings.json` [JSON设置详细说明](#配置选项详解)：
```json
{
  "build_module": true,
  "build": {
    "build_type": "Release",
    "architectures": ["arm64-v8a", "x86_64"],
    "package_mode": "single_zip",
    "Aurora_webui_build": true,
    "module_properties": {
      "module_name": "YourModule",
      "module_version": "1.0.0",
      "module_author": "YourName"
    }
  }
}
```

### 2. 一键构建

```bash
# 查看当前配置
./build/build.sh -c

# 开始构建
./build/build.sh

# 自动构建（CI/CD）
./build/build.sh -a
```

## 配置选项详解

### 核心配置

| 选项 | 类型 | 说明 |
|------|------|------|
| `build_module` | boolean | 是否启用构建 |
| `build_type` | string | 构建类型：Release/Debug |
| `architectures` | array | 目标架构列表 |
| `package_mode` | string | 打包模式 |

| 打包模式 | 说明 | 适用场景 |
|------|------|----------|
| `single_zip` | 多架构单包，运行时自动选择 | 通用分发，减少包数量 |
| `separate_zip` | 每个架构单独打包 | 精确控制，减少包大小 |

### 组件配置

| 选项 | 类型 | 说明 |
|------|------|------|
| `Aurora_webui_build` | boolean | 是否构建WebUI组件 |
| `script.add_Aurora_function_for_script` | boolean | 集成Aurora核心函数 |
| `script.add_log_support_for_script` | boolean | 集成日志系统 |

### WebUI组件

| 选项 | 类型 | 说明 |
|------|------|------|
| `Aurora_webui_build` | boolean | 是否构建WebUI组件 |
| `webui_overlay_src_path` | string | WebUI源码路径(覆盖层，覆盖到原源码上，方便修改，制作, TODO) |
| `webui_build_output_path` | string | WebUI构建输出路径 |

### 其他配置
| 选项 | 类型 | 说明 |
|------|------|------|
| `rewrite_module_properties` | boolean | 是否重写模块属性（内容相当于module.prop，目前默认启用，关闭无效） |
| `custom_build_script` | boolean | 是否自定义构建脚本 |
| `use_tools_form` | string | 工具来源：`build`/`release`（todo：自动从release获取），目前只能build |

## 📦 构建输出

构建完成后生成的文件结构：

```
build_output/
├── module/                           # 模块源文件
│   ├── META-INF/                    # Magisk安装器
│   ├── bin/                         # 多架构二进制文件
│   │   ├── logger_daemon_ModuleName_arm64-v8a
│   │   ├── logger_daemon_ModuleName_x86_64
│   │   ├── logger_client_ModuleName_arm64-v8a
│   │   ├── logger_client_ModuleName_x86_64
│   │   └── filewatcher_ModuleName_*
│   ├── webroot/                     # WebUI文件（可选）
│   ├── module.prop                  # 模块属性
│   └── customize.sh                 # 智能安装脚本
└── 输出包：
    ├── AuroraModule-1.0.1-multi-arch.zip  # 单包模式
    ├── AuroraModule-1.0.1-arm64-v8a.zip   # 分包模式
    └── AuroraModule-1.0.1-x86_64.zip      # 分包模式
```

### 架构处理机制

- **构建时**：为每个架构生成带后缀的二进制文件
- **安装时**：`customize.sh` 自动检测设备架构并清理无关文件
- **运行时**：只保留当前架构的二进制文件，优化存储空间

## 🔧 故障排除

### 依赖问题

```bash
# 安装必需依赖
sudo apt-get install jq cmake zip  # Ubuntu/Debian
brew install jq cmake                   # macOS
```

### 常见错误

| 问题 | 解决方案 |
|------|----------|
| NDK未找到 | 设置 `ANDROID_NDK_ROOT` 环境变量 |
| WebUI构建失败 | 检查Node.js安装，运行 `npm install` |
| 权限错误 | `chmod +x build/build.sh` |
| 配置无效 | 检查 `settings.json` 语法 |

## 🚀 高级用法

### CI/CD 自动化

**GitHub Actions 示例：**
```yaml
name: Build Module
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
      with:
        submodules: recursive
    - name: Build Module
      run: |
        chmod +x build/build.sh
        ./build/build.sh -a
    - name: Upload Artifacts
      uses: actions/upload-artifact@v4
      with:
        name: aurora-module
        path: build_output/*.zip
```

### 自定义构建

```json
{
  "build": {
    "custom_build_script": true,
    "build_script": {
      "script_path": "custom_build.sh"
    }
  }
}
```

## 贡献

欢迎提交Issue和Pull Request来改进这个构建系统。

## 许可证

本项目采用MIT许可证。