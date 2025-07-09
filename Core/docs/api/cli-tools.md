# CLI工具参考 (CLI Tools Reference)

AuroraCore提供三个核心命令行工具，可直接部署到Android设备使用。这些工具是预编译的二进制文件，无需额外依赖。

## 📦 工具概览

| 工具 | 功能 | 主要用途 |
|------|------|----------|
| `logger_daemon` | 日志守护进程 | 系统级日志收集和管理 |
| `logger_client` | 日志客户端 | 向守护进程发送日志消息 |
| `filewatcher` | 文件监控工具 | 实时监控文件系统变化 |

## 🔧 logger_daemon

系统级日志守护进程，提供集中式日志收集和管理功能。

### 基本语法

```bash
logger_daemon [选项]
```

### 命令行参数

| 参数 | 长参数 | 类型 | 默认值 | 描述 |
|------|--------|------|--------|------|
| `-f` | `--file` | string | `/tmp/app.log` | 日志文件路径 |
| `-s` | `--size` | int | `10485760` | 最大文件大小(字节) |
| `-n` | `--count` | int | `5` | 保留的日志文件数量 |
| `-b` | `--buffer` | int | `65536` | 内存缓冲区大小(字节) |
| `-p` | `--socket` | string | `/tmp/logger.sock` | Unix socket路径 |
| `-t` | `--interval` | int | `1000` | 刷新间隔(毫秒) |
| `-l` | `--level` | string | `info` | 最低日志级别 |
| `-d` | `--daemon` | flag | `false` | 后台运行模式 |
| `-h` | `--help` | flag | - | 显示帮助信息 |
| `-v` | `--version` | flag | - | 显示版本信息 |

### 日志级别

| 级别 | 数值 | 描述 |
|------|------|------|
| `trace` | 0 | 详细跟踪信息 |
| `debug` | 1 | 调试信息 |
| `info` | 2 | 一般信息 |
| `warn` | 3 | 警告信息 |
| `error` | 4 | 错误信息 |
| `fatal` | 5 | 致命错误 |

### 使用示例

#### 基本启动

```bash
# 基本启动
./logger_daemon -f /data/logs/app.log

# 后台运行，自定义配置
./logger_daemon \
  -f /data/logs/system.log \
  -s 52428800 \
  -n 10 \
  -b 131072 \
  -t 500 \
  -l debug \
  -d

# 使用自定义socket路径
./logger_daemon \
  -f /data/logs/app.log \
  -p /data/logs/logger.sock
```

#### 高性能配置

```bash
# 高吞吐量配置
./logger_daemon \
  -f /data/logs/highperf.log \
  -s 104857600 \    # 100MB文件
  -n 20 \           # 保留20个文件(2GB总计)
  -b 1048576 \      # 1MB缓冲区
  -p /data/logs/highperf.sock

# 内存受限配置
./logger_daemon \
  -f /data/logs/lowmem.log \
  -s 1048576 \      # 1MB文件
  -n 3 \            # 仅保留3个文件
  -b 16384 \        # 16KB缓冲区
  -p /data/logs/lowmem.sock
```

### 文件轮转机制

守护进程会在文件达到指定大小时自动轮转：

```
app.log         (当前活动日志文件)
app.log.1       (上一个日志文件)
app.log.2       (更早的日志文件)
app.log.3       (最早的日志文件)
```

**轮转过程：**
1. 当`app.log`达到最大大小时，重命名为`app.log.1`
2. 之前的`app.log.1`变成`app.log.2`，以此类推
3. 超出最大数量的文件被删除
4. 创建新的`app.log`用于当前日志记录

### 进程管理

```bash
# 检查守护进程是否运行
ps aux | grep logger_daemon
ls -la /tmp/logger_daemon

# 停止守护进程
killall logger_daemon
pkill -f logger_daemon

# 重启守护进程
killall logger_daemon
sleep 1
./logger_daemon -f /data/logs/app.log -d
```

## 📝 logger_client

日志客户端工具，用于向logger_daemon发送日志消息。

### 基本语法

```bash
logger_client [选项] <消息>
logger_client [选项] -m <消息>
```

### 命令行参数

