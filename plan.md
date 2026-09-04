**本計畫書確立一套基於 Linear Design System 規格、具備極速冷啟動（Cold Start）與嚴格無痕暫態（Zero-Persistence）特性的 Markdown/Mermaid 雙欄即時預覽與多格式匯出靜態 Web 應用架構，全面相容 GitHub Pages 零後端部署。**

---

### 規格與技術選型矩陣

| 核心需求 | 技術選型與架構實作 | 規格目標與技術亮點 |
| --- | --- | --- |
| **1. 雙欄輸入與預覽** | CodeMirror 6 + DOMPurify + 自適應雙欄 Layout | 左右等比或彈性分配，支援雙向游標與捲動同步 |
| **2. 右上角三態切換** | Linear 風格 Segmented Control（純編輯／純瀏覽／雙欄） | CSS Grid / Flex 狀態機切換，無版面重繪延遲 |
| **3. Mermaid 語法支援** | 動態非同步載入 `mermaid.js` + SVG 錯誤邊界保護 | 依需求載入（Lazy Loading），未出現圖表時零效能負擔 |
| **4. 多格式檔案匯出** | 純客戶端 Blob API (`.md`, `.html`) + CSS Paged Media (`.pdf`) | 產出單一可攜式獨立 HTML 與列印級無損 PDF |
| **5. Linear 設計風格** | 嚴格導入 `getdesign.md/linear.app/design-md` 規範 | 黑曜暗色調、精準 1px 邊框、極致微互動、高資訊密度 |
| **6. GitHub Pages 託管** | Vite + GitHub Actions CI/CD Pipeline | 自動化靜態編譯、自適應 Base URL、全球邊緣 CDN 分發 |
| **7. 急速冷啟動** | Vanilla TS / 輕量核心 + 核心 CSS 內嵌 + 依需求自訂分包 | 初次載入傳輸量 **< 60KB (Gzip)**，首字互動時間（TTI）**< 80ms** |
| **8. 不留存歷史資料** | 純記憶體生命週期管理（嚴格禁用 Web Storage / Cookie） | 關閉或重新整理即銷毀，實作敏感內容無痕編輯機制 |

---

### 一、 Linear 設計系統落地規範 (`linear.app/design-md`)

依據 Linear 核心設計哲學，介面以「高沉浸度、精確對比、暗色基底、低干擾工具列」為最高準則：

```
+---------------------------------------------------------------------------------------------------+
|  [Logo] Untitled.md        [ 匯出 ▾ ]  [ (純編輯)  |  (雙欄對照)  |  (純瀏覽) ] (Top-Right Buttons) |
+-------------------------------------------------+-------------------------------------------------+
|  【 編輯面板 (CodeMirror 6) 】                  |  【 預覽面板 (Markdown + Mermaid) 】            |
|                                                 |                                                 |
|  # System Architecture                          |  System Architecture                            |
|  - High Performance Zero-Persistence            |  • High Performance Zero-Persistence            |
|                                                 |                                                 |
|  ```mermaid                                     |  +-------------+       +--------------+         |
|  graph TD                                       |  | Cold Start  | ----> | In-Memory UI |         |
|    A[Cold Start] --> B[In-Memory UI]            |  +-------------+       +--------------+         |
|  ```                                            |                                                 |
+-------------------------------------------------+-------------------------------------------------+
|  行 12, 欄 4  |  UTF-8  |  純記憶體工作區（重整即清空）                                捲動同步 [啟用]  |
+---------------------------------------------------------------------------------------------------+

```

#### 1. Design Tokens 核心參數定義

```css
:root {
  /* Linear Dark 主色盤 */
  --bg-app: #08090A;            /* 最底層黑曜背景 */
  --bg-surface: #101114;        /* 面板與工具列底色 */
  --bg-surface-elevated: #16181D;/* 懸浮選單與按鈕底色 */
  --bg-active: #1F2229;         /* 按鈕 Active 狀態 */
  --bg-hover: rgba(255, 255, 255, 0.05);

  /* 線條與邊界 (Linear Signature Subtitle Borders) */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-strong: rgba(255, 255, 255, 0.16);
  --border-focus: #5E6AD2;      /* Linear 標誌性紫藍聚焦色 */

  /* 文字階層 */
  --text-primary: #F7F8F8;      /* 主要文字（高對比白） */
  --text-secondary: #8A8F98;    /* 次要說明文字 */
  --text-tertiary: #5B6069;     /* 禁用或細節標籤 */

  /* 焦點強調色 (Accent) */
  --accent-primary: #5E6AD2;
  --accent-hover: #6E79D6;
  --accent-glow: rgba(94, 106, 210, 0.25);

  /* 字體系統 */
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  /* 動畫與微互動 */
  --ease-linear: cubic-bezier(0.16, 1, 0.3, 1);
  --transition-fast: 120ms var(--ease-linear);
}

```

