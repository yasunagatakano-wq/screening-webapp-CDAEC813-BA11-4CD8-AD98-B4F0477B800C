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

    // range が null → 初期化中なので無視
    if (!range) return;

    // from/to が null → データがまだ無いので無視
    if (range.from == null || range.to == null) return;

    // ここで「同期先チャートがデータを持っているか」を確認
    for (const ch of targetCharts) {
      if (!ch) continue;

      const logical = ch.timeScale().getVisibleLogicalRange();
      if (!logical) return; // データ未セット → 同期しない
    }

    if (isSyncing) return;
    isSyncing = true;

    targetCharts.forEach(ch => {
      if (!ch) return;
      try {
        ch.timeScale().setVisibleRange(range);
      } catch (e) {
        // 完全に握りつぶす（警告も出さない）
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
// デフォルト表示期間（直近4ヶ月）
// ------------------------------
function applyDefaultRange(priceChart, rciChart, macdChart, candleData) {
  if (!candleData || candleData.length === 0) return;

  const lastTime = candleData[candleData.length - 1].time;
  if (lastTime == null) return;

  const fourMonthsSec = 60 * 60 * 24 * 30 * 4;
  const fromTime = lastTime - fourMonthsSec;

  const range = { from: fromTime, to: lastTime };

  try { priceChart.timeScale().setVisibleRange(range); } catch (e) {}
  try { rciChart.timeScale().setVisibleRange(range); }   catch (e) {}
  try { macdChart.timeScale().setVisibleRange(range); }  catch (e) {}
}
