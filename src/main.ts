import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/editor.css';
import './styles/preview.css';
import './styles/dropdown.css';
import './styles/print.css';

/** 快取之 Markdown 渲染模組 Promise 實例，用於模組延遲載入 */
let markdownRendererPromise: Promise<typeof import('./renderer/markdown')> | null = null;

/**
 * 按需非同步載入 Markdown 解析渲染引擎（包含 markdown-it、Highlight.js 與 DOMPurify）。
 *
 * 避免首屏同步載入大型解析套件，提升初始頁面渲染速度。
 *
 * @returns Markdown 解析模組之 Promise
 */
function getMarkdownRenderer() {
  if (!markdownRendererPromise) {
    markdownRendererPromise = import('./renderer/markdown');
  }
  return markdownRendererPromise;
}

import { LayoutSwitcher } from './layout/switcher';
import { PaneResizer } from './layout/resizer';
import { SyncScrollManager } from './layout/sync-scroll';
import { MarkdownEditor } from './editor/codemirror';
import { exportMarkdown } from './exporter/md-exporter';
import { exportHtml } from './exporter/html-exporter';
import { exportPdf } from './exporter/pdf-exporter';
import { SAMPLE_MARKDOWN } from './utils/sample';
import { debounce } from './utils/debounce';
import { showToast } from './utils/toast';
import { fixMarkdownFormatting } from './utils/formatter';

/**
 * 應用程式進入點，於 DOMContentLoaded 完成後初始化全站介面與各功能模組。
 */
