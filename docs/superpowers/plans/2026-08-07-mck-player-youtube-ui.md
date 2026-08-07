# Chuyển đổi giao diện kiểu YouTube — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển trình nghe nhạc MCK (30 bài) sang bố cục giống YouTube (topbar + sidebar + trang chủ lưới thẻ + trang xem 2 cột + thanh phát đáy) mà giữ nguyên mọi tính năng, màu sắc, `js/data.js` và `sw.js` hiện có.

**Architecture:** SPA nhiều view. `index.html` trở thành vỏ YouTube (`.topbar` + `.sidebar` + `.main` chứa `#view-home` và `#view-watch`). `js/app.js` thêm router view đơn giản (`state.view: 'home'|'watch'`, `state.filter: 'all'|'mv'`) và thanh phát đáy `.player-bar`, tái sử dụng toàn bộ logic phát/handoff/persistence hiện có. `css/style.css` giữ tokens + hiệu ứng (đĩa quay, EQ, ambient, reduced-motion) và thay lớp layout.

**Tech Stack:** HTML/CSS/JS thuần (không framework), Playwright-core + Chrome hệ thống để test, chạy qua `python -m http.server` + Service Worker (bắt buộc vì python http.server không hỗ trợ HTTP Range — seek không hoạt động nếu media không đi qua SW).

## Global Constraints

- **Không phải git repo** → BỎ QUA mọi bước commit; không chạy lệnh git.
- Màu sắc/tokens KHÔNG đổi: `--bg #07070a`, accent `#a78bfa` → `#f472b6`, font "Be Vietnam Pro", không emoji (SVG icon), tôn trọng `prefers-reduced-motion`.
- KHÔNG sửa `js/data.js` và `sw.js`. Giữ key lưu trạng thái `mck_player_state_v2`.
- UI hoàn toàn tiếng Việt. `[hidden] { display: none !important; }` đã có sẵn — tận dụng cho việc đổi view.
- 6 bài có MV (id 2, 7, 15, 20, 22, 24). Thứ tự SONGS = thứ tự hiển thị (id tăng dần).
- Mọi hành vi giữ nguyên: shuffle/repeat, seek, volume, phím tắt, Media Session, handoff Ảnh↔MV, phát nền (MV→Ảnh khi ẩn), saveState, resume, search không dấu.
- Server test: `python -m http.server 8000` trong thư mục dự án; test script `C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js`.

---

### Task 1: `index.html` — vỏ shell kiểu YouTube

**Files:**
- Modify: `D:\Documents\CODE\HVL\index.html` (viết lại toàn bộ)

**Interfaces:**
- Produces: toàn bộ ID phần tử mà `js/app.js` (Task 3) dùng — `menu-btn`, `sidebar`, `side-nav`, `side-item[data-side=home|mv|watch]`, `side-backdrop`, `view-home`, `view-watch`, `home-title`, `card-grid`, `card-item[data-id]`, `song-list`, `song-item[data-id]`, `no-results`, `search-input`, `song-count`, `btn-back`, `watch-top-title`, `stage-visual`, `stage-empty`, `disc-art`, `cover-img`, `mv-video`, `view-toggle`, `view-btn[data-mode=image|mv]`, `mv-toggle-btn`, `stage-title`, `stage-sub`, `progress`, `time-current`, `time-duration`, `btn-shuffle`, `btn-prev`, `btn-play`, `btn-next`, `btn-repeat`, `volume`, `player-bar`, `pb-cover`, `pb-title`, `pb-progress-fill`, `pb-play`, `pb-prev`, `pb-next`, `pb-volume`, `audio-el`, `ambient`.

- [ ] **Step 1: Viết lại `index.html`**

Viết đè toàn bộ nội dung file `D:\Documents\CODE\HVL\index.html`:

```html
<!doctype html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>MCK Player — 30 bài hát</title>
<meta name="theme-color" content="#07070a">
<meta name="description" content="Trình nghe nhạc offline cho bộ sưu tập 30 bài hát MCK">
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="icons/icon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div class="ambient" id="ambient" aria-hidden="true"></div>

<div id="app">
  <header class="topbar">
    <button id="menu-btn" class="icon-btn menu-btn" aria-label="Mở menu">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
    <div class="brand">
      <span class="brand-mark">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>
      </span>
      <span class="brand-name">MCK <em>Player</em></span>
    </div>
    <div class="search">
      <svg class="search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="search-input" type="search" placeholder="Tìm bài hát..." autocomplete="off">
    </div>
    <div class="topbar-meta">
      <span id="song-count">30 bài hát</span>
      <span class="topbar-avatar" aria-hidden="true">MCK</span>
    </div>
  </header>

  <div class="yt-body">
    <aside class="sidebar" id="sidebar" aria-label="Điều hướng">
      <nav class="side-nav" id="side-nav">
        <button type="button" class="side-item active" data-side="home">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="3"/><path d="M8 10l5-2v7l-5-2z"/></svg>
          <span>Trang chủ</span>
        </button>
        <button type="button" class="side-item" data-side="mv">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5-6-3.5z"/></svg>
          <span>Có MV</span>
        </button>
        <button type="button" class="side-item" data-side="watch">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
          <span>Đang phát</span>
        </button>
      </nav>
      <div class="side-foot">30 bài · chạy offline</div>
    </aside>
    <div class="side-backdrop" id="side-backdrop" hidden></div>

    <main class="main">
      <section id="view-home" class="view view-home">
        <div class="view-head">
          <h1 id="home-title" class="view-title">Trang chủ</h1>
        </div>
        <ul id="card-grid" class="card-grid"></ul>
        <p id="no-results" class="no-results" hidden>Không tìm thấy bài hát nào.</p>
      </section>

      <section id="view-watch" class="view view-watch" hidden>
        <div class="watch-cols">
          <div class="watch-player">
            <div class="watch-top">
              <button id="btn-back" class="icon-btn" aria-label="Quay lại trang chủ">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <span id="watch-top-title" class="watch-top-title"></span>
            </div>
            <div class="stage-visual" id="stage-visual">
              <div class="stage-empty" id="stage-empty">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 15V9l7-2v6"/></svg>
                <p>Chọn một bài hát để bắt đầu</p>
              </div>
              <div class="disc-art" id="disc-art" hidden>
                <div class="disc-spin"><img id="cover-img" class="cover-img" alt="" draggable="false"></div>
                <div class="disc-hub" aria-hidden="true"></div>
              </div>
              <video id="mv-video" class="mv-video" playsinline preload="metadata" hidden></video>
            </div>
            <div class="view-toggle" id="view-toggle">
              <button type="button" class="view-btn active" data-mode="image">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>
                <span>Ảnh</span>
              </button>
              <button type="button" class="view-btn" data-mode="mv" id="mv-toggle-btn" disabled>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
                <span>MV</span>
              </button>
            </div>
            <div class="track-info">
              <h2 id="stage-title" class="stage-title">Chưa phát bài nào</h2>
              <p id="stage-sub" class="stage-sub">MCK</p>
            </div>
            <div class="progress-row">
              <span id="time-current" class="time">0:00</span>
              <input id="progress" class="progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="Tiến trình bài hát">
              <span id="time-duration" class="time">0:00</span>
            </div>
            <div class="controls-row">
              <button id="btn-shuffle" class="ctrl-btn" title="Phát ngẫu nhiên" aria-label="Phát ngẫu nhiên">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h4l10 10h4"/><path d="M17 7h4v4"/><path d="M3 17h4l2.5-2.5"/><path d="m14.5 9.5 2.5-2.5h4"/></svg>
              </button>
              <button id="btn-prev" class="ctrl-btn" title="Bài trước" aria-label="Bài trước">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14l-11-7z"/></svg>
              </button>
              <button id="btn-play" class="ctrl-btn play-btn" title="Phát / Tạm dừng" aria-label="Phát hoặc tạm dừng">
                <svg id="icon-play" class="icon-play" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
                <svg id="icon-pause" class="icon-pause" viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
              </button>
              <button id="btn-next" class="ctrl-btn" title="Bài sau" aria-label="Bài sau">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
              </button>
              <button id="btn-repeat" class="ctrl-btn" title="Lặp lại" aria-label="Lặp lại">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
              </button>
            </div>
            <div class="volume-row">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>
              <input id="volume" class="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Âm lượng">
            </div>
          </div>
          <aside class="watch-list" aria-label="Danh sách phát">
            <h3 class="watch-list-title">Danh sách phát</h3>
            <ul id="song-list" class="song-list"></ul>
          </aside>
        </div>
      </section>
    </main>
  </div>

  <div class="player-bar" id="player-bar" hidden>
    <div class="pb-progress"><div id="pb-progress-fill" class="pb-progress-fill"></div></div>
    <div class="pb-row">
      <img id="pb-cover" class="pb-cover" alt="">
      <div class="pb-info">
        <div id="pb-title" class="pb-title">Chưa phát bài nào</div>
      </div>
      <div class="pb-controls">
        <button id="pb-prev" class="pb-btn" aria-label="Bài trước">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h2v14H6zM20 5v14l-11-7z"/></svg>
        </button>
        <button id="pb-play" class="pb-btn pb-play" aria-label="Phát hoặc tạm dừng">
          <svg class="icon-play" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
          <svg class="icon-pause" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
        </button>
        <button id="pb-next" class="pb-btn" aria-label="Bài sau">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>
        </button>
      </div>
      <div class="pb-volume">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>
        <input id="pb-volume" class="volume" type="range" min="0" max="1" step="0.01" value="1" aria-label="Âm lượng">
      </div>
    </div>
  </div>
</div>

<audio id="audio-el" preload="metadata"></audio>

<script src="js/data.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Kiểm tra cú pháp cấu trúc**

Kiểm tra các ID bắt buộc tồn tại đúng một lần:

```powershell
Select-String -Path 'D:\Documents\CODE\HVL\index.html' -Pattern 'id="(view-home|view-watch|card-grid|player-bar|pb-play|mv-toggle-btn|volume|pb-volume)"' -AllMatches | Measure-Object
```

Kỳ vọng: đủ 8 ID, mỗi ID xuất hiện 1 lần. KHÔNG commit (không phải git repo).

---

### Task 2: `css/style.css` — layout YouTube lên tokens hiện có

**Files:**
- Modify: `D:\Documents\CODE\HVL\css\style.css` (viết lại toàn bộ)

**Interfaces:**
- Produces: class `.topbar`, `.icon-btn`, `.menu-btn`, `.brand`, `.search`, `.topbar-meta`, `.topbar-avatar`, `.yt-body`, `.sidebar`, `.side-nav`, `.side-item`, `.side-foot`, `.side-backdrop`, `.main`, `.view`, `.view-head`, `.view-title`, `.card-grid`, `.card-item`, `.card-thumb`, `.card-img`, `.card-duration`, `.card-play-ov`, `.card-meta`, `.card-title`, `.card-sub`, `.watch-cols`, `.watch-player`, `.watch-top`, `.watch-top-title`, `.watch-list`, `.watch-list-title`, `.song-list`, `.song-item`, `.player-bar`, `.pb-progress`, `.pb-progress-fill`, `.pb-row`, `.pb-cover`, `.pb-info`, `.pb-title`, `.pb-controls`, `.pb-btn`, `.pb-play`, `.pb-volume`; media queries `min-width:900px`, `max-width:899px`, `max-width:360px`; rule `body.watch-view .topbar`.

- [ ] **Step 1: Viết lại `css/style.css`**

Viết đè toàn bộ file `D:\Documents\CODE\HVL\css\style.css`:

```css
/* ============ Reset & base ============ */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: "Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
input[type="search"] { font: inherit; color: inherit; }
img { display: block; max-width: 100%; }
ul { list-style: none; }
[hidden] { display: none !important; }

