# CLI工具参考 (CLI Tools Reference)

AuroraCore提供高性能的文件监控命令行工具，可直接部署到Android设备使用。这个工具是预编译的二进制文件，无需额外依赖。

## 📦 工具概览

| 工具 | 功能 | 主要用途 |
|------|------|----------|
| `filewatcher` | 文件监控工具 | 实时监控文件系统变化 |

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
  "echo '配置文件变化: %f'"

# 输出到文件
./filewatcher -r -o /data/logs/filewatcher.log /data/app

# 后台运行
./filewatcher --daemon -r /data/critical \
  "echo '重要文件变化: %f (事件: %e)'"
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

# 监控重要文件变化并记录
./filewatcher -r /data/important \
  "echo '[%t] 重要文件变化: %f (事件: %e)' >> /data/logs/file_changes.log"
```

## 🔄 高级使用

### 完整监控方案

```bash
#!/bin/bash
# complete_monitoring.sh

# 监控应用目录并记录变化
./filewatcher -r /data/app \
  "echo '[%t] 应用文件变化: %f (事件: %e)' >> /data/logs/app_changes.log" \
  --daemon

echo "应用目录监控已启动"

# 监控配置文件并重启服务
./filewatcher /data/config/app.conf \
  "echo '[%t] 配置文件更新，重启服务' >> /data/logs/config_changes.log && systemctl restart myapp" \
  --daemon

echo "配置文件监控已启动"

# 监控日志目录并清理
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

## 🚀 性能优化

### 文件监控优化

```bash
# 减少不必要的事件
./filewatcher -r \
  -e modify,create \  # 仅监控修改和创建
  -d 3 \              # 限制深度
  --exclude="\.(tmp|swp|log)$" \  # 排除临时文件
  /data/project \
  "echo '项目文件变化: %f'"

# 高性能配置
./filewatcher -r \
  --include="\.(conf|json|xml)$" \  # 仅监控配置文件
  -e modify \
  /data/config \
  "echo '配置文件更新: %f'"
```

## 🛠️ 故障排除

### 常见问题诊断

#### 1. 文件监控不工作

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
# 监控CPU使用
top -p $(pgrep filewatcher)

# 监控内存使用
ps -o pid,vsz,rss,comm -p $(pgrep filewatcher)

# 监控文件描述符
watch -n 5 'lsof -p $(pgrep filewatcher) | wc -l'

# 监控inotify使用
watch -n 5 'cat /proc/sys/fs/inotify/max_user_watches'
```

## 📋 最佳实践

### 1. 部署建议

- **使用绝对路径**: 所有文件路径都使用绝对路径
- **合理设置监控深度**: 避免监控过深的目录结构
- **使用文件过滤**: 减少不必要的文件事件处理
- **使用守护模式**: 生产环境部署时使用后台模式
- **监控系统资源**: 定期检查inotify限制和文件描述符使用

### 2. 安全考虑

- **限制监控路径**: 仅监控必要的目录和文件
- **使用安全的执行命令**: 避免在命令中使用不安全的操作
- **设置适当的权限**: 确保filewatcher有足够但不过度的权限
- **避免监控敏感目录**: 不要监控包含敏感信息的目录

### 3. 性能优化

- **使用事件过滤**: 仅监控需要的事件类型
- **限制监控范围**: 使用include/exclude模式过滤文件
- **避免深层递归**: 限制递归监控的深度
- **批量处理**: 对于高频事件，考虑批量处理

### 4. 监控和维护

- **实施健康检查**: 定期检查filewatcher进程状态
- **监控资源使用**: 监控CPU、内存和文件描述符使用
- **日志轮转**: 定期清理和轮转输出日志
- **自动化部署**: 使用脚本自动化工具部署和管理

## 🔗 相关文档

- [FileWatcherAPI参考](/api/filewatcher-api) - 程序化文件监控接口
- [系统工具指南](/guide/system-tools) - 系统工具使用指南
- [开发API指南](/guide/development-api) - API开发和集成指南
- [性能优化指南](/guide/performance) - 性能优化策略
- [基础使用示例](/examples/basic-usage) - 完整集成示例