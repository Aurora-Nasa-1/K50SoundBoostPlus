# 命令行工具参考

AuroraCore 提供强大的命令行工具，用于系统级日志记录和文件监控。这些工具专为 Android root 环境设计，提供高性能、基于守护进程的日志解决方案。

## 概述

命令行工具包括：

- **logger_daemon**: 高性能日志守护进程，支持自动轮转
- **logger_client**: 轻量级客户端，用于向守护进程发送日志消息
- **filewatcher**: 独立的文件监控工具，支持自定义命令执行

## logger_daemon

日志守护进程提供集中式、高性能的日志管理，具有自动文件轮转和智能缓冲功能。

### 语法

```bash
logger_daemon [选项]
```

### 选项

| 选项 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `-f, --file <路径>` | 日志文件路径（必需） | - | `-f /data/local/tmp/app.log` |
| `-s, --size <字节>` | 最大文件大小（字节） | 10485760 (10MB) | `-s 5242880` (5MB) |
| `-n, --number <数量>` | 最大日志文件数量 | 5 | `-n 3` |
| `-b, --buffer <字节>` | 缓冲区大小（字节） | 65536 (64KB) | `-b 131072` (128KB) |
| `-p, --socket <路径>` | Unix 套接字路径 | `/tmp/logger_daemon` | `-p /data/local/tmp/logger.sock` |
| `-d, --daemon` | 以守护进程运行（后台） | false | `-d` |
| `-v, --verbose` | 启用详细输出 | false | `-v` |
| `-h, --help` | 显示帮助信息 | - | `-h` |

### 基本用法

#### 启动基本守护进程

```bash
# 使用默认设置启动守护进程
./logger_daemon -f /data/local/tmp/app.log
```

#### 使用自定义配置启动

```bash
# 使用自定义文件大小和数量启动
./logger_daemon \
  -f /data/local/tmp/myapp.log \
  -s 20971520 \
  -n 10 \
  -b 131072 \
  -p /data/local/tmp/myapp.sock
```

#### 作为后台守护进程运行

```bash
# 作为后台守护进程启动
./logger_daemon -d \
  -f /data/local/tmp/service.log \
  -s 50331648 \
  -n 5
```

### 高级配置

#### 高性能设置

```bash
# 针对高吞吐量日志记录优化
./logger_daemon \
  -f /data/local/tmp/highperf.log \
  -s 104857600 \    # 每个文件 100MB
  -n 20 \           # 保留 20 个文件（总计 2GB）
  -b 1048576 \      # 1MB 缓冲区
  -p /data/local/tmp/highperf.sock
```

#### 内存受限设置

```bash
# 针对低内存使用优化
./logger_daemon \
  -f /data/local/tmp/lowmem.log \
  -s 1048576 \      # 每个文件 1MB
  -n 3 \            # 仅保留 3 个文件
  -b 16384 \        # 16KB 缓冲区
  -p /data/local/tmp/lowmem.sock
```

### 文件轮转

守护进程在文件达到指定大小时自动轮转日志文件：

```
app.log         (当前活动日志文件)
app.log.1       (上一个日志文件)
app.log.2       (更旧的日志文件)
app.log.3       (最旧的日志文件)
```

**轮转过程：**
1. 当 `app.log` 达到最大大小时，重命名为 `app.log.1`
2. 之前的 `app.log.1` 变成 `app.log.2`，以此类推
3. 超出最大数量的文件被删除
4. 创建新的 `app.log` 用于当前日志记录

### 进程管理

#### 检查守护进程是否运行

```bash
# 检查进程
ps aux | grep logger_daemon

# 检查套接字
ls -la /tmp/logger_daemon
```

#### 停止守护进程

```bash
# 发送 SIGTERM 进行优雅关闭
killall logger_daemon

# 或查找 PID 并终止
pkill -f logger_daemon
```

#### 重启守护进程

```bash
# 停止现有守护进程
killall logger_daemon
sleep 1

# 启动新守护进程
./logger_daemon -f /data/local/tmp/app.log -d
```

## logger_client

用于向守护进程发送日志消息的轻量级客户端。

### 语法

```bash
logger_client [选项] <消息>
logger_client [选项] -m <消息>
```

### 选项

| 选项 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `-m, --message <文本>` | 要发送的日志消息 | - | `-m "应用程序已启动"` |
| `-p, --socket <路径>` | Unix 套接字路径 | `/tmp/logger_daemon` | `-p /data/local/tmp/app.sock` |
| `-t, --timeout <毫秒>` | 连接超时时间（毫秒） | 5000 | `-t 10000` |
| `-v, --verbose` | 启用详细输出 | false | `-v` |
| `-h, --help` | 显示帮助信息 | - | `-h` |

### 基本用法

#### 发送简单消息

```bash
# 发送消息（位置参数）
./logger_client "应用程序启动成功"

# 发送消息（使用标志）
./logger_client -m "用户登录：admin"
```

#### 发送到自定义套接字

```bash
# 发送到特定守护进程实例
./logger_client \
  -p /data/local/tmp/myapp.sock \
  -m "自定义守护进程消息"
```

