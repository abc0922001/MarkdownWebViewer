/**
 * 雙欄版面分隔條拖曳調整管理員。
 *
 * 支援滑鼠與觸控事件，能智慧依據視窗寬度於「桌面水平分割」（橫向拖曳寬度）
 * 與「行動裝置垂直分割」（縱向拖曳高度）之間自動切換，
 * 並將面板尺寸嚴格限制於 15% 至 85% 之間，避免任一面板過度縮減導致排版破裂。
 */
export class PaneResizer {
  /** 中央分隔條 DOM 元素 */
  private resizer: HTMLElement;
  /** 左側／上方編輯器面板 DOM 元素 */
  private editorPane: HTMLElement;
  /** 右側／下方預覽區面板 DOM 元素 */
  private previewPane: HTMLElement;
  /** 工作區主容器 DOM 元素 */
  private workspace: HTMLElement;
  /** 是否處於拖曳調整狀態之標記 */
  private isDragging = false;
  /** 拖曳起始時之座標（桌面為 X 軸，手機為 Y 軸，單位為像素） */
  private startCoord = 0;
  /** 拖曳起始時編輯器面板之長度（桌面為寬度，手機為高度，單位為像素） */
  private startEditorSize = 0;
  /** 上次記錄之視窗寬度狀態，用於判斷是否跨越 RWD 斷點 */
  private wasVertical = false;

  /**
   * 初始化分隔條拖曳管理員並綁定事件。
   */
  constructor() {
    this.resizer = document.getElementById('pane-resizer')!;
    this.editorPane = document.getElementById('editor-pane')!;
    this.previewPane = document.getElementById('preview-pane')!;
    this.workspace = document.getElementById('app-workspace')!;

    if (!this.resizer || !this.editorPane || !this.previewPane) return;

    this.wasVertical = window.innerWidth <= 768;
    this.initEvents();
    this.initResizeListener();
  }

  /**
   * 判斷當前工作區是否處於手機直向縱向排列模式（<= 768px）。
   *
   * @returns 若視窗寬度小於等於 768px 則回傳 true，否則回傳 false
   */
  private isVerticalMode(): boolean {
    return window.innerWidth <= 768;
  }

  /**
   * 初始化滑鼠與觸控拖曳監聽事件。
   *
   * 於拖曳開始時動態於 window 註冊移動與釋放事件，並於結束時解除註冊以節省資源。
   */
  private initEvents(): void {
    // 拖曳啟動處理器（支援滑鼠按鈕與觸控點擊）
    const onMouseDown = (e: MouseEvent | TouchEvent) => {
      this.isDragging = true;
      this.resizer.classList.add('resizing');
      const isVertical = this.isVerticalMode();

      document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';

      const coord = 'touches' in e
        ? (isVertical ? e.touches[0].clientY : e.touches[0].clientX)
        : (isVertical ? e.clientY : e.clientX);

      this.startCoord = coord;
      const rect = this.editorPane.getBoundingClientRect();
      this.startEditorSize = isVertical ? rect.height : rect.width;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onMouseMove, { passive: false });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    };

    // 拖曳移動處理器
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const isVertical = this.isVerticalMode();

      const coord = 'touches' in e
        ? (isVertical ? e.touches[0].clientY : e.touches[0].clientX)
        : (isVertical ? e.clientY : e.clientX);

      const delta = coord - this.startCoord;
      const wsRect = this.workspace.getBoundingClientRect();
      const totalSize = isVertical ? wsRect.height : wsRect.width;

      if (totalSize <= 0) return;

      let newEditorSize = this.startEditorSize + delta;
      let editorPercent = (newEditorSize / totalSize) * 100;

      // 嚴格限制編輯區佔比於 15% 至 85% 之間
      editorPercent = Math.max(15, Math.min(85, editorPercent));
      const previewPercent = 100 - editorPercent;

      if (isVertical) {
        this.editorPane.style.height = `${editorPercent}%`;
        this.previewPane.style.height = `${previewPercent}%`;
        this.editorPane.style.width = '';
        this.previewPane.style.width = '';
      } else {
        this.editorPane.style.width = `${editorPercent}%`;
        this.previewPane.style.width = `${previewPercent}%`;
        this.editorPane.style.height = '';
        this.previewPane.style.height = '';
      }

      if ('touches' in e && e.cancelable) {
        e.preventDefault();
      }
    };

    // 拖曳結束處理器
    const onMouseUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.resizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // 移除全域移動與釋放監聽器
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };

    this.resizer.addEventListener('mousedown', onMouseDown);
    this.resizer.addEventListener('touchstart', onMouseDown, { passive: true });
  }

  /**
   * 監聽視窗尺寸改變事件，當跨越 768px 斷點時自動清理行內尺寸樣式以防樣式衝突。
   */
  private initResizeListener(): void {
    window.addEventListener('resize', () => {
      const isVertical = this.isVerticalMode();
      if (isVertical !== this.wasVertical) {
        this.wasVertical = isVertical;
        this.resetSizes();
      }
    });
  }

  /**
   * 重置編輯區與預覽區面板尺寸為預設值。
   */
  public resetSizes(): void {
    this.editorPane.style.width = '';
    this.previewPane.style.width = '';
    this.editorPane.style.height = '';
    this.previewPane.style.height = '';
  }

  /**
   * 重置編輯區與預覽區面板寬度為預設之各佔 50%（維持向後相容）。
   */
  public resetWidths(): void {
    this.resetSizes();
  }
}

