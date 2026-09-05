// ============================================================
// DK MUSIC — ADMIN DASHBOARD CONTROLLER (ROBUST HYBRID ENGINE)
// Supports Admin Auth (Qwerty@866), User CRUD, Playlist CRUD,
// Track Reordering, Song Catalog CRUD, Offline Metadata & Search
// Dual Mode: Seamless REST API with Automatic Offline/Local Fallback
// ============================================================

const API_BASE = window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file:') 
    ? window.location.origin 
    : 'http://localhost:5500';

let adminToken = sessionStorage.getItem('dk_admin_token') || '';

// Global State
let usersData = [];
let playlistsData = [];
let songsData = [];
let activeEditingPlaylist = null;
let isServerOnline = false;

// DOM Elements
const adminLoginGate = document.getElementById('adminLoginGate');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminGatePassword = document.getElementById('adminGatePassword');
const adminGateError = document.getElementById('adminGateError');
const btnAdminLogout = document.getElementById('btnAdminLogout');
const adminGlobalSearch = document.getElementById('adminGlobalSearch');
const adminToast = document.getElementById('adminToast');

// Navigation Tabs
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-content-panel');

// Toast Feedback Helper
function showAdminToast(message, isError = false) {
    if (!adminToast) return;
    adminToast.textContent = message;
    adminToast.className = 'admin-toast ' + (isError ? 'error' : 'success');
    adminToast.style.display = 'block';
    setTimeout(() => {
        adminToast.style.display = 'none';
    }, 3500);
}

// REST API Helper with Authorization & Graceful Fallback
async function adminFetch(endpoint, method = 'GET', body = null) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const res = await fetch(`${API_BASE}${endpoint}`, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
                isServerOnline = true;
                return data;
            }
        }
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        // Fallback to local storage engine
        return executeLocalFallback(endpoint, method, body);
    }
}

// ── LOCAL STORAGE ENGINE FALLBACK ─────────────────────────────

function getLocalUsers() {
    const stored = localStorage.getItem('dk_admin_users_db');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
    }
    const defaultUsers = [
        {
            id: "usr_demo1",
            userId: "user1",
            passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            name: "Demo Listener",
            role: "user",
            status: "active",
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('dk_admin_users_db', JSON.stringify(defaultUsers));
    return defaultUsers;
}

function saveLocalUsers(users) {
    localStorage.setItem('dk_admin_users_db', JSON.stringify(users));
}

function getLocalSongs() {
    const stored = localStorage.getItem('dk_admin_songs_db');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
    }
    
    // Fallback to window.DK_MusicData
    let initialCatalog = [];
    if (window.DK_MusicData && Array.isArray(window.DK_MusicData.catalog)) {
        initialCatalog = window.DK_MusicData.catalog.map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album || s.movie || "Single",
            cover_url: s.cover_url,
            audio_url: s.file_url,
            file_url: s.file_url,
            downloadable: true,
            createdAt: new Date().toISOString()
        }));
    }
    localStorage.setItem('dk_admin_songs_db', JSON.stringify(initialCatalog));
    return initialCatalog;
}

function saveLocalSongs(songs) {
    localStorage.setItem('dk_admin_songs_db', JSON.stringify(songs));
}

function getLocalPlaylists() {
    const stored = localStorage.getItem('dk_admin_playlists_db');
    if (stored) {
        try { return JSON.parse(stored); } catch (e) {}
    }
    
    let initialPlaylists = [];
    if (window.DK_MusicData && Array.isArray(window.DK_MusicData.premadePlaylists)) {
        initialPlaylists = window.DK_MusicData.premadePlaylists.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            cover: p.cover,
            songs: p.songs || [],
            created: new Date().toISOString(),
            createdBy: "admin"
        }));
    }
    localStorage.setItem('dk_admin_playlists_db', JSON.stringify(initialPlaylists));
    return initialPlaylists;
}

function saveLocalPlaylists(playlists) {
    localStorage.setItem('dk_admin_playlists_db', JSON.stringify(playlists));
}

