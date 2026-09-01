# MarkdownWebViewer — Developer & LLM Context Guide (GEMINI.md)

本文件提供給所有參與本專案開發的 LLM Agent 與工程師，彙整本專案之核心架構、技術選型、設計規範、程式碼組織與開發原則。

---

## 📌 專案概述 (Project Overview)

**MarkdownWebViewer** 是一套基於 **Linear Design System (`DESIGN.md`)** 規格打造的純前端靜態 Markdown & Mermaid 即時查看器與排版工具。
專為極致冷啟動（Cold Start）、零後端依賴、零本機殘留（Zero-Persistence）、Lighthouse 全項滿分（100/100）與 GitHub Pages 自動化發布而設計。

### 核心功能清單：
1. **雙欄即時預覽與雙向滾動同步**：左側 CodeMirror 6 編輯、右側 Markdown + Highlight.js + Mermaid 即時渲染，內建互斥鎖防止循環滾動震顫。
2. **Linear 風格三態佈局切換**：右上角 Segmented Control（純編輯 `Alt+1`、雙欄對照 `Alt+2`、純瀏覽 `Alt+3`）與中央拖曳分隔條（15%~85% 範圍限制保護）。
3. **AI / Gemini 排版智慧「✨ 自動修正」(`Alt+F`)**：
   * **表格智慧修復**：自動縫合中斷資料列、剔除孤立 `|` 符號、補齊缺失之首尾管線字元。
   * **LaTeX 數學與比較符號標準化**：自動將自 AI 介面複製之 LaTeX 不等式與符號（如 `$\le$`、`$\ge$`、`$\neq$` 等）轉為對應標準 Unicode 符號（`≤`、`≥`、`≠` 等），並具備程式碼遮罩保護。
   * **粗體標籤格式校正**：閉合孤立星號、消除標記內側贅餘空格、智能補齊中英文字界空格，並防止跨標記與跨行誤配。
   * **隱形字元與空格清洗**：移除零寬空格（`\u200B`~`\u2060`）與置換不換行空格（`\u00A0`、`\u202F`）。
   * **語法修補**：補齊標題空格（`#標題` ➔ `# 標題`）、清單空格與核取方塊（`-[]` ➔ `- [ ] `）、未閉合反引號區塊（```）與多餘空行壓縮。
4. **☀️ / 🌙 淺色與深色主題切換 (`Alt+T`)**：全站 UI、CodeMirror 6 編輯器（透過 Compartment 動態重配）、Highlight.js 語法著色與 Mermaid 向量圖表即時聯動重繪。
5. **純前端三合一多格式匯出**：匯出 UTF-8 `.md`、內嵌完整樣式與向量 SVG 的單一自給離線 `.html`、高解析列印級防截斷 `.pdf`。
6. **極致冷啟動與效能優化 (Lighthouse 100/100)**：CodeMirror 6 延遲互動載入、Markdown 解析引擎延遲預擷取、Mermaid 按需動態加載、建置期 CSS 自動內聯消除渲染阻斷。
7. **無障礙 (a11y) 與 SEO 全面適配**：按鈕具備明確 `aria-label`、符合 WCAG AA 高對比度標準、結構化語意標籤與 `robots.txt`。
8. **嚴格無痕暫態生命週期 (Zero-Persistence)**：全流程純記憶體操作，嚴禁使用 `localStorage` / `sessionStorage` / `Cookie`，內建離開防誤觸保護。
9. **GitHub Pages 一鍵自動化部署**：基於 Vite 相對路徑（`base: './'`）建置與 GitHub Actions 自動化 CI/CD。

---

## 🛠️ 技術選型矩陣 (Tech Stack)

| 領域 / 模組 | 選用技術 | 版本 | 職責與選型理由 |
| :--- | :--- | :--- | :--- |
| **建構工具 / 語言** | Vite + TypeScript | Vite 6 / TS 5 | 極速 HMR、原生 ES 模組、靜態型別安全 |
| **編輯器核心** | CodeMirror 6 | 6.x | 模組化設計、輕量、透過 Compartment 支援無重建模組主題、語法著色與折行動態重配 |
| **Markdown 解析** | markdown-it | 14.x | 高效符合 CommonMark/GFM 規範，擴充彈性高，支援 typographer 與 breaks |
| **程式碼語法高亮** | highlight.js | 11.x | 採用 common 語言子集打包以最小化體積，適配深/淺雙主題色彩 |
| **安全消毒過濾** | DOMPurify | 3.x | 嚴格防禦 XSS 攻擊，配置 SVG 與向量繪圖屬性白名單保留圖表 |
| **向量圖表引擎** | mermaid.js | 11.x | **動態延遲非同步載入（Dynamic Import）**，未出現圖表時首屏零體積負擔 |
| **圖示庫** | lucide | 0.475.x | 精緻簡約之 SVG 圖示，用於 GitHub Alerts 與工具列控制 |
| **程式碼壓縮** | terser | 5.x | 生產環境 Minification，清除除錯符號以縮減檔案體積 |
| **CI/CD 自動化** | GitHub Actions | v4 | Push 到 `main` 分支自動執行 `npm run build` 並部署到 GitHub Pages |

---

## 📂 專案檔案結構 (Project Structure)

```
MarkdownWebViewer/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 自動部署至 GitHub Pages
├── dist/                     # 生產環境編譯輸出目錄 (已被 gitignore)
├── public/
│   └── robots.txt            # 搜尋引擎檢索規範設定 (Disallow: /dist/ 等)
├── src/
│   ├── editor/
│   │   └── codemirror.ts     # CodeMirror 6 實例、Linear 深淺主題、Compartments、拖曳檔案載入、統計指標
│   ├── exporter/
│   │   ├── html-exporter.ts  # 封裝單一獨立自給 .html 檔案 (內嵌 CSS 與 SVG 向量圖)
│   │   ├── md-exporter.ts    # Blob 匯出純文字 .md 檔案 (釋放 ObjectURL 避免洩漏)
│   │   └── pdf-exporter.ts   # window.print() 搭配 @media print 高解析列印與反白樣式
│   ├── layout/
│   │   ├── resizer.ts        # 中央分割條拖曳與寬度限制 (15% ~ 85%)
│   │   ├── switcher.ts       # 右上角三態佈局狀態機 (Alt+1/2/3) 與 Segmented 指示條
│   │   └── sync-scroll.ts    # 雙向等比滾動同步與 isScrolling 迴圈互斥鎖 (rAF 節流)
│   ├── renderer/
│   │   ├── markdown.ts       # markdown-it 配置、Highlight.js 著色、GitHub 警示區塊、DOMPurify 消毒
│   │   └── mermaid.ts        # 按需動態加載 mermaid.js、主題重繪、防競態 Token、錯誤邊界
│   ├── styles/
│   │   ├── base.css          # 全域 Reset、自訂捲軸、Toast 動畫、[hidden] 全域保護
│   │   ├── dropdown.css      # Linear 懸浮選單與彈出動畫
│   │   ├── editor.css        # CodeMirror 6 自訂樣式與 Gutters
│   │   ├── layout.css        # 工具列、雙欄容器、狀態列佈局與響應式斷點
│   │   ├── preview.css       # 技術文檔排版、表格、程式碼、深淺色 Highlight.js、Mermaid 容器
│   │   ├── print.css         # @media print 高對比白底列印、防跨頁截斷 (break-inside: avoid)
│   │   └── tokens.css        # DESIGN.md 權威 Design Tokens (深色與淺色變數)
│   ├── utils/
│   │   ├── debounce.ts       # 120ms 防抖排程調度器
│   │   ├── formatter.ts      # Gemini / AI Markdown 壞格式智慧修復引擎 (含 LaTeX 數學符號轉換)
│   │   ├── sample.ts         # 初始範例 Markdown 模板 (含流程圖、時序圖、表格、程式碼、公式)
│   │   └── toast.ts          # 非侵入式 Toast 輕量通知模組 (支援 success / info / error)
│   └── main.ts               # 應用程式進入點，延遲掛載、生命週期管線、快捷鍵與全域事件
├── .gitignore                # 忽略 node_modules、dist、issue/
├── DESIGN.md                 # Linear 設計系統權威分析與 Token 定義文件
├── GEMINI.md                 # 本文件 (LLM & 開發者上下文指引)
├── index.html                # 靜態 HTML Shell (含預設輕量佔位與 SEO meta)
├── package.json              # 專案相依套件與腳本
├── plan.md                   # 產品初始架構與規格計畫書
├── README.md                 # 專案說明文件與快速開始指南
├── tsconfig.json             # TypeScript 編譯設定
└── vite.config.ts            # Vite 相對路徑建置、CSS 自動內聯外掛與 Rollup 手動拆包配置
```

---

## 🎨 設計規範重點 (DESIGN.md Alignment)

所有 UI 與元件必須嚴格遵循 [`DESIGN.md`](DESIGN.md) 規範：

1. **色彩階梯 (Surface Ladder)**：
   * **Canvas**：`#010102` (Dark) / `#FFFFFF` (Light)
   * **Surface 1 (面板/卡片)**：`#0F1011` (Dark) / `#F5F6F7` (Light)
   * **Surface 2 (工具列/浮層)**：`#141516` (Dark) / `#EBECEE` (Light)
   * **Surface 3 (懸浮/下拉選單)**：`#18191A` (Dark) / `#E2E4E7` (Light)
   * **Surface 4 (深度抬升)**：`#191A1B` (Dark) / `#D9DCDF` (Light)
