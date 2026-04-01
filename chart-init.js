window.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("chartContainer");

  const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: { visible: true },
    timeScale: {
      borderVisible: true,
      timeVisible: true,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
  });

  // -----------------------------
  // ① ローソク足（上 75%）
  // -----------------------------
  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    priceScaleId: 'candles',
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });

  chart.priceScale('candles').applyOptions({
    position: 'right',
    visible: true,
    borderVisible: true,
    scaleMargins: {
      top: 0.05,
      bottom: 0.25,   // ← ★ 境界を 0.25 に統一
    },
  });

  // -----------------------------
  // ② 出来高（下 25%）
  // -----------------------------
  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceScaleId: 'volume',
    priceFormat: { type: 'volume' },
    color: 'rgba(128,128,128,0.6)',
  });

  chart.priceScale('volume').applyOptions({
    position: 'right',
    visible: true,
    borderVisible: true,
    scaleMargins: {
      top: 0.25,   // ← ★ ローソク足の bottom と完全一致
      bottom: 0,
    },
  });

  // -----------------------------
  // ③ データ取得
  // -----------------------------
  fetch("https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com/chart_full?symbol=1605.T")
    .then(res => res.json())
    .then(json => {
      const dates = Object.keys(json.Close).sort((a, b) => Number(a) - Number(b));

      const candleData = dates.map(d => ({
        time: Math.floor(Number(d) / 1000),
        open: json.Open[d],
        high: json.High[d],
        low: json.Low[d],
        close: json.Close[d],
        volume: json.Volume[d],
      }));

      candleSeries.setData(candleData);

      const volumeData = candleData.map(c => ({
        time: c.time,
        value: c.volume,
      }));
      volumeSeries.setData(volumeData);

      chart.timeScale().fitContent();
    });
});
