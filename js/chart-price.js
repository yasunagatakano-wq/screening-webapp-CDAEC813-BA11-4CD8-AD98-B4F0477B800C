// --------------------------------------
// chart-price.js（一目均衡表・雲：SpanA最背面 × SpanB背景色）
// --------------------------------------

let candleSeries;
let volumeSeries;

let ma5Series, ma25Series, ma50Series, ma75Series, ma100Series;

let bbMidSeries, bbUpperSeries, bbLowerSeries;

let tenkanSeries, kijunSeries, span1Series, span2Series, chikouSeries;
let spanAArea, spanBArea;

let showCandles = true;

// --------------------------------------
// 背景色を rgba(...) に正規化して透明度を付与する関数
// --------------------------------------
function toRGBAWithAlpha(color, alpha) {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  const rgba = ctx.fillStyle;
  return rgba.replace(/rgba?\(([^)]+)\)/, (match, inner) => {
    const parts = inner.split(',').map(v => v.trim());
    const r = parts[0];
    const g = parts[1];
    const b = parts[2];
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
}

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
// 一目均衡表の計算（営業日インデックスベース）
// --------------------------------------
function calcIchimoku(candleData) {
  const len = candleData.length;

  const tenkan = new Array(len).fill(null);
  const kijun = new Array(len).fill(null);
  const span1 = [];
  const span2 = [];
  const chikou = [];

  for (let i = 0; i < len; i++) {
    if (i >= 8) {
      let high = -Infinity, low = Infinity;
      for (let j = i - 8; j <= i; j++) {
        high = Math.max(high, candleData[j].high);
        low = Math.min(low, candleData[j].low);
      }
      tenkan[i] = (high + low) / 2;
    }

    if (i >= 25) {
      let high = -Infinity, low = Infinity;
      for (let j = i - 25; j <= i; j++) {
        high = Math.max(high, candleData[j].high);
        low = Math.min(low, candleData[j].low);
      }
      kijun[i] = (high + low) / 2;
    }
  }

  for (let i = 0; i < len; i++) {
    const shift = i + 26;
    if (shift >= len) continue;

    if (tenkan[i] != null && kijun[i] != null) {
      span1.push({
        time: candleData[shift].time,
        value: (tenkan[i] + kijun[i]) / 2,
      });
    }

    if (i >= 51) {
      let high = -Infinity, low = Infinity;
      for (let j = i - 51; j <= i; j++) {
        high = Math.max(high, candleData[j].high);
        low = Math.min(low, candleData[j].low);
      }
      span2.push({
        time: candleData[shift].time,
        value: (high + low) / 2,
      });
    }
  }

  for (let i = 26; i < len; i++) {
    chikou.push({
      time: candleData[i - 26].time,
      value: candleData[i].close,
    });
  }

  const tenkanLine = [];
  const kijunLine = [];
  for (let i = 0; i < len; i++) {
    if (tenkan[i] != null) tenkanLine.push({ time: candleData[i].time, value: tenkan[i] });
    if (kijun[i] != null) kijunLine.push({ time: candleData[i].time, value: kijun[i] });
  }

  return { tenkanLine, kijunLine, span1, span2, chikou };
}

// --------------------------------------
// 価格チャート生成
// --------------------------------------
function createPriceChart(priceChart, candleData) {

  const candleMap = new Map();
  candleData.forEach(c => candleMap.set(c.time, c));

  const makeValueMap = (arr) => {
    const m = new Map();
    arr.forEach(p => {
      if (p.value != null) m.set(p.time, p.value);
    });
    return m;
  };

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

  volumeSeries = priceChart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
    color: 'rgba(128,128,128,0.6)',
  });
  volumeSeries.setData(
    candleData.map(c => ({ time: c.time, value: c.volume }))
  );

  function addMA(color, data) {
    const s = priceChart.addSeries(LightweightCharts.LineSeries, {
      color,
      lineWidth: 1,
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

  // --------------------------------------
  // 一目均衡表
  // --------------------------------------
  const ichimoku = calcIchimoku(candleData);

  const bgColor = window.getComputedStyle(chartContainer).backgroundColor;

  const spanAColor = 'rgba(0, 200, 0, 0.35)';
  const spanBColor = toRGBAWithAlpha(bgColor, 0.35);

  // ▼ 最背面に SpanA（雲色）
  spanAArea = priceChart.addSeries(LightweightCharts.AreaSeries, {
    topColor: spanAColor,
    bottomColor: 'rgba(0,0,0,0)',
    lineColor: 'rgba(0,0,0,0)',
    lineWidth: 0,
  });
  spanAArea.setData(ichimoku.span1);

  // ▼ その前に SpanB（背景色）
  spanBArea = priceChart.addSeries(LightweightCharts.AreaSeries, {
    topColor: spanBColor,
    bottomColor: 'rgba(0,0,0,0)',
    lineColor: 'rgba(0,0,0,0)',
    lineWidth: 0,
  });
  spanBArea.setData(ichimoku.span2);

  // ▼ 線を前面に描画
  tenkanSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 1,
  });
  tenkanSeries.setData(ichimoku.tenkanLine);

  kijunSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 1,
  });
  kijunSeries.setData(ichimoku.kijunLine);

  span1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#00aa00',
    lineWidth: 1,
  });
  span1Series.setData(ichimoku.span1);

  span2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#aa00aa',
    lineWidth: 1,
  });
  span2Series.setData(ichimoku.span2);

  chikouSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#888888',
    lineWidth: 1,
  });
  chikouSeries.setData(ichimoku.chikou);

  // --------------------------------------
  // ツールチップ（省略：既存コードと同じ）
  // --------------------------------------

  // --------------------------------------
  // 凡例（省略：既存コードと同じ）
  // --------------------------------------

  return { chart: priceChart };
}
