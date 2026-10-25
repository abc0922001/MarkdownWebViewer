# MarkdownWebViewer — AI Agent 專案規範、架構指引與開發交接手冊 (AGENTS.md)

本文件為所有參與 **MarkdownWebViewer** 開發與維護之 AI Agent（LLM）的**唯一權威上下文指引、架構規範與工作交接手冊**。任何 AI Agent 在進行探索、修改程式碼、新增功能、修復缺陷或撰寫文件前，必須完整閱讀並嚴格遵守本文件之規範。

---

## 🧭 說明文件雙軌制分工 (Documentation Split Policy)

本專案之說明文件明確劃分為「**使用者面向**」與「**AI Agent / 開發者面向**」兩個獨立檔案，修改時請嚴守邊界：

| 文件路徑 | 目標受眾 | 核心職責與內容範疇 | 維護原則 |
| :--- | :--- | :--- | :--- |
| **[`README.md`](README.md)** | **終端使用者 (End Users)** | 專案介紹、快速上手教學、介面按鈕導覽、功能詳解、鍵盤快速鍵與常見問題 (FAQ)。 | **禁止**放入程式碼架構樹、內部演算法實作細節、套件版本表、`npm` 建置指令或工程規範。語言須直覺易懂、以使用者操作體驗為核心。 |
| **[`AGENTS.md`](AGENTS.md)** | **AI Agent / 開發工程師** | 技術選型、專案目錄結構、核心子系統演算法、設計系統對齊、開發工作交接紀錄、建置與測試指令、工程約束與 Git Commit 協定。 | 任何涉及內部架構、模組介面、修復規則、測試套件或開發流程的變更，皆須同步更新本文件以確保後續交接零斷層。 |
| **[`DESIGN.md`](DESIGN.md)** | **UI / 視覺規範參考** | Linear Design System 色彩階梯、邊框、字型、圓角與陰影之權威 Design Tokens 定義。 | 所有 CSS 變數（`src/styles/tokens.css`）與元件視覺調整均須嚴格對齊此規格。 |

---

## 📌 專案核心定位與架構不變量 (Core Identity & Architectural Invariants)

**MarkdownWebViewer** 是一套基於 **Linear Design System (`DESIGN.md`)** 規格打造的純前端靜態 Markdown、Mermaid 圖表與 LaTeX 數學公式即時檢視與排版工具。

在任何開發迭代中，以下 **6 大架構不變量（Invariants）** 絕對不可違反：
1. **嚴格無痕暫態生命週期 (Zero-Persistence)**：全流程純記憶體操作，**絕對禁止**使用 `localStorage`、`sessionStorage`、`IndexedDB` 或 `Cookie` 儲存任何使用者文件內容或狀態。
2. **極致冷啟動與依需求非同步載入 (Cold-Start & On-Demand Loading)**：維持 Lighthouse 全項滿分（100/100）。CodeMirror 6 即刻掛載並自動聚焦（Zero-Friction UX），而大型渲染引擎（Ondine WASM、KaTeX、html-to-image）僅在偵測到實際需求時才動態載入。
3. **單一內嵌 CSS 零渲染阻斷 (`inlineCssPlugin`)**：所有樣式表統一由 `src/main.ts` 匯入，建置期透過 `vite.config.ts` 自訂外掛直接內嵌至 `index.html` 的 `<style>` 標籤中，消除外部 CSS 請求。
4. **相對路徑部署相容性 (`base: './'`)**：確保靜態產物（`dist/`）部署於 GitHub Pages 任意子路徑或離線環境時，所有 JS、WASM 與圖示資源皆能正確載入。
5. **100% 正體中文 JSDoc 註解覆蓋率**：所有公開與內部函式、類別、介面、型別及設定檔皆須具備詳盡之繁體中文（zh-TW）JSDoc。
6. **嚴格靜態型別安全**：啟用 TypeScript 嚴格模式（`noImplicitAny`），禁止隨意使用 `any`。

---

## 🛠️ 技術選型矩陣 (Tech Stack & Dependencies)

