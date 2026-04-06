// ------------------------------
// iPhone Safari の余白対策（追加）
// ------------------------------
function updateVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
updateVh();
window.addEventListener('resize', updateVh);

// ------------------------------
// ここから元の chart.js
// ------------------------------

const modal = document.getElementById("chartModal");
const modalTitle = document.getElementById("chartModalTitle");
const closeBtn = document.getElementById("closeChartBtn");
const chartContainer = document.getElementById("chartContainer");
const chartLoadingOverlay = document.getElementById("chartLoadingOverlay");

const headerLeft = document.getElementById("chartHeaderLeft");
const prevBtn = document.getElementById("prevChartBtn");
const nextBtn = document.getElementById("nextChartBtn");

// 初期状態ではモーダル非表示
modal.style.display = "none";

let tvChart = null;
let candleSeries = null;
let volumeSeries = null;
let ma5Series = null;
let ma25Series = null;
let ma50Series = null;
let ma75Series = null;
let ma100Series = null;

let currentIndex = 0;
let screeningResults = [];

let tooltipEl = null;

// screening.js から結果を受け取る
window.setScreeningResults = function(results) {
  screeningResults = results;
};

// モーダルを閉じる
function closeModal() {
  modal.style.display = "none";

  if (tvChart) {
    tvChart.remove();
    tvChart = null;
  }

  chartContainer.innerHTML = "";
}

closeBtn.addEventListener("click", closeModal);
document.querySelector(".modal-backdrop").addEventListener("click", closeModal);

// chartContainer の高さが確定するまで待つ
function waitForHeight(callback) {
  const h = chartContainer.getBoundingClientRect().height;
  if (h > 0) {
    callback();
  } else {
    setTimeout(() => waitForHeight(callback), 30);
  }
}

// モーダルを開く
window.openChartModal = function(ticker, name, index) {
  currentIndex = index;

  // ヘッダーに銘柄情報を表示
  headerLeft.textContent = `${ticker} ${name}（${currentIndex + 1}/${screeningResults.length}）`;

  modal.style.display = "flex";

  // ローディング表示
  chartLoadingOverlay.style.display = "flex";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      waitForHeight(() => drawChart(ticker, name));
    });
  });
};

// 前へ
window.showPrev = function() {
  if (screeningResults.length === 0) return;

  currentIndex = (currentIndex - 1 + screeningResults.length) % screeningResults.length;
  const r = screeningResults[currentIndex];
  window.openChartModal(r.コード, r.銘柄名, currentIndex);
};

// 次へ
window.showNext = function() {
  if (screeningResults.length === 0) return;

  currentIndex = (currentIndex + 1) % screeningResults.length;
  const r = screeningResults[currentIndex];
  window.openChartModal(r.コード, r.銘柄名, currentIndex);
};

// ボタンイベント
prevBtn.onclick = window.showPrev;
nextBtn.onclick = window.showNext;

// キーボード操作
window.addEventListener("keydown", (e) => {
  if (modal.style.display !== "flex") return;

  if (e.key === "ArrowLeft") window.showPrev();
  if (e.key === "ArrowRight") window.showNext();
});

// ------------------------------
// スワイプ操作（チャート領域は除外）
// ------------------------------
let touchStartX = 0;

modal.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].clientX;
});

modal.addEventListener("touchend", (e) => {

  // ★ チャート領域ならフリック判定を無効化
  if (e.target.closest("#chartContainer")) {
    return;
  }

  const diff = e.changedTouches[0].clientX - touchStartX;
  if (diff > 80) window.showPrev();
  if (diff < -80) window.showNext();
});

// ------------------------------
// チャート描画
// ------------------------------
async function drawChart(ticker, name) {
  const API_BASE_URL = "https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com";
  const url = `${API_BASE_URL}/chart?ticker=${ticker}`;

  let json;
  try {
    const res = await fetch(url);
    json = await res.json();
  } catch (e) {
    alert("チャートの取得に失敗しました。");
    chartLoadingOverlay.style.display = "none";
    return;
  }

  if (!json || !json.Close) {
    alert("チャートデータが取得できませんでした。");
    chartLoadingOverlay.style.display = "none";
    return;
  }

  const dates = Object.keys(json.Close).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const candleData = dates.map(d => ({
    time: Math.floor(new Date(d).getTime() / 1000),
    open: json.Open[d],
    high: json.High[d],
    low: json.Low[d],
    close: json.Close[d],
    volume: json.Volume[d]
  }));

  // 移動平均
  function calcMA(period) {
    const result = [];
    for (let i = 0; i < candleData.length; i++) {
      if (i < period - 1) {
        result.push({ time: candleData[i].time, value: null });
        continue;
      }
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candleData[j].close;
      }
      result.push({ time: candleData[i].time, value: sum / period });
    }
    return result;
  }

  const ma5 = calcMA(5);
  const ma25 = calcMA(25);
  const ma50 = calcMA(50);
  const ma75 = calcMA(75);
  const ma100 = calcMA(100);

  // 既存チャート破棄
  if (tvChart) {
    tvChart.remove();
    tvChart = null;
  }
  chartContainer.innerHTML = "";

  const rect = chartContainer.getBoundingClientRect();

  tvChart = LightweightCharts.createChart(chartContainer, {
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

  tvChart.applyOptions({
    localization: {
      dateFormat: 'yyyy/MM/dd',
    },
  });

  tvChart.timeScale().applyOptions({
    tickMarkFormatter: (time) => {
      const date = new Date(time * 1000);
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}`;
    },
  });

  // ローソク足
  candleSeries = tvChart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });
  candleSeries.setData(candleData);

  // 出来高
  volumeSeries = tvChart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
    color: 'rgba(128,128,128,0.6)',
  });
  volumeSeries.setData(
    candleData.map(c => ({
      time: c.time,
      value: c.volume,
    }))
  );

  candleSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.05, bottom: 0.25 },
  });

  // MA
  function addMA(color, data) {
    const s = tvChart.addSeries(LightweightCharts.LineSeries, {
      color,
      lineWidth: 1
    });
    s.setData(data.filter(p => p.value !== null));
    return s;
  }

  ma5Series = addMA('#ff1493', ma5);
  ma25Series = addMA('#00aa00', ma25);
  ma50Series = addMA('#0000ff', ma50);
  ma75Series = addMA('#aa00aa', ma75);
  ma100Series = addMA('#ffaa00', ma100);

  // ツールチップ
  tooltipEl = document.createElement('div');
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

  tvChart.subscribeCrosshairMove(param => {
    if (!param.time || !param.seriesData.size || !param.point) {
      tooltipEl.style.display = 'none';
      return;
    }

    const candle = param.seriesData.get(candleSeries);
    const volume = param.seriesData.get(volumeSeries);

    const v5 = param.seriesData.get(ma5Series);
    const v25 = param.seriesData.get(ma25Series);
    const v50 = param.seriesData.get(ma50Series);
    const v75 = param.seriesData.get(ma75Series);
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
    tooltipEl.style.left = param.point.x + 20 + 'px';
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

  // リサイズ対応
  window.addEventListener('resize', () => {
    if (!tvChart) return;
    const r = chartContainer.getBoundingClientRect();
    tvChart.applyOptions({ width: r.width, height: r.height });
  });

  tvChart.timeScale().fitContent();

  // ★ ローディング非表示
  chartLoadingOverlay.style.display = "none";
}
