# 系统工具

AuroraCore 提供了三个核心命令行工具，可以直接在 Android root 环境中使用，无需编译或额外依赖。

## 工具概览

### logger_daemon
日志守护进程，提供高性能的日志记录服务。

**主要特性：**
- 守护进程架构，后台运行
- 自动日志轮转
- 可配置缓冲区大小
- 支持多客户端连接
- Unix Domain Socket 通信

### logger_client
日志客户端，用于向守护进程发送日志消息。

**主要特性：**
- 多种日志级别（DEBUG, INFO, WARN, ERROR）
- 批量日志发送
- 条件日志记录
- 简单易用的命令行接口

### filewatcher
文件监控工具，基于 inotify 实现实时文件系统监控。

**主要特性：**
- 实时文件/目录监控
- 自定义事件响应
- 递归目录监控
- 低功耗设计
- 灵活的命令执行

## 快速开始

### 1. 启动日志守护进程

```bash
# 启动守护进程
./logger_daemon -f /data/app.log -s 10485760 -b 8192

# 参数说明：
# -f: 日志文件路径
# -s: 最大文件大小（字节）
# -b: 缓冲区大小（字节）
```

### 2. 发送日志消息

```bash
# 发送不同级别的日志
./logger_client -l INFO -m "应用程序启动"
./logger_client -l ERROR -m "发生错误"
./logger_client -l DEBUG -m "调试信息"
```

### 3. 监控文件变化

```bash
# 监控单个文件
./filewatcher -p /data/config.txt -c "echo '配置文件已更改'"

# 监控目录（递归）
./filewatcher -p /data/logs -r -c "echo '日志目录有变化: %f'"
```

## 部署建议

### 目录结构
```
/data/auroracore/
├── bin/
│   ├── logger_daemon
│   ├── logger_client
│   └── filewatcher
├── logs/
│   └── app.log
└── config/
    └── daemon.conf
```

### 权限设置
```bash
# 设置执行权限
chmod 755 /data/auroracore/bin/*

# 设置日志目录权限
chmod 755 /data/auroracore/logs
```

### 开机自启动
创建启动脚本 `/system/etc/init.d/auroracore`：

```bash
#!/system/bin/sh

# AuroraCore 启动脚本
case "$1" in
  start)
    echo "启动 AuroraCore 守护进程..."
    /data/auroracore/bin/logger_daemon -f /data/auroracore/logs/system.log -s 10485760 -b 8192 &
    ;;
  stop)
    echo "停止 AuroraCore 守护进程..."
    pkill logger_daemon
    ;;
  *)
    echo "用法: $0 {start|stop}"
    exit 1
    ;;
esac
```

## 最佳实践

### 日志管理
- 使用合适的日志文件大小限制（建议 10-50MB）
- 定期清理旧日志文件
- 根据存储空间调整缓冲区大小

### 文件监控
- 避免监控过大的目录树
- 使用具体的事件类型过滤
- 在脚本中处理并发事件

### 性能优化
- 在高负载环境中增加缓冲区大小
- 使用批量日志记录减少系统调用
- 监控守护进程的内存使用情况

## 故障排除

### 常见问题

**守护进程启动失败**
```bash
# 检查权限
ls -la /data/auroracore/bin/logger_daemon

# 检查日志目录
ls -la /data/auroracore/logs/

# 检查进程
ps | grep logger_daemon
```

**客户端连接失败**
```bash
# 检查 socket 文件
ls -la /tmp/logger_daemon.sock

# 测试连接
./logger_client -l INFO -m "测试消息"
```

**文件监控不工作**
```bash
# 检查 inotify 限制
cat /proc/sys/fs/inotify/max_user_watches

# 增加监控限制（如果需要）
echo 65536 > /proc/sys/fs/inotify/max_user_watches
```

## 相关文档

- [开发API](/zh/guide/development-api) - 了解如何在代码中使用 API
- [API参考](/zh/api/) - 详细的 API 文档
- [命令行工具](/zh/api/cli-tools) - 完整的命令行参考