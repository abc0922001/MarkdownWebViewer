export class PaneResizer {
  private resizer: HTMLElement;
  private editorPane: HTMLElement;
  private previewPane: HTMLElement;
  private workspace: HTMLElement;
  private isDragging = false;
  private startX = 0;
  private startEditorWidth = 0;

  constructor() {
    this.resizer = document.getElementById('pane-resizer')!;
    this.editorPane = document.getElementById('editor-pane')!;
    this.previewPane = document.getElementById('preview-pane')!;
    this.workspace = document.getElementById('app-workspace')!;

    if (!this.resizer || !this.editorPane || !this.previewPane) return;

    this.initEvents();
  }

  private initEvents(): void {
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

    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - this.startX;
      const totalWidth = this.workspace.getBoundingClientRect().width;
      
      let newEditorWidth = this.startEditorWidth + deltaX;
      let editorPercent = (newEditorWidth / totalWidth) * 100;

      // Clamp between 15% and 85%
      editorPercent = Math.max(15, Math.min(85, editorPercent));
      const previewPercent = 100 - editorPercent;

      this.editorPane.style.width = `${editorPercent}%`;
      this.previewPane.style.width = `${previewPercent}%`;
    };

    const onMouseUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.resizer.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchend', onMouseUp);
    };

    this.resizer.addEventListener('mousedown', onMouseDown);
    this.resizer.addEventListener('touchstart', onMouseDown, { passive: true });
  }

  public resetWidths(): void {
    this.editorPane.style.width = '50%';
    this.previewPane.style.width = '50%';
  }
}
