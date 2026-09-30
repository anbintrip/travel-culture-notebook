# 入境隨俗手札｜GitHub Pages Final Release

互動式國際旅行文化網站。核心體驗不是傳統旅遊文章列表，而是從一張大型世界地圖開始，快速理解各國的習俗、禮儀、禁忌與重要旅遊法規。

> 出國前 3 分鐘，少踩一個雷。

## Final Release 已完成

- 35 個國家／地區已點亮
- 101 筆公開旅行文化提醒
- 大型 SVG 世界地圖
- 滑鼠／觸控左右拖曳、慣性、邊界阻尼
- 左右輔助按鈕與鍵盤方向鍵
- 國家 Hover 浮起與輕量資訊
- 小國家 invisible hit area
- 桌機右側快速手札 Drawer
- 手機底部快速手札
- 35 國完整國家頁
- 「出發前精選 6 件事」＋依情境分類完整手札
- 文化習慣／禮儀／場館規則／法規分流
- 小費、交通、宗教、拍照等跨國情境比較
- RWD 手機版超寬世界地圖
- 鍵盤操作、focus 樣式、Drawer focus trap
- `prefers-reduced-motion` 支援
- 動態國家頁 title / meta description
- favicon、Web App Manifest、Open Graph / Twitter 基本分享資訊
- GitHub Pages `404.html`
- `.nojekyll`
- GitHub 公開 repository 個資／秘密掃描腳本

## 專案結構

```text
/
├─ index.html
├─ styles.css
├─ app.js
├─ data.js
├─ detail-data.js
├─ map-data.js
├─ favicon.svg
├─ share-card.png
├─ manifest.webmanifest
├─ 404.html
├─ .nojekyll
├─ .gitignore
├─ check_public_repo.py
├─ DATA_SYNC.md
├─ RELEASE_CHECKLIST.md
└─ data/
   └─ culture-data.json
```

原始 Notion／CSV 匯出檔 **不放進 GitHub repository**。

## 本機預覽

這是零 build-step 的純靜態網站。

在專案資料夾開啟終端機：

```bash
python -m http.server 8080
```

瀏覽器開啟：

```text
http://localhost:8080
```

## GitHub Pages 最簡部署方式

這個專案不需要 npm、不需要 GitHub Actions，也不需要任何 API Token。

1. 建立一個 GitHub repository。
2. 把本資料夾中的檔案放到 repository **根目錄**。
3. Commit 並 push 到 `main`。
4. GitHub repository → **Settings** → **Pages**。
5. 在 **Build and deployment** 的 Source 選擇 **Deploy from a branch**。
6. Branch 選 `main`，Folder 選 `/(root)`。
7. Save，等待 GitHub Pages 完成部署。

GitHub 官方文件：

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site

## 為什麼國家頁使用 Hash Route

國家網址格式：

```text
/#/country/japan
/#/country/south-korea
/#/country/thailand
```

這是刻意設計。

GitHub Pages 是靜態主機，若網址直接使用：

```text
/country/japan
```

重新整理時主機會尋找真的 `/country/japan` 檔案，可能產生 404。

使用 `#/country/japan` 後，GitHub Pages 永遠只需要載入 `index.html`，國家頁由前端切換，因此可直接分享並重新整理。

專案仍附 `404.html` 作為一般錯誤頁面的備援。

## 分享預覽與 SEO

`index.html` 已包含：

- title
- meta description
- Open Graph title / description / image
- Twitter Card
- `share-card.png` 1200×630
- favicon
- manifest

目前刻意 **沒有寫死 canonical URL 或 GitHub Pages 網址**，因為 repository 名稱與最終網址尚未決定。

部署完成後，若希望 Facebook／LINE／Threads 等分享預覽相容性更完整，可把：

```html
<meta property="og:image" content="./share-card.png">
```

改成部署後的完整 HTTPS 絕對網址，並視需要新增 canonical URL。

## 公開 Repository 安全規則

把這個 repository 當成任何人都可以閱讀。

請勿提交：

- Email、帳號或個人識別資訊
- 私人 Notion Page / Database URL
- Notion workspace / user ID
- API Key、Token、Secret、Cookie
- `.env`
- 原始 CSV / TSV 匯出
- 私人本機路徑
- 未公開資料來源

可以提交：

- 公開旅行文化內容
- 官方公開來源網址
- 清洗後的 `culture-data.json`
- 網站程式碼與圖像資產

### 上 GitHub 前先跑

```bash
python check_public_repo.py
```

通過時會顯示：

```text
Public repository check passed
```

`.gitignore` 已阻擋常見秘密檔案與原始 CSV。

## 內容更新方式

目前內容架構是：

```text
Notion
↓ 匯出 CSV
本機清洗／驗證
↓
detail-data.js
culture-data.json
↓
GitHub Pages
```

因此 GitHub 前端完全不需要知道你的 Notion 帳號或 Token。

詳細流程請看 `DATA_SYNC.md`。

## 地圖資料

世界地圖邊界使用 Natural Earth 資料預先轉為 SVG path，網站本身不依賴 Google Maps、地圖 CDN 或外部地圖 API。

## 發布前最後一步

請依照 `RELEASE_CHECKLIST.md` 做一次人工驗收，再推到 GitHub。
