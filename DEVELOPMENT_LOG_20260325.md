# 股票 KD 指標監控系統 - 開發與優化紀錄 (2026-03-25)

## 🛠 已解決的問題
1. **GitHub Pages 自動更新失效**：
   - **原因**：原先的 `update-data.yml` 與 `deploy-pages.yml` 是分開的。由於資料更新是由 `GITHUB_TOKEN` 推送的，GitHub 為了安全會阻止其觸發另一個 Deployment 工作流，導致網頁內容永不更新。
   - **解決方法**：將「抓取資料」與「部署網頁」合併至同一個 `update-data.yml` 檔案中，打破連鎖限制。

2. **Git 推送衝突與連線中斷**：
   - **原因**：由於後台每小時自動產生新資料，導致本地推送時經常落後於遠端；且專案歷史物件較多，網路波動時易造成 RPC 傳輸失敗。
   - **解決方法**：使用 `git pull origin main --no-edit` 同步資料，並透過 `git config --global http.postBuffer 524288000` 加大傳輸緩衝區以應對不穩定的網路環境。

---

## ✨ 新增功能與優化
1. **每小時自動更新 (Hourly Update)**：
   - 設定為每小時整點執行 (`cron: '0 * * * *'`)，確保資料隨時最新。
   - 同步修正了 `on: push` 觸發條件，確保每次程式碼變動後能立即執行更新與部署。

2. **效能加速 (Pip Caching)**：
   - 在 GitHub Actions 中啟動 **pip 快取機制**。
   - **成效**：從 GitHub 的內網快取空間直接還原套件，大幅縮短 `Install dependencies` 步驟的時間，避免每次都重新從網路下載 `pandas`、`yfinance` 等大型套件。

3. **安全性強化 (Security Hardening)**：
   - **決策**：基於網路安全考量（防止 Personal Access Token 遭竊或洩漏），決定移除網頁端的「手動更新按鈕」。
   - **修改內容**：刪除 `index.html` 中的按鈕與 `app.js` 裡的 API 調用邏輯。
   - **結果**：網頁端 100% 安全，不再需要輸入或儲存任何 Token。

4. **台灣時區與自動化紀錄**：
   - 設定 `TZ: Asia/Taipei`，使所有自動化產生的 Commit 訊息與系統 Log 均顯示為台北時間。

---

## 📝 文檔同步 (README Updates)
- 更新了 `README.md` 的 **Data Update Schedule**，修正為「每小時執行一次」。
- 更新了專案結構說明，反映工作流檔案合併後的狀態。
- 修正了手動觸發方式的引導，改為引導至 GitHub Actions 官方頁面手動執行。

---

## 📖 核心操作建議
### 1. 如何安全地手動觸發更新？
若不想等到整點更新，請直接執行以下步驟：
- 前往 GitHub 專案頁面 -> 點選 **Actions** 標籤。
- 點選左側的 **Hourly Stock Update & Deploy**。
- 點選右側的 **Run workflow** -> **Run workflow** (綠色按鈕)。

### 2. 本地推送的小技巧
推送變更前，請習慣性執行：
```powershell
git pull origin main --no-edit
git push
```
如果遇到卡住且本地沒什麼重要資料變動，可用 `git push -f` 強制推送蓋掉自動產生的 JSON 檔案。

---
**紀錄整理者：** Gemini CLI 助手
**日期：** 2026年3月25日
