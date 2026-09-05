// ============================================================
// DK MUSIC — SPOTIFY 3D & OFFLINE ENGINE (PRODUCTION GRADE)
// 100% Royalty Free • 3D Vinyl • 3D Visualizer • Compact Mobile
// ============================================================

// ── Application State ───────────────────────────────────────
let songs = [];
let playlists = [];            // [{ id, name, description, cover, created, songs }]
let playlistSongMap = {};      // { playlistId: Set<songId> }
let likedSongs = new Set();
let recentIds = [];
let currentQueue = [];         // Active playing queue
let currentSongIndex = -1;
let isShuffled = false;
let repeatMode = 0;            // 0 = off, 1 = all, 2 = one
let currentSection = 'home';
let activePlaylistId = null;
let currentAlbumName = null;
let selectedSongForModal = null;
const historyStack = ['home'];
let historyPos = 0;

// Offline & 3D state
let offlineTrackIds = new Set();
let currentSearchGenre = 'all';
let currentLyricsLines = [];
let activeLyricIdx = -1;

// ── Initialize Persisted State ──────────────────────────────
try {
  likedSongs = new Set(JSON.parse(localStorage.getItem('dk_liked') || '[]'));
} catch (e) { likedSongs = new Set(); }

try {
  recentIds = JSON.parse(localStorage.getItem('dk_recent') || '[]');
} catch (e) { recentIds = []; }

try {
  playlists = JSON.parse(localStorage.getItem('dk_playlists') || '[]');
  playlistSongMap = {};
  playlists.forEach(pl => {
    playlistSongMap[pl.id] = new Set(pl.songs || []);
  });
} catch (e) {
  playlists = [];
  playlistSongMap = {};
}

// ── DOM References ──────────────────────────────────────────
const audioEl              = document.getElementById('audioPlayer');
const btnPlayPause         = document.getElementById('btnPlayPause');
const playIcon             = document.getElementById('playIcon');
const btnPrev              = document.getElementById('btnPrev');
const btnNext              = document.getElementById('btnNext');
const btnShuffle           = document.getElementById('btnShuffle');
const btnRepeat            = document.getElementById('btnRepeat');
const muteIcon             = document.getElementById('muteIcon');
const progressCont         = document.getElementById('progressContainer');
const progressFill         = document.getElementById('progressBar');
const progressThumb        = document.getElementById('progressHandle');
const currentTimeEl        = document.getElementById('currentTime');
const totalTimeEl          = document.getElementById('totalTime');
const volCont              = document.getElementById('volumeContainer');
const volFill              = document.getElementById('volumeBar');
const volThumb             = document.getElementById('volumeHandle');
const npCover              = document.getElementById('npCover');
const npCoverPH            = document.getElementById('npCoverPlaceholder');
const npTitle              = document.getElementById('npTitle');
const npArtist             = document.getElementById('npArtist');
const btnLikeNP            = document.getElementById('btnLikeNowPlaying');
const btnAddNowPlayingToPl = document.getElementById('btnAddNowPlayingToPl');
const btnDownloadNP        = document.getElementById('btnDownloadNowPlaying');
const searchInput          = document.getElementById('searchInput');
const toastEl              = document.getElementById('toast');
const addToPlaylistModal   = document.getElementById('addToPlaylistModal');
const btnCloseModal        = document.getElementById('btnCloseModal');

// Network & Status
const networkBadge         = document.getElementById('networkBadge');
const networkText          = document.getElementById('networkText');

// Drawers
const queueDrawer          = document.getElementById('queueDrawer');
const btnQueue             = document.getElementById('btnQueue');
const btnCloseQueue        = document.getElementById('btnCloseQueue');
const btnClearQueue        = document.getElementById('btnClearQueue');
const queueNowPlaying      = document.getElementById('queueNowPlaying');
const queueList            = document.getElementById('queueList');

const lyricsDrawer         = document.getElementById('lyricsDrawer');
const btnToggleLyrics      = document.getElementById('btnToggleLyrics');
const btnCloseLyrics       = document.getElementById('btnCloseLyrics');
const lyricsContainer      = document.getElementById('lyricsContainer');

// 3D Turntable & Visualizer
const turntableDeck        = document.getElementById('turntableDeck');
const vinylRecord          = document.getElementById('vinylRecord');
const tonearmAssembly      = document.getElementById('tonearmAssembly');
const visualizer3DCanvas   = document.getElementById('visualizer3DCanvas');
const v3dTitle             = document.getElementById('v3dTitle');
const v3dArtist            = document.getElementById('v3dArtist');
const btnV3dPlay           = document.getElementById('btnV3dPlay');
const btnQuick3D           = document.getElementById('btnQuick3D');
const btnRpm33             = document.getElementById('btnRpm33');
const btnRpm45             = document.getElementById('btnRpm45');

// Mobile UI Elements
const mobileNav            = document.getElementById('mobileNav');
const mobileMiniPlayer     = document.getElementById('mobileMiniPlayer');
const mmpTapArea           = document.getElementById('mmpTapArea');
const mmpCover             = document.getElementById('mmpCover');
const mmpPlaceholder       = document.getElementById('mmpPlaceholder');
const mmpTitle             = document.getElementById('mmpTitle');
const mmpArtist            = document.getElementById('mmpArtist');
const btnMmpLike           = document.getElementById('btnMmpLike');
const btnMmpPlayPause      = document.getElementById('btnMmpPlayPause');
const mmpPlayIcon          = document.getElementById('mmpPlayIcon');
const mmpProgressBar       = document.getElementById('mmpProgressBar');

const mobilePlayerSheet    = document.getElementById('mobilePlayerSheet');
const mpsHandleBar         = document.getElementById('mpsHandleBar');
const btnCloseMobileSheet  = document.getElementById('btnCloseMobileSheet');
const mpsArtworkContainer  = document.getElementById('mpsArtworkContainer');
const mpsAmbientGlow       = document.getElementById('mpsAmbientGlow');
const mpsCoverImg          = document.getElementById('mpsCoverImg');
const mpsPlaceholder       = document.getElementById('mpsPlaceholder');
const mpsTitle             = document.getElementById('mpsTitle');
const mpsArtist            = document.getElementById('mpsArtist');
const btnMpsLike           = document.getElementById('btnMpsLike');
const btnMpsPlayPause      = document.getElementById('btnMpsPlayPause');
const mpsPlayIcon          = document.getElementById('mpsPlayIcon');
const btnMpsPrev           = document.getElementById('btnMpsPrev');
const btnMpsNext           = document.getElementById('btnMpsNext');
const btnMpsShuffle        = document.getElementById('btnMpsShuffle');
const btnMpsRepeat         = document.getElementById('btnMpsRepeat');
const btnMpsLyrics         = document.getElementById('btnMpsLyrics');
const btnMpsDownload       = document.getElementById('btnMpsDownload');
const btnMps3D             = document.getElementById('btnMps3D');
const btnMpsQueue          = document.getElementById('btnMpsQueue');
const mpsProgressCont      = document.getElementById('mpsProgressCont');
const mpsProgressBar       = document.getElementById('mpsProgressBar');
const mpsProgressHandle    = document.getElementById('mpsProgressHandle');
const mpsSeekTooltip       = document.getElementById('mpsSeekTooltip');
const mpsCurrentTime       = document.getElementById('mpsCurrentTime');
const mpsTotalTime         = document.getElementById('mpsTotalTime');
const mpsPlaylistSource    = document.getElementById('mpsPlaylistSource');
const queueHandleBar       = document.getElementById('queueHandleBar');
const lyricsHandleBar      = document.getElementById('lyricsHandleBar');
const queueDrawerCard      = document.getElementById('queueDrawerCard');
const lyricsDrawerCard     = document.getElementById('lyricsDrawerCard');

// Local file input
const localAudioFileInput  = document.getElementById('localAudioFileInput');

// ── Utility Functions ───────────────────────────────────────
let toastTimer = null;
function showToast(msg, dur = 2600) {
  if (!toastEl) return;
  toastEl.innerHTML = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), dur);
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmt(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function fmtDurationLong(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) return '0 min';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  if (m >= 60) {
    const hrs = Math.floor(m / 60);
    const remMin = m % 60;
    return `${hrs} hr ${remMin} min`;
  }
  return `${m} min ${s} sec`;
}

function uid() {
  return 'pl_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

function saveLiked() {
  localStorage.setItem('dk_liked', JSON.stringify([...likedSongs]));
  updateLikedCount();
}

function saveRecent() {
  localStorage.setItem('dk_recent', JSON.stringify(recentIds));
}

function savePlaylists() {
  const serialised = playlists.map(pl => ({
    id: pl.id,
    name: pl.name,
    description: pl.description || '',
    cover: pl.cover || null,
    created: pl.created || Date.now(),
    songs: [...(playlistSongMap[pl.id] || [])]
  }));
  localStorage.setItem('dk_playlists', JSON.stringify(serialised));
  renderSidebarPlaylists();
  renderHomePlaylists();
}

function addToRecent(id) {
  recentIds = recentIds.filter(x => x !== id);
  recentIds.unshift(id);
  if (recentIds.length > 30) recentIds.length = 30;
  saveRecent();
  renderRecentRow();
}

function setGreeting() {
  const h = new Date().getHours();
  const textEl = document.getElementById('greetingText');
  if (!textEl) return;

  let greeting = 'Good Evening 🌆';
  if (h >= 4 && h < 12) greeting = 'Good Morning ☀️';
  else if (h >= 12 && h < 17) greeting = 'Good Afternoon 🌤️';
  else if (h >= 17 && h < 21) greeting = 'Good Evening 🌆';
  else greeting = 'Good Night 🌙';

  textEl.textContent = greeting;
}

function updateLikedCount() {
  const el = document.getElementById('likedCount');
  if (el) el.textContent = likedSongs.size;
  const heroSub = document.getElementById('likedHeroSub');
  if (heroSub) heroSub.textContent = `${likedSongs.size} ${likedSongs.size === 1 ? 'song' : 'songs'} • Saved to your favorites`;

  const likedItemsRaw = songs.filter(s => likedSongs.has(s.id));
  const totalSecs = likedItemsRaw.reduce((acc, s) => acc + (s.duration || 180), 0);
  const statDuration = document.getElementById('likedStatDuration');
  if (statDuration) statDuration.innerHTML = `<i class="fas fa-clock"></i> ${fmtDurationLong(totalSecs)}`;

  const artistCounts = {};
  likedItemsRaw.forEach(s => {
    if (s.artist) artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1;
  });
  let topArtist = '—';
  let maxCount = 0;
  Object.entries(artistCounts).forEach(([artist, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topArtist = artist;
    }
  });
  const statArtist = document.getElementById('likedStatArtist');
  if (statArtist) statArtist.innerHTML = `<i class="fas fa-music"></i> Top Artist: ${esc(topArtist)}`;
  if (typeof updateHeroStats === 'function') updateHeroStats();
}

// ── Navigation Engine ───────────────────────────────────────
function navigateTo(section, pushHistory = true) {
  currentSection = section;

  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('section-' + section);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }

  // Sidebar active state
  document.querySelectorAll('.nav-item, .lib-entry, .sidebar-pl-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  // Mobile nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  if (pushHistory && historyStack[historyPos] !== section) {
    historyStack.splice(historyPos + 1);
    historyStack.push(section);
    historyPos = historyStack.length - 1;
  }

  // Refresh views on navigate
  if (section === 'search') {
    if (searchInput) searchInput.focus();
    renderSearchSection();
  } else if (section === 'liked') {
    renderLikedSection();
  } else if (section === 'library') {
    renderLibrarySection('all');
  } else if (section === 'create') {
    renderCreateSection();
  } else if (section === 'offline') {
    renderOfflineSection();
  } else if (section === 'visualizer3d') {
    update3DViewInfo();
    window.DK_3DAudio?.resizeCanvas();
  } else if (section === 'tamil-music') {
    renderTamilSection();
  } else if (section === 'ai-assistant') {
    initAIAssistantSection();
  } else if (section === 'home') {
    renderAll();
  }

  // Re-bind 3D tilt
  setTimeout(() => window.DK_Init3DTilt?.(), 100);
}

// Sidebar Navigation Listeners
document.querySelectorAll('[data-section]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(el.dataset.section);
  });
});

document.getElementById('btnCreatePlaylist')?.addEventListener('click', e => {
  e.stopPropagation();
  activePlaylistId = null;
  navigateTo('create');
});

document.getElementById('btnNewPlaylistLib')?.addEventListener('click', () => {
  activePlaylistId = null;
  navigateTo('create');
});

document.getElementById('btnCancelCreate')?.addEventListener('click', () => {
  navigateTo('library');
});

// Topbar Back / Forward
document.getElementById('btnBack')?.addEventListener('click', () => {
  if (historyPos > 0) {
    historyPos--;
    navigateTo(historyStack[historyPos], false);
  }
});
document.getElementById('btnForward')?.addEventListener('click', () => {
  if (historyPos < historyStack.length - 1) {
    historyPos++;
    navigateTo(historyStack[historyPos], false);
  }
});