#### 使用超时发送

```bash
# 使用自定义超时发送
./logger_client \
  -t 10000 \
  -m "10秒超时的消息"
```

### 高级用法

#### 脚本化日志记录

```bash
#!/bin/bash
# log_script.sh

LOG_SOCKET="/data/local/tmp/script.sock"

log_info() {
    ./logger_client -p "$LOG_SOCKET" -m "[信息] $1"
}

log_error() {
    ./logger_client -p "$LOG_SOCKET" -m "[错误] $1"
}

# 使用方法
log_info "脚本已启动"
log_error "出现错误"
log_info "脚本已完成"
```

#### 批量日志记录

```bash
# 发送多条消息
for i in {1..10}; do
    ./logger_client "处理项目 $i"
    sleep 0.1
done
```

#### 条件日志记录

```bash
# 基于条件记录日志
if [ $? -eq 0 ]; then
    ./logger_client "操作成功"
else
    ./logger_client "操作失败，错误代码 $?"
fi
```

### 错误处理

客户端处理各种错误情况：

#### 连接错误

```bash
# 如果守护进程未运行
$ ./logger_client "测试消息"
错误：无法连接到守护进程套接字

# 检查守护进程状态
$ ps aux | grep logger_daemon
```

#### 套接字权限错误

```bash
# 如果套接字权限错误
$ ./logger_client "测试消息"
错误：权限被拒绝

# 修复套接字权限
$ chmod 666 /tmp/logger_daemon
```

#### 超时错误

```bash
# 如果守护进程无响应
$ ./logger_client -t 1000 "测试消息"
错误：1000毫秒后连接超时
```

## filewatcher

独立的文件监控工具，支持自定义命令执行。

### 语法

```bash
filewatcher <路径> <命令> [选项]
```

### 参数

| 参数 | 描述 | 示例 |
|------|------|------|
| `<路径>` | 要监控的文件或目录 | `/data/config` |
| `<命令>` | 文件事件时执行的命令 | `"echo '文件已更改：%f'"` |

### 选项

| 选项 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `-e, --events <掩码>` | 事件掩码（逗号分隔） | `modify,create,delete` | `-e modify,create` |
| `-r, --recursive` | 递归监控子目录 | false | `-r` |
| `-d, --daemon` | 以守护进程运行（后台） | false | `-d` |
| `-v, --verbose` | 启用详细输出 | false | `-v` |
| `-h, --help` | 显示帮助信息 | - | `-h` |

### 事件类型

| 事件 | 描述 | 使用场景 |
|------|------|----------|
| `modify` | 文件内容已更改 | 配置更新 |
| `create` | 文件/目录已创建 | 新文件检测 |
| `delete` | 文件/目录已删除 | 清理监控 |
| `move` | 文件/目录已移动 | 文件组织 |
| `attrib` | 属性已更改 | 权限更改 |
| `access` | 文件已访问 | 使用跟踪 |

### 命令占位符

命令字符串支持这些占位符：

| 占位符 | 描述 | 示例 |
|--------|------|------|
| `%f` | 完整文件路径 | `/data/config/app.conf` |
| `%d` | 目录路径 | `/data/config` |
| `%n` | 仅文件名 | `app.conf` |
| `%e` | 事件类型 | `modify` |

### 基本用法

#### 监控单个文件

```bash
# 监控配置文件
./filewatcher /data/config/app.conf "echo '配置已更改：%f'"
```

#### 监控目录

```bash
# 监控整个目录
./filewatcher /data/logs "echo '日志事件：%e 在 %n'"
```

#### 自定义事件

```bash
# 仅监控文件创建
./filewatcher \
  /data/incoming \
  "process_file.sh %f" \
  -e create
```

### 高级用法

#### 递归目录监控

```bash
# 递归监控目录树
./filewatcher \
  /data/project \
  "echo '项目文件 %e：%f'" \
  -r -v
```

#### 后台监控

```bash
# 作为守护进程运行
./filewatcher \
  /data/critical \
  "alert_system.sh '%f 被 %e'" \
  -d -e modify,delete
```

#### 复杂命令执行

```bash
# 执行复杂的 shell 命令
./filewatcher \
  /data/uploads \
  "if [ '%e' = 'create' ]; then process_upload.sh '%f'; fi" \
  -e create
```

#### 日志文件监控

```bash
# 监控日志文件并发送警报
./filewatcher \
  /var/log \
  "./logger_client '日志文件 %n 被 %e'" \
  -e modify,create
```

### 集成示例

#### 系统配置监控器

```bash
#!/bin/bash
# config_monitor.sh

# 启动日志守护进程
./logger_daemon -f /data/local/tmp/config_monitor.log -d

# 监控系统配置
./filewatcher \
  /data/config \
  "./logger_client '检测到配置更改：%f (%e)'" \
  -r -d

echo "配置监控已启动"
```

#### 备份触发器

```bash
# 重要文件更改时触发备份
./filewatcher \
  /data/important \
  "backup_script.sh '%d' && ./logger_client '由 %f 触发备份'" \
  -e modify,create -r
```

