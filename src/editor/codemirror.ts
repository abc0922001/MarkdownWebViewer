import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  lineNumbers,
  highlightActiveLineGutter,
  ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

/**
 * 編輯器事件回呼函式介面。
 */
export interface EditorCallbacks {
  /** 文件內容變更時觸發之回呼函式 */
  onChange: (content: string) => void;
  /** 游標位置變更時觸發之回呼函式，傳入當前行號與列號（1-indexed） */
  onCursorActivity?: (line: number, column: number) => void;
}

/**
 * CodeMirror 6 核心 Markdown 編輯器封裝類別。
 *
 * 整合 Linear Design System 深淺主題、狀態隔離隔間（Compartment）動態重配、
 * 拖曳檔案讀取、歷史復原與游標狀態追蹤。
 */
export class MarkdownEditor {
  /** CodeMirror 視圖實例 */
  private view: EditorView;
  /** 自動換行配置隔間，用於動態切換折行而無須重建視圖 */
  private wrapCompartment = new Compartment();
  /** 介面主題配置隔間，用於切換深淺外觀樣式 */
  private themeCompartment = new Compartment();
  /** 語法高亮樣式隔間，用於切換深淺語法配色 */
  private syntaxCompartment = new Compartment();
  /** 當前自動折行啟用狀態 */
  private isWordWrapEnabled = true;

  /** Linear 深色主題樣式定義 */
  private linearDarkTheme = EditorView.theme({
    '&': {
      color: '#F7F8F8',
      backgroundColor: 'var(--bg-surface)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13.5px',
      lineHeight: '1.65',
      caretColor: '#5E6AD2',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#5E6AD2',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(94, 106, 210, 0.35)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-disabled)',
      borderRight: '1px solid var(--border-subtle)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
    },
  }, { dark: true });

  /** Linear 淺色主題樣式定義 */
  private linearLightTheme = EditorView.theme({
    '&': {
      color: '#08090A',
      backgroundColor: 'var(--bg-surface)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '13.5px',
      lineHeight: '1.65',
      caretColor: '#5E6AD2',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#5E6AD2',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(94, 106, 210, 0.2)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-tertiary)',
      borderRight: '1px solid var(--border-subtle)',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
    },
  }, { dark: false });

  /**
   * 初始化 CodeMirror 6 編輯器實例。
   *
   * @param container 掛載編輯器之父容器 DOM 元素
   * @param initialContent 初始 Markdown 文本內容
   * @param callbacks 狀態變更回呼函式集合
   * @param initialTheme 初始主題模式（'dark' | 'light'），預設為 'dark'
   */
  constructor(container: HTMLElement, initialContent: string, callbacks: EditorCallbacks, initialTheme: 'dark' | 'light' = 'dark') {
    // 監聽文件變更與選區/游標位置變動
    const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.docChanged) {
        callbacks.onChange(update.state.doc.toString());
      }
      if (update.selectionSet && callbacks.onCursorActivity) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        callbacks.onCursorActivity(line.number, pos - line.from + 1);
      }
    });

    // 支援將本機檔案拖曳至編輯器自動讀取內容
    const dropHandler = EditorView.domEventHandlers({
      drop: (event, view) => {
        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              if (typeof text === 'string') {
                view.dispatch({
                  changes: { from: 0, to: view.state.doc.length, insert: text },
                });
              }
            };
            reader.readAsText(file);
          }
        }
      },
    });

    const isDark = initialTheme === 'dark';
    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
        EditorView.contentAttributes.of({
          'aria-label': 'Markdown 編輯區',
        }),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        markdown(),
        this.syntaxCompartment.of(
          isDark
            ? syntaxHighlighting(oneDarkHighlightStyle, { fallback: true })
            : syntaxHighlighting(defaultHighlightStyle, { fallback: true })
        ),
        this.themeCompartment.of(isDark ? this.linearDarkTheme : this.linearLightTheme),
        this.wrapCompartment.of(EditorView.lineWrapping),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        updateListener,
        dropHandler,
      ],
    });

    this.view = new EditorView({
      state: startState,
      parent: container,
    });
  }

  /**
   * 切換編輯器之介面主題與語法著色方案。
   *
   * 透過 Compartment 動態重新配置，避免重新建立編輯器實例所引發之狀態遺失與效能損耗。
   *
   * @param theme 目標視覺主題（'dark' | 'light'）
   */
  public setTheme(theme: 'dark' | 'light'): void {
    const isDark = theme === 'dark';
    this.view.dispatch({
      effects: [
        this.themeCompartment.reconfigure(isDark ? this.linearDarkTheme : this.linearLightTheme),
        this.syntaxCompartment.reconfigure(
          isDark
            ? syntaxHighlighting(oneDarkHighlightStyle, { fallback: true })
            : syntaxHighlighting(defaultHighlightStyle, { fallback: true })
        ),
      ],
    });
  }

  /**
   * 取得編輯器當前全部文本內容。
   *
   * @returns 編輯器文件字串
   */
  public getValue(): string {
    return this.view.state.doc.toString();
  }

  /**
   * 替換編輯器全文內容，並記錄至復原歷史（Undo History）。
   *
   * @param content 欲設定之新 Markdown 文本內容
   */
  public setValue(content: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });
  }

  /**
   * 切換或設定編輯器文字自動折行（Line Wrapping）狀態。
   *
   * @param enabled 選填之明確啟用狀態；若未傳入則切換當前狀態
   * @returns 切換後之折行啟用狀態
   */
  public toggleWrap(enabled?: boolean): boolean {
    this.isWordWrapEnabled = enabled !== undefined ? enabled : !this.isWordWrapEnabled;
    this.view.dispatch({
      effects: this.wrapCompartment.reconfigure(
        this.isWordWrapEnabled ? EditorView.lineWrapping : []
      ),
    });
    return this.isWordWrapEnabled;
  }

  /**
   * 將鍵盤輸入焦點聚焦至編輯器視圖。
   */
  public focus(): void {
    this.view.focus();
  }

  /**
   * 取得 CodeMirror 內部實際負責捲動之 DOM 元素。
   *
   * 用於綁定雙向滾動同步事件監聽。
   *
   * @returns 編輯器滾動 DOM 節點
   */
  public getScrollElement(): HTMLElement {
    return this.view.scrollDOM;
  }

  /**
   * 計算當前文件之統計指標，包括總行數、字數與字元數。
   *
   * @returns 包含行數（lines）、單字數（words）與字元數（chars）之統計物件
   */
  public getMetrics(): { lines: number; words: number; chars: number } {
    const text = this.getValue();
    const lines = this.view.state.doc.lines;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    return { lines, words, chars };
  }

  /**
   * 銷毀編輯器實例並釋放 DOM 監聽資源。
   */
  public destroy(): void {
    this.view.destroy();
  }
}
