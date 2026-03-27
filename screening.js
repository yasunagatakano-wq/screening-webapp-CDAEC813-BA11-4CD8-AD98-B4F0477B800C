const modal = document.getElementById("chartModal");
const modalTitle = document.getElementById("chartModalTitle");
const closeBtn = document.getElementById("closeChartBtn");
const canvas = document.getElementById("chartCanvas");
let chartInstance = null;

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

function openChartModal(ticker, name) {
  modalTitle.textContent = `${ticker} ${name}`;
  modal.style.display = "block";
  drawChart(ticker);
}

async function drawChart(ticker) {
  const url = `https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com/chart_full?symbol=${ticker}.T`;

  let json;
  try {
    const res = await fetch(url);
    json = await res.json();
  } catch (e) {
    alert("チャートの取得に失敗しました。");
    return;
  }

  if (!json || !json.Close) {
    alert("チャートデータが取得できませんでした。");
    return;
  }

  // yfinance の JSON は {Open: {date: value}, ...} の形式
  const dates = Object.keys(json.Close);

  const chartData = dates.map(d => ({
    date: d,
    open: json.Open[d],
    high: json.High[d],
    low: json.Low[d],
    close: json.Close[d],
    volume: json.Volume[d]
  }));

  const labels = chartData.map(d => d.date);
  const closes = chartData.map(d => d.close);

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "終値",
          data: closes,
          borderColor: "blue",
          borderWidth: 2,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { display: true },
        y: { display: true }
      }
    }
  });
}
