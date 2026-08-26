import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';

/**
 * 對純文字字串進行 HTML 特殊符號轉義處理，防止 XSS 與破壞 HTML 結構。
 *
 * @param str 原始純文字字串
 * @returns 轉義後的 HTML 安全字串
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 初始化 markdown-it 解析器實例。
 *
 * 配置 GFM 自動連結、排版符號替換、軟換行支援，
 * 並整合 Highlight.js 程式碼著色與 Mermaid 圖表佔位標籤生成。
 */
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
    // 攔截 mermaid 語法區塊，生成具備 data-raw 屬性之佔位節點供非同步渲染引擎接管
    if (lang === 'mermaid') {
      const escaped = encodeURIComponent(str);
      return `<div class="mermaid-wrapper"><div class="mermaid-diagram" data-raw="${escaped}">${escapeHtml(str)}</div></div>`;
    }

    // 透過 Highlight.js 進行程式碼語法高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        // 若著色過程發生解析異常，降級為純文字跳脫處理
      }
    }

    // 未指定語言或不支援之語言降級輸出
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
  },
});

/**
 * 解析並轉換 GitHub 風格區塊引言警示語法（例如：`> [!NOTE]`）。
 *
 * 支援 NOTE、TIP、IMPORTANT、WARNING 與 CAUTION 五種層級，將其轉換為對應之樣式容器與 SVG 圖示。
 *
 * @param html 經 Markdown 解析後之原始 HTML 字串
 * @returns 替換警示區塊標籤後之 HTML 字串
 */
function processAlerts(html: string): string {
  const alertTypes = ['note', 'tip', 'important', 'warning', 'caution'];
  
  return html.replace(
    /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>|\n)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi,
    (_match, type, content) => {
      const lowerType = type.toLowerCase();
      if (!alertTypes.includes(lowerType)) return _match;

      const title = type.toUpperCase();
      let icon = '';
      if (lowerType === 'note') {
        icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      } else if (lowerType === 'tip') {
        icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>';
      } else if (lowerType === 'important') {
        icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      } else if (lowerType === 'warning') {
        icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      } else if (lowerType === 'caution') {
        icon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      }

      return `<div class="markdown-alert markdown-alert-${lowerType}">
        <div class="markdown-alert-title">${icon}<span>${title}</span></div>
        <p>${content}</p>
      </div>`;
    }
  );
}

/**
 * 將 Markdown 文字字串解析並轉換為經過 DOMPurify 安全消毒之 HTML。
 *
 * 消毒設定啟用 SVG 標籤與向量屬性白名單，確保 Mermaid 圖表與 GitHub 警示圖示可安全呈現且徹底防禦 XSS 攻擊。
 *
 * @param markdown 原始輸入 Markdown 字串
 * @returns 消毒完畢之 HTML 字串
 */
export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = md.render(markdown);
  const withAlerts = processAlerts(rawHtml);

  // 透過 DOMPurify 進行 XSS 防禦過濾，保留 SVG 圖形標籤與自訂屬性
  return DOMPurify.sanitize(withAlerts, {
    ADD_TAGS: ['svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'foreignObject'],
    ADD_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'points', 'data-raw'],
  });
}
