/**
 * Main Application Module - KD Stock Monitor Dashboard
 * Dark Theme Edition
 */

// Global state
let currentFilter = 'all';

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('KD Stock Monitor - Initializing...');

    // Load data
    await DataManager.loadData();

    // Initialize UI
    updateStats();
    renderStockGrid();
    renderAlertHistory();
    updateLastUpdated();

    // Initialize ECharts
    StockChart.init('stock-chart');
    populateChartSelect();

    console.log('KD Stock Monitor - Ready');
});

/**
 * Update statistics cards
 */
function updateStats() {
    try {
        const summary = DataManager.getSummary() || { overbought_count: 0, oversold_count: 0 };
        const allStocks = DataManager.getAllStocks() || [];
        const alerts = DataManager.getAlerts() || [];
        const today = new Date().toISOString().split('T')[0];
        const todayAlerts = alerts.filter(a => a && a.date === today);

        const totalStocksEl = document.getElementById('total-stocks');
        if (totalStocksEl) totalStocksEl.textContent = allStocks.length;

        const overboughtEl = document.getElementById('overbought-count');
        if (overboughtEl) overboughtEl.textContent = summary.overbought_count || 0;

        const oversoldEl = document.getElementById('oversold-count');
        if (oversoldEl) oversoldEl.textContent = summary.oversold_count || 0;

        const todayAlertsEl = document.getElementById('today-alerts');
        if (todayAlertsEl) todayAlertsEl.textContent = todayAlerts.length;

        // Update Macro Stats
        if (summary.macro) {
            const macro = summary.macro;

            // 1. Fear & Greed (Actually VIX Index)
            const fngEl = document.getElementById('macro-fng');
            if (fngEl && macro.fear_greed && macro.fear_greed.value !== null) {
                const val = macro.fear_greed.value;
                let colorClass = 'text-gray-400';

                // VIX: Higher is more fearful (Red), Lower is more calm (Green)
                if (val >= 40) colorClass = 'text-red-500 font-extrabold';
                else if (val >= 30) colorClass = 'text-red-400';
                else if (val >= 25) colorClass = 'text-orange-400';
                else if (val >= 20) colorClass = 'text-yellow-400';
                else if (val < 15) colorClass = 'text-green-500';
                else colorClass = 'text-green-400';

                fngEl.className = `font-bold text-lg ${colorClass}`;
                fngEl.textContent = val.toFixed(2);
                fngEl.title = `VIX 恐慌指數: ${val.toFixed(2)}`;
            }

            // 2. US 10Y
            const us10yEl = document.getElementById('macro-us10y');
            if (us10yEl && macro.us10y) {
                const val = macro.us10y.value || 0;
                const change = macro.us10y.change || 0;
                const colorClass = change >= 0 ? 'text-kd-red' : 'text-kd-green';
                us10yEl.className = `font-bold text-lg ${colorClass}`;
                us10yEl.textContent = `${val.toFixed(2)}%`;
            }

            // 3. DXY
            const dxyEl = document.getElementById('macro-dxy');
            if (dxyEl && macro.dxy) {
                const val = macro.dxy.value || 0;
                const change = macro.dxy.change || 0;
                const colorClass = change >= 0 ? 'text-kd-red' : 'text-kd-green';
                dxyEl.className = `font-bold text-lg ${colorClass}`;
                dxyEl.textContent = val.toFixed(2);
            }

            // 4. Bitcoin
            const btcEl = document.getElementById('macro-btc');
            if (btcEl && macro.btc) {
                const val = macro.btc.value || 0;
                const change = macro.btc.change_pct || 0;
                const colorClass = change >= 0 ? 'text-kd-green' : 'text-kd-red';
                const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
                btcEl.className = `font-bold text-lg ${colorClass}`;
                btcEl.textContent = formattedPrice;
            }
        }
    } catch (e) {
        console.error("Error updating stats:", e);
    }
}

/**
 * Update last updated timestamp
 */
function updateLastUpdated() {
    const stockData = DataManager.stockData;
    if (stockData && stockData.last_updated) {
        const formatted = DataManager.formatDate(stockData.last_updated);
        document.getElementById('last-updated').innerHTML =
            `<i class="fas fa-sync-alt mr-1"></i> 更新時間: ${formatted}`;
    }
}

/**
 * Filter stocks by category
 */
