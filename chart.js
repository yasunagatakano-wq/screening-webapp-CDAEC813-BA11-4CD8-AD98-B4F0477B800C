const modal = document.getElementById("chartModal");
const modalTitle = document.getElementById("chartModalTitle");
const closeBtn = document.getElementById("closeChartBtn");
const canvas = document.getElementById("chartCanvas");

let chartInstance = null;
let currentIndex = 0;
let screeningResults = [];

// screening.js から結果を受け取る
window.setScreeningResults = function(results) {
  screeningResults = results;
};

// モーダルを閉じる
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});

// モーダルを開く
window.openChartModal = function(ticker, name, index) {
  currentIndex = index;
  modalTitle.textContent = `${ticker} ${name}`;
  modal.style.display = "block";
  drawChart(ticker);
};

// 前へ
window.showPrev = function() {
  if (currentIndex > 0) {
    currentIndex--;
    const r = screeningResults[currentIndex];
    window.openChartModal(r.コード, r.銘柄名, currentIndex);
  }
};

// 次へ
window.showNext = function() {
  if (currentIndex < screeningResults.length - 1) {
    currentIndex++;
    const r = screeningResults[currentIndex];
    window.openChartModal(r.コード, r.銘柄名, currentIndex);
  }
};

// スマホのフリック操作
let touchStartX = 0;
modal.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].clientX;
});

modal.addEventListener("touchend", (e) => {
  const diff = e.changedTouches[0].clientX - touchStartX;
  if (diff > 80) window.showPrev();     // 右フリック → 前へ
  if (diff < -80) window.showNext();    // 左フリック → 次へ
});

// チャート描画
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

  const dates = Object.keys(json.Close);

  const chartData = dates.map(d => ({
    t: new Date(d),
    o: json.Open[d],
    h: json.High[d],
    l: json.Low[d],
    c: json.Close[d],
    v: json.Volume[d]
  }));

  // 移動平均計算
  function calcMA(period) {
    return chartData.map((d, i) => {
      if (i < period) return null;
      const slice = chartData.slice(i - period, i);
      const avg = slice.reduce((s, x) => s + x.c, 0) / period;
      return { x: d.t, y: avg };
    });
  }

  const ma5 = calcMA(5);
  const ma25 = calcMA(25);
  const ma50 = calcMA(50);
  const ma75 = calcMA(75);
  const ma100 = calcMA(100);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: "candlestick",
    data: {
      datasets: [
        {
          label: "ローソク足",
          data: chartData,
          borderColor: {
            up: "blue",
            down: "red",
            unchanged: "gray"
          },
          color: {
            up: "blue",
            down: "red",
            unchanged: "gray"
          }
        },
        {
          label: "出来高",
          type: "bar",
          data: chartData.map(d => ({ x: d.t, y: d.v })),
          yAxisID: "volume",
          backgroundColor: "rgba(128,128,128,0.4)",
          barThickness: 4
        },
        { label: "MA5", data: ma5, borderColor: "green", type: "line", pointRadius: 0 },
        { label: "MA25", data: ma25, borderColor: "orange", type: "line", pointRadius: 0 },
        { label: "MA50", data: ma50, borderColor: "brown", type: "line", pointRadius: 0 },
        { label: "MA75", data: ma75, borderColor: "purple", type: "line", pointRadius: 0 },
        { label: "MA100", data: ma100, borderColor: "#0099cc", type: "line", pointRadius: 0 }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: { unit: "day", tooltipFormat: "yyyy-MM-dd" }
        },
        y: {
          position: "right"
        },
        volume: {
          position: "left",
          beginAtZero: true,
          grid: { display: false }
        }
      }
    }
  });
}
