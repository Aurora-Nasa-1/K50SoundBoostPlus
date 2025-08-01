# FileWatcher使用指南

AuroraCore 提供了强大的文件监控工具，可以直接在 Android root 环境中使用，无需编译或额外依赖。

## 工具概览

### filewatcher
文件监控工具，基于 inotify 实现实时文件系统监控。

**主要特性：**
- 实时文件/目录监控
- 自定义事件响应
- 递归目录监控
- 文件过滤支持
- 低功耗设计
- 灵活的命令执行
- 后台守护进程模式

## 快速开始

### 1. 基本文件监控

```bash
# 监控单个文件
./filewatcher /data/config.txt "echo '配置文件已更改'"

# 监控目录
./filewatcher /data/logs "echo '日志目录有变化: %f'"

# 递归监控目录
./filewatcher -r /data/app "echo '应用文件变化: %f (事件: %e)'"
```

### 2. 高级监控选项

```bash
# 监控特定事件类型
./filewatcher -e create,modify /data/uploads "process_file.sh %f"

# 使用文件过滤
./filewatcher -r --include="\.(cpp|hpp)$" /data/src "echo 'C++文件变化: %f'"

# 排除特定文件
./filewatcher -r --exclude="\.(tmp|log)$" /data/project "echo '项目文件变化: %f'"
```

### 3. 后台运行

```bash
# 作为守护进程运行
./filewatcher --daemon -r /data/critical "echo '[%t] 重要文件变化: %f' >> /data/logs/critical.log"

# 输出到文件
./filewatcher -r -o /data/logs/filewatcher.log /data/app
```

## 部署建议

### 目录结构
```
/data/auroracore/
├── bin/
│   └── filewatcher
├── logs/
│   ├── filewatcher.log
│   └── changes.log
├── config/
│   └── filewatcher.conf
└── scripts/
    ├── process_upload.sh
    └── backup_trigger.sh
```

### 权限设置
```bash
# 设置执行权限
chmod 755 /data/auroracore/bin/filewatcher

# 设置日志目录权限
chmod 755 /data/auroracore/logs

# 设置脚本权限
chmod 755 /data/auroracore/scripts/*
```

### 开机自启动
创建启动脚本 `/system/etc/init.d/filewatcher`：

```bash
#!/system/bin/sh

# FileWatcher 启动脚本
FILEWATCHER_BIN="/data/auroracore/bin/filewatcher"
LOG_PATH="/data/auroracore/logs/filewatcher.log"

case "$1" in
  start)
    echo "启动 FileWatcher 服务..."
    
    # 监控应用目录
    $FILEWATCHER_BIN -r /data/app \
      "echo '[%t] 应用文件变化: %f (事件: %e)' >> $LOG_PATH" \
      --daemon
    
    # 监控配置文件
    $FILEWATCHER_BIN /data/config/app.conf \
      "echo '[%t] 配置更新，重启服务' >> $LOG_PATH && systemctl restart myapp" \
      --daemon
    
    echo "FileWatcher 服务启动完成"
    ;;
  stop)
    echo "停止 FileWatcher 服务..."
    killall filewatcher
    echo "FileWatcher 服务已停止"
    ;;
  status)
    if pgrep -f "filewatcher" > /dev/null; then
      echo "FileWatcher 服务正在运行"
      ps aux | grep filewatcher
    else
      echo "FileWatcher 服务未运行"
    fi
    ;;
  *)
    echo "用法: $0 {start|stop|status}"
    exit 1
    ;;
esac
```

## 实际应用场景

### 配置文件监控
```bash
# 监控配置变化并重启服务
./filewatcher /etc/myapp/config.json \
  "systemctl restart myapp && echo '服务已重启'" \
  --daemon

# 监控多个配置目录
./filewatcher -r /data/config \
  "sync_config.sh %f && echo '配置已同步: %f'" \
  --daemon
```

### 开发环境自动构建
```bash
# 监控源码变化并自动编译
./filewatcher -r \
  --include="\.(cpp|hpp|c|h)$" \
  /data/src \
  "cd /data && make && echo '编译完成'" \
  --daemon

# 监控测试文件变化并运行测试
./filewatcher \
  --include="test_.*\.cpp$" \
  /data/tests \
  "cd /data && make test && echo '测试完成'" \
  --daemon
```

### 文件上传处理
```bash
# 监控上传目录并处理新文件
./filewatcher -e create /data/uploads \
  "./process_upload.sh '%f'" \
  --daemon

# 监控日志目录并自动压缩大文件
./filewatcher -e create /data/logs \
  "find /data/logs -name '*.log' -size +100M -exec gzip {} \;" \
  --daemon
```

### 安全监控
```bash
# 监控系统关键目录
./filewatcher -r /system/bin \
  "echo '[%t] 系统二进制文件变化: %f' >> /var/log/security.log" \
  --daemon

# 监控重要配置文件
./filewatcher /data/system/packages.xml \
  "echo '[%t] 包数据库已更新' >> /var/log/system.log" \
  --daemon
```

## 最佳实践

### 文件监控优化
- 使用合适的监控深度（建议不超过5层）
- 使用文件过滤减少不必要的事件
- 避免监控过大的目录树
- 使用具体的事件类型过滤

### 性能优化
- 在高负载环境中限制监控范围
- 使用批量处理减少系统调用
- 监控 inotify 资源使用情况
- 定期检查文件描述符使用

### 命令执行
- 在脚本中处理并发事件
- 使用绝对路径避免路径问题
- 添加错误处理和日志记录
- 避免在命令中使用不安全的操作

## 故障排除

