# 🚀 GitHub Pages 部署教學

## 快速部署（3 步驟）

### 步驟 1: 準備檔案

在你的 Windows 電腦建立資料夾 `kd-stock-monitor`，然後放入以下檔案：

```
kd-stock-monitor/
├── .github/
│   └── workflows/
│       ├── deploy-pages.yml
│       └── update-data.yml
├── src/
│   ├── main.py
│   ├── fetcher.py
│   ├── kd_calculator.py
│   └── alert_checker.py
├── docs/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── data.js
│       └── app.js
├── config.json
├── requirements.txt
├── README.md
└── .gitignore
```

### 步驟 2: 建立 GitHub Repository

1. 登入 GitHub: https://github.com
2. 點擊右上角 `+` → `New repository`
3. 填寫資訊：
   - **Repository name**: `kd-stock-monitor`
   - **Description**: `股票 KD 指標監控系統`
   - **Public** (選公開才能免費使用 GitHub Pages)
   - ❌ 不要勾選 "Add a README file"
   - ❌ 不要勾選 "Add .gitignore"
4. 點擊 `Create repository`

### 步驟 3: 上傳程式碼

在 Windows 開啟命令提示字元 (CMD) 或 PowerShell：

```bash
# 進入專案資料夾
cd kd-stock-monitor

# 初始化 Git
git init

# 加入所有檔案
git add .

# 提交
git commit -m "Initial commit: KD Stock Monitor"

# 連接到 GitHub (將 YOUR_USERNAME 換成你的 GitHub 帳號)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kd-stock-monitor.git

# 推送程式碼
git push -u origin main
```

### 步驟 4: 啟用 GitHub Pages

1. 前往 Repository → `Settings` → `Pages` (左側選單)
2. **Source** 區塊：
   - 選擇 `GitHub Actions`
3. 點擊 `Save`

### 步驟 5: 啟用 GitHub Actions

1. 前往 Repository → `Actions` 分頁
2. 你會看到提示 "Workflows aren't being run on this forked repository"
3. 點擊綠色按鈕 `I understand my workflows, go ahead and enable them`
4. 點擊左側 `update-data` workflow
5. 點擊 `Run workflow` → `Run workflow` 手動執行一次

### 步驟 6: 等待部署完成

1. 前往 Repository → `Actions` 分頁
2. 等待 `pages build and deployment` 變成綠色 ✅
3. 大約 2-3 分鐘後，你的網站就上線了！

---

## 🌐 訪問你的網站

網址格式：
```
https://YOUR_USERNAME.github.io/kd-stock-monitor
```

例如：
```
https://danielyu.github.io/kd-stock-monitor
```

---

## ⚙️ 自動更新設定

GitHub Actions 已經設定每天自動執行：

- **台股更新**: 每天 16:00 UTC (台灣時間 00:00)
- **美股更新**: 每天 21:00 UTC (台灣時間 05:00)

如需調整，編輯 `.github/workflows/update-data.yml`：

```yaml
on:
  schedule:
    - cron: '0 16 * * 1-5'  # 週一到週五 16:00 UTC
```

---

## 📝 自定義股票清單

編輯 `config.json`：

```json
{
  "stocks": {
    "TW": [
      {"symbol": "0050.TW", "name": "元大台灣50"},
      {"symbol": "0056.TW", "name": "元大高股息"},
      {"symbol": "2330.TW", "name": "台積電"}
    ],
    "US": [
      {"symbol": "AAPL", "name": "Apple"},
      {"symbol": "TSLA", "name": "Tesla"}
    ]
  }
}
```

修改後推送更新：
```bash
git add config.json
git commit -m "Update stock list"
git push
```

---

## 🔧 疑難排解

### 問題 1: Git push 失敗
**錯誤**: `Permission denied`
**解決**: 
1. 確認 GitHub 帳號密碼正確
2. 或使用 Personal Access Token 代替密碼

### 問題 2: GitHub Pages 404
**原因**: 還沒部署完成
**解決**: 
1. 前往 Actions 分頁確認部署狀態
2. 等待綠色勾勾出現
3. 清除瀏覽器快取再試

### 問題 3: 網站顯示舊資料
**原因**: GitHub Pages 有快取
**解決**: 
1. 等待 5-10 分鐘
2. 或手動觸發更新：Actions → update-data → Run workflow

---

## 📱 手機查看

部署完成後，你可以：
- 在手機瀏覽器開啟網址
- 加入主畫面（像 App 一樣使用）
- iOS Safari: 分享 → 加入主畫面
- Android Chrome: 選單 → 新增至主畫面

---

## ✅ 部署檢查清單

- [ ] GitHub 帳號已註冊
- [ ] Repository 已建立 (Public)
- [ ] 程式碼已推送
- [ ] GitHub Pages 已啟用 (GitHub Actions)
- [ ] GitHub Actions 已啟用
- [ ] 第一次 workflow 已執行
- [ ] 網站可以正常訪問
- [ ] 手機可以正常顯示

---

## 🎉 完成！

你的 KD Stock Monitor 現在：
- ✅ 可以從任何裝置訪問
- ✅ 每天自動更新股票資料
- ✅ 自動計算 KD 指標
- ✅ KD≥80 或 ≤20 時顯示警示

**網站範例**: https://username.github.io/kd-stock-monitor
