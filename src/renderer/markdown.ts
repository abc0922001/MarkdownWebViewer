import MarkdownIt, { type MarkdownIt as MarkdownItType, type StateCore, type Token, type RendererRule } from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import DOMPurify from 'dompurify';
import { fixMathSymbols } from '../utils/formatter';

/**
 * 支援之 GitHub Alerts 類型清單。
 */
const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'] as const;

/**
 * GitHub Alert 類型字串聯合型別。
 */
type AlertType = (typeof ALERT_TYPES)[number];

/**
 * GitHub Alerts 各類型對應之 Lucide SVG 圖示字串常數表。
 */
const ALERT_ICONS: Record<AlertType, string> = {
  note: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  tip: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>',
  important: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
  warning: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  caution: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
};

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
 * 自行開發之 GitHub Flavored Alerts (GFM Alerts) 零依賴 Token Stream 解析外掛。
 *
 * 在 Core 階段掃描 Blockquote Token 串流，若開頭段落具備 `[!NOTE]` 等標籤，
 * 則動態轉為 GFM Alert 容器標籤與標題列，支援內部多段落、清單、表格與程式碼區塊等完整巢狀結構。
 *
 * @param md MarkdownIt 解析器實例
 */
function gfmAlertsPlugin(md: MarkdownItType): void {
  md.core.ruler.after('block', 'gfm_alerts', (state: StateCore) => {
    const tokens = state.tokens;
    let i = 0;

    while (i < tokens.length) {
      if (tokens[i].type === 'blockquote_open') {
        // 尋找對應的 blockquote_close Token 位置
        let depth = 0;
        let closeIdx = -1;
        for (let j = i; j < tokens.length; j++) {
          if (tokens[j].type === 'blockquote_open') depth++;
          else if (tokens[j].type === 'blockquote_close') {
            depth--;
            if (depth === 0) {
              closeIdx = j;
              break;
            }
          }
        }

        if (closeIdx === -1) {
          i++;
          continue;
        }

        // 尋找 Blockquote 內部的第一個段落與 inline Token
        let paraOpenIdx = -1;
        let inlineIdx = -1;
        for (let k = i + 1; k < closeIdx; k++) {
          if (tokens[k].type === 'paragraph_open') {
            paraOpenIdx = k;
            if (k + 1 < closeIdx && tokens[k + 1].type === 'inline') {
              inlineIdx = k + 1;
            }
            break;
          }
        }

        if (inlineIdx !== -1) {
          const inlineToken = tokens[inlineIdx];
          const match = inlineToken.content.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n|\s+|$)/i);

          if (match) {
            const rawType = match[1].toLowerCase() as AlertType;
            if (ALERT_TYPES.includes(rawType)) {
              const title = match[1].toUpperCase();
              const icon = ALERT_ICONS[rawType];

              // 1. 將 blockquote_open 與 blockquote_close 改為 div Alert 容器
              tokens[i].tag = 'div';
              tokens[i].attrs = [['class', `markdown-alert markdown-alert-${rawType}`]];
              tokens[closeIdx].tag = 'div';

              // 2. 自 inline Token 內容剝除 [!TYPE] 標籤
              inlineToken.content = inlineToken.content.slice(match[0].length);

              // 同步修剪 inline.children 內部第一個 text token
              if (inlineToken.children && inlineToken.children.length > 0) {
                const firstChild = inlineToken.children[0];
                if (firstChild.type === 'text') {
                  const childMatch = firstChild.content.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n|\s+|$)/i);
                  if (childMatch) {
                    firstChild.content = firstChild.content.slice(childMatch[0].length);
                  }
                }
              }

              // 3. 建立 Alert 標題列 HTML Block Token
              const titleToken = new state.Token('html_block', '', 0);
              titleToken.content = `<div class="markdown-alert-title">${icon}<span>${title}</span></div>\n`;

              // 若第一段落僅包含 [!TYPE] 且剝除後無內容，則移除該空段落，避免產生多餘空白行
              const isInlineEmpty = !inlineToken.content.trim() &&
                (!inlineToken.children || inlineToken.children.every((c: Token) => !c.content || !c.content.trim()));

              if (isInlineEmpty && paraOpenIdx !== -1) {
                // 移除 paragraph_open, inline, paragraph_close (3 個 tokens) 並插入 titleToken
                tokens.splice(paraOpenIdx, 3, titleToken);
              } else {
                // 於 blockquote_open 正後方插入 titleToken
                tokens.splice(i + 1, 0, titleToken);
              }
            }
          }
        }
      }
      i++;
    }
    return true;
  });
}

/**
 * 自行開發之 GitHub Flavored Tasklists (GFM 任務核取清單) 零依賴 AST 轉譯外掛。
 *
 * 掃描清單項目開頭之 `[ ]` 與 `[x]` 語法，自動為 `<li>` 注入 `.task-list-item` 類別，
 * 並在行首插入禁用狀態之 `<input type="checkbox">` 核取方塊元素。
 *
 * @param md MarkdownIt 解析器實例
 */
