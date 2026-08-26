import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/editor.css';
import './styles/preview.css';
import './styles/dropdown.css';
import './styles/print.css';

import { MarkdownEditor } from './editor/codemirror';
import { renderMarkdownToHtml } from './renderer/markdown';
import { renderMermaidDiagrams, setMermaidTheme } from './renderer/mermaid';
import { LayoutSwitcher } from './layout/switcher';
import { PaneResizer } from './layout/resizer';
import { SyncScrollManager } from './layout/sync-scroll';
import { exportMarkdown } from './exporter/md-exporter';
import { exportHtml } from './exporter/html-exporter';
import { exportPdf } from './exporter/pdf-exporter';
import { SAMPLE_MARKDOWN } from './utils/sample';
import { debounce } from './utils/debounce';
import { showToast } from './utils/toast';
import { fixMarkdownFormatting } from './utils/formatter';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const editorMount = document.getElementById('codemirror-mount')!;
  const previewContent = document.getElementById('preview-content')!;
  const previewScrollContainer = document.getElementById('preview-scroll-container')!;
  const renderIndicator = document.getElementById('render-indicator')!;
  const docTitleInput = document.getElementById('doc-title-input') as HTMLInputElement;
  const btnFix = document.getElementById('btn-fix')!;
  const btnSample = document.getElementById('btn-sample')!;
  const btnImport = document.getElementById('btn-import')!;
  const fileInput = document.getElementById('file-input') as HTMLInputElement;
  const btnCopy = document.getElementById('btn-copy')!;
  const btnClear = document.getElementById('btn-clear')!;
  const btnEditorWrap = document.getElementById('btn-editor-wrap')!;
  const btnExportDropdown = document.getElementById('btn-export-dropdown')!;
  const exportMenu = document.getElementById('export-menu')!;
  const dropdownWrapper = btnExportDropdown.closest('.dropdown-wrapper')!;
  const btnThemeToggle = document.getElementById('btn-theme-toggle')!;
  const themeIconMoon = document.getElementById('theme-icon-moon')!;
  const themeIconSun = document.getElementById('theme-icon-sun')!;

  // Status bar elements
  const statLines = document.getElementById('stat-lines')!;
  const statWords = document.getElementById('stat-words')!;
  const statChars = document.getElementById('stat-chars')!;
  const statCursor = document.getElementById('stat-cursor')!;

  let currentTheme: 'dark' | 'light' = 'dark';
  let isEdited = false;

  // Update Status Bar Metrics
  const updateMetrics = () => {
    const { lines, words, chars } = editor.getMetrics();
    statLines.textContent = `${lines} 行`;
    statWords.textContent = `${words} 字`;
    statChars.textContent = `${chars} 字元`;
  };

  // Set rendering indicator state
  const setRenderState = (state: 'rendering' | 'synced' | 'error') => {
    renderIndicator.className = `render-indicator ${state}`;
    const textEl = renderIndicator.querySelector('.status-text');
    if (textEl) {
      if (state === 'rendering') textEl.textContent = '轉譯中...';
      else if (state === 'synced') textEl.textContent = '已同步';
      else if (state === 'error') textEl.textContent = '解析錯誤';
    }
  };

  // Asynchronous Markdown + Mermaid Rendering Pipeline
  const doRender = async (markdownText: string) => {
    // If content is empty, avoid heavy parsing and show a lightweight placeholder.
    if (!markdownText || !markdownText.trim()) {
      previewContent.innerHTML = '<div class="empty-placeholder">開始輸入 Markdown 內容...</div>';
      setRenderState('synced');
      updateMetrics();
      return;
    }

    setRenderState('rendering');
    try {
      const html = renderMarkdownToHtml(markdownText);
      previewContent.innerHTML = html;

      // Render Mermaid diagrams (mermaid module is loaded lazily inside)
      const mermaidSuccess = await renderMermaidDiagrams(previewContent);
      setRenderState(mermaidSuccess ? 'synced' : 'error');
    } catch (err) {
      console.error('Rendering error:', err);
      setRenderState('error');
    }
    updateMetrics();
  };

  // Debounced render (120ms) for ultra-fast typing response
  const debouncedRender = debounce((content: string) => {
    doRender(content);
  }, 120);

  // Initialize CodeMirror 6 Editor
  // NOTE: For cold-start performance we DO NOT populate the editor with the large SAMPLE_MARKDOWN by default.
  const editor = new MarkdownEditor(editorMount, '', {
    onChange: (content) => {
      isEdited = true;
      debouncedRender(content);
    },
    onCursorActivity: (line, col) => {
      statCursor.textContent = `行 ${line}, 欄 ${col}`;
    },
  });

  // Initialize Layout Switcher & Resizer
  const layoutSwitcher = new LayoutSwitcher();
  new PaneResizer();

  // Initialize Synchronized Scrolling
  new SyncScrollManager(editor.getScrollElement(), previewScrollContainer);

  // Initial render: show placeholder for empty editor to avoid heavy startup work
  if (editor.getValue().trim().length === 0) {
    previewContent.innerHTML = '<div class="empty-placeholder">開始輸入 Markdown 內容...</div>';
    setRenderState('synced');
  } else {
    // Defensive: if the editor somehow contains content, render it as usual
    doRender(editor.getValue());
  }

  // Auto-Fix Formatting Action
  const handleAutoFix = () => {
    const currentText = editor.getValue();
    if (!currentText.trim()) {
      showToast('編輯器為空，無須修正', 'info');
      return;
    }

    const { formatted, changed, fixesSummary } = fixMarkdownFormatting(currentText);
    if (changed) {
      editor.setValue(formatted);
      doRender(formatted);
      const summaryMsg = fixesSummary.length > 0 ? fixesSummary.join('、') : '排版格式';
      showToast(`✨ 已完成自動修正：${summaryMsg}`, 'success', 3000);
    } else {
      showToast('排版格式皆正確，無須調整', 'info');
    }
  };

  btnFix.addEventListener('click', handleAutoFix);

  // Global Keyboard Shortcut: Alt+F for Auto-Fix
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      handleAutoFix();
    }
  });

  // Theme Toggle Action
  const toggleTheme = () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.className = currentTheme;
    editor.setTheme(currentTheme);
    setMermaidTheme(currentTheme);

    if (currentTheme === 'light') {
      themeIconMoon.style.display = 'none';
      themeIconSun.style.display = 'block';
      showToast('☀️ 已切換為淺色主題', 'info');
    } else {
      themeIconMoon.style.display = 'block';
      themeIconSun.style.display = 'none';
      showToast('🌙 已切換為深色主題', 'info');
    }

    // Re-render to update Mermaid SVGs and markdown colors
    doRender(editor.getValue());
  };

  btnThemeToggle.addEventListener('click', toggleTheme);

  // Global Keyboard Shortcut: Alt+T for Theme Toggle
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Topbar Actions
  btnSample.addEventListener('click', () => {
    // Load the large sample only on explicit user action (improves cold start performance)
    editor.setValue(SAMPLE_MARKDOWN);
    docTitleInput.value = 'Untitled.md';
    doRender(SAMPLE_MARKDOWN);
    showToast('已載入範例模板', 'info');
  });

  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      docTitleInput.value = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (typeof text === 'string') {
          editor.setValue(text);
          doRender(text);
          showToast(`已成功開啟：${file.name}`, 'success');
        }
      };
      reader.readAsText(file);
      target.value = ''; // Reset input
    }
  });

  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(editor.getValue());
      showToast('已複製 Markdown 原始碼至剪貼簿', 'success');
    } catch {
      showToast('複製失敗，請檢查權限', 'error');
    }
  });

  btnClear.addEventListener('click', () => {
    editor.setValue('');
    doRender('');
    showToast('已清空編輯器內容', 'info');
  });

  btnEditorWrap.addEventListener('click', () => {
    const isWrapped = editor.toggleWrap();
    btnEditorWrap.classList.toggle('active', isWrapped);
    btnEditorWrap.textContent = isWrapped ? '自動換行' : '不換行';
  });

  // Export Dropdown
  btnExportDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownWrapper.classList.toggle('open');
    exportMenu.hidden = !isOpen;
    btnExportDropdown.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!dropdownWrapper.contains(e.target as Node)) {
      dropdownWrapper.classList.remove('open');
      exportMenu.hidden = true;
      btnExportDropdown.setAttribute('aria-expanded', 'false');
    }
  });

  // Export actions
  exportMenu.querySelectorAll<HTMLButtonElement>('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const type = item.dataset.export;
      const filename = docTitleInput.value.trim() || 'Untitled.md';
      dropdownWrapper.classList.remove('open');
      exportMenu.hidden = true;

      if (type === 'md') {
        exportMarkdown(editor.getValue(), filename);
        showToast('已成功匯出 Markdown 檔案', 'success');
      } else if (type === 'html') {
        exportHtml(previewContent, filename);
        showToast('已成功匯出獨立 HTML 檔案', 'success');
      } else if (type === 'pdf') {
        // Switch to preview/split if currently in editor only mode for printing
        const currentMode = layoutSwitcher.getMode();
        if (currentMode === 'editor') {
          layoutSwitcher.setMode('split');
        }
        showToast('準備列印 / 匯出 PDF...', 'info');
        setTimeout(() => exportPdf(), 100);
      }
    });
  });

  // Zero-Persistence Protection (beforeunload)
  window.addEventListener('beforeunload', (e) => {
    if (isEdited && editor.getValue().trim().length > 0) {
      e.preventDefault();
      e.returnValue = '您的內容尚未匯出，重新整理或離開將徹底抹除資料，確定要離開嗎？';
      return e.returnValue;
    }
  });
});