/* ============ Theme tokens ============ */
:root {
  --bg: #07070a;
  --bg-elevated: rgba(255,255,255,0.05);
  --bg-hover: rgba(255,255,255,0.08);
  --bg-active: rgba(255,255,255,0.12);
  --border: rgba(255,255,255,0.09);
  --text: #f4f4f6;
  --text-dim: #a1a1ad;
  --text-faint: #6b6b76;
  --accent-a: #a78bfa;
  --accent-b: #f472b6;
  --accent-grad: linear-gradient(135deg, var(--accent-a), var(--accent-b));
  --radius-lg: 22px;
  --radius-md: 14px;
  --radius-sm: 10px;
  --topbar-h: 64px;
  --sidebar-w: 224px;
  --playerbar-h: 66px;
  --safe-b: env(safe-area-inset-bottom, 0px);
  --glass: rgba(18,18,24,0.72);
  --glass-border: rgba(255,255,255,0.1);
  --shadow-panel: 0 24px 60px -24px rgba(0,0,0,0.8);
}

/* ============ Ambient background ============ */
.ambient {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 70% 10%, rgba(139,92,246,0.16), transparent 55%),
              radial-gradient(100% 80% at 15% 90%, rgba(236,72,153,0.10), transparent 55%);
}
.ambient::after {
  content: ""; position: absolute; inset: 0;
  background: var(--ambient-img, none) center 30% / cover no-repeat;
  filter: blur(90px) saturate(1.3);
  opacity: 0.32;
  transform: scale(1.15);
  transition: opacity 1.2s ease;
}

/* ============ Scrollbars ============ */
* { scrollbar-width: thin; scrollbar-color: #33333c transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: #33333c; border-radius: 8px; }
*::-webkit-scrollbar-track { background: transparent; }

/* ============ App shell ============ */
#app { height: 100vh; height: 100dvh; display: flex; flex-direction: column; position: relative; z-index: 1; }

.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: 50%;
  color: var(--text-dim); flex: 0 0 auto;
  transition: background .12s, color .12s;
}
.icon-btn:hover { background: var(--bg-hover); color: var(--text); }

/* ============ Topbar ============ */
.topbar {
  height: var(--topbar-h); flex: 0 0 auto;
  display: flex; align-items: center; gap: 10px;
  padding: 0 16px;
  background: rgba(10,10,14,0.6);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 30;
}
.brand { display: flex; align-items: center; gap: 9px; white-space: nowrap; font-weight: 700; font-size: 17px; letter-spacing: 0.2px; }
.brand-mark { display: flex; color: var(--accent-a); filter: drop-shadow(0 0 8px rgba(167,139,250,0.55)); }
.brand-name em { font-style: normal; background: var(--accent-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }

.search { flex: 1 1 auto; max-width: 480px; margin: 0 auto; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 12px; color: var(--text-faint); pointer-events: none; }
.search input {
  width: 100%;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 10px 16px 10px 36px;
  outline: none;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.search input::placeholder { color: var(--text-faint); }
.search input:focus { border-color: rgba(167,139,250,0.6); background: var(--bg-hover); box-shadow: 0 0 0 3px rgba(167,139,250,0.15); }
.topbar-meta { margin-left: auto; display: flex; align-items: center; gap: 12px; color: var(--text-faint); font-size: 13px; white-space: nowrap; }
.topbar-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--accent-grad); color: #fff; font-size: 12px; font-weight: 700;
  box-shadow: 0 4px 14px -6px rgba(236,72,153,0.7);
}

/* ============ Body: sidebar + main ============ */
.yt-body { flex: 1 1 auto; min-height: 0; display: flex; position: relative; overflow: hidden; }

