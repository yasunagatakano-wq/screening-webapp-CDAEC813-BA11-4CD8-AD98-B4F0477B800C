const startBtn = document.getElementById("startBtn");
const cancelBtn = document.getElementById("cancelBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const tbody = document.querySelector("#resultTable tbody");

let abortController = null;
let tickerMapCache = null;

startBtn.addEventListener("click", startScreening);
cancelBtn.addEventListener("click", cancelScreening);

async function startScreening() {
  const volumeRatio = parseFloat(document.getElementById("volumeRatio").value) || 5;
  const shadowRatio = parseFloat(document.getElementById("shadowRatio").value) || 5;
  const maxConcurrency = parseInt(document.getElementById("maxConcurrency").value) || 20;

  if (maxConcurrency < 1 || maxConcurrency > 40) {
    alert("並列数は1〜40の範囲で指定してください。");
    return;
  }

  startBtn.disabled = true;
  cancelBtn.disabled = false;
  progressText.textContent = "銘柄リスト取得中…";
  progressBar.value = 0;

  abortController = new AbortController();

  try {
    const tickerMap = tickerMapCache || await loadTickerList();
    tickerMapCache = tickerMap;
    const tickers = Object.keys(tickerMap);

    progressBar.max = tickers.length;
    progressBar.value = 0;
    progressText.textContent = `0 / ${tickers.length}`;

    const results = [];
    let running = 0;
    let index = 0;
    const startTime = Date.now();

    const runNext = () => {
      if (abortController.signal.aborted) return;
      if (index >= tickers.length) return;

      const ticker = tickers[index++];
      running++;

      fetchTickerDaily(ticker, abortController.signal)
        .then(data => {
          const r = screenTicker(ticker, tickerMap, data, volumeRatio, shadowRatio);
          if (r) results.push(r);
        })
        .catch(() => {})
        .finally(() => {
          running--;
          progressBar.value++;
          const done = progressBar.value;
          const total = tickers.length;
          const elapsedSec = (Date.now() - startTime) / 1000;
          const avg = done > 0 ? elapsedSec / done : 0;
          const remain = avg * (total - done);
          const remainMin = Math.floor(remain / 60);
          const remainSec = Math.floor(remain % 60);

          progressText.textContent =
            `${done} / ${total} (${(done / total * 100).toFixed(1)}%) ` +
            (done > 0 ? ` 残り予測: ${remainMin}分${remainSec}秒` : "");

          if (index < tickers.length) {
            runNext();
          }
        });
    };

    for (let i = 0; i < maxConcurrency; i++) {
      runNext();
    }

    const waitFinish = setInterval(() => {
      if (running === 0 && index >= tickers.length) {
        clearInterval(waitFinish);
        showResults(results);
        startBtn.disabled = false;
        cancelBtn.disabled = true;
        cancelBtn.textContent = "キャンセル";
        alert(`スクリーニング完了：${results.length} 件`);
      }
    }, 300);
  } catch (e) {
    console.error(e);
    alert("スクリーニング中にエラーが発生しました。");
    startBtn.disabled = false;
    cancelBtn.disabled = true;
    cancelBtn.textContent = "キャンセル";
  }
}

function cancelScreening() {
  if (abortController) {
    abortController.abort();
    cancelBtn.disabled = true;
    cancelBtn.textContent = "キャンセル中…";
    progressText.textContent += "（キャンセル要求済み）";
  }
}

async function loadTickerList() {
  const arrayBuffer = await fetch("libs/data_j.xlsx").then(r => r.arrayBuffer());
  const workbook = XLSX.read(arrayBuffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const map = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const rawCode = row[1];
    const rawName = row[2];

    if (!rawCode || !rawName) continue;

    const codeStr = String(rawCode).trim().toUpperCase();
    map[codeStr] = String(rawName).trim();
  }

  return map;
}

async function fetchTickerDaily(ticker, signal) {
  const url = `https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com/chart?symbol=${ticker}.T`;
  const res = await fetch(url, { signal });
  return await res.json();
}

function screenTicker(ticker, map, data, volumeRatio, shadowRatio) {
  const q = data.indicators.quote[0];
  const opens = q.open;
  const highs = q.high;
  const closes = q.close;
  const volumes = q.volume;

  const count = opens.length;
  if (count < 2) return null;

  const idx = count - 1;
  const yidx = count - 2;

  const open = opens[idx];
  const close = closes[idx];
  const high = highs[idx];
  const volToday = volumes[idx];
  const volYest = volumes[yidx];

  if (open == null || close == null || high == null || volToday == null || volYest == null) {
    return null;
  }

  const realBody = Math.abs(close - open);
  const upperShadow = high - Math.max(open, close);
  const actualVolumeRatio = volYest > 0 ? volToday / volYest : 0;
  const actualShadowRatio = realBody > 0 ? upperShadow / realBody : 0;

  if (actualVolumeRatio >= volumeRatio && actualShadowRatio >= shadowRatio) {
    return {
      コード: ticker,
      銘柄名: map[ticker] ?? "N/A",
      出来高倍率: actualVolumeRatio.toFixed(2),
      上髭実体比: actualShadowRatio.toFixed(2),
      出来高: Math.round(volToday).toLocaleString(),
      上髭: upperShadow.toFixed(2),
      実体: realBody.toFixed(2)
    };
  }
  return null;
}

function showResults(results) {
  tbody.innerHTML = "";
  results.sort((a, b) => parseFloat(b.出来高倍率) - parseFloat(a.出来高倍率));

  for (const r of results) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.コード}</td>
      <td>${r.銘柄名}</td>
      <td>${r.出来高倍率}</td>
      <td>${r.上髭実体比}</td>
      <td>${r.出来高}</td>
      <td>${r.上髭}</td>
      <td>${r.実体}</td>
    `;
    tr.addEventListener("click", () => openChartModal(r.コード, r.銘柄名));
    tbody.appendChild(tr);
  }
}
