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
import { syntaxHighlighting } from '@codemirror/language';

export interface EditorCallbacks {
  onChange: (content: string) => void;
  onCursorActivity?: (line: number, column: number) => void;
}

export class MarkdownEditor {
  private view: EditorView;
  private wrapCompartment = new Compartment();
  private isWordWrapEnabled = true;

  constructor(container: HTMLElement, initialContent: string, callbacks: EditorCallbacks) {
    const linearTheme = EditorView.theme({
      '&': {
        color: '#F7F8F8',
        backgroundColor: '#0E1015',
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
        backgroundColor: '#0E1015',
        color: '#5B6069',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: '#F7F8F8',
      },
    }, { dark: true });

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

    const startState = EditorState.create({
      doc: initialContent,
      extensions: [
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
        syntaxHighlighting(oneDarkHighlightStyle, { fallback: true }),
        linearTheme,
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

  public getValue(): string {
    return this.view.state.doc.toString();
  }

  public setValue(content: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });
  }

  public toggleWrap(enabled?: boolean): boolean {
    this.isWordWrapEnabled = enabled !== undefined ? enabled : !this.isWordWrapEnabled;
    this.view.dispatch({
      effects: this.wrapCompartment.reconfigure(
        this.isWordWrapEnabled ? EditorView.lineWrapping : []
      ),
    });
    return this.isWordWrapEnabled;
  }

  public focus(): void {
    this.view.focus();
  }

  public getScrollElement(): HTMLElement {
    return this.view.scrollDOM;
  }

  public getMetrics(): { lines: number; words: number; chars: number } {
    const text = this.getValue();
    const lines = this.view.state.doc.lines;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    return { lines, words, chars };
  }

  public destroy(): void {
    this.view.destroy();
  }
}