.sidebar {
  flex: 0 0 var(--sidebar-w); width: var(--sidebar-w);
  display: flex; flex-direction: column;
  padding: 12px 10px 16px;
  overflow-y: auto;
  border-right: 1px solid var(--glass-border);
  background: rgba(10,10,14,0.35);
  z-index: 50;
}
.side-nav { display: flex; flex-direction: column; gap: 2px; }
.side-item {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: var(--radius-md);
  color: var(--text-dim); font-size: 14px; font-weight: 600;
  text-align: left; width: 100%;
  transition: background .12s, color .12s;
}
.side-item:hover { background: var(--bg-hover); color: var(--text); }
.side-item.active { background: linear-gradient(135deg, rgba(167,139,250,0.22), rgba(244,114,182,0.16)); color: var(--text); }
.side-item svg { flex: 0 0 auto; color: var(--text-faint); }
.side-item.active svg { color: var(--accent-a); }
.side-foot { margin-top: auto; padding: 14px; color: var(--text-faint); font-size: 12px; }
.side-backdrop { position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,0.5); }

.main { flex: 1 1 auto; min-width: 0; overflow-y: auto; padding: 18px 20px calc(var(--playerbar-h) + 28px); }
.view { display: block; }
.view-head { margin-bottom: 16px; }
.view-title { font-size: 22px; font-weight: 800; letter-spacing: 0.2px; }

/* ============ Home: card grid ============ */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 16px 14px; }
.card-item { cursor: pointer; min-width: 0; }
.card-thumb {
  position: relative; aspect-ratio: 1 / 1; width: 100%;
  border-radius: var(--radius-md); overflow: hidden;
  background: var(--bg-elevated);
  box-shadow: 0 8px 24px -12px rgba(0,0,0,0.7);
}
.card-img { width: 100%; height: 100%; object-fit: cover; }
.card-item.active .card-thumb { box-shadow: 0 0 0 2px var(--accent-a), 0 10px 26px -10px rgba(0,0,0,0.8); }
.card-duration {
  position: absolute; right: 6px; bottom: 6px;
  background: rgba(0,0,0,0.75); color: #fff;
  font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 5px;
  font-variant-numeric: tabular-nums; pointer-events: none;
}
.card-thumb .mv-badge { position: absolute; top: 6px; left: 6px; }
.card-play-ov {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(7,7,10,0.35);
  opacity: 0; transition: opacity .15s;
  pointer-events: none;
}
.card-item:hover .card-play-ov { opacity: 1; }
.card-item.playing .card-play-ov { opacity: 1; }
.card-play-ov svg { width: 46px; height: 46px; color: #fff; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6)); }
.card-play-ov .icon-pause { display: none; }
.card-item.playing .card-play-ov .icon-play { display: none; }
.card-item.playing .card-play-ov .icon-pause { display: block; }
.card-meta { padding: 8px 2px 0; }
.card-title {
  font-size: 14px; font-weight: 600; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  overflow-wrap: break-word;
}
.card-sub { font-size: 12px; color: var(--text-dim); margin-top: 3px; }

.mv-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--accent-a);
  background: rgba(167,139,250,0.14);
  border: 1px solid rgba(167,139,250,0.3);
  padding: 1px 6px; border-radius: 999px;
}

.no-results { padding: 40px 20px; text-align: center; color: var(--text-faint); }

/* ============ Watch page ============ */
.watch-cols { display: flex; align-items: flex-start; gap: 26px; max-width: 1360px; margin: 0 auto; }
.watch-player { flex: 1 1 auto; min-width: 0; }
.watch-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.watch-top-title { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.stage-visual {
  position: relative; width: 100%; aspect-ratio: 1 / 1; max-width: 660px; max-height: 58vh;
  margin: 0 auto;
  border-radius: var(--radius-lg); overflow: hidden;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-panel);
  display: flex; align-items: center; justify-content: center;
}
.mv-video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.stage-empty { color: var(--text-faint); display: flex; flex-direction: column; align-items: center; gap: 12px; }

.disc-art { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.disc-spin { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
.disc-spin img.cover-img {
  width: 92%; height: 92%; object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 18px 50px -12px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.12);
  animation: spin 26s linear infinite;
  animation-play-state: paused;
}
body.playing .disc-spin img.cover-img { animation-play-state: running; }
.disc-hub {
  position: absolute; width: 34px; height: 34px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #3a3a44, #14141a);
  border: 3px solid rgba(255,255,255,0.12);
  box-shadow: 0 2px 8px rgba(0,0,0,0.6);
}
@keyframes spin { to { transform: rotate(360deg); } }

.view-toggle {
  display: flex; justify-content: center; gap: 4px;
  margin: 18px auto 0;
  background: var(--bg-elevated);
  border: 1px solid var(--glass-border);
  padding: 4px; border-radius: 999px;
  width: fit-content;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
.view-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 999px;
  font-size: 13.5px; font-weight: 600;
  color: var(--text-dim);
  transition: background .15s, color .15s;
}
.view-btn.active { background: var(--accent-grad); color: #fff; box-shadow: 0 6px 18px -8px rgba(236,72,153,0.7); }
.view-btn:disabled { opacity: .35; cursor: not-allowed; }

.track-info { text-align: center; margin-top: 20px; padding: 0 8px; }
.stage-title { font-size: 20px; font-weight: 800; line-height: 1.3; overflow-wrap: break-word; }
.stage-sub { font-size: 13.5px; color: var(--text-dim); margin-top: 4px; }

.progress-row { display: flex; align-items: center; gap: 10px; margin-top: 24px; }
.time { font-size: 11.5px; color: var(--text-faint); width: 40px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.time:last-child { text-align: right; }

input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; background: var(--bg-active); border-radius: 4px; outline: none; cursor: pointer; }
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; cursor: pointer;
  box-shadow: 0 0 0 4px rgba(167,139,250,0.28);
}
input[type="range"]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: none; box-shadow: 0 0 0 4px rgba(167,139,250,0.28); cursor: pointer; }
.progress { flex: 1 1 auto; background: linear-gradient(to right, var(--accent-a) 0%, var(--accent-a) var(--pct,0%), var(--bg-active) var(--pct,0%)); }