2. **細緻邊框 (Hairlines)**：
   * 預設邊框：`#23252A` (Dark) / `#E5E7EB` (Light)
   * 強調邊框：`#34343A` (Dark) / `#D1D5DB` (Light)
3. **品牌重點色 (Lavender Accent)**：
   * Primary：`#5E6AD2` (聚焦框、品牌標誌、主要按鈕)
   * Hover：`#828FFF` (Dark) / `#4F5AB8` (Light)
   * Active：`#5E69D1`
4. **圓角尺度 (Rounded Scale)**：
   * 按鈕與輸入框：`8px` (`--radius-md`)
   * 卡片與下拉選單：`12px` (`--radius-lg`)
   * 標籤與狀態：`9999px` (`--radius-pill`)
5. **字型規範 (Typography)**：
   * 編輯器程式碼：`'JetBrains Mono', monospace` (13.5px / 1.65 行高)
   * 介面與預覽本文：`-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif`

---

## ⚡ 核心演算法與設計模式 (Core Architecture)

### 1. 極速冷啟動與按需延遲載入管線 (Cold-Start & Lazy Pipeline)
為達成 Lighthouse 100/100 滿分評級，專案採用全方位延遲非同步載入架構：
* **CodeMirror 6 延遲掛載**：首屏僅渲染靜態佔位元素，等待使用者觸發首個輸入事件（`pointerdown` / `keydown`）或經過 3.5 秒閒置超時後，才動態載入 CodeMirror 模組與初始化實例。
* **Markdown 解析引擎延遲預擷取**：透過 `getMarkdownRenderer()` 動態加載 `markdown-it`、`highlight.js` 與 `DOMPurify`，避免首屏同步載入大型解析套件。
* **Mermaid 延遲管線與防競態機制**：
  * Mermaid 體積較大（>2MB），僅當解析器於預覽區掃描到 `.mermaid-diagram` 時，才透過 `import('mermaid')` 動態載入。
  * 每次繪圖持有獨立遞增的 **`currentRenderToken`**，避免使用者快速打字時舊渲染工作覆蓋新內容。
  * 遭遇未閉合或語法不完整之即時輸入，透過 Error Boundary 顯示微型警告條，不阻斷整體預覽。
