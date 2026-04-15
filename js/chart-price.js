// --------------------------------------
// chart-price.js（一目均衡表・動的雲：SpanA最背面 × SpanB前面）
// --------------------------------------

let candleSeries;
let volumeSeries;

let ma5Series, ma25Series, ma50Series, ma75Series, ma100Series;

let bbMidSeries, bbUpperSeries, bbLowerSeries;

let tenkanSeries, kijunSeries, span1Series, span2Series, chikouSeries;
let spanAArea, spanBArea;

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

  // --------------------------------------
  // 一目均衡表（先に計算して雲を“最背面”に描画）
// --------------------------------------
  const ichimoku = calcIchimoku(candleData);

  // テスト用：背景色は常に白
  const bgRGBA = "rgba(255,255,255,1)";

  const bullColor = "rgba(0,200,0,0.35)";
  // const bearColor = "rgba(200,0,0,0.35)";
  const bearColor = "rgba(255,255,255,1)";

  const spanAColored = [];
  const spanBColored = [];

  for (let i = 0; i < ichimoku.span1.length; i++) {
    const a = ichimoku.span1[i];
    const b = ichimoku.span2[i];
    if (!a || !b) continue;

    if (a.value > b.value) {
      // 強気 → SpanA 緑、SpanB 白
      spanAColored.push({ time: a.time, value: a.value, color: bullColor });
      spanBColored.push({ time: b.time, value: b.value, color: bgRGBA });
    } else {
      // 弱気 → SpanB 赤、SpanA 白
      spanAColored.push({ time: a.time, value: a.value, color: bgRGBA });
      spanBColored.push({ time: b.time, value: b.value, color: bearColor });
    }
  }

  // ▼ ★最背面：SpanA（動的色）
  spanAArea = priceChart.addSeries(LightweightCharts.AreaSeries, {
    topColor: bullColor,
    bottomColor: "rgba(255,255,255,1)",
    lineColor: "rgba(255,255,255,1)",
    lineWidth: 0,
  });
  spanAArea.setData(spanAColored);

  // ▼ ★その前：SpanB（動的色）
  spanBArea = priceChart.addSeries(LightweightCharts.AreaSeries, {
    topColor: bearColor,
    bottomColor: "rgba(255,255,255,1)",
    lineColor: "rgba(255,255,255,1)",
    lineWidth: 0,
  });
  spanBArea.setData(spanBColored);

  // --------------------------------------
  // ここから先に、ローソク足・出来高・MA・BB・線を“上に”重ねていく
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

  // ▼ 一目の線はローソク足より前面に
  tenkanSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: "#ff0000",
    lineWidth: 1,
  });
  tenkanSeries.setData(ichimoku.tenkanLine);

  kijunSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: "#0000ff",
    lineWidth: 1,
  });
  kijunSeries.setData(ichimoku.kijunLine);

  span1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: "#00aa00",
    lineWidth: 1,
  });
  span1Series.setData(ichimoku.span1);

  span2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: "#aa00aa",
    lineWidth: 1,
  });
  span2Series.setData(ichimoku.span2);

  chikouSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: "#888888",
    lineWidth: 1,
  });
  chikouSeries.setData(ichimoku.chikou);

  // --------------------------------------
  // ツールチップ
  // --------------------------------------
  const tooltip = document.createElement("div");
  tooltip.style.position = "absolute";
  tooltip.style.display = "none";
  tooltip.style.padding = "6px";
  tooltip.style.background = "rgba(255,255,255,0.9)";
  tooltip.style.border = "1px solid #ccc";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "12px";
  tooltip.style.pointerEvents = "none";
  tooltip.style.zIndex = "2100";

  chartContainer.style.position = "relative";
  chartContainer.appendChild(tooltip);

  priceChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.point) {
      tooltip.style.display = "none";
      return;
    }

    const candle = candleMap.get(param.time);
    if (!candle) {
      tooltip.style.display = "none";
      return;
    }

    const JST_OFFSET = 9 * 60 * 60 * 1000;
    const date = new Date(param.time * 1000 + JST_OFFSET);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    tooltip.style.display = "block";

    const tooltipWidth = tooltip.offsetWidth;
    const containerWidth = chartContainer.clientWidth;

    let left = param.point.x + 20;
    if (left + tooltipWidth > containerWidth) {
      left = param.point.x - tooltipWidth - 20;
    }
    if (left < 0) left = 0;

    tooltip.style.left = left + "px";
    tooltip.style.top = param.point.y + 20 + "px";

    tooltip.innerHTML = `
      <div>日付: ${y}/${m}/${d}</div>
      <div>始値: ${candle.open}</div>
      <div>高値: ${candle.high}</div>
      <div>安値: ${candle.low}</div>
      <div>終値: ${candle.close}</div>
      <div>出来高: ${candle.volume?.toLocaleString() ?? "-"}</div>
      <hr>
      <div>MA(5): ${ma5Map.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>MA(25): ${ma25Map.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>MA(50): ${ma50Map.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>MA(75): ${ma75Map.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>MA(100): ${ma100Map.get(param.time)?.toFixed(2) ?? "-"}</div>
      <hr>
      <div>BB ミドル: ${bbMidMap.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>BB 上限: ${bbUpperMap.get(param.time)?.toFixed(2) ?? "-"}</div>
      <div>BB 下限: ${bbLowerMap.get(param.time)?.toFixed(2) ?? "-"}</div>
    `;
  });

  // --------------------------------------
  // 凡例
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
    <div><span style="color:#ff0000;">■</span> 転換線</div>
    <div><span style="color:#0000ff;">■</span> 基準線</div>
    <div><span style="color:#00aa00;">■</span> 先行スパン1</div>
    <div><span style="color:#aa00aa;">■</span> 先行スパン2</div>
    <div><span style="color:#888888;">■</span> 遅行スパン</div>
  `;
  chartContainer.appendChild(legend);

  return { chart: priceChart };
}
