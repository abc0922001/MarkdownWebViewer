# MarkdownWebViewer — Developer & LLM Context Guide (GEMINI.md)

本文件提供給所有參與本專案開發的 LLM Agent 與工程師，彙整本專案之核心架構、技術選型、設計規範、程式碼組織與開發原則。

---

## 📌 專案概述 (Project Overview)

**MarkdownWebViewer** 是一套基於 **Linear Design System (`DESIGN.md`)** 規格打造的純前端靜態 Markdown & Mermaid 即時查看器與排版工具。
專為極致冷啟動（Cold Start）、零後端依賴、零本機殘留（Zero-Persistence）與 GitHub Pages 自動化發布而設計。

### 核心功能清單：
1. **雙欄即時預覽與雙向滾動同步**：左側 CodeMirror 6 編輯、右側 Markdown + Highlight.js + Mermaid 即時渲染。
2. **Linear 風格三態佈局切換**：右上角 Segmented Control（純編輯 `Alt+1`、雙欄對照 `Alt+2`、純瀏覽 `Alt+3`）與中央拖曳分隔條（15%~85% 範圍限制）。
3. **AI / Gemini 排版智慧「✨ 自動修正」**：一鍵修復自 Gemini 等 AI 介面複製時損毀的中斷表格、孤立 `|` 行、非標準隱形字元（`Alt+F`）。
4. **☀️ / 🌙 淺色與深色主題切換**：全站 UI、CodeMirror 6 編輯器、語法著色與 Mermaid 向量圖表即時主題重繪（`Alt+T`）。
5. **純前端三合一多格式匯出**：匯出 `.md`、內嵌樣式與 SVG 的獨立自給 `.html`、高解析列印級 `.pdf`。
6. **嚴格無痕暫態生命週期 (Zero-Persistence)**：全流程純記憶體操作，嚴禁使用 `localStorage` / `sessionStorage` / `Cookie`。
7. **GitHub Pages 一鍵自動化部署**：基於 Vite 相對路徑建置與 GitHub Actions 自動化 CI/CD。

---

## 🛠️ 技術選型矩陣 (Tech Stack)

| 領域 / 模組 | 選用技術 | 版本 | 職責與選型理由 |
| :--- | :--- | :--- | :--- |
| **建構工具 / 語言** | Vite + TypeScript | Vite 6 / TS 5 | 極速 HMR、原生 ES 模組、靜態型別安全 |
| **編輯器核心** | CodeMirror 6 | 6.x | 模組化設計、輕量、透過 Compartment 支援無重建主題與折行動態重配 |
| **Markdown 解析** | markdown-it | 14.x | 高效符合 CommonMark/GFM 規範，擴充彈性高 |
| **程式碼語法高亮** | highlight.js | 11.x | 支援多語言高亮，適配深/淺雙主題配色 |
| **安全消毒過濾** | DOMPurify | 3.x | 嚴格防禦 XSS 攻擊，支援白名單保留 SVG 繪圖標籤 |
| **向量圖表引擎** | mermaid.js | 11.x | **動態延遲非同步載入（Dynamic Import）**，未出現圖表時首屏零體積負擔 |
| **CI/CD 自動化** | GitHub Actions | v4 | Push 到 `main` 分支自動執行 `npm run build` 並部署到 GitHub Pages |

---

## 📂 專案檔案結構 (Project Structure)

```
MarkdownWebViewer/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions 自動部署至 GitHub Pages
├── dist/                     # 生產環境編譯輸出目錄 (已被 gitignore)
├── src/
│   ├── editor/
│   │   └── codemirror.ts     # CodeMirror 6 實例、Linear 深淺主題、Compartments、拖曳檔案載入
│   ├── exporter/
│   │   ├── html-exporter.ts  # 封裝單一獨立自給 .html 檔案 (內嵌 CSS 與 SVG)
│   │   ├── md-exporter.ts    # Blob 匯出純文字 .md 檔案
│   │   └── pdf-exporter.ts   # window.print() 搭配 @media print 高解析列印
│   ├── layout/
│   │   ├── resizer.ts        # 中央分割條拖曳與寬度限制 (15% ~ 85%)
│   │   ├── switcher.ts       # 右上角三態佈局狀態機 (Alt+1/2/3) 與 Segmented 指示條
│   │   └── sync-scroll.ts    # 雙向等比滾動同步與 isScrolling 迴圈互斥鎖
│   ├── renderer/
│   │   ├── markdown.ts       # markdown-it 配置、Highlight.js 著色、GitHub 警示區塊、DOMPurify
│   │   └── mermaid.ts        # 按需動態加載 mermaid.js、主題重繪、防競態 Token、錯誤邊界
│   ├── styles/
│   │   ├── base.css          # 全域 Reset、自訂捲軸、Toast 動畫、[hidden] 全域保護
│   │   ├── dropdown.css      # Linear 懸浮選單與彈出動畫
│   │   ├── editor.css        # CodeMirror 6 自訂樣式與 Gutters
│   │   ├── layout.css        # 工具列、雙欄容器、狀態列佈局
│   │   ├── preview.css       # 技術文檔排版、表格、程式碼、深淺色 Highlight.js、Mermaid 容器
│   │   ├── print.css         # @media print 高對比白底列印、防跨頁截斷
│   │   └── tokens.css        # DESIGN.md 權威 Design Tokens (深色與淺色變數)
│   ├── utils/
│   │   ├── debounce.ts       # 120ms 防抖排程調度器
│   │   ├── formatter.ts      # Gemini / AI Markdown 壞格式自動修正引擎
│   │   ├── sample.ts         # 初始範例 Markdown 模板 (含流程圖、時序圖、表格、程式碼)
│   │   └── toast.ts          # 非侵入式 Toast 輕量通知模組
│   └── main.ts               # 應用程式進入點，初始化各模組、快捷鍵與全域事件
├── .gitignore                # 忽略 node_modules、dist、issue/
├── DESIGN.md                 # Linear 設計系統權威分析與 Token 定義文件
├── GEMINI.md                 # 本文件 (LLM & 開發者上下文指引)
├── index.html                # 靜態 HTML Shell
├── package.json              # 專案相依套件與腳本
├── plan.md                   # 產品初始架構與規格計畫書
├── README.md                 # 專案說明文件與快速開始指南
├── tsconfig.json             # TypeScript 編譯設定
└── vite.config.ts            # Vite 建構配置 (相對路徑 base: './' 與 Rollup 手動拆包)
```

