// --------------------------------------
// chart-indicators.js
// MA / 一目均衡表 / BB / RCI / MACD 計算モジュール
// --------------------------------------

// ------------------------------
// 移動平均
// ------------------------------
function calcMA(data, period) {
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

// ------------------------------
// 一目均衡表
// ------------------------------
function calcIchimoku(data) {
  const len = data.length;
  const tenkan = [];
  const kijun = [];
  const span1 = [];
  const span2 = [];
  const chikou = [];

  for (let i = 0; i < len; i++) {
    // 転換線（9）
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

    // 基準線（26）
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

    // 先行スパン1
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

    // 先行スパン2（52期間）
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

  return { tenkan, kijun, span1, span2, chikou };
}

// ------------------------------
// ボリンジャーバンド
// ------------------------------
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

// ------------------------------
// RCI
// ------------------------------
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

    const rci = 100 * (1 - (6 * sumDiff2) / (n * (n * n - 1)));

    result.push({ time: data[i].time, value: rci });
  }

  return result;
}

// ------------------------------
// EMA（MACD用）
// ------------------------------
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
    if (prev == null) prev = v;
    else prev = v * k + prev * (1 - k);

    ema.push(prev);
  }
  return ema;
}

// ------------------------------
// MACD
// ------------------------------
function calcMACD(data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
  const closes = data.map(d => d.close);

  const emaShort = calcEMA(closes, shortPeriod);
  const emaLong = calcEMA(closes, longPeriod);

  const macd = [];
  for (let i = 0; i < data.length; i++) {
    if (emaShort[i] == null || emaLong[i] == null) macd.push(null);
    else macd.push(emaShort[i] - emaLong[i]);
  }

  const signal = calcEMA(macd, signalPeriod);

  const hist = [];
  for (let i = 0; i < data.length; i++) {
    if (macd[i] == null || signal[i] == null) hist.push(null);
    else hist.push(macd[i] - signal[i]);
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
