/**
 * 支援之版面佈局模式：
 * - `editor`: 純編輯器模式（隱藏預覽區）
 * - `split`: 雙欄對照模式（同時顯示編輯器與預覽區）
 * - `preview`: 純預覽模式（隱藏編輯器與次要操作欄位）
 */
export type LayoutMode = 'editor' | 'split' | 'preview';

/**
 * 版面佈局切換管理員。
 *
 * 管理分段控制器（Segmented Control）之三態佈局狀態機、
 * 滑動膠囊指示條（Pill Indicator）動畫、快捷鍵（Alt+1 / Alt+2 / Alt+3 / Alt+Z / Esc）、
 * 純瀏覽極簡排版與專注全螢幕閱讀模式（Zen Mode）之狀態切換。
 */
export class LayoutSwitcher {
  /** 當前版面佈局模式，預設為雙欄對照（split） */
  private currentMode: LayoutMode = 'split';
  /** 應用程式最外層根節點（用於全域版面配置狀態樣式選擇器） */
  private appRoot: HTMLElement | null = null;
  /** 工作區主容器元素 */
  private workspace: HTMLElement;
  /** 版面切換按鈕元素映射表 */
  private buttons: Map<LayoutMode, HTMLElement> = new Map();
  /** 分段控制器滑動背景指示條元素 */
  private indicator: HTMLElement | null = null;
  /** 佈局模式變更時之回呼函式佇列 */
  private onModeChangeCallbacks: Array<(mode: LayoutMode) => void> = [];

  /** 是否處於專注全螢幕閱讀模式（隱藏頂部工具列） */
  private isZen: boolean = false;
  /** 專注模式懸浮膠囊元素 */
  private zenFloatingPill: HTMLElement | null = null;
  /** 專注閱讀模式切換按鈕 */
  private btnZenMode: HTMLElement | null = null;
  /** 專注閱讀進入與退出圖示元素 */
  private zenIconEnter: HTMLElement | null = null;
  private zenIconExit: HTMLElement | null = null;