| 参数 | 长参数 | 类型 | 默认值 | 描述 |
|------|--------|------|--------|------|
| `-l` | `--level` | string | `info` | 日志级别 |
| `-p` | `--socket` | string | `/tmp/logger.sock` | Unix socket路径 |
| `-t` | `--tag` | string | `client` | 日志标签 |
| `-f` | `--file` | string | - | 从文件读取消息 |
| `-i` | `--interactive` | flag | `false` | 交互模式 |
| `-m` | `--message` | string | - | 要发送的日志消息 |
| `--timeout` | - | int | `5000` | 连接超时(毫秒) |
| `-h` | `--help` | flag | - | 显示帮助信息 |
| `-v` | `--version` | flag | - | 显示版本信息 |

### 使用示例

#### 基本用法

```bash
# 发送基本日志消息
./logger_client "应用程序启动"

# 指定日志级别
./logger_client -l error "发生错误: 连接失败"
./logger_client -l warn "警告: 内存使用率过高"
./logger_client -l debug "调试: 处理用户请求"

# 使用自定义标签
./logger_client -t "WebServer" "HTTP服务器启动完成"
./logger_client -t "Database" -l error "数据库连接失败"

# 使用自定义socket路径
./logger_client -p /data/logs/logger.sock "自定义路径日志"
```

#### 高级用法

```bash
# 从文件读取日志内容
./logger_client -f /tmp/error.log -l error

# 交互模式
./logger_client -i
# 进入交互模式后，可以连续输入日志消息
# 输入 'quit' 或 'exit' 退出

# 脚本化日志记录
#!/bin/bash
LOG_SOCKET="/data/logs/script.sock"

log_info() {
    ./logger_client -p "$LOG_SOCKET" -l info "$1"
}

log_error() {
    ./logger_client -p "$LOG_SOCKET" -l error "$1"
}

# 使用
log_info "脚本开始执行"
log_error "发生了错误"
log_info "脚本执行完成"
```

#### 批量日志示例

```bash
# 批量发送日志
for i in {1..100}; do
    ./logger_client -t "Test" "测试消息 #$i"
done

# 监控脚本日志
./logger_client -t "Monitor" "开始系统监控"
ps aux | while read line; do
    ./logger_client -t "Monitor" -l debug "进程: $line"
done
./logger_client -t "Monitor" "系统监控完成"

# 条件日志记录
if [ $? -eq 0 ]; then
    ./logger_client "操作成功"
else
    ./logger_client -l error "操作失败，错误代码: $?"
fi
```

### 错误处理

```bash
# 连接错误
$ ./logger_client "测试消息"
Error: Failed to connect to daemon socket

# 检查守护进程状态
$ ps aux | grep logger_daemon

# 权限错误
$ ./logger_client "测试消息"
Error: Permission denied

# 修复socket权限
$ chmod 666 /tmp/logger_daemon

# 超时错误
$ ./logger_client --timeout 1000 "测试消息"
Error: Connection timeout after 1000ms
```

## 👁️ filewatcher

实时文件系统监控工具，基于inotify机制监控文件和目录变化。

### 基本语法

```bash
filewatcher <监控路径> <执行命令> [选项]
```

### 参数说明

| 参数 | 描述 | 示例 |
|------|------|------|
| `<监控路径>` | 要监控的文件或目录 | `/data/config` |
| `<执行命令>` | 文件事件发生时执行的命令 | `"echo '文件变化: %f'"` |

### 命令行选项

| 参数 | 长参数 | 类型 | 默认值 | 描述 |
|------|--------|------|--------|------|
| `-r` | `--recursive` | flag | `false` | 递归监控子目录 |
| `-d` | `--depth` | int | `-1` | 最大监控深度(-1为无限制) |
| `-e` | `--events` | string | `all` | 监控的事件类型 |
| `-x` | `--exclude` | string | - | 排除的文件模式(正则表达式) |
| `-i` | `--include` | string | - | 包含的文件模式(正则表达式) |
| `-q` | `--quiet` | flag | `false` | 静默模式，不输出事件信息 |
| `-v` | `--verbose` | flag | `false` | 详细输出模式 |
| `-o` | `--output` | string | - | 输出文件路径 |
| `--daemon` | - | flag | `false` | 后台运行模式 |
| `-h` | `--help` | flag | - | 显示帮助信息 |
| `--version` | - | flag | - | 显示版本信息 |