| 領域 / 模組 | 選用技術 | 版本 | 職責與架構選型理由 |
| :--- | :--- | :--- | :--- |
| **建置工具 / 語言** | Vite + TypeScript | Vite 8.3 / TS 7.0 | 極速 HMR、原生 ES 模組、Rollup 自訂分包與靜態型別安全 |
| **PWA / Service Worker** | vite-plugin-pwa | 2.0.x | 基於 Workbox 自動處理產物雜湊預快取清單（含 `.wasm`，上限放寬至 5MB）、Google Fonts 執行期快取與背景無感更新 |
| **編輯器核心** | CodeMirror 6 | 6.x | 模組化設計、輕量，透過 `Compartment` 支援不重建 DOM 的主題、語法高亮與自動換行動態重配 |
| **Markdown 解析** | markdown-it | 15.0.x | 高效符合 CommonMark/GFM 規範，透過自訂 AST 外掛擴充 LaTeX 公式、GFM Alerts 與 Tasklists |
| **向量圖表編譯** | Ondine (`wevm/ondine`) | 0.0.3 | **Rust WASM (`ondine/compiler/wasm`) 依需求串流編譯**，原生相容 33 種 Mermaid 圖表，搭配 **210B 輕量掛載 Runtime (`ondine`)** 與 `--ondine-*` CSS 變數零延遲主題切換，徹底取代舊版龐大的 `mermaid.js` (~2.5MB) |
| **數學公式引擎** | KaTeX | 0.19.x | **動態延遲非同步載入（Dynamic Import）**，出版級 LaTeX 數學排版，未含公式時維持 0 KB 負擔 |
| **程式碼語法高亮** | highlight.js | 11.12.x | 採用 `lib/common` 語言子集打包以最小化體積，支援深/淺雙主題色彩 |
| **安全消毒過濾** | DOMPurify | 3.4.x | 嚴格防禦 XSS 攻擊，自訂 SVG、MathML 與 `data-*` 屬性白名單保留向量圖表與公式節點 |
| **圖片渲染引擎** | html-to-image | 1.11.x | **動態延遲非同步載入**，於離屏沙盒深層複製並無損繪製 3x Retina 超高解析度 PNG 長圖 |
| **圖示庫** | lucide | 1.53.x | 簡約 SVG 圖示，用於 GitHub Alerts 標題圖示與介面控制 |
| **程式碼壓縮** | terser | 5.51.x | 生產環境 Minification，自動清除 `debugger` 符號以縮減產物體積 |
| **單元測試框架** | Vitest + jsdom | Vitest 5.0 / jsdom 30 | 完整涵蓋格式修復、AST 解析、Ondine WASM 圖表、KaTeX、匯出器、版面狀態機與版本檢查之自動化測試 |
| **CI/CD 自動化** | GitHub Actions | v4 | Push 至 `main` 分支自動執行 `npm run build` 並部署至 GitHub Pages |

---

## 📂 專案完整目錄結構與模組職責 (Project Structure)

