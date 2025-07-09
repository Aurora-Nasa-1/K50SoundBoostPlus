import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const isGitHubPages = process.env.GITHUB_PAGES === 'true' || process.env.CI;
  
  return {
  base: isGitHubPages ? '/ModuleWebUI/' : '/',
  
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true
  },

  build: {
    // 输出目录
    outDir: 'dist',
    // 清空输出目录
    emptyOutDir: true,
    // 生成源码映射
    sourcemap: false,
    // 启用/禁用 gzip 压缩大小报告
    reportCompressedSize: true,
    // chunk 大小警告的限制（以 kbs 为单位）
    chunkSizeWarningLimit: 1000,
    
    // Rollup 配置
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        // 单文件输出配置
        manualChunks: undefined,
        // 资源文件命名
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (ext === 'css') {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        // JS文件命名
        entryFileNames: `assets/js/[name]-[hash].js`,
        chunkFileNames: `assets/js/[name]-[hash].js`
      }
    },
    
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        // 移除console
        drop_console: true,
        // 移除debugger
        drop_debugger: true,
        // 移除无用代码
        dead_code: true,
        // 压缩条件表达式
        conditionals: true,
        // 压缩布尔值
        booleans: true,
        // 压缩循环
        loops: true,
        // 内联函数
        inline: true,
        // 合并变量
        join_vars: true,
        // 移除未使用的变量
        unused: true
      },
      mangle: {
        // 混淆变量名
        toplevel: true
      },
      format: {
        // 移除注释
        comments: false
      }
    }
  },

  // CSS 配置
  css: {
    // CSS 压缩
    postcss: {
      plugins: []
    },
    // CSS 模块化
    modules: false,
    // CSS 预处理器选项
    preprocessorOptions: {},
    // 开发时是否注入CSS
    devSourcemap: false
  },

  // 资源处理
  assetsInclude: ['**/*.woff', '**/*.woff2', '**/*.ttf', '**/*.eot'],

  // 依赖优化
  optimizeDeps: {
    // 强制预构建依赖
    force: false,
    // 包含的依赖
    include: [],
    // 排除的依赖
    exclude: []
  },

  // 解析配置
  resolve: {
    // 路径别名
    alias: {
      '@': resolve(__dirname, 'src'),
      '@assets': resolve(__dirname, 'src/assets'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages')
    },
    // 文件扩展名
    extensions: ['.js', '.json', '.css']
  },

  // 环境变量
  define: {
    __DEV__: JSON.stringify(!isProduction),
    __GITHUB_PAGES__: JSON.stringify(isGitHubPages)
  }
};
});