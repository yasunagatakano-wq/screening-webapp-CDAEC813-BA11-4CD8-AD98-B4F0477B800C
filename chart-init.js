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
      fixLeftEdge: true,
      fixRightEdge: true,
      tickMarkSpacing: 50,
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

  // ★ X軸の目盛を「MM/DD」形式にする
  chart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const date = new Date(time * 1000);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}`;
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
    priceScaleId: '',
    color: 'rgba(128,128,128,0.6)',
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });

  // -----------------------------
  // ★ 移動平均線（5・25・50・75・100）
  // -----------------------------
  const ma5  = chart.addSeries(LightweightCharts.LineSeries,  { color: '#ff0000', lineWidth: 2 });
  const ma25 = chart.addSeries(LightweightCharts.LineSeries,  { color: '#00aa00', lineWidth: 2 });
  const ma50 = chart.addSeries(LightweightCharts.LineSeries,  { color: '#0000ff', lineWidth: 2 });
  const ma75 = chart.addSeries(LightweightCharts.LineSeries,  { color: '#aa00aa', lineWidth: 2 });
  const ma100= chart.addSeries(LightweightCharts.LineSeries,  { color: '#ffaa00', lineWidth: 2 });

  // 移動平均を計算する関数
  function calcMA(data, period) {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push({ time: data[i].time, value: null });
        continue;
      }
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
      result.push({ time: data[i].time, value: avg });
    }
    return result;
  }

  // -----------------------------
  // ③ データ取得
  // -----------------------------
  fetch("https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com/chart_full?symbol=1605.T")
    .then(res => res.json())
    .then(json => {
      const dates = Object.keys(json.Close).sort((a, b) => Number(a) - Number(b));

      const candleData = dates.map(d => {
        const original = new Date(Number(d)); // JST 00:00
        const utc = Date.UTC(
          original.getFullYear(),
          original.getMonth(),
          original.getDate()
        ); // UTC 00:00 に変換

        return {
          time: Math.floor(utc / 1000),
          open: json.Open[d],
          high: json.High[d],
          low: json.Low[d],
          close: json.Close[d],
          volume: json.Volume[d],
        };
      });

      candleSeries.setData(candleData);

      const volumeData = candleData.map(c => ({
        time: c.time,
        value: c.volume,
      }));
      volumeSeries.setData(volumeData);

      // ★ 移動平均線のセット
      ma5.setData(calcMA(candleData, 5));
      ma25.setData(calcMA(candleData, 25));
      ma50.setData(calcMA(candleData, 50));
      ma75.setData(calcMA(candleData, 75));
      ma100.setData(calcMA(candleData, 100));

      chart.timeScale().fitContent();
    })
    .catch(err => {
      console.error("チャート取得エラー:", err);
      alert("チャートの取得に失敗しました。");
    });

  // -----------------------------
  // ④ ホバー時に OHLCV を表示（カンマ付き）
  // -----------------------------
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.display = 'none';
  tooltip.style.padding = '8px';
  tooltip.style.background = 'rgba(255,255,255,0.9)';
  tooltip.style.border = '1px solid #ccc';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '1000';
  chartContainer.style.position = 'relative';
  chartContainer.appendChild(tooltip);

  chart.subscribeCrosshairMove(param => {
    if (!param.time || !param.seriesData.size || !param.point) {
      tooltip.style.display = 'none';
      return;
    }

    const candle = param.seriesData.get(candleSeries);
    const volume = param.seriesData.get(volumeSeries);

    if (!candle) {
      tooltip.style.display = 'none';
      return;
    }

    const JST_OFFSET = 9 * 60 * 60 * 1000;
    const date = new Date(param.time * 1000 + JST_OFFSET);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    tooltip.style.display = 'block';
    tooltip.style.left = param.point.x + 20 + 'px';
    tooltip.style.top = param.point.y + 20 + 'px';

    tooltip.innerHTML = `
      <div>日付: ${y}/${m}/${d}</div>
      <div>始値: ${candle.open.toLocaleString()}</div>
      <div>高値: ${candle.high.toLocaleString()}</div>
      <div>安値: ${candle.low.toLocaleString()}</div>
      <div>終値: ${candle.close.toLocaleString()}</div>
      <div>出来高: ${volume ? volume.value.toLocaleString() : ''}</div>
    `;
  });
});