```
MarkdownWebViewer/
├── .github/
│   └── workflows/
│       └── deploy.yml                  # GitHub Actions 自動建置並部署至 GitHub Pages
├── dist/                               # 生產環境編譯輸出目錄 (gitignored)
├── issue/                              # 本機除錯與測試素材暫存目錄 (gitignored，嚴禁提交)
├── public/
│   └── robots.txt                      # 搜尋引擎檢索規範設定
├── src/
│   ├── editor/
│   │   └── codemirror.ts               # CodeMirror 6 實例封裝、Linear 深淺主題、Compartments、拖曳檔案載入、統計指標
│   ├── exporter/
│   │   ├── html-exporter.ts            # 封裝單一自給離線 .html 檔案 (內嵌全套 CSS、Ondine SVG 與 --ondine-* 變數)
│   │   ├── html-exporter.test.ts       # HTML 匯出器單元測試 (驗證樣式內嵌、主題與 XSS 安全)
│   │   ├── md-exporter.ts              # UTF-8 Blob 匯出純文字 .md 檔案 (含 URL.revokeObjectURL 記憶體釋放)
│   │   ├── pdf-exporter.ts             # window.print() 搭配 @media print 高對比白底列印觸發器
│   │   ├── png-exporter.ts             # html-to-image 3x 超高解析度長圖匯出 (離屏沙盒/三種寬度/主題同步/時間戳記命名)
│   │   └── png-exporter.test.ts        # PNG 匯出器單元測試 (驗證離屏沙盒尺寸、主題配色與檔名格式化)
│   ├── layout/
│   │   ├── resizer.ts                  # 中央分割條滑鼠/觸控拖曳與寬度比例限制 (15% ~ 85%)
│   │   ├── switcher.ts                 # 三態版面狀態機 (Alt+1/2/3)、閱讀視圖模式 (Alt+M) 與專注閱讀模式 (Alt+Z)
│   │   ├── switcher.test.ts            # 版面切換器與閱讀模式狀態機單元測試
│   │   └── sync-scroll.ts              # 雙向等比捲動同步與 isEditorScrolling / isPreviewScrolling 互斥鎖 (rAF 節流)
│   ├── renderer/
│   │   ├── katex.ts                    # 依需求動態載入 katex、防競態 Token、錯誤邊界、數學公式渲染
│   │   ├── katex.test.ts               # KaTeX 渲染管線與錯誤防禦單元測試
│   │   ├── markdown.ts                 # markdown-it 實例、Highlight.js 著色、GFM Alerts/Tasklists 外掛、LaTeX 解析、DOMPurify 消毒
│   │   ├── markdown.test.ts            # Markdown 解析、GFM Alerts 巢狀、公式識別與 XSS 消毒單元測試
│   │   ├── mermaid.ts                  # Ondine (Rust WASM) 依需求串流編譯、210B mount 掛載、--ondine-* 主題同步、RenderError 錯誤邊界
│   │   └── mermaid.test.ts             # Ondine 圖表編譯、主題屬性與 RenderError 行列定位單元測試
│   ├── styles/
│   │   ├── base.css                    # 全域 Reset、自訂捲軸、Toast 動畫、[hidden] 全域強制保護
│   │   ├── dropdown.css                # Linear 懸浮選單、匯出選單與閱讀模式選單彈出動畫
│   │   ├── editor.css                  # CodeMirror 6 自訂樣式與 Gutters
│   │   ├── layout.css                  # 頂部工具列、雙欄容器、專注模式懸浮膠囊、狀態列與響應式斷點
│   │   ├── preview.css                 # 技術文件排版、表格、程式碼、Highlight.js、Mermaid 容器與 834px/412px 閱讀模式規格
│   │   ├── print.css                   # @media print 高對比白底黑字列印、防跨頁截斷 (break-inside: avoid)、Ondine 列印樣式
│   │   └── tokens.css                  # DESIGN.md 權威 Design Tokens (深色與淺色變數、--ondine-* 圖表色彩變數)
│   ├── utils/
│   │   ├── debounce.ts                 # 120ms 防彈跳排程器
│   │   ├── formatter.ts                # AI / Gemini Markdown 壞格式智慧修復引擎 (11 大階段管線)
│   │   ├── formatter.test.ts           # 自動修正引擎完整回歸測試套件 (涵蓋雙重連結、粗體連結錯位、巢狀縮排、斜體保護、表格與數學符號)
│   │   ├── sample.ts                   # 初始範例 Markdown 模板 (含流程圖、時序圖、表格、程式碼、公式、GFM Alerts)
│   │   ├── toast.ts                    # 非侵入式 Toast 輕量通知模組 (支援 success / info / error)
│   │   ├── version.ts                  # 全站版本號、Commit 雜湊、建置時間注入與 Service Worker 快取更新檢查模組
│   │   └── version.test.ts             # 版本資訊格式化與 Service Worker 更新檢查單元測試
│   ├── main.ts                         # 應用程式進入點：即刻掛載與自動聚焦、全域貼上轉發、渲染管線、快速鍵與事件綁定
│   └── vite-env.d.ts                   # Vite 環境變數與全域編譯常數 (__APP_VERSION__ 等) 型別宣告
├── .gitignore                          # Git 忽略清單 (node_modules, dist, issue/)
├── AGENTS.md                           # 本文件 (AI Agent 專案規範、架構指引與開發交接手冊)
├── DESIGN.md                           # Linear 設計系統權威分析與 Token 定義文件
├── index.html                          # 靜態 HTML Shell (含 %APP_VERSION% 預留位置、結構化語意標籤與 SEO meta)
├── package.json                        # 專案相依套件、腳本與單一版本號來源 (Single Source of Truth)
├── plan.md                             # 產品初始架構與規格計畫書
├── README.md                           # 終端使用者專用之產品介紹、操作說明與功能指南
├── tsconfig.json                       # TypeScript 嚴格編譯設定
├── vite.config.ts                      # Vite 相對路徑建置、inlineCssPlugin、PWA 設定與 Rollup manualChunks 分包
└── vitest.config.ts                    # Vitest 單元測試環境設定 (jsdom)
```

---

## ⚡ 核心子系統演算法與實作規格 (Core Subsystems & Algorithms)

### 1. 極速冷啟動、全域輸入攔截與非同步渲染管線 (`src/main.ts`, `vite.config.ts`)
* **CodeMirror 6 即刻掛載與零阻力輸入 (Zero-Friction UX)**：
  * 網頁啟動時立即初始化 `MarkdownEditor` 並執行 `editor.focus()`。
  * 綁定全域 `paste` 監聽器與全域 `keydown` 可列印字元轉發：當焦點不在 `<input>` / `<textarea>` 且不在編輯器內（例如剛切換至「純瀏覽」模式或點擊空白處）時，使用者直接按 `Ctrl/Cmd + V` 貼上或打字，內容會自動寫入編輯器並觸發預覽更新。
