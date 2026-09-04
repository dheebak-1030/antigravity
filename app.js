// ============================================================
// DK MUSIC — ULTRA-MODERN DARK PLAYER & PLAYLIST ENGINE (PRODUCTION)
// ============================================================

// ── Application State ───────────────────────────────────────
let songs = [];
let playlists = [];            // [{ id, name, description, cover, created }]
let playlistSongMap = {};      // { playlistId: Set<songId> }
let likedSongs = new Set();
let recentIds = [];
let currentQueue = [];         // Active playing queue
let currentSongIndex = -1;
let isShuffled = false;
let shuffleQueue = [];
let repeatMode = 0;            // 0 = off, 1 = all, 2 = one
let currentSection = 'home';
let activePlaylistId = null;
let currentAlbumName = null;
let selectedSongForModal = null;
const historyStack = ['home'];
let historyPos = 0;

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
const audioEl           = document.getElementById('audioPlayer');
const btnPlayPause      = document.getElementById('btnPlayPause');
const playIcon          = document.getElementById('playIcon');
const btnPrev           = document.getElementById('btnPrev');
const btnNext           = document.getElementById('btnNext');
const btnShuffle        = document.getElementById('btnShuffle');
const btnRepeat         = document.getElementById('btnRepeat');
const muteIcon          = document.getElementById('muteIcon');
const progressCont      = document.getElementById('progressContainer');
const progressFill      = document.getElementById('progressBar');
const progressThumb     = document.getElementById('progressHandle');
const currentTimeEl     = document.getElementById('currentTime');
const totalTimeEl       = document.getElementById('totalTime');
const volCont           = document.getElementById('volumeContainer');
const volFill           = document.getElementById('volumeBar');
const volThumb          = document.getElementById('volumeHandle');
const npCover           = document.getElementById('npCover');
const npCoverPH         = document.getElementById('npCoverPlaceholder');
const npTitle           = document.getElementById('npTitle');
const npArtist          = document.getElementById('npArtist');
const btnLikeNP         = document.getElementById('btnLikeNowPlaying');
const btnAddNowPlayingToPl = document.getElementById('btnAddNowPlayingToPl');
const searchInput       = document.getElementById('searchInput');
const toastEl           = document.getElementById('toast');
const addToPlaylistModal = document.getElementById('addToPlaylistModal');
const btnCloseModal     = document.getElementById('btnCloseModal');

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
    const subEl  = document.querySelector('.greeting-sub');
    if (!textEl) return;

    let greeting = 'Good Evening 🌆';
    let sub = 'Unwind and relax with your favorite music';

    if (h >= 4 && h < 12) {
        greeting = 'Good Morning ☀️';
        sub = 'Start your day with some energizing tunes';
    } else if (h >= 12 && h < 17) {
        greeting = 'Good Afternoon 🌤️';
        sub = 'Keep up the rhythm and momentum';
    } else if (h >= 17 && h < 21) {
        greeting = 'Good Evening 🌆';
        sub = 'Unwind with your favorite melodies';
    } else {
        greeting = 'Good Night 🌙';
        sub = 'Time to relax with soothing late-night tracks';
    }

    textEl.textContent = greeting;
    if (subEl) subEl.textContent = sub;
}

// Auto update greeting every minute
setInterval(setGreeting, 60000);

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

    if (pushHistory && historyStack[historyPos] !== section) {
        historyStack.splice(historyPos + 1);
        historyStack.push(section);
        historyPos = historyStack.length - 1;
    }

    // Refresh views on navigate
    if (section === 'search') {
        if (searchInput) searchInput.focus();
    } else if (section === 'liked') {
        renderLikedSection();
    } else if (section === 'library') {
        renderLibrarySection('all');
    } else if (section === 'create') {
        renderCreateSection();
    } else if (section === 'home') {
        renderAll();
    }
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

// ── Supabase Data Ingestion ─────────────────────────────────
async function fetchSongs() {
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('songs')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            songs = data || [];
        } else {
            console.warn('supabaseClient not available, checking window.supabase');
            songs = [];
        }
    } catch (err) {
        console.error('fetchSongs error:', err);
        songs = [];
    }
    
    currentQueue = [...songs];
    renderAll();
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
}

