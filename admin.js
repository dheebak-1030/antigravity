// DOM Elements
const songForm = document.getElementById('songForm');
const songIdInput = document.getElementById('songId');
const titleInput = document.getElementById('title');
const artistInput = document.getElementById('artist');
const albumInput = document.getElementById('album');
const coverUrlInput = document.getElementById('cover_url');
const audioUrlInput = document.getElementById('audio_url');

const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const formTitle = document.getElementById('formTitle');
const adminSongList = document.getElementById('adminSongList');

// Fetch and render songs
async function fetchAdminSongs() {
    try {
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        renderAdminSongs(data);
    } catch (error) {
        console.error('Error fetching songs for admin:', error);
        alert('Failed to fetch songs. Error: ' + (error.message || JSON.stringify(error)));
    }
}

function renderAdminSongs(songs) {
    adminSongList.innerHTML = '';
    
    if (songs.length === 0) {
        adminSongList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No songs found.</td></tr>';
        return;
    }

    songs.forEach(song => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${song.cover_url || 'https://via.placeholder.com/50'}" alt="Cover" style="width: 40px; height: 40px; border-radius: 4px; object-fit: cover;">
            </td>
            <td>${song.title}</td>
            <td>${song.artist}</td>
            <td class="actions">
                <button class="btn-outline btn-small" onclick="editSong('${song.id}')">Edit</button>
                <button class="btn-danger btn-small" onclick="deleteSong('${song.id}')">Delete</button>
            </td>
        `;
        adminSongList.appendChild(tr);
    });
}

// Form Submission (Add or Update)
songForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;

    const songData = {
        title: titleInput.value.trim(),
        artist: artistInput.value.trim(),
        album: albumInput.value.trim(),
        cover_url: coverUrlInput.value.trim(),
        audio_url: audioUrlInput.value.trim()
    };

    const id = songIdInput.value;

    try {
        if (id) {
            // Update existing song
            const { error } = await supabaseClient
                .from('songs')
                .update(songData)
                .eq('id', id);
            
            if (error) throw error;
            alert('Song updated successfully!');
        } else {
            // Insert new song
            const { error } = await supabaseClient
                .from('songs')
                .insert([songData]);
            
            if (error) throw error;
            alert('Song added successfully!');
        }
        
        resetForm();
        fetchAdminSongs();
    } catch (error) {
        console.error('Error saving song:', error);
        alert('Error saving song. Ensure Supabase is configured and RLS is disabled.');
    } finally {
        submitBtn.textContent = id ? 'Update Song' : 'Add Song';
        submitBtn.disabled = false;
    }
});

// Edit Song (Load data into form)
async function editSong(id) {
    try {
        const { data, error } = await supabaseClient
            .from('songs')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;

        songIdInput.value = data.id;
        titleInput.value = data.title;
        artistInput.value = data.artist;
        albumInput.value = data.album || '';
        coverUrlInput.value = data.cover_url || '';
        audioUrlInput.value = data.audio_url;

        formTitle.textContent = 'Edit Song';
        submitBtn.textContent = 'Update Song';
        cancelBtn.classList.remove('hidden');
        
        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error fetching song details:', error);
    }
}

// Delete Song
async function deleteSong(id) {
    if (!confirm('Are you sure you want to delete this song?')) return;
    
    try {
        const { error } = await supabaseClient
            .from('songs')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        alert('Song deleted!');
        fetchAdminSongs();
    } catch (error) {
        console.error('Error deleting song:', error);
        alert('Failed to delete song.');
    }
}

// Reset Form
function resetForm() {
    songForm.reset();
    songIdInput.value = '';
    formTitle.textContent = 'Add New Song';
    submitBtn.textContent = 'Add Song';
    cancelBtn.classList.add('hidden');
}

cancelBtn.addEventListener('click', resetForm);

// Initialize
fetchAdminSongs();