// ── Data Ingestion (100% Royalty Free Catalog + Local + Supabase) ─
async function fetchSongs() {
  let fetched = [];

  // 1. Try Supabase if available
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      const { data, error } = await supabaseClient
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length) {
        fetched = data;
      }
    }
  } catch (err) {
    console.warn('[Data] Supabase not connected, using built-in catalog:', err);
  }

  // 2. Add Built-in 100% Royalty-Free Catalog
  const builtIn = (window.DK_MusicData && window.DK_MusicData.catalog) ? window.DK_MusicData.catalog : [];
  
  // Combine unique songs
  const seenIds = new Set(fetched.map(s => s.id));
  builtIn.forEach(s => {
    if (!seenIds.has(s.id)) {
      fetched.push(s);
      seenIds.add(s.id);
    }
  });

  // 3. Add User-Imported Local Tracks from IndexedDB
  try {
    if (window.DK_OfflineDB) {
      const localTracks = await window.DK_OfflineDB.getAllUserLocalTracks();
      localTracks.forEach(s => {
        if (!seenIds.has(s.id)) {
          fetched.unshift(s); // Show local tracks on top
          seenIds.add(s.id);
        }
      });

      // Update offline track set
      const downloaded = await window.DK_OfflineDB.getAllDownloadedTracks();
      offlineTrackIds = new Set(downloaded.map(d => d.id));
      localTracks.forEach(l => offlineTrackIds.add(l.id));
      updateOfflineCounts();
    }
  } catch (e) {
    console.warn('[OfflineDB] Error loading local tracks:', e);
  }

  songs = fetched;
  window.songs = songs;

  // 4. Initialize Pre-made Curated Playlists if user has none
  if (!playlists.length && window.DK_MusicData?.premadePlaylists) {
    playlists = [...window.DK_MusicData.premadePlaylists];
    playlistSongMap = {};
    playlists.forEach(pl => {
      playlistSongMap[pl.id] = new Set(pl.songs || []);
    });
    savePlaylists();
  }

  currentQueue = [...songs];
  window.currentQueue = currentQueue;
  renderAll();
  updateOfflineCounts();
}

function renderAll() {
  setGreeting();
  renderQuickPicks();
  renderHomePlaylists();
  renderRecentRow();
  renderAlbumsRow();
  renderSongGrid(songs, 'songGrid');
  renderSidebarPlaylists();
  updateLikedCount();
  updateHeroStats();
  setTimeout(() => window.DK_Init3DTilt?.(), 100);
}

function updateHeroStats() {
  const trackEl = document.getElementById('heroStatTracks');
  const likedEl = document.getElementById('heroStatLiked');
  const offlineEl = document.getElementById('heroStatOffline');
  if (trackEl) trackEl.textContent = songs.length || '—';
  if (likedEl) likedEl.textContent = likedSongs.size;
  if (offlineEl) offlineEl.textContent = offlineTrackIds.size;
}


// ── Quick Picks ─────────────────────────────────────────────
function renderQuickPicks() {
  const el = document.getElementById('quickPicks');
  if (!el) return;
  const picks = songs.slice(0, 8);
  if (!picks.length) { el.innerHTML = ''; return; }

  el.innerHTML = picks.map(song => `
    <div class="quick-card" data-song-id="${esc(song.id)}" role="button" tabindex="0">
      <img class="quick-card-img" src="${esc(song.cover_url || '')}" alt="${esc(song.title)}"
           onerror="this.style.display='none'">
      <span class="quick-card-title">${esc(song.title)}</span>
      <button class="quick-play" aria-label="Play ${esc(song.title)}">
        <i class="fas fa-play" aria-hidden="true"></i>
      </button>
    </div>
  `).join('');

  el.querySelectorAll('.quick-card').forEach(card => {
    const songId = card.dataset.songId;
    const songIdx = songs.findIndex(s => s.id === songId);
    card.addEventListener('click', () => {
      currentQueue = [...songs];
      playSong(songIdx);
    });
    card.querySelector('.quick-play')?.addEventListener('click', e => {
      e.stopPropagation();
      currentQueue = [...songs];
      playSong(songIdx);
    });
  });
}

// ── Home Playlists Shelf Row ────────────────────────────────
function renderHomePlaylists() {
  const row = document.getElementById('homePlaylistsRow');
  const header = document.getElementById('homePlaylistsHeader');
  if (!row) return;

  if (!playlists.length) {
    if (header) header.style.display = 'none';
    row.style.display = 'none';
    return;
  }

  if (header) header.style.display = 'flex';
  row.style.display = 'flex';

  row.innerHTML = playlists.map(pl => {
    const count = playlistSongMap[pl.id]?.size || 0;
    const coverHTML = pl.cover
      ? `<img src="${esc(pl.cover)}" alt="${esc(pl.name)}" class="playlist-cover" onerror="this.parentElement.innerHTML='<div class=\\'playlist-cover-placeholder\\'><i class=\\'fas fa-music\\'></i></div>'">`
      : `<div class="playlist-cover-placeholder"><i class="fas fa-music"></i></div>`;

    return `
      <div class="playlist-card" data-pl-id="${esc(pl.id)}" role="button" tabindex="0">
        <div class="playlist-cover-wrapper">
          ${coverHTML}
          <button class="play-overlay" title="Play ${esc(pl.name)}"><i class="fas fa-play"></i></button>
        </div>
        <div class="playlist-card-title">${esc(pl.name)}</div>
        <div class="playlist-card-sub">${count} ${count === 1 ? 'song' : 'songs'}</div>
      </div>`;
  }).join('');

  row.querySelectorAll('.playlist-card').forEach(card => {
    const plId = card.dataset.plId;
    card.addEventListener('click', e => {
      if (e.target.closest('.play-overlay')) {
        playPlaylist(plId);
      } else {
        openPlaylist(plId);
      }
    });
  });
}

document.getElementById('seeAllPlaylists')?.addEventListener('click', e => {
  e.preventDefault();
  navigateTo('library');
  renderLibrarySection('playlists');
});

document.getElementById('seeAllRecent')?.addEventListener('click', e => {
  e.preventDefault();
  navigateTo('search');
});

document.getElementById('seeAllAlbums')?.addEventListener('click', e => {
  e.preventDefault();
  navigateTo('library');
  renderLibrarySection('albums');
});

// ── Sidebar Dynamic Playlists ───────────────────────────────
function renderSidebarPlaylists() {
  const container = document.getElementById('sidebarPlaylistsList');
  if (!container) return;

  if (!playlists.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = playlists.map(pl => {
    const isActive = currentSection === 'playlist' && activePlaylistId === pl.id;
    const count = playlistSongMap[pl.id]?.size || 0;
    const thumbHTML = pl.cover
      ? `<img src="${esc(pl.cover)}" class="sidebar-pl-thumb" alt="" onerror="this.style.display='none'">`
      : `<div class="sidebar-pl-icon"><i class="fas fa-music"></i></div>`;

    return `
      <div class="sidebar-pl-item ${isActive ? 'active' : ''}" data-pl-id="${esc(pl.id)}" title="${esc(pl.name)} (${count} songs)">
        ${thumbHTML}
        <div class="sidebar-pl-text">${esc(pl.name)}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.sidebar-pl-item').forEach(item => {
    item.addEventListener('click', () => {
      openPlaylist(item.dataset.plId);
    });
  });
}

// ── Recent Row ──────────────────────────────────────────────
function renderRecentRow() {
  const row = document.getElementById('recentRow');
  if (!row) return;
  const recentSongs = recentIds
    .map(id => songs.find(s => s.id === id))
    .filter(Boolean)
    .slice(0, 12);

  const items = recentSongs.length ? recentSongs : songs.slice(0, 8);
  renderScrollCards(row, items);
}

function renderScrollCards(container, items) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state"><p>No songs available</p></div>`;
    return;
  }

  container.innerHTML = items.map(song => `
    <div class="album-card" data-song-id="${esc(song.id)}" role="button" tabindex="0">
      <div class="card-cover-wrapper">
        <img src="${esc(song.cover_url || '')}" alt="${esc(song.title)}" class="card-cover"
             onerror="this.parentElement.style.background='var(--bg-elevated)'">
        <button class="play-overlay"><i class="fas fa-play"></i></button>
      </div>
      <div class="card-title" title="${esc(song.title)}">${esc(song.title)}</div>
      <div class="card-sub">${esc(song.artist)}</div>
    </div>
  `).join('');

  container.querySelectorAll('.album-card').forEach(card => {
    const songId = card.dataset.songId;
    const idx = songs.findIndex(s => s.id === songId);
    card.addEventListener('click', () => {
      currentQueue = [...songs];
      playSong(idx);
    });
  });
}

// ── Albums ──────────────────────────────────────────────────
function getAlbums() {
  const map = {};
  songs.forEach(song => {
    const key = (song.album || '').trim() || 'Singles';
    if (!map[key]) {
      map[key] = {
        name: key,
        artist: song.artist,
        cover: song.cover_url,
        songs: []
      };
    }
    map[key].songs.push(song);
  });
  return Object.values(map);
}

function renderAlbumsRow() {
  const row = document.getElementById('albumsRow');
  if (!row) return;
  const albums = getAlbums();
  if (!albums.length) {
    row.innerHTML = `<div class="empty-state"><p>No albums found</p></div>`;
    return;
  }

  row.innerHTML = albums.map((album, i) => `
    <div class="album-card" data-album-idx="${i}" role="button" tabindex="0">
      <div class="card-cover-wrapper">
        <img src="${esc(album.cover || '')}" alt="${esc(album.name)}" class="card-cover"
             onerror="this.parentElement.style.background='var(--bg-elevated)'">
        <button class="play-overlay"><i class="fas fa-play"></i></button>
      </div>
      <div class="card-title" title="${esc(album.name)}">${esc(album.name)}</div>
      <div class="card-sub">${esc(album.artist)} &bull; ${album.songs.length} tracks</div>
    </div>
  `).join('');

  const albumsRef = getAlbums();
  row.querySelectorAll('.album-card').forEach(card => {
    const idx = Number(card.dataset.albumIdx);
    card.addEventListener('click', () => openAlbum(albumsRef[idx]));
  });
}

function openAlbum(album) {
  if (!album) return;
  currentAlbumName = album.name;

  const heroTitle = document.getElementById('albumHeroTitle');
  const heroSub   = document.getElementById('albumHeroSub');
  const heroImg   = document.getElementById('albumHeroImg');

  if (heroTitle) heroTitle.textContent = album.name;
  if (heroSub) heroSub.textContent = `${album.artist} • ${album.songs.length} tracks`;
  if (heroImg) {
    heroImg.src = album.cover || '';
    heroImg.style.display = album.cover ? 'block' : 'none';
  }

  renderTrackRows(album.songs, document.getElementById('albumTrackList'), {
    showAlbum: false
  });

  const btnPlayAlbum = document.getElementById('btnPlayAlbum');
  if (btnPlayAlbum) {
    btnPlayAlbum.onclick = () => {
      if (!album.songs.length) return;
      currentQueue = [...album.songs];
      playSong(0);
    };
  }

  const btnShuffleAlbum = document.getElementById('btnShuffleAlbum');
  if (btnShuffleAlbum) {
    btnShuffleAlbum.onclick = () => {
      if (!album.songs.length) return;
      currentQueue = [...album.songs].sort(() => Math.random() - 0.5);
      playSong(0);
    };
  }

  navigateTo('album');
}

// ── Song Grid (Home / Search) ───────────────────────────────
function renderSongGrid(list, containerId = 'songGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-music" aria-hidden="true"></i>
        <p>No tracks found</p>
      </div>`;
    return;
  }

  grid.innerHTML = list.map(song => {
    const liked = likedSongs.has(song.id);
    const isOffline = offlineTrackIds.has(song.id);

    return `
      <div class="song-card" data-song-id="${esc(song.id)}">
        <div class="song-cover-wrapper">
          <img src="${esc(song.cover_url || '')}" alt="${esc(song.title)}" class="song-cover"
               onerror="this.parentElement.style.background='var(--bg-elevated)'" loading="lazy">
          <button class="song-like-btn ${liked ? 'liked' : ''}" data-song-id="${esc(song.id)}"
              title="${liked ? 'Unlike' : 'Like'}">
            <i class="${liked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
          </button>
          ${isOffline ? `<span class="badge-mini" style="position:absolute;top:8px;left:8px;z-index:2;background:#059669;color:#fff;border:none;">⬇ Offline</span>` : ''}
          <button class="play-overlay" title="Play"><i class="fas fa-play"></i></button>
        </div>
        <div class="song-info">
          <h3 title="${esc(song.title)}">${esc(song.title)}</h3>
          <p>${esc(song.artist)}</p>
          ${(song.movie || song.year || song.mood) ? `
            <div class="song-card-metadata-row">
              ${song.movie ? `<span class="meta-tag-pill movie"><i class="fas fa-film"></i> ${esc(song.movie)}</span>` : ''}
              ${song.year ? `<span class="meta-tag-pill year">${esc(song.year)}</span>` : ''}
              ${song.mood ? `<span class="meta-tag-pill mood">${esc(song.mood)}</span>` : ''}
            </div>
          ` : ''}
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.song-card').forEach(card => {
    const songId = card.dataset.songId;
    const songIdx = songs.findIndex(s => s.id === songId);

    card.addEventListener('click', e => {
      if (e.target.closest('.song-like-btn')) {
        e.stopPropagation();
        toggleLike(songId, e.target.closest('.song-like-btn'));
        return;
      }
      currentQueue = [...list];
      const targetIdx = currentQueue.findIndex(s => s.id === songId);
      playSong(targetIdx >= 0 ? targetIdx : 0);
    });
  });
}