function gfmTasklistsPlugin(md: MarkdownItType): void {
  md.core.ruler.after('inline', 'gfm_tasklists', (state: StateCore) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'list_item_open') {
        // 尋找此 list_item 內部的第一個 inline Token
        let inlineIdx = -1;
        for (let j = i + 1; j < tokens.length && tokens[j].type !== 'list_item_close'; j++) {
          if (tokens[j].type === 'inline') {
            inlineIdx = j;
            break;
          }
        }

        if (inlineIdx !== -1) {
          const inlineToken = tokens[inlineIdx];
          const match = inlineToken.content.match(/^\[([ xX])\][ \t]*/);

          if (match) {
            const isChecked = match[1].toLowerCase() === 'x';

            // 1. 為 <li> 元素注入 task-list-item 樣式類別
            tokens[i].attrJoin('class', 'task-list-item');

            // 2. 剝除 inline 文本開頭的 [ ] 或 [x] 標記
            inlineToken.content = inlineToken.content.slice(match[0].length);

            // 3. 同步剝除 children 內部第一個 text token 的標記
            if (inlineToken.children && inlineToken.children.length > 0) {
              const firstChild = inlineToken.children[0];
              if (firstChild.type === 'text') {
                const childMatch = firstChild.content.match(/^\[([ xX])\][ \t]*/);
                if (childMatch) {
                  firstChild.content = firstChild.content.slice(childMatch[0].length);
                }
              }
            }

            // 4. 建立 Checkbox 元素並置於 inline children 最前端
            const checkboxToken = new state.Token('html_inline', '', 0);
            checkboxToken.content = `<input type="checkbox" class="task-list-item-checkbox"${isChecked ? ' checked' : ''} disabled> `;

            if (!inlineToken.children) {
              inlineToken.children = [];
            }
            inlineToken.children.unshift(checkboxToken);
          }
        }
      }
    }
    return true;
  });
}

/**
 * 初始化 markdown-it 解析器實例。
 *
 * 配置 GFM 自動連結、排版符號替換、軟換行支援，
 * 載入自行開發之 GFM Alerts 與 Tasklists AST 外掛，
 * 並整合 Highlight.js 程式碼著色與 Mermaid 圖表佔位標籤生成。
 */
const md: MarkdownItType = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
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

// 攔截 mermaid 語法區塊，生成具備 data-raw 屬性之佔位節點供非同步渲染引擎接管
const defaultFenceRenderer: RendererRule = md.renderer.rules.fence || function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options);
};

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const lang = info ? info.split(/\s+/)[0] : '';
  if (lang === 'mermaid') {
    const rawContent = token.content.trim();
    const escaped = encodeURIComponent(rawContent);
    return `<div class="mermaid-wrapper"><div class="mermaid-diagram" data-raw="${escaped}">${escapeHtml(rawContent)}</div></div>\n`;
  }
  return defaultFenceRenderer(tokens, idx, options, env, self);
};

// 載入自行開發之 GFM Alerts 與 Tasklist AST 外掛
md.use(gfmAlertsPlugin);
md.use(gfmTasklistsPlugin);

/**
 * 取得 DOMPurify 消毒器實例，相容於瀏覽器原生環境與 Node/JSDOM 單元測試環境。
 *
 * @returns 具備 sanitize 方法之 DOMPurify 實例
 */
function getDOMPurify() {
  if (typeof (DOMPurify as any).sanitize === 'function') {
    return DOMPurify;
  }
  if (typeof (DOMPurify as any) === 'function' && typeof window !== 'undefined') {
    return (DOMPurify as any)(window);
  }
  return DOMPurify;
}

/**
 * 將 Markdown 文字字串解析並轉換為經過 DOMPurify 安全消毒之 HTML。
 *
 * 消毒設定啟用完整 SVG/Filter Profile 與白名單，確保 Mermaid 向量圖表、
 * GFM Tasklist 核取方塊與 GitHub 警示卡片可完整安全呈現且徹底防禦 XSS 攻擊。
 *
 * @param markdown 原始輸入 Markdown 字串
 * @returns 消毒完畢之 HTML 字串
 */
export function renderMarkdownToHtml(markdown: string): string {
  const normalized = fixMathSymbols(markdown);
  const rawHtml = md.render(normalized);

  const purify = getDOMPurify();

  // 透過 DOMPurify 進行嚴格 XSS 防禦過濾，保留 Mermaid SVG 與 GFM 特性標籤屬性
  return purify.sanitize(rawHtml, {
    USE_PROFILES: { svg: true, svgFilters: true, html: true },
    ADD_TAGS: [
      'svg',
      'g',
      'path',
      'rect',
      'circle',
      'line',
      'polyline',
      'polygon',
      'text',
      'tspan',
      'foreignObject',
      'defs',
      'marker',
      'use',
      'clipPath',
      'style',
      'filter',
      'feDropShadow',
      'feGaussianBlur',
      'input',
    ],
    ADD_ATTR: [
      'viewBox',
      'width',
      'height',
      'fill',
      'stroke',
      'stroke-width',
      'stroke-linecap',
      'stroke-linejoin',
      'd',
      'x',
      'y',
      'x1',
      'y1',
      'x2',
      'y2',
      'cx',
      'cy',
      'r',
      'rx',
      'ry',
      'points',
      'data-raw',
      'transform',
      'clip-path',
      'marker-start',
      'marker-mid',
      'marker-end',
      'filter',
      'id',
      'class',
      'style',
      'xmlns',
      'xmlns:xlink',
      'xlink:href',
      'href',
      'type',
      'checked',
      'disabled',
    ],
  });
}
