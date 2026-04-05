const startBtn = document.getElementById("startBtn");
const cancelBtn = document.getElementById("cancelBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const tbody = document.querySelector("#resultTable tbody");
const tableHeaders = document.querySelectorAll("#resultTable thead th");

let abortController = null;
let currentResults = [];
let sortState = {};

const API_BASE_URL = "https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com";

startBtn.addEventListener("click", startScreening);
cancelBtn.addEventListener("click", cancelScreening);

// ===============================
// 1. スクリーニング開始
// ===============================
async function startScreening() {
  const volumeRatio = parseFloat(document.getElementById("volumeRatio").value) || 5;
  const shadowRatio = parseFloat(document.getElementById("shadowRatio").value) || 5;

  startBtn.disabled = true;
  cancelBtn.disabled = false;
  progressBar.value = 0;
  progressText.textContent = "サーバー側でスクリーニング中…";

  abortController = new AbortController();

  document.getElementById("loadingOverlay").classList.remove("hidden");

  try {
    const url = new URL("/screening", API_BASE_URL);
    url.searchParams.set("volume_ratio", volumeRatio);
    url.searchParams.set("shadow_ratio", shadowRatio);

    const res = await fetch(url.toString(), {
      signal: abortController.signal,
    });

    if (!res.ok) throw new Error("サーバーエラー");

    const results = await res.json();
    currentResults = results;

    progressBar.value = 100;
    progressText.textContent = `完了：${results.length} 件ヒット`;

    showResults(currentResults);

    if (window.setScreeningResults) {
      window.setScreeningResults(results);
    }

    alert(`スクリーニング完了：${results.length} 件`);
  } catch (e) {
    if (abortController.signal.aborted) {
      progressText.textContent = "キャンセルされました。";
    } else {
      console.error(e);
      alert("スクリーニング中にエラーが発生しました。");
      progressText.textContent = "エラーが発生しました。";
    }
  } finally {
    startBtn.disabled = false;
    cancelBtn.disabled = true;
    cancelBtn.textContent = "キャンセル";
    document.getElementById("loadingOverlay").classList.add("hidden");
  }
}

// ===============================
// 2. キャンセル
// ===============================
function cancelScreening() {
  if (abortController) {
    abortController.abort();
    cancelBtn.disabled = true;
    cancelBtn.textContent = "キャンセル中…";
    progressText.textContent += "（キャンセル要求済み）";
  }
}

// ===============================
// 3. 結果表示
// ===============================
function showResults(results) {
  tbody.innerHTML = "";

  results.forEach((r, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.コード}</td>
      <td>${r.銘柄名}</td>
      <td>${r.出来高倍率}</td>
      <td>${r.上髭実体比}</td>
      <td>${Number(r.出来高).toLocaleString()}</td>
      <td>${r.上髭}</td>
      <td>${r.実体}</td>
    `;

    tr.addEventListener("click", () => {
      openChartModal(r.コード, r.銘柄名, index);
    });

    tbody.appendChild(tr);
  });
}

// ===============================
// 4. 列ヘッダクリックでソート
// ===============================
tableHeaders.forEach(th => {
  const key = th.dataset.sortKey;
  if (!key) return;

  sortState[key] = "asc";

  th.style.cursor = "pointer";

  th.addEventListener("click", () => {
    const order = sortState[key];

    currentResults.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (!isNaN(valA) && !isNaN(valB)) {
        return order === "asc" ? valA - valB : valB - valA;
      }

      return order === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    sortState[key] = order === "asc" ? "desc" : "asc";

    showResults(currentResults);
  });
});
