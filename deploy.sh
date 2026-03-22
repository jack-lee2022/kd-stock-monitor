#!/bin/bash
# deploy-to-github.sh - 一鍵部署腳本

echo "🚀 KD Stock Monitor - GitHub 部署助手"
echo "========================================"

# 檢查 git
if ! command -v git &> /dev/null; then
    echo "❌ 請先安裝 Git: https://git-scm.com/download/win"
    exit 1
fi

# 提示使用者輸入
echo ""
read -p "請輸入你的 GitHub 使用者名稱 (例如: danielyu): " USERNAME
read -p "請輸入 Repository 名稱 (建議: kd-stock-monitor): " REPO_NAME

echo ""
echo "📋 部署步驟:"
echo "1. 在 GitHub 建立 repository: https://github.com/new"
echo "   - Repository name: $REPO_NAME"
echo "   - 選擇 Public"
echo "   - 不要勾選 README"
echo ""
read -p "建立完成後按 Enter 繼續..."

echo ""
echo "2. 初始化 Git 並推送..."
git init
git add .
git commit -m "Initial commit: KD Stock Monitor"
git branch -M main
git remote add origin "https://github.com/$USERNAME/$REPO_NAME.git"
git push -u origin main

echo ""
echo "✅ 程式碼已推送!"
echo ""
echo "3. 啟用 GitHub Pages:"
echo "   - 前往: https://github.com/$USERNAME/$REPO_NAME/settings/pages"
echo "   - Source 選擇: GitHub Actions"
echo ""
echo "4. 等待 2-3 分鐘後，你的網站將在:"
echo "   🌐 https://$USERNAME.github.io/$REPO_NAME"
echo ""
echo "5. 設定自動更新:"
echo "   - 前往: https://github.com/$USERNAME/$REPO_NAME/actions"
echo "   - 點擊 'update-data' workflow"
echo "   - 點擊 'Enable workflow'"
echo ""
