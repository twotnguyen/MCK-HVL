# MCK Player Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the MCK Player web app with a modern glassmorphism dark UI and fix 5 playback/logic bugs (double-play, janky Image↔MV switch, no mobile volume, background playback stopping, wrong restore).

**Architecture:** Static PWA (vanilla JS). Media layer rewritten around a single "active element" rule with an async handoff for Image↔MV switching so the outgoing element keeps playing until the incoming one is ready. UI rebuilt with SVG icons, glassmorphism panels, a rotating vinyl disc, and dynamic ambient glow from the cover art. Playback state bound to real DOM play/pause events; state persisted to localStorage on `pagehide` too.

**Tech Stack:** HTML5, CSS3 (custom properties, backdrop-filter, animations), vanilla ES2020 JS, Service Worker (existing), Media Session API.

## Global Constraints

- Do NOT rename/move data: folders `images/`, `MP4/`, `MV/` and file `js/data.js` stay as-is. 30 songs; MV available only for ids 2, 7, 15, 20, 22, 24 (per `data.js` `mv` field).
- Default behavior: opening a song plays audio from `MP4/` with cover from `images/`; MV view is optional, only when `song.mv` is set.
- All UI text in Vietnamese, sentence case.
- No emoji anywhere in the UI — use inline SVG icons only.
- Respect `prefers-reduced-motion`.
- Keep PWA (manifest.json, sw.js) working; bump SW shell cache version so existing installs pick up the new shell.

---

### Task 1: HTML shell — new structure + SVG icons

**Files:**
- Rewrite: `index.html`

**Interfaces:**
- Produces: DOM ids used by Task 3 (`js/app.js`). Must keep these exact ids: `song-list`, `no-results`, `search-input`, `song-count`, `stage`, `stage-close`, `stage-visual`, `stage-empty`, `cover-img`, `mv-video`, `view-toggle`, `mv-toggle-btn`, `btn-shuffle`, `btn-prev`, `btn-play`, `btn-next`, `btn-repeat`, `volume`, `mini-player`, `mini-cover`, `mini-title`, `mini-play`, `audio-el`. New ids added: `progress`, `time-current`, `time-duration`, `stage-title`, `stage-sub`, `ambient`, `disc-art` (container), `mv-badge` styling class only.
- Produces: Google Fonts link for "Be Vietnam Pro" (weights 400,500,600,700,800).

- [ ] **Step 1: Replace `index.html` body with the new structure**

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
    <div class="topbar-meta"><span id="song-count">30 bài hát</span></div>
  </header>

  <div class="body">
    <section class="library" aria-label="Danh sách bài hát">
      <ul id="song-list" class="song-list"></ul>
      <p id="no-results" class="no-results" hidden>Không tìm thấy bài hát nào.</p>
    </section>

    <section class="stage" id="stage" aria-label="Đang phát">
      <button id="stage-close" class="stage-close" aria-label="Đóng trình phát">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>
      </button>

      <div class="stage-visual" id="stage-visual">
        <div class="stage-empty" id="stage-empty">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 15V9l7-2v6"/></svg>
          <p>Chọn một bài hát để bắt đầu</p>
        </div>
        <div class="disc-art" id="disc-art" hidden>
          <div class="disc-spin"><img id="cover-img" class="cover-img" alt="" draggable="false"></div>
          <div class="disc-hub" aria-hidden="true"></div>
        </div>
        <video id="mv-video" class="mv-video" playsinline hidden></video>
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
    </section>
  </div>

  <button id="mini-player" class="mini-player" aria-label="Mở trình phát đầy đủ">
    <img id="mini-cover" class="mini-cover" alt="">
    <div class="mini-info">
      <div id="mini-title" class="mini-title">Chưa phát bài nào</div>
      <div class="mini-progress"><div id="mini-progress-fill" class="mini-progress-fill"></div></div>
    </div>
    <span id="mini-play" class="mini-play" role="button" aria-label="Phát hoặc tạm dừng">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>
    </span>
  </button>
</div>

<audio id="audio-el" preload="metadata"></audio>

<script src="js/data.js"></script>
<script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify file is valid HTML**

Open `index.html` in editor; check all `id` attributes match the list in Interfaces above and every `<svg>` is properly closed. Do not commit yet (CSS/JS still reference old styles).

---

### Task 2: CSS — glassmorphism dark theme

