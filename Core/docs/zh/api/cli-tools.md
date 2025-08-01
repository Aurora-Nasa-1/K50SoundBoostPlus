# 命令行工具参考

AuroraCore 提供强大的文件监控命令行工具，专为 Android root 环境设计，提供高性能的文件系统监控解决方案。

## 概述

命令行工具包括：

- **filewatcher**: 独立的文件监控工具，支持自定义命令执行

## filewatcher

文件监控工具提供实时文件系统监控，基于 inotify 机制，支持递归目录监控和自定义事件处理。

### 语法

```bash
filewatcher <监控路径> <执行命令> [选项]
```

### 参数说明

| 参数 | 描述 | 示例 |
|------|------|------|
| `<监控路径>` | 要监控的文件或目录 | `/data/config` |
| `<执行命令>` | 文件事件发生时执行的命令 | `"echo '文件变化: %f'"` |

### 选项

| 选项 | 描述 | 默认值 | 示例 |
|------|------|--------|------|
| `-r, --recursive` | 递归监控子目录 | false | `-r` |
| `-d, --depth <数字>` | 最大监控深度（-1为无限制） | -1 | `-d 3` |
| `-e, --events <事件>` | 监控的事件类型 | all | `-e create,modify` |
| `-x, --exclude <模式>` | 排除的文件模式（正则表达式） | - | `--exclude="\.(tmp|log)$"` |
| `-i, --include <模式>` | 包含的文件模式（正则表达式） | - | `--include="\.(cpp|hpp)$"` |
| `-q, --quiet` | 静默模式，不输出事件信息 | false | `-q` |
| `-v, --verbose` | 详细输出模式 | false | `-v` |
| `-o, --output <路径>` | 输出文件路径 | - | `-o /data/logs/watch.log` |
| `--daemon` | 后台运行模式 | false | `--daemon` |
| `-h, --help` | 显示帮助信息 | - | `-h` |
| `--version` | 显示版本信息 | - | `--version` |

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

### 基本用法

#### 监控单个文件

```bash
# 监控配置文件变化
./filewatcher /data/config/app.conf "echo '配置文件已更新: %f'"
```

#### 监控目录

```bash
# 监控目录中的所有文件
./filewatcher /data/logs "echo '日志文件变化: %f (事件: %e)'"
```

#### 递归监控

```bash
# 递归监控整个应用目录
./filewatcher -r /data/app "echo '应用文件变化: %f (事件: %e)'"
```

#### 监控特定事件

```bash
# 仅监控文件创建和修改
./filewatcher -e create,modify /data/uploads "echo '新文件: %f'"
```

### 高级用法

#### 使用文件过滤

```bash
# 仅监控 C++ 源文件
./filewatcher -r \
  --include="\.(cpp|hpp|h)$" \
  /data/src \
  "echo 'C++源文件变化: %f'"

# 排除临时文件
./filewatcher -r \
  --exclude="\.(tmp|bak|swp)$" \
  /data/project \
  "echo '项目文件变化: %f'"
```

#### 限制监控深度

```bash
# 仅监控前3层目录
./filewatcher -r -d 3 /data/project "echo '文件变化: %f'"
```

#### 静默模式

```bash
# 静默运行，仅执行命令
./filewatcher -q /data/config \
  "echo '配置更新' >> /data/logs/config.log"
```

#### 输出到文件

```bash
# 将监控事件输出到文件
./filewatcher -r -o /data/logs/filewatcher.log /data/app
```

#### 后台运行

```bash
# 作为守护进程运行
./filewatcher --daemon -r /data/critical \
  "echo '[%t] 重要文件变化: %f' >> /data/logs/critical.log"
```

### 实际应用场景

#### 配置文件监控

```bash
# 监控配置文件变化并重启服务
./filewatcher /etc/myapp/config.json \
  "systemctl restart myapp && echo '服务已重启'"
```

