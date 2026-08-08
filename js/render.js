'use strict';

// Rendering and view/UI-state functions: the home grid + playlist markup,
// filters, view routing (home/watch), and syncing small bits of UI (progress
// bar, shuffle/repeat pills, play state) to the DOM. No playback logic lives
// here — see player.js for that.

// ---------- Ambient glow ----------
function setAmbient(src) {
  els.ambient.style.setProperty('--ambient-img', `url("${src}")`);
}

// ---------- Rendering: grid + playlist ----------
const MV_BADGE = '<span class="mv-badge"><svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg>MV</span>';

function cardTemplate(s) {
  return `
    <li class="card-item" data-id="${s.id}" tabindex="0" role="button" aria-label="Phát ${escapeHtml(s.title)}">
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
    <li class="song-item" data-id="${s.id}" tabindex="0" role="button" aria-label="Phát ${escapeHtml(s.title)}">
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
  const queue = [];
  SONGS.forEach(song => {
    if (seen.has(song.audio)) return;
    seen.add(song.audio);
    queue.push(song);
  });

  const CONCURRENCY = 4;
  let cursor = 0;
  function runNext() {
    if (cursor >= queue.length) return;
    const song = queue[cursor++];
    const probe = new Audio();
    probe.preload = 'metadata';
    const finish = () => {
      probe.removeEventListener('loadedmetadata', onLoaded);
      probe.removeEventListener('error', finish);
      runNext();
    };
    const onLoaded = () => {
      if (isFinite(probe.duration)) {
        document.querySelectorAll(`[data-dur="${song.id}"]`).forEach(el => { el.textContent = formatTime(probe.duration); });
      }
      finish();
    };
    probe.addEventListener('loadedmetadata', onLoaded);
    probe.addEventListener('error', finish);
    probe.src = urlFor(FOLDER.audio, song.audio);
  }
  for (let i = 0; i < CONCURRENCY; i++) runNext();
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
  showPlayerBar();
  if (view === 'watch') requestAnimationFrame(positionBackButton);
}

function positionBackButton() {
  if (state.view !== 'watch') return;
  if (!window.matchMedia('(min-width: 1101px)').matches) {
    els.btnBack.style.left = '';
    return;
  }
  const wrap = els.btnBack.offsetParent;
  if (!wrap) return;
  const wrapRect = wrap.getBoundingClientRect();
  const videoRect = els.stageVisual.getBoundingClientRect();
  const targetCenter = videoRect.left / 2;
  const left = targetCenter - wrapRect.left - els.btnBack.offsetWidth / 2;
  els.btnBack.style.left = Math.max(0, left) + 'px';
}

function setFilter(filter) {
  state.filter = filter;
  els.homeTitle.textContent = filter === 'mv' ? 'Có MV' : 'Trang chủ';
  applyFilters();
  updateFilterPillsUI();
}

function updateFilterPillsUI() {
  if (els.filterGroup) {
    els.filterGroup.querySelectorAll('.filter-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === state.filter);
    });
  }
}

function showPlayerBar() {
  els.playerBar.hidden = !(state.view === 'home' && state.current !== -1);
}

function updateVisualVisibility() {
  const isMv = state.viewMode === 'mv';
  els.video.hidden = !isMv;
  els.audio.hidden = isMv;
}

// ---------- UI sync ----------
function syncPlayUI() {
  document.body.classList.toggle('playing', state.isPlaying);
  updatePlayingHighlight();
}
function updateShuffleUI() { els.shuffleBtn.classList.toggle('active', state.shuffle); }
function updateRepeatUI() {
  els.repeatBtn.classList.toggle('active', state.repeat !== 'off');
  els.repeatBtn.classList.toggle('repeat-one', state.repeat === 'one');
}

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
