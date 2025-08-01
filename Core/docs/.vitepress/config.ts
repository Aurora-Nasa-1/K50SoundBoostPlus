import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AuroraCore',
  description: 'Android Root File Watcher - High-performance file monitoring for Android root environment',
  
  // 多语言配置
  locales: {
    root: {
      label: 'English',
      lang: 'en',
      title: 'AuroraCore',
      description: 'Android Root File Watcher - High-performance file monitoring for Android root environment',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/' },
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'API', link: '/api/' },
          { text: 'GitHub', link: 'https://github.com/APMMDEVS/AuroraCore' }
        ],
        sidebar: {
          '/guide/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Quick Start', link: '/guide/getting-started' },
                { text: 'Development API', link: '/guide/development-api' },
                { text: 'Building', link: '/guide/building' }
              ]
            }
          ],
          '/api/': [
            {
              text: 'API Reference',
              items: [
                { text: 'Overview', link: '/api/' },

                { text: 'FileWatcher API', link: '/api/filewatcher-api' },
                { text: 'CLI Tools', link: '/api/cli-tools' }
              ]
            }
          ]
        }
      }
    },
    zh: {
      label: '中文',
      lang: 'zh-CN',
      title: 'AuroraCore',
      description: 'Android Root 文件监听工具 - 专为Android root环境设计的高性能文件监控解决方案',
      themeConfig: {
        nav: [
          { text: '首页', link: '/zh/' },
          { text: '指南', link: '/zh/guide/getting-started' },
          { text: 'API', link: '/zh/api/' },
          { text: 'GitHub', link: 'https://github.com/APMMDEVS/AuroraCore' }
        ],
        sidebar: {
          '/zh/guide/': [
            {
              text: '开始使用',
              items: [
                { text: '快速开始', link: '/zh/guide/getting-started' },
                { text: '系统工具', link: '/zh/guide/system-tools' },
                { text: '开发API', link: '/zh/guide/development-api' },
                { text: '构建', link: '/zh/guide/building' }
              ]
            }
          ],
          '/zh/api/': [
            {
              text: 'API 参考',
              items: [
                { text: '概览', link: '/zh/api/' },

                { text: 'FileWatcher API', link: '/zh/api/filewatcher-api' },
                { text: '命令行工具', link: '/zh/api/cli-tools' }
              ]
            }
          ]
        }
      }
    }
  },
  
  // 主题配置
  themeConfig: {
    logo: './public/logo.svg',
    siteTitle: 'AuroraCore',
    
    // 搜索
    search: {
      provider: 'local'
    },
    
    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/APMMDEVS/AuroraCore' }
    ],
    
    // 页脚
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 AuroraCore Team'
    },
    
    // 编辑链接
    editLink: {
      pattern: 'https://github.com/APMMDEVS/AuroraCore/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    
    // 最后更新时间
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },
  
  // 构建配置
  base: '/AuroraCore/',
  cleanUrls: true,
  
  // Markdown 配置
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },
  
  // Head 配置
  head: [
    ['link', { rel: 'icon', href: '/AuroraCore/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'AuroraCore | Android Root File Watcher' }],
    ['meta', { property: 'og:site_name', content: 'AuroraCore' }],
    ['meta', { property: 'og:url', content: 'https://APMMDEVS.github.io/AuroraCore/' }]
  ]
})