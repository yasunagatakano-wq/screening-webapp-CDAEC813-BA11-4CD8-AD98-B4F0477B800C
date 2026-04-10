// ------------------------------
// iPhone Safari の余白対策
// ------------------------------
function updateVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
updateVh();
window.addEventListener('resize', updateVh);

// ------------------------------
// 要素取得
// ------------------------------
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

// チャート関連
let priceChart = null;   // ① 価格チャート
let rciChart = null;     // ② RCIチャート
let macdChart = null;    // ③ MACDチャート

let candleSeries = null;
let volumeSeries = null;
let ma5Series = null;
let ma25Series = null;
let ma50Series = null;
let ma75Series = null;
let ma100Series = null;

// 一目均衡表
let ichimokuTenkanSeries = null;
let ichimokuKijunSeries = null;
let ichimokuSpan1Series = null;
let ichimokuSpan2Series = null;
let ichimokuChikouSeries = null;

// ボリンジャーバンド
let bbMidSeries = null;
let bbUpperSeries = null;
let bbLowerSeries = null;
let bbAreaSeries = null;

// RCI（短期・長期）
let rciShortSeries = null;
let rciLongSeries = null;

// MACD
let macdLineSeries = null;
let macdSignalSeries = null;
let macdHistSeries = null;

let currentIndex = 0;
let screeningResults = [];

let tooltipEl = null;

// ローソク足表示フラグ（見た目だけ切り替える）
let showCandles = true;

// 同期制御フラグ
let isSyncing = false;

// screening.js から結果を受け取る
window.setScreeningResults = function(results) {
  screeningResults = results;
};

// モーダルを閉じる
function closeModal() {
  modal.style.display = "none";

  if (priceChart) {
    priceChart.remove();
    priceChart = null;
  }
  if (rciChart) {
    rciChart.remove();
    rciChart = null;
  }
  if (macdChart) {
    macdChart.remove();
    macdChart = null;
  }

  chartContainer.innerHTML = "";
  if (rciContainer) rciContainer.innerHTML = "";
  if (macdContainer) macdContainer.innerHTML = "";
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
// 歯車アイコン → 子モーダル
// ------------------------------
settingsBtn.addEventListener("click", () => {
  settingsModal.classList.toggle("hidden");
});

// 子モーダル外クリックで閉じる
document.addEventListener("click", (e) => {
  if (!settingsModal.contains(e.target) && e.target !== settingsBtn) {
    settingsModal.classList.add("hidden");
  }
});

// ------------------------------
// ローソク足の見た目だけ切り替える関数
// ------------------------------
function applyCandleVisibility() {
  if (!candleSeries) return;

  if (showCandles) {
    candleSeries.applyOptions({
      upColor: 'red',
      downColor: 'blue',
      borderUpColor: 'red',
      borderDownColor: 'blue',
      wickUpColor: 'red',
      wickDownColor: 'blue',
    });
  } else {
    candleSeries.applyOptions({
      upColor: 'rgba(0,0,0,0)',
      downColor: 'rgba(0,0,0,0)',
      borderUpColor: 'rgba(0,0,0,0)',
      borderDownColor: 'rgba(0,0,0,0)',
      wickUpColor: 'rgba(0,0,0,0)',
      wickDownColor: 'rgba(0,0,0,0)',
    });
  }
}

// チェックボックスでローソク足表示切替（visible は変えない）
toggleCandlesCheckbox.addEventListener("change", (e) => {
  showCandles = e.target.checked;
  applyCandleVisibility();
});

// ------------------------------
// インジケータ計算関数
// ------------------------------
function calcMAFromData(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calcIchimoku(data) {
  const len = data.length;
  const tenkan = [];
  const kijun = [];
  const span1 = [];
  const span2 = [];
  const chikou = [];

  for (let i = 0; i < len; i++) {
    // 転換線 9
    if (i >= 8) {
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - 8; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      tenkan.push({ time: data[i].time, value: (high + low) / 2 });
    } else {
      tenkan.push({ time: data[i].time, value: null });
    }

    // 基準線 26
    if (i >= 25) {
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - 25; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      kijun.push({ time: data[i].time, value: (high + low) / 2 });
    } else {
      kijun.push({ time: data[i].time, value: null });
    }

    // 遅行スパン（26本前）
    if (i - 26 >= 0) {
      chikou.push({ time: data[i - 26].time, value: data[i].close });
    } else {
      chikou.push({ time: data[i].time, value: null });
    }
  }

  // 先行スパン1・2（26本先）
  for (let i = 0; i < len; i++) {
    const targetIndex = i + 26;
    if (targetIndex >= len) break;

    const t = tenkan[i].value;
    const k = kijun[i].value;

    if (t != null && k != null) {
      span1.push({
        time: data[targetIndex].time,
        value: (t + k) / 2,
      });
    } else {
      span1.push({
        time: data[targetIndex].time,
        value: null,
      });
    }

    if (i >= 51) {
      let high = -Infinity;
      let low = Infinity;
      for (let j = i - 51; j <= i; j++) {
        if (data[j].high > high) high = data[j].high;
        if (data[j].low < low) low = data[j].low;
      }
      span2.push({
        time: data[targetIndex].time,
        value: (high + low) / 2,
      });
    } else {
      span2.push({
        time: data[targetIndex].time,
        value: null,
      });
    }
  }

  return {
    tenkan,
    kijun,
    span1,
    span2,
    chikou,
  };
}

function calcBB(data, period = 20, k = 2) {
  const mid = [];
  const upper = [];
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      mid.push({ time: data[i].time, value: null });
      upper.push({ time: data[i].time, value: null });
      lower.push({ time: data[i].time, value: null });
      continue;
    }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j].close;
    }
    const mean = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - mean;
      variance += diff * diff;
    }
    variance /= period;
    const std = Math.sqrt(variance);

    mid.push({ time: data[i].time, value: mean });
    upper.push({ time: data[i].time, value: mean + k * std });
    lower.push({ time: data[i].time, value: mean - k * std });
  }

  return { mid, upper, lower };
}

