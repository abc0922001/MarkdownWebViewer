// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LayoutSwitcher } from './switcher';

describe('LayoutSwitcher (版面切換與純瀏覽極簡模式)', () => {
  let switcher: LayoutSwitcher;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app" class="app-root" data-layout="split">
        <header class="app-header">
          <div class="header-controls">
            <button id="btn-theme-toggle" class="action-btn"></button>
            <button id="btn-zen-mode" class="action-btn zen-toggle-btn">
              <svg id="zen-icon-enter"></svg>
              <svg id="zen-icon-exit" style="display: none;"></svg>
            </button>
            <div class="dropdown-wrapper">
              <button id="btn-export-dropdown"></button>
              <div id="export-menu" class="dropdown-menu" hidden></div>
            </div>
          </div>
          <div class="segmented-control">
            <div id="segmented-indicator" class="segmented-indicator"></div>
            <button id="btn-layout-editor" class="segment-btn" data-layout="editor">純編輯</button>
            <button id="btn-layout-split" class="segment-btn active" data-layout="split">雙欄對照</button>
            <button id="btn-layout-preview" class="segment-btn" data-layout="preview">純瀏覽</button>
          </div>
        </header>

        <div id="zen-floating-pill" class="zen-floating-pill" hidden>
          <button id="btn-zen-to-split" class="zen-pill-btn">雙欄對照</button>
          <button id="btn-zen-exit-pill" class="zen-pill-btn">顯示工具列</button>
        </div>

        <main id="app-workspace" class="workspace" data-layout="split">
          <section id="editor-pane" class="editor-pane"></section>
          <div id="pane-resizer" class="pane-resizer"></div>
          <section id="preview-pane" class="preview-pane"></section>
        </main>

        <footer id="app-statusbar" class="app-statusbar"></footer>
      </div>
    `;

    switcher = new LayoutSwitcher();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('初始預設模式應為雙欄對照（split），並正確同步 data-layout 於 workspace 與 app 根節點', () => {
    expect(switcher.getMode()).toBe('split');
    const app = document.getElementById('app');
    const workspace = document.getElementById('app-workspace');
    expect(app?.getAttribute('data-layout')).toBe('split');
    expect(workspace?.getAttribute('data-layout')).toBe('split');
    expect(document.getElementById('btn-layout-split')?.classList.contains('active')).toBe(true);
  });

  it('切換至純編輯模式（editor）時，應同步更新 DOM 屬性與按鈕 active 樣式', () => {
    switcher.setMode('editor');
    expect(switcher.getMode()).toBe('editor');

    const app = document.getElementById('app');
    const workspace = document.getElementById('app-workspace');
    expect(app?.getAttribute('data-layout')).toBe('editor');
    expect(workspace?.getAttribute('data-layout')).toBe('editor');
    expect(document.getElementById('btn-layout-editor')?.classList.contains('active')).toBe(true);
    expect(document.getElementById('btn-layout-split')?.classList.contains('active')).toBe(false);
  });

  it('切換至純瀏覽模式（preview）時，app 根節點應具有 data-layout="preview"', () => {
    switcher.setMode('preview');
    expect(switcher.getMode()).toBe('preview');

    const app = document.getElementById('app');
    const workspace = document.getElementById('app-workspace');
    expect(app?.getAttribute('data-layout')).toBe('preview');
    expect(workspace?.getAttribute('data-layout')).toBe('preview');
    expect(document.getElementById('btn-layout-preview')?.classList.contains('active')).toBe(true);
  });

  it('自純瀏覽切換回雙欄對照時，data-layout 應正確還原為 split', () => {
    switcher.setMode('preview');
    expect(switcher.getMode()).toBe('preview');

    switcher.setMode('split');
    expect(switcher.getMode()).toBe('split');

    const app = document.getElementById('app');
    expect(app?.getAttribute('data-layout')).toBe('split');
  });

  it('點擊分段控制器按鈕應正確觸發版面切換', () => {
    const btnPreview = document.getElementById('btn-layout-preview');
    btnPreview?.click();
    expect(switcher.getMode()).toBe('preview');

    const btnEditor = document.getElementById('btn-layout-editor');
    btnEditor?.click();
    expect(switcher.getMode()).toBe('editor');
  });

  it('應正確觸發 onModeChange 回呼通知', () => {
    let notifiedMode = '';
    switcher.onModeChange((mode) => {
      notifiedMode = mode;
    });

    switcher.setMode('preview');
    expect(notifiedMode).toBe('preview');
  });

  describe('快捷鍵切換支援', () => {
    it('按 Alt+1 應切換至純編輯模式', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', altKey: true }));
      expect(switcher.getMode()).toBe('editor');
    });

    it('按 Alt+2 應切換至雙欄對照模式', () => {
      switcher.setMode('preview');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', altKey: true }));
      expect(switcher.getMode()).toBe('split');
    });

    it('按 Alt+3 應切換至純瀏覽模式', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', altKey: true }));
      expect(switcher.getMode()).toBe('preview');
    });

    it('在純瀏覽模式下按 Escape 鍵應自動返回雙欄對照模式', () => {
      switcher.setMode('preview');
      expect(switcher.getMode()).toBe('preview');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(switcher.getMode()).toBe('split');
    });

    it('若使用者正處於文字輸入框（input），按 Escape 不應觸發返回雙欄', () => {
      switcher.setMode('preview');

      const input = document.createElement('input');
      document.body.appendChild(input);
      input.focus();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(switcher.getMode()).toBe('preview'); // 維持純瀏覽
      input.remove();
    });

    it('若匯出下拉選單處於開啟狀態，按 Escape 不應觸發返回雙欄', () => {
      switcher.setMode('preview');

      const exportMenu = document.getElementById('export-menu');
      if (exportMenu) exportMenu.hidden = false;

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(switcher.getMode()).toBe('preview'); // 優先由選單關閉邏輯處理
    });
  });

  describe('專注閱讀模式（Zen Mode）支援', () => {
    it('開啟專注模式時應自動切換為純瀏覽模式並顯示懸浮膠囊', () => {
      switcher.setZenMode(true);

      expect(switcher.isZenMode()).toBe(true);
      expect(switcher.getMode()).toBe('preview');

      const app = document.getElementById('app');
      expect(app?.classList.contains('zen-mode')).toBe(true);

      const pill = document.getElementById('zen-floating-pill');
      expect(pill?.hidden).toBe(false);
    });

    it('點擊專注模式懸浮膠囊中的「雙欄對照」應退出專注模式並返回雙欄', () => {
      switcher.setZenMode(true);
      expect(switcher.isZenMode()).toBe(true);

      const btnZenToSplit = document.getElementById('btn-zen-to-split');
      btnZenToSplit?.click();

      expect(switcher.isZenMode()).toBe(false);
      expect(switcher.getMode()).toBe('split');

      const app = document.getElementById('app');
      expect(app?.classList.contains('zen-mode')).toBe(false);
      expect(app?.getAttribute('data-layout')).toBe('split');
    });

    it('點擊專注模式懸浮膠囊中的「顯示工具列」應退出專注模式但維持純瀏覽', () => {
      switcher.setZenMode(true);
      expect(switcher.isZenMode()).toBe(true);

      const btnZenExit = document.getElementById('btn-zen-exit-pill');
      btnZenExit?.click();

      expect(switcher.isZenMode()).toBe(false);
      expect(switcher.getMode()).toBe('preview');
    });

    it('處於專注模式時按 Escape 應優先退出專注模式', () => {
      switcher.setZenMode(true);
      expect(switcher.isZenMode()).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(switcher.isZenMode()).toBe(false);
      expect(switcher.getMode()).toBe('preview');
    });

    it('按 Alt+Z 應能切換專注模式之開關狀態', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', altKey: true }));
      expect(switcher.isZenMode()).toBe(true);
      expect(switcher.getMode()).toBe('preview');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', altKey: true }));
      expect(switcher.isZenMode()).toBe(false);
    });

    it('切換至純編輯模式時應自動關閉專注模式', () => {
      switcher.setZenMode(true);
      expect(switcher.isZenMode()).toBe(true);

      switcher.setMode('editor');
      expect(switcher.isZenMode()).toBe(false);
      expect(switcher.getMode()).toBe('editor');
    });

    it('處於專注模式時按 Alt+3 應正確退出專注模式並維持純瀏覽', () => {
      switcher.setZenMode(true);
      expect(switcher.isZenMode()).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', altKey: true }));
      expect(switcher.isZenMode()).toBe(false);
      expect(switcher.getMode()).toBe('preview');
    });

    it('游標移至視窗頂部 14px 內應滑出頂欄，且頂欄內部有焦點或選單展開時不應誤收回', () => {
      switcher.setZenMode(true);
      const app = document.getElementById('app');

      // 移至頂部邊緣觸發滑出
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 10 }));
      expect(app?.classList.contains('header-peek')).toBe(true);

      // 於頂欄內加入輸入框並聚焦
      const input = document.createElement('input');
      document.querySelector('.app-header')?.appendChild(input);
      input.focus();

      // 游標移出超過 60px，但因有焦點故不應收回
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 80 }));
      expect(app?.classList.contains('header-peek')).toBe(true);

      // 解除焦點後再次移出，應正確收回
      input.blur();
      input.remove();
      window.dispatchEvent(new MouseEvent('mousemove', { clientY: 80 }));
      expect(app?.classList.contains('header-peek')).toBe(false);
    });

    it('若 app 根節點無預設 data-layout 屬性，初始化時應自動同步設置', () => {
      const app = document.getElementById('app');
      app?.removeAttribute('data-layout');
      expect(app?.hasAttribute('data-layout')).toBe(false);

      const newSwitcher = new LayoutSwitcher();
      expect(app?.getAttribute('data-layout')).toBe('split');
      expect(newSwitcher.getMode()).toBe('split');
    });
  });
});