document.addEventListener('DOMContentLoaded', () => {
  // 取得關鍵介面 DOM 節點
  const editorPane = document.getElementById('editor-pane')!;
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

  // 狀態列統計元素
  const statLines = document.getElementById('stat-lines')!;
  const statWords = document.getElementById('stat-words')!;
  const statChars = document.getElementById('stat-chars')!;
  const statCursor = document.getElementById('stat-cursor')!;

  /** 當前全站視覺主題（'dark' | 'light'），由 html 根節點 class 自動偵測初始狀態 */
  let currentTheme: 'dark' | 'light' = document.documentElement.classList.contains('light') ? 'light' : 'dark';
  /** 是否存在未匯出之修改標記 */
  let isEdited = false;
  /** CodeMirror 6 編輯器核心實例 */
  let editorInstance: MarkdownEditor;

  // 初始化主題切換按鈕圖示狀態
  themeIconMoon.style.display = currentTheme === 'dark' ? 'block' : 'none';
  themeIconSun.style.display = currentTheme === 'light' ? 'block' : 'none';

  /**
   * 取得當前編輯器內容。
   *
   * @returns 當前文件內容
   */
  const getEditorValue = (): string => {
    return editorInstance ? editorInstance.getValue() : '';
  };

  /**
   * 設定編輯器內容。
   *
   * @param text 欲寫入之 Markdown 內容
   */
  const setEditorValue = (text: string): void => {
    if (editorInstance) {
      editorInstance.setValue(text);
    }
  };

  /**
   * 更新狀態列的文件統計數據（行數、單字數、字元數）。
   */
  const updateMetrics = () => {
    if (!editorInstance) {
      statLines.textContent = '0 行';
      statWords.textContent = '0 字';
      statChars.textContent = '0 字元';
      return;
    }
    const { lines, words, chars } = editorInstance.getMetrics();
    statLines.textContent = `${lines} 行`;
    statWords.textContent = `${words} 字`;
    statChars.textContent = `${chars} 字元`;
  };

  /**
   * 更新右下角渲染狀態指示燈之外觀與文字。
   *
   * @param state 渲染狀態（'rendering' | 'synced' | 'error'）
   */
  const setRenderState = (state: 'rendering' | 'synced' | 'error') => {
    renderIndicator.className = `render-indicator ${state}`;
    const textEl = renderIndicator.querySelector('.status-text');
    if (textEl) {
      if (state === 'rendering') textEl.textContent = '轉譯中...';
      else if (state === 'synced') textEl.textContent = '已同步';
      else if (state === 'error') textEl.textContent = '解析錯誤';
    }
  };

  /**
   * 非同步執行 Markdown 解析與 Mermaid 圖表繪製管線。
   *
   * @param markdownText 待轉譯之 Markdown 原始文字
   */
  const doRender = async (markdownText: string) => {
    // 內容為空時直接呈現預設佔位提示，避免耗損解析資源
    if (!markdownText || !markdownText.trim()) {
      previewContent.innerHTML = '<div class="empty-placeholder">開始輸入 Markdown 內容...</div>';
      setRenderState('synced');
      updateMetrics();
      return;
    }

    setRenderState('rendering');
    try {
      const { renderMarkdownToHtml } = await getMarkdownRenderer();
      const html = renderMarkdownToHtml(markdownText);
      previewContent.innerHTML = html;

      // 僅於解析結果中包含 Mermaid 圖表時才動態載入並渲染向量圖表
      let mermaidSuccess = true;
      if (previewContent.querySelector('.mermaid-diagram')) {
        const { renderMermaidDiagrams } = await import('./renderer/mermaid');
        mermaidSuccess = await renderMermaidDiagrams(previewContent);
      }
      setRenderState(mermaidSuccess ? 'synced' : 'error');
    } catch (err) {
      console.error('Rendering error:', err);
      setRenderState('error');
    }
    updateMetrics();
  };

  /**
   * 具備 120ms 防抖排程之渲染函式，確保連續打字時介面流暢不卡頓。
   */
  const debouncedRender = debounce((content: string) => {
    doRender(content);
  }, 120);

  // 初始化版面佈局切換器與分隔條拖曳調整器
  const layoutSwitcher = new LayoutSwitcher();
  new PaneResizer();

  // 立即初始化 CodeMirror 6 編輯器核心
  editorInstance = new MarkdownEditor(editorMount, '', {
    onChange: (content) => {
      isEdited = true;
      debouncedRender(content);
    },
    onCursorActivity: (line, col) => {
      statCursor.textContent = `行 ${line}, 欄 ${col}`;
    },
  }, currentTheme);

  // 初始化雙向等比滾動同步
  new SyncScrollManager(editorInstance.getScrollElement(), previewScrollContainer);

  // 網頁開啟後立即聚焦編輯器，使使用者無需任何額外點擊即可直接輸入或按快捷鍵貼上
  editorInstance.focus();
  requestAnimationFrame(() => {
    editorInstance.focus();
  });

  // 點擊編輯區任何空白處或標題列時，自動聚焦編輯器
  editorPane.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    editorInstance.focus();
  });

  // 全域剪貼簿貼上支援：當焦點不在其他文字輸入元件且不在編輯器內時，自動將剪貼簿文字注入編輯器
  window.addEventListener('paste', (e: ClipboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
      return;
    }
    if (editorMount.contains(active)) {
      return;
    }
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      e.preventDefault();
      editorInstance.insertText(text);
      editorInstance.focus();
    }
  });

  // 全域鍵盤輸入支援：當焦點位於頁面非輸入區域時，使用者直接鍵入字元自動轉發並聚焦至編輯器
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) {
      return;
    }
    if (editorMount.contains(active)) {
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }
    if (e.key.length === 1) {
      e.preventDefault();
      editorInstance.insertText(e.key);
      editorInstance.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      editorInstance.insertText('\n');
      editorInstance.focus();
    }
  });

  // 初始化靜態 HTML 預設狀態與統計數據
  setRenderState('synced');
  updateMetrics();

  // 於瀏覽器閒置時預先載入 Markdown 解析渲染引擎，確保首次打字或貼上時極速反應
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => getMarkdownRenderer());
  } else {
    setTimeout(getMarkdownRenderer, 400);
  }

  /**
   * 執行 Markdown 自動排版修正流程。
   */
  const handleAutoFix = () => {
    const currentText = getEditorValue();
    if (!currentText.trim()) {
      showToast('編輯器為空，無須修正', 'info');
      return;
    }

    const { formatted, changed, fixesSummary } = fixMarkdownFormatting(currentText);
    if (changed) {
      setEditorValue(formatted);
      doRender(formatted);
      const summaryMsg = fixesSummary.length > 0 ? fixesSummary.join('、') : '排版格式';
      showToast(`✨ 已完成自動修正：${summaryMsg}`, 'success', 3000);
    } else {
      showToast('排版格式皆正確，無須調整', 'info');
    }
  };

  btnFix.addEventListener('click', handleAutoFix);

  // 全域快捷鍵：Alt+F 執行智慧自動修正
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      handleAutoFix();
    }
  });

  /**
   * 切換淺色與深色主題，同步重繪 CodeMirror、Mermaid 與介面圖示。
   */
  const toggleTheme = () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.className = currentTheme;
    if (editorInstance) editorInstance.setTheme(currentTheme);
    if (previewContent.querySelector('.mermaid-diagram, svg[id^="mermaid-"]')) {
      import('./renderer/mermaid').then(({ setMermaidTheme }) => setMermaidTheme(currentTheme));
    }

    if (currentTheme === 'light') {
      themeIconMoon.style.display = 'none';
      themeIconSun.style.display = 'block';
      showToast('☀️ 已切換為淺色主題', 'info');
    } else {
      themeIconMoon.style.display = 'block';
      themeIconSun.style.display = 'none';
      showToast('🌙 已切換為深色主題', 'info');
    }

    // 重新渲染以更新 Mermaid 向量樣式與語法顏色
    doRender(getEditorValue());
  };

  btnThemeToggle.addEventListener('click', toggleTheme);

  // 全域快捷鍵：Alt+T 切換色彩主題
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 't' || e.key === 'T')) {
      e.preventDefault();
      toggleTheme();
    }
  });

  // 工具列按鈕操作：載入範例模板
  btnSample.addEventListener('click', () => {
    setEditorValue(SAMPLE_MARKDOWN);
    docTitleInput.value = 'Untitled.md';
    doRender(SAMPLE_MARKDOWN);
    showToast('已載入範例模板', 'info');
  });

  // 工具列按鈕操作：開啟本機檔案
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
          setEditorValue(text);
          doRender(text);
          showToast(`已成功開啟：${file.name}`, 'success');
        }
      };
      reader.readAsText(file);
      target.value = ''; // 重置 input 供下次選取相同檔名
    }
  });

  // 工具列按鈕操作：複製 Markdown 內容至剪貼簿
  btnCopy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(getEditorValue());
      showToast('已複製 Markdown 原始碼至剪貼簿', 'success');
    } catch {
      showToast('複製失敗，請檢查權限', 'error');
    }
  });

  // 工具列按鈕操作：清空編輯器
  btnClear.addEventListener('click', () => {
    setEditorValue('');
    doRender('');
    showToast('已清空編輯器內容', 'info');
  });

  // 工具列按鈕操作：切換自動折行
  btnEditorWrap.addEventListener('click', () => {
    if (editorInstance) {
      const isWrapped = editorInstance.toggleWrap();
      btnEditorWrap.classList.toggle('active', isWrapped);
      btnEditorWrap.textContent = isWrapped ? '自動換行' : '不換行';
    }
  });

  // 匯出下拉選單展開與收合控制
  btnExportDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownWrapper.classList.toggle('open');
    exportMenu.hidden = !isOpen;
    btnExportDropdown.setAttribute('aria-expanded', String(isOpen));
  });

  // 點擊下拉選單外部自動關閉
  document.addEventListener('click', (e) => {
    if (!dropdownWrapper.contains(e.target as Node)) {
      dropdownWrapper.classList.remove('open');
      exportMenu.hidden = true;
      btnExportDropdown.setAttribute('aria-expanded', 'false');
    }
  });

  // 匯出格式選擇監聽（.md / .html / .pdf）
  exportMenu.querySelectorAll<HTMLButtonElement>('.dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const type = item.dataset.export;
      const filename = docTitleInput.value.trim() || 'Untitled.md';
      dropdownWrapper.classList.remove('open');
      exportMenu.hidden = true;

      if (type === 'md') {
        exportMarkdown(getEditorValue(), filename);
        showToast('已成功匯出 Markdown 檔案', 'success');
      } else if (type === 'html') {
        exportHtml(previewContent, filename);
        showToast('已成功匯出獨立 HTML 檔案', 'success');
      } else if (type === 'pdf') {
        // 若處於純編輯模式，切換為雙欄以確保列印預覽區域正確呈現在 DOM 樹中
        const currentMode = layoutSwitcher.getMode();
        if (currentMode === 'editor') {
          layoutSwitcher.setMode('split');
        }
        showToast('準備列印 / 匯出 PDF...', 'info');
        setTimeout(() => exportPdf(), 100);
      }
    });
  });

  // 無痕暫態保護（Zero-Persistence）：離開或重新整理頁面前提示防誤觸
  window.addEventListener('beforeunload', (e) => {
    if (isEdited && getEditorValue().trim().length > 0) {
      e.preventDefault();
      e.returnValue = '您的內容尚未匯出，重新整理或離開將徹底抹除資料，確定要離開嗎？';
      return e.returnValue;
    }
  });
});
