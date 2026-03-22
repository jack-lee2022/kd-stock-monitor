/**
 * Main Application Module - KD Stock Monitor Dashboard
 */

// Global state
let currentFilter = 'all';
let chartInstance = null;

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
    initializeChart();
    populateChartSelect();
    
    // Update last updated time
    updateLastUpdated();
    
    console.log('KD Stock Monitor - Ready');
});

/**
 * Update statistics cards
 */
function updateStats() {
    const summary = DataManager.getSummary();
    const allStocks = DataManager.getAllStocks();
    const today = new Date().toISOString().split('T')[0];
    const todayAlerts = DataManager.getAlerts().filter(a => a.date === today);
    
    document.getElementById('total-stocks').textContent = allStocks.length;
    document.getElementById('overbought-count').textContent = summary.overbought_count || 0;
    document.getElementById('oversold-count').textContent = summary.oversold_count || 0;
    document.getElementById('today-alerts').textContent = todayAlerts.length;
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
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    document.getElementById(`tab-${category}`).classList.add('active', 'border-blue-500', 'text-blue-600');
    document.getElementById(`tab-${category}`).classList.remove('border-transparent', 'text-gray-500');
    
    renderStockGrid();
}

/**
 * Get filtered stocks based on current filter
 */
function getFilteredStocks() {
    switch (currentFilter) {
        case 'tw':
            return DataManager.getStocksByMarket('TW');
        case 'us':
            return DataManager.getStocksByMarket('US');
        case 'alerts':
            return DataManager.getAlertStocks();
        default:
            return DataManager.getAllStocks();
    }
}

/**
 * Render stock grid
 */
