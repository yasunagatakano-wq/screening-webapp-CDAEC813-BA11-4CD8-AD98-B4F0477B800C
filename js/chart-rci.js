// --------------------------------------
// chart-rci.js
// RCI チャート生成（UNIX秒統一版）
// --------------------------------------

function createRciChart(candleData) {

  const container = document.getElementById("rciContainer");
  const rect = container.getBoundingClientRect();

  const rciChart = LightweightCharts.createChart(container, {
    width: rect.width,
    height: rect.height,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: { visible: true },
    timeScale: {
      borderVisible: true,
      timeVisible: false,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
  });

  rciChart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const d = new Date(time * 1000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    },
  });

  // RCI 計算（UNIX秒 time 前提）
  const rciShort = calcRCI(candleData, 9);
  const rciLong  = calcRCI(candleData, 26);

  // ★ addLineSeries ではなく addSeries を使う（chart-price.js と統一）
  const shortSeries = rciChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff0000',
    lineWidth: 2,
  });

  const longSeries = rciChart.addSeries(LightweightCharts.LineSeries, {
    color: '#0000ff',
    lineWidth: 2,
  });

  shortSeries.setData(rciShort);
  longSeries.setData(rciLong);

  return {
    chart: rciChart,
    shortSeries,
    longSeries,
  };
}