#### 安全监控

```bash
# 监控敏感目录
./filewatcher \
  /data/secure \
  "./logger_client '安全：%f 在 $(date) 被 %e'" \
  -e create,delete,modify,attrib -v
```

## 集成模式

### 模式 1：应用程序日志记录

```bash
# 为应用程序启动专用守护进程
./logger_daemon \
  -f /data/local/tmp/myapp.log \
  -s 10485760 \
  -n 5 \
  -p /data/local/tmp/myapp.sock \
  -d

# 应用程序发送日志
./logger_client -p /data/local/tmp/myapp.sock "应用已启动"
./logger_client -p /data/local/tmp/myapp.sock "处理请求中"
./logger_client -p /data/local/tmp/myapp.sock "应用已完成"
```

### 模式 2：系统监控

```bash
# 启动系统日志记录器
./logger_daemon \
  -f /data/local/tmp/system.log \
  -s 52428800 \
  -n 10 \
  -p /data/local/tmp/system.sock \
  -d

# 监控多个目录
./filewatcher \
  /data/config \
  "./logger_client -p /data/local/tmp/system.sock '配置：%f %e'" \
  -r -d

./filewatcher \
  /data/critical \
  "./logger_client -p /data/local/tmp/system.sock '关键：%f %e'" \
  -d
```

### 模式 3：服务管理

```bash
#!/bin/bash
# service_manager.sh

SERVICE_NAME="myservice"
LOG_PATH="/data/local/tmp/${SERVICE_NAME}.log"
SOCK_PATH="/data/local/tmp/${SERVICE_NAME}.sock"

start_service() {
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
        -e modify -d
}

stop_service() {
    ./logger_client -p "$SOCK_PATH" "服务 $SERVICE_NAME 正在停止"
    killall logger_daemon
    killall filewatcher
}

case "$1" in
    start) start_service ;;
    stop) stop_service ;;
    *) echo "用法：$0 {start|stop}" ;;
esac
```

## 性能调优

### 高吞吐量日志记录

```bash
# 针对高消息量优化
./logger_daemon \
  -f /data/local/tmp/highvolume.log \
  -s 209715200 \    # 200MB 文件
  -n 50 \           # 保留 50 个文件（总计 10GB）
  -b 2097152 \      # 2MB 缓冲区
  -p /data/local/tmp/highvolume.sock
```

### 低延迟日志记录

```bash
# 针对低延迟优化
./logger_daemon \
  -f /data/local/tmp/lowlatency.log \
  -s 10485760 \     # 10MB 文件
  -n 5 \            # 保留 5 个文件
  -b 32768 \        # 32KB 缓冲区（更小以便更快刷新）
  -p /data/local/tmp/lowlatency.sock
```

### 内存受限环境

```bash
# 针对低内存使用优化
./logger_daemon \
  -f /data/local/tmp/lowmem.log \
  -s 1048576 \      # 1MB 文件
  -n 2 \            # 仅保留 2 个文件
  -b 8192 \         # 8KB 缓冲区
  -p /data/local/tmp/lowmem.sock
```

## 故障排除

### 常见问题

#### 守护进程无法启动

```bash
# 检查套接字是否已存在
ls -la /tmp/logger_daemon

# 删除过期套接字
rm -f /tmp/logger_daemon

# 检查权限
ls -la /data/local/tmp/

# 使用详细输出启动
./logger_daemon -f /data/local/tmp/test.log -v
```

#### 客户端无法连接

```bash
# 检查守护进程是否运行
ps aux | grep logger_daemon

# 检查套接字权限
ls -la /tmp/logger_daemon

# 使用详细输出测试
./logger_client -v "测试消息"
```

#### 文件监控器不工作

```bash
# 检查路径是否存在
ls -la /data/config

# 使用详细输出测试
./filewatcher /data/config "echo test" -v

# 检查 inotify 限制
cat /proc/sys/fs/inotify/max_user_watches
```

### 调试模式

```bash
# 在前台运行守护进程并输出详细信息
./logger_daemon -f /data/local/tmp/debug.log -v

# 运行文件监控器并输出详细信息
./filewatcher /data/test "echo %f" -v

# 测试客户端连接
./logger_client -v "调试消息"
```

## 最佳实践

1. **使用绝对路径** 用于所有文件和套接字路径
2. **根据日志量设置适当的缓冲区大小**
3. **使用大型日志文件时监控磁盘空间**
4. **在生产部署中使用守护进程模式**
5. **实施日志轮转监控** 以防止磁盘满
6. **在部署环境中测试套接字权限**
7. **使用有意义的日志消息** 包含上下文信息
8. **使用进程监控工具监控守护进程健康状况**

## 另请参阅

- [Logger API](/zh/api/logger-api) - 程序化日志记录接口
- [FileWatcher API](/zh/api/filewatcher-api) - 程序化文件监控
- [示例](/zh/examples/basic-usage) - 完整集成示例
- [性能指南](/zh/guide/performance) - 优化策略