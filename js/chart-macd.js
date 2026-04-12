// --------------------------------------
– chart-macd.js
// MACD チャート生成
// --------------------------------------

function createMacdChart(candleData) {

  const container = document.getElementById("macdContainer");
  const rect = container.getBoundingClientRect();

  const macdChart = LightweightCharts.createChart(container, {
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

  macdChart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const d = new Date(time * 1000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    },
  });

  // MACD 計算（UNIX秒 time 前提）
  const { macdLine, signalLine, histogram } = calcMACD(candleData);

  const macdLineSeries = macdChart.addLineSeries({
    color: '#ff0000',
    lineWidth: 2,
  });

  const signalSeries = macdChart.addLineSeries({
    color: '#0000ff',
    lineWidth: 2,
  });

  const histSeries = macdChart.addHistogramSeries({
    color: '#888888',
  });

  macdLineSeries.setData(macdLine);
  signalSeries.setData(signalLine);
  histSeries.setData(histogram);

  return {
    chart: macdChart,
    macdLineSeries,
    signalSeries,
    histSeries,
  };
}
