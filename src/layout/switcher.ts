export type LayoutMode = 'editor' | 'split' | 'preview';

export class LayoutSwitcher {
  private currentMode: LayoutMode = 'split';
  private workspace: HTMLElement;
  private buttons: Map<LayoutMode, HTMLElement> = new Map();
  private indicator: HTMLElement | null = null;
  private onModeChangeCallbacks: Array<(mode: LayoutMode) => void> = [];

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

    // Keyboard shortcuts: Alt+1, Alt+2, Alt+3
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

  public setMode(mode: LayoutMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.workspace.setAttribute('data-layout', mode);
    this.updateUI();
    this.onModeChangeCallbacks.forEach((cb) => cb(mode));
  }

  public getMode(): LayoutMode {
    return this.currentMode;
  }

  public onModeChange(callback: (mode: LayoutMode) => void): void {
    this.onModeChangeCallbacks.push(callback);
  }

  private updateUI(): void {
    this.buttons.forEach((btn, mode) => {
      if (mode === this.currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update sliding pill indicator position
    if (this.indicator) {
      const modes: LayoutMode[] = ['editor', 'split', 'preview'];
      const index = modes.indexOf(this.currentMode);
      if (index !== -1) {
        this.indicator.style.transform = `translateX(${index * 100}%)`;
      }
    }
  }
}