function executeLocalFallback(endpoint, method, body) {
    // Users
    if (endpoint === '/api/admin/users') {
        const users = getLocalUsers();
        if (method === 'GET') {
            return { success: true, users };
        } else if (method === 'POST') {
            if (users.some(u => u.userId === body.userId)) {
                throw new Error("User ID already exists.");
            }
            const newUser = {
                id: "usr_" + Date.now(),
                userId: body.userId,
                name: body.name || body.userId,
                role: body.role || "user",
                status: body.status || "active",
                createdAt: new Date().toISOString()
            };
            users.push(newUser);
            saveLocalUsers(users);
            return { success: true, message: "User created successfully.", user: newUser };
        } else if (method === 'PUT') {
            const idx = users.findIndex(u => u.id === body.id || u.userId === body.userId);
            if (idx === -1) throw new Error("User not found.");
            if (body.name) users[idx].name = body.name;
            if (body.role) users[idx].role = body.role;
            if (body.status) users[idx].status = body.status;
            saveLocalUsers(users);
            return { success: true, message: "User updated successfully." };
        } else if (method === 'DELETE') {
            const filtered = users.filter(u => u.id !== body.id && u.userId !== body.userId);
            saveLocalUsers(filtered);
            return { success: true, message: "User deleted successfully." };
        }
    }

    // Playlists
    if (endpoint === '/api/admin/playlists') {
        const pls = getLocalPlaylists();
        if (method === 'GET') {
            return { success: true, playlists: pls };
        } else if (method === 'POST') {
            const newPl = {
                id: "pl_" + Date.now(),
                name: body.name,
                description: body.description || "",
                cover: body.cover || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500",
                songs: body.songs || [],
                created: new Date().toISOString(),
                createdBy: "admin"
            };
            pls.push(newPl);
            saveLocalPlaylists(pls);
            return { success: true, message: "Playlist created successfully.", playlist: newPl };
        } else if (method === 'PUT') {
            const idx = pls.findIndex(p => p.id === body.id);
            if (idx === -1) throw new Error("Playlist not found.");
            if (body.name) pls[idx].name = body.name;
            if (body.description !== undefined) pls[idx].description = body.description;
            if (body.cover) pls[idx].cover = body.cover;
            if (body.songs !== undefined) pls[idx].songs = body.songs;
            saveLocalPlaylists(pls);
            return { success: true, message: "Playlist updated successfully." };
        } else if (method === 'DELETE') {
            const filtered = pls.filter(p => p.id !== body.id);
            saveLocalPlaylists(filtered);
            return { success: true, message: "Playlist deleted successfully." };
        }
    }

    // Songs
    if (endpoint === '/api/admin/songs') {
        const sngs = getLocalSongs();
        if (method === 'GET') {
            return { success: true, songs: sngs };
        } else if (method === 'POST') {
            const newSong = {
                id: "song_" + Date.now(),
                title: body.title,
                artist: body.artist,
                album: body.album || "Single",
                cover_url: body.cover_url || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500",
                audio_url: body.audio_url,
                file_url: body.audio_url,
                downloadable: body.downloadable !== undefined ? body.downloadable : true,
                createdAt: new Date().toISOString()
            };
            sngs.push(newSong);
            saveLocalSongs(sngs);
            return { success: true, message: "Song added successfully.", song: newSong };
        } else if (method === 'PUT') {
            const idx = sngs.findIndex(s => s.id === body.id);
            if (idx === -1) throw new Error("Song not found.");
            if (body.title) sngs[idx].title = body.title;
            if (body.artist) sngs[idx].artist = body.artist;
            if (body.album) sngs[idx].album = body.album;
            if (body.cover_url) sngs[idx].cover_url = body.cover_url;
            if (body.audio_url) { sngs[idx].audio_url = body.audio_url; sngs[idx].file_url = body.audio_url; }
            if (body.downloadable !== undefined) sngs[idx].downloadable = body.downloadable;
            saveLocalSongs(sngs);
            return { success: true, message: "Song updated successfully." };
        } else if (method === 'DELETE') {
            const filtered = sngs.filter(s => s.id !== body.id);
            saveLocalSongs(filtered);
            return { success: true, message: "Song deleted successfully." };
        }
    }

    return { success: true };
}

// ── AUTH GATE INITIALIZATION ─────────────────────────────────

function checkAdminAuth() {
    if (adminToken && adminToken.startsWith('dk_admin_token_sec_')) {
        adminLoginGate.style.display = 'none';
        loadDashboardData();
    } else {
        adminLoginGate.style.display = 'flex';
    }
}

adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminGateError.style.display = 'none';
    const pwd = adminGatePassword.value.trim();

    // 1. Check if backend is available
    let authenticated = false;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500);

        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'admin', password: pwd }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.success && data.token && data.isAdmin) {
                adminToken = data.token;
                authenticated = true;
            }
        }
    } catch (err) {
        // Backend not reachable; use fallback validation
    }

    // 2. Direct Admin Password Verification (Qwerty@866)
    if (!authenticated) {
        if (pwd === 'Qwerty@866') {
            adminToken = 'dk_admin_token_sec_local_' + Date.now();
            authenticated = true;
        }
    }

    if (authenticated) {
        sessionStorage.setItem('dk_admin_token', adminToken);
        adminLoginGate.style.display = 'none';
        showAdminToast('✓ Admin authentication successful! Access granted.');
        loadDashboardData();
    } else {
        adminGateError.textContent = '❌ Invalid Admin Password. Please try again.';
        adminGateError.style.display = 'block';
    }
});

btnAdminLogout.addEventListener('click', () => {
    sessionStorage.removeItem('dk_admin_token');
    adminToken = '';
    checkAdminAuth();
});

// Tab Switcher
tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const activePanel = document.getElementById(`tab-${tabId}`);
        if (activePanel) activePanel.classList.add('active');
    });
});

// Global Dashboard Data Loader
async function loadDashboardData() {
    try {
        await Promise.all([
            fetchUsers(),
            fetchPlaylists(),
            fetchSongs()
        ]);
        renderOfflineMetadata();
    } catch (err) {
        showAdminToast('Failed to load dashboard data: ' + err.message, true);
    }
}

// ── 1. USERS MANAGEMENT ─────────────────────────────────────

const userCountEl = document.getElementById('userCount');
const userTableBody = document.getElementById('userTableBody');
const userFormCard = document.getElementById('userFormCard');
const userAdminForm = document.getElementById('userAdminForm');
const userEditId = document.getElementById('userEditId');
const userFormUserId = document.getElementById('userFormUserId');
const userFormName = document.getElementById('userFormName');
const userFormPassword = document.getElementById('userFormPassword');
const userFormRole = document.getElementById('userFormRole');
const userFormStatus = document.getElementById('userFormStatus');
const userFormTitle = document.getElementById('userFormTitle');

document.getElementById('btnOpenAddUser')?.addEventListener('click', () => {
    userAdminForm.reset();
    userEditId.value = '';
    userFormUserId.readOnly = false;
    userFormTitle.textContent = 'Create New User Account';
    userFormCard.style.display = 'block';
    userFormCard.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btnCancelUser')?.addEventListener('click', () => {
    userFormCard.style.display = 'none';
});

async function fetchUsers() {
    try {
        const data = await adminFetch('/api/admin/users');
        usersData = data.users || [];
        renderUsersTable(usersData);
    } catch (err) {
        console.error('Fetch users error:', err);
    }
}

