window.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("chartContainer");

  const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: chartContainer.clientHeight,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: {
      visible: true,
      borderVisible: true,
    },
    timeScale: {
      borderVisible: true,
      timeVisible: false,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
  });

  // ★ ホバー時の日付を「2026/03/08」形式にする
  chart.applyOptions({
    localization: {
      dateFormat: 'yyyy/MM/dd',
    },
  });

  // -----------------------------
  // ① ローソク足（メインチャート）
  // -----------------------------
  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });

  // -----------------------------
  // ② 出来高（オーバーレイ）
  // -----------------------------
  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: '',   // ← ★ これが重要：メインチャートと同じスケールを使う
    color: 'rgba(128,128,128,0.6)',
    scaleMargins: {
      top: 0.8,   // 上 80% をローソク足に
      bottom: 0,  // 下 20% を出来高に
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
    })
    .catch(err => {
      console.error("チャート取得エラー:", err);
      alert("チャートの取得に失敗しました。");
    });
});