---

### 二、 急速冷啟動與無痕暫態架構（性能與隱私核心）

#### 1. 急速冷啟動機制（Cold-Start Optimization）

為達成毫秒級初次載入渲染，徹底消除龐大第三方庫帶來的阻塞延遲：

* **框架選型去肥胖化**：捨棄大型 SPA 框架（如 Angular/React），採用 **原生 TypeScript + 微型 DOM 綁定（Vanilla / Lite Component）**，首頁 HTML 預先內嵌 Critical CSS。
* **Mermaid.js 延遲非同步載入（Dynamic Code Splitting）**：
* `mermaid.js` 體積龐大（> 2MB），**嚴禁在初次載入時載入**。
* 實作動態偵測器：僅當 Markdown 解析器在內容中掃描到 ````mermaid` 程式碼區塊時，才觸發 `import('mermaid')` 進行模組拉取與編譯。


* **字體子集化與延遲載入**：優先使用系統字體棧（System UI Font），非同步拉取 Inter 與 JetBrains Mono 子集。

#### 2. 嚴格無痕暫態機制（Zero-Persistence Security）

* **資料生命週期僅存於記憶體**：
* **嚴禁調用** `localStorage`、`sessionStorage`、`IndexedDB` 或寫入 `Cookie`。
* 網頁載入時僅注入標準空白樣板或預設 Demo 語法，一旦使用者執行 **重新整理（F5 / Cmd+R）** 或 **關閉分頁**，所有文字立即自記憶體抹除，無任何本機快取殘留。


* **防止誤觸關閉防護**：
* 透過 `window.addEventListener('beforeunload', (e) => { ... })`，在使用者編輯且未手動匯出前，彈出原生防誤關提示對話框。



---

### 三、 版面切換與檢視連動系統

#### 1. 右上角三態切換按鈕（Linear Segmented Switcher）

頂部工具列右上角設計專屬 Segmented Control，具備狀態指示滑塊（Sliding Active Pill）：

* **`純編輯模式 (Edit Only)`**：
* 左側編輯區展開為 `100%`（可切換行寬限制 `max-w-4xl` 居中），右側預覽區設為 `display: none`。


* **`純瀏覽模式 (Preview Only)`**：
* 隱藏左側輸入框，右側預覽區全寬居中展示，模擬現代技術文件閱讀檢視。


* **`雙欄對照模式 (Split View - 預設)`**：
* 左右等寬 `50% : 50%`，中央配置極細 `1px` 分割條（Divider），支援滑鼠拖曳即時調整左右比例。



```typescript
// 版面切換狀態機
type LayoutMode = 'editor' | 'preview' | 'split';

function setLayoutMode(mode: LayoutMode): void {
  const container = document.getElementById('app-layout');
  const editorPane = document.getElementById('editor-pane');
  const previewPane = document.getElementById('preview-pane');
  
  container.setAttribute('data-layout', mode);
  
  editorPane.hidden = (mode === 'preview');
  previewPane.hidden = (mode === 'editor');
  
  // 更新按鈕 active 樣式 (Linear 滑動外觀)
  updateSegmentedControlUI(mode);
}

```

#### 2. 等比即時捲動同步 (High-Precision Sync Scroll)

* 計算編輯器捲動比例：`const ratio = scrollTop / (scrollHeight - clientHeight)`。
* 使用 `requestAnimationFrame` 驅動預覽面板：`preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)`，確保雙向平滑同步無跳動。

---

### 四、 Markdown 解析與 Mermaid 動態渲染管線

```
[ 使用者輸入文字 ]
       │
       ▼ (150ms Debounce 防彈跳排程)
