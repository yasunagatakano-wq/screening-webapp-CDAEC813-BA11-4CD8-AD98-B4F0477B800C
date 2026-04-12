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
    // range が null / from/to が null のときは何もしない
    if (!range || range.from == null || range.to == null || isSyncing) return;

    isSyncing = true;
    targetCharts.forEach(ch => {
      if (!ch) return;
      try {
        ch.timeScale().setVisibleRange(range);
      } catch (e) {
        // ここで落とさない
        console.warn('setVisibleRange error (ignored):', e);
      }
    });
    isSyncing = false;
  });
}

// ------------------------------
// リサイズ処理
// ------------------------------
function setupResize(priceChart, rciChart, macdChart) {
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
}

// ------------------------------
// デフォルト表示期間（直近 N 本）
// 「time の型に一切手を出さない」安全版
// ------------------------------
function applyDefaultRange(priceChart, rciChart, macdChart, candleData) {
  if (!candleData || candleData.length === 0) return;

  const len = candleData.length;
  const visibleCount = 80; // 直近80本くらい
  const fromIndex = Math.max(0, len - visibleCount);

  const from = candleData[fromIndex].time;
  const to   = candleData[len - 1].time;

  // from / to が null / undefined なら何もしない
  if (from == null || to == null) return;

  const range = { from, to };

  try { priceChart.timeScale().setVisibleRange(range); } catch (e) { console.warn(e); }
  try { rciChart.timeScale().setVisibleRange(range); }   catch (e) { console.warn(e); }
  try { macdChart.timeScale().setVisibleRange(range); }  catch (e) { console.warn(e); }
}
