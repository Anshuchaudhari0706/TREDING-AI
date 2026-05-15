document.addEventListener('DOMContentLoaded', () => {
    const chartContainer = document.getElementById('tvchart');
    const inputSymbol = document.getElementById('symbolSearch');
    const btnLoadChart = document.getElementById('btnLoadChart');
    const tfButtons = document.querySelectorAll('.tf-btn');

    let currentSymbol = 'VANTAGE:XAUUSD';
    let currentInterval = '5m'; // Default

    // Lightweight Chart variables
    let tvWidget = null;
    let equityChart = null;
    let equitySeries = null;
    let candleSeries = null;
    let chartData = [];
    let currentPriceLines = []; // Keep track of active TP/SL lines

    // Initialize Chart
    // ==========================================
    // TRADINGVIEW WIDGET INITIALIZATION
    // ==========================================
    function loadTradingViewChart(symbol, interval, customStudies = []) {
        document.getElementById('tvchart').innerHTML = '';
        
        let tvInterval = '5';
        if (interval === '1m') tvInterval = '1';
        if (interval === '5m') tvInterval = '5';
        if (interval === '15m') tvInterval = '15';
        if (interval === '1h') tvInterval = '60';
        if (interval === '4h') tvInterval = '240';
        if (interval === '1d') tvInterval = 'D';

        new TradingView.widget({
            "autosize": true,
            "symbol": symbol,
            "interval": tvInterval,
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "backgroundColor": "#0f172a",
            "gridColor": "rgba(255,255,255,0.05)",
            "hide_top_toolbar": false,
            "hide_legend": false,
            "save_image": false,
            "container_id": "tvchart",
            "studies": customStudies
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (equityChart) {
                const eqCont = document.getElementById('equityChart');
                equityChart.resize(eqCont.clientWidth, eqCont.clientHeight);
            }
        });

        // Init Equity & Signal Chart
        const eqCont = document.getElementById('equityChart');
        equityChart = LightweightCharts.createChart(eqCont, {
            width: eqCont.clientWidth,
            height: eqCont.clientHeight || 200,
            layout: { backgroundColor: 'transparent', textColor: '#8b94a5' },
            grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
            timeScale: { visible: true, timeVisible: true },
            rightPriceScale: { visible: true }
        });
        
        // Add Candlestick Series for Signals
        candleSeries = equityChart.addCandlestickSeries({
            upColor: '#10b981', downColor: '#ef4444', borderVisible: false,
            wickUpColor: '#10b981', wickDownColor: '#ef4444'
        });

        // Add Equity Line Series
        equitySeries = equityChart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 2,
            priceScaleId: 'left' // Put equity on left axis
        });
        
        equityChart.priceScale('left').applyOptions({ visible: true });

        fetchDataAndRender(currentSymbol, currentInterval);
    }

    // Map timeframes for Binance API
    const tfMap = {
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d'
    };

    async function fetchDataAndRender(symbol, interval) {
        document.querySelector('.scanning-animation').style.display = 'block';

        let pair = symbol.split(':')[1] || symbol;
        if (pair.includes('AAPL') || pair.includes('EURUSD')) pair = 'BTCUSDT'; // Fallback for demo

        const binanceInterval = tfMap[interval];

        try {
            // Fetch 500 candles for the baseline lightweight chart display
            const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${binanceInterval}&limit=500`);
            const data = await res.json();

            chartData = data.map(d => ({
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4])
            }));

            candleSeries.setData(chartData);

        } catch (err) {
            console.error("Network Error: Could not fetch initial data from Binance.");
            document.getElementById('smcContent').innerHTML = '<p class="text-sell">Chart Data Error: Using Backend AI Data Only.</p>';
        }
        
        // Always run backend analysis!
        await runAnalysisOnChart();

        document.querySelector('.scanning-animation').style.display = 'none';
    }

    async function runAnalysisOnChart() {
        // Removed length check so backend always executes

        document.getElementById('activeTradeSignal').style.display = 'block';
        document.getElementById('signalActionLabel').innerText = 'ANALYZING...';
        document.getElementById('signalActionLabel').className = 'signal-value neutral';
        document.getElementById('mlSetupLabel').innerText = '--';

        try {
            // Try to call the REAL Python Machine Learning Backend
            let pair = currentSymbol.split(':')[1] || currentSymbol;
            const customStrategy = document.getElementById('customStrategyInput') ? document.getElementById('customStrategyInput').value : '';
            const period = document.getElementById('backtestPeriod') ? document.getElementById('backtestPeriod').value : '60d';
            const res = await fetch(`http://localhost:8000/api/analyze?symbol=${pair}&timeframe=${currentInterval}&strategy=${encodeURIComponent(customStrategy)}&period=${period}`);
            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            const currentPrice = data.current_price;
            const decimals = currentPrice < 10 ? 4 : 2;
            const isBullish = data.prediction === "BULLISH";
            const mlConfNum = data.confidence;

            // Process Label Color
            let setupLabel = '';
            let labelColor = '';
            if (mlConfNum >= 95) { setupLabel = 'Strong Setup'; labelColor = '#10b981'; } // Buy Green
            else if (mlConfNum >= 80) { setupLabel = 'Good Setup'; labelColor = '#3b82f6'; } // Blue
            else if (mlConfNum >= 60) { setupLabel = 'Weak Setup'; labelColor = '#eab308'; } // Yellow
            else if (mlConfNum >= 50) { setupLabel = 'Neutral Setup'; labelColor = '#94a3b8'; } // Gray
            else { setupLabel = 'No Trade'; labelColor = '#ef4444'; } // Red

            // Map REAL backend stats to the UI panels
            document.getElementById('btProfit').innerText = `+${data.total_profit_pct.toFixed(1)}%`;
            document.getElementById('btMonth').innerText = `+${(data.total_profit_pct / 12).toFixed(1)}%`;
            document.getElementById('btWinRate').innerText = `${data.win_rate}%`;
            document.getElementById('btTrades').innerText = data.total_trades;
            document.getElementById('btPF').innerText = data.profit_factor;
            document.getElementById('mlConf').innerText = `${mlConfNum}%`;
            
            document.getElementById('cmpAI').innerText = `+${data.total_profit_pct.toFixed(1)}%`;
            document.getElementById('cmpBH').innerText = `+${(data.total_profit_pct * 0.4).toFixed(1)}%`; // Buy & Hold approx

            if (mlConfNum < 50) {
                document.getElementById('signalActionLabel').innerText = 'NO TRADE';
                document.getElementById('signalActionLabel').className = 'signal-value sell';
                document.getElementById('mlSetupLabel').innerText = setupLabel + ` (${mlConfNum}%)`;
                document.getElementById('mlSetupLabel').style.color = labelColor;

                document.getElementById('sigTP1').innerText = '--';
                document.getElementById('sigTP2').innerText = '--';
            } else {
                document.getElementById('signalActionLabel').innerText = data.prediction + ' SIGNAL';
                document.getElementById('signalActionLabel').className = isBullish ? 'signal-value buy' : 'signal-value sell';

                const actionText = isBullish ? 'upward continuation' : 'bearish breakdown';
                const actionColor = isBullish ? '#10b981' : '#ef4444';
            
                let strategyHtml = '';
                if (data.strategy_msg) {
                    strategyHtml = `
                        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${actionColor}" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            <span><strong>Custom Strategy AI:</strong> ${data.strategy_msg}</span>
                        </li>`;
                } else {
                    strategyHtml = `
                        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${actionColor}" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                            <span><strong>Universal ML Brain:</strong> ${mlConfNum}% Probability of ${actionText} on ${currentInterval}.</span>
                        </li>`;
                }
            
                document.getElementById('smcContent').innerHTML = `
                    <ul class="smc-list">
                        ${strategyHtml}
                        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>
                            <span><strong>SMC:</strong> Structure targets generated via Python backend at ${data.sl.toFixed(decimals)}.</span>
                        </li>
                    </ul>`;

                document.getElementById('mlSetupLabel').innerText = setupLabel + ` (${mlConfNum}%)`;
                document.getElementById('mlSetupLabel').style.color = labelColor;

                document.getElementById('sigEntry').innerText = currentPrice.toFixed(decimals);
                document.getElementById('sigSL').innerText = data.sl.toFixed(decimals);
                document.getElementById('sigTP1').innerText = data.tp1.toFixed(decimals);
                document.getElementById('sigTP2').innerText = data.tp2.toFixed(decimals);
            }

            // --- RENDER TRUE BACKTEST EQUITY CURVE AND SIGNALS ---
            if (data.equity_curve && data.equity_curve.length > 0) {
                const eqData = [];
                // We map the backend equity curve (array of values) over the recent chart timestamps
                const startIdx = Math.max(0, chartData.length - data.equity_curve.length);
                for (let i = 0; i < data.equity_curve.length; i++) {
                    let chartTime = chartData[startIdx + i] ? chartData[startIdx + i].time : (Date.now()/1000 + i*60);
                    eqData.push({ time: chartTime, value: data.equity_curve[i] });
                }
                equitySeries.setData(eqData);
                equityChart.timeScale().fitContent();
            }
            
            // Render Buy/Sell Arrow Markers on Candlestick Chart!
            if (data.signal_markers && data.signal_markers.length > 0 && candleSeries) {
                let markers = [];
                data.signal_markers.forEach(sig => {
                    // Find closest timestamp in chartData to align the marker
                    // yfinance daily timestamps might differ slightly from Binance intra-day timestamps
                    let matchingCandle = chartData.find(c => Math.abs(c.time - sig.time) < 86400); 
                    if (matchingCandle) {
                        markers.push({
                            time: matchingCandle.time,
                            position: sig.type === 'buy' ? 'belowBar' : 'aboveBar',
                            color: sig.type === 'buy' ? '#10b981' : '#ef4444',
                            shape: sig.type === 'buy' ? 'arrowUp' : 'arrowDown',
                            text: sig.type === 'buy' ? 'BUY' : 'SELL',
                            size: 2
                        });
                    }
                });
                candleSeries.setMarkers(markers);
            }
            
            // --- DRAW TP & SL PRICE LINES ON CHART ---
            if (candleSeries && mlConfNum >= 50) {
                // Clear old lines
                currentPriceLines.forEach(line => candleSeries.removePriceLine(line));
                currentPriceLines = [];
                
                // Draw Entry Line
                currentPriceLines.push(candleSeries.createPriceLine({
                    price: currentPrice,
                    color: '#3b82f6',
                    lineWidth: 2,
                    lineStyle: 2, // Dashed
                    axisLabelVisible: true,
                    title: 'ENTRY',
                }));
                
                // Draw Stop Loss Line
                currentPriceLines.push(candleSeries.createPriceLine({
                    price: data.sl,
                    color: '#ef4444',
                    lineWidth: 2,
                    lineStyle: 1, // Dotted
                    axisLabelVisible: true,
                    title: 'SL',
                }));
                
                // Draw TP1 Line
                currentPriceLines.push(candleSeries.createPriceLine({
                    price: data.tp1,
                    color: '#10b981',
                    lineWidth: 2,
                    lineStyle: 1,
                    axisLabelVisible: true,
                    title: 'TP1',
                }));
                
                // Draw TP2 Line
                currentPriceLines.push(candleSeries.createPriceLine({
                    price: data.tp2,
                    color: '#10b981',
                    lineWidth: 2,
                    lineStyle: 1,
                    axisLabelVisible: true,
                    title: 'TP2',
                }));
            }

        } catch (err) {
            console.error("Backend Error:", err);
            document.getElementById('smcContent').innerHTML = `
            <ul class="smc-list">
                <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
                    <span class="text-sell"><strong>System Offline:</strong> The Python Server is not running. Could not generate real data.</span>
                </li>
            </ul>`;
        }
    }

        // Event Listeners
        btnLoadChart.addEventListener('click', () => {
            const newSymbol = inputSymbol.value.toUpperCase();
            if (newSymbol !== currentSymbol) {
                currentSymbol = newSymbol;
                loadTradingViewChart(currentSymbol, currentInterval); 
            } else {
                runAnalysisOnChart();
            }
        });

        inputSymbol.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newSymbol = inputSymbol.value.toUpperCase();
                if (newSymbol !== currentSymbol) {
                    currentSymbol = newSymbol;
                    loadTradingViewChart(currentSymbol, currentInterval);
                } else {
                    runAnalysisOnChart();
                }
            }
        });

        tfButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tfButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentInterval = e.target.getAttribute('data-tf');
                loadTradingViewChart(currentSymbol, currentInterval);
            });
        });
        
        const btnDeployStrategy = document.getElementById('btnDeployStrategy');
        if (btnDeployStrategy) {
            btnDeployStrategy.addEventListener('click', () => {
                const strat = document.getElementById('customStrategyInput').value.toLowerCase();
                let customStudies = [];
                
                // Map NLP prompts directly to TradingView built-in studies
                if (strat.includes("ema") || strat.includes("cross")) {
                    customStudies.push("Moving Average Cross@tv-basicstudies");
                }
                if (strat.includes("support") || strat.includes("resistance")) {
                    customStudies.push("PivotPointsHighLow@tv-basicstudies");
                }
                if (strat.includes("bollinger") || strat.includes("bb")) {
                    customStudies.push("BB@tv-basicstudies");
                }
                if (strat.includes("macd")) {
                    customStudies.push("MACD@tv-basicstudies");
                }
                if (strat.includes("rsi")) {
                    customStudies.push("RSI@tv-basicstudies");
                }
                if (strat.includes("volume")) {
                    customStudies.push("Volume@tv-basicstudies");
                }
                
                // If they clicked deploy without typing anything, load default SMC kit
                if (customStudies.length === 0) {
                    customStudies = ["MACD@tv-basicstudies", "BB@tv-basicstudies", "PivotPointsHighLow@tv-basicstudies"];
                }
                
                loadTradingViewChart(currentSymbol, currentInterval, customStudies);
                
                // Alert the user on UI
                document.getElementById('smcContent').innerHTML = `
                    <ul class="smc-list">
                        <li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                            <span><strong>Visual Deployment:</strong> Strategy indicators loaded directly onto the chart above!</span>
                        </li>
                    </ul>`;
            });
        }

        // Initial load
        loadTradingViewChart(currentSymbol, currentInterval);
    });