  /**
   * 初始化版面切換器，綁定分段控制器按鈕點擊、專注模式控制與全域鍵盤快捷鍵。
   */
  constructor() {
    this.appRoot = document.getElementById('app');
    this.workspace = document.getElementById('app-workspace')!;
    this.indicator = document.getElementById('segmented-indicator');

    const btnEditor = document.getElementById('btn-layout-editor');
    const btnSplit = document.getElementById('btn-layout-split');
    const btnPreview = document.getElementById('btn-layout-preview');

    if (btnEditor) this.buttons.set('editor', btnEditor);
    if (btnSplit) this.buttons.set('split', btnSplit);
    if (btnPreview) this.buttons.set('preview', btnPreview);

    this.buttons.forEach((btn, mode) => {
      btn.addEventListener('click', () => {
        if (this.isZen) {
          this.setZenMode(false);
        }
        this.setMode(mode);
      });
    });

    // 初始化專注模式 DOM 元件
    this.zenFloatingPill = document.getElementById('zen-floating-pill');
    this.btnZenMode = document.getElementById('btn-zen-mode');
    this.zenIconEnter = document.getElementById('zen-icon-enter');
    this.zenIconExit = document.getElementById('zen-icon-exit');

    const btnZenToSplit = document.getElementById('btn-zen-to-split');
    const btnZenExitPill = document.getElementById('btn-zen-exit-pill');

    if (this.btnZenMode) {
      this.btnZenMode.addEventListener('click', () => this.toggleZenMode());
    }

    if (btnZenToSplit) {
      btnZenToSplit.addEventListener('click', () => {
        this.setZenMode(false);
        this.setMode('split');
      });
    }

    if (btnZenExitPill) {
      btnZenExitPill.addEventListener('click', () => {
        this.setZenMode(false);
      });
    }

    // 註冊版面切換鍵盤快捷鍵：Alt+1（編輯）、Alt+2（雙欄）、Alt+3（預覽）、Alt+Z（專注）、Escape（返回雙欄）
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        this.setZenMode(false);
        this.setMode('editor');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        this.setZenMode(false);
        this.setMode('split');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        this.setMode('preview');
      } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.toggleZenMode();
      } else if (e.key === 'Escape') {
        // 若當前正處於輸入焦點或有展開之下拉選單，優先保留原操作
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu && !exportMenu.hidden) {
          return;
        }

        if (this.isZen) {
          e.preventDefault();
          this.setZenMode(false);
        } else if (this.currentMode === 'preview') {
          // 純瀏覽模式下按 Escape 便捷返回雙欄對照模式
          e.preventDefault();
          this.setMode('split');
        }
      }
    });

    // 當處於專注模式時，滑鼠移至視窗頂部邊緣自動臨時呼出頂端工具列
    window.addEventListener('mousemove', (e) => {
      if (!this.isZen || !this.appRoot) return;
      if (e.clientY <= 14) {
        this.appRoot.classList.add('header-peek');
      } else if (e.clientY > 54) {
        this.appRoot.classList.remove('header-peek');
      }
    });

    this.updateUI();
  }

  /**
   * 設定版面佈局模式，更新工作區 DOM 屬性與分段控制器視覺狀態，並通知訂閱者。
   *
   * @param mode 目標版面佈局模式
   */
  public setMode(mode: LayoutMode): void {
    if (this.currentMode === mode) return;

    // 若自純瀏覽切換回其他模式，確保自動關閉專注閱讀模式
    if (mode !== 'preview' && this.isZen) {
      this.setZenMode(false);
    }

    this.currentMode = mode;
    this.workspace.setAttribute('data-layout', mode);
    if (this.appRoot) {
      this.appRoot.setAttribute('data-layout', mode);
    }
    this.updateUI();
    this.onModeChangeCallbacks.forEach((cb) => cb(mode));
  }

  /**
   * 取得當前作用中之版面佈局模式。
   *
   * @returns 當前版面佈局模式（'editor' | 'split' | 'preview'）
   */
  public getMode(): LayoutMode {
    return this.currentMode;
  }

  /**
   * 切換專注閱讀模式之開啟或關閉狀態。
   */
  public toggleZenMode(): void {
    this.setZenMode(!this.isZen);
  }

  /**
   * 設定專注閱讀模式（隱藏頂部工具列）。
   *
   * @param enabled 是否開啟專注全螢幕閱讀模式
   */
  public setZenMode(enabled: boolean): void {
    if (this.isZen === enabled) return;

    // 若在非純瀏覽模式下開啟專注閱讀，自動切換至純瀏覽模式
    if (enabled && this.currentMode !== 'preview') {
      this.setMode('preview');
    }

    this.isZen = enabled;

    if (this.appRoot) {
      this.appRoot.classList.toggle('zen-mode', enabled);
      if (!enabled) {
        this.appRoot.classList.remove('header-peek');
      }
    }

    if (this.zenFloatingPill) {
      this.zenFloatingPill.hidden = !enabled;
    }

    if (this.zenIconEnter && this.zenIconExit) {
      this.zenIconEnter.style.display = enabled ? 'none' : 'block';
      this.zenIconExit.style.display = enabled ? 'block' : 'none';
    }

    if (this.btnZenMode) {
      const title = enabled ? '結束專注閱讀模式 (快捷鍵: Alt+Z / Esc)' : '切換專注閱讀模式 (快捷鍵: Alt+Z)';
      this.btnZenMode.title = title;
      this.btnZenMode.setAttribute('aria-label', title);
    }
  }

  /**
   * 取得當前是否處於專注全螢幕閱讀模式。
   *
   * @returns 是否為專注模式
   */
  public isZenMode(): boolean {
    return this.isZen;
  }

  /**
   * 註冊版面佈局模式變更監聽回呼函式。
   *
   * @param callback 當版面模式變更時觸發之回呼函式
   */
  public onModeChange(callback: (mode: LayoutMode) => void): void {
    this.onModeChangeCallbacks.push(callback);
  }

  /**
   * 根據當前模式更新切換按鈕的 active 狀態與滑動指示條之位移量。
   */
  private updateUI(): void {
    this.buttons.forEach((btn, mode) => {
      if (mode === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 更新分段控制器滑動指示條水平位移百分比
    if (this.indicator) {
      const modes: LayoutMode[] = ['editor', 'split', 'preview'];
      const index = modes.indexOf(this.currentMode);
      if (index !== -1) {
        this.indicator.style.transform = `translateX(${index * 100}%)`;
      }
    }
  }
}