* **Markdown 解析器閒置預擷取**：透過 `requestIdleCallback`（降級為 `setTimeout(..., 50)`）於背景預先載入 `src/renderer/markdown.ts`。
* **建置期 CSS 內嵌與版本替換 (`inlineCssPlugin` in `vite.config.ts`)**：
  * 於 `transformIndexHtml` 階段將 `%APP_VERSION%` 替換為 `pkg.version`，並將產出的 `.css` 資產直接替換為 `<style>...</style>` 內嵌標籤，隨後自 bundle 中移除獨立 CSS 檔案。
  * 透過 Vite `define` 注入 `__APP_VERSION__`、`__COMMIT_HASH__`（由 `git rev-parse --short HEAD` 取得）與 `__BUILD_TIME__`。

### 2. Ondine (Rust/WASM) 向量圖表編譯管線 (`src/renderer/mermaid.ts`)
* **依需求串流編譯 (`getOndineRenderer`)**：
  * 僅當預覽區出現 `.mermaid-diagram` 節點時，才透過 `WebAssembly.compileStreaming(fetch(allWasmUrl))` 載入並編譯 `ondine/compiler/wasm/all.wasm`（若環境不支援或 MIME 標頭不符則自動降級為 `fetch` + `arrayBuffer` + `WebAssembly.compile`）。
  * 提供 `initOndineRenderer(wasmModule)` 供單元測試環境（Vitest / jsdom）直接注入編譯好的 WASM 模組。
* **防競態與 210B 掛載 (`renderMermaidDiagrams`)**：
  * 每次呼叫遞增 `currentRenderToken`；非同步等待 WASM 載入後及迴圈渲染每個圖表前皆檢查 `token !== currentRenderToken`，確保快速打字時舊任務立即作廢。
  * 呼叫 `renderer.render(rawCode, { idPrefix, responsive: true })` 產出 SVG 結構，再以 `ondine` 的 `mount(element, rendered)` 掛載，並為容器與 `<svg>` 標註 `data-theme="dark|light"`。
* **`--ondine-*` CSS 變數驅動主題切換**：
  * 圖表配色完全由 `src/styles/tokens.css`（以及匯出時內嵌於 `html-exporter.ts` 與 `print.css`）中的 `--ondine-*` CSS 自訂屬性控制。切換深淺色主題時無須重新呼叫 WASM 編譯器，達成 0ms 主題切換。
* **`RenderError` 精準錯誤邊界**：
  * 語法未完成或錯誤時捕獲 `RenderError`，提取 `err.line` 與 `err.column` 顯示 `[行 X, 欄 Y]` 微型提示框，不污染全域 DOM 且不中斷其餘圖表渲染。

### 3. Markdown AST 擴充、KaTeX 動態渲染與 DOMPurify 消毒 (`src/renderer/markdown.ts`, `src/renderer/katex.ts`)
* **`mathPlugin`（自訂 LaTeX 數學公式 AST 外掛）**：
  * Inline 規則精準辨識 `$formula$`，嚴格檢查開啟 `$` 後不可為空白或數字、閉合 `$` 前不可為空白且後不可緊接數字，徹底防禦 `$20 and $30` 等貨幣金額誤判。
  * Block 規則辨識單行 `$$...$$` 與跨行 `$$...$$` 展示區塊，轉譯為帶有 `data-math` 與 `data-display` 屬性之預留節點，交由 `src/renderer/katex.ts` 以 `import('katex')` 非同步渲染。
* **`gfmAlertsPlugin`（自訂 GitHub 風格提示框 AST 外掛）**：
  * 於 `markdown-it` Core 階段掃描 `blockquote_open` Token，辨識首段開頭之 `[!NOTE]`、`[!TIP]`、`[!IMPORTANT]`、`[!WARNING]`、`[!CAUTION]`，注入對應 `.markdown-alert-*` 類別與 Lucide SVG 圖示，完整支援內部巢狀清單、表格與程式碼區塊。
* **`gfmTasklistsPlugin`（自訂待辦核取方塊外掛）**：
  * 將清單項開頭之 `[ ] `、`[x] `、`[X] ` 轉為 `<input class="task-list-item-checkbox" type="checkbox" disabled>`。
* **DOMPurify 白名單防護**：
  * 啟用 `svg: true, svgFilters: true, html: true`，並明確允許 MathML 標籤与 `data-raw`、`data-math`、`data-display`、`data-theme` 等自訂屬性。

