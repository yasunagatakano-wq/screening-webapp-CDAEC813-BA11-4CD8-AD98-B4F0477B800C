let currentChart = null;

const chartModal = document.getElementById("chartModal");
const chartTitle = document.getElementById("chartTitle");
const closeChartBtn = document.getElementById("closeChart");
const chartCanvas = document.getElementById("chartCanvas");

closeChartBtn.addEventListener("click", closeChartModal);
chartModal.addEventListener("click", e => {
  if (e.target === chartModal || e.target.classList.contains("modal-backdrop")) {
    closeChartModal();
  }
});

function openChartModal(ticker, name) {
  chartTitle.textContent = `${ticker} ${name} - 日足チャート`;
  chartModal.classList.remove("hidden");
  drawChart(ticker);
}

function closeChartModal() {
  chartModal.classList.add("hidden");
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }
}

async function drawChart(ticker) {
  if (currentChart) {
    currentChart.destroy();
    currentChart = null;
  }

  const ctx = chartCanvas.getContext("2d");
  chartCanvas.width = chartCanvas.clientWidth;
  chartCanvas.height = 320;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.T?interval=1d&range=1mo`;
    const res = await fetch(url);
    const json = await res.json();
    const result = json.chart.result[0];
    const q = result.indicators.quote[0];
    const timestamps = result.timestamp;

    const candleData = [];
    const volumeData = [];

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i] * 1000;
      const o = q.open[i];
      const h = q.high[i];
      const l = q.low[i];
      const c = q.close[i];
      const v = q.volume[i];

      if (o == null || h == null || l == null || c == null || v == null) continue;

      candleData.push({
        x: new Date(t),
        o, h, l, c
      });

      volumeData.push({
        x: new Date(t),
        y: v
      });
    }

    currentChart = new Chart(ctx, {
      type: 'candlestick',
      data: {
        datasets: [
          {
            label: 'ローソク足',
            data: candleData,
            borderColor: '#111827'
          },
          {
            type: 'bar',
            label: '出来高',
            data: volumeData,
            yAxisID: 'volume',
            backgroundColor: 'rgba(37, 99, 235, 0.4)',
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            time: {
              unit: 'day'
            }
          },
          y: {
            position: 'left',
            title: { display: true, text: '価格' }
          },
          volume: {
            position: 'right',
            title: { display: true, text: '出来高' },
            grid: { display: false }
          }
        },
        plugins: {
          legend: {
            labels: { boxWidth: 12, font: { size: 10 } }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        }
      }
    });
  } catch (e) {
    console.error(e);
    alert("チャートの取得に失敗しました。");
  }
}