// ── Track Rows Renderer ─────────────────────────────────────
function renderTrackRows(trackList, container, options = {}) {
  if (!container) return;

  if (!trackList || !trackList.length) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-compact-disc"></i>
        <p>No tracks in this collection</p>
      </div>`;
    return;
  }

  const { playlistId = null, showAlbum = true } = options;

  container.innerHTML = trackList.map((song, i) => {
    const isPlaying = songs[currentSongIndex]?.id === song.id && !audioEl.paused;
    const isCurrent = songs[currentSongIndex]?.id === song.id;
    const liked = likedSongs.has(song.id);
    const isOffline = offlineTrackIds.has(song.id);

    const numContent = isPlaying
      ? `<div class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>`
      : `<span class="track-num">${i + 1}</span>`;

    return `
      <div class="track-row ${isCurrent ? 'playing' : ''}" data-song-id="${esc(song.id)}" data-track-idx="${i}">
        <div class="track-num-wrap">
          ${numContent}
          <span class="track-play-icon"><i class="fas ${isPlaying ? 'fa-pause' : 'fa-play'}"></i></span>
        </div>
        
        <div class="track-info">
          <img src="${esc(song.cover_url || '')}" alt="" class="track-thumb" loading="lazy"
               onerror="this.style.display='none'">
          <div class="track-texts">
            <span class="track-name" title="${esc(song.title)}">${esc(song.title)}</span>
            <span class="track-artist">${esc(song.artist)} ${isOffline ? '<i class="fas fa-circle-check" style="color:#22c55e;font-size:0.7rem;margin-left:4px;" title="Offline Ready"></i>' : ''}</span>
          </div>
        </div>

        ${showAlbum ? `<div class="track-album" title="${esc(song.album || 'Single')}">${esc(song.album || 'Single')}</div>` : ''}

        <div class="track-actions">
          <button class="track-btn track-download-btn ${isOffline ? 'downloaded' : ''}" data-song-id="${esc(song.id)}" title="${isOffline ? 'Offline Ready' : 'Download for offline'}">
            <i class="fas ${isOffline ? 'fa-check' : 'fa-cloud-arrow-down'}" style="${isOffline ? 'color:#22c55e;' : ''}"></i>
          </button>
          <button class="track-btn track-like-btn ${liked ? 'liked' : ''}" data-song-id="${esc(song.id)}" title="${liked ? 'Unlike' : 'Like'}">
            <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
          </button>
          <button class="track-btn track-add-pl-btn" data-song-id="${esc(song.id)}" title="Add to playlist">
            <i class="fas fa-plus"></i>
          </button>
          ${playlistId ? `
          <button class="track-btn track-remove-pl-btn" data-song-id="${esc(song.id)}" data-pl-id="${esc(playlistId)}" title="Remove from playlist">
            <i class="fas fa-xmark"></i>
          </button>` : ''}
          <span class="track-duration">${song.duration ? fmt(song.duration) : '--:--'}</span>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.track-row').forEach(row => {
    const songId = row.dataset.songId;
    const trackIdx = Number(row.dataset.trackIdx);

    row.addEventListener('click', e => {
      if (e.target.closest('.track-btn')) return;
      currentQueue = [...trackList];
      playSong(trackIdx);
    });

    row.querySelector('.track-like-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      toggleLike(songId, e.currentTarget);
    });

    row.querySelector('.track-download-btn')?.addEventListener('click', async e => {
      e.stopPropagation();
      const songObj = songs.find(s => s.id === songId);
      if (songObj) toggleOfflineDownload(songObj, e.currentTarget);
    });

    row.querySelector('.track-add-pl-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      openAddToPlaylistModal(songId);
    });

    row.querySelector('.track-remove-pl-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      const plId = e.currentTarget.dataset.plId;
      removeSongFromPlaylist(plId, songId);
    });
  });
}

// ── Audio Playback Core Engine ──────────────────────────────
async function playSong(idx) {
  if (!currentQueue.length) return;
  if (idx < 0) idx = 0;
  if (idx >= currentQueue.length) idx = 0;

  currentSongIndex = idx;
  window.currentSongIndex = idx;
  window.currentQueue = currentQueue;
  const song = currentQueue[idx];
  if (!song) return;

  // 1. Initialize Web Audio analyser on first user playback
  if (window.DK_3DAudio) {
    window.DK_3DAudio.initWebAudio(audioEl);
    window.DK_3DAudio.resumeContext();
  }

  // 2. Offline audio check
  let playSource = song.file_url;
  try {
    if (window.DK_OfflineDB) {
      const offlineBlobUrl = await window.DK_OfflineDB.getOfflineAudioUrl(song.id);
      if (offlineBlobUrl) {
        playSource = offlineBlobUrl;
        console.log(`[Audio Engine] Playing "${song.title}" from offline blob.`);
      }
    }
  } catch (e) {}

  audioEl.src = playSource;
  audioEl.play().catch(e => console.log('Audio playback prevented or awaiting interaction:', e));

  // 3. Update Desktop Now Playing
  if (npTitle) npTitle.textContent = song.title;
  if (npArtist) npArtist.textContent = song.artist;

  if (song.cover_url && npCover) {
    npCover.src = song.cover_url;
    npCover.classList.remove('hidden');
    if (npCoverPH) npCoverPH.classList.add('hidden');
  } else if (npCoverPH) {
    if (npCover) npCover.classList.add('hidden');
    npCoverPH.classList.remove('hidden');
  }

  // 4. Update Mobile Mini-Player & Fullscreen Sheet
  updateMobilePlayerUI(song);

  // 5. Update 3D Turntable & Visualizer
  if (window.DK_3DAudio) {
    window.DK_3DAudio.setTurntablePlaying(true);
    window.DK_3DAudio.updateVinylCover(song.cover_url);
  }
  if (v3dTitle) v3dTitle.textContent = song.title;
  if (v3dArtist) v3dArtist.textContent = `${song.artist} • ${song.album || 'Single'}`;
  if (btnV3dPlay) btnV3dPlay.innerHTML = '<i class="fas fa-pause"></i>';

  // 6. Update Lyrics
  setupLyricsForSong(song);

  // 7. Update States
  if (playIcon) playIcon.className = 'fas fa-pause';
  if (mmpPlayIcon) mmpPlayIcon.className = 'fas fa-pause';
  if (mpsPlayIcon) mpsPlayIcon.className = 'fas fa-pause';
  updateNowPlayingLikeBtn();
  updateNowPlayingDownloadBtn();
  addToRecent(song.id);

  // Update track rows active state
  document.querySelectorAll('.track-row').forEach(row => {
    const isThis = row.dataset.songId === song.id;
    row.classList.toggle('playing', isThis);
  });

  // Update Queue UI if open
  renderQueueDrawer();
}

function togglePlayPause() {
  if (!audioEl.src && songs.length) {
    currentQueue = [...songs];
    playSong(0);
    return;
  }

  if (window.DK_3DAudio) {
    window.DK_3DAudio.resumeContext();
  }

  if (audioEl.paused) {
    audioEl.play().then(() => {
      setPlayStateUI(true);
    }).catch(console.error);
  } else {
    audioEl.pause();
    setPlayStateUI(false);
  }
}

function setPlayStateUI(isPlaying) {
  const iconClass = isPlaying ? 'fas fa-pause' : 'fas fa-play';
  if (playIcon) playIcon.className = iconClass;
  if (mmpPlayIcon) mmpPlayIcon.className = iconClass;
  if (mpsPlayIcon) mpsPlayIcon.className = iconClass;
  if (btnV3dPlay) btnV3dPlay.innerHTML = `<i class="${iconClass}"></i>`;

  if (window.DK_3DAudio) {
    window.DK_3DAudio.setTurntablePlaying(isPlaying);
  }
}

function nextSong() {
  if (!currentQueue.length) return;

  if (repeatMode === 2) {
    audioEl.currentTime = 0;
    audioEl.play();
    return;
  }

  let nextIdx = currentSongIndex + 1;
  if (nextIdx >= currentQueue.length) {
    if (repeatMode === 1) nextIdx = 0;
    else return;
  }

  playSong(nextIdx);
}

function prevSong() {
  if (!currentQueue.length) return;

  if (audioEl.currentTime > 3) {
    audioEl.currentTime = 0;
    return;
  }

  let prevIdx = currentSongIndex - 1;
  if (prevIdx < 0) prevIdx = currentQueue.length - 1;
  playSong(prevIdx);
}

btnPlayPause?.addEventListener('click', togglePlayPause);
btnNext?.addEventListener('click', nextSong);
btnPrev?.addEventListener('click', prevSong);
audioEl.addEventListener('ended', nextSong);

// Shuffle & Repeat
btnShuffle?.addEventListener('click', () => {
  isShuffled = !isShuffled;
  btnShuffle.classList.toggle('active', isShuffled);
  btnMpsShuffle?.classList.toggle('active', isShuffled);
  showToast(isShuffled ? '🔀 Shuffle On' : 'Shuffle Off');
  if (isShuffled && currentQueue.length) {
    const current = currentQueue[currentSongIndex];
    currentQueue = [...currentQueue].sort(() => Math.random() - 0.5);
    if (current) {
      currentQueue = currentQueue.filter(s => s.id !== current.id);
      currentQueue.unshift(current);
      currentSongIndex = 0;
    }
  }
});

btnRepeat?.addEventListener('click', () => {
  repeatMode = (repeatMode + 1) % 3;
  const active = repeatMode > 0;
  btnRepeat.classList.toggle('active', active);
  btnMpsRepeat?.classList.toggle('active', active);
  const icon = btnRepeat.querySelector('i');
  if (icon) icon.className = repeatMode === 2 ? 'fas fa-repeat-1' : 'fas fa-repeat';
  showToast(['Repeat Off', '🔁 Repeat All', '🔂 Repeat One'][repeatMode]);
});

// Progress Bar & Time
audioEl.addEventListener('timeupdate', () => {
  const { currentTime, duration } = audioEl;
  if (duration && !isNaN(duration)) {
    const pct = (currentTime / duration) * 100;
    
    // Desktop bar
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressThumb) progressThumb.style.left = `${pct}%`;
    if (currentTimeEl) currentTimeEl.textContent = fmt(currentTime);
    if (totalTimeEl) totalTimeEl.textContent = fmt(duration);

    // Mobile mini player & sheet bars (respect active scrub state)
    if (!isScrubbingMps) {
      if (mmpProgressBar) mmpProgressBar.style.width = `${pct}%`;
      if (mpsProgressBar) mpsProgressBar.style.width = `${pct}%`;
      if (mpsProgressHandle) mpsProgressHandle.style.left = `${pct}%`;
      if (mpsCurrentTime) mpsCurrentTime.textContent = fmt(currentTime);
    }
    if (mpsTotalTime) mpsTotalTime.textContent = fmt(duration);

    // Synced Lyrics update
    updateSyncedLyrics(currentTime);
  }
});

audioEl.addEventListener('loadedmetadata', () => {
  if (totalTimeEl) totalTimeEl.textContent = fmt(audioEl.duration);
  if (mpsTotalTime) mpsTotalTime.textContent = fmt(audioEl.duration);
});

// Desktop Seek
function seek(e) {
  if (!progressCont || !audioEl.duration) return;
  const rect = progressCont.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audioEl.currentTime = pct * audioEl.duration;
}
progressCont?.addEventListener('click', seek);

// Volume Controls
function setVolume(vol) {
  vol = Math.max(0, Math.min(1, vol));
  audioEl.volume = vol;
  if (volFill) volFill.style.width = `${vol * 100}%`;
  if (volThumb) volThumb.style.left = `${vol * 100}%`;

  if (muteIcon) {
    if (vol === 0) muteIcon.className = 'fas fa-volume-xmark ctrl-btn btn-icon';
    else if (vol < 0.5) muteIcon.className = 'fas fa-volume-low ctrl-btn btn-icon';
    else muteIcon.className = 'fas fa-volume-high ctrl-btn btn-icon';
  }
}
volCont?.addEventListener('click', e => {
  const rect = volCont.getBoundingClientRect();
  setVolume((e.clientX - rect.left) / rect.width);
});
muteIcon?.addEventListener('click', () => {
  if (audioEl.volume > 0) {
    audioEl.setAttribute('data-last-vol', audioEl.volume);
    setVolume(0);
  } else {
    const last = parseFloat(audioEl.getAttribute('data-last-vol')) || 0.8;
    setVolume(last);
  }
});
setVolume(0.8);

// ── Mobile Touch, Gesture & Haptic Engine ───────────────────
function triggerHaptic(type = 'light') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'light') navigator.vibrate(14);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'double') navigator.vibrate([15, 30, 20]);
    } catch (e) {
      // Fallback silently if vibration not allowed
    }
  }
}

let isScrubbingMps = false;

// Touch seek bar scrubber
function updateMpsScrub(clientX) {
  if (!mpsProgressCont || !audioEl.duration) return 0;
  const rect = mpsProgressCont.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const scrubTime = pct * audioEl.duration;

  if (mpsProgressBar) mpsProgressBar.style.width = `${pct * 100}%`;
  if (mpsProgressHandle) mpsProgressHandle.style.left = `${pct * 100}%`;
  if (mpsCurrentTime) mpsCurrentTime.textContent = fmt(scrubTime);

  if (mpsSeekTooltip) {
    mpsSeekTooltip.textContent = fmt(scrubTime);
    mpsSeekTooltip.style.left = `${pct * 100}%`;
    mpsSeekTooltip.classList.add('visible');
  }
  return scrubTime;
}

mpsProgressCont?.addEventListener('click', e => {
  if (!audioEl.duration) return;
  const targetTime = updateMpsScrub(e.clientX);
  audioEl.currentTime = targetTime;
  if (mpsSeekTooltip) mpsSeekTooltip.classList.remove('visible');
});

mpsProgressCont?.addEventListener('touchstart', e => {
  isScrubbingMps = true;
  triggerHaptic('light');
  updateMpsScrub(e.touches[0].clientX);
}, { passive: true });

mpsProgressCont?.addEventListener('touchmove', e => {
  if (!isScrubbingMps) return;
  updateMpsScrub(e.touches[0].clientX);
  if (e.cancelable) e.preventDefault();
}, { passive: false });

mpsProgressCont?.addEventListener('touchend', e => {
  if (!isScrubbingMps) return;
  const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
  const targetTime = updateMpsScrub(clientX);
  if (typeof targetTime === 'number' && !isNaN(targetTime)) {
    audioEl.currentTime = targetTime;
  }
  if (mpsSeekTooltip) mpsSeekTooltip.classList.remove('visible');
  isScrubbingMps = false;
  triggerHaptic('light');
});

mpsProgressCont?.addEventListener('touchcancel', () => {
  if (mpsSeekTooltip) mpsSeekTooltip.classList.remove('visible');
  isScrubbingMps = false;
});