* **建置期 CSS 自動內聯外掛 (`inlineCssPlugin`)**：
  * 在 `vite.config.ts` 中自訂外掛，於產出 HTML 時將編譯完成的 CSS 樣式直接內嵌於 `<style>` 標籤中，徹底消除外部 CSS 引起的渲染阻斷網路請求（Render-Blocking Resources）。

### 2. AI / Gemini Markdown 智慧修復引擎 (`src/utils/formatter.ts`)
專門解決自 Gemini、ChatGPT、Claude 等 AI 複製內容時產生的格式破損與排版缺陷，依序執行 9 大處理階段：
1. **換行字元標準化**：將 `\r\n` 與 `\r` 全數統一轉為標準 `\n`。
2. **隱形字元清理**：清除不可見零寬字元（`\u200B`~`\u2060`、`\uFEFF`），並將非標準空格（`\u00A0` NBSP、`\u202F`）轉為標準半形空格。
3. **LaTeX 數學與比較符號校正 (`fixMathSymbols`)**：
   * 建立多行程式碼區塊（```...```）與行內反引號程式碼（`...`）遮罩，防止程式碼內部符號遭誤改。
   * 將獨立 LaTeX 標記（如 `$\le$`、`$\ge$`、`$\neq$`、`$\approx$`、`$\pm$`、`$\times$`、`$\div$`、`$\degree$`、`$\infty$` 等）轉為對應標準 Unicode 符號（`≤`、`≥`、`≠`、`≈`、`±`、`×`、`÷`、`°`、`∞`）。
   * 將行內公式 `$x \le y$` 內部之運算符轉換為 `$x ≤ y$`，並支援無 `$` 標記但獨立出現之巨集（如 `\le 35` 轉 `≤ 35`）。
