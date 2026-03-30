window.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("chartContainer");

  // チャート作成
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

  // ローソク足シリーズ
  const candleSeries = chart.addCandlestickSeries({
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });

  // 1605 のデータ取得
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
      }));

      candleSeries.setData(candleData);
      chart.timeScale().fitContent();
    })
    .catch(err => {
      console.error("チャート取得エラー:", err);
      alert("チャートの取得に失敗しました。");
    });
});
