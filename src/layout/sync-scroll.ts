/**
 * 雙向等比捲動同步管理員。
 *
 * 負責協調編輯器與預覽區之捲動位置，計算當前可捲動高度比例（Scroll Ratio）進行等比映射，
 * 並透過雙向互斥標記（Mutual Exclusion Flag）搭配 requestAnimationFrame，防止捲動事件形成循環震顫。
 */
export class SyncScrollManager {
  /** 編輯器捲動容器元素 */
  private editorScroller: HTMLElement;
  /** 預覽區捲動容器元素 */
  private previewScroller: HTMLElement;
  /** 當前捲動同步功能啟用狀態 */
  private isEnabled = true;
  /** 編輯器觸發捲動中互斥鎖，防止預覽區反向觸發 */
  private isEditorScrolling = false;
  /** 預覽區觸發捲動中互斥鎖，防止編輯器反向觸發 */
  private isPreviewScrolling = false;
  /** 工具列捲動同步切換按鈕元素 */
  private toggleButton: HTMLElement | null;

  /**
   * 初始化雙向捲動同步管理員。
   *
   * @param editorScroller 編輯器捲動容器 DOM 節點
   * @param previewScroller 預覽區捲動容器 DOM 節點
   */
  constructor(editorScroller: HTMLElement, previewScroller: HTMLElement) {
    this.editorScroller = editorScroller;
    this.previewScroller = previewScroller;
    this.toggleButton = document.getElementById('btn-toggle-sync-scroll');

    this.initEvents();
  }

  /**
   * 註冊編輯器與預覽區之捲動監聽事件及工具列切換按鈕點擊事件。
   */
  private initEvents(): void {
    // 編輯器捲動監聽器
    this.editorScroller.addEventListener('scroll', () => {
      if (!this.isEnabled || this.isPreviewScrolling) return;

      this.isEditorScrolling = true;
      const editorMaxScroll = this.editorScroller.scrollHeight - this.editorScroller.clientHeight;
      if (editorMaxScroll > 0) {
        const ratio = this.editorScroller.scrollTop / editorMaxScroll;
        const previewMaxScroll = this.previewScroller.scrollHeight - this.previewScroller.clientHeight;
        this.previewScroller.scrollTop = ratio * previewMaxScroll;
      }

      // 於下一幀渲染後解除互斥鎖
      window.requestAnimationFrame(() => {
        this.isEditorScrolling = false;
      });
    }, { passive: true });

    // 預覽區捲動監聽器
    this.previewScroller.addEventListener('scroll', () => {
      if (!this.isEnabled || this.isEditorScrolling) return;

      this.isPreviewScrolling = true;
      const previewMaxScroll = this.previewScroller.scrollHeight - this.previewScroller.clientHeight;
      if (previewMaxScroll > 0) {
        const ratio = this.previewScroller.scrollTop / previewMaxScroll;
        const editorMaxScroll = this.editorScroller.scrollHeight - this.editorScroller.clientHeight;
        this.editorScroller.scrollTop = ratio * editorMaxScroll;
      }

      // 於下一幀渲染後解除互斥鎖
      window.requestAnimationFrame(() => {
        this.isPreviewScrolling = false;
      });
    }, { passive: true });

    // 工具列切換按鈕監聽器
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.toggle();
      });
    }
  }

  /**
   * 切換或明確設定雙向捲動同步狀態，並同步更新 UI 按鈕外觀與無障礙文字。
   *
   * @param enabled 選填之明確啟用狀態；若未傳入則切換當前反向狀態
   * @returns 切換後之捲動同步啟用狀態
   */
  public toggle(enabled?: boolean): boolean {
    this.isEnabled = enabled !== undefined ? enabled : !this.isEnabled;
    if (this.toggleButton) {
      if (this.isEnabled) {
        this.toggleButton.classList.add('active');
        this.toggleButton.querySelector('span')!.textContent = '捲動同步：開';
      } else {
        this.toggleButton.classList.remove('active');
        this.toggleButton.querySelector('span')!.textContent = '捲動同步：關';
      }
    }
    return this.isEnabled;
  }
}
