/**
 * Stock Chart Module - ECharts K-line + KD Sub-chart
 * Dark theme, professional trading UI
 */

const StockChart = {
    chartInstance: null,
    currentHistory: [],
    currentSymbol: '',
    currentName: '',
    currentTimeframe: 'day',
    isFullscreen: false,

    /**
     * Initialize ECharts instance
     */
    init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Chart container not found:', containerId);
            return;
        }

        // Dispose existing chart if any
        if (this.chartInstance) {
            this.chartInstance.dispose();
        }

        this.chartInstance = echarts.init(container, null, {
            renderer: 'canvas'
        });

        // Responsive resize
        window.addEventListener('resize', () => {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        });

        console.log('StockChart initialized');
    },

    /**
     * Update chart with new stock data
     */
    update(symbol, name, history) {
        this.currentSymbol = symbol;
        this.currentName = name || symbol;
        this.currentHistory = history || [];
        this.currentTimeframe = 'day';

        // Update timeframe buttons
        this._updateTimeframeButtons();

        this._render();
    },

    /**
     * Switch timeframe (day/week/month)
     */
    switchTimeframe(timeframe) {
        if (this.currentTimeframe === timeframe) return;
        this.currentTimeframe = timeframe;
        this._updateTimeframeButtons();
        this._render();
    },

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen() {
        const chartSection = document.getElementById('chart-section');
        if (!chartSection) return;

        this.isFullscreen = !this.isFullscreen;

        if (this.isFullscreen) {
            chartSection.classList.add('chart-fullscreen');
            document.body.style.overflow = 'hidden';
        } else {
            chartSection.classList.remove('chart-fullscreen');
            document.body.style.overflow = '';
        }

        setTimeout(() => {
            if (this.chartInstance) {
                this.chartInstance.resize();
            }
        }, 100);
    },

    /**
     * Update timeframe button styles
     */
    _updateTimeframeButtons() {
        document.querySelectorAll('.tf-btn').forEach(btn => {
            const tf = btn.dataset.tf;
            if (tf === this.currentTimeframe) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /**
     * Calculate Moving Average
     */
    _calculateMA(dayCount, data) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            if (i < dayCount - 1) {
                result.push('-');
                continue;
            }
            let sum = 0;
            for (let j = 0; j < dayCount; j++) {
                sum += data[i - j].close;
            }
            result.push((sum / dayCount).toFixed(2));
        }
        return result;
    },

    /**
     * Aggregate daily data to weekly
     */
    _aggregateToWeek(data) {
        if (!data || data.length === 0) return [];

        const weeks = [];
        let currentWeek = null;

        data.forEach(day => {
            const date = new Date(day.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];

            if (!currentWeek || currentWeek.weekKey !== weekKey) {
                if (currentWeek) weeks.push(currentWeek);
                currentWeek = {
                    weekKey: weekKey,
                    date: weekKey,
                    open: day.open,
                    high: day.high,
                    low: day.low,
                    close: day.close,
                    volume: day.volume || 0,
                    kd_k: day.kd_k,
                    kd_d: day.kd_d
                };
            } else {
                currentWeek.high = Math.max(currentWeek.high, day.high);
                currentWeek.low = Math.min(currentWeek.low, day.low);
                currentWeek.close = day.close;
                currentWeek.volume += (day.volume || 0);
                currentWeek.kd_k = day.kd_k;
                currentWeek.kd_d = day.kd_d;
            }
        });

        if (currentWeek) weeks.push(currentWeek);
        return weeks;
    },

    /**
     * Aggregate daily data to monthly
     */
    _aggregateToMonth(data) {
        if (!data || data.length === 0) return [];

        const months = [];
        let currentMonth = null;

        data.forEach(day => {
            const date = new Date(day.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!currentMonth || currentMonth.monthKey !== monthKey) {
                if (currentMonth) months.push(currentMonth);
                currentMonth = {
                    monthKey: monthKey,
                    date: monthKey + '-01',
                    open: day.open,
                    high: day.high,
                    low: day.low,
                    close: day.close,
                    volume: day.volume || 0,
                    kd_k: day.kd_k,
                    kd_d: day.kd_d
                };
            } else {
                currentMonth.high = Math.max(currentMonth.high, day.high);
                currentMonth.low = Math.min(currentMonth.low, day.low);
                currentMonth.close = day.close;
                currentMonth.volume += (day.volume || 0);
                currentMonth.kd_k = day.kd_k;
                currentMonth.kd_d = day.kd_d;
            }
        });

        if (currentMonth) months.push(currentMonth);
        return months;
    },

    /**
     * Get processed data based on current timeframe
     */
    _getProcessedData() {
        let data = [...this.currentHistory];

        // Sort by date ascending
        data.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (this.currentTimeframe === 'week') {
            data = this._aggregateToWeek(data);
        } else if (this.currentTimeframe === 'month') {
            data = this._aggregateToMonth(data);
        }

        return data;
    },

    /**
     * Main render function
     */
    _render() {
        if (!this.chartInstance || this.currentHistory.length === 0) return;

        const data = this._getProcessedData();

        // Extract data arrays
        const dates = data.map(d => {
            const date = new Date(d.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        const candleData = data.map(d => [d.open, d.close, d.low, d.high]);
        const volumes = data.map(d => d.volume || 0);
        const kdK = data.map(d => d.kd_k);
        const kdD = data.map(d => d.kd_d);

        // Calculate MAs
        const ma5 = this._calculateMA(5, data);
        const ma10 = this._calculateMA(10, data);
        const ma20 = this._calculateMA(20, data);

        // Volume colors (red for up, green for down)
        const volumeColors = data.map((d, i) => {
            if (i === 0) return d.close >= d.open ? '#ff3333' : '#00cc66';
            const prevClose = data[i - 1].close;
            return d.close >= prevClose ? '#ff3333' : '#00cc66';
        });

        // Dark theme colors
        const colors = {
            bg: '#0a0a0a',
            text: '#e0e0e0',
            textSecondary: '#888888',
            grid: '#1e1e1e',
            gridBorder: '#2a2a2a',
            up: '#ff3333',
            down: '#00cc66',
            ma5: '#ffd93d',
            ma10: '#6bcb77',
            ma20: '#4d96ff',
            kdK: '#ff6b6b',
            kdD: '#4ecdc4',
            line80: '#ff4444',
            line20: '#00cc66',
            crosshair: '#555555'
        };

        const option = {
            backgroundColor: colors.bg,
            animation: true,
            animationDuration: 500,

            title: {
                text: `${this.currentSymbol}  ${this.currentName}`,
                left: 'center',
                top: 10,
                textStyle: {
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                subtext: this._getTimeframeLabel(),
                subtextStyle: {
                    color: colors.textSecondary,
                    fontSize: 12
                }
            },

            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    lineStyle: {
                        color: colors.crosshair,
                        width: 1,
                        type: 'dashed'
                    },
                    label: {
                        backgroundColor: '#333'
                    }
                },
                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                borderColor: '#333',
                borderWidth: 1,
                textStyle: {
                    color: colors.text,
                    fontSize: 12
                },
                formatter: (params) => {
                    return this._formatTooltip(params, data, colors);
                }
            },

            axisPointer: {
                link: [{ xAxisIndex: 'all' }],
                label: {
                    backgroundColor: '#333'
                }
            },

            grid: [
                {
                    left: '5%',
                    right: '5%',
                    top: 70,
                    height: '55%'
                },
                {
                    left: '5%',
                    right: '5%',
                    top: '68%',
                    height: '12%'
                },
                {
                    left: '5%',
                    right: '5%',
                    top: '82%',
                    height: '12%'
                }
            ],

            xAxis: [
                {
                    type: 'category',
                    data: dates,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { onZero: false, lineStyle: { color: colors.gridBorder } },
                    axisTick: { show: false },
                    axisLabel: { color: colors.textSecondary, fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: colors.grid } },
                    min: 'dataMin',
                    max: 'dataMax'
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    data: dates,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { onZero: false, lineStyle: { color: colors.gridBorder } },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false },
                    min: 'dataMin',
                    max: 'dataMax'
                },
                {
                    type: 'category',
                    gridIndex: 2,
                    data: dates,
                    scale: true,
                    boundaryGap: false,
                    axisLine: { onZero: false, lineStyle: { color: colors.gridBorder } },
                    axisTick: { show: false },
                    axisLabel: { color: colors.textSecondary, fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: colors.grid } },
                    min: 'dataMin',
                    max: 'dataMax'
                }
            ],

            yAxis: [
                {
                    scale: true,
                    splitArea: { show: false },
                    axisLine: { lineStyle: { color: colors.gridBorder } },
                    axisLabel: { color: colors.textSecondary, fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: colors.grid } }
                },
                {
                    scale: true,
                    gridIndex: 1,
                    splitNumber: 2,
                    axisLabel: { show: false },
                    axisLine: { show: false },
                    axisTick: { show: false },
                    splitLine: { show: false }
                },
                {
                    scale: true,
                    gridIndex: 2,
                    min: 0,
                    max: 100,
                    splitNumber: 4,
                    axisLine: { lineStyle: { color: colors.gridBorder } },
                    axisLabel: { color: colors.textSecondary, fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: colors.grid } }
                }
            ],

            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1, 2],
                    start: Math.max(0, 100 - (60 / data.length * 100)),
                    end: 100
                },
                {
                    show: true,
                    xAxisIndex: [0, 1, 2],
                    type: 'slider',
                    bottom: 5,
                    start: Math.max(0, 100 - (60 / data.length * 100)),
                    end: 100,
                    height: 20,
                    borderColor: colors.gridBorder,
                    fillerColor: 'rgba(0, 212, 255, 0.2)',
                    handleStyle: {
                        color: '#00d4ff'
                    },
                    textStyle: {
                        color: colors.textSecondary
                    }
                }
            ],

            series: [
                // Main candlestick
                {
                    name: 'K線',
                    type: 'candlestick',
                    data: candleData,
                    itemStyle: {
                        color: colors.up,
                        color0: colors.down,
                        borderColor: colors.up,
                        borderColor0: colors.down
                    }
                },
                // MA5
                {
                    name: 'MA5',
                    type: 'line',
                    data: ma5,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.ma5,
                        width: 1.5
                    }
                },
                // MA10
                {
                    name: 'MA10',
                    type: 'line',
                    data: ma10,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.ma10,
                        width: 1.5
                    }
                },
                // MA20
                {
                    name: 'MA20',
                    type: 'line',
                    data: ma20,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.ma20,
                        width: 1.5
                    }
                },
                // Volume
                {
                    name: '成交量',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 1,
                    data: volumes,
                    itemStyle: {
                        color: (params) => volumeColors[params.dataIndex]
                    }
                },
                // KD-K
                {
                    name: 'KD-K',
                    type: 'line',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: kdK,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.kdK,
                        width: 1.5
                    }
                },
                // KD-D
                {
                    name: 'KD-D',
                    type: 'line',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: kdD,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.kdD,
                        width: 1.5
                    }
                },
                // Overbought line (80)
                {
                    name: '超買線',
                    type: 'line',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: data.map(() => 80),
                    symbol: 'none',
                    lineStyle: {
                        color: colors.line80,
                        width: 1,
                        type: 'dashed',
                        opacity: 0.5
                    },
                    silent: true
                },
                // Oversold line (20)
                {
                    name: '超賣線',
                    type: 'line',
                    xAxisIndex: 2,
                    yAxisIndex: 2,
                    data: data.map(() => 20),
                    symbol: 'none',
                    lineStyle: {
                        color: colors.line20,
                        width: 1,
                        type: 'dashed',
                        opacity: 0.5
                    },
                    silent: true
                }
            ]
        };

        this.chartInstance.setOption(option, true);
    },

    /**
     * Get timeframe display label
     */
    _getTimeframeLabel() {
        const labels = {
            'day': '日K',
            'week': '週K',
            'month': '月K'
        };
        return labels[this.currentTimeframe] || '日K';
    },

    /**
     * Format tooltip content
     */
    _formatTooltip(params, data, colors) {
        const idx = params[0].dataIndex;
        const d = data[idx];
        if (!d) return '';

        const date = new Date(d.date);
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

        let html = `<div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${colors.text}">${dateStr}</div>`;

        // Price info
        const isUp = d.close >= d.open;
        const priceColor = isUp ? colors.up : colors.down;

        html += `<div style="display:grid;grid-template-columns:auto auto;gap:8px 16px;font-size:12px;">`;
        html += `<span style="color:${colors.textSecondary}">開盤</span><span style="color:${colors.text};text-align:right">${d.open?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">最高</span><span style="color:${colors.text};text-align:right">${d.high?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">最低</span><span style="color:${colors.text};text-align:right">${d.low?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">收盤</span><span style="color:${priceColor};text-align:right;font-weight:bold">${d.close?.toFixed(2) || '-'}</span>`;

        if (d.volume) {
            const volStr = d.volume >= 1000000
                ? (d.volume / 1000000).toFixed(1) + 'M'
                : d.volume >= 1000
                    ? (d.volume / 1000).toFixed(1) + 'K'
                    : d.volume.toString();
            html += `<span style="color:${colors.textSecondary}">成交量</span><span style="color:${colors.text};text-align:right">${volStr}</span>`;
        }

        if (d.kd_k !== undefined && d.kd_k !== null) {
            html += `<span style="color:${colors.kdK}">KD-K</span><span style="color:${colors.kdK};text-align:right">${d.kd_k.toFixed(2)}</span>`;
        }
        if (d.kd_d !== undefined && d.kd_d !== null) {
            html += `<span style="color:${colors.kdD}">KD-D</span><span style="color:${colors.kdD};text-align:right">${d.kd_d.toFixed(2)}</span>`;
        }

        html += `</div>`;

        // MA values
        params.forEach(p => {
            if (p.seriesName && p.seriesName.startsWith('MA')) {
                html += `<div style="margin-top:4px;font-size:11px;color:${p.color}">${p.seriesName}: ${p.value}</div>`;
            }
        });

        return html;
    }
};