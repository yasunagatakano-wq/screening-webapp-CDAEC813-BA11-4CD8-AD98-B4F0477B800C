// ============================================================
// review.js（2026-09 新規）
// 「学びの棚」復習ページ：目次・しおり・メモ機能
//
// screening.js と同じく classic script（type="module" ではない）として
// 読み込む。conventions.nodeScriptModuleSystem は scripts/*.js（Node実行の
// バックエンドスクリプト）向けの規約であり、ブラウザ向けの本ファイルは
// 対象外（screening.js と同じ扱い）。
// ============================================================

const API_BASE_URL = "https://yfinance-api-fe86988c-d3b4-f1c6-640d.onrender.com";

// ------------------------------------------------------------------
// 章コンテンツ
//
// 本文自体は data/review_chapters.json（webapp-frontend リポジトリ）で
// 管理し、GET /review/chapters で取得する。ここに定義する DEFAULT_CHAPTERS は
// 通信に失敗した場合の最低限のフォールバック表示用（バックエンドが停止して
// いてもページが完全に空にならないようにするため）であり、通常はサーバー
// から取得した内容で上書きされる。
//
// 章を追加・編集したい場合は、この配列を直接編集するのではなく、
// POST /review/chapter（またはGitHub上でdata/review_chapters.jsonを直接編集）
// を使うこと。
//
// id は一度公開したら変更しないこと（しおり・メモが chapter_id で
// 紐付いているため、id を変えると既存のしおり・メモが孤立する）。
// ------------------------------------------------------------------
const DEFAULT_CHAPTERS = [
  {
    id: "candlestick-basics",
    part: "第1部　値動きを読む基礎",
    title: "ローソク足とは何を表すか（オフライン表示）",
    readMinutes: 3,
    bodyHtml: `<p class="lead">章コンテンツの読み込みに失敗したため、簡易表示をしています。しばらくしてから再読み込みしてください。</p>`,
  },
];

let CHAPTERS = DEFAULT_CHAPTERS;
let CHAPTERS_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

function setChapters(chapters) {
  CHAPTERS = chapters && chapters.length > 0 ? chapters : DEFAULT_CHAPTERS;
  CHAPTERS_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));
}

async function loadChapters() {
  try {
    const res = await fetch(`${API_BASE_URL}/review/chapters`);
    const data = await res.json();
    if (data.error) {
      console.error("章コンテンツの読み込みに失敗しました:", data.detail || data.error);
      return;
    }
    setChapters(data.chapters);
  } catch (e) {
    console.error("章コンテンツの読み込みに失敗しました:", e);
  }
}

// ------------------------------------------------------------------
// DOM 要素の取得（domHookAttributes に従い id / data-* のみを用いる）
// ------------------------------------------------------------------
const reviewTabReadBtn = document.getElementById("reviewTabRead");
const reviewTabBookmarksBtn = document.getElementById("reviewTabBookmarks");
const reviewTabMemosBtn = document.getElementById("reviewTabMemos");
const reviewViewRead = document.getElementById("reviewViewRead");
const reviewViewBookmarks = document.getElementById("reviewViewBookmarks");
const reviewViewMemos = document.getElementById("reviewViewMemos");

const chapterNavEl = document.getElementById("chapterNavEl");
const chapterBreadcrumbEl = document.getElementById("chapterBreadcrumbEl");
const chapterTitleEl = document.getElementById("chapterTitleEl");
const chapterMetaEl = document.getElementById("chapterMetaEl");
const chapterBodyEl = document.getElementById("chapterBodyEl");
const chapterPrevBtn = document.getElementById("chapterPrevBtn");
const chapterNextBtn = document.getElementById("chapterNextBtn");

const bookmarkToggleBtn = document.getElementById("bookmarkToggleBtn");
const bookmarkListEl = document.getElementById("bookmarkListEl");
const bookmarkEmptyEl = document.getElementById("bookmarkEmptyEl");

const memoListEl = document.getElementById("memoListEl");
const memoListEmptyEl = document.getElementById("memoListEmptyEl");

