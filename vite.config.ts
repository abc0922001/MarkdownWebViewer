import { defineConfig, Plugin } from 'vite';

function inlineCssPlugin(): Plugin {
  return {
    name: 'inline-css',
    enforce: 'post',
    transformIndexHtml(html, { bundle }) {
      if (!bundle) return html;
      let newHtml = html;
      for (const [fileName, file] of Object.entries(bundle)) {
        if (fileName.endsWith('.css') && file.type === 'asset' && typeof file.source === 'string') {
          const re = new RegExp(`<link[^>]+href="[^"]*${fileName.replace(/\./g, '\\.')}"[^>]*>`);
          newHtml = newHtml.replace(re, `<style>${file.source}</style>`);
          delete bundle[fileName];
        }
      }
      return newHtml;
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [inlineCssPlugin()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
    },
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('preload-helper')) {
            return 'helpers';
          }
          if (id.includes('@codemirror') || id.includes('codemirror') || id.includes('w3c-keyname')) {
            return 'codemirror-bundle';
          }
        },
      },
    },
  },
});
