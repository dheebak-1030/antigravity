// ============================================================
// DK MUSIC — INDEXEDDB OFFLINE STORAGE & LOCAL FILE ENGINE
// ============================================================

const DB_NAME = 'DK_Music_Offline_DB';
const DB_VERSION = 2;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // 1. Cached audio blobs for offline listening
      if (!db.objectStoreNames.contains('cached_audio')) {
        db.createObjectStore('cached_audio', { keyPath: 'songId' });
      }

      // 2. User-imported local audio files (MP3, WAV, etc.)
      if (!db.objectStoreNames.contains('local_tracks')) {
        db.createObjectStore('local_tracks', { keyPath: 'id' });
      }

      // 3. Metadata for downloaded songs list
      if (!db.objectStoreNames.contains('downloaded_meta')) {
        db.createObjectStore('downloaded_meta', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('[OfflineDB] Failed to open IndexedDB:', e.target.error);
      reject(e.target.error);
    };
  });
}

// ── Offline Audio Caching ───────────────────────────────────

/**
 * Downloads audio file and saves blob in IndexedDB for offline play
 */
async function downloadTrackForOffline(song) {
  try {
    const db = await openDB();

    // Fetch the audio blob
    const response = await fetch(song.file_url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching audio`);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cached_audio', 'downloaded_meta'], 'readwrite');
      const audioStore = tx.objectStore('cached_audio');
      const metaStore = tx.objectStore('downloaded_meta');

      audioStore.put({
        songId: song.id,
        blob: blob,
        mimeType: blob.type || 'audio/mpeg',
        downloadedAt: Date.now()
      });

      metaStore.put({
        ...song,
        isOfflineDownloaded: true,
        downloadedAt: Date.now()
      });

      tx.oncomplete = () => {
        console.log(`[OfflineDB] Track "${song.title}" cached offline.`);
        resolve(true);
      };

      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('[OfflineDB] Error downloading track:', err);
    throw err;
  }
}

/**
 * Removes track from offline cache
 */
async function removeTrackFromOffline(songId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['cached_audio', 'downloaded_meta'], 'readwrite');
    tx.objectStore('cached_audio').delete(songId);
    tx.objectStore('downloaded_meta').delete(songId);

    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Checks if a track is cached offline
 */
async function isTrackAvailableOffline(songId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['downloaded_meta'], 'readonly');
      const req = tx.objectStore('downloaded_meta').get(songId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

/**
 * Retrieves audio blob URL for offline playback
 */
async function getOfflineAudioUrl(songId) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['cached_audio'], 'readonly');
      const req = tx.objectStore('cached_audio').get(songId);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const url = URL.createObjectURL(req.result.blob);
          resolve(url);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Returns all downloaded songs metadata
 */
async function getAllDownloadedTracks() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['downloaded_meta'], 'readonly');
      const req = tx.objectStore('downloaded_meta').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// ── User Local Audio Import (100% Offline & Copyright-Safe) ─

/**
 * Saves a user-imported local audio file (MP3/WAV/FLAC) to IndexedDB
 */
async function saveUserLocalAudio(file, customMeta = {}) {
  const db = await openDB();
  const id = 'local_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

  // Extract clean title from filename
  let defaultTitle = file.name.replace(/\.[^/.]+$/, "");
  let defaultArtist = 'Local Device Track';

  if (defaultTitle.includes(' - ')) {
    const parts = defaultTitle.split(' - ');
    defaultArtist = parts[0].trim();
    defaultTitle = parts.slice(1).join(' - ').trim();
  }

  // Generate nice gradient placeholder cover for local track
  const trackObj = {
    id: id,
    title: customMeta.title || defaultTitle,
    artist: customMeta.artist || defaultArtist,
    album: customMeta.album || 'Imported Audio',
    duration: customMeta.duration || 0,
    cover_url: customMeta.cover_url || null,
    isLocal: true,
    copyright_free: true,
    license: 'Personal Offline Device File',
    createdAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['local_tracks'], 'readwrite');
    const store = tx.objectStore('local_tracks');

    store.put({
      id: id,
      metadata: trackObj,
      fileBlob: file,
      mimeType: file.type || 'audio/mpeg'
    });

    tx.oncomplete = () => {
      console.log(`[OfflineDB] Saved local audio: "${trackObj.title}"`);
      resolve(trackObj);
    };

    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves all user local imported songs
 */
async function getAllUserLocalTracks() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(['local_tracks'], 'readonly');
      const req = tx.objectStore('local_tracks').getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        const tracks = records.map(r => {
          const t = { ...r.metadata };
          if (r.fileBlob) {
            t.file_url = URL.createObjectURL(r.fileBlob);
          }
          return t;
        });
        resolve(tracks);
      };
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

/**
 * Deletes a local user imported track
 */
async function deleteUserLocalAudio(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['local_tracks'], 'readwrite');
    tx.objectStore('local_tracks').delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Export functions to global scope
window.DK_OfflineDB = {
  openDB,
  downloadTrackForOffline,
  removeTrackFromOffline,
  isTrackAvailableOffline,
  getOfflineAudioUrl,
  getAllDownloadedTracks,
  saveUserLocalAudio,
  getAllUserLocalTracks,
  deleteUserLocalAudio
};
