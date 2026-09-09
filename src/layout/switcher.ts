/**
 * 支援之版面模式：
 * - `editor`: 純編輯器模式（隱藏預覽區）
 * - `split`: 雙欄對照模式（同時顯示編輯器與預覽區）
 * - `preview`: 純預覽模式（隱藏編輯器與次要操作欄位）
 */
export type LayoutMode = 'editor' | 'split' | 'preview';

/**
 * 支援之純瀏覽自訂閱讀模式：
 * - `auto`: 自適應寬度（預設 max-width 860px 視窗彈性置中排版）
 * - `tablet`: 平板直式（834px 寬度，適配 11 吋 4:3 規格）
 * - `mobile`: 手機直式（412px 寬度，適配 6.3 吋 18:9 規格）
 */
export type ReadingMode = 'auto' | 'tablet' | 'mobile';

/**
 * 版面切換管理員。
 *
 * 管理分段控制器（Segmented Control）之三態版面狀態機、
 * 滑動膠囊指示條（Pill Indicator）動畫、快速鍵（Alt+1 / Alt+2 / Alt+3 / Alt+Z / Alt+M / Esc）、
 * 純瀏覽極簡排版、手機/平板直式閱讀模式與專注全螢幕閱讀模式（Zen Mode）之狀態切換。
 */
export class LayoutSwitcher {
  /** 目前版面模式，預設為雙欄對照（split） */
  private currentMode: LayoutMode = 'split';
  /** 目前純瀏覽閱讀模式，預設為自適應（auto） */
  private currentReadingMode: ReadingMode = 'auto';
  /** 應用程式最外層根節點（用於全域版面狀態樣式選擇器） */
  private appRoot: HTMLElement | null = null;
  /** 工作區主容器元素 */
  private workspace: HTMLElement;
  /** 預覽區捲動容器元素 */
  private previewScrollContainer: HTMLElement | null = null;
  /** 版面切換按鈕元素對應表 */
  private buttons: Map<LayoutMode, HTMLElement> = new Map();
  /** 分段控制器滑動背景指示條元素 */
  private indicator: HTMLElement | null = null;
  /** 版面模式變更時之回呼函式佇列 */
  private onModeChangeCallbacks: Array<(mode: LayoutMode) => void> = [];
  /** 閱讀模式變更時之回呼函式佇列 */
  private onReadingModeChangeCallbacks: Array<(mode: ReadingMode) => void> = [];

  /** 閱讀模式下拉選單外層包覆容器 */
  private readingModeWrapper: HTMLElement | null = null;
  /** 閱讀模式切換按鈕元素 */
  private btnReadingModeDropdown: HTMLElement | null = null;
  /** 閱讀模式下拉選單本體元素 */
  private readingModeMenu: HTMLElement | null = null;
  /** 閱讀模式按鈕當前標籤文字元素 */
  private readingModeLabel: HTMLElement | null = null;
  /** 閱讀模式各設備圖示對應表 */
  private readingModeIcons: Map<ReadingMode, HTMLElement> = new Map();
  /** 閱讀模式下拉項目按鈕對應表 */
  private readingModeItems: Map<ReadingMode, HTMLElement> = new Map();

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
   * 初始化版面切換器，綁定分段控制器按鈕點選、閱讀模式切換、專注模式控制與全域鍵盤快速鍵。
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

    // 初始化純瀏覽閱讀模式 DOM 元件
    this.previewScrollContainer = document.getElementById('preview-scroll-container');
    this.readingModeWrapper = document.getElementById('reading-mode-dropdown-wrapper');
    this.btnReadingModeDropdown = document.getElementById('btn-reading-mode-dropdown');
    this.readingModeMenu = document.getElementById('reading-mode-menu');
    this.readingModeLabel = document.getElementById('reading-mode-label');

    const iconAuto = document.getElementById('reading-mode-icon-auto');
    const iconTablet = document.getElementById('reading-mode-icon-tablet');
    const iconMobile = document.getElementById('reading-mode-icon-mobile');
    if (iconAuto) this.readingModeIcons.set('auto', iconAuto);
    if (iconTablet) this.readingModeIcons.set('tablet', iconTablet);
    if (iconMobile) this.readingModeIcons.set('mobile', iconMobile);