### 4. AI / Gemini Markdown 智慧修復引擎 (`src/utils/formatter.ts`)
`fixMarkdownFormatting(rawText)` 依序執行以下 **11 個嚴格有序的處理階段**（修改時切勿隨意調動順序，且必須維持**嚴格冪等性 Idempotency**）：
1. **換行標準化**：將 `\r\n` 與 `\r` 統一轉為 `\n`。
2. **隱形字元與非標準空格清理**：清除零寬字元（`[\u200B\u200C\u200D\uFEFF\u2060]`），並將 NBSP（`[\u00A0\u202F]`）轉為標準半形空格 `' '`。
3. **Gemini 雙重超連結收斂 (`fixGeminiDoubleLinks`)**：
   * 遮罩多行與行內程式碼後，將 `[[文字](URL1)](URL2)` 收斂為 `[文字](URL1)`（支援相同 URL 及外層 Google Redirect 包裝，優先保留內層真實目標網址）。
4. **LaTeX 數學與比較符號校正 (`fixMathSymbols`)**：
   * 遮罩程式碼後，將獨立符號（`$\le$`、`$\ge$`、`$\neq$`、`$\approx$`、`$\pm$`、`$\times$`、`$\div$`、`$\degree$`、`$\sim$`、`$\infty$`）、行內公式內部運算子（`$x \le y$` ➔ `$x ≤ y$`）及獨立巨集（`\le 35` ➔ `≤ 35`）轉為標準 Unicode 符號（`≤`、`≥`、`≠`、`≈`、`±`、`×`、`÷`、`°`、`~`、`∞`）。
5. **行內黏合清單拆分 (`fixInlinedLists`)**：
   * 跳過表格行與標題行，偵測句尾標點（`。！？.!?`）、粗體閉合（`**`）或冒號（`:：`）後緊接空白與清單標記（`* **`、`- **`、`1. **`、`- [ ]`）之單行黏合情境，自動插入 `\n` 拆分。