function renderUsersTable(users) {
    if (userCountEl) userCountEl.textContent = users.length;
    if (!userTableBody) return;
    userTableBody.innerHTML = '';

    if (users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color:#8e95a5;">No users registered yet.</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        const isDis = u.status === 'disabled';
        tr.innerHTML = `
            <td><strong>${u.userId}</strong></td>
            <td>${u.name || '-'}</td>
            <td><span class="badge-status badge-role">${u.role || 'user'}</span></td>
            <td><span class="badge-status ${isDis ? 'badge-disabled' : 'badge-active'}">${u.status || 'active'}</span></td>
            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
            <td>
                <button class="btn-action-sm btn-edit" onclick="window.editUser('${u.id || u.userId}')"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-action-sm btn-disable" onclick="window.toggleDisableUser('${u.id || u.userId}', ${!isDis})">${isDis ? 'Enable' : 'Disable'}</button>
                <button class="btn-action-sm btn-delete" onclick="window.deleteUser('${u.id || u.userId}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        userTableBody.appendChild(tr);
    });
}

userAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = userEditId.value;
    const body = {
        userId: userFormUserId.value.trim(),
        name: userFormName.value.trim(),
        role: userFormRole.value,
        status: userFormStatus.value
    };

    if (userFormPassword.value.trim()) {
        body.password = userFormPassword.value.trim();
    }

    try {
        if (id) {
            body.id = id;
            await adminFetch('/api/admin/users', 'PUT', body);
            showAdminToast(`✓ User '${body.userId}' updated successfully!`);
        } else {
            if (!body.password) {
                showAdminToast('Password is required for new user creation.', true);
                return;
            }
            await adminFetch('/api/admin/users', 'POST', body);
            showAdminToast(`✓ User '${body.userId}' created successfully!`);
        }
        userFormCard.style.display = 'none';
        await fetchUsers();
    } catch (err) {
        showAdminToast('User save failed: ' + err.message, true);
    }
});

window.editUser = function(userIdOrId) {
    const user = usersData.find(u => u.id === userIdOrId || u.userId === userIdOrId);
    if (!user) return;

    userEditId.value = user.id || user.userId;
    userFormUserId.value = user.userId;
    userFormUserId.readOnly = true;
    userFormName.value = user.name || '';
    userFormPassword.value = '';
    userFormRole.value = user.role || 'user';
    userFormStatus.value = user.status || 'active';
    userFormTitle.textContent = `Edit User: ${user.userId}`;
    userFormCard.style.display = 'block';
    userFormCard.scrollIntoView({ behavior: 'smooth' });
};

window.toggleDisableUser = async function(userIdOrId, disable) {
    const user = usersData.find(u => u.id === userIdOrId || u.userId === userIdOrId);
    if (!user) return;

    try {
        await adminFetch('/api/admin/users', 'PUT', {
            id: user.id || user.userId,
            userId: user.userId,
            status: disable ? 'disabled' : 'active'
        });
        showAdminToast(`User '${user.userId}' ${disable ? 'disabled' : 'enabled'}!`);
        await fetchUsers();
    } catch (err) {
        showAdminToast('Failed to change user status: ' + err.message, true);
    }
};

window.deleteUser = async function(userIdOrId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await adminFetch('/api/admin/users', 'DELETE', { id: userIdOrId, userId: userIdOrId });
        showAdminToast('User account deleted.');
        await fetchUsers();
    } catch (err) {
        showAdminToast('Failed to delete user: ' + err.message, true);
    }
};

// ── 2. PLAYLISTS MANAGEMENT ─────────────────────────────────

const playlistTableBody = document.getElementById('playlistTableBody');
const playlistFormCard = document.getElementById('playlistFormCard');
const playlistAdminForm = document.getElementById('playlistAdminForm');
const playlistEditId = document.getElementById('playlistEditId');
const plFormName = document.getElementById('plFormName');
const plFormDesc = document.getElementById('plFormDesc');
const plFormCover = document.getElementById('plFormCover');

const playlistTracksEditor = document.getElementById('playlistTracksEditor');
const editorPlaylistName = document.getElementById('editorPlaylistName');
const selectSongToAdd = document.getElementById('selectSongToAdd');
const playlistTracksTableBody = document.getElementById('playlistTracksTableBody');

document.getElementById('btnOpenAddPlaylist')?.addEventListener('click', () => {
    playlistAdminForm.reset();
    playlistEditId.value = '';
    document.getElementById('playlistFormTitle').textContent = 'Create New Playlist';
    playlistFormCard.style.display = 'block';
    playlistFormCard.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btnCancelPlaylist')?.addEventListener('click', () => {
    playlistFormCard.style.display = 'none';
});

async function fetchPlaylists() {
    try {
        const data = await adminFetch('/api/admin/playlists');
        playlistsData = data.playlists || [];
        renderPlaylistsTable(playlistsData);
    } catch (err) {
        console.error('Fetch playlists error:', err);
    }
}

function renderPlaylistsTable(playlists) {
    if (!playlistTableBody) return;
    playlistTableBody.innerHTML = '';
    if (playlists.length === 0) {
        playlistTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color:#8e95a5;">No playlists available.</td></tr>';
        return;
    }

    playlists.forEach(pl => {
        const count = pl.songs ? pl.songs.length : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${pl.cover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'}" alt="Cover" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
            </td>
            <td><strong>${pl.name}</strong></td>
            <td>${pl.description || '-'}</td>
            <td><span class="badge-status badge-role">${count} tracks</span></td>
            <td>
                <button class="btn-action-sm btn-edit" onclick="window.openPlaylistTracksEditor('${pl.id}')"><i class="fas fa-sliders"></i> Manage Tracks</button>
                <button class="btn-action-sm btn-edit" onclick="window.editPlaylistMetadata('${pl.id}')"><i class="fas fa-pen"></i></button>
                <button class="btn-action-sm btn-delete" onclick="window.deletePlaylist('${pl.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        playlistTableBody.appendChild(tr);
    });
}

playlistAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = playlistEditId.value;
    const body = {
        name: plFormName.value.trim(),
        description: plFormDesc.value.trim(),
        cover: plFormCover.value.trim()
    };

    try {
        if (id) {
            body.id = id;
            await adminFetch('/api/admin/playlists', 'PUT', body);
            showAdminToast(`✓ Playlist '${body.name}' updated!`);
        } else {
            await adminFetch('/api/admin/playlists', 'POST', body);
            showAdminToast(`✓ Playlist '${body.name}' created!`);
        }
        playlistFormCard.style.display = 'none';
        await fetchPlaylists();
    } catch (err) {
        showAdminToast('Failed to save playlist: ' + err.message, true);
    }
});

window.editPlaylistMetadata = function(id) {
    const pl = playlistsData.find(p => p.id === id);
    if (!pl) return;
    playlistEditId.value = pl.id;
    plFormName.value = pl.name;
    plFormDesc.value = pl.description || '';
    plFormCover.value = pl.cover || '';
    document.getElementById('playlistFormTitle').textContent = 'Edit Playlist Details';
    playlistFormCard.style.display = 'block';
    playlistFormCard.scrollIntoView({ behavior: 'smooth' });
};

window.deletePlaylist = async function(id) {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    try {
        await adminFetch('/api/admin/playlists', 'DELETE', { id });
        showAdminToast('Playlist deleted.');
        await fetchPlaylists();
    } catch (err) {
        showAdminToast('Failed to delete playlist: ' + err.message, true);
    }
};

// --- Playlist Tracks & Reordering Editor ---
window.openPlaylistTracksEditor = function(plId) {
    activeEditingPlaylist = playlistsData.find(p => p.id === plId);
    if (!activeEditingPlaylist) return;

    editorPlaylistName.textContent = activeEditingPlaylist.name;
    renderSongSelectOptions();
    renderPlaylistTracksTable();
    playlistTracksEditor.style.display = 'block';
    playlistTracksEditor.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById('btnCloseTracksEditor')?.addEventListener('click', () => {
    playlistTracksEditor.style.display = 'none';
    activeEditingPlaylist = null;
});

function renderSongSelectOptions() {
    if (!selectSongToAdd) return;
    selectSongToAdd.innerHTML = '<option value="">-- Select Song to Add --</option>';
    songsData.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.title} — ${s.artist}`;
        selectSongToAdd.appendChild(opt);
    });
}