---

## 🎨 設計規範重點 (DESIGN.md Alignment)

所有 UI 與元件必須嚴格遵循 [`DESIGN.md`](file:///C:/Users/DIDI/Documents/Git/MarkdownWebViewer/DESIGN.md) 規範：

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

---

## ⚡ 核心演算法與設計模式 (Core Architecture)

### 1. 延遲非同步圖表載入 (Lazy Mermaid Pipeline)
* `mermaid.js` 體積較大（>2MB），嚴禁於首頁同步載入。
* 僅當解析器掃描到 `.mermaid-diagram` 時，才透過 `import('mermaid')` 動態載入。
* 每次渲染帶有 **`currentRenderToken`**，避免快速打字時舊的非同步回呼覆蓋新渲染畫面。
* 遇到使用者輸入中途的語法不完整時，透過 Error Boundary 呈現微型提示條，不引發全域錯誤。

### 2. 智慧表格與 Markdown 修復演算法 ([`src/utils/formatter.ts`](file:///C:/Users/DIDI/Documents/Git/MarkdownWebViewer/src/utils/formatter.ts))
* 解決從 Gemini / ChatGPT 複製表格時常見的格式破裂問題：
  * **表格縫合**：辨識表格 Header 與 Separator，過濾表格內部空行與孤立 `|` 行。
  * **管線補齊**：為缺少首尾管線的資料列自動補齊 `| ` 與 ` |`。
  * **字元清理**：清除零寬空格（`\u200B`）與置換不換行空格（`\u00A0`）。
  * **語法修補**：補齊標題缺少空格（`#標題`）、清單缺少空格（`-項目`）、任務方框（`-[ ]`）與壓縮多餘空行。

### 3. 雙向滾動同步互斥鎖 ([`src/layout/sync-scroll.ts`](file:///C:/Users/DIDI/Documents/Git/MarkdownWebViewer/src/layout/sync-scroll.ts))
* 透過 `isEditorScrolling` 與 `isPreviewScrolling` 互斥標記，搭配 `requestAnimationFrame` 節流，防止雙向滾動事件互相觸發造成無窮循環震顫。

### 4. CodeMirror 6 Compartment 模式
* 透過 `@codemirror/state` 的 `Compartment` 動態重新配置主題（`linearDarkTheme` ⇄ `linearLightTheme`）與折行模式（`lineWrapping` ⇄ `[]`），完全不需要重新實例化編輯器。

---

## ⌨️ 鍵盤快捷鍵 (Keyboard Shortcuts)

| 快捷鍵 | 功能 |
| :--- | :--- |
| **`Alt + 1`** | 切換至「純編輯」模式 |
| **`Alt + 2`** | 切換至「雙欄對照」模式 |
| **`Alt + 3`** | 切換至「純瀏覽」模式 |
| **`Alt + F`** | 執行「✨ 自動修正」Markdown 排版與修復表格 |
| **`Alt + T`** | 切換「☀️ 淺色／🌙 深色」主題 |
| **`Ctrl / Cmd + Z`** | 復原 (Undo) |
| **`Ctrl / Cmd + Y`** | 重做 (Redo) |
| **`Tab / Shift + Tab`** | 縮排 / 取消縮排 |

---

## 📋 開發與建置指令 (Commands)

```bash
# 1. 安裝相依套件
npm install

# 2. 啟動本機開發伺服器
npm run dev

# 3. 執行 TypeScript 型別檢查並編譯生產環境資源
npm run build

# 4. 本機預覽編譯後的靜態檔案 (dist/)
npm run preview
```

---

## 🚫 開發約束與反模式 (Strict Constraints for LLMs)

1. **嚴禁引入持久化快取 (No Local Storage / Cookies)**：
   * 本專案定位為嚴格無痕工具，任何時候皆不得自動寫入 `localStorage`、`sessionStorage` 或 `IndexedDB` 保存使用者文件內容。
2. **保持相對路徑配置 (Relative Base URL)**：
   * [`vite.config.ts`](file:///C:/Users/DIDI/Documents/Git/MarkdownWebViewer/vite.config.ts) 必須維持 `base: './'`，確保部署於 GitHub Pages 子路徑時所有資源路徑正常。
3. **保持 CSS 模組化匯入**：
   * 樣式表必須由 `src/main.ts` 集中引入，避免在 `index.html` 直接寫死未編譯的 `/src/styles/...` 標籤。
4. **排除問題排查素材**：
   * 截圖與本機測試目錄（如 `issue/`）必須持續保持在 `.gitignore` 中，不可提交至 git 版本控管。
5. **Git Commit 訊息標準**：
   * 嚴格奉行 Linus Torvalds 祈使語態（Imperative Mood），主旨行不超過 50 字元，一律使用「正體中文」撰寫，段落分明並詳述變更核心與原因。