function filterStocks(category) {
    currentFilter = category;

    // Update tab styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-accent', 'text-accent');
        btn.classList.add('border-transparent', 'text-dark-text2');
    });
    document.getElementById(`tab-${category}`).classList.add('active', 'border-accent', 'text-accent');
    document.getElementById(`tab-${category}`).classList.remove('border-transparent', 'text-dark-text2');

    renderStockGrid();
}

/**
 * Get filtered stocks based on current filter
 */
let currentScoreFilter = 'all';

function getFilteredStocks() {
    let stocks;
    switch (currentFilter) {
        case 'tw':
            stocks = DataManager.getStocksByMarket('TW');
            break;
        case 'us':
            stocks = DataManager.getStocksByMarket('US');
            break;
        case 'alerts':
            stocks = DataManager.getAlertStocks();
            break;
        default:
            stocks = DataManager.getAllStocks();
    }
    // Apply score filter
    if (currentScoreFilter !== 'all') {
        stocks = stocks.filter(s => {
            const score = (s.score || {}).total || 50;
            switch (currentScoreFilter) {
                case 'strong_buy': return score >= 90;
                case 'buy': return score >= 70 && score < 90;
                case 'hold': return score >= 50 && score < 70;
                case 'reduce': return score >= 30 && score < 50;
                case 'sell': return score < 30;
                default: return true;
            }
        });
    }
    return stocks;
}

/**
 * Render stock grid
 */