### 事件类型

| 事件 | 描述 | 使用场景 |
|------|------|----------|
| `create` | 文件/目录创建 | 新文件检测 |
| `modify` | 文件内容修改 | 配置更新 |
| `delete` | 文件/目录删除 | 清理监控 |
| `move` | 文件/目录移动或重命名 | 文件组织 |
| `attrib` | 文件属性变化 | 权限变更 |
| `access` | 文件访问 | 使用跟踪 |
| `all` | 所有事件类型 | 全面监控 |

### 命令变量

在执行命令中可以使用以下变量：

| 变量 | 描述 | 示例 |
|------|------|------|
| `%f` | 完整文件路径 | `/data/config/app.conf` |
| `%d` | 目录路径 | `/data/config` |
| `%n` | 仅文件名 | `app.conf` |
| `%e` | 事件类型 | `modify` |
| `%t` | 时间戳 | `2024-01-01 12:00:00` |

### 使用示例

#### 基本监控

```bash
# 基本文件监控
./filewatcher /data/config "echo '配置文件变化: %f'"

# 监控并执行命令
./filewatcher /data/config "echo '配置文件变化: %f (事件: %e)'"

# 递归监控目录
./filewatcher -r /data/app "echo '应用文件变化: %f (事件: %e)'"

# 监控特定事件类型
./filewatcher -e create,modify /data/logs "echo '日志文件更新: %f'"
```

#### 高级监控

```bash
# 限制监控深度
./filewatcher -r -d 2 /data/project "echo '项目文件变化: %f'"

# 使用文件过滤
./filewatcher -r \
  --include="\.(cpp|hpp|h)$" \
  /data/src \
  "echo 'C++源文件变化: %f'"

# 排除特定文件
./filewatcher -r \
  --exclude="\.(tmp|log|bak)$" \
  /data/project \
  "echo '项目文件变化: %f'"

# 静默模式，仅执行命令
./filewatcher -q /data/config \
  "./logger_client -t FileWatcher '配置文件变化: %f'"

# 输出到文件
./filewatcher -r -o /data/logs/filewatcher.log /data/app

# 后台运行
./filewatcher --daemon -r /data/critical \
  "./logger_client -l warn '重要文件变化: %f (事件: %e)'"
```

#### 实际应用场景

```bash
# 监控配置文件变化并重启服务
./filewatcher /etc/myapp/config.json \
  "systemctl restart myapp && echo '服务已重启'"

# 监控源码变化并自动编译
./filewatcher -r \
  --include="\.(cpp|hpp)$" \
  /data/src \
  "cd /data && make && echo '编译完成'"

# 监控日志目录并清理旧文件
./filewatcher -e create /data/logs \
  "find /data/logs -name '*.log' -mtime +7 -delete"

# 监控上传目录并处理文件
./filewatcher -e create /data/uploads \
  "./process_upload.sh '%f'"

# 结合logger_client记录文件变化
./filewatcher -r /data/important \
  "./logger_client -t FileWatcher -l warn '重要文件变化: %f (事件: %e, 时间: %t)'"
```

## 🔄 工具组合使用

### 完整监控方案

```bash
#!/bin/bash
# complete_monitoring.sh

# 1. 启动日志守护进程
./logger_daemon \
  -f /data/logs/system.log \
  -s 52428800 \
  -n 10 \
  -b 131072 \
  -p /data/logs/system.sock \
  -d

echo "日志守护进程已启动"

# 2. 监控应用目录并记录变化
./filewatcher -r /data/app \
  "./logger_client -p /data/logs/system.sock -t FileWatcher '应用文件变化: %f (事件: %e)'" \
  --daemon

echo "应用目录监控已启动"

# 3. 监控配置文件并重启服务
./filewatcher /data/config/app.conf \
  "./logger_client -p /data/logs/system.sock -t Config '配置文件更新，重启服务' && systemctl restart myapp" \
  --daemon

echo "配置文件监控已启动"

# 4. 定期发送心跳日志
(
    while true; do
        ./logger_client -p /data/logs/system.sock -t Heartbeat "系统运行正常"
        sleep 300  # 每5分钟发送一次
    done
) &

echo "心跳监控已启动"
echo "完整监控系统部署完成"
```

