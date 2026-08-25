import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('mermaid') || id.includes('d3') || id.includes('dagre')) {
              return 'mermaid-bundle';
            }
            if (id.includes('@codemirror') || id.includes('codemirror') || id.includes('w3c-keyname')) {
              return 'codemirror-bundle';
            }
            if (id.includes('highlight.js')) {
              return 'highlight-bundle';
            }
            if (id.includes('markdown-it') || id.includes('dompurify')) {
              return 'parser-bundle';
            }
          }
        },
      },
    },
  },
});
