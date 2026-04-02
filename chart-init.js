window.addEventListener("DOMContentLoaded", () => {
  const chartContainer = document.getElementById("chartContainer");

  // ★ 銘柄情報（左上）
  const infoBox = document.createElement("div");
  infoBox.style.position = "absolute";
  infoBox.style.top = "5px";
  infoBox.style.left = "10px";
  infoBox.style.fontSize = "16px";
  infoBox.style.fontWeight = "bold";
  infoBox.style.zIndex = "2000";
  infoBox.style.background = "rgba(255,255,255,0.8)";
  infoBox.style.padding = "4px 8px";
  infoBox.style.borderRadius = "4px";
  infoBox.innerText = "1605  INPEX"; // ← .T を除去
  chartContainer.appendChild(infoBox);

  // ★ 凡例（銘柄名の下に配置）
  const legend = document.createElement("div");
  legend.style.position = "absolute";
  legend.style.top = "40px";     // ← 銘柄名の下
  legend.style.left = "10px";    // ← 左寄せ
  legend.style.right = "auto";
  legend.style.fontSize = "12px";
  legend.style.zIndex = "2000";
  legend.style.background = "rgba(255,255,255,0.8)";
  legend.style.padding = "6px 8px";
  legend.style.borderRadius = "4px";
  legend.innerHTML = `
    <div><span style="color:#ff0000;">■</span> 5MA</div>
    <div><span style="color:#00aa00;">■</span> 25MA</div>
    <div><span style="color:#0000ff;">■</span> 50MA</div>
    <div><span style="color:#aa00aa;">■</span> 75MA</div>
    <div><span style="color:#ffaa00;">■</span> 100MA</div>
  `;
  chartContainer.appendChild(legend);

  // ★ チャート本体
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

  chart.applyOptions({
    localization: {
      dateFormat: 'yyyy/MM/dd',
    },
  });

  chart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const date = new Date(time * 1000);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}`;
    },
  });

  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });

  const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: '',
    color: 'rgba(128,128,128,0.6)',
    scaleMargins: {
      top: 0.8,
      bottom: 0,
    },
  });

  const ma5   = chart.addSeries(LightweightCharts.LineSeries, { color: '#ff0000', lineWidth: 2 });
  const ma25  = chart.addSeries(LightweightCharts.LineSeries, { color: '#00aa00', lineWidth: 2 });
  const ma50  = chart.addSeries(LightweightCharts.LineSeries, { color: '#0000ff', lineWidth: 2 });
  const ma75  = chart.addSeries(LightweightCharts.LineSeries, { color: '#aa00aa', lineWidth: 2 });
  const ma100 = chart.addSeries(LightweightCharts.LineSeries, { color: '#ffaa00', lineWidth: 2 });

  // ★ 標準的な移動平均（当日を含む）
  function calcMA(data, period) {
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, d) => sum + d.close, 0) / period;
      result.push({ time: data[i].time, value: avg });
    }
    return result;
  }

  fetch("https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com/chart_full?symbol=1605.T")
    .then(res => res.json())
    .then(json => {
      const dates = Object.keys(json.Close).sort((a, b) => Number(a) - Number(b));

      const fullData = dates.map(d => {
        const original = new Date(Number(d));
        const utc = Date.UTC(
          original.getFullYear(),
          original.getMonth(),
          original.getDate()
        );

        const closeRaw = json.Close[d];

        return {
          time: Math.floor(utc / 1000),
          open: json.Open[d],
          high: json.High[d],
          low: json.Low[d],
          close: closeRaw,
          volume: json.Volume[d],
        };
      });

      const DISPLAY_COUNT = 90;
      const candleData = fullData.slice(-DISPLAY_COUNT);

      candleSeries.setData(candleData);

      volumeSeries.setData(
        candleData.map(c => ({ time: c.time, value: c.volume }))
      );

      ma5.setData(calcMA(fullData, 5).slice(-DISPLAY_COUNT));
      ma25.setData(calcMA(fullData, 25).slice(-DISPLAY_COUNT));
      ma50.setData(calcMA(fullData, 50).slice(-DISPLAY_COUNT));
      ma75.setData(calcMA(fullData, 75).slice(-DISPLAY_COUNT));
      ma100.setData(calcMA(fullData, 100).slice(-DISPLAY_COUNT));

      chart.timeScale().fitContent();
    });

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

    const v5   = param.seriesData.get(ma5);
    const v25  = param.seriesData.get(ma25);
    const v50  = param.seriesData.get(ma50);
    const v75  = param.seriesData.get(ma75);
    const v100 = param.seriesData.get(ma100);

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
      <hr>
      <div>5MA: ${v5   && v5.value   ? v5.value.toFixed(2)   : '-'}</div>
      <div>25MA: ${v25 && v25.value  ? v25.value.toFixed(2)  : '-'}</div>
      <div>50MA: ${v50 && v50.value  ? v50.value.toFixed(2)  : '-'}</div>
      <div>75MA: ${v75 && v75.value  ? v75.value.toFixed(2)  : '-'}</div>
      <div>100MA: ${v100 && v100.value ? v100.value.toFixed(2) : '-'}</div>
    `;
  });
});
