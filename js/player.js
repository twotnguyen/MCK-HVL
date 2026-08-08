'use strict';

// Playback engine: which element is "the" sound, loading/switching songs,
// transport controls (play/pause/seek/next/prev), Media Session (lock-screen
// controls), and saving/restoring state to localStorage.

// els.sound is a real <audio> element and the ONLY thing that ever makes
// sound. It always receives the same play()/pause() call as the visible tab
// (Audio or MV), so it's gesture-backed from the very start — that's what
// lets it keep playing when the app/screen is backgrounded on mobile,
// without ever needing to start a *new*, ungestured play() call later (that
// approach kept getting silently blocked by autoplay policy). els.video and
// els.audio are muted decorative pictures only; see visualEl()/play()/pause().
//
// Exception: iOS suspends <audio> the moment the app is backgrounded, so on
// iOS the audible element is inverted — the visible video (which shows the
// same mp4, all of which carry a video track) becomes the real sound source
// and is pushed into Picture-in-Picture when the app goes to the background,
// the one way web video keeps playing on iPhone. els.sound stays muted and
// only tracks time/state for the progress bar and Media Session.
const IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function activeEl() { return els.sound; }
function visualEl() { return state.viewMode === 'mv' ? els.video : els.audio; }

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

  if (IS_IOS) {
    // iOS background audio only survives inside a PiP'd video element, so the
    // visible picture carries the sound there; the hidden <audio> stays muted.
    els.sound.muted = true;
    els.audio.muted = false;
    els.video.muted = false;
  }

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
    if (IS_IOS) {
      vEl.volume = state.volume;
      if (Math.abs((vEl.currentTime || 0) - (els.sound.currentTime || 0)) > 0.3) {
        els.sound.currentTime = vEl.currentTime || 0;
      }
    } else if (Math.abs((vEl.currentTime || 0) - (els.sound.currentTime || 0)) > 0.3) {
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
  visualEl().volume = v;
  saveState(false);
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
    // On iOS the visible video IS the sound, so the muted tracker follows it.
    const vEl = visualEl();
    if (!document.hidden && vEl.src && Math.abs((vEl.currentTime || 0) - el.currentTime) > 1) {
      if (IS_IOS) el.currentTime = vEl.currentTime;
      else vEl.currentTime = el.currentTime;
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

  // On iOS the audible element is the visible video (it keeps playing via
  // Picture-in-Picture), so its own play/pause — e.g. tapping the floating
  // PiP window — must drive the muted tracker too, or the UI would lie.
  if (IS_IOS) {
    [els.audio, els.video].forEach((v) => {
      v.addEventListener('play', () => { if (!state.isPlaying) el.play().catch(() => {}); });
      v.addEventListener('pause', () => { if (state.isPlaying) el.pause(); });
    });
  }
}

// ---------- Media Session (lock screen controls) ----------
function updateMediaSession(song) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: 'MCK',
      album: 'HVL-MCK',
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
