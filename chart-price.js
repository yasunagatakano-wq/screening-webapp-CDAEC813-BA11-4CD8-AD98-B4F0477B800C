// --------------------------------------
// chart-price.js
// 価格チャート（ローソク足・MA・一目・BB・雲・出来高）
// --------------------------------------

// main.js で参照するため、グローバル変数を使用
// priceChart, candleSeries, volumeSeries, maXXSeries などは main.js 側で宣言済み

function createPriceChart(candleData) {
  const rect = chartContainer.getBoundingClientRect();

  // ------------------------------
  // チャート生成
  // ------------------------------
  priceChart = LightweightCharts.createChart(chartContainer, {
    width: rect.width,
    height: rect.height,
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

  priceChart.applyOptions({
    localization: { dateFormat: 'yyyy/MM/dd' },
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

  // main.js の設定 UI と連動
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
  // 一目均衡表
  // ------------------------------
  const ichimoku = calcIchimoku(candleData);

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
  ichimokuSpan1Series.setData(ichimoku.span1.filter(p => p.value !== null));

  ichimokuSpan2Series = priceChart.addSeries(LightweightCharts.LineSeries, {
    color: 'rgba(128, 0, 128, 1)',
    lineWidth: 1,
  });
  ichimokuSpan2Series.setData(ichimoku.span2.filter(p => p.value !== null));

  // 雲（先行スパン1・2の間）
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
        time: p.time,
        value: Math.max(v1, v2),
        lowerValue: Math.min(v1, v2),
      });
    }
  });

  if (cloudData.length > 0) {
    const cloudSeries = priceChart.addSeries(LightweightCharts.AreaSeries, {
      topColor: 'rgba(0, 200, 0, 0.3)',
      bottomColor: 'rgba(200, 0, 200, 0.3)',
      lineColor: 'rgba(0,0,0,0)',
      lineWidth: 0,
    });
    cloudSeries.setData(cloudData);
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
  // 価格チャートのツールチップ
  // ------------------------------
  const tooltipEl = document.createElement('div');
  tooltipEl.style.position = 'absolute';
  tooltipEl.style.display = 'none';
  tooltipEl.style.padding = '8px';
  tooltipEl.style.background = 'rgba(255,255,255,0.9)';
  tooltipEl.style.border = '1px solid #ccc';
  tooltipEl.style.borderRadius = '4px';
  tooltipEl.style.fontSize = '12px';
  tooltipEl.style.pointerEvents = 'none';
  tooltipEl.style.zIndex = '2100';
  chartContainer.appendChild(tooltipEl);

  priceChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.seriesData.size || !param.point) {
      tooltipEl.style.display = 'none';
      return;
    }

    const candle = param.seriesData.get(candleSeries);
    const volume = param.seriesData.get(volumeSeries);

    const v5   = param.seriesData.get(ma5Series);
    const v25  = param.seriesData.get(ma25Series);
    const v50  = param.seriesData.get(ma50Series);
    const v75  = param.seriesData.get(ma75Series);
    const v100 = param.seriesData.get(ma100Series);

    if (!candle) {
      tooltipEl.style.display = 'none';
      return;
    }

    const JST_OFFSET = 9 * 60 * 60 * 1000;
    const date = new Date(param.time * 1000 + JST_OFFSET);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');

    tooltipEl.style.display = 'block';

    const tooltipWidth = tooltipEl.offsetWidth;
    const containerWidth = chartContainer.clientWidth;

    let left = param.point.x + 20;
    if (left + tooltipWidth > containerWidth) {
      left = param.point.x - tooltipWidth - 20;
    }
    if (left < 0) left = 0;

    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = param.point.y + 20 + 'px';

    tooltipEl.innerHTML = `
      <div>日付: ${y}/${m}/${d}</div>
      <div>始値: ${candle.open.toLocaleString()}</div>
      <div>高値: ${candle.high.toLocaleString()}</div>
      <div>安値: ${candle.low.toLocaleString()}</div>
      <div>終値: ${candle.close.toLocaleString()}</div>
      <div>出来高: ${volume ? volume.value.toLocaleString() : ''}</div>
      <hr>
      <div>5MA: ${v5 && v5.value ? v5.value.toFixed(2) : '-'}</div>
      <div>25MA: ${v25 && v25.value ? v25.value.toFixed(2) : '-'}</div>
      <div>50MA: ${v50 && v50.value ? v50.value.toFixed(2) : '-'}</div>
      <div>75MA: ${v75 && v75.value ? v75.value.toFixed(2) : '-'}</div>
      <div>100MA: ${v100 && v100.value ? v100.value.toFixed(2) : '-'}</div>
    `;
  });

  // ------------------------------
  // 返却（main.js で同期処理に使う）
  // ------------------------------
  return {
    chart: priceChart,
  };
}
