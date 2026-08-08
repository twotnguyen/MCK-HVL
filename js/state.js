'use strict';

// Shared foundation for the other js/*.js files: constants, small pure
// helpers, DOM element refs, and the one mutable state object. Loaded first
// (after data.js) so everything below can use these as plain shared globals —
// there's no bundler here, so these files rely on classic <script> tags
// sharing one top-level scope, the same way data.js's SONGS already does.

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
  brandHome: $('brand-home'),
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
  stageVisual: $('stage-visual'),
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
  fullscreenBtn: $('btn-fullscreen'),
  btnFsBack: $('btn-fs-back'),
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
