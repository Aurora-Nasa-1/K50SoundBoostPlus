# FileWatcher使用指南

本指南介绍如何获取和使用AuroraCore的预编译FileWatcher工具。这个工具可以直接部署到Android设备上使用，无需编译。

## 📦 可用工具

### 核心二进制文件

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
adb push arm64-v8a/filewatcher /data/local/tmp/

# 设置可执行权限
adb shell chmod +x /data/local/tmp/filewatcher
```

### 3. 验证安装

```bash
# 进入设备shell
adb shell

# 测试工具
cd /data/local/tmp
./filewatcher --help
```

## 🔧 工具使用指南

### 文件监控工具

#### 基本文件监控

```bash
# 监控单个文件
./filewatcher /data/config/app.conf "echo '配置文件已更改'"

# 监控目录
./filewatcher /data/logs "echo '日志目录变化: %f'"

# 后台运行
./filewatcher /data/config "systemctl restart myapp" --daemon
```

#### 高级监控选项

```bash
# 递归监控目录
./filewatcher -r /data/app "echo '文件 %f 在 %d 中被修改'"

# 指定监控事件类型
./filewatcher -e create,modify /data/uploads "process_new_file.sh %f"

# 设置监控深度
./filewatcher -r -d 3 /data/project "make rebuild"

# 使用文件过滤
./filewatcher -r --include="\.(cpp|hpp)$" /data/src "echo 'C++文件变化: %f'"

# 排除特定文件
./filewatcher -r --exclude="\.(tmp|log)$" /data/project "echo '项目文件变化: %f'"
```

**参数说明：**
- `-r, --recursive`: 递归监控子目录
- `-d, --depth <数字>`: 最大监控深度
- `-e, --events <事件>`: 监控的事件类型
- `-i, --include <模式>`: 包含的文件模式（正则表达式）
- `-x, --exclude <模式>`: 排除的文件模式（正则表达式）
- `-q, --quiet`: 静默模式
- `-v, --verbose`: 详细输出模式
- `-o, --output <路径>`: 输出文件路径
- `--daemon`: 后台运行模式

**事件类型：**
- `create`: 文件创建
- `modify`: 文件修改
- `delete`: 文件删除
- `move`: 文件移动
- `attrib`: 属性变化
- `access`: 文件访问
- `all`: 所有事件类型

**命令变量：**
- `%f`: 完整文件路径
- `%d`: 目录路径
- `%n`: 仅文件名
- `%e`: 事件类型
- `%t`: 时间戳

## 📋 实际使用场景

### 场景1：配置文件监控

```bash
# 监控配置变化并重启服务
./filewatcher /system/etc/myapp.conf "killall -HUP myapp" --daemon

# 监控多个配置目录
./filewatcher -r /data/config "sync_config.sh %f" --daemon
```

### 场景2：开发环境自动构建

```bash
# 监控源码变化并自动编译
./filewatcher -r --include="\.(cpp|hpp|c|h)$" /data/src "cd /data && make && echo '编译完成'" --daemon

# 监控测试文件变化并运行测试
./filewatcher --include="test_.*\.cpp$" /data/tests "cd /data && make test" --daemon
```

### 场景3：文件上传处理

```bash
# 监控上传目录并处理新文件
./filewatcher -e create /data/uploads "./process_upload.sh '%f'" --daemon

# 监控日志目录并自动压缩大文件
./filewatcher -e create /data/logs "find /data/logs -name '*.log' -size +100M -exec gzip {} \;" --daemon
```

### 场景4：安全监控

```bash
# 监控系统关键目录
./filewatcher -r /system/bin "echo '[%t] 系统二进制文件变化: %f' >> /data/logs/security.log" --daemon

# 监控重要配置文件
./filewatcher /data/system/packages.xml "echo '[%t] 包数据库已更新' >> /data/logs/system.log" --daemon
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

# 检查文件权限
ls -la /data/config
chmod 755 /data/config
```

#### 文件路径问题
```bash
# 确保目录存在
mkdir -p /data/logs
mkdir -p /data/config

# 检查磁盘空间
df -h /data

# 检查路径是否存在
ls -la /data/config
```

#### 进程管理
```bash
# 查看运行中的filewatcher进程
ps aux | grep filewatcher

# 优雅停止filewatcher
killall -TERM filewatcher

# 强制停止
killall -KILL filewatcher
```

#### inotify限制问题
```bash
# 检查inotify限制
cat /proc/sys/fs/inotify/max_user_watches

# 增加监控限制（需要root权限）
echo 524288 > /proc/sys/fs/inotify/max_user_watches

# 检查文件描述符使用
lsof -p $(pgrep filewatcher) | wc -l
```

### 调试技巧

```bash
# 启用详细输出
./filewatcher -v /data/config "echo '测试'"

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
```

## 📊 性能优化

### 减少监控开销

```bash
# 仅监控必要的事件类型
./filewatcher -r -e modify,create -d 3 --exclude="\.(tmp|swp|log)$" /data/project "echo '项目文件变化: %f'"

# 使用文件过滤减少监控范围
./filewatcher -r --include="\.(conf|json|xml|yaml)$" /data/config "echo '配置文件更新: %f'"
```

### 批量处理优化

```bash
# 使用批量处理脚本
./filewatcher -r /data/uploads "echo '%f' >> /tmp/upload_queue.txt" --daemon

# 定期处理队列
(while true; do
    if [ -s /tmp/upload_queue.txt ]; then
        ./batch_process.sh /tmp/upload_queue.txt
        > /tmp/upload_queue.txt
    fi
    sleep 10
done) &
```

### 内存和CPU优化

```bash
# 限制监控深度避免性能问题
./filewatcher -r -d 2 /data/app "process_change.sh %f"

# 使用事件过滤减少不必要的触发
./filewatcher -e modify,create /data/important "handle_change.sh %f"

# 监控性能指标
top -p $(pgrep filewatcher)
ps -o pid,vsz,rss,comm -p $(pgrep filewatcher)
```

## 🛠️ 高级配置

### 服务管理脚本

```bash
#!/bin/bash
# filewatcher_service.sh

SERVICE_NAME="filewatcher"
LOG_PATH="/data/logs/${SERVICE_NAME}.log"
PID_FILE="/data/run/${SERVICE_NAME}.pid"

start_service() {
    echo "启动FileWatcher服务"
    
    # 创建必要目录
    mkdir -p /data/logs /data/run
    
    # 启动文件监控
    ./filewatcher -r /data/app \
        "echo '[%t] 应用文件变化: %f (事件: %e)' >> '$LOG_PATH'" \
        --daemon
    
    echo $! > "$PID_FILE"
    echo "FileWatcher服务启动完成"
}

stop_service() {
    echo "停止FileWatcher服务"
    if [ -f "$PID_FILE" ]; then
        kill $(cat "$PID_FILE")
        rm -f "$PID_FILE"
    else
        killall filewatcher
    fi
    echo "FileWatcher服务已停止"
}

status_service() {
    if pgrep -f "filewatcher" > /dev/null; then
        echo "FileWatcher服务正在运行"
        ps aux | grep filewatcher
    else
        echo "FileWatcher服务未运行"
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

### 配置文件示例

```bash
# filewatcher.conf
# FileWatcher配置文件

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

## 🔗 相关链接

- [开发API指南](/guide/development-api) - 了解如何使用API开发自定义应用
- [CLI工具参考](/api/cli-tools) - 详细的命令行参数说明
- [FileWatcher API](/api/filewatcher-api) - 程序化文件监控接口
- [性能调优](/guide/performance) - 系统性能优化指南
- [构建指南](/guide/building) - 编译和构建说明