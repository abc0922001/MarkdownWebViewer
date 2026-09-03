/**
 * 匯出單一獨立自給之 HTML 檔案（.html）。
 *
 * 將當前預覽區渲染之 HTML 結構、已繪製之 Mermaid 向量圖形（SVG）與內嵌 CSS 樣式表封裝為單一靜態 HTML 文件，
 * 依據當前視覺主題套用對應之 Linear 樣式與色彩變數，無須依賴任何外部樣式表或 CDN 即可於離線環境完整呈現。
 *
 * @param previewElement 包含已渲染 Markdown 內容之預覽容器 DOM 節點
 * @param title 文件標題與下載檔名基準，預設為 'Document'
 * @param theme 欲匯出套用之色彩主題（'dark' | 'light'），預設依據 DOM 狀態自動偵測
 */
export function exportHtml(
  previewElement: HTMLElement,
  title = 'Document',
  theme: 'dark' | 'light' = (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'dark' : 'light'
): void {
  const renderedContent = previewElement.innerHTML;
  const finalFilename = title.endsWith('.html') ? title : `${title.replace(/\.[^/.]+$/, '')}.html`;
  const isLight = theme === 'light';

  // 組裝包含完整 Meta、內嵌主題 CSS 與預覽 DOM 的獨立 HTML 字串
  const standaloneHtml = `<!DOCTYPE html>
<html lang="zh-TW" class="${theme}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg-app: ${isLight ? '#FFFFFF' : '#010102'};
      --bg-surface: ${isLight ? '#F5F6F7' : '#0F1011'};
      --bg-surface-elevated: ${isLight ? '#EBECEE' : '#141516'};
      --border-subtle: ${isLight ? '#E5E7EB' : '#23252A'};
      --border-medium: ${isLight ? '#D1D5DB' : '#34343A'};
      --text-primary: ${isLight ? '#08090A' : '#F7F8F8'};
      --text-secondary: ${isLight ? '#4B5563' : '#8A8F98'};
      --accent-primary: #5E6AD2;
      --accent-hover: ${isLight ? '#4F5AB8' : '#828FFF'};
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', 'Fira Code', Menlo, monospace;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-app);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 15px;
      line-height: 1.75;
      padding: 48px 24px;
      display: flex;
      justify-content: center;
    }
    .markdown-container {
      max-width: 860px;
      width: 100%;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-top: 1.75em;
      margin-bottom: 0.6em;
      font-weight: 600;
      line-height: 1.35;
      color: var(--text-primary);
      letter-spacing: -0.02em;
    }
    h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid var(--border-subtle); }
    h2 { font-size: 1.5em; padding-bottom: 0.25em; border-bottom: 1px solid var(--border-subtle); }
    h3 { font-size: 1.25em; }
    p { margin-bottom: 1em; }
    ul, ol { margin-bottom: 1em; padding-left: 1.75em; }
    li { margin-top: 0.35em; margin-bottom: 0.35em; }
    blockquote {
      margin: 1.25em 0;
      padding: 0.6em 1.2em;
      color: var(--text-secondary);
      background: var(--bg-surface);
      border-left: 3px solid var(--accent-primary);
      border-radius: 0 6px 6px 0;
    }
    a { color: var(--accent-hover); text-decoration: none; }
    a:hover { text-decoration: underline; }
    hr { height: 1px; margin: 2em 0; background: var(--border-subtle); border: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5em 0;
      background: var(--bg-surface);
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    th, td { padding: 10px 14px; border: 1px solid var(--border-subtle); text-align: left; }
    th { background: var(--bg-surface-elevated); font-weight: 600; }
    code:not(pre code) {
      font-family: var(--font-mono);
      font-size: 0.88em;
      padding: 0.2em 0.45em;
      background: ${isLight ? '#EAECEF' : 'var(--bg-surface-elevated)'};
      border: 1px solid ${isLight ? '#D1D5DB' : 'var(--border-subtle)'};
      border-radius: 4px;
      color: ${isLight ? '#1F2328' : '#E2E8F0'};
    }
    pre {
      margin: 1.4em 0;
      padding: 14px 18px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13.5px;
      line-height: 1.6;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
    }
    pre code { color: ${isLight ? '#24292E' : '#ECEFF4'}; }
    ${isLight ? `
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #D73A49; font-weight: 500; }
    .hljs-string, .hljs-title.class_, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #22863A; }
    .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #6A737D; font-style: italic; }
    .hljs-number, .hljs-regexp, .hljs-link { color: #005CC5; }
    .hljs-variable, .hljs-punctuation { color: #24292E; }
    .hljs-title, .hljs-title.function_, .hljs-attr { color: #6F42C1; }
    .hljs-symbol, .hljs-bullet { color: #E36209; }
    ` : `
    .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #81A1C1; font-weight: 500; }
    .hljs-string, .hljs-title.class_, .hljs-section, .hljs-attribute, .hljs-literal, .hljs-template-tag, .hljs-template-variable, .hljs-type, .hljs-addition { color: #A3BE8C; }
    .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #616E88; font-style: italic; }
    .hljs-number, .hljs-regexp, .hljs-link { color: #B48EAD; }
    .hljs-variable, .hljs-punctuation { color: #D8DEE9; }
    .hljs-title, .hljs-title.function_, .hljs-attr { color: #88C0D0; }
    .hljs-symbol, .hljs-bullet { color: #EBCB8B; }
    `}
    .mermaid-wrapper {
      margin: 1.75em 0;
      padding: 24px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      display: flex;
      justify-content: center;
      overflow-x: auto;
    }
    .mermaid-wrapper svg { max-width: 100%; height: auto; }
    .markdown-alert {
      margin: 1.25em 0;
      padding: 12px 16px;
      border-left: 4px solid var(--border-medium);
      background: var(--bg-surface);
      border-radius: 0 6px 6px 0;
    }
    .markdown-alert-title { display: flex; align-items: center; gap: 6px; font-weight: 600; margin-bottom: 4px; }
    .markdown-alert.markdown-alert-note { border-left-color: var(--accent-primary); background: ${isLight ? 'rgba(94, 106, 210, 0.08)' : 'rgba(94, 106, 210, 0.14)'}; }
    .markdown-alert.markdown-alert-tip { border-left-color: ${isLight ? '#15803D' : '#27A644'}; background: ${isLight ? 'rgba(21, 128, 61, 0.1)' : 'rgba(39, 166, 68, 0.14)'}; }
    .markdown-alert.markdown-alert-important { border-left-color: #A855F7; background: rgba(168, 85, 247, 0.12); }
    .markdown-alert.markdown-alert-warning { border-left-color: ${isLight ? '#B45309' : '#F5A623'}; background: ${isLight ? 'rgba(180, 83, 9, 0.1)' : 'rgba(245, 166, 35, 0.12)'}; }
    .markdown-alert.markdown-alert-caution { border-left-color: ${isLight ? '#DC2626' : '#F2555A'}; background: ${isLight ? 'rgba(220, 38, 38, 0.1)' : 'rgba(242, 85, 90, 0.12)'}; }
  </style>
</head>
<body>
  <main class="markdown-container">
    ${renderedContent}
  </main>
</body>
</html>`;

  // 封裝為 text/html Blob 資料流並建立暫態 URL
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // 建立暫態連結節點並自動觸發下載流程
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 延遲釋放 Object URL 資源以確保瀏覽器順利完成讀取
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 對文字字串進行 HTML 特殊符號跳脫處理，防止字串注入破壞標籤結構。
 *
 * @param text 欲跳脫處理之純文字字串
 * @returns 跳脫後的 HTML 安全字串
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