    const readingModes: ReadingMode[] = ['auto', 'tablet', 'mobile'];
    readingModes.forEach((mode) => {
      const item = document.querySelector(`.dropdown-item[data-reading-mode="${mode}"]`) as HTMLElement | null;
      if (item) {
        this.readingModeItems.set(mode, item);
        item.addEventListener('click', () => {
          this.setReadingMode(mode);
          this.closeReadingModeMenu();
        });
      }
    });

    if (this.btnReadingModeDropdown) {
      this.btnReadingModeDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleReadingModeMenu();
      });
    }

    // 點擊選單外部關閉閱讀模式下拉選單
    window.addEventListener('click', (e) => {
      const target = e.target;
      if (this.readingModeWrapper && target instanceof Node && !this.readingModeWrapper.contains(target)) {
        this.closeReadingModeMenu();
      }
    });

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

    // 註冊版面切換鍵盤快速鍵：Alt+1（編輯）、Alt+2（雙欄）、Alt+3（預覽）、Alt+Z（專注）、Alt+M（循環閱讀模式）、Escape（返回雙欄）
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
        this.setZenMode(false);
        this.setMode('preview');
      } else if (e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.toggleZenMode();
      } else if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        // 僅在純瀏覽模式下支援 Alt+M 循環切換閱讀模式 (auto -> tablet -> mobile -> auto)
        if (this.currentMode === 'preview') {
          e.preventDefault();
          this.cycleReadingMode();
        }
      } else if (e.key === 'Escape') {
        // 若目前正處於輸入焦點或有展開之下拉選單，優先保留原操作
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu && !exportMenu.hidden) {
          return;
        }
        if (this.readingModeMenu && !this.readingModeMenu.hidden) {
          e.preventDefault();
          this.closeReadingModeMenu();
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

    // 當處於專注模式時，滑鼠移至視窗頂部邊緣自動臨時顯示頂端工具列
    window.addEventListener('mousemove', (e) => {
      if (!this.isZen || !this.appRoot) return;
      if (e.clientY <= 14) {
        this.appRoot.classList.add('header-peek');
      } else if (e.clientY > 60) {
        // 若焦點在頂欄輸入框中，或匯出選單/閱讀模式選單處於開啟狀態，或游標仍位於頂欄元素內，保留工具列滑出狀態
        const active = document.activeElement;
        const appHeader = this.appRoot.querySelector('.app-header');
        if (active && appHeader && appHeader.contains(active)) {
          return;
        }
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu && !exportMenu.hidden) {
          return;
        }
        const readingMenu = document.getElementById('reading-mode-menu');
        if (readingMenu && !readingMenu.hidden) {
          return;
        }
        if (appHeader && appHeader.matches(':hover')) {
          return;
        }
        this.appRoot.classList.remove('header-peek');
      }
    });

    this.workspace.setAttribute('data-layout', this.currentMode);
    if (this.appRoot) {
      this.appRoot.setAttribute('data-layout', this.currentMode);
    }
    this.updateUI();
  }

  /**
   * 設定版面模式，更新工作區 DOM 屬性與分段控制器視覺狀態，並通知訂閱者。
   *
   * @param mode 目標版面模式
   */
  public setMode(mode: LayoutMode): void {
    if (this.currentMode === mode) return;

    // 若自純瀏覽切換回其他模式，確保自動關閉專注閱讀模式、重設閱讀模式為自適應寬度並收合選單
    if (mode !== 'preview') {
      if (this.isZen) {
        this.setZenMode(false);
      }
      if (this.currentReadingMode !== 'auto') {
        this.setReadingMode('auto');
      }
      this.closeReadingModeMenu();
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
   * 取得目前作用中之版面模式。
   *
   * @returns 目前版面模式（'editor' | 'split' | 'preview'）
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
      const title = enabled ? '結束專注閱讀模式 (快速鍵: Alt+Z / Esc)' : '切換專注閱讀模式 (快速鍵: Alt+Z)';
      this.btnZenMode.title = title;
      this.btnZenMode.setAttribute('aria-label', title);
    }
  }

  /**
   * 取得目前是否處於專注全螢幕閱讀模式。
   *
   * @returns 是否為專注模式
   */
  public isZenMode(): boolean {
    return this.isZen;
  }

  /**
   * 註冊版面模式變更監聽回呼函式。
   *
   * @param callback 當版面模式變更時觸發之回呼函式
   */
  public onModeChange(callback: (mode: LayoutMode) => void): void {
    this.onModeChangeCallbacks.push(callback);
  }

  /**
   * 切換閱讀模式選單之展開或收合狀態。
   */
  public toggleReadingModeMenu(): void {
    if (!this.readingModeMenu || !this.readingModeWrapper || !this.btnReadingModeDropdown) return;
    const isClosed = this.readingModeMenu.hidden;
    if (isClosed) {
      // 關閉匯出選單避免重疊
      const exportMenu = document.getElementById('export-menu');
      const exportWrapper = document.getElementById('btn-export-dropdown')?.closest('.dropdown-wrapper');
      if (exportMenu) exportMenu.hidden = true;
      if (exportWrapper) exportWrapper.classList.remove('open');

      this.readingModeMenu.hidden = false;
      this.readingModeWrapper.classList.add('open');
      this.btnReadingModeDropdown.setAttribute('aria-expanded', 'true');
    } else {
      this.closeReadingModeMenu();
    }
  }

  /**
   * 關閉閱讀模式下拉選單。
   */
  public closeReadingModeMenu(): void {
    if (!this.readingModeMenu || !this.readingModeWrapper || !this.btnReadingModeDropdown) return;
    this.readingModeMenu.hidden = true;
    this.readingModeWrapper.classList.remove('open');
    this.btnReadingModeDropdown.setAttribute('aria-expanded', 'false');
  }

  /**
   * 設定純瀏覽自訂閱讀模式（'auto' | 'tablet' | 'mobile'）。
   *
   * @param mode 目標閱讀模式
   */
  public setReadingMode(mode: ReadingMode): void {
    this.currentReadingMode = mode;

    if (this.previewScrollContainer) {
      if (mode === 'auto') {
        this.previewScrollContainer.removeAttribute('data-reading-mode');
      } else {
        this.previewScrollContainer.setAttribute('data-reading-mode', mode);
      }
    }

    // 更新選單項目的 active 樣式
    this.readingModeItems.forEach((item, itemMode) => {
      item.classList.toggle('active', itemMode === mode);
    });

    // 更新下拉按鈕圖示與文字
    this.readingModeIcons.forEach((icon, iconMode) => {
      icon.style.display = iconMode === mode ? 'block' : 'none';
    });

    if (this.readingModeLabel) {
      const labels: Record<ReadingMode, string> = {
        auto: '自適應',
        tablet: '平板直式',
        mobile: '手機直式',
      };
      this.readingModeLabel.textContent = labels[mode] || '自適應';
    }

    this.onReadingModeChangeCallbacks.forEach((cb) => cb(mode));
  }

  /**
   * 依序循環切換閱讀模式：auto ➔ tablet ➔ mobile ➔ auto。
   */
  public cycleReadingMode(): void {
    const cycle: Record<ReadingMode, ReadingMode> = {
      auto: 'tablet',
      tablet: 'mobile',
      mobile: 'auto',
    };
    this.setReadingMode(cycle[this.currentReadingMode] || 'auto');
  }

  /**
   * 取得目前純瀏覽閱讀模式。
   *
   * @returns 目前閱讀模式（'auto' | 'tablet' | 'mobile'）
   */
  public getReadingMode(): ReadingMode {
    return this.currentReadingMode;
  }

  /**
   * 註冊閱讀模式變更監聽回呼函式。
   *
   * @param callback 當閱讀模式變更時觸發之回呼函式
   */
  public onReadingModeChange(callback: (mode: ReadingMode) => void): void {
    this.onReadingModeChangeCallbacks.push(callback);
  }

  /**
   * 根據目前模式更新切換按鈕的 active 狀態與滑動指示條之位移量。
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
