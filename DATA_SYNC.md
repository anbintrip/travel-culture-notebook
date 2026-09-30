# 入境隨俗手札：公開資料同步流程

## 目前採用：靜態公開快照

目前網站快照：46 個國家／地區、121 筆公開旅行提醒。

這個網站可直接部署到 GitHub Pages，因此公開 repository 只保存「網站需要顯示的內容快照」，不保存 CMS 憑證或私人管理資訊。

目前流程：

1. 在內容管理工具整理文化／禮儀／禁忌／法規。
2. 匯出 CSV。
3. 僅保留 `網站顯示 = Yes` 的資料。
4. 加入網站所需的 ISO Code、English Name、Slug。
5. 產生 `detail-data.js` 與 `data/culture-data.json`。
6. 做個資／秘密掃描。
7. 只將整理後的公開快照部署到 GitHub Pages。

## 為什麼不把原始 CSV 放進 GitHub

原始匯出檔可能含內部欄位、管理工具識別碼或未來新增的非公開欄位。因此即使目前 CSV 沒有敏感資訊，也不把原始檔直接提交到公開 repository。

## 網站公開資料欄位

每筆公開 reminder 包含：

- country / iso / englishName / slug
- region
- category
- level
- nature
- summary
- advice
- detail
- sourceName
- sourceUrl
- updatedAt
- title

其中 `sourceUrl` 僅保留官方或公開主要來源網址。

## 絕對不能放前端的資訊

- API Key
- Integration Token
- Secret
- Cookie
- 私人頁面網址
- 工作區／帳號識別資訊
- Email 或其他不必要個人資訊
- 本機使用者路徑

若日後改為即時同步，秘密憑證只能存在 Server-side / Serverless 環境變數中，不能寫進瀏覽器 JavaScript。