.controls-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; }
.ctrl-btn { width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--text-dim); transition: background .12s, color .12s, transform .1s; }
.ctrl-btn:active { transform: scale(0.92); }
.ctrl-btn:hover { background: var(--bg-hover); color: var(--text); }
.ctrl-btn.active { color: var(--accent-b); filter: drop-shadow(0 0 6px rgba(244,114,182,0.5)); }
.play-btn {
  width: 64px; height: 64px; margin: 0 6px;
  background: var(--accent-grad); color: #fff;
  box-shadow: 0 10px 28px -10px rgba(236,72,153,0.7);
}
.play-btn:hover { filter: brightness(1.1); color: #fff; }
.play-btn .icon-pause { display: none; }
body.playing .play-btn .icon-play { display: none; }
body.playing .play-btn .icon-pause { display: block; }

.volume-row { display: flex; align-items: center; gap: 10px; margin-top: 26px; max-width: 220px; margin-left: auto; margin-right: auto; }
.volume-row svg { color: var(--text-faint); flex: 0 0 auto; }

/* ============ Watch: playlist column ============ */
.watch-list { flex: 0 0 360px; width: 360px; }
.watch-list-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.song-list { display: flex; flex-direction: column; gap: 2px; }
.song-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background .12s;
}
.song-item:hover { background: var(--bg-hover); }
.song-item.active { background: var(--bg-active); }
.song-item.active .song-idx { color: var(--accent-a); }
.song-thumb { width: 46px; height: 46px; border-radius: var(--radius-sm); object-fit: cover; flex: 0 0 auto; background: var(--bg-elevated); box-shadow: 0 4px 14px -6px rgba(0,0,0,0.7); }
.song-meta { min-width: 0; flex: 1 1 auto; }
.song-title { font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-idx { width: 22px; text-align: center; color: var(--text-faint); font-size: 12.5px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.song-duration { margin-left: auto; color: var(--text-faint); font-size: 12px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }

.song-eq { display: none; flex: 0 0 auto; align-items: flex-end; gap: 2px; height: 14px; width: 16px; margin-right: 2px; }
.song-item.playing .song-eq { display: flex; }
.song-eq i { display: block; width: 3px; background: var(--accent-b); border-radius: 2px; animation: eq 0.9s ease-in-out infinite; }
.song-eq i:nth-child(1) { animation-delay: -0.6s; }
.song-eq i:nth-child(2) { animation-delay: -0.3s; }
.song-eq i:nth-child(3) { animation-delay: 0s; }
@keyframes eq { 0%,100% { height: 3px; } 50% { height: 14px; } }

/* ============ Bottom player bar ============ */
.player-bar {
  position: fixed; left: 10px; right: 10px; bottom: calc(10px + var(--safe-b));
  height: var(--playerbar-h); z-index: 40;
  display: flex; flex-direction: column;
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: 0 14px 34px -14px rgba(0,0,0,0.8);
  cursor: pointer;
  overflow: hidden;
}
.pb-progress { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--bg-active); }
.pb-progress-fill { height: 100%; width: 0%; background: var(--accent-grad); }
.pb-row { flex: 1 1 auto; display: flex; align-items: center; gap: 12px; padding: 8px 12px; min-width: 0; }
.pb-cover { width: 46px; height: 46px; border-radius: var(--radius-sm); object-fit: cover; flex: 0 0 auto; background: var(--bg-elevated); }
.pb-info { flex: 1 1 auto; min-width: 0; }
.pb-title { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pb-controls { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.pb-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: var(--text-dim); transition: background .12s, color .12s; }
.pb-btn:hover { background: var(--bg-hover); color: var(--text); }
.pb-play { color: #fff; background: var(--bg-active); }
.pb-play .icon-pause { display: none; }
body.playing .pb-play .icon-play { display: none; }
body.playing .pb-play .icon-pause { display: block; }
.pb-volume { display: none; align-items: center; gap: 8px; flex: 0 0 auto; }
.pb-volume svg { color: var(--text-faint); flex: 0 0 auto; }
.pb-volume .volume { width: 100px; }

/* ============ Responsive ============ */
@media (min-width: 900px) {
  .menu-btn { display: none; }
  .side-backdrop { display: none !important; }
  .pb-volume { display: flex; }
  .topbar-meta { display: flex; }
  .watch-top-title { display: none; }
}

@media (max-width: 899px) {
  .topbar-meta { display: none; }
  .sidebar {
    position: fixed; top: 0; bottom: 0; left: 0;
    transform: translateX(-105%);
    transition: transform .28s cubic-bezier(.32,.72,0,1);
    background: rgba(10,10,14,0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
  }
  #app.side-open .sidebar { transform: translateX(0); }
  .watch-cols { flex-direction: column; }
  .watch-list { flex: 1 1 auto; width: 100%; }
  .stage-visual { max-height: 40vh; }
  .main { padding: 14px 14px calc(var(--playerbar-h) + 28px); }
  body.watch-view .topbar { display: none; }
}

@media (max-width: 360px) {
  .brand-name { font-size: 15px; }
  .stage-title { font-size: 18px; }
  .card-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}

/* ============ Reduced motion ============ */
@media (prefers-reduced-motion: reduce) {
  .stage, .sidebar { transition: none; }
  .song-eq i { animation: none; height: 8px; }
  .disc-spin img.cover-img { animation: none; }
}
```

- [ ] **Step 2: Kiểm tra cú pháp**

Kiểm tra không còn tham chiếu layout cũ bị bỏ (`stage-open`, `.mini-player`, `.library`):

```powershell
Select-String -Path 'D:\Documents\CODE\HVL\css\style.css' -Pattern 'stage-open|mini-player|\.library' | Measure-Object
```

Kỳ vọng: kết quả 0. KHÔNG commit.

---

### Task 3: `js/app.js` — router view + lưới thẻ + sidebar + player bar

**Files:**
- Modify: `D:\Documents\CODE\HVL\js\app.js` (viết lại toàn bộ)

**Interfaces:**
- Consumes: toàn bộ ID từ Task 1; `SONGS` global từ `js/data.js`; hàm `setViewMode`, `handoff`, `cancelHandoff`, `restorePosition`, `saveState`, `restoreState`, `resumeIfWasPlaying`, `bindMediaEvents`, `updateMediaSession`, `initMediaSessionHandlers` giữ nguyên hành vi cũ.
- Produces: `showView('home'|'watch')`, `setFilter('all'|'mv')`, `applyFilters()`, `showPlayerBar()`, `onPickSong(e)` — dùng cho kiểm thử Task 4.

- [ ] **Step 1: Viết lại `js/app.js`**

Viết đè toàn bộ file `D:\Documents\CODE\HVL\js\app.js`:

```js
(() => {
  'use strict';

  const FOLDER = { img: 'images', audio: 'MP4', mv: 'MV' };
  const STORAGE_KEY = 'mck_player_state_v2';

  function urlFor(folder, filename) {
    return folder + '/' + encodeURIComponent(filename);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function normalize(str) {
    const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');
    return str
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .normalize('NFD').replace(DIACRITICS, '')
      .toLowerCase();
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  const $ = (id) => document.getElementById(id);

  // ---------- DOM refs ----------
  const els = {
    app: $('app'),
    menuBtn: $('menu-btn'),
    sidebar: $('sidebar'),
    sideNav: $('side-nav'),
    sideBackdrop: $('side-backdrop'),
    homeTitle: $('home-title'),
    cardGrid: $('card-grid'),
    songList: $('song-list'),
    noResults: $('no-results'),
    searchInput: $('search-input'),
    songCount: $('song-count'),
    viewHome: $('view-home'),
    viewWatch: $('view-watch'),
    btnBack: $('btn-back'),
    watchTopTitle: $('watch-top-title'),
    stageEmpty: $('stage-empty'),
    stageTitle: $('stage-title'),
    stageSub: $('stage-sub'),
    cover: $('cover-img'),
    discArt: $('disc-art'),
    video: $('mv-video'),
    audio: $('audio-el'),
    viewToggle: $('view-toggle'),
    mvBtn: $('mv-toggle-btn'),
    progress: $('progress'),
    timeCurrent: $('time-current'),
    timeDuration: $('time-duration'),
    shuffleBtn: $('btn-shuffle'),
    prevBtn: $('btn-prev'),
    playBtn: $('btn-play'),
    nextBtn: $('btn-next'),
    repeatBtn: $('btn-repeat'),
    volume: $('volume'),
    pbVolume: $('pb-volume'),
    playerBar: $('player-bar'),
    pbCover: $('pb-cover'),
    pbTitle: $('pb-title'),
    pbProgressFill: $('pb-progress-fill'),
    pbPlay: $('pb-play'),
    pbPrev: $('pb-prev'),
    pbNext: $('pb-next'),
    ambient: $('ambient'),
  };

  // ---------- State ----------
  const state = {
    current: -1,
    isPlaying: false,
    viewMode: 'image', // 'image' | 'mv'
    shuffle: false,
    repeat: 'off', // 'off' | 'all' | 'one'
    volume: 1,
    history: [],
    wasPlaying: false,
    view: 'home',   // 'home' | 'watch'
    filter: 'all',  // 'all' | 'mv'
  };

  let lastSaveTs = 0;
  let pendingHandoff = null;

  function activeEl() { return state.viewMode === 'mv' ? els.video : els.audio; }
  function inactiveEl() { return state.viewMode === 'mv' ? els.audio : els.video; }

  // ---------- Ambient glow ----------
  function setAmbient(src) {
    els.ambient.style.setProperty('--ambient-img', `url("${src}")`);
  }

  // ---------- Rendering: grid + playlist ----------
  const MV_BADGE = '<span class="mv-badge"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>MV</span>';

  function cardTemplate(s) {
    return `
      <li class="card-item" data-id="${s.id}">
        <div class="card-thumb">
          <img class="card-img" src="${urlFor(FOLDER.img, s.img)}" alt="" loading="lazy">
          ${s.mv ? MV_BADGE : ''}
          <span class="card-duration" data-dur="${s.id}">--:--</span>
          <span class="card-play-ov" aria-hidden="true">
            <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
            <svg class="icon-pause" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
          </span>
        </div>
        <div class="card-meta">
          <div class="card-title">${escapeHtml(s.title)}</div>
          <div class="card-sub">MCK</div>
        </div>
      </li>`;
  }

  function songTemplate(s) {
    return `
      <li class="song-item" data-id="${s.id}">
        <span class="song-idx">${s.id}</span>
        <img class="song-thumb" src="${urlFor(FOLDER.img, s.img)}" alt="" loading="lazy">
        <div class="song-meta">
          <div class="song-title">${escapeHtml(s.title)}</div>
          <div class="song-sub">MCK${s.mv ? MV_BADGE : ''}</div>
        </div>
        <span class="song-duration" data-dur="${s.id}">--:--</span>
        <span class="song-eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </li>`;
  }

  function renderGrid() {
    els.cardGrid.innerHTML = SONGS.map(cardTemplate).join('');
    els.songCount.textContent = SONGS.length + ' bài hát';
  }

  function renderList() {
    els.songList.innerHTML = SONGS.map(songTemplate).join('');
    loadDurations();
  }

  function loadDurations() {
    const seen = new Set();
    SONGS.forEach(song => {
      if (seen.has(song.audio)) return;
      seen.add(song.audio);
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.addEventListener('loadedmetadata', () => {
        if (!isFinite(probe.duration)) return;
        document.querySelectorAll(`[data-dur="${song.id}"]`).forEach(el => { el.textContent = formatTime(probe.duration); });
      });
      probe.src = urlFor(FOLDER.audio, song.audio);
    });
  }

  function updatePlayingHighlight() {
    const currentSong = SONGS[state.current];
    document.querySelectorAll('.card-item, .song-item').forEach(el => {
      const isCurrent = currentSong && Number(el.dataset.id) === currentSong.id;
      el.classList.toggle('active', !!isCurrent);
      el.classList.toggle('playing', !!isCurrent && state.isPlaying);
    });
  }

  function applyFilters() {
    const q = normalize(els.searchInput.value.trim());
    let visibleCount = 0;
    els.cardGrid.querySelectorAll('.card-item').forEach(li => {
      const song = SONGS.find(s => s.id === Number(li.dataset.id));
      if (!song) return;
      const byFilter = state.filter !== 'mv' || !!song.mv;
      const byQuery = !q || normalize(song.title).includes(q);
      const match = byFilter && byQuery;
      li.hidden = !match;
      if (match) visibleCount++;
    });
    els.noResults.hidden = visibleCount !== 0;
  }

  // ---------- View routing ----------
  function showView(view) {
    state.view = view;
    els.viewHome.hidden = view !== 'home';
    els.viewWatch.hidden = view !== 'watch';
    document.body.classList.toggle('watch-view', view === 'watch');
    closeSidebar();
    updateSidebarUI();
    showPlayerBar();
  }

  function isSideActive(btn) {
    const side = btn.dataset.side;
    if (side === 'home') return state.view === 'home' && state.filter === 'all';
    if (side === 'mv') return state.view === 'home' && state.filter === 'mv';
    if (side === 'watch') return state.view === 'watch';
    return false;
  }

  function updateSidebarUI() {
    els.sideNav.querySelectorAll('.side-item').forEach(b => b.classList.toggle('active', isSideActive(b)));
  }

  function setFilter(filter) {
    state.filter = filter;
    els.homeTitle.textContent = filter === 'mv' ? 'Có MV' : 'Trang chủ';
    applyFilters();
    updateSidebarUI();
  }

  function openSidebar() { els.app.classList.add('side-open'); }
  function closeSidebar() { els.app.classList.remove('side-open'); }

  function showPlayerBar() {
    els.playerBar.hidden = !(state.view === 'home' && state.current !== -1);
  }

  // ---------- Handoff: seamless Image <-> MV ----------
  function cancelHandoff() {
    if (pendingHandoff) { clearTimeout(pendingHandoff.timeout); pendingHandoff = null; }
  }

  function handoff(fromEl, toEl, wasPlaying, token, onFail) {
    if (!wasPlaying) {
      fromEl.pause();
      toEl.currentTime = 0;
      return;
    }
    const t = fromEl.currentTime || 0;
    const done = () => {
      if (pendingHandoff !== token) return;
      pendingHandoff = null;
      fromEl.pause();
      toEl.currentTime = t;
      toEl.play().catch(() => {});
    };
    const onReady = () => {
      if (pendingHandoff !== token) return;
      toEl.removeEventListener('canplay', onReady);
      done();
    };
    pendingHandoff = token;
    token.timeout = setTimeout(() => {
      if (pendingHandoff === token) {
        pendingHandoff = null;
        if (onFail) onFail();
      }
    }, 4000);
    if (toEl.readyState >= 1) done();
    else toEl.addEventListener('canplay', onReady);
  }

  function setViewMode(mode) {
    const song = SONGS[state.current];
    if (!song || mode === state.viewMode) return;
    if (mode === 'mv' && !song.mv) return;

    const fromMode = state.viewMode;
    const oldEl = activeEl();
    const wasPlaying = state.isPlaying;
    cancelHandoff();

    state.viewMode = mode;
    updateVisualVisibility();
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    const token = {};
    const onFail = () => {
      state.viewMode = fromMode;
      updateVisualVisibility();
      document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === fromMode));
    };
    handoff(oldEl, activeEl(), wasPlaying, token, onFail);
    saveState(true);
  }

  // ---------- Load / play a song ----------
  function loadSong(index, autoplay) {
    const song = SONGS[index];
    if (!song) return;
    cancelHandoff();
    state.current = index;
    state.history = state.history.filter(i => i !== index);

    els.audio.src = urlFor(FOLDER.audio, song.audio);
    els.cover.src = urlFor(FOLDER.img, song.img);
    els.pbCover.src = els.cover.src;
    setAmbient(els.cover.src);

    if (song.mv) {
      els.video.src = urlFor(FOLDER.mv, song.mv);
      els.mvBtn.disabled = false;
    } else {
      els.video.removeAttribute('src');
      els.mvBtn.disabled = true;
      state.viewMode = 'image';
    }

    els.stageEmpty.hidden = true;
    updateVisualVisibility();

    els.stageTitle.textContent = song.title;
    els.stageSub.textContent = 'MCK' + (song.mv ? ' · Có MV' : '');
    els.watchTopTitle.textContent = song.title;
    els.pbTitle.textContent = song.title;

    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.viewMode));
    updateMediaSession(song);
    updatePlayingHighlight();
    showPlayerBar();

    resetProgressUI();

    if (autoplay) play();
    else { state.isPlaying = false; syncPlayUI(); }

    saveState(true);
  }

  function updateVisualVisibility() {
    const isMv = state.viewMode === 'mv';
    els.video.hidden = !isMv;
    els.discArt.hidden = isMv;
  }

  // ---------- Transport ----------
  function play() {
    const el = activeEl();
    if (!el.src) { if (SONGS.length) { loadSong(0, true); return; } return; }
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  }
  function pause() { activeEl().pause(); }
  function togglePlay() {
    if (state.current === -1) { if (SONGS.length) loadSong(0, true); return; }
    state.isPlaying ? pause() : play();
  }

  function playNext(userInitiated) {
    if (state.current === -1) return;
    if (!userInitiated && state.repeat === 'one') { seek(0); play(); return; }

    let nextIdx;
    if (state.shuffle) {
      if (SONGS.length > 1) {
        do { nextIdx = Math.floor(Math.random() * SONGS.length); } while (nextIdx === state.current);
      } else nextIdx = 0;
      state.history.push(state.current);
    } else {
      nextIdx = state.current + 1;
      if (nextIdx >= SONGS.length) {
        if (state.repeat === 'all') nextIdx = 0;
        else { pause(); return; }
      }
    }
    loadSong(nextIdx, true);
  }

  function playPrev() {
    if (state.current === -1) return;
    const el = activeEl();
    if (el.currentTime > 3) { seek(0); return; }

    if (state.shuffle && state.history.length) {
      loadSong(state.history.pop(), true);
      return;
    }
    let prevIdx = state.current - 1;
    if (prevIdx < 0) prevIdx = state.repeat === 'all' ? SONGS.length - 1 : 0;
    loadSong(prevIdx, true);
  }

  function seek(time) {
    const el = activeEl();
    if (!isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration, time));
    updateProgressUI(el.currentTime, el.duration);
  }
  function seekBy(delta) {
    const el = activeEl();
    seek((el.currentTime || 0) + delta);
  }

  function setVolume(v) {
    v = Math.max(0, Math.min(1, v));
    state.volume = v;
    els.audio.volume = v;
    els.video.volume = v;
    els.volume.value = v;
    if (els.pbVolume) els.pbVolume.value = v;
    saveState(false);
  }

  // ---------- UI sync ----------
  function syncPlayUI() {
    document.body.classList.toggle('playing', state.isPlaying);
    updatePlayingHighlight();
  }
  function updateShuffleUI() { els.shuffleBtn.classList.toggle('active', state.shuffle); }
  function updateRepeatUI() { els.repeatBtn.classList.toggle('active', state.repeat !== 'off'); }

  function resetProgressUI() {
    els.progress.value = 0;
    els.progress.style.setProperty('--pct', '0%');
    els.timeCurrent.textContent = '0:00';
    els.timeDuration.textContent = '0:00';
    els.pbProgressFill.style.width = '0%';
  }

  function updateProgressUI(current, duration) {
    const pct = duration ? (current / duration) * 100 : 0;
    els.progress.value = pct;
    els.progress.style.setProperty('--pct', pct + '%');
    els.timeCurrent.textContent = formatTime(current);
    els.timeDuration.textContent = formatTime(duration);
    els.pbProgressFill.style.width = pct + '%';
  }

  // ---------- Media element events ----------
  function bindMediaEvents(el) {
    el.addEventListener('timeupdate', () => {
      if (el !== activeEl()) return;
      updateProgressUI(el.currentTime, el.duration);
      const now = Date.now();
      if (now - lastSaveTs > 3000) { saveState(false); lastSaveTs = now; }
      try {
        if ('mediaSession' in navigator && isFinite(el.duration)) {
          navigator.mediaSession.setPositionState({ duration: el.duration, playbackRate: 1, position: el.currentTime });
        }
      } catch (e) {}
    });

    el.addEventListener('loadedmetadata', () => {
      if (el !== activeEl()) return;
      updateProgressUI(el.currentTime, el.duration);
    });

    el.addEventListener('ended', () => {
      if (el !== activeEl()) return;
      playNext(false);
    });

    el.addEventListener('play', () => {
      if (el !== activeEl()) return;
      state.isPlaying = true;
      syncPlayUI();
    });

    el.addEventListener('pause', () => {
      if (el !== activeEl()) return;
      if (document.hidden && state.viewMode === 'mv') {
        setViewMode('image');
        return;
      }
      state.isPlaying = false;
      syncPlayUI();
    });
  }

  // ---------- Background playback ----------
  function handleHidden() {
    if (document.hidden && state.viewMode === 'mv' && state.isPlaying) {
      setViewMode('image');
    }
  }

  // ---------- Media Session (lock screen controls) ----------
  function updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: 'MCK',
        album: 'MCK Player',
        artwork: [{ src: urlFor(FOLDER.img, song.img), sizes: '512x512', type: 'image/jpeg' }],
      });
    } catch (e) {}
  }

  function initMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => play(),
      pause: () => pause(),
      previoustrack: () => playPrev(),
      nexttrack: () => playNext(true),
      stop: () => pause(),
      seekto: (details) => { if (details.seekTime != null) seek(details.seekTime); },
      seekbackward: (details) => seekBy(-(details.seekOffset || 10)),
      seekforward: (details) => seekBy(details.seekOffset || 10),
    };
    Object.keys(handlers).forEach(action => {
      try { navigator.mediaSession.setActionHandler(action, handlers[action]); } catch (e) {}
    });
  }

  // ---------- Persistence ----------
  function saveState(immediate) {
    try {
      const el = state.current !== -1 ? activeEl() : null;
      const data = {
        current: state.current,
        viewMode: state.viewMode,
        volume: state.volume,
        shuffle: state.shuffle,
        repeat: state.repeat,
        isPlaying: state.isPlaying,
        position: el ? el.currentTime : 0,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      if (immediate) lastSaveTs = Date.now();
    } catch (e) {}
  }

  function restorePosition(el, position, onDone) {
    const doSeek = () => {
      el.currentTime = position;
      const confirm = () => {
        el.removeEventListener('seeked', confirm);
        updateProgressUI(el.currentTime, el.duration);
        if (onDone) onDone();
      };
      if (!el.seeking && Math.abs(el.currentTime - position) < 0.25) confirm();
      else el.addEventListener('seeked', confirm);
    };
    if (el.readyState >= 1) doSeek();
    else el.addEventListener('loadedmetadata', function onMeta() {
      el.removeEventListener('loadedmetadata', onMeta);
      doSeek();
    });
  }

  function restoreState() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}

    if (saved && typeof saved.volume === 'number') setVolume(saved.volume);
    if (saved) {
      state.shuffle = !!saved.shuffle;
      state.repeat = ['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off';
      state.wasPlaying = !!saved.isPlaying;
    }
    updateShuffleUI();
    updateRepeatUI();

    if (saved && typeof saved.current === 'number' && SONGS[saved.current]) {
      state.viewMode = (saved.viewMode === 'mv' && SONGS[saved.current].mv) ? 'mv' : 'image';
      loadSong(saved.current, false);
      restorePosition(activeEl(), saved.position || 0, () => saveState(true));
    }
  }

  function resumeIfWasPlaying() {
    if (!state.wasPlaying) return;
    state.wasPlaying = false;
    document.addEventListener('pointerdown', function once() {
      document.removeEventListener('pointerdown', once);
      if (state.current !== -1) play();
    });
  }

  // ---------- Event wiring ----------
  function onPickSong(e) {
    const li = e.target.closest('.card-item, .song-item');
    if (!li) return;
    const id = Number(li.dataset.id);
    const idx = SONGS.findIndex(s => s.id === id);
    if (idx === -1) return;
    if (idx === state.current) { togglePlay(); }
    else { loadSong(idx, true); }
    showView('watch');
  }

  function initEvents() {
    els.cardGrid.addEventListener('click', onPickSong);
    els.songList.addEventListener('click', onPickSong);

    els.searchInput.addEventListener('input', () => applyFilters());

    els.sideNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.side-item');
      if (!btn) return;
      const side = btn.dataset.side;
      if (side === 'home') setFilter('all');
      else if (side === 'mv') setFilter('mv');
      else if (side === 'watch') {
        closeSidebar();
        if (state.current !== -1) showView('watch');
      }
    });

    els.menuBtn.addEventListener('click', openSidebar);
    els.sideBackdrop.addEventListener('click', closeSidebar);

    els.btnBack.addEventListener('click', () => showView('home'));

    els.playerBar.addEventListener('click', (e) => {
      if (e.target.closest('.pb-btn')) return;
      if (state.current !== -1) showView('watch');
    });
    els.pbPlay.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
    els.pbPrev.addEventListener('click', (e) => { e.stopPropagation(); playPrev(); });
    els.pbNext.addEventListener('click', (e) => { e.stopPropagation(); playNext(true); });

    els.viewToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-btn');
      if (!btn || btn.disabled) return;
      setViewMode(btn.dataset.mode);
    });

    els.playBtn.addEventListener('click', togglePlay);
    els.prevBtn.addEventListener('click', () => playPrev());
    els.nextBtn.addEventListener('click', () => playNext(true));
    els.shuffleBtn.addEventListener('click', () => { state.shuffle = !state.shuffle; updateShuffleUI(); saveState(true); });
    els.repeatBtn.addEventListener('click', () => {
      const modes = ['off', 'all', 'one'];
      state.repeat = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
      updateRepeatUI();
      saveState(true);
    });
    els.volume.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
    els.pbVolume.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));

    els.progress.addEventListener('input', () => {
      const el = activeEl();
      if (isFinite(el.duration)) el.currentTime = (els.progress.value / 100) * el.duration;
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': seekBy(5); break;
        case 'ArrowLeft': seekBy(-5); break;
        case 'ArrowUp': e.preventDefault(); setVolume(state.volume + 0.05); break;
        case 'ArrowDown': e.preventDefault(); setVolume(state.volume - 0.05); break;
        case 'Escape': if (state.view === 'watch') showView('home'); break;
      }
    });

    document.addEventListener('visibilitychange', () => {
      handleHidden();
      if (document.hidden) saveState(true);
    });
    window.addEventListener('pagehide', () => saveState(true));

    bindMediaEvents(els.audio);
    bindMediaEvents(els.video);
  }

  // ---------- Init ----------
  function init() {
    renderGrid();
    renderList();
    initEvents();
    initMediaSessionHandlers();
    restoreState();
    applyFilters();
    showView('home');
    resumeIfWasPlaying();

    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  init();
})();
```

- [ ] **Step 2: Kiểm tra cú pháp JS**

```powershell
node --check 'D:\Documents\CODE\HVL\js\app.js'
```

Kỳ vọng: không có lỗi, exit 0. KHÔNG commit.

---

### Task 4: Cập nhật bộ test Playwright cho DOM mới

**Files:**
- Modify: `C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js` (viết lại toàn bộ)

**Interfaces:**
- Consumes: DOM từ Task 1 + hành vi từ Task 3. Kiểm chứng spec: lưới 30 thẻ, watch page 2 cột, sidebar lọc, player bar, restore, mobile.

- [ ] **Step 1: Viết lại `verify-hvl.js`**

Viết đè toàn bộ file `C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js`:

```js
const { chromium } = require('playwright-core');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:8000';
const results = [];
let failed = 0;

