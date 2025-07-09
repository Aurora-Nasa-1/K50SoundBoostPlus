# 系统工具 (System Tools)

本指南介绍如何获取和使用AuroraCore的预编译二进制工具。这些工具可以直接部署到Android设备上使用，无需编译。

## 📦 可用工具

### 核心二进制文件

- **`logger_daemon`** - 日志守护进程，提供系统级日志服务
- **`logger_client`** - 日志客户端，用于向守护进程发送日志消息
- **`filewatcher`** - 文件监控工具，监控文件系统变化并执行自定义命令

## 🚀 快速开始

### 1. 获取预编译二进制文件

#### 方法一：从GitHub Releases下载

```bash
# 下载最新版本 (ARM64)
wget https://github.com/APMMDEVS/AuroraCore/releases/latest/download/AuroraCore-v1.0.0-arm64-v8a.tar.gz

# 解压
tar -xzf AuroraCore-v1.0.0-arm64-v8a.tar.gz
```

#### 方法二：使用curl下载

```bash
# ARM64版本
curl -L -o AuroraCore-arm64.tar.gz \
  https://github.com/APMMDEVS/AuroraCore/releases/latest/download/AuroraCore-v1.0.0-arm64-v8a.tar.gz

# x86_64版本 (模拟器)
curl -L -o AuroraCore-x86_64.tar.gz \
  https://github.com/APMMDEVS/AuroraCore/releases/latest/download/AuroraCore-v1.0.0-x86_64.tar.gz
```

### 2. 部署到Android设备

```bash
# 推送二进制文件到设备
adb push arm64-v8a/logger_daemon /data/local/tmp/
adb push arm64-v8a/logger_client /data/local/tmp/
adb push arm64-v8a/filewatcher /data/local/tmp/

# 设置可执行权限
adb shell chmod +x /data/local/tmp/logger_daemon
adb shell chmod +x /data/local/tmp/logger_client
adb shell chmod +x /data/local/tmp/filewatcher
```

### 3. 验证安装

```bash
# 进入设备shell
adb shell

# 测试工具
cd /data/local/tmp
./logger_daemon --help
./logger_client --help
./filewatcher --help
```

## 🔧 工具使用指南

### Logger系统

#### 启动日志守护进程

```bash
# 基本启动
./logger_daemon -f /data/logs/app.log

# 高级配置
./logger_daemon \
  -f /data/logs/app.log \
  -s 10485760 \
  -n 5 \
  -b 65536 \
  -p /data/logs/logger.sock \
  -t 1000
```

**参数说明：**
- `-f`: 日志文件路径
- `-s`: 最大文件大小 (字节)
- `-n`: 保留的日志文件数量
- `-b`: 缓冲区大小 (字节)
- `-p`: Unix socket路径
- `-t`: 刷新间隔 (毫秒)

#### 发送日志消息

```bash
# 发送信息级别日志
./logger_client "Application started successfully"

# 指定日志级别
./logger_client -l error "Database connection failed"
./logger_client -l debug "Processing user request"
./logger_client -l warn "Memory usage high"

# 指定socket路径
./logger_client -p /data/logs/logger.sock -l info "Custom socket message"
```

**日志级别：**
- `trace`: 最详细的调试信息
- `debug`: 调试信息
- `info`: 一般信息 (默认)
- `warn`: 警告信息
- `error`: 错误信息
- `fatal`: 致命错误

### 文件监控工具

#### 基本文件监控

```bash
# 监控单个文件
./filewatcher /data/config/app.conf "echo 'Config changed'"

# 监控目录
./filewatcher /data/logs "echo 'Log directory changed: %f'"

# 后台运行
./filewatcher /data/config "systemctl restart myapp" &
```

#### 高级监控选项

```bash
# 递归监控目录
./filewatcher -r /data/app "echo 'File %f in %d was modified'"

# 指定监控事件类型
./filewatcher -e create,modify /data/uploads "process_new_file.sh %f"

# 设置监控深度
./filewatcher -r -d 3 /data/project "make rebuild"
```

**事件类型：**
- `create`: 文件创建
- `modify`: 文件修改
- `delete`: 文件删除
- `move`: 文件移动
- `attrib`: 属性变化
- `access`: 文件访问

**命令变量：**
- `%f`: 文件名
- `%d`: 目录路径
- `%p`: 完整路径

## 📋 实际使用场景

### 场景1：应用日志收集

```bash
# 启动日志服务
./logger_daemon -f /data/app_logs/main.log -s 52428800 -n 10 &

# 应用脚本中记录日志
./logger_client -l info "User login: $(whoami)"
./logger_client -l error "Failed to connect to database"
```

### 场景2：配置文件监控

```bash
# 监控配置变化并重启服务
./filewatcher /system/etc/myapp.conf "killall -HUP myapp" &

# 监控多个配置目录
./filewatcher -r /data/config "sync_config.sh %p" &
```

### 场景3：系统监控

```bash
# 监控系统关键目录
./filewatcher -r /system/bin "logger_client -l warn 'System binary changed: %f'" &
./filewatcher /data/system/packages.xml "logger_client -l info 'Package database updated'" &
```

## 🔍 故障排除

### 常见问题

#### 权限问题
```bash
# 确保有root权限
su

# 检查SELinux状态
getenforce

# 临时禁用SELinux (如果需要)
setenforce 0
```

#### 文件路径问题
```bash
# 确保目录存在
mkdir -p /data/logs
mkdir -p /data/config

# 检查磁盘空间
df -h /data
```

#### 进程管理
```bash
# 查看运行中的守护进程
ps aux | grep logger_daemon
ps aux | grep filewatcher

# 优雅停止守护进程
killall -TERM logger_daemon
killall -TERM filewatcher
```

### 日志调试

```bash
# 启用详细日志
./logger_daemon -f /data/logs/debug.log -v

# 检查系统日志
logcat | grep AuroraCore

# 监控资源使用
top -p $(pgrep logger_daemon)
```

## 📊 性能优化

### 日志系统优化

```bash
# 高性能配置
./logger_daemon \
  -f /data/logs/app.log \
  -s 104857600 \
  -n 3 \
  -b 131072 \
  -t 5000
```

### 文件监控优化

```bash
# 限制监控深度避免性能问题
./filewatcher -r -d 2 /data/app "process_change.sh %f"

# 使用事件过滤减少不必要的触发
./filewatcher -e modify,create /data/important "handle_change.sh %f"
```

## 🔗 相关链接

- [开发API指南](/guide/development-api) - 了解如何使用API开发自定义应用
- [CLI工具参考](/api/cli-tools) - 详细的命令行参数说明
- [性能调优](/guide/performance) - 系统性能优化指南
- [FAQ](/guide/faq) - 常见问题解答