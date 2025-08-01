# AuroraCore Documentation

这是 AuroraCore 项目的官方文档，使用 VitePress 构建，支持中英文双语。AuroraCore 是专为 Android root 环境设计的高性能文件监控解决方案。

## 📚 文档结构

```
docs/
├── .vitepress/          # VitePress 配置
│   └── config.ts         # 主配置文件
├── guide/                # 英文指南
│   └── getting-started.md
├── api/                  # 英文 API 参考
│   ├── filewatcher-api.md
│   └── cli-tools.md
├── examples/             # 英文示例
│   └── basic-usage.md
├── zh/                   # 中文文档
│   ├── guide/
│   ├── api/
│   └── examples/
├── index.md              # 英文首页
├── package.json          # 项目依赖
└── README.md             # 本文件
```

## 🚀 本地开发

### 安装依赖

```bash
cd docs
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建文档

```bash
npm run build
```

构建后的文件将在 `.vitepress/dist` 目录中。

### 预览构建结果

```bash
npm run preview
```

## 📝 编写文档

### 文档规范

1. **语言支持**: 所有文档都需要提供中英文版本
2. **文件命名**: 使用小写字母和连字符，如 `getting-started.md`
3. **目录结构**: 中文文档放在 `zh/` 目录下，保持与英文文档相同的结构
4. **代码示例**: 确保所有代码示例都是可运行的
5. **链接引用**: 使用相对路径，确保在不同语言版本间正确跳转

### Markdown 扩展

VitePress 支持以下 Markdown 扩展：

- **代码块高亮**: 支持多种编程语言语法高亮
- **容器**: 使用 `:::tip`、`:::warning`、`:::danger` 等
- **自定义组件**: 可以在 Markdown 中使用 Vue 组件
- **数学公式**: 支持 LaTeX 数学公式渲染

### 示例

#### 提示框

```markdown
:::tip 提示
这是一个提示信息。
:::

:::warning 警告
这是一个警告信息。
:::

:::danger 危险
这是一个危险信息。
:::
```

#### 代码组

```markdown
::: code-group

```cpp [filewatcher_example.cpp]
#include "filewatcher_api.hpp"

int main() {
    init_filewatcher();
    watch_file("/tmp/test.txt", "echo File changed");
    cleanup_filewatcher();
    return 0;
}
```

```bash [build.sh]
#!/bin/bash
g++ -o filewatcher_example filewatcher_example.cpp -lfilewatcher
```

:::
```

## 🌐 部署

文档通过 GitHub Actions 自动部署到 GitHub Pages。每次推送到 `main` 分支时，会自动触发构建和部署流程。

### 手动部署

如果需要手动部署：

```bash
# 构建文档
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 🔧 配置说明

### VitePress 配置

主要配置文件位于 `.vitepress/config.ts`，包含：

- **站点信息**: 标题、描述、基础 URL
- **主题配置**: 导航栏、侧边栏、搜索等
- **国际化**: 中英文语言切换
- **插件配置**: 代码高亮、数学公式等

### 导航和侧边栏

导航栏和侧边栏配置支持多语言，确保中英文版本保持一致的结构。

## 📖 内容指南

### API 文档

- **完整性**: 包含所有公共 API 的详细说明
- **示例**: 每个 API 都应该有使用示例
- **参数说明**: 详细说明所有参数的类型和用途
- **返回值**: 说明返回值的类型和含义
- **异常处理**: 说明可能抛出的异常

### 指南文档

- **循序渐进**: 从简单到复杂，逐步引导用户
- **实用性**: 提供实际可用的示例和最佳实践
- **完整性**: 覆盖从安装到高级用法的全过程

### 示例代码

- **可运行**: 所有示例都应该是完整可运行的
- **注释**: 提供充分的代码注释
- **最佳实践**: 展示推荐的使用方式

## 🤝 贡献

欢迎为文档做出贡献！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 编写或更新文档
4. 确保中英文版本都已更新
5. 提交 Pull Request

### 文档审查清单

- [ ] 中英文版本都已更新
- [ ] 代码示例可以正常运行
- [ ] 链接都是有效的
- [ ] 格式符合项目规范
- [ ] 内容准确无误

---

如有任何问题或建议，请在 [GitHub Issues](https://github.com/APMMDEVS/AuroraCore/issues) 中提出。