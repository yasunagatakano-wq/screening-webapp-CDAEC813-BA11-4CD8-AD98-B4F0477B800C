const startBtn = document.getElementById("startBtn");
const cancelBtn = document.getElementById("cancelBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const tbody = document.querySelector("#resultTable tbody");

let abortController = null;

startBtn.addEventListener("click", startScreening);
cancelBtn.addEventListener("click", cancelScreening);

async function startScreening() {
  const volumeRatio = parseFloat(document.getElementById("volumeRatio").value) || 5;
  const shadowRatio = parseFloat(document.getElementById("shadowRatio").value) || 5;

  startBtn.disabled = true;
  cancelBtn.disabled = false;
  progressBar.value = 0;
  progressBar.max = 100;
  progressText.textContent = "サーバー側でスクリーニング中…";

  abortController = new AbortController();

  try {
    const url = new URL("/screening", window.location.origin);
    url.searchParams.set("volume_ratio", volumeRatio);
    url.searchParams.set("shadow_ratio", shadowRatio);

    const res = await fetch(url.toString(), {
      signal: abortController.signal,
    });

    if (!res.ok) {
      throw new Error("サーバーエラー");
    }

    const results = await res.json();

    progressBar.value = 100;
    progressText.textContent = `完了：${results.length} 件ヒット`;

    showResults(results);

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

function showResults(results) {
  tbody.innerHTML = "";
  results.sort((a, b) => parseFloat(b.出来高倍率) - parseFloat(a.出来高倍率));

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
      console.log("行クリック", r.コード, r.銘柄名, index);
      openChartModal(r.コード, r.銘柄名, index);
    });

    tbody.appendChild(tr);
  });
}
