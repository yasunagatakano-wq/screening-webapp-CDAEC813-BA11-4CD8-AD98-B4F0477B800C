// --------------------------------------
// chart-price.js（完全修正版）
// --------------------------------------

// ▼ 価格チャートで使用するシリーズ変数（chart-main.js には置かない）
let candleSeries;
let volumeSeries;
let ma5Series, ma25Series, ma50Series, ma75Series, ma100Series;
let ichimokuTenkanSeries, ichimokuKijunSeries;
let ichimokuSpan1Series, ichimokuSpan2Series, ichimokuChikouSeries;
let ichimokuCloudBullSeries, ichimokuCloudBearSeries;
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
function createPriceChart(candleData) {

  // priceChart は chart-main.js が管理するため、ここでは宣言しない
  const rect = chartContainer.getBoundingClientRect();

  const priceChart = LightweightCharts.createChart(chartContainer, {
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
      fixLeftEdge: false,
      fixRightEdge: false,
      allowShiftVisibleRangeOnResize: false,
      rightOffset: 0,
      barSpacing: 6,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
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

  // --------------------------------------
  // 凡例
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
  console.log("ICHIMOKU SAMPLE:", ichimoku.tenkan[30]);
  const shiftSec = 26 * 24 * 60 * 60;

  // 転換線
  ichimokuTenkanSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 1,
  });
  ichimokuTenkanSeries.setData(
    ichimoku.tenkan
      .filter(p => p.value !== null)
      .map(p => ({ time: p.time, value: p.value }))
  );

  // 基準線
  ichimokuKijunSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 1,
  });
  ichimokuKijunSeries.setData(
    ichimoku.kijun
      .filter(p => p.value !== null)
      .map(p => ({ time: p.time, value: p.value }))
  );

  // 先行スパン1（26日先）
  ichimokuSpan1Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(0, 128, 0, 1)',
    lineWidth: 1,
  });
  const span1Shifted = ichimoku.span1
    .filter(p => p.value !== null)
    .map(p => ({
      time: p.time + shiftSec,
      value: p.value,
    }));
  ichimokuSpan1Series.setData(span1Shifted);

  // 先行スパン2（26日先）
  ichimokuSpan2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(128, 0, 128, 1)',
    lineWidth: 1,
  });
  const span2Shifted = ichimoku.span2
    .filter(p => p.value !== null)
    .map(p => ({
      time: p.time + shiftSec,
      value: p.value,
    }));
  ichimokuSpan2Series.setData(span2Shifted);

  // --------------------------------------
  // 雲（上昇雲＝緑、下降雲＝赤）
  // --------------------------------------
  const span1Map = new Map();
  span1Shifted.forEach(p => {
    span1Map.set(p.time, p.value);
  });

  const bullCloud = [];
  const bearCloud = [];

  span2Shifted.forEach(p => {
    const t = p.time;
    const v2 = p.value;
    if (!span1Map.has(t)) return;
    const v1 = span1Map.get(t);

    const upper = Math.max(v1, v2);
    const lower = Math.min(v1, v2);

    if (v1 >= v2) {
      bullCloud.push({ time: t, value: upper, lowerValue: lower });
    } else {
      bearCloud.push({ time: t, value: upper, lowerValue: lower });
    }
  });

  if (bullCloud.length > 0) {
    ichimokuCloudBullSeries = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: 'rgba(0, 200, 0, 0.4)',
      bottomColor: 'rgba(0, 200, 0, 0.1)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    ichimokuCloudBullSeries.setData(bullCloud);
  }

  if (bearCloud.length > 0) {
    ichimokuCloudBearSeries = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: 'rgba(200, 0, 0, 0.4)',
      bottomColor: 'rgba(200, 0, 0, 0.1)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    ichimokuCloudBearSeries.setData(bearCloud);
  }

  // 遅行スパン
  ichimokuChikouSeries = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: '#008080',
    lineWidth: 1,
  });
  ichimokuChikouSeries.setData(
    ichimoku.chikou
      .filter(p => p.value !== null)
      .map(p => ({ time: p.time, value: p.value }))
  );

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

  // --------------------------------------
  // ツールチップ
  // --------------------------------------
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.position = 'absolute';
  tooltip.style.display = 'none';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.background = 'rgba(0,0,0,0.75)';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '6px 8px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '4000';
  chartContainer.appendChild(tooltip);

  priceChart.subscribeCrosshairMove(param => {
    if (!param || !param.time || !param.point) {
      tooltip.style.display = 'none';
      return;
    }

    const price = param.seriesPrices.get(candleSeries);
    if (!price) {
      tooltip.style.display = 'none';
      return;
    }

    const date = new Date(param.time * 1000);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    tooltip.innerHTML = `
      <div>${y}/${m}/${d}</div>
      <div>始値: ${price.open}</div>
      <div>高値: ${price.high}</div>
      <div>安値: ${price.low}</div>
      <div>終値: ${price.close}</div>
    `;

    const containerRect = chartContainer.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let x = param.point.x;
    let yPos = param.point.y;

    if (x + tooltipRect.width + 16 > containerRect.width) {
      x = x - tooltipRect.width - 8;
    } else {
      x = x + 8;
    }

    if (yPos + tooltipRect.height + 16 > containerRect.height) {
      yPos = containerRect.height - tooltipRect.height - 8;
    } else if (yPos < 0) {
      yPos = 8;
    }

    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${yPos}px`;
    tooltip.style.display = 'block';
  });

  return { chart: priceChart };
}