function renderStockGrid() {
    const grid = document.getElementById('stock-grid');
    const stocks = getFilteredStocks();

    if (stocks.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-dark-text2">
                <i class="fas fa-inbox text-4xl mb-2 opacity-50"></i>
                <p>沒有符合條件的股票</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = stocks.map(stock => createStockCard(stock)).join('');
}

/**
 * Create stock card HTML - Dark Theme
 */
function createStockCard(stock) {
    const status = DataManager.getKDStatus(stock.kd_k, stock.kd_d);
    const statusClass = status === 'overbought' ? 'overbought pulse-alert-overbought' :
                        status === 'oversold' ? 'oversold pulse-alert-oversold' : 'normal';
    const statusBadgeClass = status === 'overbought' ? 'overbought' :
                             status === 'oversold' ? 'oversold' : 'normal';
    const statusText = status === 'overbought' ? '超買' :
                       status === 'oversold' ? '超賣' : '正常';

    const textColorClass = status === 'overbought' ? 'text-kd-red' :
                          status === 'oversold' ? 'text-kd-green' : 'text-white';
    const priceColorClass = status === 'overbought' ? 'text-kd-red' :
                           status === 'oversold' ? 'text-kd-green' : 'text-white';
    const kdColorClass = status === 'overbought' ? 'text-kd-red' :
                        status === 'oversold' ? 'text-kd-green' : 'text-dark-text';

    const kdKClass = stock.kd_k >= 80 ? 'high' : stock.kd_k <= 20 ? 'low' : 'normal';
    const kdDClass = stock.kd_d >= 80 ? 'high' : stock.kd_d <= 20 ? 'low' : 'normal';

    const progressValue = stock.kd_k || 50;
    const progressClass = progressValue >= 80 ? 'high' : progressValue <= 20 ? 'low' : 'normal';

    const currency = stock.market === 'TW' ? 'TWD' : 'USD';
    const marketClass = stock.market === 'TW' ? 'tw' : 'us';

    // Score badge
    const score = stock.score || { total: 50, recommendation: '觀望' };
    const scoreTotal = score.total || 50;
    let scoreColorClass = 'bg-gray-600';
    let scoreTextClass = 'text-white';
    let scoreLabel = score.recommendation || '觀望';
    if (scoreTotal >= 90) { scoreColorClass = 'bg-emerald-600'; scoreTextClass = 'text-white'; }
    else if (scoreTotal >= 70) { scoreColorClass = 'bg-emerald-500/80'; scoreTextClass = 'text-white'; }
    else if (scoreTotal >= 50) { scoreColorClass = 'bg-yellow-500/80'; scoreTextClass = 'text-black'; }
    else if (scoreTotal >= 30) { scoreColorClass = 'bg-orange-500/80'; scoreTextClass = 'text-white'; }
    else { scoreColorClass = 'bg-red-500/80'; scoreTextClass = 'text-white'; }

    const changePct = stock.change_pct || 0;
    const changeClass = changePct >= 0 ? 'text-kd-red' : 'text-kd-green';
    const changeIcon = changePct >= 0 ? '▲' : '▼';
    const changeText = `${changeIcon} ${Math.abs(changePct).toFixed(2)}%`;

    // Extended Hours Data
    let extendedHoursHtml = '';
    const extra = stock.extra_data || {};
    if (stock.market === 'US') {
        if (extra.pre_market_price) {
            const preChange = ((extra.pre_market_price - stock.current_price) / stock.current_price * 100).toFixed(2);
            const preClass = preChange >= 0 ? 'text-kd-red' : 'text-kd-green';
            extendedHoursHtml += `<p class="text-[10px] ${preClass}">盤前: $${extra.pre_market_price.toFixed(2)} (${preChange}%)</p>`;
        }
        if (extra.post_market_price) {
            const postChange = ((extra.post_market_price - stock.current_price) / stock.current_price * 100).toFixed(2);
            const postClass = postChange >= 0 ? 'text-kd-red' : 'text-kd-green';
            extendedHoursHtml += `<p class="text-[10px] ${postClass}">盤後: $${extra.post_market_price.toFixed(2)} (${postChange}%)</p>`;
        }
    }

    return `
        <div class="stock-card ${statusClass}" onclick="selectStockForChart('${stock.symbol}')">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-bold text-lg ${textColorClass}">${stock.symbol}</h3>
                    <p class="text-sm ${status === 'overbought' ? 'text-kd-red' : status === 'oversold' ? 'text-kd-green' : 'text-dark-text2'}">${stock.name}</p>
                </div>
                <div class="text-right">
                    <span class="market-badge ${marketClass}">${stock.market}</span>
                    <span class="status-badge ${statusBadgeClass} ml-1">${statusText}</span>
                    <div class="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${scoreColorClass} ${scoreTextClass}" title="${scoreLabel}">
                        ${scoreTotal}分
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p class="text-xs text-dark-text2">現價</p>
                    <div class="flex items-baseline space-x-1">
                        <p class="font-bold ${priceColorClass}">${DataManager.formatPrice(stock.current_price, currency)}</p>
                        <span class="text-[10px] font-bold ${changeClass}">${changeText}</span>
                    </div>
                    ${extendedHoursHtml}
                </div>
                <div class="text-right">
                    <p class="text-xs text-dark-text2">更新時間</p>
                    <p class="text-xs text-dark-text2">${stock.last_updated ? DataManager.formatDate(stock.last_updated).split(' ')[0] : '-'}</p>
                </div>
            </div>

            ${createVolumeSparkline(stock.history, stock.market)}

            <div class="border-t border-dark-border pt-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-dark-text2">KD-K</span>
                    <span class="kd-value ${kdKClass} ${kdColorClass}">${stock.kd_k !== null ? stock.kd_k.toFixed(2) : '-'}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-dark-text2">KD-D</span>
                    <span class="kd-value ${kdDClass} ${kdColorClass}">${stock.kd_d !== null ? stock.kd_d.toFixed(2) : '-'}</span>
                </div>
                <div class="kd-progress-bar">
                    <div class="kd-progress-fill ${progressClass}" style="width: ${Math.min(Math.max(progressValue, 0), 100)}%"></div>
                </div>
            </div>

            ${createPatternSection(stock.patterns)}
            <div class="mt-3 pt-2 border-t border-dark-border flex justify-between items-center">
                <span class="text-[10px] text-dark-text2 opacity-60">點擊卡片查看K線</span>
                <button onclick="event.stopPropagation(); showScoreModal('${stock.symbol}')" class="text-xs px-2 py-1 rounded border border-accent/30 text-accent hover:bg-accent/10 transition">
                    <i class="fas fa-chart-pie mr-1"></i>評分明細
                </button>
            </div>
        </div>
    `;
}

/**
 * Force refresh data by triggering GitHub Action or reloading
 */
async function forceRefreshData() {
    console.log('Attempting to trigger real data update...');

    const choice = confirm("您想要執行哪種更新？\n\n【確定】：通知後台去抓取最新股價 (需 2-3 分鐘，需 Token)\n【取消】：僅重新讀取目前已存好的資料");

    if (!choice) {
        location.reload();
        return;
    }

    let token = localStorage.getItem('github_token');
    if (!token) {
        token = prompt("請輸入您的 GitHub Personal Access Token (PAT) 以觸發後台更新：\n(此 Token 僅存在您的瀏覽器中，不會公開)");
        if (!token) return;
        localStorage.setItem('github_token', token);
    }

    const updateButton = document.querySelector('button[onclick="forceRefreshData()"]');
    if (updateButton) {
        updateButton.innerHTML = '<i class="fas fa-rocket fa-spin mr-1"></i> 指令發送中...';
        updateButton.disabled = true;
    }

    try {
        const owner = 'jack-lee2022';
        const repo = 'kd-stock-monitor';
        const workflow_id = 'update-data.yml';

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow_id}/dispatches`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify({
                ref: 'main'
            })
        });

        if (response.ok || response.status === 204) {
            alert('🚀 成功觸發後台更新！\n\n請注意：資料抓取與網頁部署約需 2-3 分鐘。\n建議您 3 分鐘後再回來看最新資料。');
        } else {
            const errData = await response.json();
            throw new Error(errData.message || 'API 呼叫失敗');
        }

    } catch (error) {
        console.error('Trigger Error:', error);
        if (error.message.includes('Unauthorized') || error.message.includes('Bad credentials')) {
            alert('Token 錯誤或已過期，請重新輸入。');
            localStorage.removeItem('github_token');
        } else {
            alert('觸發失敗：' + error.message);
        }
    } finally {
        if (updateButton) {
            updateButton.innerHTML = '<i class="fas fa-redo mr-1"></i> 更新資料';
            updateButton.disabled = false;
        }
    }
}

/**
 * Create volume sparkline chart
 */
function createVolumeSparkline(history, market) {
    if (!history || history.length < 5) {
        return '';
    }

    const recentData = history.slice(-10);
    const volumes = recentData.map(d => d.volume || 0);

    if (volumes.length === 0 || volumes.every(v => v === 0)) {
        return '';
    }

    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    const range = maxVolume - minVolume || 1;

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const latestVolume = volumes[volumes.length - 1];

    let trendColor = 'text-gray-500';
    let trendIcon = '→';
    if (latestVolume > avgVolume * 1.3) {
        trendColor = 'text-kd-red';
        trendIcon = '↑';
    } else if (latestVolume < avgVolume * 0.7) {
        trendColor = 'text-kd-green';
        trendIcon = '↓';
    }

    const width = 100;
    const height = 30;
    const barWidth = width / volumes.length - 1;

    let barsHtml = '';
    volumes.forEach((vol, i) => {
        const height_pct = ((vol - minVolume) / range) * 80 + 20;
        const x = i * (barWidth + 1);
        const y = height - (height_pct / 100 * height);

        let barColor = '#555555';
        const volRatio = vol / avgVolume;
        if (volRatio > 1.5) barColor = '#ff3333';
        else if (volRatio > 1.2) barColor = '#ffaa00';
        else if (volRatio < 0.6) barColor = '#00cc66';

        barsHtml += `<rect x="${x}" y="${y}" width="${barWidth}" height="${height_pct / 100 * height}" fill="${barColor}" rx="1" />`;
    });

    const formatVolume = (vol) => {
        if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
        return vol.toString();
    };

    return `
        <div class="mb-3">
            <div class="flex justify-between items-center mb-1">
                <span class="text-xs text-dark-text2">成交量趨勢</span>
                <span class="text-xs ${trendColor} font-medium">${trendIcon} ${formatVolume(latestVolume)}</span>
            </div>
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" class="volume-sparkline">
                ${barsHtml}
            </svg>
            <div class="flex justify-between text-xs text-dark-text2 mt-1 opacity-50">
                <span>10日前</span>
                <span>今日</span>
            </div>
        </div>
    `;
}

/**
 * Create pattern analysis section HTML
 */
function createPatternSection(patterns) {
    if (!patterns || !patterns.patterns || patterns.patterns.length === 0) {
        return '';
    }

    const signalEmojis = {
        'BUY': '🟢',
        'SELL': '🔴',
        'HOLD': '🟡',
        'AVOID': '⚫'
    };

    const signalLabels = {
        'BUY': '買入',
        'SELL': '賣出',
        'HOLD': '持有',
        'AVOID': '避開'
    };

    const dominantSignal = patterns.dominant_signal || 'HOLD';
    const topPatterns = patterns.patterns.slice(0, 2);

    let patternsHtml = topPatterns.map(p => {
        const emoji = signalEmojis[p.signal] || '⚪';
        return `
            <div class="flex items-center justify-between text-xs mb-1">
                <span class="text-dark-text2">${emoji} ${p.pattern_id}-${p.pattern_name}</span>
                <span class="font-medium text-dark-text">${p.confidence}%</span>
            </div>
        `;
    }).join('');

    return `
        <div class="border-t border-dark-border mt-2 pt-2">
            <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-dark-text2">交易信號</span>
                <span class="text-xs font-bold ${getSignalColorClass(dominantSignal)}">
                    ${signalEmojis[dominantSignal]} ${signalLabels[dominantSignal]}
                </span>
            </div>
            ${patternsHtml}
        </div>
    `;
}

/**
 * Get CSS color class for signal
 */
function getSignalColorClass(signal) {
    const classes = {
        'BUY': 'text-kd-green',
        'SELL': 'text-kd-red',
        'HOLD': 'text-kd-yellow',
        'AVOID': 'text-dark-text2'
    };
    return classes[signal] || 'text-dark-text2';
}

/**
 * Render alert history
 */
function renderAlertHistory() {
    const container = document.getElementById('alert-history');
    const alerts = DataManager.getAlerts();

    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-dark-text2">
                <i class="fas fa-check-circle text-kd-green text-2xl mb-2"></i>
                <p>暫無警示記錄</p>
            </div>
        `;
        return;
    }

    container.innerHTML = alerts.map(alert => createAlertItem(alert)).join('');
}