[ markdown-it 核心解析 ] 
       │
       ├──► [ 基礎 Markdown ] ──► [ DOMPurify 消毒過濾 ] ──► [ HTML 生成 ]
       │
       └──► [ 偵測 ```mermaid 標籤 ]
                  │
                  ├── (首次) ──► 非同步拉取 mermaid.js (Dynamic Import)
                  │
                  └──► mermaid.render() ──► 轉譯 SVG 向量圖形
                            │
                            └─► [ 錯誤邊界 ] ──► 攔截語法錯誤並顯示 Linear 提示卡

```

#### 1. 防彈跳排程與動態模組載入實作

```typescript
let mermaidModule: typeof import('mermaid') | null = null;

async function renderMarkdown(content: string): Promise<void> {
  const rawHtml = mdParser.render(content);
  const cleanHtml = DOMPurify.sanitize(rawHtml);
  previewElement.innerHTML = cleanHtml;

  const mermaidBlocks = previewElement.querySelectorAll('.language-mermaid');
  if (mermaidBlocks.length > 0) {
    if (!mermaidModule) {
      // 急速冷啟動：直到有需求才非同步載入
      const { default: mermaid } = await import('mermaid');
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#101114',
          primaryColor: '#5E6AD2',
          lineColor: '#8A8F98'
        }
      });
      mermaidModule = mermaid;
    }

    // 逐一渲染圖表並套用錯誤攔截
    mermaidBlocks.forEach(async (block, index) => {
      try {
        const id = `mermaid-svg-${Date.now()}-${index}`;
        const { svg } = await mermaidModule.render(id, block.textContent || '');
        block.parentElement!.innerHTML = svg;
      } catch (err) {
        block.parentElement!.innerHTML = `<div class="error-pill">Mermaid 語法錯誤</div>`;
      }
    });
  }
}

```

---

### 五、 純客戶端三合一檔案匯出引擎

全功能在瀏覽器本機完成封裝，無任何後端呼叫或傳輸：

```
                              ┌──► [.md 匯出]  ──► Blob (text/markdown) ──► 觸發原生下載
                              │
[ Export Engine (純前端) ] ───┼──► [.html 匯出] ──► 嵌入 CSS 與靜態 SVG ──► 單一自給檔案
                              │
                              └──► [.pdf 匯出]  ──► 注入 @media print ──► window.print() 列印引擎

```

#### 1. Markdown 匯出 (`.md`)

* 將 CodeMirror 緩衝區中的純文字打包為 `new Blob([text], { type: 'text/markdown;charset=utf-8' })`，建立隱藏 `<a>` 標籤觸發即時下載。

#### 2. 單一獨立 HTML 匯出 (`.html`)

* 提取預覽區渲染後之 HTML，包含已生成的 Mermaid 向量 SVG。
* 自動內嵌全套 Linear 視覺 CSS 樣式與標準 `<head>` 元件，生成**無需網路連線、任何裝置皆可完美開啟的單一自給 HTML 檔案**。

#### 3. 列印級無損 PDF 匯出 (`.pdf`)

* **排版樣式注入**：調用原生 `window.print()`，配合 `@media print` 實現無損排版。
* **防截斷規則**：
```css
@media print {
  body { background: #FFFFFF !important; color: #000000 !important; }
  #editor-pane, #toolbar, .segmented-control { display: none !important; }
  #preview-pane { width: 100% !important; margin: 0 !important; }

  /* 防止跨頁腰斬 */
  pre, blockquote, table, svg, .mermaid-container {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}

```



---

### 六、 GitHub Pages 自動化建置與部署架構

#### 1. 建構設定檔 (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 確保在 GitHub Pages 子路徑下資源能以相對路徑正確載入
  build: {
    target: 'esnext',
    outDir: 'dist',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // 將核心與龐大套件嚴格自訂分包
          codemirror: ['codemirror', '@codemirror/lang-markdown'],
          parser: ['markdown-it', 'dompurify']
        }
      }
    }
  }
});

```

#### 2. CI/CD 工作流程 (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Production Assets
        run: npm run build

      - name: Upload GitHub Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

```

---

### 七、 開發時程與里程碑

```
第 1 週 (Day 1-5)         第 2 週 (Day 6-10)        第 3 週 (Day 11-15)       第 4 週 (Day 16-18)
[ Linear UI / 雙欄版面 ] ──► [ 解析管線 / 依需求圖表 ] ──► [ 匯出引擎 / 無痕防護 ] ──► [ 效能壓測 / 上線部署 ]

```

* **階段一：極簡架構與 Linear 視覺體系（Day 1 – Day 5）**
* Vite + TypeScript 專案初始化，導入 Linear Design Tokens。
* 實作頂部工具列、右上角三態切換按鈕（純編輯／純瀏覽／雙欄）與彈性拖曳分隔條。


* **階段二：編輯器核心與 Mermaid 依需求載入（Day 6 – Day 10）**
* 整合 CodeMirror 6，配置 Markdown 語法高亮。
* 實作動態非同步 `mermaid.js` 載入機制與輸入防彈跳處理。


* **階段三：三合一匯出與無痕機制驗證（Day 11 – Day 15）**
* 實作 Markdown、獨立 HTML、PDF 格式匯出邏輯與 `@media print` 樣式支援。
* 嚴格清除所有快取機制，實作記憶體狀態銷毀與防誤關閉攔截。


* **階段四：冷啟動效能最佳化與 CI/CD 發布（Day 16 – Day 18）**
* 進行 Rollup 自訂分包與 Gzip 壓縮校準，確保初次載入體積 `< 60KB`。
* 設定 GitHub Actions 自動化部署並於 GitHub Pages 正式上線驗收。