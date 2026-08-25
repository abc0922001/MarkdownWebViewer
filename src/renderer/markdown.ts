import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initialize markdown-it with highlight.js integration
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string): string {
    if (lang === 'mermaid') {
      // Escape raw code for attribute and inner text
      const escaped = encodeURIComponent(str);
      return `<div class="mermaid-wrapper"><div class="mermaid-diagram" data-raw="${escaped}">${escapeHtml(str)}</div></div>`;
    }

    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch {
        // Ignore error and fall through
      }
    }

    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
  },
});

/**
 * Process GitHub-style blockquote alerts (e.g. > [!NOTE])
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
 * Render Markdown to sanitized HTML string
 */
export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = md.render(markdown);
  const withAlerts = processAlerts(rawHtml);

  // Sanitize with DOMPurify while keeping SVG and safe attributes
  return DOMPurify.sanitize(withAlerts, {
    ADD_TAGS: ['svg', 'g', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon', 'text', 'tspan', 'foreignObject'],
    ADD_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'points', 'data-raw'],
  });
}
