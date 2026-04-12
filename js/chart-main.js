// --------------------------------------
// chart-main.js
// モーダル制御・チャート描画の司令塔
// --------------------------------------

function updateVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
updateVh();
window.addEventListener('resize', updateVh);

const modal = document.getElementById("chartModal");
const closeBtn = document.getElementById("closeChartBtn");
const chartContainer = document.getElementById("chartContainer");
const rciContainer = document.getElementById("rciContainer");
const macdContainer = document.getElementById("macdContainer");
const chartLoadingOverlay = document.getElementById("chartLoadingOverlay");

const headerLeft = document.getElementById("chartHeaderLeft");
const prevBtn = document.getElementById("prevChartBtn");
const nextBtn = document.getElementById("nextChartBtn");

const settingsBtn = document.getElementById("chartSettingsBtn");
const settingsModal = document.getElementById("chartSettingsModal");
const toggleCandlesCheckbox = document.getElementById("toggleCandles");

modal.style.display = "none";

let priceChart = null;
let rciChart = null;
let macdChart = null;

let currentIndex = 0;
let screeningResults = [];

let isSyncing = false;

window.setScreeningResults = function(results) {
  screeningResults = results;
};

function closeModal() {
  modal.style.display = "none";

  if (priceChart) priceChart.remove();
  if (rciChart) rciChart.remove();
  if (macdChart) macdChart.remove();

  chartContainer.innerHTML = "";
  rciContainer.innerHTML = "";
  macdContainer.innerHTML = "";
}

closeBtn.addEventListener("click", closeModal);
document.querySelector(".modal-backdrop").addEventListener("click", closeModal);

function waitForHeight(callback) {
  const h = chartContainer.getBoundingClientRect().height;
  if (h > 0) callback();
  else setTimeout(() => waitForHeight(callback), 30);
}

window.openChartModal = function(ticker, name, index) {
  currentIndex = index;

  headerLeft.innerHTML = `
    <span class="ticker">${ticker}</span>
    <span class="name">${name}</span>
    <span class="page">（${currentIndex + 1}/${screeningResults.length}）</span>
  `;

  modal.style.display = "flex";
  chartLoadingOverlay.style.display = "flex";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      waitForHeight(() => drawChart(ticker, name));
    });
  });
};

window.showPrev = function() {
  if (screeningResults.length === 0) return;
  currentIndex = (currentIndex - 1 + screeningResults.length) % screeningResults.length;
  const r = screeningResults[currentIndex];
  window.openChartModal(r.コード, r.銘柄名, currentIndex);
};

window.showNext = function() {
  if (screeningResults.length === 0) return;
  currentIndex = (currentIndex + 1) % screeningResults.length;
  const r = screeningResults[currentIndex];
  window.openChartModal(r.コード, r.銘柄名, currentIndex);
};

prevBtn.onclick = window.showPrev;
nextBtn.onclick = window.showNext;

window.addEventListener("keydown", (e) => {
  if (modal.style.display !== "flex") return;
  if (e.key === "ArrowLeft") window.showPrev();
  if (e.key === "ArrowRight") window.showNext();
});

settingsBtn.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!settingsModal.contains(e.target) && e.target !== settingsBtn) {
    settingsModal.classList.add("hidden");
  }
});

toggleCandlesCheckbox.addEventListener("change", (e) => {
  showCandles = e.target.checked;
  if (candleSeries) applyCandleVisibility();
});

// ------------------------------
// drawChart（司令塔）
// ------------------------------
async function drawChart(ticker, name) {
  const data = await fetchChartData(ticker);
  if (!data) {
    alert("チャートデータが取得できませんでした。");
    chartLoadingOverlay.style.display = "none";
    return;
  }

  const tradingData = data.filter(d => d.volume != null && d.volume > 0);

  if (priceChart) priceChart.remove();
  if (rciChart) rciChart.remove();
  if (macdChart) macdChart.remove();

  chartContainer.innerHTML = "";
  rciContainer.innerHTML = "";
  macdContainer.innerHTML = "";

  const rect = chartContainer.getBoundingClientRect();
  priceChart = LightweightCharts.createChart(chartContainer, {
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
      fixLeftEdge: true,
      fixRightEdge: true,
      tickMarkSpacing: 50,
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

  createPriceChart(priceChart, tradingData);

  const price = { chart: priceChart };

  const rci = createRciChart(tradingData);
  const macd = createMacdChart(tradingData);

  bindTimeSync(price.chart, [rci.chart, macd.chart]);
  bindTimeSync(rci.chart, [price.chart, macd.chart]);
  bindTimeSync(macd.chart, [price.chart, rci.chart]);

  setupResize(price.chart, rci.chart, macd.chart);

  applyDefaultRange(price.chart, rci.chart, macd.chart, tradingData);

  chartLoadingOverlay.style.display = "none";
}