// Update Mobile Player UI & Ambient Glow
function updateMobilePlayerUI(song) {
  if (!song) return;

  // 1. Mobile Mini Player
  if (mmpTitle) mmpTitle.textContent = song.title;
  if (mmpArtist) mmpArtist.textContent = song.artist;
  if (song.cover_url && mmpCover) {
    mmpCover.src = song.cover_url;
    mmpCover.classList.remove('hidden');
    if (mmpPlaceholder) mmpPlaceholder.classList.add('hidden');
  } else if (mmpPlaceholder) {
    if (mmpCover) mmpCover.classList.add('hidden');
    mmpPlaceholder.classList.remove('hidden');
  }

  // 2. Mobile Fullscreen Sheet
  if (mpsTitle) mpsTitle.textContent = song.title;
  if (mpsArtist) mpsArtist.textContent = song.artist;
  if (mpsPlaylistSource) {
    const activeSection = document.querySelector('.mobile-nav-item.active')?.dataset.section || 'All Tracks';
    mpsPlaylistSource.textContent = activeSection.charAt(0).toUpperCase() + activeSection.slice(1);
  }

  if (song.cover_url && mpsCoverImg) {
    mpsCoverImg.src = song.cover_url;
    mpsCoverImg.style.display = 'block';
    if (mpsPlaceholder) mpsPlaceholder.style.display = 'none';
  } else if (mpsPlaceholder) {
    if (mpsCoverImg) mpsCoverImg.style.display = 'none';
    mpsPlaceholder.style.display = 'flex';
  }

  const isLiked = likedSongs.has(song.id);
  if (btnMmpLike) btnMmpLike.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart" style="${isLiked ? 'color:#ec4899;' : ''}"></i>`;
  if (btnMpsLike) btnMpsLike.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart" style="${isLiked ? 'color:#ec4899;' : ''}"></i>`;
}

// ── 1. Interactive Drag-To-Dismiss on Mobile Player Sheet ─────
let sheetStartY = 0;
let sheetStartX = 0;
let isDraggingSheet = false;
let sheetDeltaY = 0;

function handleSheetTouchStart(e) {
  if (e.target.closest('button') || e.target.closest('input') || e.target.closest('#mpsProgressCont')) return;
  sheetStartY = e.touches[0].clientY;
  sheetStartX = e.touches[0].clientX;
  sheetDeltaY = 0;
  isDraggingSheet = true;
  mobilePlayerSheet.style.transition = 'none';
}

function handleSheetTouchMove(e) {
  if (!isDraggingSheet) return;
  const dy = e.touches[0].clientY - sheetStartY;
  const dx = e.touches[0].clientX - sheetStartX;

  // Downward drag dominant
  if (dy > 0 && dy > Math.abs(dx)) {
    sheetDeltaY = dy;
    mobilePlayerSheet.style.transform = `translateY(${dy}px)`;
    if (e.cancelable) e.preventDefault();
  }
}

function handleSheetTouchEnd() {
  if (!isDraggingSheet) return;
  isDraggingSheet = false;
  mobilePlayerSheet.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)';

  if (sheetDeltaY > 90) {
    // Dismiss sheet
    mobilePlayerSheet.style.transform = 'translateY(100%)';
    triggerHaptic('medium');
    setTimeout(() => {
      mobilePlayerSheet.classList.remove('open');
      mobilePlayerSheet.style.transform = '';
      mobilePlayerSheet.style.transition = '';
    }, 320);
  } else {
    // Snap back
    mobilePlayerSheet.style.transform = 'translateY(0)';
    setTimeout(() => {
      mobilePlayerSheet.style.transform = '';
      mobilePlayerSheet.style.transition = '';
    }, 320);
  }
  sheetDeltaY = 0;
}

mpsHandleBar?.addEventListener('touchstart', handleSheetTouchStart, { passive: true });
mpsHandleBar?.addEventListener('touchmove', handleSheetTouchMove, { passive: false });
mpsHandleBar?.addEventListener('touchend', handleSheetTouchEnd);

document.querySelector('.mps-top-nav')?.addEventListener('touchstart', handleSheetTouchStart, { passive: true });
document.querySelector('.mps-top-nav')?.addEventListener('touchmove', handleSheetTouchMove, { passive: false });
document.querySelector('.mps-top-nav')?.addEventListener('touchend', handleSheetTouchEnd);

btnCloseMobileSheet?.addEventListener('click', () => {
  triggerHaptic('light');
  mobilePlayerSheet?.classList.remove('open');
});
mpsHandleBar?.addEventListener('click', () => {
  triggerHaptic('light');
  mobilePlayerSheet?.classList.remove('open');
});

// ── 2. Swipe Left/Right & Double-Tap Heart on Artwork ────────
let artTouchStartX = 0;
let artTouchStartY = 0;
let artDiffX = 0;
let artLastTapTime = 0;
let isArtDragging = false;

function spawnHeartPop() {
  if (!mpsArtworkContainer) return;
  const heart = document.createElement('div');
  heart.className = 'heart-pop';
  heart.innerHTML = '<i class="fas fa-heart"></i>';
  mpsArtworkContainer.appendChild(heart);
  triggerHaptic('double');
  setTimeout(() => heart.remove(), 750);
}

mpsArtworkContainer?.addEventListener('touchstart', e => {
  const now = Date.now();
  if (now - artLastTapTime < 320) {
    // Double-tap to Like
    const currentSong = currentQueue[currentSongIndex];
    if (currentSong) {
      if (!likedSongs.has(currentSong.id)) {
        toggleLike(currentSong.id);
      }
      spawnHeartPop();
    }
    artLastTapTime = 0;
    return;
  }
  artLastTapTime = now;

  artTouchStartX = e.touches[0].clientX;
  artTouchStartY = e.touches[0].clientY;
  artDiffX = 0;
  isArtDragging = true;
  mpsArtworkContainer.style.transition = 'none';
}, { passive: true });

mpsArtworkContainer?.addEventListener('touchmove', e => {
  if (!isArtDragging) return;
  const dx = e.touches[0].clientX - artTouchStartX;
  const dy = e.touches[0].clientY - artTouchStartY;

  // Horizontal swipe intent
  if (Math.abs(dx) > Math.abs(dy)) {
    artDiffX = dx;
    mpsArtworkContainer.style.transform = `translateX(${dx * 0.42}px) rotate(${dx * 0.03}deg)`;
    mpsArtworkContainer.style.opacity = `${Math.max(0.65, 1 - Math.abs(dx) / 500)}`;
    if (e.cancelable) e.preventDefault();
  }
}, { passive: false });

mpsArtworkContainer?.addEventListener('touchend', () => {
  if (!isArtDragging) return;
  isArtDragging = false;
  mpsArtworkContainer.style.transition = 'transform 0.28s ease, opacity 0.28s ease';

  if (artDiffX < -60) {
    // Swiped left -> NEXT TRACK
    triggerHaptic('light');
    mpsArtworkContainer.style.transform = 'translateX(-120px) rotate(-8deg)';
    mpsArtworkContainer.style.opacity = '0';
    setTimeout(() => {
      nextSong();
      mpsArtworkContainer.style.transition = 'none';
      mpsArtworkContainer.style.transform = 'translateX(90px) scale(0.95)';
      setTimeout(() => {
        mpsArtworkContainer.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease';
        mpsArtworkContainer.style.transform = 'translateX(0) scale(1)';
        mpsArtworkContainer.style.opacity = '1';
      }, 30);
    }, 150);
  } else if (artDiffX > 60) {
    // Swiped right -> PREVIOUS TRACK
    triggerHaptic('light');
    mpsArtworkContainer.style.transform = 'translateX(120px) rotate(8deg)';
    mpsArtworkContainer.style.opacity = '0';
    setTimeout(() => {
      prevSong();
      mpsArtworkContainer.style.transition = 'none';
      mpsArtworkContainer.style.transform = 'translateX(-90px) scale(0.95)';
      setTimeout(() => {
        mpsArtworkContainer.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease';
        mpsArtworkContainer.style.transform = 'translateX(0) scale(1)';
        mpsArtworkContainer.style.opacity = '1';
      }, 30);
    }, 150);
  } else {
    // Snap back
    mpsArtworkContainer.style.transform = 'translateX(0) rotate(0deg)';
    mpsArtworkContainer.style.opacity = '1';
  }
  artDiffX = 0;
});

// ── 3. Swipe & Tap Gestures on Docked Mini-Player ────────────
let mmpStartX = 0;
let mmpStartY = 0;
let mmpDiffX = 0;
let mmpDiffY = 0;
let isMmpTracking = false;

mobileMiniPlayer?.addEventListener('touchstart', e => {
  if (e.target.closest('button')) return;
  mmpStartX = e.touches[0].clientX;
  mmpStartY = e.touches[0].clientY;
  mmpDiffX = 0;
  mmpDiffY = 0;
  isMmpTracking = true;
}, { passive: true });

mobileMiniPlayer?.addEventListener('touchmove', e => {
  if (!isMmpTracking) return;
  mmpDiffX = e.touches[0].clientX - mmpStartX;
  mmpDiffY = e.touches[0].clientY - mmpStartY;

  // Horizontal feedback tilt
  if (Math.abs(mmpDiffX) > Math.abs(mmpDiffY) && Math.abs(mmpDiffX) > 12) {
    mobileMiniPlayer.style.transform = `translateX(${mmpDiffX * 0.3}px)`;
    if (e.cancelable) e.preventDefault();
  }
}, { passive: false });

mobileMiniPlayer?.addEventListener('touchend', e => {
  if (!isMmpTracking) return;
  isMmpTracking = false;
  mobileMiniPlayer.style.transform = '';

  // Swipe UP -> Open Fullscreen Sheet
  if (mmpDiffY < -40 && Math.abs(mmpDiffY) > Math.abs(mmpDiffX)) {
    triggerHaptic('light');
    mobilePlayerSheet?.classList.add('open');
    return;
  }

  // Swipe LEFT -> Next Track
  if (mmpDiffX < -50) {
    triggerHaptic('light');
    nextSong();
    return;
  }

  // Swipe RIGHT -> Previous Track
  if (mmpDiffX > 50) {
    triggerHaptic('light');
    prevSong();
    return;
  }

  // Tap on Mini-Player (if barely moved and not clicking buttons)
  if (Math.abs(mmpDiffX) < 12 && Math.abs(mmpDiffY) < 12) {
    if (!e.target.closest('button')) {
      triggerHaptic('light');
      mobilePlayerSheet?.classList.add('open');
    }
  }
});

// Mobile Mini-Player Buttons
btnMmpPlayPause?.addEventListener('click', e => {
  e.stopPropagation();
  triggerHaptic('light');
  togglePlayPause();
});
btnMmpLike?.addEventListener('click', e => {
  e.stopPropagation();
  triggerHaptic('light');
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) toggleLike(currentSong.id);
});

// Mobile Sheet Controls
btnMpsPlayPause?.addEventListener('click', () => {
  triggerHaptic('light');
  togglePlayPause();
});
btnMpsNext?.addEventListener('click', () => {
  triggerHaptic('light');
  nextSong();
});
btnMpsPrev?.addEventListener('click', () => {
  triggerHaptic('light');
  prevSong();
});
btnMpsShuffle?.addEventListener('click', () => {
  triggerHaptic('light');
  btnShuffle?.click();
});
btnMpsRepeat?.addEventListener('click', () => {
  triggerHaptic('light');
  btnRepeat?.click();
});
btnMpsLike?.addEventListener('click', () => {
  triggerHaptic('light');
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) {
    toggleLike(currentSong.id);
    if (likedSongs.has(currentSong.id)) spawnHeartPop();
  }
});
btnMpsLyrics?.addEventListener('click', () => {
  triggerHaptic('light');
  lyricsDrawer?.classList.remove('hidden');
});
btnMpsDownload?.addEventListener('click', () => {
  triggerHaptic('light');
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) toggleOfflineDownload(currentSong);
});
btnMps3D?.addEventListener('click', () => {
  triggerHaptic('light');
  mobilePlayerSheet?.classList.remove('open');
  navigateTo('visualizer3d');
});
btnMpsQueue?.addEventListener('click', () => {
  triggerHaptic('light');
  renderQueueDrawer();
  queueDrawer?.classList.remove('hidden');
});

// ── 4. Pull-to-Dismiss on Mobile Bottom Sheets (Drawers) ─────
function setupDrawerSwipeDismiss(drawerEl, handleEl, cardEl) {
  if (!drawerEl || !handleEl || !cardEl) return;
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  handleEl.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    currentY = 0;
    isDragging = true;
    cardEl.style.transition = 'none';
  }, { passive: true });

  handleEl.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      currentY = dy;
      cardEl.style.transform = `translateY(${dy}px)`;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  handleEl.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    cardEl.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
    if (currentY > 80) {
      triggerHaptic('medium');
      cardEl.style.transform = 'translateY(100%)';
      setTimeout(() => {
        drawerEl.classList.add('hidden');
        cardEl.style.transform = '';
        cardEl.style.transition = '';
      }, 280);
    } else {
      cardEl.style.transform = 'translateY(0)';
      setTimeout(() => {
        cardEl.style.transform = '';
        cardEl.style.transition = '';
      }, 280);
    }
    currentY = 0;
  });
}

setupDrawerSwipeDismiss(queueDrawer, queueHandleBar, queueDrawerCard);
setupDrawerSwipeDismiss(lyricsDrawer, lyricsHandleBar, lyricsDrawerCard);

// Backdrop clicks close drawers
queueDrawer?.addEventListener('click', e => {
  if (e.target === queueDrawer) queueDrawer.classList.add('hidden');
});
lyricsDrawer?.addEventListener('click', e => {
  if (e.target === lyricsDrawer) lyricsDrawer.classList.add('hidden');
});

// Mobile Bottom Navigation Tabs with Haptic & Highlight
document.querySelectorAll('.mobile-nav-item').forEach(item => {
  item.addEventListener('click', () => {
    triggerHaptic('light');
    document.querySelectorAll('.mobile-nav-item').forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    navigateTo(item.dataset.section);
  });
});

