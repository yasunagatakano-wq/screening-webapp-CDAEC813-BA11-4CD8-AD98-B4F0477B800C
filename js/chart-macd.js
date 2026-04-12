// --------------------------------------
// chart-macd.js
// MACDチャート（MACD・Signal・Histogram）
// --------------------------------------

function createMacdChart(candleDataRaw) {

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
      value: c.close
    };
  });

  const mRect = macdContainer.getBoundingClientRect();

  macdChart = LightweightCharts.createChart(macdContainer, {
    width: mRect.width || 400,
    height: mRect.height || 160,
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

  // businessDay を使うので tickMarkFormatter は不要
  macdChart.applyOptions({
    localization: {
      locale: 'ja-JP',
      dateFormat: 'yyyy/MM/dd',
    },
  });

  // --------------------------------------
  // 凡例
  // --------------------------------------
  const legend = document.createElement("div");
  legend.className = "chart-legend";
  legend.style.pointerEvents = "none";
  legend.innerHTML = `
    <div><strong>【MACD】</strong></div>
    <div><span style="color:#0000ff;">■</span> MACD</div>
    <div><span style="color:#ff0000;">■</span> Signal</div>
    <div><span style="color:rgba(0,128,0,0.8);">■</span> Histogram</div>
  `;
  macdContainer.style.position = "relative";
  macdContainer.appendChild(legend);

  // --------------------------------------
  // MACD 計算
  // --------------------------------------
  const macd = calcMACD(candleData, 12, 26, 9);

  macdLineSeries = macdChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 1,
  });
  macdLineSeries.setData(macd.macdData.filter(p => p.value !== null));

  macdSignalSeries = macdChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 1,
  });
  macdSignalSeries.setData(macd.signalData.filter(p => p.value !== null));

  macdHistSeries = macdChart.addSeries(LightweightCharts.HistogramSeries, {
    color: 'rgba(0, 128, 0, 0.6)',
    priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    scaleMargins: { top: 0.1, bottom: 0.1 },
  });
  macdHistSeries.setData(macd.histData.filter(p => p.value !== null));

  macdChart.priceScale('right').applyOptions({
    scaleMargins: { top: 0.1, bottom: 0.1 },
  });

  // --------------------------------------
  // MACD ツールチップ（復活）
  // --------------------------------------
  const macdTooltip = document.createElement('div');
  macdTooltip.style.position = 'absolute';
  macdTooltip.style.display = 'none';
  macdTooltip.style.padding = '6px';
  macdTooltip.style.background = 'rgba(255,255,255,0.9)';
  macdTooltip.style.border = '1px solid #ccc';
  macdTooltip.style.borderRadius = '4px';
  macdTooltip.style.fontSize = '12px';
  macdTooltip.style.pointerEvents = 'none';
  macdTooltip.style.zIndex = '2100';

  macdContainer.appendChild(macdTooltip);

  macdChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.point) {
      macdTooltip.style.display = 'none';
      return;
    }

    const macdVal   = param.seriesData.get(macdLineSeries);
    const signalVal = param.seriesData.get(macdSignalSeries);
    const histVal   = param.seriesData.get(macdHistSeries);

    const t = param.time; // businessDay

    macdTooltip.style.display = 'block';

    const tooltipWidth = macdTooltip.offsetWidth;
    const containerWidth = macdContainer.clientWidth;

    let left = param.point.x + 20;
    if (left + tooltipWidth > containerWidth) {
      left = param.point.x - tooltipWidth - 20;
    }
    if (left < 0) left = 0;

    macdTooltip.style.left = left + 'px';
    macdTooltip.style.top  = param.point.y + 20 + 'px';

    macdTooltip.innerHTML = `
      <div>日付: ${t.year}/${t.month}/${t.day}</div>
      <div>MACD: ${macdVal?.value?.toFixed(4) ?? '-'}</div>
      <div>Signal: ${signalVal?.value?.toFixed(4) ?? '-'}</div>
      <div>Hist: ${histVal?.value?.toFixed(4) ?? '-'}</div>
    `;
  });

  return { chart: macdChart };
}