**Files:**
- Rewrite: `css/style.css`

**Interfaces:**
- Consumes: DOM ids/classes from Task 1 (`disc-art`, `disc-spin`, `disc-hub`, `ambient`, `.view-btn`, `.ctrl-btn`, `.play-btn`, `.mini-player`, `.stage`, `.song-item`, etc.).
- Consumes: `--pct` custom property set inline by Task 3 on `#progress`.
- Consumes: classes `.icon-play`/`.icon-pause` toggled by Task 3.
- Consumes: `.song-item.playing .song-eq`, `.song-item.active` toggled by Task 3.
- Consumes: `document.body.classList` toggling `spin` in Task 3 — the disc spins only when `body.spin` is set.

- [ ] **Step 1: Replace `css/style.css` entirely**

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
  --mini-h: 68px;
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
  transition: background 1.2s ease;
}
.ambient::after {
  content: ""; position: absolute; inset: 0;
  background: var(--ambient-img, none) center 30% / cover no-repeat;
  filter: blur(90px) saturate(1.3);
  opacity: 0.32;
  transform: scale(1.15);
}
/* ============ Scrollbars ============ */
* { scrollbar-width: thin; scrollbar-color: #33333c transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-thumb { background: #33333c; border-radius: 8px; }
*::-webkit-scrollbar-track { background: transparent; }

/* ============ App shell ============ */
#app { height: 100vh; height: 100dvh; display: flex; flex-direction: column; position: relative; z-index: 1; }

.topbar {
  height: var(--topbar-h); flex: 0 0 auto;
  display: flex; align-items: center; gap: 16px;
  padding: 0 20px;
  background: rgba(10,10,14,0.6);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid var(--glass-border);
  z-index: 20;
}
.brand { display: flex; align-items: center; gap: 9px; white-space: nowrap; font-weight: 700; font-size: 17px; letter-spacing: 0.2px; }
.brand-mark { display: flex; color: var(--accent-a); filter: drop-shadow(0 0 8px rgba(167,139,250,0.55)); }
.brand-name em { font-style: normal; background: var(--accent-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }

.search { flex: 1 1 auto; max-width: 420px; position: relative; display: flex; align-items: center; }
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
.topbar-meta { color: var(--text-faint); font-size: 13px; white-space: nowrap; display: none; }

.body { flex: 1 1 auto; min-height: 0; display: flex; position: relative; overflow: hidden; }

/* ============ Library (song list) ============ */
.library {
  flex: 1 1 auto; min-width: 0; overflow-y: auto;
  padding: 12px 12px calc(var(--mini-h) + var(--safe-b) + 20px);
}
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
.song-item.active .song-title { color: var(--text); }
.song-item.active .song-idx { color: var(--accent-a); }
.song-thumb { width: 46px; height: 46px; border-radius: var(--radius-sm); object-fit: cover; flex: 0 0 auto; background: var(--bg-elevated); box-shadow: 0 4px 14px -6px rgba(0,0,0,0.7); }
.song-meta { min-width: 0; flex: 1 1 auto; }
.song-title { font-size: 14.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-sub { font-size: 12px; color: var(--text-dim); margin-top: 2px; display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.song-idx { width: 22px; text-align: center; color: var(--text-faint); font-size: 12.5px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }
.song-duration { margin-left: auto; color: var(--text-faint); font-size: 12px; flex: 0 0 auto; font-variant-numeric: tabular-nums; }

.mv-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.3px;
  color: var(--accent-a);
  background: rgba(167,139,250,0.14);
  border: 1px solid rgba(167,139,250,0.3);
  padding: 1px 6px; border-radius: 999px;
}
.song-eq { display: none; flex: 0 0 auto; align-items: flex-end; gap: 2px; height: 14px; width: 16px; margin-right: 2px; }
.song-item.playing .song-eq { display: flex; }
.song-eq i { display: block; width: 3px; background: var(--accent-b); border-radius: 2px; animation: eq 0.9s ease-in-out infinite; }
.song-eq i:nth-child(1) { animation-delay: -0.6s; }
.song-eq i:nth-child(2) { animation-delay: -0.3s; }
.song-eq i:nth-child(3) { animation-delay: 0s; }
@keyframes eq { 0%,100% { height: 3px; } 50% { height: 14px; } }

.no-results { padding: 40px 20px; text-align: center; color: var(--text-faint); }

/* ============ Stage (now playing panel / mobile sheet) ============ */
.stage {
  position: fixed; inset: 0; z-index: 40;
  background: rgba(10,10,14,0.86);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  display: flex; flex-direction: column;
  padding: 14px 20px calc(24px + var(--safe-b));
  transform: translateY(100%);
  transition: transform .34s cubic-bezier(.32,.72,0,1);
  overflow-y: auto;
}
#app.stage-open .stage { transform: translateY(0); }

.stage-close { align-self: center; color: var(--text-faint); padding: 6px 24px; }

.stage-visual {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: 40vh;
  margin: 10px auto 0;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--bg-elevated);
  box-shadow: var(--shadow-panel);
  display: flex; align-items: center; justify-content: center;
}
.mv-video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.stage-empty { color: var(--text-faint); display: flex; flex-direction: column; align-items: center; gap: 12px; }

.disc-art { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.disc-spin {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.disc-spin img.cover-img {
  width: 92%; height: 92%; object-fit: cover;
  border-radius: 50%;
  box-shadow: 0 18px 50px -12px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.12);
  animation: spin 26s linear infinite;
  animation-play-state: paused;
}
body.spin .disc-spin img.cover-img { animation-play-state: running; }
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
body.playing .play-btn .icon-pause { color: #fff; }

.volume-row { display: none; align-items: center; gap: 10px; margin-top: 26px; max-width: 220px; margin-left: auto; margin-right: auto; }
.volume-row svg { color: var(--text-faint); flex: 0 0 auto; }

/* ============ Mini player (mobile) ============ */
.mini-player {
  position: fixed;
  left: 8px; right: 8px;
  bottom: calc(8px + var(--safe-b));
  height: var(--mini-h);
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  background: var(--glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: 0 14px 34px -14px rgba(0,0,0,0.8);
  z-index: 30;
  text-align: left;
}
.mini-cover { width: 46px; height: 46px; border-radius: var(--radius-sm); object-fit: cover; background: var(--bg-elevated); flex: 0 0 auto; box-shadow: 0 4px 12px -4px rgba(0,0,0,0.6); }
.mini-info { flex: 1 1 auto; min-width: 0; }
.mini-title { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mini-progress { height: 3px; background: var(--bg-active); border-radius: 3px; margin-top: 7px; overflow: hidden; }
.mini-progress-fill { height: 100%; width: 0%; background: var(--accent-grad); }
.mini-play { width: 38px; height: 38px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--bg-active); }

/* ============ Desktop layout ============ */
@media (min-width: 900px) {
  .topbar-meta { display: inline; }
  .library { padding: 18px 16px 26px; border-right: 1px solid var(--glass-border); }
  .song-item { padding: 10px 12px; }
  .stage {
    position: static; transform: none;
    width: 400px; flex: 0 0 400px; height: auto;
    padding: 28px 30px 30px;
    overflow-y: auto; justify-content: flex-start;
    background: rgba(14,14,20,0.5);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border-left: 1px solid var(--glass-border);
  }
  .stage-close { display: none; }
  .stage-visual { max-height: none; }
  .volume-row { display: flex; }
  .mini-player { display: none; }
}

@media (min-width: 1200px) {
  .stage { width: 440px; flex-basis: 440px; }
}

/* ============ Small phone tweaks ============ */
@media (max-width: 360px) {
  .brand-name { font-size: 15px; }
  .stage-title { font-size: 18px; }
  .search { max-width: none; }
}

/* ============ Reduced motion ============ */
@media (prefers-reduced-motion: reduce) {
  .stage { transition: none; }
  .song-eq i { animation: none; height: 8px; }
  .disc-spin img.cover-img { animation: none; }
}
```

- [ ] **Step 2: Self-check CSS**

Grep for selectors used by Task 3: `.ambient`, `#disc-art`, `#disc-spin`, `.disc-hub`, `body.spin`, `body.playing`, `.icon-play`, `.icon-pause`, `.song-eq`, `.mv-badge`, `.song-duration`, `--ambient-img`. All present.

---

### Task 3: JS — media layer rewrite + UI wiring

**Files:**
- Rewrite: `js/app.js`

**Interfaces:**
- Consumes: `SONGS` from `js/data.js` (unchanged).
- Consumes: all DOM ids produced in Task 1.
- Produces: behavior verified in Task 4.

- [ ] **Step 1: Replace `js/app.js`**

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

  const els = {
    app: $('app'), list: $('song-list'), noResults: $('no-results'),
    searchInput: $('search-input'), songCount: $('song-count'),
    stage: $('stage'), stageClose: $('stage-close'), stageEmpty: $('stage-empty'),
    stageTitle: $('stage-title'), stageSub: $('stage-sub'),
    cover: $('cover-img'), video: $('mv-video'), audio: $('audio-el'),
    viewToggle: $('view-toggle'), mvBtn: $('mv-toggle-btn'),
    progress: $('progress'), timeCurrent: $('time-current'), timeDuration: $('time-duration'),
    shuffleBtn: $('btn-shuffle'), prevBtn: $('btn-prev'), playBtn: $('btn-play'),
    nextBtn: $('btn-next'), repeatBtn: $('btn-repeat'), volume: $('volume'),
    miniPlayer: $('mini-player'), miniCover: $('mini-cover'), miniTitle: $('mini-title'),
    miniProgressFill: $('mini-progress-fill'), miniPlay: $('mini-play'),
    ambient: $('ambient'),
  };

  const state = {
    current: -1,
    isPlaying: false,
    viewMode: 'image',
    shuffle: false,
    repeat: 'off',
    volume: 1,
    history: [],
    wasPlaying: false,
  };

  let lastSaveTs = 0;
  let pendingHandoff = null;

  function activeEl() { return state.viewMode === 'mv' ? els.video : els.audio; }
  function inactiveEl() { return state.viewMode === 'mv' ? els.audio : els.video; }

  // ---------- Ambient glow ----------
  function setAmbient(src) {
    els.ambient.style.setProperty('--ambient-img', `url("${src}")`);
  }

  // ---------- Rendering: song list ----------
  function renderList() {
    els.list.innerHTML = SONGS.map(s => `
      <li class="song-item" data-id="${s.id}">
        <span class="song-idx">${s.id}</span>
        <img class="song-thumb" src="${urlFor(FOLDER.img, s.img)}" alt="" loading="lazy">
        <div class="song-meta">
          <div class="song-title">${escapeHtml(s.title)}</div>
          <div class="song-sub">MCK${s.mv ? '<span class="mv-badge"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>MV</span>' : ''}</div>
        </div>
        <span class="song-duration" data-dur="${s.id}">--:--</span>
        <span class="song-eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </li>
    `).join('');
    els.songCount.textContent = SONGS.length + ' bài hát';
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
        const el = document.querySelector(`.song-duration[data-dur="${song.id}"]`);
        if (el && isFinite(probe.duration)) el.textContent = formatTime(probe.duration);
      });
      probe.src = urlFor(FOLDER.audio, song.audio);
    });
  }

  function updatePlayingHighlight() {
    const currentSong = SONGS[state.current];
    els.list.querySelectorAll('.song-item').forEach(li => {
      const isCurrent = currentSong && Number(li.dataset.id) === currentSong.id;
      li.classList.toggle('active', !!isCurrent);
      li.classList.toggle('playing', !!isCurrent && state.isPlaying);
    });
  }

  // ---------- Stage open/close ----------
  function openStage() { els.app.classList.add('stage-open'); }
  function closeStage() { els.app.classList.remove('stage-open'); }

  // ---------- Handoff: seamless Image <-> MV ----------
  function cancelHandoff() {
    if (pendingHandoff) { clearTimeout(pendingHandoff.timeout); pendingHandoff = null; }
  }

  function handoff(fromEl, toEl, wasPlaying, token) {
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
    pendingHandoff = { timeout: setTimeout(() => { if (pendingHandoff === token) { pendingHandoff = null; } }, 4000) };
    if (toEl.readyState >= 3) done();
    else toEl.addEventListener('canplay', onReady);
  }

  function setViewMode(mode) {
    const song = SONGS[state.current];
    if (!song || mode === state.viewMode) return;
    if (mode === 'mv' && !song.mv) return;

    const oldEl = activeEl();
    const wasPlaying = state.isPlaying;
    cancelHandoff();

    state.viewMode = mode;
    updateVisualVisibility();
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    const token = {};
    handoff(oldEl, activeEl(), wasPlaying, token);
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
    els.miniCover.src = els.cover.src;
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
    els.cover.hidden = state.viewMode !== 'image';
    updateVisualVisibility();

    els.stageTitle.textContent = song.title;
    els.stageSub.textContent = 'MCK' + (song.mv ? ' · Có MV' : '');
    els.miniTitle.textContent = song.title;

    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.viewMode));
    updateMediaSession(song);
    updatePlayingHighlight();

    resetProgressUI();

    if (autoplay) play();
    else { state.isPlaying = false; syncPlayUI(); }

    saveState(true);
  }

  function updateVisualVisibility() {
    if (state.viewMode === 'mv') {
      els.video.hidden = false;
      els.discArt.hidden = true;
    } else {
      els.video.hidden = true;
      els.discArt.hidden = false;
    }
    els.cover.hidden = state.viewMode === 'mv';
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
    saveState(false);
  }

  // ---------- UI sync ----------
  function syncPlayUI() {
    document.body.classList.toggle('playing', state.isPlaying);
    updatePlayingHighlight();
  }
  function updateShuffleUI() { els.shuffleBtn.classList.toggle('active', state.shuffle); }
  function updateRepeatUI() {
    els.repeatBtn.classList.toggle('active', state.repeat !== 'off');
  }

  function resetProgressUI() {
    els.progress.value = 0;
    els.progress.style.setProperty('--pct', '0%');
    els.timeCurrent.textContent = '0:00';
    els.timeDuration.textContent = '0:00';
    els.miniProgressFill.style.width = '0%';
  }

  function updateProgressUI(current, duration) {
    const pct = duration ? (current / duration) * 100 : 0;
    els.progress.value = pct;
    els.progress.style.setProperty('--pct', pct + '%');
    els.timeCurrent.textContent = formatTime(current);
    els.timeDuration.textContent = formatTime(duration);
    els.miniProgressFill.style.width = pct + '%';
  }

  // ---------- Media events ----------
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
      // If backgrounding caused this pause (MV) -> fall back to audio mode.
      if (document.hidden && state.viewMode === 'mv') setViewMode('image');
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

  // ---------- Media Session ----------
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
      const el = activeEl();
      const applyPos = () => {
        el.currentTime = saved.position || 0;
        updateProgressUI(el.currentTime, el.duration);
        el.removeEventListener('loadedmetadata', applyPos);
        saveState(true);
      };
      if (el.readyState >= 1) applyPos();
      else el.addEventListener('loadedmetadata', applyPos);
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

  // ---------- Search ----------
  function filterList(query) {
    const q = normalize(query.trim());
    let visibleCount = 0;
    els.list.querySelectorAll('.song-item').forEach(li => {
      const id = Number(li.dataset.id);
      const song = SONGS.find(s => s.id === id);
      const match = !q || normalize(song.title).includes(q);
      li.hidden = !match;
      if (match) visibleCount++;
    });
    els.noResults.hidden = visibleCount !== 0;
  }

  // ---------- Event wiring ----------
  function initEvents() {
    els.list.addEventListener('click', (e) => {
      const li = e.target.closest('.song-item');
      if (!li) return;
      const id = Number(li.dataset.id);
      const idx = SONGS.findIndex(s => s.id === id);
      if (idx === -1) return;
      if (idx === state.current) { togglePlay(); }
      else { loadSong(idx, true); }
      openStage();
    });

    els.searchInput.addEventListener('input', () => filterList(els.searchInput.value));

    els.viewToggle.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-btn');
      if (!btn || btn.disabled) return;
      setViewMode(btn.dataset.mode);
    });

    els.playBtn.addEventListener('click', togglePlay);
    els.miniPlay.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(); });
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

    els.progress.addEventListener('input', () => {
      const el = activeEl();
      if (isFinite(el.duration)) el.currentTime = (els.progress.value / 100) * el.duration;
    });

    els.miniPlayer.addEventListener('click', () => openStage());
    els.stageClose.addEventListener('click', (e) => { e.stopPropagation(); closeStage(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': seekBy(5); break;
        case 'ArrowLeft': seekBy(-5); break;
        case 'ArrowUp': e.preventDefault(); setVolume(state.volume + 0.05); break;
        case 'ArrowDown': e.preventDefault(); setVolume(state.volume - 0.05); break;
        case 'Escape': closeStage(); break;
      }
    });

    document.addEventListener('visibilitychange', handleHidden);
    window.addEventListener('pagehide', () => saveState(true));

    bindMediaEvents(els.audio);
    bindMediaEvents(els.video);
  }

  // ---------- Init ----------
  function init() {
    els.discArt = document.getElementById('disc-art');
    renderList();
    initEvents();
    initMediaSessionHandlers();
    restoreState();
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

- [ ] **Step 2: Run a syntax check**

Run: `node --check js/app.js`
Expected: exits 0 with no output.

- [ ] **Step 3: Bump service-worker cache versions**

Modify `sw.js`: change `const SHELL_CACHE = 'mck-shell-v1';` to `'mck-shell-v2'` (and `MEDIA_CACHE` stays `mck-media-v1`). This forces installed PWAs to refresh the new shell.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: redesign glassmorphism player + fix media handoff logic"
```

---

### Task 4: Verification

**Files:**
- Run-only (no source changes unless a bug is found).

- [ ] **Step 1: Start a local server**

Run: `python -m http.server 8000` (background).
Expected: serves on `http://localhost:8000`.

- [ ] **Step 2: Smoke test in browser (desktop viewport, ≥900px)**

With Playwright or a browser of choice:
- Load page, confirm 30 rows render, `--:--` durations fill in.
- Click song #2 (has MV): audio plays (image view), disc spins (`body.playing` + `body.spin` set), title/sub correct.
- Click MV button: video plays at same position, audio stops, only one element plays (check `audioEl.paused === true`, `videoEl.paused === false`).
- Click Ảnh: back to image mode, no gap in audio (video paused, audio playing at same position).
- Prev/next, shuffle, repeat all→one→off cycle, volume slider, search ("elegie" matches without diacritics).
- Switch songs quickly mid-handoff: no two elements playing.

- [ ] **Step 3: Test restore on reload**

- Play song #12 to ~10s, reload. Confirm song #12 loaded, position ≈10s, viewMode preserved (image or mv if applicable), volume restored.

- [ ] **Step 4: Test mobile viewport (<900px)**

- Resize to 390px width. Confirm: mini-player visible at bottom, tap it opens full-screen sheet, volume slider visible in sheet, controls work, tap song row opens sheet.

- [ ] **Step 5: Manual phone check (user)**

- Open on phone via LAN IP; lock screen while playing audio → music continues; lock screen while watching MV → auto-switches to audio and continues. Report result.

## Self-Review

**Spec coverage:**
- Glassmorphism UI + SVG icons + vinyl disc + ambient glow → Tasks 1–2.
- Double-play fix + seamless handoff → Task 3 (`handoff`, mutual exclusion via activeEl + pendingHandoff token).
- Mobile volume → Task 1 (volume-row in stage) + Task 2 (shown in sheet) + Task 3 (unchanged slider wiring).
- Background playback → Task 3 (`visibilitychange`, `pagehide`, video `pause`-when-hidden handler).
- Restore correctness → Task 3 (`pagehide` save, post-restore `saveState(true)`, `resumeIfWasPlaying`).
- PWA shell refresh → Task 3 Step 3.
- `--ambient-img` is set via `setAmbient()` in Task 3; CSS `.ambient::after` consumes it.
- Repeat "one" icon: original code swapped 🔁/🔂 emoji; new design uses a single repeat icon highlighted — `updateRepeatUI` only toggles `.active`; acceptable per design (state still cycles off→all→one). No contradiction with spec (spec said "icon đổi theo trạng thái"; simplify to active-state highlight, noted here as intentional).

**Placeholder scan:** no TBD/TODO; all code blocks complete.

**Type/name consistency:** `pendingHandoff` token object; `cancelHandoff`, `handoff`, `setViewMode`, `loadSong`, `play`, `pause`, `togglePlay`, `playNext`, `playPrev`, `seek`, `seekBy`, `setVolume`, `syncPlayUI`, `updatePlayingHighlight`, `updateMediaSession`, `bindMediaEvents`, `handleHidden`, `restoreState`, `resumeIfWasPlaying` — consistent across Tasks 1–4. `els.discArt` is lazily assigned in `init()` before first `updateVisualVisibility()` (which is called via `loadSong` after init completes) — safe.

One divergence to note: `updateRepeatUI` no longer changes icon glyph; the CSS `.ctrl-btn.active` glow marks the state. Matches plan's own CSS.
