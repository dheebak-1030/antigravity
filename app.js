// DOM Elements
const songGrid = document.getElementById('songGrid');
const searchInput = document.getElementById('searchInput');
const audioPlayer = document.getElementById('audioPlayer');

// Player Controls
const btnPlayPause = document.getElementById('btnPlayPause');
const playIcon = document.getElementById('playIcon');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const muteIcon = document.getElementById('muteIcon');

// Progress & Volume
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressHandle = document.getElementById('progressHandle');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');

const volumeContainer = document.getElementById('volumeContainer');
const volumeBar = document.getElementById('volumeBar');
const volumeHandle = document.getElementById('volumeHandle');

// Now Playing Info
const npCover = document.getElementById('npCover');
const npTitle = document.getElementById('npTitle');
const npArtist = document.getElementById('npArtist');

let songs = [];
let currentSongIndex = -1;

// Fetch songs from Supabase
async function fetchSongs() {
    try {
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        songs = data;
        renderSongs(songs);
    } catch (error) {
        console.error('Error fetching songs:', error);
    }
}

// Render songs to the grid
function renderSongs(songsToRender) {
    songGrid.innerHTML = '';
    
    if(songsToRender.length === 0) {
        songGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1 / -1;">No songs found.</p>';
        return;
    }

    songsToRender.forEach((song, index) => {
        // Find actual index in main array for playback reference
        const actualIndex = songs.findIndex(s => s.id === song.id);

        const card = document.createElement('div');
        card.className = 'song-card';
        card.onclick = () => playSong(actualIndex);

        card.innerHTML = `
            <div class="song-cover-wrapper">
                <img src="${song.cover_url || 'https://via.placeholder.com/150'}" alt="${song.title}" class="song-cover">
                <div class="play-overlay">
                    <i class="fas fa-play"></i>
                </div>
            </div>
            <div class="song-info">
                <h3>${song.title}</h3>
                <p>${song.artist}</p>
            </div>
        `;
        songGrid.appendChild(card);
    });
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filteredSongs = songs.filter(song => 
        song.title.toLowerCase().includes(term) || 
        song.artist.toLowerCase().includes(term) ||
        (song.album && song.album.toLowerCase().includes(term))
    );
    renderSongs(filteredSongs);
});

// Playback Functions
function playSong(index) {
    if (index < 0 || index >= songs.length) return;
    
    currentSongIndex = index;
    const song = songs[currentSongIndex];
    
    audioPlayer.src = song.audio_url;
    audioPlayer.play();
    
    // Update UI
    npCover.src = song.cover_url || 'https://via.placeholder.com/56';
    npCover.classList.remove('hidden');
    npTitle.textContent = song.title;
    npArtist.textContent = song.artist;
    
    playIcon.className = 'fas fa-pause';
}

function togglePlayPause() {
    if (currentSongIndex === -1 && songs.length > 0) {
        playSong(0);
        return;
    }

    if (audioPlayer.paused) {
        audioPlayer.play();
        playIcon.className = 'fas fa-pause';
    } else {
        audioPlayer.pause();
        playIcon.className = 'fas fa-play';
    }
}

function nextSong() {
    if (songs.length === 0) return;
    let nextIndex = currentSongIndex + 1;
    if (nextIndex >= songs.length) nextIndex = 0; // Loop back
    playSong(nextIndex);
}

function prevSong() {
    if (songs.length === 0) return;
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = songs.length - 1; // Loop to end
    playSong(prevIndex);
}

// Event Listeners
btnPlayPause.addEventListener('click', togglePlayPause);
btnNext.addEventListener('click', nextSong);
btnPrev.addEventListener('click', prevSong);

// Auto-play next song when current ends
audioPlayer.addEventListener('ended', nextSong);

// Format Time (seconds to mm:ss)
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Update Progress Bar
audioPlayer.addEventListener('timeupdate', () => {
    const { currentTime, duration } = audioPlayer;
    if (duration) {
        const percent = (currentTime / duration) * 100;
        progressBar.style.width = `${percent}%`;
        progressHandle.style.left = `${percent}%`;
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
    }
});

// Seek
progressContainer.addEventListener('click', (e) => {
    const width = progressContainer.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    if (duration) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
});

// Volume Control
volumeContainer.addEventListener('click', (e) => {
    const width = volumeContainer.clientWidth;
    const clickX = e.offsetX;
    let vol = clickX / width;
    if (vol < 0) vol = 0;
    if (vol > 1) vol = 1;
    
    audioPlayer.volume = vol;
    updateVolumeUI(vol);
});

function updateVolumeUI(vol) {
    const percent = vol * 100;
    volumeBar.style.width = `${percent}%`;
    volumeHandle.style.left = `${percent}%`;
    
    if (vol === 0) {
        muteIcon.className = 'fas fa-volume-mute btn-icon';
    } else if (vol < 0.5) {
        muteIcon.className = 'fas fa-volume-down btn-icon';
    } else {
        muteIcon.className = 'fas fa-volume-up btn-icon';
    }
}

// Mute toggle
muteIcon.addEventListener('click', () => {
    if (audioPlayer.volume > 0) {
        audioPlayer.setAttribute('data-last-vol', audioPlayer.volume);
        audioPlayer.volume = 0;
        updateVolumeUI(0);
    } else {
        const lastVol = parseFloat(audioPlayer.getAttribute('data-last-vol')) || 1;
        audioPlayer.volume = lastVol;
        updateVolumeUI(lastVol);
    }
});

// Initialize
fetchSongs();
