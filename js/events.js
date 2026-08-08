'use strict';

// Event wiring and app bootstrap. Loaded last, since init() calls functions
// defined in every other js/*.js file.

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

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  updateShuffleUI();
  saveState(true);
}

function cycleRepeat() {
  const modes = ['off', 'all', 'one'];
  state.repeat = modes[(modes.indexOf(state.repeat) + 1) % modes.length];
  updateRepeatUI();
  saveState(true);
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

  els.stageVisual.addEventListener('click', (e) => {
    if (e.target.closest('.stage-overlay') || e.target.closest('#btn-back')) return;
    els.stageVisual.classList.toggle('overlay-visible');
  });
  document.addEventListener('click', (e) => {
    if (!els.stageVisual.classList.contains('overlay-visible')) return;
    if (els.stageVisual.contains(e.target)) return;
    els.stageVisual.classList.remove('overlay-visible');
  });

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
  els.shuffleBtn.addEventListener('click', toggleShuffle);
  els.repeatBtn.addEventListener('click', cycleRepeat);
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
      case 'KeyN': playNext(true); break;
      case 'KeyP': playPrev(); break;
      case 'KeyS': toggleShuffle(); break;
      case 'KeyR': cycleRepeat(); break;
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