### 常见问题

**文件监控不工作**
```bash
# 检查路径是否存在
ls -la /data/config

# 使用详细输出测试
./filewatcher -v /data/config "echo 测试"

# 检查 inotify 限制
cat /proc/sys/fs/inotify/max_user_watches

# 增加监控限制（需要 root 权限）
echo 524288 > /proc/sys/fs/inotify/max_user_watches
```

**权限问题**
```bash
# 检查文件权限
ls -la /data/config

# 检查执行权限
ls -la ./filewatcher

# 修复权限
chmod +x ./filewatcher
chmod 755 /data/config
```

**性能问题**
```bash
# 检查监控的文件数量
find /data/project -type f | wc -l

# 使用文件过滤减少监控范围
./filewatcher -r \
  --include="\.(cpp|hpp|h)$" \
  /data/project \
  "echo '源文件变化: %f'"

# 限制监控深度
./filewatcher -r -d 2 /data/project "echo '文件变化: %f'"
```

**进程管理**
```bash
# 查看运行中的 filewatcher 进程
ps aux | grep filewatcher

# 优雅停止 filewatcher
killall -TERM filewatcher

# 强制停止
killall -KILL filewatcher

# 检查进程状态
pgrep -f "filewatcher"
```

### 调试技巧

```bash
# 启用详细输出
./filewatcher -v /path/to/watch "echo 测试"

# 测试基本功能
./filewatcher /tmp "echo '测试成功: %f'" &
touch /tmp/test.txt
killall filewatcher

# 监控输出文件
tail -f /data/logs/filewatcher.log

# 检查系统资源
df -h /data                   # 磁盘空间
free -h                       # 内存使用
ps aux | grep filewatcher     # 进程状态

# 检查文件描述符使用
lsof -p $(pgrep filewatcher) | wc -l
```

## 高级配置

### 配置文件示例

创建配置文件 `/data/auroracore/config/filewatcher.conf`：

```bash
# FileWatcher 配置文件

# 监控路径
WATCH_PATH="/data/app"

# 监控选项
RECURSIVE="true"
DEPTH="3"
EVENTS="create,modify,delete"

# 文件过滤
INCLUDE_PATTERN="\.(cpp|hpp|h|conf|json)$"
EXCLUDE_PATTERN="\.(tmp|bak|swp|log)$"

# 输出设置
OUTPUT_FILE="/data/logs/filewatcher.log"
VERBOSE="false"
QUIET="false"

# 执行命令
COMMAND="echo '[%t] 文件变化: %f (事件: %e)' >> /data/logs/changes.log"

# 守护进程模式
DAEMON="true"
```

### 服务管理脚本

创建服务管理脚本 `/data/auroracore/scripts/filewatcher_service.sh`：

```bash
#!/bin/bash
# FileWatcher 服务管理脚本

SERVICE_NAME="filewatcher"
BIN_PATH="/data/auroracore/bin/filewatcher"
LOG_PATH="/data/auroracore/logs/${SERVICE_NAME}.log"
PID_FILE="/data/auroracore/run/${SERVICE_NAME}.pid"
CONFIG_FILE="/data/auroracore/config/filewatcher.conf"

# 加载配置文件
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

start_service() {
    echo "启动 FileWatcher 服务"
    
    # 创建必要目录
    mkdir -p /data/auroracore/logs /data/auroracore/run
    
    # 构建命令参数
    ARGS=""
    [ "$RECURSIVE" = "true" ] && ARGS="$ARGS -r"
    [ -n "$DEPTH" ] && ARGS="$ARGS -d $DEPTH"
    [ -n "$EVENTS" ] && ARGS="$ARGS -e $EVENTS"
    [ -n "$INCLUDE_PATTERN" ] && ARGS="$ARGS --include='$INCLUDE_PATTERN'"
    [ -n "$EXCLUDE_PATTERN" ] && ARGS="$ARGS --exclude='$EXCLUDE_PATTERN'"
    [ "$VERBOSE" = "true" ] && ARGS="$ARGS -v"
    [ "$QUIET" = "true" ] && ARGS="$ARGS -q"
    [ -n "$OUTPUT_FILE" ] && ARGS="$ARGS -o '$OUTPUT_FILE'"
    [ "$DAEMON" = "true" ] && ARGS="$ARGS --daemon"
    
    # 启动服务
    eval "$BIN_PATH $ARGS '$WATCH_PATH' '$COMMAND'"
    
    echo $! > "$PID_FILE"
    echo "FileWatcher 服务启动完成"
}

stop_service() {
    echo "停止 FileWatcher 服务"
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE")
        rm -f "$PID_FILE"
    else
        killall filewatcher
    fi
    echo "FileWatcher 服务已停止"
}

status_service() {
    if pgrep -f "filewatcher" > /dev/null; then
        echo "FileWatcher 服务正在运行"
        ps aux | grep filewatcher | grep -v grep
    else
        echo "FileWatcher 服务未运行"
    fi
}

reload_service() {
    echo "重新加载 FileWatcher 服务"
    stop_service
    sleep 2
    start_service
}

case "$1" in
    start) start_service ;;
    stop) stop_service ;;
    status) status_service ;;
    restart) reload_service ;;
    *) echo "用法: $0 {start|stop|status|restart}" ;;
esac
```

## 相关文档

- [开发API](/zh/guide/development-api) - 了解如何在代码中使用 API
- [FileWatcher API](/zh/api/filewatcher-api) - 详细的 API 文档
- [命令行工具](/zh/api/cli-tools) - 完整的命令行参考
- [构建指南](/zh/guide/building) - 编译和构建说明