// ── Synced Lyrics Karaoke Engine (Spotify Feature) ──────────
function setupLyricsForSong(song) {
  currentLyricsLines = song.lyrics || [];
  activeLyricIdx = -1;

  if (!lyricsContainer) return;

  if (!currentLyricsLines.length) {
    lyricsContainer.innerHTML = `
      <div class="lyrics-empty">
        <i class="fas fa-music" style="font-size:2rem;margin-bottom:12px;opacity:0.4;"></i>
        <p>No synced lyrics available for "${esc(song.title)}"</p>
        <span style="font-size:0.8rem;">Enjoy the organic rhythm!</span>
      </div>`;
    return;
  }

  lyricsContainer.innerHTML = currentLyricsLines.map((line, i) => `
    <div class="lyric-line" data-line-idx="${i}" data-time="${line.time}">
      ${esc(line.text)}
    </div>
  `).join('');

  lyricsContainer.querySelectorAll('.lyric-line').forEach(lineEl => {
    lineEl.addEventListener('click', () => {
      const t = parseFloat(lineEl.dataset.time);
      if (!isNaN(t)) audioEl.currentTime = t;
    });
  });
}

function updateSyncedLyrics(currentTime) {
  if (!currentLyricsLines.length || !lyricsContainer) return;

  let newIdx = -1;
  for (let i = 0; i < currentLyricsLines.length; i++) {
    if (currentTime >= currentLyricsLines[i].time) {
      newIdx = i;
    } else {
      break;
    }
  }

  if (newIdx !== activeLyricIdx && newIdx !== -1) {
    activeLyricIdx = newIdx;
    lyricsContainer.querySelectorAll('.lyric-line').forEach((el, idx) => {
      el.classList.toggle('active', idx === activeLyricIdx);
    });

    // Auto scroll current lyric line to center
    const activeEl = lyricsContainer.querySelector('.lyric-line.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

btnToggleLyrics?.addEventListener('click', () => {
  lyricsDrawer?.classList.toggle('hidden');
});
btnCloseLyrics?.addEventListener('click', () => {
  lyricsDrawer?.classList.add('hidden');
});

// ── Queue Drawer Engine (Spotify Feature) ────────────────────
function renderQueueDrawer() {
  if (!queueNowPlaying || !queueList) return;

  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) {
    queueNowPlaying.innerHTML = `
      <div class="track-row playing" style="background:var(--bg-elevated);border-radius:var(--radius-sm);">
        <img src="${esc(currentSong.cover_url || '')}" class="track-thumb" alt="">
        <div class="track-texts">
          <span class="track-name">${esc(currentSong.title)}</span>
          <span class="track-artist">${esc(currentSong.artist)}</span>
        </div>
        <div class="eq-bars"><div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div></div>
      </div>`;
  } else {
    queueNowPlaying.innerHTML = `<div class="empty-state" style="padding:10px;"><p>Nothing playing</p></div>`;
  }

  const upNext = currentQueue.slice(currentSongIndex + 1);
  if (!upNext.length) {
    queueList.innerHTML = `<div class="empty-state" style="padding:14px;"><p>No more tracks in queue</p></div>`;
  } else {
    queueList.innerHTML = upNext.map((song, i) => `
      <div class="track-row" data-queue-idx="${currentSongIndex + 1 + i}">
        <span class="track-num">${i + 1}</span>
        <div class="track-info">
          <img src="${esc(song.cover_url || '')}" class="track-thumb" alt="">
          <div class="track-texts">
            <span class="track-name">${esc(song.title)}</span>
            <span class="track-artist">${esc(song.artist)}</span>
          </div>
        </div>
        <button class="track-btn btn-remove-q" data-q-idx="${currentSongIndex + 1 + i}" title="Remove">
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    `).join('');

    queueList.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.btn-remove-q')) return;
        const targetIdx = Number(row.dataset.queueIdx);
        playSong(targetIdx);
      });
    });

    queueList.querySelectorAll('.btn-remove-q').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const targetIdx = Number(btn.dataset.qIdx);
        currentQueue.splice(targetIdx, 1);
        renderQueueDrawer();
      });
    });
  }
}

btnQueue?.addEventListener('click', () => {
  renderQueueDrawer();
  queueDrawer?.classList.remove('hidden');
});
btnCloseQueue?.addEventListener('click', () => {
  queueDrawer?.classList.add('hidden');
});
btnClearQueue?.addEventListener('click', () => {
  if (currentQueue.length > 1) {
    const current = currentQueue[currentSongIndex];
    currentQueue = [current];
    currentSongIndex = 0;
    renderQueueDrawer();
    showToast('Queue cleared');
  }
});

// ── Offline & Download Manager Engine ───────────────────────
async function toggleOfflineDownload(song, btnEl = null) {
  if (!window.DK_OfflineDB) return;

  const isAlreadyOffline = offlineTrackIds.has(song.id);

  if (isAlreadyOffline) {
    try {
      await window.DK_OfflineDB.removeTrackFromOffline(song.id);
      offlineTrackIds.delete(song.id);
      showToast(`Removed "${song.title}" from offline storage`);
    } catch (e) {
      showToast('Could not remove track');
    }
  } else {
    showToast(`⬇ Downloading "${song.title}" for offline play...`);
    try {
      await window.DK_OfflineDB.downloadTrackForOffline(song);
      offlineTrackIds.add(song.id);
      showToast(`✓ "${song.title}" downloaded! Available offline.`);
    } catch (e) {
      console.error(e);
      showToast('Download failed. Playing offline safe demo.');
    }
  }

  updateOfflineCounts();
  updateNowPlayingDownloadBtn();

  if (currentSection === 'offline') renderOfflineSection();

  // Update track buttons
  document.querySelectorAll(`.track-download-btn[data-song-id="${song.id}"]`).forEach(b => {
    const nowOffline = offlineTrackIds.has(song.id);
    b.classList.toggle('downloaded', nowOffline);
    b.innerHTML = `<i class="fas ${nowOffline ? 'fa-check' : 'fa-cloud-arrow-down'}" style="${nowOffline ? 'color:#22c55e;' : ''}"></i>`;
  });
}

function updateOfflineCounts() {
  const count = offlineTrackIds.size;
  const sidebarCount = document.getElementById('sidebarOfflineCount');
  if (sidebarCount) sidebarCount.textContent = count;
}

function updateNowPlayingDownloadBtn() {
  const currentSong = currentQueue[currentSongIndex];
  if (!currentSong || !btnDownloadNP) return;
  const isOffline = offlineTrackIds.has(currentSong.id);
  btnDownloadNP.innerHTML = `<i class="fas ${isOffline ? 'fa-circle-check' : 'fa-cloud-arrow-down'}" style="${isOffline ? 'color:#22c55e;' : ''}"></i>`;
  btnDownloadNP.title = isOffline ? 'Offline Available' : 'Download for Offline';
}

btnDownloadNP?.addEventListener('click', () => {
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) toggleOfflineDownload(currentSong);
});

// Render Offline Section
async function renderOfflineSection() {
  const list = document.getElementById('offlineTrackList');
  const heroSub = document.getElementById('offlineHeroSub');
  const countBadge = document.getElementById('offlineCountBadge');
  const localBadge = document.getElementById('localCountBadge');
  if (!list) return;

  let downloadedTracks = [];
  let localTracks = [];

  if (window.DK_OfflineDB) {
    downloadedTracks = await window.DK_OfflineDB.getAllDownloadedTracks();
    localTracks = await window.DK_OfflineDB.getAllUserLocalTracks();
  }

  // Merge unique
  const offlineSongsMap = new Map();
  downloadedTracks.forEach(t => offlineSongsMap.set(t.id, t));
  localTracks.forEach(t => offlineSongsMap.set(t.id, t));
  songs.forEach(s => {
    if (offlineTrackIds.has(s.id) && !offlineSongsMap.has(s.id)) {
      offlineSongsMap.set(s.id, s);
    }
  });

  const allOfflineList = Array.from(offlineSongsMap.values());

  if (heroSub) heroSub.textContent = `${allOfflineList.length} tracks available 100% without internet connection`;
  if (countBadge) countBadge.innerHTML = `<i class="fas fa-check-circle"></i> ${downloadedTracks.length} Downloaded`;
  if (localBadge) localBadge.innerHTML = `<i class="fas fa-hard-drive"></i> ${localTracks.length} Local MP3s`;

  if (!allOfflineList.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-cloud-arrow-down"></i>
        <p>No offline tracks yet</p>
        <span>Click ⬇️ on any track or click "Import Local MP3s" to listen offline!</span>
      </div>`;
    return;
  }

  renderTrackRows(allOfflineList, list, { showAlbum: true });
}

document.getElementById('btnPlayAllOffline')?.addEventListener('click', async () => {
  const downloaded = await window.DK_OfflineDB?.getAllDownloadedTracks() || [];
  const local = await window.DK_OfflineDB?.getAllUserLocalTracks() || [];
  const all = [...local, ...downloaded];
  if (!all.length) {
    showToast('No offline tracks available yet');
    return;
  }
  currentQueue = [...all];
  playSong(0);
  showToast(`▶ Playing ${all.length} offline tracks`);
});

document.getElementById('btnClearOfflineCache')?.addEventListener('click', async () => {
  if (!confirm('Clear all downloaded offline music? (Local MP3s will remain safe)')) return;
  const downloaded = await window.DK_OfflineDB?.getAllDownloadedTracks() || [];
  for (const t of downloaded) {
    await window.DK_OfflineDB.removeTrackFromOffline(t.id);
    offlineTrackIds.delete(t.id);
  }
  updateOfflineCounts();
  renderOfflineSection();
  showToast('Offline downloaded cache cleared');
});

// ── Local Audio File Importer Engine (100% Offline & Safe) ──
function triggerLocalImport() {
  localAudioFileInput?.click();
}

document.getElementById('btnImportLocalTop')?.addEventListener('click', triggerLocalImport);
document.getElementById('btnSidebarImport')?.addEventListener('click', triggerLocalImport);
document.getElementById('btnImportInLibrary')?.addEventListener('click', triggerLocalImport);
document.getElementById('btnImportLocalBanner')?.addEventListener('click', triggerLocalImport);

localAudioFileInput?.addEventListener('change', async e => {
  const files = e.target.files;
  if (!files || !files.length) return;

  showToast(`📥 Importing ${files.length} local audio files...`);
  let importedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const saved = await window.DK_OfflineDB.saveUserLocalAudio(file);
      saved.file_url = URL.createObjectURL(file);
      songs.unshift(saved);
      offlineTrackIds.add(saved.id);
      importedCount++;
    } catch (err) {
      console.error('Failed to import file:', file.name, err);
    }
  }

  updateOfflineCounts();
  showToast(`🎉 Successfully imported ${importedCount} tracks to offline library!`);
  localAudioFileInput.value = '';
  renderAll();

  if (currentSection === 'offline') renderOfflineSection();
  else if (currentSection === 'library') renderLibrarySection('local');
});

// ── 3D Turntable & Audio Spectrum Handlers ──────────────────
function setup3D() {
  if (!window.DK_3DAudio) return;

  // Bind Turntable
  window.DK_3DAudio.bindTurntable(vinylRecord, tonearmAssembly);

  // Bind Visualizer Canvas
  window.DK_3DAudio.setupVisualizer(visualizer3DCanvas);

  // RPM buttons
  btnRpm33?.addEventListener('click', () => {
    btnRpm33.classList.add('active');
    btnRpm45?.classList.remove('active');
    window.DK_3DAudio.setSpeed(33);
    showToast('Turntable Speed: 33 RPM');
  });

  btnRpm45?.addEventListener('click', () => {
    btnRpm45.classList.add('active');
    btnRpm33?.classList.remove('active');
    window.DK_3DAudio.setSpeed(45);
    showToast('Turntable Speed: 45 RPM (High Speed)');
  });

  // Visualizer Mode Buttons
  document.querySelectorAll('.vis-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vis-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      window.DK_3DAudio.setVisualizerMode(btn.dataset.mode);
    });
  });

  btnV3dPlay?.addEventListener('click', togglePlayPause);
  btnQuick3D?.addEventListener('click', () => navigateTo('visualizer3d'));
}

function update3DViewInfo() {
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) {
    if (v3dTitle) v3dTitle.textContent = currentSong.title;
    if (v3dArtist) v3dArtist.textContent = `${currentSong.artist} • ${currentSong.album || 'Single'}`;
    window.DK_3DAudio?.updateVinylCover(currentSong.cover_url);
  }
}

// ── Search & Filter Engine ──────────────────────────────────
function renderSearchSection() {
  const query = searchInput ? searchInput.value.trim() : '';
  let filtered = songs;

  // Filter by category tag
  if (currentSearchGenre === 'local') {
    filtered = filtered.filter(s => s.isLocal);
  } else if (currentSearchGenre !== 'all') {
    filtered = filtered.filter(s => (s.genre || '').toLowerCase().includes(currentSearchGenre.toLowerCase()) || (s.search_tags || []).includes(currentSearchGenre.toLowerCase()));
  }

  // Filter by text query using Tamil AI Engine
  if (query) {
    if (window.DK_TamilAIEngine) {
      filtered = window.DK_TamilAIEngine.searchTamilSongs(filtered, query);
    } else {
      const q = query.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.album && s.album.toLowerCase().includes(q)) ||
        (s.genre && s.genre.toLowerCase().includes(q))
      );
    }
  }

  renderSongGrid(filtered, 'searchGrid');
}

searchInput?.addEventListener('input', () => {
  if (currentSection !== 'search') navigateTo('search');
  renderSearchSection();
});

document.querySelectorAll('#searchGenreChips .genre-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#searchGenreChips .genre-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentSearchGenre = chip.dataset.genre;
    renderSearchSection();
  });
});

// ── Liked Songs Section ─────────────────────────────────────
let likedSearchQuery = '';
let likedSortOption = 'recent';

function renderLikedSection() {
  const list = document.getElementById('likedList');
  if (!list) return;

  const likedItemsRaw = songs.filter(s => likedSongs.has(s.id));
  const totalSecs = likedItemsRaw.reduce((acc, s) => acc + (s.duration || 180), 0);

  const artistCounts = {};
  likedItemsRaw.forEach(s => {
    if (s.artist) artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1;
  });
  let topArtist = '—';
  let maxCount = 0;
  Object.entries(artistCounts).forEach(([artist, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topArtist = artist;
    }
  });

  const statDuration = document.getElementById('likedStatDuration');
  const statArtist   = document.getElementById('likedStatArtist');
  const heroSub      = document.getElementById('likedHeroSub');

  if (statDuration) statDuration.innerHTML = `<i class="fas fa-clock"></i> ${fmtDurationLong(totalSecs)}`;
  if (statArtist)   statArtist.innerHTML   = `<i class="fas fa-music"></i> Top Artist: ${esc(topArtist)}`;
  if (heroSub)      heroSub.textContent   = `${likedItemsRaw.length} ${likedItemsRaw.length === 1 ? 'song' : 'songs'} • Saved to your favorites`;

  let filtered = likedItemsRaw;
  if (likedSearchQuery) {
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(likedSearchQuery) ||
      s.artist.toLowerCase().includes(likedSearchQuery) ||
      (s.album && s.album.toLowerCase().includes(likedSearchQuery))
    );
  }

  if (likedSortOption === 'title') {
    filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  } else if (likedSortOption === 'artist') {
    filtered = [...filtered].sort((a, b) => a.artist.localeCompare(b.artist));
  } else if (likedSortOption === 'duration') {
    filtered = [...filtered].sort((a, b) => (b.duration || 0) - (a.duration || 0));
  }

  if (!filtered.length) {
    list.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-heart" style="color:var(--accent-liked);opacity:0.8;"></i>
        <p>Songs you like will appear here</p>
        <span>Save any track by clicking the heart icon anywhere in the app</span>
      </div>`;
  } else {
    renderTrackRows(filtered, list, { showAlbum: true });
  }

  const btnPlayLiked = document.getElementById('btnPlayLiked');
  if (btnPlayLiked) {
    btnPlayLiked.onclick = () => {
      if (!filtered.length) { showToast('No songs to play!'); return; }
      currentQueue = [...filtered];
      playSong(0);
    };
  }

  const btnShuffleLiked = document.getElementById('btnShuffleLiked');
  if (btnShuffleLiked) {
    btnShuffleLiked.onclick = () => {
      if (!filtered.length) { showToast('No songs to shuffle!'); return; }
      currentQueue = [...filtered].sort(() => Math.random() - 0.5);
      playSong(0);
    };
  }

  const btnSaveLikedAsPl = document.getElementById('btnSaveLikedAsPl');
  if (btnSaveLikedAsPl) {
    btnSaveLikedAsPl.onclick = () => {
      if (!likedItemsRaw.length) {
        showToast('Add some liked songs first!');
        return;
      }
      const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const newPlName = `Favorites (${dateStr})`;
      const newId = uid();
      const newPl = {
        id: newId,
        name: newPlName,
        description: `Created from Liked Songs on ${dateStr}`,
        cover: null,
        created: Date.now()
      };
      playlists.push(newPl);
      playlistSongMap[newId] = new Set(likedItemsRaw.map(s => s.id));
      savePlaylists();
      showToast(`🎉 Playlist "${newPlName}" created!`);
      openPlaylist(newId);
    };
  }
}