#### 开发环境自动构建

```bash
# 监控源码变化并自动编译
./filewatcher -r \
  --include="\.(cpp|hpp|c|h)$" \
  /data/src \
  "cd /data && make && echo '编译完成'"
```

#### 日志管理

```bash
# 监控日志目录并自动压缩大文件
./filewatcher -e create /data/logs \
  "find /data/logs -name '*.log' -size +100M -exec gzip {} \;"
```

#### 文件上传处理

```bash
# 监控上传目录并处理新文件
./filewatcher -e create /data/uploads \
  "./process_upload.sh '%f'"
```

#### 安全监控

```bash
# 监控重要系统文件变化
./filewatcher -r /etc/important \
  "echo '[%t] 安全警告: %f 被修改 (事件: %e)' >> /var/log/security.log"
```

## 高级使用模式

### 完整监控解决方案

```bash
#!/bin/bash
# complete_monitoring.sh

# 监控应用目录
./filewatcher -r /data/app \
  "echo '[%t] 应用文件变化: %f (事件: %e)' >> /data/logs/app_changes.log" \
  --daemon

echo "应用目录监控已启动"

# 监控配置文件
./filewatcher /data/config/app.conf \
  "echo '[%t] 配置更新，重启服务' >> /data/logs/config.log && systemctl restart myapp" \
  --daemon

echo "配置文件监控已启动"

# 监控日志目录并自动清理
./filewatcher -e create /data/logs \
  "find /data/logs -name '*.log' -size +100M -exec gzip {} \;" \
  --daemon

echo "日志清理监控已启动"
echo "完整监控系统部署完成"
```

### 开发环境监控

```bash
#!/bin/bash
# dev_monitoring.sh

# 监控源码变化并自动构建
./filewatcher -r \
  --include="\.(cpp|hpp|h|cmake)$" \
  /data/project \
  "cd /data/project && make -j4 && echo '[%t] 构建完成: %f' >> /data/logs/build.log" \
  --daemon

# 监控测试文件变化并运行测试
./filewatcher \
  --include="test_.*\.cpp$" \
  /data/project/tests \
  "cd /data/project && make test && echo '[%t] 测试完成: %f' >> /data/logs/test.log" \
  --daemon

echo "开发环境监控已启动"
```

### 服务管理模式

```bash
#!/bin/bash
# service_manager.sh

SERVICE_NAME="myservice"
LOG_PATH="/data/logs/${SERVICE_NAME}_filewatcher.log"

start_service() {
    echo "启动文件监控服务: $SERVICE_NAME"
    
    # 启动配置文件监控
    ./filewatcher \
        "/data/config/${SERVICE_NAME}.conf" \
        "echo '[%t] 配置已重新加载' >> '$LOG_PATH'" \
        -e modify --daemon
    
    # 启动应用目录监控
    ./filewatcher -r \
        "/data/app/${SERVICE_NAME}" \
        "echo '[%t] 应用文件变化: %f (事件: %e)' >> '$LOG_PATH'" \
        --daemon
    
    echo "文件监控服务 $SERVICE_NAME 启动完成"
}

stop_service() {
    echo "停止文件监控服务: $SERVICE_NAME"
    killall filewatcher
    echo "文件监控服务 $SERVICE_NAME 已停止"
}

status_service() {
    if pgrep -f "filewatcher.*$SERVICE_NAME" > /dev/null; then
        echo "文件监控服务 $SERVICE_NAME 正在运行"
        ps aux | grep -E "filewatcher.*$SERVICE_NAME"
    else
        echo "文件监控服务 $SERVICE_NAME 未运行"
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

## 性能优化

### 减少监控开销

```bash
# 仅监控必要的事件类型
./filewatcher -r \
  -e modify,create \
  -d 3 \
  --exclude="\.(tmp|swp|log)$" \
  /data/project \
  "echo '项目文件变化: %f'"