function renderPlaylistTracksTable() {
    if (!activeEditingPlaylist || !playlistTracksTableBody) return;
    playlistTracksTableBody.innerHTML = '';
    const songIds = activeEditingPlaylist.songs || [];

    if (songIds.length === 0) {
        playlistTracksTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#8e95a5;">No songs in this playlist yet.</td></tr>';
        return;
    }

    songIds.forEach((sid, idx) => {
        const songObj = songsData.find(s => s.id === sid) || { title: sid, artist: 'Custom Track' };
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td>${songObj.title}</td>
            <td>${songObj.artist}</td>
            <td>
                <button class="btn-action-sm btn-reorder" onclick="window.moveTrackInPlaylist(${idx}, -1)" ${idx === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up"></i></button>
                <button class="btn-action-sm btn-reorder" onclick="window.moveTrackInPlaylist(${idx}, 1)" ${idx === songIds.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down"></i></button>
            </td>
            <td>
                <button class="btn-action-sm btn-delete" onclick="window.removeTrackFromPlaylist(${idx})"><i class="fas fa-trash"></i> Remove</button>
            </td>
        `;
        playlistTracksTableBody.appendChild(tr);
    });
}

document.getElementById('btnAddSongToCurrentPlaylist')?.addEventListener('click', async () => {
    if (!activeEditingPlaylist) return;
    const songId = selectSongToAdd.value;
    if (!songId) {
        showAdminToast('Please select a song to add.', true);
        return;
    }

    const songs = activeEditingPlaylist.songs ? [...activeEditingPlaylist.songs] : [];
    songs.push(songId);

    try {
        await adminFetch('/api/admin/playlists', 'PUT', { id: activeEditingPlaylist.id, songs });
        activeEditingPlaylist.songs = songs;
        showAdminToast('✓ Track added to playlist!');
        renderPlaylistTracksTable();
        await fetchPlaylists();
    } catch (err) {
        showAdminToast('Failed to add track: ' + err.message, true);
    }
});

window.moveTrackInPlaylist = async function(idx, direction) {
    if (!activeEditingPlaylist) return;
    const songs = [...(activeEditingPlaylist.songs || [])];
    const targetIdx = idx + direction;

    if (targetIdx < 0 || targetIdx >= songs.length) return;

    // Swap elements
    const temp = songs[idx];
    songs[idx] = songs[targetIdx];
    songs[targetIdx] = temp;

    try {
        await adminFetch('/api/admin/playlists', 'PUT', { id: activeEditingPlaylist.id, songs });
        activeEditingPlaylist.songs = songs;
        showAdminToast('✓ Track reordered!');
        renderPlaylistTracksTable();
        await fetchPlaylists();
    } catch (err) {
        showAdminToast('Failed to reorder track: ' + err.message, true);
    }
};

window.removeTrackFromPlaylist = async function(idx) {
    if (!activeEditingPlaylist) return;
    const songs = [...(activeEditingPlaylist.songs || [])];
    songs.splice(idx, 1);

    try {
        await adminFetch('/api/admin/playlists', 'PUT', { id: activeEditingPlaylist.id, songs });
        activeEditingPlaylist.songs = songs;
        showAdminToast('Track removed from playlist.');
        renderPlaylistTracksTable();
        await fetchPlaylists();
    } catch (err) {
        showAdminToast('Failed to remove track: ' + err.message, true);
    }
};

// ── 3. SONGS CATALOG MANAGEMENT ─────────────────────────────

const songTableBody = document.getElementById('songTableBody');
const songFormCard = document.getElementById('songFormCard');
const songAdminForm = document.getElementById('songAdminForm');
const songEditId = document.getElementById('songEditId');
const songFormTitleInput = document.getElementById('songFormTitleInput');
const songFormArtist = document.getElementById('songFormArtist');
const songFormAlbum = document.getElementById('songFormAlbum');
const songFormCover = document.getElementById('songFormCover');
const songFormAudio = document.getElementById('songFormAudio');
const songFormDownloadable = document.getElementById('songFormDownloadable');

document.getElementById('btnOpenAddSong')?.addEventListener('click', () => {
    songAdminForm.reset();
    songEditId.value = '';
    document.getElementById('songFormTitle').textContent = 'Add New Song to Catalog';
    songFormCard.style.display = 'block';
    songFormCard.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btnCancelSong')?.addEventListener('click', () => {
    songFormCard.style.display = 'none';
});

async function fetchSongs() {
    try {
        const data = await adminFetch('/api/admin/songs');
        songsData = data.songs || [];
        renderSongsTable(songsData);
        renderOfflineMetadata();
        renderSongSelectOptions();
    } catch (err) {
        console.error('Fetch songs error:', err);
    }
}

function renderSongsTable(songs) {
    if (!songTableBody) return;
    songTableBody.innerHTML = '';
    if (songs.length === 0) {
        songTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color:#8e95a5;">No songs in catalog.</td></tr>';
        return;
    }

    songs.forEach(s => {
        const isDl = s.downloadable !== false;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${s.cover_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500'}" alt="Cover" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
            </td>
            <td><strong>${s.title}</strong></td>
            <td>${s.artist}</td>
            <td>${s.album || 'Single'}</td>
            <td><span class="badge-status ${isDl ? 'badge-active' : 'badge-disabled'}">${isDl ? 'Allowed' : 'Restricted'}</span></td>
            <td>
                <button class="btn-action-sm btn-edit" onclick="window.editSong('${s.id}')"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-action-sm btn-delete" onclick="window.deleteSong('${s.id}')"><i class="fas fa-trash"></i></button>
            </td>
        `;
        songTableBody.appendChild(tr);
    });
}

songAdminForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = songEditId.value;
    const body = {
        title: songFormTitleInput.value.trim(),
        artist: songFormArtist.value.trim(),
        album: songFormAlbum.value.trim(),
        cover_url: songFormCover.value.trim(),
        audio_url: songFormAudio.value.trim(),
        downloadable: songFormDownloadable.value === 'true'
    };

    try {
        if (id) {
            body.id = id;
            await adminFetch('/api/admin/songs', 'PUT', body);
            showAdminToast(`✓ Song '${body.title}' updated!`);
        } else {
            await adminFetch('/api/admin/songs', 'POST', body);
            showAdminToast(`✓ Song '${body.title}' added!`);
        }
        songFormCard.style.display = 'none';
        await fetchSongs();
    } catch (err) {
        showAdminToast('Failed to save song: ' + err.message, true);
    }
});