6. **粗體超連結邊界錯位修復 (`fixMisplacedBoldLinks`, Issue #18)**：
   * 修復自 Gemini 複製時外層粗體星號錯置於超連結方括號內側之缺陷（如 `**替代 [Google Keep](URL1)：[Notesnook**](URL2)` ➔ `**替代 [Google Keep](URL1)：[Notesnook](URL2)**`，以及 `[**Google Keep](URL1) 替代方案**` ➔ `**[Google Keep](URL1) 替代方案**`）。
   * 必須注意：本階段必須在 `fixOrphanedNestedIndentation` 之前執行，因為修復粗體邊界後才能正確還原 `* **[標題](URL)**` 等純粗體父項特徵。
7. **遺失縮排之巢狀子清單推導 (`fixOrphanedNestedIndentation`, Issue #17)**：
   * 當父清單項以冒號（`:` 或 `：`）結尾，或整行內容為純粗體標題（`* **標題**`，且下方緊鄰非純粗體子項）時，自動為下方未縮排之子清單項補齊 `  `（2 格半形空格）縮排。
   * 內建 6 大防線：連續子項目群組維護、遇新父項目重置同級、平行純粗體清單不縮排、Lazy Continuation 非清單行中斷、表格與程式碼隔離、已具備 `>= 2` 格縮排者直接跳過之冪等守衛。
8. **粗體標記排版與 CommonMark Flanking 修復 (`fixBoldFormatting` / `fixBoldInLine`)**：
   * 略過水平分隔線（`***`）並遮罩行內程式碼；清除四星號空粗體（`****`）與內部全空白粗體（`** **`）。
   * 將粗體內側首尾空白移至粗體外側；於純英數技術名詞粗體與 CJK 中文字元交界處自動補齊半形空格。
   * **CommonMark §6.2 Flanking 合規性修補**：當粗體內容以標點符號（如 `「【《（"`）開頭且緊鄰前方的 CJK/英數字元，或以標點符號（如 `」】》）"`）結尾且緊鄰後方的 CJK/英數字元時，自動於外側補齊空格（如 `了 **「引號粗體」** 是`），解決 `markdown-it` 因不滿足 Left/Right-Flanking 條件而不渲染粗體的問題。
9. **Markdown 表格智慧修復 (`repairMarkdownTables`)**：
   * 剔除孤立管線行（如單獨一行的 `|`）；探查標頭與分隔線（`|---|---|`）欄位數，自動剔除表格內部夾雜的空行，將跨行斷裂的儲存格縫合回同一列，並為缺失首尾管線的資料行補齊 `| ` 與 ` |`。
10. **標題、清單與核取方塊空格校正（含 Issue #19 斜體防護）**：
    * 遮罩多行程式碼區塊後，將 `#標題` 修補為 `# 標題`；將 `1.項目` 修補為 `1. 項目`；將 `-[]`、`-[x]` 標準化為 `- [ ] `、`- [x] `。
    * **單星號斜體誤判防禦 (`isStartsWithItalicAsterisk`, Issue #19)**：當行首為 `*文字` 時，先檢查該行首單星號是否與同行後續的奇數星號構成合法 CommonMark 閉合斜體（如 `*斜體標題*：說明`）。若是合法斜體則原樣保留，絕不可誤插空格拆成無序清單 `* 斜體標題*：說明`。
11. **未閉合程式碼區塊補齊與連續空行壓縮**：
    * 若全文行首 ` ``` ` 出現次數為奇數，自動於文末補齊 `\n```\n`；將 3 個以上連續換行（`\n{3,}`）壓縮為標準雙換行（`\n\n`）。

### 5. 版面狀態機、雙欄拖曳與雙向捲動同步 (`src/layout/`)
* **三態版面與閱讀模式狀態機 (`src/layout/switcher.ts`)**：
  * 管理 `editor`（純編輯）、`split`（雙欄對照）、`preview`（純瀏覽）三態，同步更新 `#app` 與 `#app-workspace` 的 `data-layout` 屬性及頂部 Segmented 滑塊位置。
  * 管理純瀏覽模式下的三種閱讀寬度（`ReadingMode`）：`auto`（自適應）、`tablet`（平板直式 `834px`）、`mobile`（手機直式 `412px`），寫入 `data-reading-mode` 屬性並支援 `Alt+M` 循環切換。
  * 管理專注全螢幕閱讀模式（`zen-mode` class）：隱藏頂部工具列並顯示右下角 `#zen-floating-pill` 懸浮膠囊。
* **雙向捲動同步互斥鎖 (`src/layout/sync-scroll.ts`)**：
  * 依據 `scrollTop / (scrollHeight - clientHeight)` 等比同步左右捲動位置，透過 `isEditorScrolling` 與 `isPreviewScrolling` 互斥鎖搭配 `requestAnimationFrame` 防止雙向事件無窮迴圈震顫。

### 6. 四合一無損匯出器與離屏沙盒架構 (`src/exporter/`)
* **`md-exporter.ts`**：建立 `text/markdown;charset=utf-8` Blob 下載並立即呼叫 `URL.revokeObjectURL`。
* **`html-exporter.ts`**：封裝獨立自給 HTML5 文件，完整內嵌深淺色變數（含 `--ondine-*` 圖表變數）、排版 CSS、KaTeX 與已渲染之 Ondine SVG。
* **`pdf-exporter.ts`**：呼叫 `window.print()`，由 `src/styles/print.css` 的 `@media print` 規則強制轉換為白底黑字高對比排版，並對 `pre`、`table`、`.mermaid-diagram`、`.markdown-alert` 套用 `break-inside: avoid`。
* **`png-exporter.ts`**：
  * 依需求動態載入 `html-to-image`（`await import('html-to-image')`）。
  * 建立離屏沙盒容器（Offscreen Sandbox），深層複製 `#preview-content` 節點，強制移除內部元素的 `overflow` 與 `max-height` 限制以確保寬表格與大型圖表完整展開不裁切。
  * 支援三種寬度規格：`mobile` (`412px`)、`tablet` (`834px`)、`auto`（自適應當前預覽寬度），以 `pixelRatio: 3` 輸出 3x Retina PNG，檔名格式為 `<Title>-YYYYMMDD-HHmmss.png`。

---

## 🎨 設計規範重點 (`DESIGN.md` Alignment)

所有 UI 元件與樣式調整必須嚴格遵循 [`DESIGN.md`](DESIGN.md) 與 [`src/styles/tokens.css`](src/styles/tokens.css)：
1. **色彩階梯 (Surface Ladder)**：
   * **Canvas**：`#010102` (Dark) / `#FFFFFF` (Light)
   * **Surface 1 (面板/卡片)**：`#0F1011` (Dark) / `#F5F6F7` (Light)
   * **Surface 2 (工具列/浮層)**：`#141516` (Dark) / `#EBECEE` (Light)
   * **Surface 3 (懸浮/下拉選單)**：`#18191A` (Dark) / `#E2E4E7` (Light)
   * **Surface 4 (深度抬升)**：`#191A1B` (Dark) / `#D9DCDF` (Light)
2. **細緻邊框 (Hairlines)**：預設 `#23252A` (Dark) / `#E5E7EB` (Light)；強調 `#34343A` (Dark) / `#D1D5DB` (Light)。
3. **品牌重點色 (Lavender Accent)**：Primary `#5E6AD2`；Hover `#828FFF` (Dark) / `#4F5AB8` (Light)；Active `#5E69D1`。
4. **圓角與字型**：按鈕 `8px` (`--radius-md`)、下拉選單與卡片 `12px` (`--radius-lg`)、膠囊標籤 `9999px` (`--radius-pill`)；程式碼使用 `'JetBrains Mono', monospace`，介面與內文使用 `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`。

---

## 🤝 專案開發工作交接內容 (Development Handoff & Maintenance Playbook)

本節彙整專案目前的穩定狀態、歷次重大演進脈絡與標準作業程序（SOP），供接手開發之 AI Agent 快速進入狀況：

### 1. 目前專案狀態快照 (Current Project Snapshot)
* **當前穩定版本**：`v1.3.1`（定義於 `package.json`）。
* **單元測試覆蓋**：共 **8 個測試檔案**（`formatter.test.ts`、`markdown.test.ts`、`mermaid.test.ts`、`katex.test.ts`、`html-exporter.test.ts`、`png-exporter.test.ts`、`switcher.test.ts`、`version.test.ts`），全數通過 Vitest 自動化驗證。
* **預設主題與介面狀態**：`index.html` 預設掛載 `class="light"`（淺色紙張主題）與 `data-layout="split"`（雙欄對照模式）。

### 2. 歷次重大架構演進與回歸防線交接 (Historical Context & Regression Guards)
1. **圖表引擎由 `mermaid.js` 遷移至 `Ondine` Rust/WASM (`v1.3.0`)**：
   * 早期版本使用 `mermaid` npm 套件，因打包體積過大（~2.5MB）且容易造成功耗與排版抖動，已於 `v1.3.0` 全面替換為 `ondine` (`0.0.3`)。
   * **交接注意事項**：`src/renderer/mermaid.ts` 的檔名與公開函式名稱（`renderMermaidDiagrams`、`setMermaidTheme`）為了維持模組介面穩定而保留，但底層已完全改用 `ondine` 與 `ondine/compiler/wasm`。任何圖表顏色或匯出樣式修改，請直接調整 `tokens.css`、`html-exporter.ts` 與 `print.css` 中的 `--ondine-*` 變數，**嚴禁重新安裝或引入 `mermaid` 套件**。
2. **AI 自動修正引擎 (`src/utils/formatter.ts`) 的邊界案例防線**：
   * **Issue #17（遺失縮排之巢狀子清單）**：支援「冒號結尾父項」與「純粗體標題父項 (`* **標題**`)」兩種推導模式，但必須確保**平行純粗體清單**（如連續兩行 `* **項目 A**` 與 `* **項目 B**`）維持同級不縮排。
   * **Issue #18（粗體包裹超連結之星號錯位）**：Gemini 複製含有超連結的粗體段落時，常把閉合 `**` 塞進最後一個超連結的方括號內（如 `[Notesnook**](url)`）。`fixMisplacedBoldLinks` 會根據前後未配對星號奇偶數精準將星號移出方括號外，且絕不誤動合法的內部粗體（如 `[**完整粗體**](url)`）。
   * **Issue #19（行首單星號斜體遭誤判為無序清單）**：修復 `-項目` 補空格時，若遇到 `*斜體*` 開頭之段落，必須透過 `isStartsWithItalicAsterisk` 檢查 CommonMark 閉合性，防止將斜體拆壞為清單。
   * **鐵律**：任何對 `formatter.ts` 的修改，都必須在 `src/utils/formatter.test.ts` 新增對應回歸測試，且必須同時驗證**單次修復正確性**與**二次執行冪等性（Idempotency）**。
3. **純瀏覽「閱讀模式」與「PNG 長圖匯出」1:1 視覺對齊**：
   * 純瀏覽模式下的「平板直式 (`834px`)」與「手機直式 (`412px`)」樣式（位於 `src/styles/preview.css`），其容器寬度、內距（Padding）、字級與表格/圖表防截斷規則，必須與 `src/exporter/png-exporter.ts` 離屏沙盒設定保持 100% 同步，確保使用者在純瀏覽模式看到的畫面與匯出的 PNG 長圖完全一致。

### 3. 版本號升級標準作業程序 (Version Bump SOP)
本專案採用 **`package.json` 單一事實來源（Single Source of Truth）** 機制管理版本號：
1. 當完成功能開發或 Bug 修復並準備升級版本時，修改 `package.json` 中的 `"version"` 欄位（並同步更新 `package-lock.json` 的根版本號）。
2. `vite.config.ts` 會在開發與建置期自動讀取 `package.json` 的 `version`：
   * 透過 `define.__APP_VERSION__` 自動注入 `src/utils/version.ts`。
   * 透過 `inlineCssPlugin` 自動將 `index.html` 中的 `v%APP_VERSION%` 替換為實際版本號。
3. 若 [`README.md`](README.md) 頂部徽章或本文件快照有標示版本號，請一併同步更新。
4. 執行 `npm test` 與 `npm run build`，確認版本測試與生產環境打包全數通過。

---

## 📋 開發、測試與建置指令 (Development Commands)

```bash
# 1. 安裝相依套件（維持鎖定版本，禁止隨意執行未經審查之 lifecycle scripts）
npm install --ignore-scripts

# 2. 啟動本機開發伺服器 (Vite HMR)
npm run dev

# 3. 執行 Vitest 自動化單元測試（修改任何邏輯或測試後必跑）
npm test

# 4. 執行 TypeScript 嚴格型別檢查並編譯生產環境資源 (輸出至 dist/)
npm run build

# 5. 本機預覽編譯後的靜態檔案 (dist/)
npm run preview
```

---

## 🚫 AI Agent 開發約束與反模式 (Strict Constraints for LLMs)

1. **嚴禁引入持久化快取 (No Local Storage / Cookies / IndexedDB)**：
   * 本專案定位為嚴格無痕暫態工具，任何時候皆不得自動將使用者內容或介面狀態儲存至 `localStorage`、`sessionStorage`、`IndexedDB` 或 `Cookie`。
2. **保持相對路徑設定 (Relative Base URL)**：
   * [`vite.config.ts`](vite.config.ts) 必須持續維持 `base: './'`，確保部署於 GitHub Pages 任意子路徑時資源載入正確。
3. **保持 CSS 模組化匯入與 Vite 內嵌架構**：
   * 樣式表必須由 `src/main.ts` 集中引入，透過 `inlineCssPlugin` 內嵌至 HTML，禁止在 `index.html` 直接寫死未編譯的 `/src/styles/...` 標籤。
4. **排除除錯與測試素材**：
   * 本機測試素材、截圖與除錯目錄（如 `issue/`）必須維持在 `.gitignore` 中，嚴禁提交至 Git 儲存庫。
5. **維持 100% JSDoc 註解覆蓋率與無行內動態型別匯入**：
   * 新增或修改任何函式、介面或模組時，必須同步補齊詳盡之 JSDoc 繁體中文註解與型別標註；所有型別匯入一律置於檔案頂部（Top-level imports only）。
6. **Git Commit 訊息標準**：
   * 嚴格奉行 Linus Torvalds 祈使語態（Imperative Mood），主旨行不超過 50 字元，一律使用「正體中文」撰寫，段落分明並詳述變更核心與原因，且絕不使用任何 Emoji。

---

# Git Commit Timing & Execution Protocol

你在執行程式碼撰寫與修改時，必須嚴格遵守以下 Git Commit 時機與原則（注意：除非使用者明確要求 Commit，否則請先完成驗證並待命，或依使用者指示執行）：

## 1. 觸發 Commit 的時機（When to Commit）
當使用者要求提交，或處於授權自動提交之工作流時，必須在滿足以下任一「原子條件」且驗證通過時執行 Commit：
* **綠燈時刻（Task Completed & Verified）：** 完成單一函式、模組或功能改動，且已執行相關測試（Unit Tests / Build / Type Check）確認通過。
* **重構與格式化隔離（Style/Refactor Shift）：** 剛完成純程式碼重構、排版整理、重新命名或 Lint 修正時，必須立即獨立 Commit，絕不與業務邏輯修改混雜。
* **冒險前錨點（Pre-Exploration Checkpoint）：** 在準備進行高風險架構重構、大規模套件更換或嘗試不確定解法前，先將目前穩定的狀態 Commit 作為還原基準點。
* **缺陷根因修復（Bug Isolated & Fixed）：** 成功定位並修復單一 Bug、驗證有效後立即 Commit，不可夾帶任何「順手修改」的無關程式碼。
* **子任務切分點（Sub-task Boundary）：** 當使用者指派複合型任務時，每完成計畫中的一個子步驟並確認無誤，即刻獨立 Commit 一次。

## 2. 嚴禁 Commit 的情境（When NOT to Commit）
* **編譯失敗或測試未過：** 程式碼處於 Broken 狀態時絕不 Commit。
* **混雜多重意圖：** 單次改動涵蓋兩個以上不相關的檔案修改或意圖時，不可合併 Commit，必須拆分暫存（Staging）。
* **邏輯半成品：** 功能僅完成一半、尚未形成閉環邏輯時不可 Commit（除非使用者明確要求建立 WIP Checkpoint）。

## 3. 提交前檢查清單（Pre-Commit Checklist）
在執行 `git commit` 前，你必須於背景執行以下自我檢驗：
1. 執行 `git status` 與 `git diff`，確認 Staged 變更僅包含該任務的最小相關檔案。
2. 確認此 Commit 具備**可獨立編譯性**與**可安全回滾性（Revertible）**。