document.getElementById('likedSearchInput')?.addEventListener('input', e => {
  likedSearchQuery = e.target.value.toLowerCase().trim();
  renderLikedSection();
});
document.getElementById('likedSortSelect')?.addEventListener('change', e => {
  likedSortOption = e.target.value;
  renderLikedSection();
});

function toggleLike(songId, btnEl = null) {
  if (likedSongs.has(songId)) {
    likedSongs.delete(songId);
    showToast('Removed from Liked Songs');
  } else {
    likedSongs.add(songId);
    showToast('❤️ Added to Liked Songs');
  }
  saveLiked();

  document.querySelectorAll(`.song-like-btn[data-song-id="${songId}"], .track-like-btn[data-song-id="${songId}"]`).forEach(btn => {
    btn.classList.toggle('liked', likedSongs.has(songId));
    const icon = btn.querySelector('i');
    if (icon) icon.className = `${likedSongs.has(songId) ? 'fas' : 'far'} fa-heart`;
  });

  updateNowPlayingLikeBtn();
  if (currentSection === 'liked') renderLikedSection();
}

function updateNowPlayingLikeBtn() {
  const currentSong = currentQueue[currentSongIndex];
  if (!currentSong) return;
  const isLiked = likedSongs.has(currentSong.id);
  if (btnLikeNP) {
    btnLikeNP.classList.toggle('liked', isLiked);
    btnLikeNP.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
  }
  if (btnMmpLike) {
    btnMmpLike.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart" style="${isLiked ? 'color:#ec4899;' : ''}"></i>`;
  }
  if (btnMpsLike) {
    btnMpsLike.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart" style="${isLiked ? 'color:#ec4899;' : ''}"></i>`;
  }
}
btnLikeNP?.addEventListener('click', () => {
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) toggleLike(currentSong.id);
});

// ── Library Section ─────────────────────────────────────────
function renderLibrarySection(filter = 'all') {
  const grid = document.getElementById('libraryGrid');
  if (!grid) return;

  document.querySelectorAll('#libraryFilterRow .filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === filter);
  });

  const albums = getAlbums();

  const likedCard = {
    type: 'liked',
    name: 'Liked Songs',
    sub: `${likedSongs.size} saved tracks`,
    coverHTML: `<div class="lib-icon liked-icon" style="width:100%;height:100%;font-size:2.5rem;"><i class="fas fa-heart"></i></div>`,
    action: () => navigateTo('liked')
  };

  const playlistCards = playlists.map(pl => {
    const count = playlistSongMap[pl.id]?.size || 0;
    const coverHTML = pl.cover
      ? `<img src="${esc(pl.cover)}" class="playlist-cover" alt="" onerror="this.parentElement.innerHTML='<div class=\\'playlist-cover-placeholder\\'><i class=\\'fas fa-music\\'></i></div>'">`
      : `<div class="playlist-cover-placeholder"><i class="fas fa-music"></i></div>`;

    return {
      type: 'playlist',
      name: pl.name,
      sub: `Playlist • ${count} tracks`,
      coverHTML,
      action: () => openPlaylist(pl.id)
    };
  });

  const albumCards = albums.map(a => ({
    type: 'album',
    name: a.name,
    sub: `Album • ${a.artist}`,
    coverHTML: `<img src="${esc(a.cover || '')}" class="card-cover" alt="" onerror="this.parentElement.style.background='var(--bg-elevated)'">`,
    action: () => openAlbum(a)
  }));

  const localSongs = songs.filter(s => s.isLocal);
  const localCard = {
    type: 'local',
    name: 'Local Device Audio',
    sub: `${localSongs.length} imported files`,
    coverHTML: `<div class="lib-icon import-icon" style="width:100%;height:100%;font-size:2.5rem;background:#059669;"><i class="fas fa-hard-drive"></i></div>`,
    action: () => navigateTo('offline')
  };

  let items = [];
  if (filter === 'all') items = [likedCard, localCard, ...playlistCards, ...albumCards];
  else if (filter === 'playlists') items = [likedCard, ...playlistCards];
  else if (filter === 'albums') items = albumCards;
  else if (filter === 'local') items = [localCard];

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state"><i class="fas fa-layer-group"></i><p>No items in this category</p></div>`;
    return;
  }

  grid.innerHTML = items.map((item, i) => `
    <div class="playlist-card" data-lib-idx="${i}" role="button" tabindex="0">
      <div class="playlist-cover-wrapper">
        ${item.coverHTML}
        <button class="play-overlay"><i class="fas fa-play"></i></button>
      </div>
      <div class="playlist-card-title" title="${esc(item.name)}">${esc(item.name)}</div>
      <div class="playlist-card-sub">${esc(item.sub)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.playlist-card').forEach(card => {
    const idx = Number(card.dataset.libIdx);
    card.addEventListener('click', () => items[idx].action());
  });

  setTimeout(() => window.DK_Init3DTilt?.(), 100);
}

document.querySelectorAll('#libraryFilterRow .filter-chip').forEach(chip => {
  chip.addEventListener('click', () => renderLibrarySection(chip.dataset.filter));
});

// ── Dedicated Playlist View Engine ──────────────────────────
function openPlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) {
    showToast('Playlist not found');
    return;
  }

  activePlaylistId = playlistId;

  const plSongs = songs.filter(s => playlistSongMap[pl.id]?.has(s.id));
  const totalSecs = plSongs.reduce((acc, s) => acc + (s.duration || 180), 0);

  const heroTitle = document.getElementById('plHeroTitle');
  const heroDesc  = document.getElementById('plHeroDesc');
  const heroImg   = document.getElementById('plHeroImg');
  const heroIcon  = document.getElementById('plHeroIcon');
  const trackCount= document.getElementById('plTrackCount');
  const durationEl= document.getElementById('plDuration');

  if (heroTitle) heroTitle.textContent = pl.name;
  if (heroDesc)  heroDesc.textContent = pl.description || 'Custom curated collection';
  if (trackCount) trackCount.textContent = `${plSongs.length} ${plSongs.length === 1 ? 'track' : 'tracks'}`;
  if (durationEl) durationEl.textContent = fmtDurationLong(totalSecs);

  if (heroImg && heroIcon) {
    if (pl.cover) {
      heroImg.src = pl.cover;
      heroImg.style.display = 'block';
      heroIcon.style.display = 'none';
    } else {
      heroImg.style.display = 'none';
      heroIcon.style.display = 'flex';
    }
  }

  renderTrackRows(plSongs, document.getElementById('plTrackList'), {
    playlistId: pl.id,
    showAlbum: true
  });

  const btnPlayPlaylist = document.getElementById('btnPlayPlaylist');
  if (btnPlayPlaylist) {
    btnPlayPlaylist.onclick = () => playPlaylist(pl.id);
  }

  const btnShufflePlaylist = document.getElementById('btnShufflePlaylist');
  if (btnShufflePlaylist) {
    btnShufflePlaylist.onclick = () => playPlaylist(pl.id, true);
  }

  const btnDownloadPlaylist = document.getElementById('btnDownloadPlaylist');
  if (btnDownloadPlaylist) {
    btnDownloadPlaylist.onclick = async () => {
      showToast(`⬇ Downloading ${plSongs.length} tracks in playlist...`);
      for (const s of plSongs) {
        await window.DK_OfflineDB?.downloadTrackForOffline(s);
        offlineTrackIds.add(s.id);
      }
      updateOfflineCounts();
      openPlaylist(pl.id);
      showToast(`✓ Playlist "${pl.name}" is now available offline!`);
    };
  }

  const btnAddSongsToPl = document.getElementById('btnAddSongsToPl');
  if (btnAddSongsToPl) btnAddSongsToPl.onclick = () => editPlaylist(pl.id);

  const btnEditPlaylist = document.getElementById('btnEditPlaylist');
  if (btnEditPlaylist) btnEditPlaylist.onclick = () => editPlaylist(pl.id);

  const btnDeletePlaylist = document.getElementById('btnDeletePlaylist');
  if (btnDeletePlaylist) btnDeletePlaylist.onclick = () => deletePlaylist(pl.id);

  navigateTo('playlist');
  renderSidebarPlaylists();
}

function playPlaylist(playlistId, shuffle = false) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;
  const plSongs = songs.filter(s => playlistSongMap[pl.id]?.has(s.id));

  if (!plSongs.length) {
    showToast('Playlist is empty! Add songs first.');
    return;
  }

  if (mpsPlaylistSource) mpsPlaylistSource.textContent = pl.name;
  currentQueue = shuffle ? [...plSongs].sort(() => Math.random() - 0.5) : [...plSongs];
  playSong(0);
  showToast(`▶ Playing "${pl.name}"`);
}

function deletePlaylist(playlistId) {
  const pl = playlists.find(p => p.id === playlistId);
  if (!pl) return;

  if (!confirm(`Are you sure you want to delete "${pl.name}"?`)) return;

  playlists = playlists.filter(p => p.id !== playlistId);
  delete playlistSongMap[playlistId];
  savePlaylists();

  showToast(`🗑️ Playlist "${pl.name}" deleted`);
  navigateTo('library');
}

function removeSongFromPlaylist(playlistId, songId) {
  const set = playlistSongMap[playlistId];
  if (!set) return;

  set.delete(songId);
  savePlaylists();
  showToast('Song removed from playlist');

  if (currentSection === 'playlist' && activePlaylistId === playlistId) {
    openPlaylist(playlistId);
  }
}

// ── Create / Edit Playlist Section ──────────────────────────
function renderCreateSection() {
  const activeIdEl = document.getElementById('activePlaylistId');
  const nameInput  = document.getElementById('playlistName');
  const descInput  = document.getElementById('playlistDesc');
  const pageTitle  = document.getElementById('createPageTitle');
  const saveBtnText= document.getElementById('btnSavePlaylistText');
  const coverText  = document.getElementById('createCoverText');
  const previewImg = document.getElementById('createCoverPreview');

  if (activePlaylistId) {
    const pl = playlists.find(p => p.id === activePlaylistId);
    if (pl) {
      if (activeIdEl) activeIdEl.value = pl.id;
      if (nameInput) nameInput.value = pl.name;
      if (descInput) descInput.value = pl.description || '';
      if (pageTitle) pageTitle.textContent = `Edit "${pl.name}"`;
      if (saveBtnText) saveBtnText.textContent = 'Update Playlist';
      if (previewImg && pl.cover) {
        previewImg.src = pl.cover;
        previewImg.classList.remove('hidden');
        if (coverText) coverText.textContent = 'Change Cover';
      }
    }
  } else {
    if (activeIdEl) activeIdEl.value = '';
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (pageTitle) pageTitle.textContent = 'Create New Playlist';
    if (saveBtnText) saveBtnText.textContent = 'Save Playlist';
    if (previewImg) previewImg.classList.add('hidden');
    if (coverText) coverText.textContent = 'Choose Cover Image';
  }

  renderSongPickerList();
}

function editPlaylist(playlistId) {
  activePlaylistId = playlistId;
  navigateTo('create');
}

function renderSongPickerList() {
  const list = document.getElementById('songPickerList');
  const countBadge = document.getElementById('pickerCountBadge');
  if (!list) return;

  const currentPlId = document.getElementById('activePlaylistId')?.value || activePlaylistId;
  const plSet = currentPlId ? playlistSongMap[currentPlId] : null;
  const addedCount = plSet ? plSet.size : 0;

  if (countBadge) {
    countBadge.textContent = addedCount ? `${addedCount} songs selected` : 'Select songs below';
  }

  if (!songs.length) {
    list.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><p>No songs available</p></div>`;
    return;
  }

  list.innerHTML = songs.map((song, i) => {
    const inPl = plSet && plSet.has(song.id);
    return `
      <div class="track-row picker-row" data-song-id="${esc(song.id)}" data-idx="${i}">
        <div class="track-num-wrap"><span class="track-num">${i + 1}</span></div>
        <div class="track-info">
          <img src="${esc(song.cover_url || '')}" alt="" class="track-thumb" loading="lazy" onerror="this.style.display='none'">
          <div class="track-texts">
            <span class="track-name">${esc(song.title)}</span>
            <span class="track-artist">${esc(song.artist)}</span>
          </div>
        </div>
        <button class="picker-add-btn ${inPl ? 'added' : ''}" data-song-id="${esc(song.id)}">
          <i class="fas ${inPl ? 'fa-check' : 'fa-plus'}"></i>
          <span>${inPl ? 'Added' : 'Add'}</span>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('.picker-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const songId = btn.dataset.songId;
      let currentPlId = document.getElementById('activePlaylistId')?.value || activePlaylistId;

      if (!currentPlId) {
        const name = document.getElementById('playlistName')?.value.trim() || 'My Playlist';
        const newId = uid();
        playlists.push({
          id: newId,
          name,
          description: document.getElementById('playlistDesc')?.value.trim() || '',
          cover: null,
          created: Date.now()
        });
        playlistSongMap[newId] = new Set();
        activePlaylistId = newId;
        document.getElementById('activePlaylistId').value = newId;
        savePlaylists();
        currentPlId = newId;
      }

      const set = playlistSongMap[currentPlId];
      if (!set) return;

      if (set.has(songId)) {
        set.delete(songId);
        btn.classList.remove('added');
        btn.innerHTML = '<i class="fas fa-plus"></i> <span>Add</span>';
        showToast('Song removed from playlist');
      } else {
        set.add(songId);
        btn.classList.add('added');
        btn.innerHTML = '<i class="fas fa-check"></i> <span>Added</span>';
        showToast('✓ Added to playlist');
      }

      savePlaylists();
      renderSongPickerList();
    });
  });
}

document.getElementById('btnSavePlaylist')?.addEventListener('click', () => {
  const nameInput = document.getElementById('playlistName');
  const name = nameInput?.value.trim();
  if (!name) {
    showToast('Please enter a playlist name!');
    nameInput?.focus();
    return;
  }

  const desc = document.getElementById('playlistDesc')?.value.trim() || '';
  const activeIdEl = document.getElementById('activePlaylistId');
  const existingId = activeIdEl?.value || activePlaylistId;

  if (existingId) {
    const existing = playlists.find(p => p.id === existingId);
    if (existing) {
      existing.name = name;
      existing.description = desc;
      savePlaylists();
      showToast(`✓ Playlist "${name}" updated!`);
      openPlaylist(existingId);
      return;
    }
  }

  const newId = uid();
  playlists.push({
    id: newId,
    name,
    description: desc,
    cover: null,
    created: Date.now()
  });

  if (!playlistSongMap[newId]) playlistSongMap[newId] = new Set();
  activePlaylistId = newId;
  savePlaylists();

  showToast(`🎉 Playlist "${name}" created!`);
  openPlaylist(newId);
});

// Custom Cover Image Handler
document.getElementById('createCoverArea')?.addEventListener('click', () => {
  document.getElementById('playlistCoverInput')?.click();
});

document.getElementById('playlistCoverInput')?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    const coverData = ev.target.result;
    const preview = document.getElementById('createCoverPreview');
    if (preview) {
      preview.src = coverData;
      preview.classList.remove('hidden');
    }
    document.getElementById('createCoverText').textContent = 'Cover Selected';

    const currentPlId = document.getElementById('activePlaylistId')?.value || activePlaylistId;
    if (currentPlId) {
      const pl = playlists.find(p => p.id === currentPlId);
      if (pl) {
        pl.cover = coverData;
        savePlaylists();
      }
    }
  };
  reader.readAsDataURL(file);
});

// ── Quick Add to Playlist Modal ─────────────────────────────
function openAddToPlaylistModal(songId) {
  const song = songs.find(s => s.id === songId);
  if (!song) return;
  selectedSongForModal = songId;

  const modalSongName = document.getElementById('modalSongName');
  if (modalSongName) {
    modalSongName.innerHTML = `Add <strong>${esc(song.title)}</strong> to:`;
  }

  const list = document.getElementById('modalPlaylistList');
  if (!list) return;

  if (!playlists.length) {
    list.innerHTML = `<div class="empty-state" style="padding:20px;"><p>No playlists created yet</p></div>`;
  } else {
    list.innerHTML = playlists.map(pl => {
      const inPl = playlistSongMap[pl.id]?.has(songId);
      return `
        <div class="modal-pl-row ${inPl ? 'in-pl' : ''}" data-pl-id="${esc(pl.id)}">
          <span class="modal-pl-name"><i class="fas fa-list"></i> ${esc(pl.name)}</span>
          <span class="modal-pl-badge">${inPl ? '✓ Added' : '+ Add'}</span>
        </div>`;
    }).join('');

    list.querySelectorAll('.modal-pl-row').forEach(row => {
      row.addEventListener('click', () => {
        const plId = row.dataset.plId;
        const set = playlistSongMap[plId];
        if (!set) return;

        if (set.has(songId)) {
          set.delete(songId);
          showToast(`Removed from "${playlists.find(p => p.id === plId)?.name}"`);
        } else {
          set.add(songId);
          showToast(`✓ Added to "${playlists.find(p => p.id === plId)?.name}"`);
        }
        savePlaylists();
        openAddToPlaylistModal(songId);
      });
    });
  }

  addToPlaylistModal?.classList.remove('hidden');
}

function closeAddToPlaylistModal() {
  addToPlaylistModal?.classList.add('hidden');
  selectedSongForModal = null;
}

btnCloseModal?.addEventListener('click', closeAddToPlaylistModal);
addToPlaylistModal?.addEventListener('click', e => {
  if (e.target === addToPlaylistModal) closeAddToPlaylistModal();
});
document.getElementById('btnModalCreatePl')?.addEventListener('click', () => {
  closeAddToPlaylistModal();
  activePlaylistId = null;
  navigateTo('create');
});

// ── TAMIL DISCOVERY & AI ASSISTANT MODULE ─────────────────
let activeTamilFilter = 'all';

function renderTamilSection(filterMode = activeTamilFilter, query = '') {
  activeTamilFilter = filterMode;
  const grid = document.getElementById('tamilGrid');
  const countBadge = document.getElementById('tamilTotalCount');
  if (!grid) return;

  const searchVal = query || document.getElementById('tamilSearchInput')?.value || '';
  let list = songs;

  // 1. Multi-language fuzzy search matcher
  if (window.DK_TamilAIEngine) {
    list = window.DK_TamilAIEngine.searchTamilSongs(songs, searchVal);
  }

  // 2. Mood / Category Chip Filter
  if (filterMode !== 'all') {
    if (filterMode === '90s') {
      list = list.filter(s => s.year >= 1990 && s.year <= 1999);
    } else if (filterMode === 'Ilaiyaraaja') {
      list = list.filter(s => (s.artist || '').toLowerCase().includes('ilaiyaraaja') || (s.search_tags || []).includes('ilaiyaraaja'));
    } else if (filterMode === 'AR Rahman') {
      list = list.filter(s => (s.artist || '').toLowerCase().includes('rahman') || (s.search_tags || []).includes('ar rahman'));
    } else {
      list = list.filter(s => s.mood === filterMode || s.genre === filterMode || (s.search_tags || []).includes(filterMode.toLowerCase()));
    }
  }

  if (countBadge) countBadge.textContent = list.length;

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-om" style="font-size:2.2rem;margin-bottom:12px;opacity:0.5;color:#f59e0b;"></i>
        <p>No Tamil tracks matching "${esc(searchVal || filterMode)}"</p>
        <span style="font-size:0.8rem;">Try searching in Tamil (தமிழ்), Tanglish (e.g. 'Kannana Kanne') or English</span>
      </div>`;
    return;
  }

  renderSongGrid(list, 'tamilGrid');
}