4. **粗體標記格式修復 (`fixBoldFormatting`)**：
   * 排除三星號（粗斜體）干擾，精準比對行內雙星號。
   * 消除標記內側多餘空格（如 `** 粗體 **` 轉 `**粗體**`）、清除空粗體標記（`****`）。
   * 在中文字元與英數字元交界處自動補齊標準半形空格，同時嚴格限制於單行內配對，杜絕跨行合併與跨標記誤配導致版面錯亂。
5. **Markdown 表格智慧修復 (`repairMarkdownTables`)**：
   * 辨識表格 Header 與 Separator（`|---|---|`），剔除表格內部夾帶的無意義空行與孤立 `|` 行。
   * 自動為缺失首尾管線的資料行補齊 `| ` 與 ` |`，恢復 GFM 表格結構。
6. **標題語法缺失空格校正**：將 `#標題`、`##標題` 自動修正為 `# 標題`、`## 標題`。
7. **清單與核取方塊排版校正**：將 `-項目` 轉為 `- 項目`；將 `-[]` 或 `-[x]` 轉為標準 `- [ ] ` 或 `- [x] `。
8. **程式碼區塊閉合性自動補齊**：統計全文 ``` 開閉數量，若為奇數則於文末自動補齊閉合反引號標籤。
9. **連續多餘空行壓縮**：將超過 2 行之多餘連續空白行壓縮為標準雙換行（`\n\n`）。

### 3. 雙向滾動同步互斥鎖 (`src/layout/sync-scroll.ts`)
* 左右雙欄綁定 `scroll` 事件，依據滾動百分比（`scrollTop / (scrollHeight - clientHeight)`）進行等比同步。
* 設置 `isEditorScrolling` 與 `isPreviewScrolling` 互斥標記，並結合 `requestAnimationFrame` 節流，徹底防止左右兩側互發滾動事件造成的無窮遞迴震顫。

### 4. CodeMirror 6 Compartment 狀態隔離隔間模式 (`src/editor/codemirror.ts`)
* 使用 `@codemirror/state` 的 `Compartment` 技術：
  * `themeCompartment`：動態切換 `linearDarkTheme` 與 `linearLightTheme`。
  * `syntaxCompartment`：動態切換深色（One Dark）與淺色（Default）語法高亮配色。
  * `wrapCompartment`：動態切換自動折行（`EditorView.lineWrapping`）與水平捲動（`[]`）。
* 所有外觀與配置重配皆透過 `view.dispatch({ effects: [...] })` 完成，完全無須重新銷毀或重建編輯器視圖。

### 5. 渲染防護與 GFM AST 擴充管線 (`src/renderer/markdown.ts`)
* **預處理**：先經由 `fixMathSymbols` 轉換 LaTeX 符號。
* **自研 GFM Alerts AST 外掛 (`gfmAlertsPlugin`)**：在 `markdown-it` Core 階段遍歷 Token 串流，辨識 `> [!NOTE]`、`> [!TIP]`、`> [!IMPORTANT]`、`> [!WARNING]`、`> [!CAUTION]` 並動態轉為 Alert 容器標籤與 Lucide SVG 圖示。支援內部多段落、清單、表格與程式碼區塊等完整巢狀 Markdown 結構。
* **自研 GFM Tasklists AST 外掛 (`gfmTasklistsPlugin`)**：自動將 `- [ ]` 與 `- [x]` 轉譯為禁用狀態之 `<input type="checkbox">` 核取方塊元素，並注入 `.task-list-item` 類別。
* **解析與著色**：透過 `markdown-it` 解析為 HTML，程式碼區塊由 `highlight.js`（common 子集）著色；Mermaid 區塊則透過自訂 `md.renderer.rules.fence` 轉換為純淨帶有 `data-raw` 屬性之佔位節點。
* **DOMPurify 嚴格安全過濾**：啟用 `USE_PROFILES: { svg: true, svgFilters: true, html: true }`，擴充包含 `<defs>`, `<marker>`, `<use>`, `<clipPath>`, `<filter>` 等完整 SVG 向量標籤與 `transform`, `filter`, `marker-start`, `marker-end` 等屬性白名單，徹底防禦 XSS 攻擊同時確保 Mermaid 複雜圖表零瑕疵呈現。

### 6. 純前端三合一無損匯出機制 (`src/exporter/`)
* **`.md` 匯出**：以 UTF-8 編碼建立 `Blob`，透過虛擬 `<a>` 標籤觸發下載，並呼叫 `URL.revokeObjectURL` 即時釋放瀏覽器記憶體。
* **`.html` 匯出**：將預覽區 HTML 連同全套 Linear 主題 CSS 樣式、高亮樣式表以及 Mermaid SVG 圖表整合打包為單一獨立自給檔案，離線直接開啟即可完整檢視。
* **`.pdf` 匯出**：注入 `@media print` 專屬樣式，強制反轉為高對比白底黑字，針對程式碼、表格與 Mermaid 圖表套用 `break-inside: avoid` 防止跨頁截斷，呼叫 `window.print()` 產生列印級 PDF。

---

## 📝 程式碼品質與 JSDoc 工程規範 (Code Quality & Standards)

全專案遵循最高規格之軟體工程品質規範：
1. **100% 完整 JSDoc 中文註解**：
   * 所有 TypeScript 檔案（包含公開類別、內部函式、回呼介面、建置設定檔 `vite.config.ts` 與進入點 `main.ts`）皆具備詳盡之 JSDoc 繁體中文註解。
   * 包含 `@param`、`@returns`、用途描述、架構考量與極端案例說明。
2. **靜態型別完整性**：
   * 嚴格 TypeScript 編譯（`noImplicitAny`），杜絕隨意使用 `any`，介面與列舉定義明確。
3. **記憶體生命週期管理**：
   * 嚴格確保事件監聽器適時解除綁定、DOM URL 及時撤銷（`revokeObjectURL`）、編輯器實例提供 `destroy()` 銷毀機制。

---

## ⌨️ 鍵盤快捷鍵 (Keyboard Shortcuts)

| 快捷鍵 | 功能 | 說明 |
| :--- | :--- | :--- |
| **`Alt + 1`** | 切換「純編輯」模式 | 100% 寬度編輯區，適用專注寫作 |
| **`Alt + 2`** | 切換「雙欄對照」模式 | 50 / 50 寬度即時編輯與渲染對照 |
| **`Alt + 3`** | 切換「純瀏覽」模式 | 100% 寬度置中技術文件預覽排版 |
| **`Alt + F`** | ✨ 執行自動排版修正 | 修復破損表格、校正 LaTeX 符號、修復粗體與格式 |
| **`Alt + T`** | ☀️ / 🌙 切換視覺主題 | 切換深色曜黑與淺色紙質主題 |
| **`Ctrl / Cmd + Z`** | 復原 (Undo) | CodeMirror 歷史紀錄復原 |
| **`Ctrl / Cmd + Y`** | 重做 (Redo) | CodeMirror 歷史紀錄重做 |
| **`Tab / Shift + Tab`** | 縮排 / 取消縮排 | 編輯器多行縮排控制 |

---

## 📋 開發與建置指令 (Commands)

```bash
# 1. 安裝相依套件
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 執行 Vitest 自動化單元測試
npm test

