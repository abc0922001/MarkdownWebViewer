# Markdown & Mermaid Web Viewer

> 一套基於 **Linear Design System** 規範、具備極速冷啟動與嚴格無痕暫態（Zero-Persistence）特性的 Markdown 即時預覽與多格式匯出工具。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=github)

---

## 🌟 核心特色 (Key Features)

1. **雙欄即時預覽與同步**：
   - 左側 CodeMirror 6 現代編輯器，支援語法高亮、行號、自動折行、檔案拖曳載入。
   - 右側即時 Markdown + SVG 渲染，雙向等比滾動同步與防迴圈震顫保護。
2. **右上角三態佈局切換**：
   - 採用 Linear 風格 Segmented Control 滑塊，支援 **純編輯 (Alt+1)**、**雙欄對照 (Alt+2)**、**純瀏覽 (Alt+3)**。
   - 中央配置極細 1px 拖曳分隔條（支援 15% ~ 85% 彈性寬度調整）。
3. **Mermaid 向量圖表按需渲染**：
   - 延遲非同步載入 `mermaid.js`（未出現圖表時首屏零體積負擔）。
   - 內建 Render Token 防競態保護與即時打字錯誤邊界攔截。
4. **多格式匯出引擎 (純前端本地封裝)**：
   - **Markdown (`.md`)**：標準 UTF-8 純文字下載。
   - **獨立自給 HTML (`.html`)**：內嵌全套 Linear 樣式與 Mermaid 向量 SVG，任何裝置皆可離線開啟。
   - **高解析 PDF (`.pdf`)**：CSS Paged Media 列印優化，白底黑字高對比度反轉，防跨頁腰斬。
5. **嚴格無痕暫態機制 (Zero-Persistence)**：
   - 嚴格禁用 `localStorage` / `sessionStorage` / `Cookie`。
   - 重新整理或關閉分頁即徹底自記憶體抹除，並配置 `beforeunload` 防誤關閉保護。
6. **GitHub Pages 零後端部署**：
   - 內建 GitHub Actions CI/CD Pipeline，推送到 `main` 分支自動完成靜態建置與上線。

---

## 🚀 本地開發與建置 (Getting Started)

### 1. 安裝相依套件
```bash
npm install
```

### 2. 啟動本機開發伺服器
```bash
npm run dev
```

### 3. 編譯生產環境靜態檔案
```bash
npm run build
```

編譯完成之靜態檔案將儲存於 `dist/` 目錄中。

---

## 🌐 GitHub Pages 部署步驟

1. 將本專案推送（Push）至您的 GitHub 儲存庫：
   ```bash
   git add .
   git commit -m "feat: complete markdown web viewer with linear design system"
   git push origin main
   ```
2. 前往 GitHub 儲存庫頁面 -> **Settings** -> **Pages**。
3. 在 **Build and deployment** > **Source** 選擇 **GitHub Actions**。
4. 當您推送代碼至 `main` 分支時，`.github/workflows/deploy.yml` 將會自動觸發並部署至 `https://<your-username>.github.io/<repo-name>/`。

---

## 📄 授權條款 (License)

本專案採用 [MIT License](LICENSE) 開源授權。