function initTamilListeners() {
  const searchInput = document.getElementById('tamilSearchInput');
  const aiFilterBtn = document.getElementById('btnTamilAISearch');
  const moodChips = document.querySelectorAll('#tamilMoodChips .genre-chip');

  searchInput?.addEventListener('input', e => {
    renderTamilSection(activeTamilFilter, e.target.value);
  });

  aiFilterBtn?.addEventListener('click', () => {
    const searchVal = searchInput?.value || 'melody';
    const recs = window.DK_TamilAIEngine ? window.DK_TamilAIEngine.searchTamilSongs(songs, searchVal) : songs;
    if (recs.length) {
      openAIRecommendModal(recs[0]);
    } else {
      showToast('🤖 AI Tamil Engine: Searching catalog...');
    }
  });

  moodChips.forEach(chip => {
    chip.addEventListener('click', () => {
      moodChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.tamilFilter;
      renderTamilSection(filter, searchInput?.value || '');
    });
  });
}

// ── AI Assistant Chat Controller ────────────────────────────
let aiChatInitialized = false;

function initAIAssistantSection() {
  const chatWindow = document.getElementById('aiChatWindow');
  const chatInput = document.getElementById('aiChatInput');
  const sendBtn = document.getElementById('btnSendAIChat');
  const resetBtn = document.getElementById('btnClearAIChat');
  const promptChips = document.querySelectorAll('.ai-prompt-chip');

  if (!aiChatInitialized) {
    aiChatInitialized = true;

    promptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        if (chatInput) chatInput.value = prompt;
        handleSendAIChat(prompt);
      });
    });

    sendBtn?.addEventListener('click', () => handleSendAIChat());

    chatInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendAIChat();
      }
    });

    resetBtn?.addEventListener('click', () => {
      if (!chatWindow) return;
      chatWindow.innerHTML = `
        <div class="ai-message ai-message-bot">
          <div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>
          <div class="ai-msg-content">
            <p><strong>Vanakkam! (வணக்கம்!)</strong> I am your DK Tamil AI Music Assistant. 🎵</p>
            <p>Ask me for music recommendations using any language — Tamil script, Tanglish, or English. Click prompt chips above or type below!</p>
          </div>
        </div>`;
      showToast('Chat history reset');
    });
  }
}