function check(name, cond, extra) {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !extra ? '' : '  -> ' + extra}`);
  if (!cond) failed++;
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(BASE + '/index.html', { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);

  // --- Home grid ---
  const cards = await page.locator('.card-item').count();
  check('30 cards render on home', cards === 30, `count=${cards}`);
  const mvBadges = await page.locator('.card-item .mv-badge').count();
  check('6 MV badges on cards', mvBadges === 6, `count=${mvBadges}`);
  check('home view visible by default', await page.locator('#view-home').isVisible());
  check('watch view hidden by default', await page.locator('#view-watch').evaluate(el => el.hidden));
  check('player bar hidden with no song', await page.locator('#player-bar').evaluate(el => el.hidden));

  const pageState = async () => page.evaluate(() => ({
    playing: document.body.classList.contains('playing'),
    watchView: document.body.classList.contains('watch-view'),
    audioPaused: document.getElementById('audio-el').paused,
    videoPaused: document.getElementById('mv-video').paused,
    audioTime: document.getElementById('audio-el').currentTime,
    videoTime: document.getElementById('mv-video').currentTime,
    viewMode: document.getElementById('mv-video').hidden ? 'image' : 'mv',
    title: document.getElementById('stage-title').textContent,
    pbTitle: document.getElementById('pb-title').textContent,
    duration: document.getElementById('time-duration').textContent,
  }));

  // --- Open a card (song #2 has MV) ---
  await page.locator('.card-item').nth(1).click();
  await page.waitForTimeout(2500);
  let st = await pageState();
  check('card click opens watch view', st.watchView, JSON.stringify(st));
  check('player bar hidden on watch', await page.locator('#player-bar').evaluate(el => el.hidden));
  check('song 2 loaded', st.title.includes('IDK'), st.title);
  check('plays via audio (image mode)', !st.audioPaused && st.playing, JSON.stringify(st));
  check('video not active in image mode', st.viewMode === 'image');
  check('only one element plays', !st.audioPaused && st.videoPaused, `audioPaused=${st.audioPaused} videoPaused=${st.videoPaused}`);
  const t0 = st.audioTime;
  await page.waitForTimeout(1500);
  st = await pageState();
  check('audio progresses', st.audioTime > t0, `${t0} -> ${st.audioTime}`);
  const durText = await page.locator('.card-duration').first().textContent();
  check('card duration populated', durText !== '--:--', durText);
  const watchListCount = await page.locator('.song-item').count();
  check('playlist 30 rows in watch', watchListCount === 30, `count=${watchListCount}`);

  // --- MV switch ---
  await page.locator('#mv-toggle-btn').click();
  await page.waitForTimeout(2500);
  st = await pageState();
  check('switches to MV view', st.viewMode === 'mv', JSON.stringify(st));
  check('video plays after switch', !st.videoPaused, `videoPaused=${st.videoPaused}`);
  check('audio paused after switch', st.audioPaused);
  check('position carried over (video >= 1s)', st.videoTime >= 1, `videoTime=${st.videoTime}`);
  check('still only one element plays', !st.videoPaused && st.audioPaused);

  await page.locator('.view-btn[data-mode="image"]').click();
  await page.waitForTimeout(2000);
  st = await pageState();
  check('switches back to image', st.viewMode === 'image');
  check('audio resumes', !st.audioPaused && st.videoPaused, JSON.stringify(st));

  await page.locator('#mv-toggle-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.view-btn[data-mode="image"]').click();
  await page.waitForTimeout(2000);
  st = await pageState();
  check('no double-play after rapid switch', !(!st.audioPaused && !st.videoPaused), JSON.stringify(st));

  // --- Pick another song from the right column ---
  await page.locator('.song-item').nth(2).click();
  await page.waitForTimeout(1800);
  st = await pageState();
  check('pick from playlist -> song 3', st.title.includes('Wtf'), st.title);

  // --- Back to home; player bar ---
  await page.locator('#btn-back').click();
  await page.waitForTimeout(400);
  st = await pageState();
  check('back returns home', !st.watchView, JSON.stringify(st));
  check('player bar visible on home with song', await page.locator('#player-bar').isVisible());
  check('player bar shows current song', (await page.locator('#pb-title').textContent()).includes('Wtf'));

  // --- Player bar controls ---
  await page.locator('#pb-play').click();
  await page.waitForTimeout(300);
  st = await pageState();
  check('pb play toggles pause', st.audioPaused, JSON.stringify(st));
  await page.locator('#pb-play').click();
  await page.waitForTimeout(300);
  st = await pageState();
  check('pb play resumes', !st.audioPaused);
  await page.locator('#pb-next').click();
  await page.waitForTimeout(1800);
  st = await pageState();
  check('pb next -> song 4', st.title.includes('Anh Không Muốn'), st.title);
  await page.locator('#pb-prev').click();
  await page.waitForTimeout(1800);
  st = await pageState();
  check('pb prev -> song 3', st.title.includes('Wtf'), st.title);

  // --- Click bar opens watch ---
  await page.locator('#player-bar').click({ position: { x: 5, y: 30 } });
  await page.waitForTimeout(400);
  st = await pageState();
  check('tap bar opens watch', st.watchView);

  // --- Next / Prev (watch controls) ---
  await page.locator('#btn-next').click();
  await page.waitForTimeout(1800);
  st = await pageState();
  check('next -> song 4', st.title.includes('Anh Không Muốn'), st.title);
  await page.locator('#btn-prev').click();
  await page.waitForTimeout(1800);
  st = await pageState();
  check('prev -> song 3', st.title.includes('Wtf'), st.title);

  // --- Search filters grid ---
  await page.locator('#btn-back').click();
  await page.fill('#search-input', 'elegie');
  await page.waitForTimeout(300);
  check('search "elegie" finds 1 card', (await page.locator('.card-item:visible').count()) === 1);
  await page.fill('#search-input', '');

  // --- Sidebar MV filter ---
  await page.locator('.side-item[data-side="mv"]').click();
  await page.waitForTimeout(300);
  check('sidebar "Có MV" shows 6', (await page.locator('.card-item:visible').count()) === 6);
  check('home title switches to "Có MV"', (await page.locator('#home-title').textContent()).includes('Có MV'));
  await page.locator('.side-item[data-side="home"]').click();
  await page.waitForTimeout(300);
  check('back to all 30', (await page.locator('.card-item:visible').count()) === 30);

  // --- Sidebar "Đang phát" opens watch ---
  await page.locator('.side-item[data-side="watch"]').click();
  await page.waitForTimeout(400);
  st = await pageState();
  check('sidebar "Đang phát" opens watch', st.watchView);

  // --- Repeat cycle ---
  await page.locator('#btn-repeat').click();
  await page.waitForTimeout(100);
  check('repeat on (all)', await page.locator('#btn-repeat').evaluate(el => el.classList.contains('active')));
  await page.locator('#btn-repeat').click();
  await page.waitForTimeout(100);
  await page.locator('#btn-repeat').click();
  await page.waitForTimeout(100);
  check('repeat off after 3 clicks', await page.locator('#btn-repeat').evaluate(el => !el.classList.contains('active')));

  // --- Volume (both sliders synced) ---
  await page.fill('#volume', '0.35');
  await page.waitForTimeout(300);
  const vol = await page.locator('#volume').evaluate(el => el.value);
  check('volume set to 0.35', Math.abs(parseFloat(vol) - 0.35) < 0.02, `vol=${vol}`);
  const pbVol = await page.locator('#pb-volume').evaluate(el => el.value);
  check('pb volume synced', Math.abs(parseFloat(pbVol) - 0.35) < 0.02, `vol=${pbVol}`);

  // --- Duration in playlist column ---
  const durList = await page.locator('.song-duration').first().textContent();
  check('playlist duration populated', durList !== '--:--', durList);

  // --- Restore on reload (stays on home) ---
  await page.evaluate(() => { document.getElementById('audio-el').currentTime = 15; });
  await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(2000);
  st = await pageState();
  check('restore: same song (#3)', st.title.includes('Wtf'), st.title);
  check('restore: position ~15s', Math.abs(st.audioTime - 15) < 4, `pos=${st.audioTime}`);
  check('restore: stays on home', !st.watchView);
  const vol2 = await page.locator('#pb-volume').evaluate(el => el.value);
  check('restore: volume kept (pb)', Math.abs(parseFloat(vol2) - 0.35) < 0.02, `vol=${vol2}`);
  check('restore: player bar visible on home', await page.locator('#player-bar').isVisible());

  // --- Mobile viewport ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  check('player bar visible on mobile home', await page.locator('#player-bar').isVisible());
  await page.locator('#player-bar').click({ position: { x: 5, y: 30 } });
  await page.waitForTimeout(600);
  st = await pageState();
  check('mobile tap bar opens watch', st.watchView);
  check('mobile watch hides topbar', await page.locator('.topbar').evaluate(el => getComputedStyle(el).display === 'none'));
  check('volume visible in mobile watch', await page.locator('#volume').isVisible());
  check('playlist visible below on mobile watch', await page.locator('#song-list').isVisible());
  check('mobile watch in image mode', await page.locator('#mv-video').evaluate(el => el.hidden));

  // --- Esc returns home ---
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  st = await pageState();
  check('Esc returns home', !st.watchView);
  check('player bar back on home (mobile)', await page.locator('#player-bar').isVisible());

  // --- Ambient set ---
  const ambientBg = await page.locator('#ambient').evaluate(el => el.style.getPropertyValue('--ambient-img'));
  check('ambient glow background set', ambientBg.includes('images/'), ambientBg);

  console.log('\n=== RESULTS ===');
  results.forEach(r => console.log(r));
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (errors.length) { console.log('\n=== JS ERRORS ==='); errors.forEach(e => console.log(e)); }

  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(2); });
```