```

### 高性能配置

```bash
# 针对配置文件的高效监控
./filewatcher -r \
  --include="\.(conf|json|xml|yaml)$" \
  -e modify \
  /data/config \
  "echo '配置文件更新: %f'"
```

### 批量处理

```bash
# 使用批量处理脚本
./filewatcher -r /data/uploads \
  "echo '%f' >> /tmp/upload_queue.txt" \
  --daemon

# 定期处理队列
(while true; do
    if [ -s /tmp/upload_queue.txt ]; then
        ./batch_process.sh /tmp/upload_queue.txt
        > /tmp/upload_queue.txt
    fi
    sleep 10
done) &
```

## 故障排除

### 常见问题

#### 1. 文件监控不工作

```bash
# 检查路径是否存在
ls -la /data/config

# 使用详细输出测试
./filewatcher /data/config "echo 测试" -v

# 检查 inotify 限制
cat /proc/sys/fs/inotify/max_user_watches

# 增加监控限制（需要 root 权限）
echo 524288 > /proc/sys/fs/inotify/max_user_watches
```

#### 2. 权限问题

```bash
# 检查文件权限
ls -la /data/config

# 检查执行权限
ls -la ./filewatcher

# 修复权限
chmod +x ./filewatcher
chmod 755 /data/config
```

#### 3. 性能问题

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

### 调试技巧

```bash
# 使用详细模式
./filewatcher -v /path/to/watch "echo 测试"

# 检查系统资源
df -h /data                   # 磁盘空间
free -h                       # 内存使用
ps aux | grep filewatcher     # 进程状态

# 测试基本功能
./filewatcher /tmp "echo '测试成功: %f'" &
touch /tmp/test.txt
killall filewatcher

# 监控输出文件
tail -f /data/logs/filewatcher.log

# 检查文件描述符使用
lsof -p $(pgrep filewatcher) | wc -l
```

### 性能监控

```bash
# 监控 CPU 使用
top -p $(pgrep filewatcher)

# 监控内存使用
ps -o pid,vsz,rss,comm -p $(pgrep filewatcher)

# 监控文件描述符
watch -n 5 'lsof -p $(pgrep filewatcher) | wc -l'

# 监控 inotify 使用
watch -n 5 'cat /proc/sys/fs/inotify/max_user_watches'
```

## 最佳实践

### 1. 部署建议

- **使用绝对路径**: 所有文件路径都使用绝对路径
- **合理设置监控深度**: 避免监控过深的目录结构
- **使用文件过滤**: 减少不必要的文件事件处理
- **使用守护模式**: 生产环境部署时使用后台模式
- **监控系统资源**: 定期检查 inotify 限制和文件描述符使用

### 2. 安全考虑

- **限制监控路径**: 仅监控必要的目录和文件
- **使用安全的执行命令**: 避免在命令中使用不安全的操作
- **设置适当的权限**: 确保 filewatcher 有足够但不过度的权限
- **避免监控敏感目录**: 不要监控包含敏感信息的目录

### 3. 性能优化

- **使用事件过滤**: 仅监控需要的事件类型
- **限制监控范围**: 使用 include/exclude 模式过滤文件
- **避免深层递归**: 限制递归监控的深度
- **批量处理**: 对于高频事件，考虑批量处理

### 4. 监控和维护

- **实施健康检查**: 定期检查 filewatcher 进程状态
- **监控资源使用**: 监控 CPU、内存和文件描述符使用
- **日志轮转**: 定期清理和轮转输出日志
- **自动化部署**: 使用脚本自动化工具部署和管理

## 相关文档

- [FileWatcher API 参考](/zh/api/filewatcher-api) - 程序化文件监控接口
- [系统工具指南](/zh/guide/system-tools) - 系统工具使用指南
- [开发 API 指南](/zh/guide/development-api) - API 开发和集成指南
- [构建指南](/zh/guide/building) - 编译和构建说明