/**
 * Create alert item HTML
 */
function createAlertItem(alert) {
    const typeClass = alert.type === 'overbought' ? 'overbought' : 'oversold';
    const icon = alert.type === 'overbought' ? 'fa-arrow-up text-kd-red' : 'fa-arrow-down text-kd-green';
    const title = alert.type === 'overbought' ? '超買警告' : '超賣提醒';

    return `
        <div class="alert-item ${typeClass} ${alert.acknowledged ? 'acknowledged' : ''}">
            <div class="flex-shrink-0 mr-3">
                <i class="fas ${icon} text-xl"></i>
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-semibold text-white">${alert.symbol}</span>
                        <span class="text-sm text-dark-text2 ml-1">${alert.name}</span>
                        <span class="ml-2 px-2 py-0.5 rounded text-xs ${alert.type === 'overbought' ? 'bg-red-900/30 text-kd-red' : 'bg-green-900/30 text-kd-green'}">
                            ${title}
                        </span>
                    </div>
                    <span class="text-xs text-dark-text2">${DataManager.formatDate(alert.timestamp)}</span>
                </div>
                <div class="mt-1 text-sm text-dark-text2">
                    KD-K: <span class="font-semibold text-white">${alert.kd_k}</span> |
                    KD-D: <span class="font-semibold text-white">${alert.kd_d}</span> |
                    價格: <span class="font-semibold text-white">${DataManager.formatPrice(alert.current_price, alert.market === 'TW' ? 'TWD' : 'USD')}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Populate chart stock selector
 */
function populateChartSelect() {
    const select = document.getElementById('chart-stock-select');
    const stocks = DataManager.getAllStocks();

    select.innerHTML = '<option value="">-- 選擇股票 --</option>' +
        stocks.map(stock => `<option value="${stock.symbol}">${stock.symbol} - ${stock.name}</option>`).join('');

    select.addEventListener('change', (e) => {
        if (e.target.value) {
            updateChart(e.target.value);
        }
    });
}

/**
 * Select stock for chart (when clicking on a card)
 */
async function selectStockForChart(symbol) {
    const select = document.getElementById('chart-stock-select');
    select.value = symbol;
    await updateChart(symbol);

    // Scroll to chart
    document.getElementById('chart-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Update chart with stock data - ECharts
 */
async function updateChart(symbol) {
    const stock = DataManager.getStock(symbol);
    if (!stock) return;

    // Try to load real history from CSV first
    let history = await DataManager.loadStockHistory(symbol);

    if (!history || history.length === 0) {
        // Fallback to sample data if no real history available
        history = generateSampleHistory(stock);
    }

    StockChart.update(symbol, stock.name, history);
}

/**
 * Generate sample history for demo when no real data
 */
function generateSampleHistory(stock) {
    const days = 60;
    const history = [];
    const basePrice = stock?.current_price || 100;

    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const randomChange = (Math.random() - 0.5) * basePrice * 0.03;
        const price = basePrice + randomChange + (Math.sin(i / 5) * basePrice * 0.05);
        const open = price * (1 + (Math.random() - 0.5) * 0.01);
        const high = Math.max(open, price) * (1 + Math.random() * 0.01);
        const low = Math.min(open, price) * (1 - Math.random() * 0.01);

        const k = 50 + Math.sin(i / 3) * 40 + (Math.random() - 0.5) * 10;
        const d = k + (Math.random() - 0.5) * 5;

        history.push({
            date: date.toISOString(),
            open: open,
            high: high,
            low: low,
            close: price,
            volume: Math.floor(Math.random() * 10000000) + 1000000,
            kd_k: Math.max(0, Math.min(100, k)),
            kd_d: Math.max(0, Math.min(100, d))
        });
    }

    return history;
}

/**
 * Refresh data (can be called periodically)
 */
async function refreshData() {
    console.log('Refreshing data...');
    await DataManager.loadData();
    updateStats();
    renderStockGrid();
    renderAlertHistory();
    updateLastUpdated();

    // Refresh chart if a stock is selected
    const select = document.getElementById('chart-stock-select');
    if (select.value) {
        await updateChart(select.value);
    }
}

// Auto-refresh every 5 minutes (if page is active)
setInterval(() => {
    if (!document.hidden) {
        refreshData();
    }
}, 5 * 60 * 1000);

// ── Score Filter ──────────────────────────────────────────
function filterByScore(scoreFilter) {
    currentScoreFilter = scoreFilter;
    document.querySelectorAll('.score-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-accent/20', 'text-accent', 'border-accent/30');
        btn.classList.add('bg-dark-bg', 'text-dark-text2', 'border-dark-border');
    });
    const activeBtn = document.getElementById('score-' + scoreFilter);
    if (activeBtn) {
        activeBtn.classList.remove('bg-dark-bg', 'text-dark-text2', 'border-dark-border');
        activeBtn.classList.add('active', 'bg-accent/20', 'text-accent', 'border-accent/30');
    }
    renderStockGrid();
}

// ── Score Modal ──────────────────────────────────────────
function showScoreModal(symbol) {
    const stock = DataManager.getStock(symbol);
    if (!stock || !stock.score) return;
    const score = stock.score;
    const details = score.details || {};
    const raw = score.raw || {};

    document.getElementById('modal-title').textContent = stock.symbol;
    document.getElementById('modal-subtitle').textContent = stock.name + ' - ' + DataManager.formatPrice(stock.current_price, stock.market === 'TW' ? 'TWD' : 'USD');

    const recEl = document.getElementById('modal-recommendation');
    recEl.textContent = score.recommendation + ' (' + score.total + '分)';
    let recColor = 'text-yellow-400';
    if (score.total >= 70) recColor = 'text-emerald-400';
    else if (score.total < 30) recColor = 'text-red-400';
    else if (score.total < 50) recColor = 'text-orange-400';
    recEl.className = 'text-lg font-bold mt-2 ' + recColor;

    renderScoreBars(details);
    renderScoreGauge(score.total);
    renderScoreRadar(details);
    renderRawMetrics(raw);

    document.getElementById('score-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeScoreModal() {
    document.getElementById('score-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function renderScoreBars(details) {
    const dims = [
        { key: 'kd', label: 'KD 動能', weight: 20 },
        { key: 'rsi', label: 'RSI 強弱', weight: 15 },
        { key: 'ma_bias', label: '均線乖離', weight: 15 },
        { key: 'macd', label: 'MACD 趨勢', weight: 15 },
        { key: 'volume_price', label: '量價結構', weight: 15 },
        { key: 'trend', label: '趨勢動能', weight: 20 },
    ];
    let html = '';
    dims.forEach(d => {
        const s = (details[d.key] || {}).score || 50;
        let barColor = '#eab308';
        if (s >= 70) barColor = '#10b981';
        else if (s < 30) barColor = '#ef4444';
        else if (s < 50) barColor = '#f97316';
        html += `
            <div class="flex items-center gap-2">
                <span class="text-xs text-dark-text2 w-20 text-right">${d.label}</span>
                <div class="flex-1 h-2 bg-dark-bg rounded-full overflow-hidden border border-dark-border">
                    <div class="h-full rounded-full transition-all duration-500" style="width:${s}%; background:${barColor}"></div>
                </div>
                <span class="text-xs font-mono w-8 text-right" style="color:${barColor}">${s}</span>
            </div>
        `;
    });
    document.getElementById('score-bars').innerHTML = html;
}

function renderScoreGauge(total) {
    const el = document.getElementById('gauge-chart');
    let chart = echarts.getInstanceByDom(el);
    if (chart) chart.dispose();
    chart = echarts.init(el, 'dark', { renderer: 'canvas' });

    let color = '#eab308';
    if (total >= 70) color = '#10b981';
    else if (total < 30) color = '#ef4444';
    else if (total < 50) color = '#f97316';

    const option = {
        backgroundColor: 'transparent',
        series: [{
            type: 'gauge',
            startAngle: 200,
            endAngle: -20,
            min: 0,
            max: 100,
            splitNumber: 10,
            radius: '90%',
            itemStyle: { color: color },
            progress: { show: true, width: 18 },
            pointer: { show: false },
            axisLine: { lineStyle: { width: 18, color: [[1, '#1e293b']] } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            anchor: { show: false },
            title: { show: false },
            detail: {
                valueAnimation: true,
                fontSize: 36,
                fontWeight: 'bold',
                color: color,
                offsetCenter: [0, '10%'],
                formatter: '{value}'
            },
            data: [{ value: total }]
        }]
    };
    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
}

function renderScoreRadar(details) {
    const el = document.getElementById('radar-chart');
    let chart = echarts.getInstanceByDom(el);
    if (chart) chart.dispose();
    chart = echarts.init(el, 'dark', { renderer: 'canvas' });

    const dims = [
        { name: 'KD動能', key: 'kd' },
        { name: 'RSI', key: 'rsi' },
        { name: '均線乖離', key: 'ma_bias' },
        { name: 'MACD', key: 'macd' },
        { name: '量價', key: 'volume_price' },
        { name: '趨勢', key: 'trend' },
    ];
    const values = dims.map(d => (details[d.key] || {}).score || 50);

    const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item' },
        radar: {
            indicator: dims.map(d => ({ name: d.name, max: 100 })),
            shape: 'polygon',
            splitNumber: 4,
            axisName: { color: '#94a3b8', fontSize: 11 },
            splitLine: { lineStyle: { color: '#334155' } },
            splitArea: { show: true, areaStyle: { color: ['#0f172a', '#1e293b'] } },
            axisLine: { lineStyle: { color: '#334155' } }
        },
        series: [{
            type: 'radar',
            data: [{
                value: values,
                name: '綜合評分',
                areaStyle: { color: 'rgba(99, 102, 241, 0.3)' },
                lineStyle: { color: '#6366f1', width: 2 },
                itemStyle: { color: '#6366f1' },
                symbol: 'circle',
                symbolSize: 6
            }]
        }]
    };
    chart.setOption(option);
    window.addEventListener('resize', () => chart.resize());
}

function renderRawMetrics(raw) {
    const metrics = [
        { key: 'rsi', label: 'RSI', fmt: v => v !== null && v !== undefined ? v.toFixed(1) : '-' },
        { key: 'ma20', label: 'MA20', fmt: v => v !== null && v !== undefined ? v.toFixed(2) : '-' },
        { key: 'ma60', label: 'MA60', fmt: v => v !== null && v !== undefined ? v.toFixed(2) : '-' },
        { key: 'macd_hist', label: 'MACD', fmt: v => v !== null && v !== undefined ? v.toFixed(3) : '-' },
        { key: 'volume_ratio', label: '量比', fmt: v => v !== null && v !== undefined ? v.toFixed(2) + 'x' : '-' },
        { key: 'slope_20d', label: '20日斜率', fmt: v => v !== null && v !== undefined ? v.toFixed(2) + '%' : '-' },
    ];
    let html = '';
    metrics.forEach(m => {
        const val = raw[m.key];
        html += `
            <div class="dark-card rounded p-2 border border-dark-border text-center">
                <p class="text-[10px] text-dark-text2">${m.label}</p>
                <p class="text-sm font-mono font-bold text-white">${m.fmt(val)}</p>
            </div>
        `;
    });
    document.getElementById('raw-metrics').innerHTML = html;
}
