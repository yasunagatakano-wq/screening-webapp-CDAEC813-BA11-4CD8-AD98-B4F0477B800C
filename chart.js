const modal = document.getElementById("chartModal");
const modalTitle = document.getElementById("chartModalTitle");
const closeBtn = document.getElementById("closeChartBtn");
const chartContainer = document.getElementById("chartContainer");

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

// screening.js から結果を受け取る
window.setScreeningResults = function(results) {
  screeningResults = results;
};

// モーダルを閉じる
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";

  // ★ LightweightCharts には remove() が存在しないため削除
  chartContainer.innerHTML = "";
  tvChart = null;
});

// ★ chartContainer の高さが入るまで待つ
function waitForHeight(callback) {
  const h = chartContainer.getBoundingClientRect().height;
  if (h > 0) {
    callback();
  } else {
    setTimeout(() => waitForHeight(callback), 30);
  }
}

// ★ モーダルを開く（レイアウト確定後に描画）
window.openChartModal = function(ticker, name, index) {
  currentIndex = index;
  modalTitle.textContent = `${ticker} ${name}`;
  modal.style.display = "flex";

  // レイアウト確定を2フレーム待つ（最重要）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      waitForHeight(() => drawChart(ticker));
    });
  });
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
  if (diff > 80) window.showPrev();
  if (diff < -80) window.showNext();
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

  const dates = Object.keys(json.Close).sort((a, b) => Number(a) - Number(b));

  const candleData = dates.map(d => ({
    time: Math.floor(Number(d) / 1000),
    open: json.Open[d],
    high: json.High[d],
    low: json.Low[d],
    close: json.Close[d],
    volume: json.Volume[d]
  }));

  // 移動平均計算
  function calcMA(period) {
    const result = [];
    for (let i = 0; i < candleData.length; i++) {
      if (i < period) {
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

  // 既存チャート破棄（remove() は使わない）
  chartContainer.innerHTML = "";
  tvChart = null;

  const rect = chartContainer.getBoundingClientRect();

  console.log("createChart 実行");

  // ★ 正しい LightweightCharts の createChart を呼ぶ
  tvChart = LightweightCharts.createChart(chartContainer, {
    width: rect.width,
    height: rect.height,
    layout: {
      background: { color: '#ffffff' },
      textColor: '#333',
    },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
    },
    grid: {
      vertLines: { color: '#eee' },
      horzLines: { color: '#eee' },
    },
  });

  // ローソク足
  candleSeries = tvChart.addCandlestickSeries({
    upColor: 'red',
    downColor: 'blue',
    borderUpColor: 'red',
    borderDownColor: 'blue',
    wickUpColor: 'red',
    wickDownColor: 'blue',
  });
  candleSeries.setData(candleData);

  // 出来高
  volumeSeries = tvChart.addHistogramSeries({
    priceFormat: { type: 'volume' },
    priceScaleId: 'volume',
    scaleMargins: { top: 0.8, bottom: 0 },
  });
  volumeSeries.setData(
    candleData.map(c => ({
      time: c.time,
      value: c.volume,
      color: 'rgba(128,128,128,0.6)',
    }))
  );

  // 価格スケール調整
  candleSeries.priceScale().applyOptions({
    scaleMargins: { top: 0.05, bottom: 0.25 },
  });

  // MA シリーズ
  function addMA(color, data) {
    const s = tvChart.addLineSeries({ color, lineWidth: 1 });
    s.setData(data.filter(p => p.value !== null));
    return s;
  }

  ma5Series = addMA('green', ma5);
  ma25Series = addMA('orange', ma25);
  ma50Series = addMA('brown', ma50);
  ma75Series = addMA('purple', ma75);
  ma100Series = addMA('#0099cc', ma100);

  // リサイズ対応
  window.addEventListener('resize', () => {
    if (!tvChart) return;
    const r = chartContainer.getBoundingClientRect();
    tvChart.applyOptions({ width: r.width, height: r.height });
  });

  tvChart.timeScale().fitContent();
}