### 开发环境监控

```bash
#!/bin/bash
# dev_monitoring.sh

# 启动开发日志
./logger_daemon \
  -f /data/logs/dev.log \
  -s 10485760 \
  -n 5 \
  -p /data/logs/dev.sock \
  -l debug \
  -d

# 监控源码变化并自动构建
./filewatcher -r \
  --include="\.(cpp|hpp|h|cmake)$" \
  /data/project \
  "cd /data/project && make -j4 && ./logger_client -p /data/logs/dev.sock -t Build '构建完成: %f'" \
  --daemon

# 监控测试文件变化并运行测试
./filewatcher \
  --include="test_.*\.cpp$" \
  /data/project/tests \
  "cd /data/project && make test && ./logger_client -p /data/logs/dev.sock -t Test '测试完成: %f'" \
  --daemon

echo "开发环境监控已启动"
```

### 服务管理模式

```bash
#!/bin/bash
# service_manager.sh

SERVICE_NAME="myservice"
LOG_PATH="/data/logs/${SERVICE_NAME}.log"
SOCK_PATH="/data/logs/${SERVICE_NAME}.sock"

start_service() {
    echo "启动服务: $SERVICE_NAME"
    
    # 启动日志守护进程
    ./logger_daemon \
        -f "$LOG_PATH" \
        -s 20971520 \
        -n 7 \
        -p "$SOCK_PATH" \
        -d
    
    # 记录服务启动
    ./logger_client -p "$SOCK_PATH" "服务 $SERVICE_NAME 已启动"
    
    # 启动文件监控
    ./filewatcher \
        "/data/config/${SERVICE_NAME}.conf" \
        "./logger_client -p '$SOCK_PATH' '配置已重新加载'" \
        -e modify --daemon
    
    echo "服务 $SERVICE_NAME 启动完成"
}

stop_service() {
    echo "停止服务: $SERVICE_NAME"
    ./logger_client -p "$SOCK_PATH" "服务 $SERVICE_NAME 正在停止"
    killall logger_daemon
    killall filewatcher
    echo "服务 $SERVICE_NAME 已停止"
}

status_service() {
    if pgrep -f "logger_daemon.*$SERVICE_NAME" > /dev/null; then
        echo "服务 $SERVICE_NAME 正在运行"
        ps aux | grep -E "(logger_daemon|filewatcher).*$SERVICE_NAME"
    else
        echo "服务 $SERVICE_NAME 未运行"
    fi
}

case "$1" in
    start) start_service ;;
    stop) stop_service ;;
    status) status_service ;;
    restart) stop_service; sleep 2; start_service ;;
    *) echo "用法: $0 {start|stop|status|restart}" ;;
esac
```

## 🚀 性能优化

### 高吞吐量日志配置

```bash
# 优化高消息量场景
./logger_daemon \
  -f /data/logs/highvolume.log \
  -s 209715200 \    # 200MB文件
  -n 50 \           # 保留50个文件(10GB总计)
  -b 2097152 \      # 2MB缓冲区
  -t 5000 \         # 5秒刷新间隔
  -p /data/logs/highvolume.sock
```

### 低延迟日志配置

```bash
# 优化低延迟场景
./logger_daemon \
  -f /data/logs/lowlatency.log \
  -s 10485760 \     # 10MB文件
  -n 5 \            # 保留5个文件
  -b 32768 \        # 32KB缓冲区(更快刷新)
  -t 100 \          # 100毫秒刷新间隔
  -p /data/logs/lowlatency.sock
```

### 内存受限环境配置

```bash
# 优化低内存使用
./logger_daemon \
  -f /data/logs/lowmem.log \
  -s 1048576 \      # 1MB文件
  -n 2 \            # 仅保留2个文件
  -b 8192 \         # 8KB缓冲区
  -t 2000 \         # 2秒刷新间隔
  -p /data/logs/lowmem.sock
```

### 文件监控优化

