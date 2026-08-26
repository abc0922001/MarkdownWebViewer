/**
 * 支援之版面佈局模式：
 * - `editor`: 純編輯器模式（隱藏預覽區）
 * - `split`: 雙欄對照模式（同時顯示編輯器與預覽區）
 * - `preview`: 純預覽模式（隱藏編輯器）
 */
export type LayoutMode = 'editor' | 'split' | 'preview';

/**
 * 版面佈局切換管理員。
 *
 * 管理分段控制器（Segmented Control）之三態佈局狀態機、
 * 滑動膠囊指示條（Pill Indicator）動畫、快捷鍵（Alt+1 / Alt+2 / Alt+3）與狀態變更監聽事件。
 */
export class LayoutSwitcher {
  /** 當前版面佈局模式，預設為雙欄對照（split） */
  private currentMode: LayoutMode = 'split';
  /** 工作區主容器元素 */
  private workspace: HTMLElement;
  /** 版面切換按鈕元素映射表 */
  private buttons: Map<LayoutMode, HTMLElement> = new Map();
  /** 分段控制器滑動背景指示條元素 */
  private indicator: HTMLElement | null = null;
  /** 佈局模式變更時之回呼函式佇列 */
  private onModeChangeCallbacks: Array<(mode: LayoutMode) => void> = [];

  /**
   * 初始化版面切換器，綁定分段控制器按鈕點擊與全域鍵盤快捷鍵。
   */
  constructor() {
    this.workspace = document.getElementById('app-workspace')!;
    this.indicator = document.getElementById('segmented-indicator');

    const btnEditor = document.getElementById('btn-layout-editor');
    const btnSplit = document.getElementById('btn-layout-split');
    const btnPreview = document.getElementById('btn-layout-preview');

    if (btnEditor) this.buttons.set('editor', btnEditor);
    if (btnSplit) this.buttons.set('split', btnSplit);
    if (btnPreview) this.buttons.set('preview', btnPreview);

    this.buttons.forEach((btn, mode) => {
      btn.addEventListener('click', () => this.setMode(mode));
    });

    // 註冊版面切換鍵盤快捷鍵：Alt+1（編輯）、Alt+2（雙欄）、Alt+3（預覽）
    window.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === '1') {
        e.preventDefault();
        this.setMode('editor');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        this.setMode('split');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        this.setMode('preview');
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
    this.currentMode = mode;
    this.workspace.setAttribute('data-layout', mode);
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