- [ ] **Step 2: Kiểm tra cú pháp**

```powershell
node --check 'C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js'
```

Kỳ vọng: không lỗi. KHÔNG commit.

---

### Task 5: Chạy toàn bộ kiểm thử

**Files:**
- Test: `C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js`
- Run trong: `D:\Documents\CODE\HVL`

- [ ] **Step 1: Kiểm tra cú pháp tất cả file JS**

```powershell
node --check 'D:\Documents\CODE\HVL\js\app.js'; if ($?) { node --check 'C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js' }
```

Kỳ vọng: cả 2 pass.

- [ ] **Step 2: Khởi động server và chạy test**

Chạy server ở nền (workdir = dự án), sau đó chạy suite:

```powershell
Start-Process python -ArgumentList '-m','http.server','8000' -WorkingDirectory 'D:\Documents\CODE\HVL'
Start-Sleep 2
node 'C:\Users\Admin\AppData\Local\Temp\opencode\verify-hvl.js'
```

Kỳ vọng: **47/47 PASS**, không có JS errors (PAGEERROR/CONSOLE). Nếu FAIL → gỡ lỗi bằng `systematic-debugging`, sửa rồi chạy lại cho tới khi toàn xanh.

- [ ] **Step 3: Kiểm tra thủ công trên điện thoại (người dùng)**