```bash
# 减少不必要的事件
./filewatcher -r \
  -e modify,create \  # 仅监控修改和创建
  -d 3 \              # 限制深度
  --exclude="\.(tmp|swp|log)$" \  # 排除临时文件
  /data/project \
  "./logger_client '项目文件变化: %f'"
```

## 🛠️ 故障排除

### 常见问题诊断

#### 1. 守护进程无法启动

```bash
# 检查socket是否已存在
ls -la /tmp/logger_daemon

# 删除旧socket
rm -f /tmp/logger_daemon

# 检查权限
ls -la /data/logs/

# 使用详细输出启动
./logger_daemon -f /data/logs/test.log -v
```

#### 2. 客户端无法连接

```bash
# 检查守护进程是否运行
ps aux | grep logger_daemon

# 检查socket权限
ls -la /tmp/logger_daemon

# 使用详细输出测试
./logger_client -v "测试消息"

# 检查socket路径是否匹配
./logger_client -p /data/logs/logger.sock "测试消息"
```

#### 3. 文件监控不工作

```bash
# 检查路径是否存在
ls -la /data/config

# 使用详细输出测试
./filewatcher /data/config "echo 测试" -v

# 检查inotify限制
cat /proc/sys/fs/inotify/max_user_watches

# 增加监控限制(需要root权限)
echo 524288 > /proc/sys/fs/inotify/max_user_watches
```

#### 4. 日志文件过大

```bash
# 检查日志文件大小
ls -lh /data/logs/

# 手动清理旧日志
find /data/logs -name "*.log.*" -mtime +7 -delete

# 调整配置
./logger_daemon -s 10485760 -n 5  # 10MB文件，保留5个
```

### 调试技巧

```bash
# 使用详细模式
./logger_daemon -v -f /data/logs/debug.log
./filewatcher -v /path/to/watch "echo 测试"
./logger_client -v "调试消息"

# 检查系统资源
df -h /data/logs          # 磁盘空间
free -h                   # 内存使用
ps aux | grep logger      # 进程状态

# 测试连接
./logger_client "测试连接" && echo "连接正常" || echo "连接失败"

# 监控日志文件
tail -f /data/logs/app.log

# 检查socket连接
netstat -an | grep logger
lsof | grep logger
```

### 性能监控

```bash
# 监控日志写入性能
iostat -x 1

# 监控内存使用
top -p $(pgrep logger_daemon)

# 监控磁盘使用
watch -n 5 'df -h /data/logs'

# 监控文件描述符使用
lsof -p $(pgrep logger_daemon) | wc -l
```

## 📋 最佳实践

### 1. 部署建议

- **使用绝对路径**: 所有文件和socket路径都使用绝对路径
- **设置合适的缓冲区大小**: 根据日志量调整缓冲区大小
- **监控磁盘空间**: 使用大日志文件时监控磁盘使用
- **使用守护模式**: 生产环境部署时使用后台模式
- **实施日志轮转监控**: 防止磁盘空间耗尽

### 2. 安全考虑

- **限制日志文件访问权限**: 设置适当的文件权限
- **使用安全的socket路径**: 避免在公共目录创建socket
- **定期清理敏感日志**: 定期删除包含敏感信息的日志
- **避免记录敏感数据**: 不要在日志中记录密码等敏感信息

### 3. 性能优化

- **根据负载调整配置**: 高负载时增加缓冲区和刷新间隔
- **合理设置日志级别**: 生产环境使用warn级别以上
- **避免深层目录监控**: 限制文件监控的深度
- **使用文件过滤**: 减少不必要的文件事件处理

### 4. 监控和维护

- **实施健康检查**: 定期检查守护进程状态
- **监控资源使用**: 监控CPU、内存和磁盘使用
- **备份重要日志**: 定期备份关键日志文件
- **自动化部署**: 使用脚本自动化工具部署和管理

## 🔗 相关文档

- [LoggerAPI参考](/api/logger-api) - 程序化日志接口
- [FileWatcherAPI参考](/api/filewatcher-api) - 程序化文件监控接口
- [系统工具指南](/guide/system-tools) - 系统工具使用指南
- [开发API指南](/guide/development-api) - API开发和集成指南
- [性能优化指南](/guide/performance) - 性能优化策略
- [基础使用示例](/examples/basic-usage) - 完整集成示例