const memoTextareaEl = document.getElementById("memoTextareaEl");
const memoSaveBtn = document.getElementById("memoSaveBtn");
const memoStatusEl = document.getElementById("memoStatusEl");

const reviewLoadingOverlay = document.getElementById("reviewLoadingOverlay");

// ------------------------------------------------------------------
// 状態
// ------------------------------------------------------------------
let notes = { bookmarks: [], memos: {} };
let currentChapterId = CHAPTERS[0].id;

// ------------------------------------------------------------------
// 合言葉（書き込み系エンドポイントの簡易認可）
//
// NOTE: このアプリは静的サイト（GitHub Pages）のため、合言葉をこの
// ファイルに直接書いてコミットすると、ページのソースを見れば誰でも
// 値が分かってしまう（＝実質無認可と同じ）。そのため、値はコードに
// 埋め込まず、初回操作時に prompt() で入力させ、この端末の
// localStorage にのみ保持する。他の端末で使う場合はそれぞれの端末で
// 一度だけ入力し直す必要がある。
// ------------------------------------------------------------------
const REVIEW_SECRET_STORAGE_KEY = "reviewApiSecret";

function getReviewSecret() {
  let secret = localStorage.getItem(REVIEW_SECRET_STORAGE_KEY);
  if (!secret) {
    secret = window.prompt(
      "しおり・メモの保存には合言葉が必要です。合言葉を入力してください（この端末に保存され、次回以降は不要です）。"
    );
    if (secret) {
      localStorage.setItem(REVIEW_SECRET_STORAGE_KEY, secret);
    }
  }
  return secret || null;
}

function clearReviewSecret() {
  localStorage.removeItem(REVIEW_SECRET_STORAGE_KEY);
}

// ------------------------------------------------------------------
// サーバー通信
//
// loadingOverlaySspec に従い、通信開始前にオーバーレイを表示し、
// try/finally の finally で必ず非表示にする。
// ------------------------------------------------------------------
async function loadNotes() {
  try {
    const res = await fetch(`${API_BASE_URL}/review/notes`);
    const data = await res.json();
    if (data.error) {
      console.error("しおり・メモの読み込みに失敗しました:", data.detail || data.error);
      return;
    }
    notes = { bookmarks: data.bookmarks || [], memos: data.memos || {} };
  } catch (e) {
    console.error("しおり・メモの読み込みに失敗しました:", e);
  }
}

async function postWithSecret(path, body) {
  const secret = getReviewSecret();
  if (!secret) {
    return { error: "合言葉が入力されなかったため、保存を中止しました。" };
  }
  reviewLoadingOverlay.classList.remove("hidden");
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Review-Secret": secret,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      // 合言葉が誤っている場合は保存し直したものを次回再入力させる
      clearReviewSecret();
      return { error: "合言葉が違うようです。もう一度お試しください。" };
    }
    const data = await res.json();
    if (data.error) {
      return { error: data.detail || data.error };
    }
    return data;
  } catch (e) {
    return { error: String(e) };
  } finally {
    reviewLoadingOverlay.classList.add("hidden");
  }
}

async function toggleBookmark() {
  const bookmarked = !notes.bookmarks.includes(currentChapterId);
  const result = await postWithSecret("/review/bookmark", {
    chapter_id: currentChapterId,
    bookmarked,
  });
  if (result.error) {
    alert("しおりの更新に失敗しました：" + result.error);
    return;
  }
  notes.bookmarks = result.bookmarks;
  renderChapterNav();
  renderBookmarkButton();
  renderBookmarkList();
}

async function saveMemo() {
  const memo = memoTextareaEl.value;
  memoStatusEl.textContent = "保存中…";
  const result = await postWithSecret("/review/memo", {
    chapter_id: currentChapterId,
    memo,
  });
  if (result.error) {
    memoStatusEl.textContent = "";
    alert("メモの保存に失敗しました：" + result.error);
    return;
  }
  notes.memos = result.memos;
  memoStatusEl.textContent = "保存しました";
  setTimeout(() => {
    if (memoStatusEl.textContent === "保存しました") {
      memoStatusEl.textContent = "";
    }
  }, 2500);
}