Mở `http://IP-máy-tính:8000` trên điện thoại cùng Wi-Fi: kiểm tra lưới thẻ, sidebar drawer (nút ☰), trang xem 1 cột + danh sách cuộn dưới, thanh phát đáy, khóa màn hình vẫn phát nền (MV tự chuyển về Ảnh). KHÔNG commit.

---

## Self-Review

**1. Spec coverage:**
- Trang chủ lưới thẻ vuông + duration + badge MV → Task 2 (CSS `.card-grid`/`.card-duration`/`.card-thumb .mv-badge`) + Task 3 (`cardTemplate`, `loadDurations`).
- Sidebar Trang chủ/Có MV/Đang phát → Task 1 (DOM) + Task 3 (`setFilter`, `showView`).
- Watch 2 cột desktop / 1 cột mobile + danh sách phát → Task 2 (`.watch-cols`, media queries) + Task 3 (`songTemplate`, `onPickSong`).
- Thanh phát đáy home (desktop+mobile), ẩn watch → Task 1 (DOM) + Task 2 (`.player-bar`) + Task 3 (`showPlayerBar`).
- Giữ màu/tokens/hiệu ứng → Task 2 giữ nguyên `:root` tokens, `.disc-*`, `.song-eq`, `.ambient`, reduced-motion.
- Khôi phục trạng thái ở Trang chủ → Task 3 `restoreState` + `init()` gọi `showView('home')`.
- Esc → home → Task 3 keydown.
- Không sửa `sw.js`/`data.js`, giữ `mck_player_state_v2` → Global Constraints + Task 1/2/3 chỉ đụng 3 file này + test script.
- Kiểm thử Playwright qua SW → Task 4 (vẫn `navigator.serviceWorker.ready` + reload).

**2. Placeholder scan:** Không có TBD/TODO; mọi bước đều có code đầy đủ.

**3. Type consistency:** Tên ID trong Task 1 (`player-bar`, `pb-play`, `pb-volume`, `view-watch`, `card-grid`...) khớp chính xác với `els` trong Task 3 và selector trong Task 4. `state.view`/`state.filter` nhất quán (`showView`/`setFilter`/`isSideActive`). Không còn `mini-player`/`stage-open` ở bất kỳ nơi nào.
