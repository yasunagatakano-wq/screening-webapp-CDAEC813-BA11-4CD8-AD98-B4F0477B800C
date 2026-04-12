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
function createPriceChart(priceChart, candleDataRaw) {

  // --------------------------------------
  // 休場日を完全排除（businessDay 形式に変換）
  // --------------------------------------
  const candleData = candleDataRaw.map(c => {
    const d = new Date(c.time * 1000);
    return {
      time: {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
      },
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    };
  });

  // --------------------------------------
  // 凡例
  // --------------------------------------
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.style.pointerEvents = "none";
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
    .map(p => ({
      time: addDaysToBusinessDay(p.time, 26),
      value: p.value
    }));

  span1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(0, 128, 0, 1)',
    lineWidth: 1,
  });
  span1Series.setData(span1Shifted);

  // 先行スパン2（26日先）
  const span2Shifted = ichimoku.span2
    .filter(p => p.value !== null)
    .map(p => ({
      time: addDaysToBusinessDay(p.time, 26),
      value: p.value
    }));

  span2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(128, 0, 128, 1)',
    lineWidth: 1,
  });
  span2Series.setData(span2Shifted);

  // --------------------------------------
  // 雲（先行スパン1と先行スパン2の間だけ塗る）
  // --------------------------------------
  const span2Map = new Map();
  span2Shifted.forEach(p => span2Map.set(JSON.stringify(p.time), p.value));

  cloudBullSeriesList = [];
  cloudBearSeriesList = [];

  let currentBull = [];
  let currentBear = [];

  function flushSegment(list, data, isBull) {
    if (data.length === 0) return;
    const s = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: isBull ? 'rgba(0,200,0,0.4)' : 'rgba(200,0,0,0.4)',
      bottomColor: isBull ? 'rgba(0,200,0,0.1)' : 'rgba(200,0,0,0.1)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    s.setData(data);
    list.push(s);
  }

  for (const p1 of span1Shifted) {
    const key = JSON.stringify(p1.time);
    const v2 = span2Map.get(key);

    if (v2 == null) {
      flushSegment(cloudBullSeriesList, currentBull, true);
      flushSegment(cloudBearSeriesList, currentBear, false);
      currentBull = [];
      currentBear = [];
      continue;
    }

    const upper = Math.max(p1.value, v2);
    const lower = Math.min(p1.value, v2);
    const isBull = p1.value >= v2;

    if (isBull) {
      if (currentBear.length) {
        flushSegment(cloudBearSeriesList, currentBear, false);
        currentBear = [];
      }
      currentBull.push({ time: p1.time, value: upper, lowerValue: lower });
    } else {
      if (currentBull.length) {
        flushSegment(cloudBullSeriesList, currentBull, true);
        currentBull = [];
      }
      currentBear.push({ time: p1.time, value: upper, lowerValue: lower });
    }
  }

  flushSegment(cloudBullSeriesList, currentBull, true);
  flushSegment(cloudBearSeriesList, currentBear, false);

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
    if (p.value != null) upperMap.set(JSON.stringify(p.time), p.value);
  });
  bb.lower.forEach(p => {
    const key = JSON.stringify(p.time);
    if (p.value != null && upperMap.has(key)) {
      const u = upperMap.get(key);
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
  // 価格チャート専用ツールチップ（復活）
  // --------------------------------------
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  tooltip.style.position = "absolute";
  tooltip.style.display = "none";
  tooltip.style.pointerEvents = "none";
  tooltip.style.background = "rgba(0,0,0,0.7)";
  tooltip.style.color = "#fff";
  tooltip.style.padding = "6px 8px";
  tooltip.style.borderRadius = "4px";
  tooltip.style.fontSize = "12px";
  chartContainer.appendChild(tooltip);

  priceChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.seriesPrices) {
      tooltip.style.display = "none";
      return;
    }

    const candle = param.seriesPrices.get(candleSeries);
    if (!candle) {
      tooltip.style.display = "none";
      return;
    }

    tooltip.innerHTML = `
      <div>${param.time.year}/${param.time.month}/${param.time.day}</div>
      <div>O: ${candle.open}</div>
      <div>H: ${candle.high}</div>
      <div>L: ${candle.low}</div>
      <div>C: ${candle.close}</div>
    `;

    tooltip.style.left = (param.point.x + 10) + "px";
    tooltip.style.top = (param.point.y + 10) + "px";
    tooltip.style.display = "block";
  });

  return { chart: priceChart };
}

// --------------------------------------
// businessDay に日数を加算する関数
// --------------------------------------
function addDaysToBusinessDay(businessDay, days) {
  const d = new Date(businessDay.year, businessDay.month - 1, businessDay.day);
  d.setDate(d.getDate() + days);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}
