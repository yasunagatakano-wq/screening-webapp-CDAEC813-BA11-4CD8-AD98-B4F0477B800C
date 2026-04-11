// --------------------------------------
// chart-main.js
// モーダル制御・チャート描画の司令塔
// --------------------------------------

// iPhone Safari の余白対策
function updateVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
updateVh();
window.addEventListener('resize', updateVh);

// 要素取得
const modal = document.getElementById("chartModal");
const closeBtn = document.getElementById("closeChartBtn");
const chartContainer = document.getElementById("chartContainer");
const rciContainer = document.getElementById("rciContainer");
const macdContainer = document.getElementById("macdContainer");
const chartLoadingOverlay = document.getElementById("chartLoadingOverlay");

const headerLeft = document.getElementById("chartHeaderLeft");
const prevBtn = document.getElementById("prevChartBtn");
const nextBtn = document.getElementById("nextChartBtn");

// 設定 UI
const settingsBtn = document.getElementById("chartSettingsBtn");
const settingsModal = document.getElementById("chartSettingsModal");
const toggleCandlesCheckbox = document.getElementById("toggleCandles");

// 初期状態ではモーダル非表示
modal.style.display = "none";

// チャートインスタンス（chart-price.js / chart-rci.js / chart-macd.js が代入する）
let priceChart = null;
let rciChart = null;
let macdChart = null;

// RCI / MACD のシリーズ（chart-rci.js / chart-macd.js が代入する）
let rciShortSeries = null;
let rciLongSeries = null;

let macdLineSeries = null;
let macdSignalSeries = null;
let macdHistSeries = null;

let currentIndex = 0;
let screeningResults = [];

let isSyncing = false;

// screening.js から結果を受け取る
window.setScreeningResults = function(results) {
  screeningResults = results;
};

// モーダルを閉じる
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

// chartContainer の高さが確定するまで待つ
function waitForHeight(callback) {
  const h = chartContainer.getBoundingClientRect().height;
  if (h > 0) callback();
  else setTimeout(() => waitForHeight(callback), 30);
}

// モーダルを開く
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

// 前へ・次へ
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

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (modal.style.display !== "flex") return;
  if (e.key === "ArrowLeft") window.showPrev();
  if (e.key === "ArrowRight") window.showNext();
});

// 歯車アイコン → 子モーダル
settingsBtn.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
});

// 子モーダル外クリックで閉じる
document.addEventListener("click", (e) => {
  if (!settingsModal.contains(e.target) && e.target !== settingsBtn) {
    settingsModal.classList.add("hidden");
  }
});

// ローソク足の見た目切り替え（chart-price.js の applyCandleVisibility を呼ぶ）
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

  // 既存チャート破棄
  if (priceChart) priceChart.remove();
  if (rciChart) rciChart.remove();
  if (macdChart) macdChart.remove();

  chartContainer.innerHTML = "";
  rciContainer.innerHTML = "";
  macdContainer.innerHTML = "";

  // 価格チャート生成
  const price = createPriceChart(data);

  // RCIチャート生成
  const rci = createRciChart(data);

  // MACDチャート生成
  const macd = createMacdChart(data);

  // 同期処理
  bindTimeSync(price.chart, [rci.chart, macd.chart]);
  bindTimeSync(rci.chart, [price.chart, macd.chart]);
  bindTimeSync(macd.chart, [price.chart, rci.chart]);

  // リサイズ処理
  setupResize(price.chart, rci.chart, macd.chart);

  // デフォルト表示期間
  applyDefaultRange(price.chart, rci.chart, macd.chart, data);

  chartLoadingOverlay.style.display = "none";
}
