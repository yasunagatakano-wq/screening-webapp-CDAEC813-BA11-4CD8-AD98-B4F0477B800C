// --------------------------------------
// chart-price.js（完全修正版）
// --------------------------------------

let candleSeries;
let volumeSeries;

let ma5Series, ma25Series, ma50Series, ma75Series, ma100Series;

let tenkanSeries, kijunSeries;
let span1Series, span2Series, chikouSeries;

let cloudBullSeriesList = [];
let cloudBearSeriesList = [];

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
// 価格チャート生成（priceChart を外部から受け取る）
// --------------------------------------
function createPriceChart(priceChart, candleData) {

  // --------------------------------------
  // 凡例（復活）
  // --------------------------------------
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.innerHTML = `
    <div><strong>【価格チャート】</strong></div>
    <div><span style="color:red;">■</span> 陽線　
         <span style="color:blue;">■</span> 陰線</div>
    <div><span style="color:#ff1493;">■</span> MA5　
         <span style="color:#00aa00;">■</span> MA25　
         <span style="color:#0000ff;">■</span> MA50</div>
    <div><span style="color:#aa00aa;">■</span> MA75　
         <span style="color:#ffaa00;">■</span> MA100</div>
    <div><span style="color:#ff0000;">■</span> 転換線　
         <span style="color:#0000ff;">■</span> 基準線</div>
    <div><span style="color:rgba(0,128,0,1);">■</span> 先行スパン1　
         <span style="color:rgba(128,0,128,1);">■</span> 先行スパン2</div>
    <div><span style="color:#008080;">■</span> 遅行スパン</div>
    <div><span style="color:#ffa500;">■</span> ボリンジャーバンド</div>
  `;
  chartContainer.style.position = "relative";
  chartContainer.appendChild(legend);

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

  ma5Series   = addMA('#ff1493', calcMA(candleData, 5));
  ma25Series  = addMA('#00aa00', calcMA(candleData, 25));
  ma50Series  = addMA('#0000ff', calcMA(candleData, 50));
  ma75Series  = addMA('#aa00aa', calcMA(candleData, 75));
  ma100Series = addMA('#ffaa00', calcMA(candleData, 100));

  // --------------------------------------
  // 一目均衡表
  // --------------------------------------
  const ichimoku = calcIchimoku(candleData);
  const shiftSec = 26 * 24 * 60 * 60;

  // 転換線
  tenkanSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 1,
  });
  tenkanSeries.setData(ichimoku.tenkan.filter(p => p.value !== null));

  // 基準線
  kijunSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 1,
  });
  kijunSeries.setData(ichimoku.kijun.filter(p => p.value !== null));

  // 先行スパン1（26日先）
  const span1Shifted = ichimoku.span1
    .filter(p => p.value !== null)
    .map(p => ({ time: p.time + shiftSec, value: p.value }));

  span1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(0, 128, 0, 1)',
    lineWidth: 1,
  });
  span1Series.setData(span1Shifted);

  // 先行スパン2（26日先）
  const span2Shifted = ichimoku.span2
    .filter(p => p.value !== null)
    .map(p => ({ time: p.time + shiftSec, value: p.value }));

  span2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(128, 0, 128, 1)',
    lineWidth: 1,
  });
  span2Series.setData(span2Shifted);

  // --------------------------------------
  // 雲（先行スパン1と先行スパン2の間だけ塗る）
  // TradingView 完全互換ロジック
  // --------------------------------------
  cloudBullSeriesList = [];
  cloudBearSeriesList = [];

  let currentBull = [];
  let currentBear = [];

  for (let i = 0; i < span1Shifted.length; i++) {
    const p1 = span1Shifted[i];
    const p2 = span2Shifted[i];
    if (!p1 || !p2) continue;

    const upper = Math.max(p1.value, p2.value);
    const lower = Math.min(p1.value, p2.value);

    const isBull = p1.value >= p2.value;

    if (isBull) {
      if (currentBear.length > 0) {
        addCloudSeries(priceChart, currentBear, false);
        currentBear = [];
      }
      currentBull.push({ time: p1.time, value: upper, lowerValue: lower });
    } else {
      if (currentBull.length > 0) {
        addCloudSeries(priceChart, currentBull, true);
        currentBull = [];
      }
      currentBear.push({ time: p1.time, value: upper, lowerValue: lower });
    }
  }

  if (currentBull.length > 0) addCloudSeries(priceChart, currentBull, true);
  if (currentBear.length > 0) addCloudSeries(priceChart, currentBear, false);

  function addCloudSeries(chart, data, isBull) {
    const s = chart.addSeries(LightweightCharts.AreaSeries, {
      topColor: isBull ? 'rgba(0,200,0,0.4)' : 'rgba(200,0,0,0.4)',
      bottomColor: isBull ? 'rgba(0,200,0,0.1)' : 'rgba(200,0,0,0.1)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    s.setData(data);

    if (isBull) cloudBullSeriesList.push(s);
    else cloudBearSeriesList.push(s);
  }

  // 遅行スパン
  chikouSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#008080',
    lineWidth: 1,
  });
  chikouSeries.setData(ichimoku.chikou.filter(p => p.value !== null));

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

  return { chart: priceChart };
}