function renderStockGrid() {
    const grid = document.getElementById('stock-grid');
    const stocks = getFilteredStocks();
    
    if (stocks.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p>沒有符合條件的股票</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = stocks.map(stock => createStockCard(stock)).join('');
}

/**
 * Create stock card HTML
 */
function createStockCard(stock) {
    const status = DataManager.getKDStatus(stock.kd_k, stock.kd_d);
    const statusClass = status === 'overbought' ? 'overbought pulse-alert-overbought' : 
                        status === 'oversold' ? 'oversold pulse-alert-oversold' : 'normal';
    const statusBadgeClass = status === 'overbought' ? 'overbought' : 
                             status === 'oversold' ? 'oversold' : 'normal';
    const statusText = status === 'overbought' ? '超買' : 
                       status === 'oversold' ? '超賣' : '正常';
    
    // Text color classes for alerts
    const textColorClass = status === 'overbought' ? 'text-red-600' : 
                          status === 'oversold' ? 'text-green-600' : 'text-gray-800';
    const priceColorClass = status === 'overbought' ? 'text-red-700' : 
                           status === 'oversold' ? 'text-green-700' : 'text-gray-800';
    const kdColorClass = status === 'overbought' ? 'text-red-600' : 
                        status === 'oversold' ? 'text-green-600' : '';
    
    const kdKClass = stock.kd_k >= 80 ? 'high' : stock.kd_k <= 20 ? 'low' : 'normal';
    const kdDClass = stock.kd_d >= 80 ? 'high' : stock.kd_d <= 20 ? 'low' : 'normal';
    
    const progressValue = stock.kd_k || 50;
    const progressClass = progressValue >= 80 ? 'high' : progressValue <= 20 ? 'low' : 'normal';
    
    const currency = stock.market === 'TW' ? 'TWD' : 'USD';
    const marketClass = stock.market === 'TW' ? 'tw' : 'us';
    
    return `
        <div class="stock-card ${statusClass} p-4" onclick="selectStockForChart('${stock.symbol}')">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h3 class="font-bold text-lg ${textColorClass}">${stock.symbol}</h3>
                    <p class="text-sm ${status === 'overbought' ? 'text-red-500' : status === 'oversold' ? 'text-green-500' : 'text-gray-600'}">${stock.name}</p>
                </div>
                <div class="text-right">
                    <span class="market-badge ${marketClass}">${stock.market}</span>
                    <span class="status-badge ${statusBadgeClass} ml-1">${statusText}</span>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p class="text-xs text-gray-500">現價</p>
                    <p class="font-bold ${priceColorClass}">${DataManager.formatPrice(stock.current_price, currency)}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">更新時間</p>
                    <p class="text-xs text-gray-600">${stock.last_updated ? DataManager.formatDate(stock.last_updated).split(' ')[0] : '-'}</p>
                </div>
            </div>
            
            <div class="border-t pt-3">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-600">KD-K</span>
                    <span class="kd-value ${kdKClass} ${kdColorClass}">${stock.kd_k !== null ? stock.kd_k.toFixed(2) : '-'}</span>
                </div>
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-600">KD-D</span>
                    <span class="kd-value ${kdDClass} ${kdColorClass}">${stock.kd_d !== null ? stock.kd_d.toFixed(2) : '-'}</span>
                </div>
                <div class="kd-progress-bar">
                    <div class="kd-progress-fill ${progressClass}" style="width: ${Math.min(Math.max(progressValue, 0), 100)}%"></div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render alert history
 */
function renderAlertHistory() {
    const container = document.getElementById('alert-history');
    const alerts = DataManager.getAlerts(); // Show all alerts
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <i class="fas fa-check-circle text-green-500 text-2xl mb-2"></i>
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
    const icon = alert.type === 'overbought' ? 'fa-arrow-up text-red-500' : 'fa-arrow-down text-green-500';
    const title = alert.type === 'overbought' ? '超買警告' : '超賣提醒';
    
    return `
        <div class="alert-item ${typeClass} ${alert.acknowledged ? 'acknowledged' : ''}">
            <div class="flex-shrink-0 mr-3">
                <i class="fas ${icon} text-xl"></i>
            </div>
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-semibold text-gray-800">${alert.symbol}</span>
                        <span class="text-sm text-gray-600 ml-1">${alert.name}</span>
                        <span class="ml-2 px-2 py-0.5 rounded text-xs ${alert.type === 'overbought' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
                            ${title}
                        </span>
                    </div>
                    <span class="text-xs text-gray-500">${DataManager.formatDate(alert.timestamp)}</span>
                </div>
                <div class="mt-1 text-sm text-gray-600">
                    KD-K: <span class="font-semibold">${alert.kd_k}</span> | 
                    KD-D: <span class="font-semibold">${alert.kd_d}</span> | 
                    價格: <span class="font-semibold">${DataManager.formatPrice(alert.current_price, alert.market === 'TW' ? 'TWD' : 'USD')}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Initialize Chart.js
 */
function initializeChart() {
    const ctx = document.getElementById('stock-chart').getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '收盤價',
                    data: [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'KD-K',
                    data: [],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                },
                {
                    label: 'KD-D',
                    data: [],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                title: {
                    display: true,
                    text: '請選擇股票查看圖表'
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '日期'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '價格'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'KD值'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            },
            annotation: {
                annotations: {
                    line1: {
                        type: 'line',
                        yMin: 80,
                        yMax: 80,
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        label: {
                            content: '超買線 (80)',
                            enabled: true
                        }
                    },
                    line2: {
                        type: 'line',
                        yMin: 20,
                        yMax: 20,
                        borderColor: 'rgb(34, 197, 94)',
                        borderWidth: 2,
                        borderDash: [6, 6],
                        label: {
                            content: '超賣線 (20)',
                            enabled: true
                        }
                    }
                }
            }
        }
    });
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
function selectStockForChart(symbol) {
    const select = document.getElementById('chart-stock-select');
    select.value = symbol;
    updateChart(symbol);
    
    // Scroll to chart
    document.getElementById('stock-chart').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Update chart with stock data
 */
function updateChart(symbol) {
    const stock = DataManager.getStock(symbol);
    if (!stock || !stock.history || stock.history.length === 0) {
        // Generate sample data if no history available
        generateSampleChartData(symbol);
        return;
    }
    
    const history = stock.history;
    const labels = history.map(h => {
        const date = new Date(h.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const prices = history.map(h => h.close);
    const kdK = history.map(h => h.kd_k);
    const kdD = history.map(h => h.kd_d);
    
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = prices;
    chartInstance.data.datasets[1].data = kdK;
    chartInstance.data.datasets[2].data = kdD;
    chartInstance.options.plugins.title.text = `${symbol} - ${stock.name}`;
    chartInstance.update();
}

/**
 * Generate sample chart data for demo
 */
function generateSampleChartData(symbol) {
    const days = 30;
    const labels = [];
    const prices = [];
    const kdK = [];
    const kdD = [];
    
    const stock = DataManager.getStock(symbol);
    const basePrice = stock?.current_price || 100;
    
    for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
        
        // Generate random walk for price
        const randomChange = (Math.random() - 0.5) * basePrice * 0.03;
        const price = basePrice + randomChange + (Math.sin(i / 5) * basePrice * 0.05);
        prices.push(price);
        
        // Generate oscillating KD values
        const k = 50 + Math.sin(i / 3) * 40 + (Math.random() - 0.5) * 10;
        const d = k + (Math.random() - 0.5) * 5;
        kdK.push(Math.max(0, Math.min(100, k)));
        kdD.push(Math.max(0, Math.min(100, d)));
    }
    
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = prices;
    chartInstance.data.datasets[1].data = kdK;
    chartInstance.data.datasets[2].data = kdD;
    chartInstance.options.plugins.title.text = `${symbol} - ${stock?.name || 'Stock'}`;
    chartInstance.update();
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
}

// Auto-refresh every 5 minutes (if page is active)
setInterval(() => {
    if (!document.hidden) {
        refreshData();
    }
}, 5 * 60 * 1000);