// ── Quick Picks ─────────────────────────────────────────────
function renderQuickPicks() {
    const el = document.getElementById('quickPicks');
    if (!el) return;
    const picks = songs.slice(0, 8);
    if (!picks.length) { el.innerHTML = ''; return; }
    
    el.innerHTML = picks.map((song, i) => `
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
        showAlbum: false,
        onPlayList: album.songs
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
        return `
        <div class="song-card" data-song-id="${esc(song.id)}">
            <div class="song-cover-wrapper">
                <img src="${esc(song.cover_url || '')}" alt="${esc(song.title)}" class="song-cover"
                     onerror="this.parentElement.style.background='var(--bg-elevated)'" loading="lazy">
                <button class="song-like-btn ${liked ? 'liked' : ''}" data-song-id="${esc(song.id)}"
                    title="${liked ? 'Unlike' : 'Like'}">
                    <i class="${liked ? 'fas' : 'far'} fa-heart" aria-hidden="true"></i>
                </button>
                <button class="play-overlay" title="Play"><i class="fas fa-play"></i></button>
            </div>
            <div class="song-info">
                <h3 title="${esc(song.title)}">${esc(song.title)}</h3>
                <p>${esc(song.artist)}</p>
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
            currentQueue = [...songs];
            playSong(songIdx);
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
            <span>Add some music to start listening</span>
        </div>`;
        return;
    }

    const { playlistId = null, showAlbum = true } = options;

    container.innerHTML = trackList.map((song, i) => {
        const isPlaying = songs[currentSongIndex]?.id === song.id && !audioEl.paused;
        const isCurrent = songs[currentSongIndex]?.id === song.id;
        const liked = likedSongs.has(song.id);

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
                    <span class="track-artist">${esc(song.artist)}</span>
                </div>
            </div>

            ${showAlbum ? `<div class="track-album" title="${esc(song.album || 'Single')}">${esc(song.album || 'Single')}</div>` : ''}

            <div class="track-actions">
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

    // Update Playlist Hero
    const heroTitle = document.getElementById('plHeroTitle');
    const heroDesc  = document.getElementById('plHeroDesc');
    const heroImg   = document.getElementById('plHeroImg');
    const heroIcon  = document.getElementById('plHeroIcon');
    const trackCount= document.getElementById('plTrackCount');
    const durationEl= document.getElementById('plDuration');

    if (heroTitle) heroTitle.textContent = pl.name;
    if (heroDesc)  heroDesc.textContent = pl.description || 'Custom curated playlist';
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

    // Render Tracklist
    renderTrackRows(plSongs, document.getElementById('plTrackList'), {
        playlistId: pl.id,
        showAlbum: true
    });

    // Wire Action Buttons
    const btnPlayPlaylist = document.getElementById('btnPlayPlaylist');
    if (btnPlayPlaylist) {
        btnPlayPlaylist.onclick = () => {
            playPlaylist(pl.id);
        };
    }

    const btnShufflePlaylist = document.getElementById('btnShufflePlaylist');
    if (btnShufflePlaylist) {
        btnShufflePlaylist.onclick = () => {
            playPlaylist(pl.id, true);
        };
    }

    const btnAddSongsToPl = document.getElementById('btnAddSongsToPl');
    if (btnAddSongsToPl) {
        btnAddSongsToPl.onclick = () => {
            editPlaylist(pl.id);
        };
    }

    const btnEditPlaylist = document.getElementById('btnEditPlaylist');
    if (btnEditPlaylist) {
        btnEditPlaylist.onclick = () => {
            editPlaylist(pl.id);
        };
    }

    const btnDeletePlaylist = document.getElementById('btnDeletePlaylist');
    if (btnDeletePlaylist) {
        btnDeletePlaylist.onclick = () => {
            deletePlaylist(pl.id);
        };
    }

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

    // Re-render playlist view
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
        list.innerHTML = `<div class="empty-state"><i class="fas fa-music"></i><p>No songs available in database</p></div>`;
        return;
    }

    list.innerHTML = songs.map((song, i) => {
        const inPl = plSet && plSet.has(song.id);
        return `
        <div class="track-row picker-row" data-song-id="${esc(song.id)}" data-idx="${i}">
            <div class="track-num-wrap">
                <span class="track-num">${i + 1}</span>
            </div>
            <div class="track-info" style="cursor:pointer;">
                <img src="${esc(song.cover_url || '')}" alt="" class="track-thumb" loading="lazy"
                     onerror="this.style.display='none'">
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

            // Auto-create playlist if name is typed but not saved yet
            if (!currentPlId) {
                const nameInput = document.getElementById('playlistName');
                const name = nameInput?.value.trim() || 'My Playlist';
                const newId = uid();
                const newPl = {
                    id: newId,
                    name,
                    description: document.getElementById('playlistDesc')?.value.trim() || '',
                    cover: null,
                    created: Date.now()
                };
                playlists.push(newPl);
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

// Save / Update Playlist Button
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

    // New Playlist
    const newId = uid();
    const newPl = {
        id: newId,
        name,
        description: desc,
        cover: null,
        created: Date.now()
    };

    playlists.push(newPl);
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

btnAddNowPlayingToPl?.addEventListener('click', () => {
    const currentSong = songs[currentSongIndex];
    if (currentSong) openAddToPlaylistModal(currentSong.id);
});

// ── Liked Songs Section ─────────────────────────────────────
let likedSearchQuery = '';
let likedSortOption = 'recent';

function renderLikedSection() {
    const list = document.getElementById('likedList');
    if (!list) return;

    const likedItemsRaw = songs.filter(s => likedSongs.has(s.id));
    const totalSecs = likedItemsRaw.reduce((acc, s) => acc + (s.duration || 180), 0);

    // Calculate Top Artist
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

    // Update Stats Chips & Hero
    const statDuration = document.getElementById('likedStatDuration');
    const statArtist   = document.getElementById('likedStatArtist');
    const heroSub      = document.getElementById('likedHeroSub');

    if (statDuration) statDuration.innerHTML = `<i class="fas fa-clock"></i> ${fmtDurationLong(totalSecs)}`;
    if (statArtist)   statArtist.innerHTML   = `<i class="fas fa-music"></i> Top Artist: ${esc(topArtist)}`;
    if (heroSub)      heroSub.textContent   = `${likedItemsRaw.length} ${likedItemsRaw.length === 1 ? 'song' : 'songs'} • Saved to your favorites`;

    // Filter by search query
    let filtered = likedItemsRaw;
    if (likedSearchQuery) {
        filtered = filtered.filter(s =>
            s.title.toLowerCase().includes(likedSearchQuery) ||
            s.artist.toLowerCase().includes(likedSearchQuery) ||
            (s.album && s.album.toLowerCase().includes(likedSearchQuery))
        );
    }

    // Sort items
    if (likedSortOption === 'title') {
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else if (likedSortOption === 'artist') {
        filtered = [...filtered].sort((a, b) => a.artist.localeCompare(b.artist));
    } else if (likedSortOption === 'duration') {
        filtered = [...filtered].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }

    // Render list or custom interactive empty state
    if (!filtered.length) {
        if (likedSearchQuery) {
            list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-magnifying-glass"></i>
                <p>No liked tracks match "${esc(likedSearchQuery)}"</p>
                <span>Try a different search keyword</span>
            </div>`;
        } else {
            list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart" style="color:var(--accent-liked);opacity:0.8;"></i>
                <p>Songs you like will appear here</p>
                <span>Save any track by clicking the heart icon anywhere in the app</span>
                <button class="btn-primary" style="margin-top:16px;" id="btnLikedDiscover">
                    <i class="fas fa-compass"></i> Discover Music
                </button>
            </div>`;
            document.getElementById('btnLikedDiscover')?.addEventListener('click', () => navigateTo('home'));
        }
    } else {
        renderTrackRows(filtered, list, { showAlbum: true });
    }

    // Wire Play & Shuffle Liked
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

    // Save as Playlist Button
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
            showToast(`🎉 Playlist "${newPlName}" created with ${likedItemsRaw.length} songs!`);
            openPlaylist(newId);
        };
    }
}

// Liked Songs Toolbar Listeners
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

    // Update UI elements
    document.querySelectorAll(`.song-like-btn[data-song-id="${songId}"], .track-like-btn[data-song-id="${songId}"]`).forEach(btn => {
        btn.classList.toggle('liked', likedSongs.has(songId));
        const icon = btn.querySelector('i');
        if (icon) icon.className = `${likedSongs.has(songId) ? 'fas' : 'far'} fa-heart`;
    });

    updateNowPlayingLikeBtn();

    if (currentSection === 'liked') renderLikedSection();
}

function updateNowPlayingLikeBtn() {
    const currentSong = songs[currentSongIndex];
    if (!currentSong || !btnLikeNP) return;
    const isLiked = likedSongs.has(currentSong.id);
    btnLikeNP.classList.toggle('liked', isLiked);
    btnLikeNP.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>`;
}

btnLikeNP?.addEventListener('click', () => {
    const currentSong = songs[currentSongIndex];
    if (currentSong) toggleLike(currentSong.id);
});

// ── Library Section ─────────────────────────────────────────
function renderLibrarySection(filter = 'all') {
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;

    // Filter Chips UI
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

    let items = [];
    if (filter === 'all') items = [likedCard, ...playlistCards, ...albumCards];
    else if (filter === 'playlists') items = [likedCard, ...playlistCards];
    else if (filter === 'albums') items = albumCards;

    if (!items.length) {
        grid.innerHTML = `<div class="empty-state"><i class="fas fa-layer-group"></i><p>No items in this filter</p></div>`;
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
}

document.querySelectorAll('#libraryFilterRow .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => renderLibrarySection(chip.dataset.filter));
});

// ── Audio Playback Core Engine ──────────────────────────────
function playSong(idx) {
    if (!currentQueue.length) return;
    if (idx < 0) idx = 0;
    if (idx >= currentQueue.length) idx = 0;

    currentSongIndex = idx;
    const song = currentQueue[idx];
    if (!song) return;

    audioEl.src = song.file_url;
    audioEl.play().catch(e => console.log('Audio playback prevented:', e));

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

    if (playIcon) playIcon.className = 'fas fa-pause';
    updateNowPlayingLikeBtn();
    addToRecent(song.id);

    // Update playing track rows across sections
    document.querySelectorAll('.track-row').forEach(row => {
        const isThis = row.dataset.songId === song.id;
        row.classList.toggle('playing', isThis);
    });
}

function togglePlayPause() {
    if (!audioEl.src && songs.length) {
        currentQueue = [...songs];
        playSong(0);
        return;
    }

    if (audioEl.paused) {
        audioEl.play().then(() => {
            if (playIcon) playIcon.className = 'fas fa-pause';
        }).catch(console.error);
    } else {
        audioEl.pause();
        if (playIcon) playIcon.className = 'fas fa-play';
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
    btnRepeat.classList.toggle('active', repeatMode > 0);
    const icon = btnRepeat.querySelector('i');
    if (icon) {
        icon.className = repeatMode === 2 ? 'fas fa-repeat-1' : 'fas fa-repeat';
    }
    showToast(['Repeat Off', '🔁 Repeat All', '🔂 Repeat One'][repeatMode]);
});

// Progress Bar & Time
audioEl.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audioEl;
    if (duration && !isNaN(duration)) {
        const pct = (currentTime / duration) * 100;
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressThumb) progressThumb.style.left = `${pct}%`;
        if (currentTimeEl) currentTimeEl.textContent = fmt(currentTime);
        if (totalTimeEl) totalTimeEl.textContent = fmt(duration);
    }
});

audioEl.addEventListener('loadedmetadata', () => {
    if (totalTimeEl) totalTimeEl.textContent = fmt(audioEl.duration);
});

let isSeeking = false;
function seek(e) {
    if (!progressCont || !audioEl.duration) return;
    const rect = progressCont.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioEl.currentTime = pct * audioEl.duration;
}

progressCont?.addEventListener('click', seek);
progressCont?.addEventListener('mousedown', () => { isSeeking = true; });
document.addEventListener('mousemove', e => { if (isSeeking) seek(e); });
document.addEventListener('mouseup', () => { isSeeking = false; });

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

// Set initial volume
setVolume(0.8);

// ── Search Engine ───────────────────────────────────────────
searchInput?.addEventListener('input', e => {
    const query = e.target.value.toLowerCase().trim();
    if (query) {
        if (currentSection !== 'search') navigateTo('search');
        const filtered = songs.filter(s =>
            s.title.toLowerCase().includes(query) ||
            s.artist.toLowerCase().includes(query) ||
            (s.album && s.album.toLowerCase().includes(query))
        );
        renderSongGrid(filtered, 'searchGrid');
    } else if (currentSection === 'search') {
        const grid = document.getElementById('searchGrid');
        if (grid) {
            grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-magnifying-glass"></i>
                <p>Start typing above to search songs, albums, and artists</p>
            </div>`;
        }
    }
});

// See All Albums Links
document.getElementById('seeAllAlbums')?.addEventListener('click', e => {
    e.preventDefault();
    navigateTo('library');
    renderLibrarySection('albums');
});

document.getElementById('seeAllRecent')?.addEventListener('click', e => {
    e.preventDefault();
    navigateTo('library');
    renderLibrarySection('all');
});

// Keyboard Shortcuts
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

// ── Boot Application ────────────────────────────────────────
fetchSongs();
