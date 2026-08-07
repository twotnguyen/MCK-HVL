(() => {
  'use strict';

  const FOLDER = { img: 'images', audio: 'MP4', mv: 'MV' };
  const STORAGE_KEY = 'mck_player_state_v2';

  function urlFor(folder, filename) {
    // Resolve to an absolute URL: relative url() values assigned via CSS custom
    // properties resolve against the stylesheet's location, not the page's, so a
    // plain relative path here would 404 (e.g. "css/images/..." for the ambient glow).
    return new URL(folder + '/' + encodeURIComponent(filename), document.baseURI).href;
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
    stageEmpty: $('stage-empty'),
    stageTitle: $('stage-title'),
    stageSub: $('stage-sub'),
    video: $('mv-video'),
    audio: $('audio-el'),
    sound: $('sound-el'),
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

  // els.sound is a real <audio> element and the ONLY thing that ever makes
  // sound. It always receives the same play()/pause() call as the visible tab
  // (Audio or MV), so it's gesture-backed from the very start — that's what
  // lets it keep playing when the app/screen is backgrounded on mobile,
  // without ever needing to start a *new*, ungestured play() call later (that
  // approach kept getting silently blocked by autoplay policy). els.video and
  // els.audio are muted decorative pictures only; see visualEl()/play()/pause().
  function activeEl() { return els.sound; }
  function visualEl() { return state.viewMode === 'mv' ? els.video : els.audio; }

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

  // ---------- Switching Audio <-> MV ----------
  // Both tabs share the one real sound element (els.sound); switching tabs
  // just points it at the other file and re-seeks it to the same position,
  // which is always a direct response to the user clicking the toggle (a real
  // gesture), so autoplay policy never gets in the way here.
  function setViewMode(mode) {
    const song = SONGS[state.current];
    if (!song || mode === state.viewMode) return;
    if (mode === 'mv' && !song.mv) return;

    const wasPlaying = state.isPlaying;
    const t = els.sound.currentTime || 0;

    state.viewMode = mode;
    updateVisualVisibility();
    document.querySelectorAll('.view-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

    els.sound.src = mode === 'mv' ? urlFor(FOLDER.mv, song.mv) : urlFor(FOLDER.audio, song.audio);
    const resume = () => {
      els.sound.currentTime = t;
      if (wasPlaying) els.sound.play().catch(() => {});
    };
    if (els.sound.readyState >= 1) resume();
    else els.sound.addEventListener('loadedmetadata', resume, { once: true });

    const newVisual = visualEl();
    const oldVisual = mode === 'mv' ? els.audio : els.video;
    oldVisual.pause();
    if (wasPlaying && newVisual.src) {
      newVisual.currentTime = t;
      newVisual.play().catch(() => {});
    }

    saveState(true);
  }

  // ---------- Load / play a song ----------
  function loadSong(index, autoplay) {
    const song = SONGS[index];
    if (!song) return;
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

    els.sound.src = (state.viewMode === 'mv' && song.mv) ? urlFor(FOLDER.mv, song.mv) : urlFor(FOLDER.audio, song.audio);

    els.stageEmpty.hidden = true;
    updateVisualVisibility();

    els.stageTitle.textContent = song.title;
    els.stageTitle.title = song.title;
    els.stageSub.textContent = 'MCK' + (song.mv ? ' · Có MV' : '');
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
  // els.sound carries the real audio; the visible tab's video/audio element
  // just mirrors it silently for the picture, best-effort (resynced here and
  // in the timeupdate handler if it drifts).
  function play() {
    if (!els.sound.src) { if (SONGS.length) { loadSong(0, true); return; } return; }
    const p = els.sound.play();
    if (p && p.catch) p.catch(() => {});
    const vEl = visualEl();
    if (vEl.src) {
      if (Math.abs((vEl.currentTime || 0) - (els.sound.currentTime || 0)) > 0.3) {
        vEl.currentTime = els.sound.currentTime || 0;
      }
      const vp = vEl.play();
      if (vp && vp.catch) vp.catch(() => {});
    }
  }
  function pause() {
    els.sound.pause();
    visualEl().pause();
  }
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
    const el = els.sound;
    if (!isFinite(el.duration)) return;
    el.currentTime = Math.max(0, Math.min(el.duration, time));
    updateProgressUI(el.currentTime, el.duration);
    const vEl = visualEl();
    if (vEl.src) vEl.currentTime = el.currentTime;
  }
  function seekBy(delta) {
    seek((els.sound.currentTime || 0) + delta);
  }

  function setVolume(v) {
    v = Math.max(0, Math.min(1, v));
    state.volume = v;
    els.sound.volume = v;
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

  // ---------- Sound events ----------
  // els.sound is the single source of truth for playback state — it's a real
  // <audio> element that browsers don't suspend in the background, so this is
  // also what keeps the song going when the app/screen is backgrounded.
  function bindSoundEvents() {
    const el = els.sound;

    el.addEventListener('timeupdate', () => {
      updateProgressUI(el.currentTime, el.duration);
      const now = Date.now();
      if (now - lastSaveTs > 3000) { saveState(false); lastSaveTs = now; }
      try {
        if ('mediaSession' in navigator && isFinite(el.duration)) {
          navigator.mediaSession.setPositionState({ duration: el.duration, playbackRate: 1, position: el.currentTime });
        }
      } catch (e) {}
      // Keep the decorative picture from drifting out of sync with the audio.
      const vEl = visualEl();
      if (!document.hidden && vEl.src && Math.abs((vEl.currentTime || 0) - el.currentTime) > 1) {
        vEl.currentTime = el.currentTime;
      }
    });

    el.addEventListener('loadedmetadata', () => {
      updateProgressUI(el.currentTime, el.duration);
    });

    el.addEventListener('ended', () => playNext(false));

    el.addEventListener('play', () => {
      state.isPlaying = true;
      syncPlayUI();
    });

    el.addEventListener('pause', () => {
      state.isPlaying = false;
      syncPlayUI();
    });
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
  function activateItem(li) {
    const id = Number(li.dataset.id);
    const idx = SONGS.findIndex(s => s.id === id);
    if (idx === -1) return;
    if (idx === state.current) { togglePlay(); }
    else { loadSong(idx, true); }
    showView('watch');
  }

  function onPickSong(e) {
    const li = e.target.closest('.card-item, .song-item');
    if (!li) return;
    activateItem(li);
  }

  function onKeySong(e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.card-item, .song-item');
    if (!li) return;
    e.preventDefault();
    e.stopPropagation();
    activateItem(li);
  }

  function initEvents() {
    els.cardGrid.addEventListener('click', onPickSong);
    els.songList.addEventListener('click', onPickSong);
    els.cardGrid.addEventListener('keydown', onKeySong);
    els.songList.addEventListener('keydown', onKeySong);

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
    els.pbVolume.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));

    els.progress.addEventListener('input', () => {
      if (isFinite(els.sound.duration)) seek((els.progress.value / 100) * els.sound.duration);
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
      if (document.hidden) saveState(true);
    });
    window.addEventListener('pagehide', () => saveState(true));

    bindSoundEvents();
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
