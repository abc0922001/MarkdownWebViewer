/**
 * 雙欄佈局分隔條拖曳調整管理員。
 *
 * 支援滑鼠與觸控事件，動態計算左右面板寬度比例，
 * 並將面板寬度限制於 15% 至 85% 之間，避免任一面板過度縮減導致排版破裂。
 */
export class PaneResizer {
  /** 中央分隔條 DOM 元素 */
  private resizer: HTMLElement;
  /** 左側編輯器面板 DOM 元素 */
  private editorPane: HTMLElement;
  /** 右側預覽區面板 DOM 元素 */
  private previewPane: HTMLElement;
  /** 工作區主容器 DOM 元素 */
  private workspace: HTMLElement;
  /** 是否處於拖曳調整狀態之標記 */
  private isDragging = false;
  /** 拖曳起始時之 X 座標（像素） */
  private startX = 0;
  /** 拖曳起始時編輯器面板之寬度（像素） */
  private startEditorWidth = 0;

  /**
   * 初始化分隔條拖曳管理員並綁定事件。
   */
  constructor() {
    this.resizer = document.getElementById('pane-resizer')!;
    this.editorPane = document.getElementById('editor-pane')!;
    this.previewPane = document.getElementById('preview-pane')!;
    this.workspace = document.getElementById('app-workspace')!;

    if (!this.resizer || !this.editorPane || !this.previewPane) return;

    this.initEvents();
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
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      this.startX = clientX;
      this.startEditorWidth = this.editorPane.getBoundingClientRect().width;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('touchmove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchend', onMouseUp);
    };

    // 拖曳移動處理器
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - this.startX;
      const totalWidth = this.workspace.getBoundingClientRect().width;
      
      let newEditorWidth = this.startEditorWidth + deltaX;
      let editorPercent = (newEditorWidth / totalWidth) * 100;

      // 嚴格限制編輯區寬度佔比於 15% 至 85% 之間
      editorPercent = Math.max(15, Math.min(85, editorPercent));
      const previewPercent = 100 - editorPercent;

      this.editorPane.style.width = `${editorPercent}%`;
      this.previewPane.style.width = `${previewPercent}%`;
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
   * 重置編輯區與預覽區面板寬度為預設之各佔 50%。
   */
  public resetWidths(): void {
    this.editorPane.style.width = '50%';
    this.previewPane.style.width = '50%';
  }
}