// ------------------------------------------------------------------
// 描画
// ------------------------------------------------------------------
function renderChapterNav() {
  chapterNavEl.innerHTML = "";
  let lastPart = null;
  CHAPTERS.forEach((chapter) => {
    if (chapter.part !== lastPart) {
      const partEl = document.createElement("p");
      partEl.className = "review-chapter-part-title";
      partEl.textContent = chapter.part;
      chapterNavEl.appendChild(partEl);
      lastPart = chapter.part;
    }

    const itemEl = document.createElement("div");
    itemEl.className = "review-chapter-item";
    itemEl.dataset.chapterId = chapter.id;
    if (chapter.id === currentChapterId) {
      itemEl.setAttribute("data-current", "");
    }
    if (notes.bookmarks.includes(chapter.id)) {
      itemEl.setAttribute("data-bookmarked", "");
    }

    const dotEl = document.createElement("span");
    dotEl.className = "review-chapter-item-bookmark";
    itemEl.appendChild(dotEl);

    const labelEl = document.createElement("span");
    labelEl.textContent = chapter.title;
    itemEl.appendChild(labelEl);

    itemEl.addEventListener("click", () => showChapter(chapter.id));
    chapterNavEl.appendChild(itemEl);
  });
}

function renderBookmarkButton() {
  const bookmarked = notes.bookmarks.includes(currentChapterId);
  if (bookmarked) {
    bookmarkToggleBtn.setAttribute("data-bookmarked", "");
  } else {
    bookmarkToggleBtn.removeAttribute("data-bookmarked");
  }
}

function renderBookmarkList() {
  bookmarkListEl.innerHTML = "";
  const bookmarkedChapters = notes.bookmarks
    .map((id) => CHAPTERS_BY_ID[id])
    .filter(Boolean);

  bookmarkEmptyEl.classList.toggle("hidden", bookmarkedChapters.length > 0);

  bookmarkedChapters.forEach((chapter) => {
    const itemEl = document.createElement("div");
    itemEl.className = "review-bookmark-item";
    itemEl.dataset.chapterId = chapter.id;

    const partEl = document.createElement("div");
    partEl.className = "review-bookmark-item-part";
    partEl.textContent = chapter.part;

    const titleEl = document.createElement("div");
    titleEl.className = "review-bookmark-item-title";
    titleEl.textContent = chapter.title;

    itemEl.appendChild(partEl);
    itemEl.appendChild(titleEl);

    itemEl.addEventListener("click", () => {
      showChapter(chapter.id);
      switchTab("read");
    });

    bookmarkListEl.appendChild(itemEl);
  });
}

function renderMemoList() {
  memoListEl.innerHTML = "";

  const memoChapters = Object.keys(notes.memos)
    .filter((id) => (notes.memos[id] || "").trim() !== "")
    .map((id) => CHAPTERS_BY_ID[id])
    .filter(Boolean);

  memoListEmptyEl.classList.toggle("hidden", memoChapters.length > 0);

  memoChapters.forEach((chapter) => {
    const memoText = notes.memos[chapter.id] || "";

    const itemEl = document.createElement("div");
    itemEl.className = "review-bookmark-item";
    itemEl.dataset.chapterId = chapter.id;

    const partEl = document.createElement("div");
    partEl.className = "review-bookmark-item-part";
    partEl.textContent = chapter.part;

    const titleEl = document.createElement("div");
    titleEl.className = "review-bookmark-item-title";
    titleEl.textContent = chapter.title;

    const previewEl = document.createElement("div");
    previewEl.className = "review-memo-item-preview";
    previewEl.textContent = memoText.length > 60 ? `${memoText.slice(0, 60)}…` : memoText;

    itemEl.appendChild(partEl);
    itemEl.appendChild(titleEl);
    itemEl.appendChild(previewEl);

    itemEl.addEventListener("click", () => {
      showChapter(chapter.id);
      switchTab("read");
    });

    memoListEl.appendChild(itemEl);
  });
}

