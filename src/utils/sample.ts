/**
 * 預設展示 Markdown 模板內容。
 *
 * 包含 GFM 任務清單、Mermaid 流程圖與時序圖、多語言程式碼區塊、技術選型表格與 GitHub 警示區塊（Callouts），
 * 供使用者於首次載入或點擊「範例」按鈕時作為功能展示與格式驗證基準。
 */
export const SAMPLE_MARKDOWN = `# Markdown & Mermaid Web Viewer

> 一套基於 **Linear Design System** 風格、具備極速冷啟動與嚴格無痕暫態（Zero-Persistence）特性的 Markdown 即時預覽與多格式匯出工具。

---

## ⚡ 核心功能亮點

- [x] **雙欄即時預覽**：左側 Markdown 編輯、右側 HTML/SVG 渲染，支援等比雙向滾動同步
- [x] **三態佈局切換**：右上角一鍵切換「純編輯」、「純瀏覽」與「雙欄對照」
- [x] **Mermaid 圖表支援**：按需非同步延遲載入，零首屏負擔
- [x] **三合一多格式匯出**：一鍵匯出 \`.md\`、單一獨立 \`.html\`、高解析 \`.pdf\`
- [x] **無痕隱私保護**：純記憶體生命週期，關閉分頁或重整即徹底銷毀

---

## 📊 Mermaid 圖表範例

### 1. 系統架構流程圖 (Flowchart)

\`\`\`mermaid
graph TD
    A[使用者輸入 Markdown] --> B{包含 Mermaid 語法?}
    B -- 是 --> C[非同步載入 mermaid.js]
    B -- 否 --> D[markdown-it + highlight.js]
    C --> E[SVG 向量圖形繪製]
    D --> F[DOMPurify 消毒過濾]
    E --> G[即時雙欄預覽]
    F --> G
    G --> H[匯出 .md / .html / .pdf]
\`\`\`

### 2. 資料流時序圖 (Sequence Diagram)

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 使用者
    participant CM as CodeMirror 6
    participant Parser as Markdown 引擎
    participant Mermaid as Mermaid 模組
    participant Preview as 預覽視窗

    User->>CM: 輸入或貼上內容
    CM-->>Parser: 觸發 Debounce (120ms)
    Parser->>Mermaid: 偵測到圖表標籤並渲染 SVG
    Mermaid-->>Preview: 注入 SVG 向量節點
    Parser-->>Preview: 注入乾淨 HTML
    Preview-->>User: 呈現高對比預覽畫面
\`\`\`

---

## 💻 程式碼高亮支援 (Syntax Highlighting)

\`\`\`typescript
interface ViewerConfig {
  theme: 'dark' | 'light';
  syncScroll: boolean;
  layout: 'editor' | 'split' | 'preview';
}

export function initializeViewer(config: ViewerConfig): void {
  console.log(\`🚀 Markdown Viewer initialized in \${config.layout} mode\`);
}
\`\`\`

\`\`\`python
def calculate_metrics(text: str) -> dict:
    lines = len(text.splitlines())
    words = len(text.split())
    chars = len(text)
    return {"lines": lines, "words": words, "characters": chars}
\`\`\`

---

## 📋 規格與技術選型對照表

| 功能模組 | 技術方案 | 關鍵特性 |
| :--- | :--- | :--- |
| **編輯器核心** | CodeMirror 6 | 語法高亮、按鍵對應、折行控制 |
| **Markdown 解析** | markdown-it + Highlight.js | 支援 GFM、程式碼暗色著色 |
| **向量圖表** | mermaid.js (v11) | Dynamic Import 按需載入 |
| **安全消毒** | DOMPurify | 嚴格防禦 XSS 腳本注入 |
| **PDF 匯出** | CSS Paged Media | \`window.print()\` 搭配列印優化 |

---

## 💡 提示資訊 (Callout Alerts)

> [!NOTE]
> 本應用完全由純前端靜態編譯而成，已適配 **GitHub Pages** 零後端部署。

> [!TIP]
> 您可使用頂部的「**開啟**」按鈕載入本機的 \`.md\` 檔案，或直接將檔案拖曳至左側編輯區！
`;
