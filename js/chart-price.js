// --------------------------------------
// chart-price.js
// 価格チャート（ローソク足・MA・一目・BB・雲・出来高）
// --------------------------------------

// ------------------------------
// ローソク足の見た目だけ切り替える
// ------------------------------
function applyCandleVisibility() {
  if (!candleSeries) return;

  if (showCandles) {
    candleSeries.applyOptions({
      upColor: 'red',
      downColor: 'blue',
      borderUpColor: 'red',
      borderDownColor: 'blue',
      wickUpColor: 'red',
      wickDownColor: 'blue',
    });
  } else {
    candleSeries.applyOptions({
      upColor: 'rgba(0,0,0,0)',
      downColor: 'rgba(0,0,0,0)',
      borderUpColor: 'rgba(0,0,0,0)',
      borderDownColor: 'rgba(0,0,0,0)',
      wickUpColor: 'rgba(0,0,0,0)',
      wickDownColor: 'rgba(0,0,0,0)',
    });
  }
}

// --------------------------------------
// 価格チャート生成
// --------------------------------------
function createPriceChart(candleData) {
  const rect = chartContainer.getBoundingClientRect();

  priceChart = LightweightCharts.createChart(chartContainer, {
    width: rect.width,
    height: rect.height,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: { visible: true, borderVisible: true },
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

  priceChart.applyOptions({
    localization: {
      locale: 'ja-JP',
      dateFormat: 'yyyy/MM/dd',
    },
  });

  priceChart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const date = new Date(time * 1000);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}`;
    },
  });

  // ------------------------------
  // 凡例（TradingView風）
  // ------------------------------
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.innerHTML = `
    【価格チャート】<br>
    ローソク足 / 出来高 / MA5 / MA25 / MA50 / MA75 / MA100<br>
    一目均衡表（転換線・基準線・先行1・先行2・遅行）<br>
    ボリンジャーバンド（ミドル・上限・下限）
  `;
  chartContainer.style.position = "relative";
  chartContainer.appendChild(legend);

  // ------------------------------
  // ローソク足
  // ------------------------------
  candleSeries = priceChart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });
  candleSeries.setData(candleData);

  candleSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.05, bottom: 0.25 },
  });

  applyCandleVisibility();

  // ------------------------------
  // 出来高
  // ------------------------------
  volumeSeries = priceChart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
    color: 'rgba(128,128,128,0.6)',
  });
  volumeSeries.setData(
    candleData.map(c => ({ time: c.time, value: c.volume }))
  );

  // ------------------------------
  // 移動平均線
  // ------------------------------
  function addMA(color, data) {
    const s = priceChart.addSeries(LightweightCharts.LineSeries, {
      color,
      lineWidth: 1
    });
    s.setData(data.filter(p => p.value !== null));
    return s;
  }

  ma5Series   = addMA('#ff1493', calcMA(candleData, 5));
  ma25Series  = addMA('#00aa00', calcMA(candleData, 25));
  ma50Series  = addMA('#0000ff', calcMA(candleData, 50));
  ma75Series  = addMA('#aa00aa', calcMA(candleData, 75));
  ma100Series = addMA('#ffaa00', calcMA(candleData, 100));

  // ------------------------------
  // 一目均衡表（修正版：雲は26日先）
  // ------------------------------
  const ichimoku = calcIchimoku(candleData);

  const shiftSec = 26 * 24 * 60 * 60;

  ichimokuTenkanSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 1,
  });
  ichimokuTenkanSeries.setData(ichimoku.tenkan.filter(p => p.value !== null));

  ichimokuKijunSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 1,
  });
  ichimokuKijunSeries.setData(ichimoku.kijun.filter(p => p.value !== null));

  ichimokuSpan1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(0, 128, 0, 1)',
    lineWidth: 1,
  });
  ichimokuSpan1Series.setData(
    ichimoku.span1
      .filter(p => p.value !== null)
      .map(p => ({ time: p.time + shiftSec, value: p.value }))
  );

  ichimokuSpan2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(128, 0, 128, 1)',
    lineWidth: 1,
  });
  ichimokuSpan2Series.setData(
    ichimoku.span2
      .filter(p => p.value !== null)
      .map(p => ({ time: p.time + shiftSec, value: p.value }))
  );

  // 雲（先行スパン1と先行スパン2の間）
  const cloudData = [];
  const span1Map = new Map();
  ichimoku.span1.forEach(p => {
    if (p.value != null) span1Map.set(p.time, p.value);
  });

  ichimoku.span2.forEach(p => {
    if (p.value != null && span1Map.has(p.time)) {
      const v1 = span1Map.get(p.time);
      const v2 = p.value;
      cloudData.push({
        time: p.time + shiftSec,
        value: Math.max(v1, v2),
        lowerValue: Math.min(v1, v2),
      });
    }
  });

  if (cloudData.length > 0) {
    bbAreaSeries = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: 'rgba(0, 200, 0, 0.3)',
      bottomColor: 'rgba(200, 0, 200, 0.3)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    bbAreaSeries.setData(cloudData);
  }

  // 遅行スパン
  ichimokuChikouSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#008080',
    lineWidth: 1,
  });
  ichimokuChikouSeries.setData(ichimoku.chikou.filter(p => p.value !== null));

  // ------------------------------
  // ボリンジャーバンド
  // ------------------------------
  const bb = calcBB(candleData, 20, 2);

  bbMidSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ffa500',
    lineWidth: 1,
  });
  bbMidSeries.setData(bb.mid.filter(p => p.value !== null));

  bbUpperSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ffa500',
    lineWidth: 1,
  });
  bbUpperSeries.setData(bb.upper.filter(p => p.value !== null));

  bbLowerSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ffa500',
    lineWidth: 1,
  });
  bbLowerSeries.setData(bb.lower.filter(p => p.value !== null));

  // BB の雲
  const bbAreaData = [];
  const upperMap = new Map();
  bb.upper.forEach(p => {
    if (p.value != null) upperMap.set(p.time, p.value);
  });
  bb.lower.forEach(p => {
    if (p.value != null && upperMap.has(p.time)) {
      const u = upperMap.get(p.time);
      const l = p.value;
      bbAreaData.push({
        time: p.time,
        value: u,
        lowerValue: l,
      });
    }
  });

  if (bbAreaData.length > 0) {
    bbAreaSeries = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: 'rgba(255,165,0,0.2)',
      bottomColor: 'rgba(255,165,0,0.05)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    bbAreaSeries.setData(bbAreaData);
  }

  // ------------------------------
  // ツールチップ（省略：前回提示のまま）
  // ------------------------------

  return { chart: priceChart };
}
