export class SyncScrollManager {
  private editorScroller: HTMLElement;
  private previewScroller: HTMLElement;
  private isEnabled = true;
  private isEditorScrolling = false;
  private isPreviewScrolling = false;
  private toggleButton: HTMLElement | null;

  constructor(editorScroller: HTMLElement, previewScroller: HTMLElement) {
    this.editorScroller = editorScroller;
    this.previewScroller = previewScroller;
    this.toggleButton = document.getElementById('btn-toggle-sync-scroll');

    this.initEvents();
  }

  private initEvents(): void {
    // Editor scroll listener
    this.editorScroller.addEventListener('scroll', () => {
      if (!this.isEnabled || this.isPreviewScrolling) return;

      this.isEditorScrolling = true;
      const editorMaxScroll = this.editorScroller.scrollHeight - this.editorScroller.clientHeight;
      if (editorMaxScroll > 0) {
        const ratio = this.editorScroller.scrollTop / editorMaxScroll;
        const previewMaxScroll = this.previewScroller.scrollHeight - this.previewScroller.clientHeight;
        this.previewScroller.scrollTop = ratio * previewMaxScroll;
      }

      window.requestAnimationFrame(() => {
        this.isEditorScrolling = false;
      });
    }, { passive: true });

    // Preview scroll listener
    this.previewScroller.addEventListener('scroll', () => {
      if (!this.isEnabled || this.isEditorScrolling) return;

      this.isPreviewScrolling = true;
      const previewMaxScroll = this.previewScroller.scrollHeight - this.previewScroller.clientHeight;
      if (previewMaxScroll > 0) {
        const ratio = this.previewScroller.scrollTop / previewMaxScroll;
        const editorMaxScroll = this.editorScroller.scrollHeight - this.editorScroller.clientHeight;
        this.editorScroller.scrollTop = ratio * editorMaxScroll;
      }

      window.requestAnimationFrame(() => {
        this.isPreviewScrolling = false;
      });
    }, { passive: true });

    // Toggle button listener
    if (this.toggleButton) {
      this.toggleButton.addEventListener('click', () => {
        this.toggle();
      });
    }
  }

  public toggle(enabled?: boolean): boolean {
    this.isEnabled = enabled !== undefined ? enabled : !this.isEnabled;
    if (this.toggleButton) {
      if (this.isEnabled) {
        this.toggleButton.classList.add('active');
        this.toggleButton.querySelector('span')!.textContent = '滾動同步：開';
      } else {
        this.toggleButton.classList.remove('active');
        this.toggleButton.querySelector('span')!.textContent = '滾動同步：關';
      }
    }
    return this.isEnabled;
  }
}