function showChapter(chapterId, options = {}) {
  const { scroll = true } = options;
  const chapter = CHAPTERS_BY_ID[chapterId];
  if (!chapter) return;

  currentChapterId = chapterId;
  location.hash = chapterId;

  chapterBreadcrumbEl.textContent = chapter.part;
  chapterTitleEl.textContent = chapter.title;
  chapterMetaEl.textContent = `読了目安 ${chapter.readMinutes}分`;
  chapterBodyEl.innerHTML = chapter.bodyHtml;
  memoTextareaEl.value = notes.memos[chapterId] || "";
  memoStatusEl.textContent = "";

  const index = CHAPTERS.findIndex((c) => c.id === chapterId);
  chapterPrevBtn.disabled = index <= 0;
  chapterNextBtn.disabled = index >= CHAPTERS.length - 1;

  renderChapterNav();
  renderBookmarkButton();

  // 目次クリック・前後章移動時は、screening.js の showResults() 後のスクロール
  // （#resultSection へ smooth スクロール、offset -10）と同じUXにする。
  // 初回読み込み時（window load）は options.scroll=false を渡し、
  // ページを開いた瞬間に勝手にスクロールしないようにする。
  if (scroll) {
    const target = document.getElementById("reviewReaderSection");
    const offset = -10;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.pageYOffset + offset,
      behavior: "smooth",
    });
  }
}

function switchTab(tab) {
  const isRead = tab === "read";
  const isBookmarks = tab === "bookmarks";
  const isMemos = tab === "memos";

  reviewViewRead.classList.toggle("hidden", !isRead);
  reviewViewBookmarks.classList.toggle("hidden", !isBookmarks);
  reviewViewMemos.classList.toggle("hidden", !isMemos);

  [reviewTabReadBtn, reviewTabBookmarksBtn, reviewTabMemosBtn].forEach((btn) => {
    btn.removeAttribute("data-current");
  });

  if (isRead) {
    reviewTabReadBtn.setAttribute("data-current", "");
  } else if (isBookmarks) {
    reviewTabBookmarksBtn.setAttribute("data-current", "");
    renderBookmarkList();
  } else if (isMemos) {
    reviewTabMemosBtn.setAttribute("data-current", "");
    renderMemoList();
  }
}

// ------------------------------------------------------------------
// イベント登録
// ------------------------------------------------------------------
reviewTabReadBtn.addEventListener("click", () => switchTab("read"));
reviewTabBookmarksBtn.addEventListener("click", () => switchTab("bookmarks"));
reviewTabMemosBtn.addEventListener("click", () => switchTab("memos"));
bookmarkToggleBtn.addEventListener("click", toggleBookmark);
memoSaveBtn.addEventListener("click", saveMemo);

chapterPrevBtn.addEventListener("click", () => {
  const index = CHAPTERS.findIndex((c) => c.id === currentChapterId);
  if (index > 0) showChapter(CHAPTERS[index - 1].id);
});
chapterNextBtn.addEventListener("click", () => {
  const index = CHAPTERS.findIndex((c) => c.id === currentChapterId);
  if (index < CHAPTERS.length - 1) showChapter(CHAPTERS[index + 1].id);
});

// ------------------------------------------------------------------
// 初期化
//
// 章コンテンツ（chapters）としおり・メモ（notes）は別々のJSONファイル・
// 別々のエンドポイントで管理しているため、並行して取得してから初期表示する。
// ------------------------------------------------------------------
window.addEventListener("load", async () => {
  reviewLoadingOverlay.classList.remove("hidden");
  try {
    await Promise.all([loadChapters(), loadNotes()]);
  } finally {
    reviewLoadingOverlay.classList.add("hidden");
  }

  const hashId = location.hash.replace("#", "");
  const initialChapterId = CHAPTERS_BY_ID[hashId] ? hashId : CHAPTERS[0].id;

  showChapter(initialChapterId, { scroll: false });
  renderBookmarkList();
});
