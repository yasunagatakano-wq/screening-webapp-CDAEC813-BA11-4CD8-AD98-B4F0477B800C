window.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("chartContainer");

  const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
  });

  // ローソク足
  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });

  // ★ ローソク足の下側に余白を増やす
  candleSeries.priceScale().applyOptions({
    scaleMargins: {
      top: 0.05,
      bottom: 0.30,   // ← ここを増やすと重なりが解消される
    },
  });

  // 出来高
  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: {
      top: 0.75,   // ← 上側の余白を少し減らす
      bottom: 0,
    },
    color: 'rgba(128,128,128,0.6)',
  });

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
    })
    .catch(err => {
      console.error("チャート取得エラー:", err);
      alert("チャートの取得に失敗しました。");
    });
});
