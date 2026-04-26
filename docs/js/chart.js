/**
 * Stock Chart Module - ECharts K-line + Volume + KD + MACD
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

        if (this.chartInstance) {
            this.chartInstance.dispose();
        }

        this.chartInstance = echarts.init(container, null, {
            renderer: 'canvas'
        });

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
     * Calculate EMA (Exponential Moving Average)
     */
    _ema(data, period) {
        const k = 2 / (period + 1);
        const result = [];
        let ema = data[0];
        result.push(ema);
        for (let i = 1; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            result.push(ema);
        }
        return result;
    },

    /**
     * Calculate MACD indicator
     */
    _calculateMACD(data) {
        const closes = data.map(d => d.close);
        const ema12 = this._ema(closes, 12);
        const ema26 = this._ema(closes, 26);
        const dif = ema12.map((v, i) => v - ema26[i]);
        const dea = this._ema(dif, 9);
        const histogram = dif.map((v, i) => (v - dea[i]) * 2);
        return { dif, dea, histogram };
    },

    /**
     * Calculate Moving Average
     */
    _calculateMA(dayCount, data) {
        return data.map((_, i) => {
            if (i < dayCount - 1) return '-';
            let sum = 0;
            for (let j = 0; j < dayCount; j++) sum += data[i - j].close;
            return (sum / dayCount).toFixed(2);
        });
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
                    weekKey, date: weekKey,
                    open: day.open, high: day.high, low: day.low, close: day.close,
                    volume: day.volume || 0, kd_k: day.kd_k, kd_d: day.kd_d
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
                    monthKey, date: monthKey + '-01',
                    open: day.open, high: day.high, low: day.low, close: day.close,
                    volume: day.volume || 0, kd_k: day.kd_k, kd_d: day.kd_d
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

        // Calculate MACD
        const macd = this._calculateMACD(data);
        const macdDIF = macd.dif;
        const macdDEA = macd.dea;
        const macdHistogram = macd.histogram;

        // Volume colors (red for up, green for down - TW style)
        const volumeColors = data.map((d, i) => {
            if (i === 0) return d.close >= d.open ? '#ff3333' : '#00cc66';
            const prevClose = data[i - 1].close;
            return d.close >= prevClose ? '#ff3333' : '#00cc66';
        });

        // Latest values for legend display
        const last = data[data.length - 1];
        const lastMA5 = ma5[ma5.length - 1];
        const lastMA10 = ma10[ma10.length - 1];
        const lastMA20 = ma20[ma20.length - 1];
        const lastKD_K = kdK[kdK.length - 1];
        const lastKD_D = kdD[kdD.length - 1];
        const lastDIF = macdDIF[macdDIF.length - 1];
        const lastDEA = macdDEA[macdDEA.length - 1];
        const lastHist = macdHistogram[macdHistogram.length - 1];

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
            macdDIF: '#ff9500',
            macdDEA: '#00d4ff',
            line80: '#ff4444',
            line20: '#00cc66',
            crosshair: '#555555'
        };

        // Build legend texts with matching colors
        const mainLegendParts = [];
        if (lastMA5 !== '-') mainLegendParts.push({ text: `MA5: ${Number(lastMA5).toFixed(2)}`, color: colors.ma5 });
        if (lastMA10 !== '-') mainLegendParts.push({ text: `MA10: ${Number(lastMA10).toFixed(2)}`, color: colors.ma10 });
        if (lastMA20 !== '-') mainLegendParts.push({ text: `MA20: ${Number(lastMA20).toFixed(2)}`, color: colors.ma20 });

        const kdLegendParts = [];
        if (lastKD_K != null) kdLegendParts.push({ text: `K: ${lastKD_K.toFixed(2)}`, color: colors.kdK });
        if (lastKD_D != null) kdLegendParts.push({ text: `D: ${lastKD_D.toFixed(2)}`, color: colors.kdD });
        kdLegendParts.push({ text: '80', color: colors.line80 });
        kdLegendParts.push({ text: '20', color: colors.line20 });

        const macdLegendParts = [];
        if (lastDIF != null) macdLegendParts.push({ text: `DIF: ${lastDIF.toFixed(2)}`, color: colors.macdDIF });
        if (lastDEA != null) macdLegendParts.push({ text: `DEA: ${lastDEA.toFixed(2)}`, color: colors.macdDEA });
        if (lastHist != null) {
            const histColor = lastHist >= 0 ? colors.up : colors.down;
            macdLegendParts.push({ text: `MACD: ${lastHist.toFixed(2)}`, color: histColor });
        }

        // Build graphic elements for each sub-chart legend
        const graphicElements = [];
        let xOffset = '5%';

        // Main chart legend (below main, above volume)
        mainLegendParts.forEach((part, i) => {
            graphicElements.push({
                type: 'text',
                left: `${5 + i * 16}%`,
                top: '39%',
                style: {
                    text: part.text,
                    fill: part.color,
                    fontSize: 10,
                    fontFamily: 'Courier New, monospace'
                },
                z: 100
            });
        });

        // Volume chart legend
        graphicElements.push({
            type: 'text',
            left: xOffset,
            top: '54%',
            style: {
                text: '\u6210\u4ea4\u91cf',
                fill: colors.textSecondary,
                fontSize: 10,
                fontFamily: 'Courier New, monospace'
            },
            z: 100
        });

        // KD chart legend
        kdLegendParts.forEach((part, i) => {
            graphicElements.push({
                type: 'text',
                left: `${5 + i * 14}%`,
                top: '69%',
                style: {
                    text: part.text,
                    fill: part.color,
                    fontSize: 10,
                    fontFamily: 'Courier New, monospace'
                },
                z: 100
            });
        });

        // MACD chart legend
        macdLegendParts.forEach((part, i) => {
            graphicElements.push({
                type: 'text',
                left: `${5 + i * 18}%`,
                top: '84%',
                style: {
                    text: part.text,
                    fill: part.color,
                    fontSize: 10,
                    fontFamily: 'Courier New, monospace'
                },
                z: 100
            });
        });

        // Grid layout (all percentages for precise legend positioning)
        // Title: ~8%, Main: 10%~37%, Vol: 40%~52%, KD: 55%~68%, MACD: 71%~83%, DataZoom: 86%~90%
        const option = {
            backgroundColor: colors.bg,
            animation: true,
            animationDuration: 500,

            title: {
                text: `${this.currentSymbol}  ${this.currentName}`,
                left: 'center',
                top: 6,
                textStyle: {
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: 'bold'
                },
                subtext: this._getTimeframeLabel(),
                subtextStyle: {
                    color: '#00d4ff',
                    fontSize: 11
                }
            },

            graphic: graphicElements,

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
                { left: '4%', right: '3%', top: '11%', height: '26%' },   // Main candlestick
                { left: '4%', right: '3%', top: '40%', height: '12%' },   // Volume
                { left: '4%', right: '3%', top: '55%', height: '12%' },   // KD
                { left: '4%', right: '3%', top: '70%', height: '12%' }    // MACD
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
                },
                {
                    type: 'category',
                    gridIndex: 3,
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
                },
                {
                    scale: true,
                    gridIndex: 3,
                    splitNumber: 3,
                    axisLine: { lineStyle: { color: colors.gridBorder } },
                    axisLabel: { color: colors.textSecondary, fontSize: 10 },
                    splitLine: { show: true, lineStyle: { color: colors.grid } }
                }
            ],

            dataZoom: [
                {
                    type: 'inside',
                    xAxisIndex: [0, 1, 2, 3],
                    start: Math.max(0, 100 - (60 / data.length * 100)),
                    end: 100
                },
                {
                    show: true,
                    xAxisIndex: [0, 1, 2, 3],
                    type: 'slider',
                    bottom: 2,
                    start: Math.max(0, 100 - (60 / data.length * 100)),
                    end: 100,
                    height: 16,
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
                // Main chart - candlestick
                {
                    name: 'K\u7dda',
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
                    name: '\u6210\u4ea4\u91cf',
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
                    name: '\u8d85\u8cb7\u7dda',
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
                    name: '\u8d85\u8ce3\u7dda',
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
                },
                // MACD DIF
                {
                    name: 'DIF',
                    type: 'line',
                    xAxisIndex: 3,
                    yAxisIndex: 3,
                    data: macdDIF,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.macdDIF,
                        width: 1.5
                    }
                },
                // MACD DEA
                {
                    name: 'DEA',
                    type: 'line',
                    xAxisIndex: 3,
                    yAxisIndex: 3,
                    data: macdDEA,
                    smooth: true,
                    symbol: 'none',
                    lineStyle: {
                        color: colors.macdDEA,
                        width: 1.5
                    }
                },
                // MACD Histogram
                {
                    name: 'MACD',
                    type: 'bar',
                    xAxisIndex: 3,
                    yAxisIndex: 3,
                    data: macdHistogram,
                    itemStyle: {
                        color: (params) => params.value >= 0 ? colors.up : colors.down
                    }
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
            'day': '\u65e5K',
            'week': '\u9031K',
            'month': '\u6708K'
        };
        return labels[this.currentTimeframe] || '\u65e5K';
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

        const isUp = d.close >= d.open;
        const priceColor = isUp ? colors.up : colors.down;

        let html = `<div style="font-size:13px;font-weight:bold;margin-bottom:6px;color:${colors.text}">${dateStr}</div>`;
        html += `<div style="display:grid;grid-template-columns:auto auto;gap:6px 16px;font-size:12px;">`;
        html += `<span style="color:${colors.textSecondary}">\u958b\u76e4</span><span style="color:${colors.text};text-align:right">${d.open?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">\u6700\u9ad8</span><span style="color:${colors.text};text-align:right">${d.high?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">\u6700\u4f4e</span><span style="color:${colors.text};text-align:right">${d.low?.toFixed(2) || '-'}</span>`;
        html += `<span style="color:${colors.textSecondary}">\u6536\u76e4</span><span style="color:${priceColor};text-align:right;font-weight:bold">${d.close?.toFixed(2) || '-'}</span>`;

        if (d.volume) {
            const volStr = d.volume >= 1000000
                ? (d.volume / 1000000).toFixed(1) + 'M'
                : d.volume >= 1000
                    ? (d.volume / 1000).toFixed(1) + 'K'
                    : d.volume.toString();
            html += `<span style="color:${colors.textSecondary}">\u6210\u4ea4\u91cf</span><span style="color:${colors.text};text-align:right">${volStr}</span>`;
        }

        html += `</div>`;
        html += `<div style="margin-top:8px;border-top:1px solid #333;padding-top:6px;">`;

        params.forEach(p => {
            if (p.seriesName === 'MA5' && p.value !== '-') {
                html += `<div style="font-size:11px;color:${colors.ma5}">MA5: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'MA10' && p.value !== '-') {
                html += `<div style="font-size:11px;color:${colors.ma10}">MA10: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'MA20' && p.value !== '-') {
                html += `<div style="font-size:11px;color:${colors.ma20}">MA20: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'KD-K' && p.value != null) {
                html += `<div style="font-size:11px;color:${colors.kdK}">KD-K: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'KD-D' && p.value != null) {
                html += `<div style="font-size:11px;color:${colors.kdD}">KD-D: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'DIF' && p.value != null) {
                html += `<div style="font-size:11px;color:${colors.macdDIF}">DIF: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'DEA' && p.value != null) {
                html += `<div style="font-size:11px;color:${colors.macdDEA}">DEA: ${Number(p.value).toFixed(2)}</div>`;
            }
            if (p.seriesName === 'MACD' && p.value != null) {
                const color = p.value >= 0 ? colors.up : colors.down;
                html += `<div style="font-size:11px;color:${color}">MACD: ${Number(p.value).toFixed(2)}</div>`;
            }
        });

        html += `</div>`;
        return html;
    }
};