window.editSong = function(id) {
    const s = songsData.find(item => item.id === id);
    if (!s) return;

    songEditId.value = s.id;
    songFormTitleInput.value = s.title;
    songFormArtist.value = s.artist;
    songFormAlbum.value = s.album || '';
    songFormCover.value = s.cover_url || '';
    songFormAudio.value = s.audio_url || s.file_url || '';
    songFormDownloadable.value = s.downloadable !== false ? 'true' : 'false';
    document.getElementById('songFormTitle').textContent = 'Edit Song Details';
    songFormCard.style.display = 'block';
    songFormCard.scrollIntoView({ behavior: 'smooth' });
};

window.deleteSong = async function(id) {
    if (!confirm('Are you sure you want to delete this song from catalog?')) return;
    try {
        await adminFetch('/api/admin/songs', 'DELETE', { id });
        showAdminToast('Song deleted from catalog.');
        await fetchSongs();
    } catch (err) {
        showAdminToast('Failed to delete song: ' + err.message, true);
    }
};

// ── 4. OFFLINE METADATA CONTROL ─────────────────────────────

const offlineMetaTableBody = document.getElementById('offlineMetaTableBody');

function renderOfflineMetadata() {
    if (!offlineMetaTableBody) return;
    offlineMetaTableBody.innerHTML = '';
    if (songsData.length === 0) {
        offlineMetaTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#8e95a5;">No song metadata available.</td></tr>';
        return;
    }

    songsData.forEach(s => {
        const isDl = s.downloadable !== false;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code>${s.id}</code></td>
            <td><strong>${s.title}</strong></td>
            <td>${s.artist}</td>
            <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.audio_url || s.file_url}</td>
            <td><span class="badge-status ${isDl ? 'badge-active' : 'badge-disabled'}">${isDl ? 'Download Allowed' : 'Offline Disabled'}</span></td>
            <td>
                <button class="btn-action-sm ${isDl ? 'btn-disable' : 'btn-edit'}" onclick="window.toggleOfflineDownloadable('${s.id}', ${!isDl})">
                    ${isDl ? 'Disable Offline' : 'Allow Offline'}
                </button>
            </td>
        `;
        offlineMetaTableBody.appendChild(tr);
    });
}

window.toggleOfflineDownloadable = async function(id, enable) {
    const s = songsData.find(item => item.id === id);
    if (!s) return;

    try {
        await adminFetch('/api/admin/songs', 'PUT', { id, downloadable: enable });
        showAdminToast(`Offline download for '${s.title}' ${enable ? 'enabled' : 'disabled'}.`);
        await fetchSongs();
    } catch (err) {
        showAdminToast('Failed to update offline permission: ' + err.message, true);
    }
};

// ── 5. GLOBAL SEARCH IN ADMIN ───────────────────────────────

adminGlobalSearch?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
        renderUsersTable(usersData);
        renderPlaylistsTable(playlistsData);
        renderSongsTable(songsData);
        return;
    }

    const filteredUsers = usersData.filter(u =>
        u.userId.toLowerCase().includes(q) || (u.name && u.name.toLowerCase().includes(q))
    );
    const filteredPlaylists = playlistsData.filter(p =>
        p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    );
    const filteredSongs = songsData.filter(s =>
        s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || (s.album && s.album.toLowerCase().includes(q))
    );

    renderUsersTable(filteredUsers);
    renderPlaylistsTable(filteredPlaylists);
    renderSongsTable(filteredSongs);
});

// Initialize on Load
checkAdminAuth();