# 4. 執行 TypeScript 型別檢查並編譯生產環境資源
npm run build

# 5. 本機預覽編譯後的靜態檔案 (dist/)
npm run preview
```

---

## 🚫 開發約束與反模式 (Strict Constraints for LLMs)

1. **嚴禁引入持久化快取 (No Local Storage / Cookies / IndexedDB)**：
   * 本專案定位為嚴格無痕暫態工具，任何時候皆不得自動將使用者內容儲存至 `localStorage`、`sessionStorage`、`IndexedDB` 或 `Cookie`。
2. **保持相對路徑配置 (Relative Base URL)**：
   * [`vite.config.ts`](vite.config.ts) 必須持續維持 `base: './'`，確保部署於 GitHub Pages 任意子路徑時資源加載正確。
3. **保持 CSS 模組化匯入與 Vite 內聯架構**：
   * 樣式表必須由 `src/main.ts` 集中引入，透過 `inlineCssPlugin` 內聯至 HTML，禁止在 `index.html` 直接寫死未編譯的 `/src/styles/...` 標籤。
4. **排除問題排查素材**：
   * 本機測試素材、截圖與除錯目錄（如 `issue/`）必須維持在 `.gitignore` 中，嚴禁提交至 Git 儲存庫。
5. **維持 100% JSDoc 註解覆蓋率**：
   * 新增或修改任何函式、介面或模組時，必須同步補齊詳盡之 JSDoc 繁體中文註解與型別標註。
6. **Git Commit 訊息標準**：
   * 嚴格奉行 Linus Torvalds 祈使語態（Imperative Mood），主旨行不超過 50 字元，一律使用「正體中文」撰寫，段落分明並詳述變更核心與原因。

# Git Commit Timing & Execution Protocol

你在執行代碼撰寫與修改時，必須嚴格遵守以下 Git Commit 時機與原則：

## 1. 觸發 Commit 的時機（When to Commit）
你必須在滿足以下任一「原子條件」且驗證通過時，立即執行 Commit：
* **綠燈時刻（Task Completed & Verified）：** 完成單一函數、模組或功能改動，且已執行相關測試（Unit Tests / Build / Type Check）確認通過。
* **重構與格式化隔離（Style/Refactor Shift）：** 剛完成純代碼重構、排版整理、重新命名或 Lint 修正時，必須立即獨立 Commit，絕不與業務邏輯修改混雜。
* **冒險前錨點（Pre-Exploration Checkpoint）：** 在準備進行高風險架構重構、大規模套件替換或嘗試不確定解法前，先將目前穩定的狀態 Commit 作為還原基準點。
* **缺陷根因修復（Bug Isolated & Fixed）：** 成功定位並修復單一 Bug、驗證有效後立即 Commit，不可夾帶任何「順手修改」的無關代碼。
* **子任務切分點（Sub-task Boundary）：** 當使用者指派複合型任務時，每完成計畫中的一個子步驟並確認無誤，即刻 Commit 一次。

## 2. 嚴禁 Commit 的情境（When NOT to Commit）
* **編譯失敗或測試未過：** 代碼處於 Broken 狀態時絕不 Commit。
* **混雜多重意圖：** 單次改動涵蓋兩個以上不相關的檔案修改或意圖時，不可合併 Commit，必須拆分暫存（Staging）。
* **邏輯半成品：** 功能僅完成一半、尚未形成閉環邏輯時不可 Commit（除非使用者明確要求建立 WIP Checkpoint）。

## 3. 提交前檢查清單（Pre-Commit Checklist）
在執行 `git commit` 前，你必須於背景執行以下自我檢驗：
1. 執行 `git status` 與 `git diff`，確認 Staged 變更僅包含該任務的最小相關檔案。
2. 確認此 Commit 具備**可獨立編譯性**與**可安全回滾性（Revertible）**。