async function handleSendAIChat(customPrompt = null) {
  const chatInput = document.getElementById('aiChatInput');
  const chatWindow = document.getElementById('aiChatWindow');
  if (!chatWindow) return;

  const prompt = (customPrompt || chatInput?.value || '').trim();
  if (!prompt) return;

  if (chatInput) chatInput.value = '';

  // 1. Append User Message
  const userMsgHTML = `
    <div class="ai-message ai-message-user">
      <div class="ai-msg-avatar"><i class="fas fa-user"></i></div>
      <div class="ai-msg-content">
        <p>${esc(prompt)}</p>
      </div>
    </div>`;
  chatWindow.insertAdjacentHTML('beforeend', userMsgHTML);

  // 2. Append Typing Indicator Loading State
  const typingHTML = `
    <div class="ai-message ai-message-bot" id="aiTypingMsg">
      <div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>
      <div class="ai-msg-content">
        <div class="ai-typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>`;
  chatWindow.insertAdjacentHTML('beforeend', typingHTML);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // 3. Process AI Query via Tamil AI Engine (Proxy or Local NLP)
  try {
    let result = null;
    if (window.DK_TamilAIEngine) {
      result = await window.DK_TamilAIEngine.processAIChatQuery(prompt, songs);
    }

    // Remove typing indicator
    const typingEl = document.getElementById('aiTypingMsg');
    if (typingEl) typingEl.remove();

    if (!result) {
      result = {
        text: "I searched our Tamil catalog for your request.",
        matchedSongs: songs.slice(0, 4)
      };
    }

    // 4. Format In-Chat Playable Mini Song Cards
    let songCardsHTML = '';
    if (result.matchedSongs && result.matchedSongs.length) {
      songCardsHTML = `
        <div class="ai-chat-song-list">
          ${result.matchedSongs.map(song => `
            <div class="ai-song-card-mini" data-song-id="${esc(song.id)}">
              <img src="${esc(song.cover_url || '')}" alt="${esc(song.title)}" class="ai-mini-cover" onerror="this.style.display='none'">
              <div class="ai-mini-info">
                <div class="ai-mini-title">${esc(song.title)}</div>
                <div class="ai-mini-artist">${esc(song.artist)} ${song.movie ? `&bull; ${esc(song.movie)}` : ''}</div>
              </div>
              <div class="ai-mini-actions">
                <button class="btn-play-mini" data-song-id="${esc(song.id)}" style="background:#8b5cf6;color:#fff;border:none;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;">
                  <i class="fas fa-play" style="font-size:0.75rem;"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>`;
    }

    const botMsgHTML = `
      <div class="ai-message ai-message-bot">
        <div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>
        <div class="ai-msg-content">
          <p>${esc(result.text).replace(/\n/g, '<br>')}</p>
          ${result.explanation ? `<p style="font-size:0.78rem;color:var(--text-sub);margin-top:6px;"><i class="fas fa-sparkles"></i> ${esc(result.explanation)}</p>` : ''}
          ${songCardsHTML}
        </div>
      </div>`;

    chatWindow.insertAdjacentHTML('beforeend', botMsgHTML);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Bind click handlers on in-chat mini song play buttons
    chatWindow.querySelectorAll('.ai-song-card-mini').forEach(card => {
      const songId = card.dataset.songId;
      card.addEventListener('click', e => {
        const songIdx = songs.findIndex(s => s.id === songId);
        if (songIdx >= 0) {
          currentQueue = [...songs];
          playSong(songIdx);
          showToast(`♪ Playing "${songs[songIdx].title}"`);
        }
      });
    });

  } catch (err) {
    const typingEl = document.getElementById('aiTypingMsg');
    if (typingEl) typingEl.remove();

    const errHTML = `
      <div class="ai-message ai-message-bot">
        <div class="ai-msg-avatar"><i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i></div>
        <div class="ai-msg-content" style="border-color:#ef4444;">
          <p>Sorry, I encountered an issue processing your request. Please try again or rephrase your prompt.</p>
        </div>
      </div>`;
    chatWindow.insertAdjacentHTML('beforeend', errHTML);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

// ── AI Recommendation Modal Handler ─────────────────────────
function openAIRecommendModal(targetSong) {
  const modal = document.getElementById('aiRecommendModal');
  const listEl = document.getElementById('aiRecommendList');
  const subEl  = document.getElementById('aiRecommendTargetSub');
  const closeBtn = document.getElementById('btnCloseAIModal');

  if (!modal || !listEl) return;

  if (subEl && targetSong) {
    subEl.textContent = `Recommended similar to "${targetSong.title}" (${targetSong.artist})`;
  }

  const recs = window.DK_TamilAIEngine ? window.DK_TamilAIEngine.getAIRecommendations(songs, targetSong) : [];
  const recSongs = recs.map(r => r.song || r);

  renderTrackRows(recSongs, listEl, { showAlbum: true });
  modal.classList.remove('hidden');

  closeBtn?.onclick = () => modal.classList.add('hidden');
  modal.onclick = e => { if (e.target === modal) modal.classList.add('hidden'); };
}

// Boot listeners
window.addEventListener('DOMContentLoaded', () => {
  initTamilListeners();
});
btnAddNowPlayingToPl?.addEventListener('click', () => {
  const currentSong = currentQueue[currentSongIndex];
  if (currentSong) openAddToPlaylistModal(currentSong.id);
});

// ── Network Status Engine ───────────────────────────────────
function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (networkBadge) {
    networkBadge.className = `network-badge ${isOnline ? 'online' : 'offline'}`;
  }
  if (networkText) {
    networkText.textContent = isOnline ? 'Online' : 'Offline Mode';
  }
  if (!isOnline) {
    showToast('⚡ Offline Mode active: Playing cached & local tracks');
  }
}
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ── Service Worker PWA Registration ─────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
  });
}

// ── Keyboard Shortcuts ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlayPause();
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    if (audioEl.duration) audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 5);
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    audioEl.currentTime = Math.max(0, audioEl.currentTime - 5);
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    setVolume(audioEl.volume + 0.05);
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    setVolume(audioEl.volume - 0.05);
  }
});

// ============================================================
// ── USER AUTHENTICATION SYSTEM ─────────────────────────────
// ============================================================
let currentUser = null;
let userAuthToken = localStorage.getItem('dk_user_token') || '';
let isUserAdmin = false;

function initAuthSystem() {
  const storedUser = localStorage.getItem('dk_user_info');
  if (userAuthToken && storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      isUserAdmin = (currentUser.role === 'admin' || currentUser.userId === 'admin');
      updateAuthHeaderUI();
    } catch (e) {
      logoutUser();
    }
  } else {
    updateAuthHeaderUI();
  }
}

function updateAuthHeaderUI() {
  const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
  const userProfileBadge = document.getElementById('userProfileBadge');
  const userNameLabel = document.getElementById('userNameLabel');
  const userAvatarBtn = document.getElementById('userAvatarBtn');
  const topbarAdminBtn = document.getElementById('topbarAdminBtn');

  if (currentUser) {
    if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'none';
    if (userProfileBadge) userProfileBadge.classList.remove('hidden');
    if (userNameLabel) userNameLabel.textContent = currentUser.name || currentUser.userId;
    if (userAvatarBtn) userAvatarBtn.textContent = (currentUser.name || currentUser.userId)[0].toUpperCase();
    if (topbarAdminBtn) {
      if (isUserAdmin) topbarAdminBtn.classList.remove('hidden');
      else topbarAdminBtn.classList.add('hidden');
    }
  } else {
    if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'inline-flex';
    if (userProfileBadge) userProfileBadge.classList.add('hidden');
    if (topbarAdminBtn) topbarAdminBtn.classList.add('hidden');
  }
}

let authMode = 'login';

function openAuthModal(mode = 'login') {
  authMode = mode;
  const modal = document.getElementById('authModal');
  const title = document.getElementById('authModalTitle');
  const tabLogin = document.getElementById('tabAuthLogin');
  const tabRegister = document.getElementById('tabAuthRegister');
  const nameGroup = document.getElementById('authNameGroup');
  const btnSubmit = document.getElementById('btnAuthSubmit');
  const errorAlert = document.getElementById('authErrorAlert');

  if (!modal) return;
  if (errorAlert) errorAlert.classList.add('hidden');

  if (mode === 'login') {
    title.innerHTML = '<i class="fas fa-user-lock" style="color:var(--accent);"></i> User Login';
    tabLogin.classList.add('active');
    tabLogin.style.color = '#45f3ff';
    tabLogin.style.borderBottom = '2px solid #45f3ff';
    tabRegister.classList.remove('active');
    tabRegister.style.color = '#8e95a5';
    tabRegister.style.borderBottom = 'none';
    nameGroup.classList.add('hidden');
    btnSubmit.textContent = 'Log In';
  } else {
    title.innerHTML = '<i class="fas fa-user-plus" style="color:var(--accent);"></i> Register Account';
    tabRegister.classList.add('active');
    tabRegister.style.color = '#45f3ff';
    tabRegister.style.borderBottom = '2px solid #45f3ff';
    tabLogin.classList.remove('active');
    tabLogin.style.color = '#8e95a5';
    tabLogin.style.borderBottom = 'none';
    nameGroup.classList.remove('hidden');
    btnSubmit.textContent = 'Register & Log In';
  }

  modal.classList.remove('hidden');
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  const userIdInput = document.getElementById('authUserIdInput');
  const passwordInput = document.getElementById('authPasswordInput');
  const nameInput = document.getElementById('authNameInput');
  const btnSubmit = document.getElementById('btnAuthSubmit');
  const errorAlert = document.getElementById('authErrorAlert');

  const userId = userIdInput.value.trim();
  const password = passwordInput.value.trim();
  const name = nameInput ? nameInput.value.trim() : '';

  if (!userId || !password) {
    if (errorAlert) {
      errorAlert.textContent = 'User ID and Password are required.';
      errorAlert.classList.remove('hidden');
    }
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = authMode === 'login' ? 'Logging in...' : 'Registering...';
  if (errorAlert) errorAlert.classList.add('hidden');

  try {
    const apiBase = window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:')
      ? window.location.origin
      : 'http://localhost:5500';

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = { userId, password };
    if (authMode === 'register') payload.name = name || userId;

    let authSuccess = false;
    let authData = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);

      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          authSuccess = true;
          authData = data;
        }
      }
    } catch (e) {
      // Backend offline / unreachable, use local auth fallback
    }

    if (!authSuccess) {
      // Local Auth Fallback
      let localUsers = [];
      try {
        const stored = localStorage.getItem('dk_admin_users_db');
        if (stored) localUsers = JSON.parse(stored);
      } catch (e) {}

      if (authMode === 'login') {
        if (userId === 'admin' && password === 'Qwerty@866') {
          authData = {
            token: 'dk_admin_token_sec_local_' + Date.now(),
            isAdmin: true,
            user: { id: 'admin_01', userId: 'admin', name: 'System Administrator', role: 'admin', status: 'active' }
          };
          authSuccess = true;
        } else {
          const matched = localUsers.find(u => u.userId.toLowerCase() === userId.toLowerCase());
          if (matched) {
            if (matched.status === 'disabled') {
              throw new Error('Account has been disabled by administrator.');
            }
            authData = {
              token: 'dk_user_token_local_' + matched.userId + '_' + Date.now(),
              isAdmin: (matched.role === 'admin'),
              user: matched
            };
            authSuccess = true;
          } else {
            // Allow demo login
            authData = {
              token: 'dk_user_token_local_' + userId + '_' + Date.now(),
              isAdmin: false,
              user: { id: 'usr_' + Date.now(), userId: userId, name: name || userId, role: 'user', status: 'active' }
            };
            authSuccess = true;
          }
        }
      } else {
        // Register mode
        if (userId.toLowerCase() === 'admin') {
          throw new Error("Cannot register reserved User ID 'admin'.");
        }
        if (localUsers.some(u => u.userId.toLowerCase() === userId.toLowerCase())) {
          throw new Error("User ID already exists. Please choose another.");
        }
        const newUser = {
          id: 'usr_' + Date.now(),
          userId: userId,
          name: name || userId,
          role: 'user',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        localUsers.push(newUser);
        localStorage.setItem('dk_admin_users_db', JSON.stringify(localUsers));

        authData = {
          token: 'dk_user_token_local_' + newUser.userId + '_' + Date.now(),
          isAdmin: false,
          user: newUser
        };
        authSuccess = true;
      }
    }

    userAuthToken = authData.token;
    currentUser = authData.user;
    isUserAdmin = !!authData.isAdmin;

    localStorage.setItem('dk_user_token', userAuthToken);
    localStorage.setItem('dk_user_info', JSON.stringify(currentUser));

    updateAuthHeaderUI();
    closeAuthModal();
    showToast(`✓ Welcome ${currentUser.name || currentUser.userId}!`);

  } catch (err) {
    if (errorAlert) {
      errorAlert.textContent = err.message || 'Authentication error';
      errorAlert.classList.remove('hidden');
    }
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = authMode === 'login' ? 'Log In' : 'Register & Log In';
  }
}

function logoutUser() {
  userAuthToken = '';
  currentUser = null;
  isUserAdmin = false;
  localStorage.removeItem('dk_user_token');
  localStorage.removeItem('dk_user_info');
  updateAuthHeaderUI();
  showToast('Logged out successfully.');
}

document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('btnCloseAuthModal')?.addEventListener('click', closeAuthModal);
document.getElementById('tabAuthLogin')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('tabAuthRegister')?.addEventListener('click', () => openAuthModal('register'));
document.getElementById('userAuthForm')?.addEventListener('submit', handleAuthFormSubmit);
document.getElementById('btnUserLogout')?.addEventListener('click', logoutUser);


// ============================================================
// ── MULTILINGUAL VOICE SEARCH SYSTEM ───────────────────────
// ============================================================
let speechRecognizer = null;
let isVoiceSearchActive = false;

function initVoiceSearchEngine() {
  const btnMic = document.getElementById('btnVoiceSearch');
  const overlay = document.getElementById('voiceSearchOverlay');
  const btnStop = document.getElementById('btnStopVoiceSearch');
  const transcriptPreview = document.getElementById('voiceTranscriptPreview');
  const statusText = document.getElementById('voiceLanguageStatus');

  if (!btnMic) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    btnMic.title = 'Voice search not supported in this browser';
    btnMic.addEventListener('click', () => {
      showToast('⚠️ Voice search is not supported in this browser. Please type your search query.');
    });
    return;
  }

  btnMic.addEventListener('click', () => {
    if (isVoiceSearchActive) {
      stopVoiceSearch();
      return;
    }
    startVoiceSearch();
  });

  btnStop?.addEventListener('click', stopVoiceSearch);

  function startVoiceSearch() {
    try {
      speechRecognizer = new SpeechRecognition();
      speechRecognizer.continuous = false;
      speechRecognizer.interimResults = true;

      const userLang = navigator.language || 'ta-IN';
      speechRecognizer.lang = userLang.startsWith('ta') ? 'ta-IN' : (userLang || 'en-US');

      speechRecognizer.onstart = () => {
        isVoiceSearchActive = true;
        btnMic.classList.add('listening');
        if (overlay) overlay.classList.remove('hidden');
        if (statusText) statusText.textContent = `Listening in ${speechRecognizer.lang} (Tamil, English, etc.)`;
        if (transcriptPreview) transcriptPreview.textContent = '"Listening..."';
      };

      speechRecognizer.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        if (transcriptPreview) transcriptPreview.textContent = `"${transcript}"`;

        if (e.results[0].isFinal) {
          executeVoiceQuery(transcript);
        }
      };

      speechRecognizer.onerror = (e) => {
        console.warn('[Voice Search Error]:', e.error);
        if (e.error === 'not-allowed') {
          showToast('⚠️ Microphone permission denied. Please allow microphone access in browser.');
        } else if (e.error !== 'no-speech') {
          showToast('Voice recognition error: ' + e.error);
        }
        stopVoiceSearch();
      };

      speechRecognizer.onend = () => {
        stopVoiceSearch();
      };

      speechRecognizer.start();
    } catch (err) {
      console.error('Failed to start voice recognition:', err);
      showToast('Failed to start voice search');
      stopVoiceSearch();
    }
  }

  function stopVoiceSearch() {
    isVoiceSearchActive = false;
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
      speechRecognizer = null;
    }
    btnMic?.classList.remove('listening');
    if (overlay) overlay.classList.add('hidden');
  }

  function executeVoiceQuery(queryText) {
    const q = queryText.trim();
    if (!q) return;

    showToast(`🎤 Voice Search: "${q}"`);
    if (searchInput) searchInput.value = q;
    navigateTo('search');
    renderSearchSection();
    stopVoiceSearch();
  }
}

// ── Boot Application ────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  updateNetworkStatus();
  setup3D();
  fetchSongs();
  initAuthSystem();
  initVoiceSearchEngine();
  initTamilListeners();
  initAIAssistantSection();
});

// Expose core variables and functions globally
window.songs = songs;
window.currentQueue = currentQueue;
window.currentSongIndex = currentSongIndex;
window.playSong = playSong;
window.togglePlayPause = togglePlayPause;
window.toggleOfflineDownload = toggleOfflineDownload;
window.showToast = showToast;
window.navigateTo = navigateTo;
window.audioEl = audioEl;

