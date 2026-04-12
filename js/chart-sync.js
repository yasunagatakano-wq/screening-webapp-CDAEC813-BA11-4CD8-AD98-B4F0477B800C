// --------------------------------------
// chart-sync.js
// チャート同期・リサイズ処理・初期表示範囲
// --------------------------------------

// ------------------------------
// チャート同期（スクロール・ズーム）
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
// businessDay に日数を加算する関数
// ------------------------------
function addDaysBD(bd, days) {
  const d = new Date(bd.year, bd.month - 1, bd.day);
  d.setDate(d.getDate() + days);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

// ------------------------------
// デフォルト表示期間（直近4ヶ月）
// ------------------------------
function applyDefaultRange(priceChart, rciChart, macdChart, candleData) {
  if (!candleData || candleData.length === 0) return;

  // candleData は businessDay
  const lastBD = candleData[candleData.length - 1].time;

  // 4ヶ月 ≒ 120日
  const fromBD = addDaysBD(lastBD, -120);

  const range = { from: fromBD, to: lastBD };

  priceChart.timeScale().setVisibleRange(range);
  rciChart.timeScale().setVisibleRange(range);
  macdChart.timeScale().setVisibleRange(range);
}