function calcRCI(data, period = 9) {
  const result = [];
  const n = period;

  for (let i = 0; i < data.length; i++) {
    if (i < n - 1) {
      result.push({ time: data[i].time, value: null });
      continue;
    }

    const slice = data.slice(i - n + 1, i + 1);
    const timeRanks = [];
    for (let j = 0; j < n; j++) {
      timeRanks.push({ idx: j, rank: j + 1 });
    }

    const priceSorted = [...slice]
      .map((d, idx) => ({ idx, close: d.close }))
      .sort((a, b) => a.close - b.close);

    const priceRankMap = {};
    for (let r = 0; r < n; r++) {
      priceRankMap[priceSorted[r].idx] = r + 1;
    }

    let sumDiff2 = 0;
    for (let j = 0; j < n; j++) {
      const tRank = timeRanks[j].rank;
      const pRank = priceRankMap[j];
      const diff = tRank - pRank;
      sumDiff2 += diff * diff;
    }

    const rci =
      100 * (1 - (6 * sumDiff2) / (n * (n * n - 1)));

    result.push({ time: data[i].time, value: rci });
  }

  return result;
}

function calcEMA(values, period) {
  const k = 2 / (period + 1);
  const ema = [];
  let prev = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) {
      ema.push(null);
      continue;
    }
    if (prev == null) {
      prev = v;
    } else {
      prev = v * k + prev * (1 - k);
    }
    ema.push(prev);
  }
  return ema;
}

function calcMACD(data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  const closes = data.map(d => d.close);
  const emaShort = calcEMA(closes, shortPeriod);
  const emaLong = calcEMA(closes, longPeriod);

  const macd = [];
  for (let i = 0; i < data.length; i++) {
    if (emaShort[i] == null || emaLong[i] == null) {
      macd.push(null);
    } else {
      macd.push(emaShort[i] - emaLong[i]);
    }
  }

  const signal = calcEMA(macd, signalPeriod);
  const hist = [];
  for (let i = 0; i < data.length; i++) {
    if (macd[i] == null || signal[i] == null) {
      hist.push(null);
    } else {
      hist.push(macd[i] - signal[i]);
    }
  }

  const macdData = [];
  const signalData = [];
  const histData = [];

  for (let i = 0; i < data.length; i++) {
    macdData.push({ time: data[i].time, value: macd[i] });
    signalData.push({ time: data[i].time, value: signal[i] });
    histData.push({ time: data[i].time, value: hist[i] });
  }

  return { macdData, signalData, histData };
}

