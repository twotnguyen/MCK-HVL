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
    homeTitle: $('home-title'),
    filterGroup: $('filter-group'),
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
    showPlayerBar();
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
    const coverUrl = urlFor(FOLDER.img, song.img);
    els.pbCover.src = coverUrl;
    setAmbient(coverUrl);

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
    els.audio.hidden = isMv;
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
    if (els.volume) els.volume.value = v;
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

    if (els.filterGroup) {
      els.filterGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-pill');
        if (!btn) return;
        setFilter(btn.dataset.filter);
      });
    }

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
    if (els.volume) {
      els.volume.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
    }
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
