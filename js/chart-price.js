// --------------------------------------
// chart-price.js（ツールチップ強化版）
// --------------------------------------

let candleSeries;
let volumeSeries;

let ma5Series, ma25Series, ma50Series, ma75Series, ma100Series;

let bbMidSeries, bbUpperSeries, bbLowerSeries, bbAreaSeries;

let showCandles = true;

// --------------------------------------
// ローソク足の表示／非表示
// --------------------------------------
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
function createPriceChart(priceChart, candleData) {

  // ▼ time → candleData の Map（ツールチップ用）
  const candleMap = new Map();
  candleData.forEach(c => candleMap.set(c.time, c));

  // ▼ MA / BB の値を time → value の Map にする
  const makeValueMap = (arr) => {
    const m = new Map();
    arr.forEach(p => {
      if (p.value != null) m.set(p.time, p.value);
    });
    return m;
  };

  // --------------------------------------
  // ローソク足
  // --------------------------------------
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

  // --------------------------------------
  // 出来高
  // --------------------------------------
  volumeSeries = priceChart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
    color: 'rgba(128,128,128,0.6)',
  });
  volumeSeries.setData(
    candleData.map(c => ({ time: c.time, value: c.volume }))
  );

  // --------------------------------------
  // 移動平均線
  // --------------------------------------
  function addMA(color, data) {
    const s = priceChart.addSeries(LightweightCharts.LineSeries, {
      color,
      lineWidth: 1
    });
    s.setData(data.filter(p => p.value !== null));
    return s;
  }

  const ma5 = calcMA(candleData, 5);
  const ma25 = calcMA(candleData, 25);
  const ma50 = calcMA(candleData, 50);
  const ma75 = calcMA(candleData, 75);
  const ma100 = calcMA(candleData, 100);

  ma5Series   = addMA('#ff1493', ma5);
  ma25Series  = addMA('#00aa00', ma25);
  ma50Series  = addMA('#0000ff', ma50);
  ma75Series  = addMA('#aa00aa', ma75);
  ma100Series = addMA('#ffaa00', ma100);

  const ma5Map   = makeValueMap(ma5);
  const ma25Map  = makeValueMap(ma25);
  const ma50Map  = makeValueMap(ma50);
  const ma75Map  = makeValueMap(ma75);
  const ma100Map = makeValueMap(ma100);

  // --------------------------------------
  // ボリンジャーバンド
  // --------------------------------------
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

  const bbMidMap   = makeValueMap(bb.mid);
  const bbUpperMap = makeValueMap(bb.upper);
  const bbLowerMap = makeValueMap(bb.lower);

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

  // --------------------------------------
  // ▼ 価格チャートツールチップ（強化版）
  // --------------------------------------
  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.display = 'none';
  tooltip.style.padding = '6px';
  tooltip.style.background = 'rgba(255,255,255,0.9)';
  tooltip.style.border = '1px solid #ccc';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.zIndex = '2100';

  chartContainer.style.position = "relative";
  chartContainer.appendChild(tooltip);

  priceChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.point) {
      tooltip.style.display = 'none';
      return;
    }

    const candle = candleMap.get(param.time);
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

    const tooltipWidth = tooltip.offsetWidth;
    const containerWidth = chartContainer.clientWidth;

    let left = param.point.x + 20;
    if (left + tooltipWidth > containerWidth) {
      left = param.point.x - tooltipWidth - 20;
    }
    if (left < 0) left = 0;

    tooltip.style.left = left + 'px';
    tooltip.style.top  = param.point.y + 20 + 'px';

    tooltip.innerHTML = `
      <div>日付: ${y}/${m}/${d}</div>
      <div>始値: ${candle.open}</div>
      <div>高値: ${candle.high}</div>
      <div>安値: ${candle.low}</div>
      <div>終値: ${candle.close}</div>
      <div>出来高: ${candle.volume?.toLocaleString() ?? '-'}</div>
      <hr>
      <div>MA(5): ${ma5Map.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>MA(25): ${ma25Map.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>MA(50): ${ma50Map.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>MA(75): ${ma75Map.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>MA(100): ${ma100Map.get(param.time)?.toFixed(2) ?? '-'}</div>
      <hr>
      <div>BB ミドル: ${bbMidMap.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>BB 上限: ${bbUpperMap.get(param.time)?.toFixed(2) ?? '-'}</div>
      <div>BB 下限: ${bbLowerMap.get(param.time)?.toFixed(2) ?? '-'}</div>
    `;
  });

  // --------------------------------------
  // ▼ 価格チャート凡例
  // --------------------------------------
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.innerHTML = `
    <div><strong>【価格チャート】</strong></div>
    <div><span style="color:red;">■</span> 陽線</div>
    <div><span style="color:blue;">■</span> 陰線</div>
    <div><span style="color:#ff1493;">■</span> MA(5)</div>
    <div><span style="color:#00aa00;">■</span> MA(25)</div>
    <div><span style="color:#0000ff;">■</span> MA(50)</div>
    <div><span style="color:#aa00aa;">■</span> MA(75)</div>
    <div><span style="color:#ffaa00;">■</span> MA(100)</div>
    <div><span style="color:#ffa500;">■</span> ボリンジャーバンド</div>
  `;
  chartContainer.appendChild(legend);

  return { chart: priceChart };
}