// ------------------------------
// チャート同期
// ------------------------------
function bindTimeSync(srcChart, targetCharts) {
  if (!srcChart) return;
  srcChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
    if (!range || isSyncing) return;
    isSyncing = true;
    targetCharts.forEach(ch => {
      if (!ch) return;
      ch.timeScale().setVisibleRange(range);
    });
    isSyncing = false;
  });
}

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
  const ma5 = calcMAFromData(candleData, 5);
  const ma25 = calcMAFromData(candleData, 25);
  const ma50 = calcMAFromData(candleData, 50);
  const ma75 = calcMAFromData(candleData, 75);
  const ma100 = calcMAFromData(candleData, 100);

  // 一目均衡表
  const ichimoku = calcIchimoku(candleData);

  // ボリンジャーバンド
  const bb = calcBB(candleData, 20, 2);

  // ★ RCI（短期・長期）
  const rciShort = calcRCI(candleData, 9);
  const rciLong  = calcRCI(candleData, 26);

  // MACD
  const macd = calcMACD(candleData, 12, 26, 9);

  // 既存チャート破棄
  if (priceChart) priceChart.remove();
  if (rciChart)   rciChart.remove();
  if (macdChart)  macdChart.remove();

  chartContainer.innerHTML = "";
  rciContainer.innerHTML = "";
  macdContainer.innerHTML = "";

  const rect = chartContainer.getBoundingClientRect();

  // ------------------------------
  // ① 価格チャート
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

  // ローソク足
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

  applyCandleVisibility();

  // 出来高
  volumeSeries = priceChart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
    color: 'rgba(128,128,128,0.6)',
  });
  volumeSeries.setData(
    candleData.map(c => ({ time: c.time, value: c.volume }))
  );

  // MA
  function addMA(color, data) {
    const s = priceChart.addSeries(LightweightCharts.LineSeries, {
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

  // 一目均衡表（転換線・基準線）
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

  // 先行スパン1・2
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

  // 雲
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

  // ボリンジャーバンド
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
  // ② RCIチャート（短期＋長期）
  // ------------------------------
  const rRect = rciContainer.getBoundingClientRect();
  rciChart = LightweightCharts.createChart(rciContainer, {
    width: rRect.width || rect.width,
    height: rRect.height || 160,
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

  // RCI短期（9）
  rciShortSeries = rciChart.addSeries(LightweightCharts.LineSeries, {
    color: '#ff1493',
    lineWidth: 1,
  });
  rciShortSeries.setData(rciShort.filter(p => p.value !== null));

  // RCI長期（26）
  rciLongSeries = rciChart.addSeries(LightweightCharts.LineSeries, {
    color: '#1e90ff',
    lineWidth: 1,
  });
  rciLongSeries.setData(rciLong.filter(p => p.value !== null));

  rciChart.priceScale('right').applyOptions({
    scaleMargins: { top: 0.1, bottom: 0.1 },
  });

  // ------------------------------
  // ③ MACDチャート
  // ------------------------------
  const mRect = macdContainer.getBoundingClientRect();
  macdChart = LightweightCharts.createChart(macdContainer, {
    width: mRect.width || rect.width,
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

    // ------------------------------
  // ツールチップ（価格チャートのみ）
  // ------------------------------
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

  priceChart.subscribeCrosshairMove(param => {
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
  // リサイズ対応
  // ------------------------------
  window.addEventListener('resize', () => {
    if (priceChart) {
      const r = chartContainer.getBoundingClientRect();
      priceChart.applyOptions({ width: r.width, height: r.height });
    }
    if (rciChart) {
      const r = rciContainer.getBoundingClientRect();
      rciChart.applyOptions({ width: r.width, height: r.height });
    }
    if (macdChart) {
      const r = macdContainer.getBoundingClientRect();
      macdChart.applyOptions({ width: r.width, height: r.height });
    }
  });

  // ------------------------------
  // デフォルト表示期間：直近4ヶ月
  // ------------------------------
  const lastTime = candleData[candleData.length - 1].time;
  const fourMonthsSec = 60 * 60 * 24 * 30 * 4;
  const fromTime = lastTime - fourMonthsSec;

  priceChart.timeScale().setVisibleRange({ from: fromTime, to: lastTime });
  rciChart.timeScale().setVisibleRange({ from: fromTime, to: lastTime });
  macdChart.timeScale().setVisibleRange({ from: fromTime, to: lastTime });

  // ------------------------------
  // 3チャート同期（スクロール・ズーム）
  // ------------------------------
  bindTimeSync(priceChart, [rciChart, macdChart]);
  bindTimeSync(rciChart,   [priceChart, macdChart]);
  bindTimeSync(macdChart,  [priceChart, rciChart]);

  // ------------------------------
  // ローディング非表示
  // ------------------------------
  chartLoadingOverlay.style.display = "none";
}
