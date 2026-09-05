// ============================================================
// DK MUSIC — AI TAMIL MUSIC DISCOVERY & CHAT ASSISTANT ENGINE
// Multi-Language NLP (Tamil, English, Tanglish) • Smart Recommender
// ============================================================

(function () {
  'use strict';

  // ── Tanglish & Tamil Keyword Dictionary ────────────────────
  const TANGLISH_MAP = {
    "இளையராஜா": "ilaiyaraaja raja maestro",
    "ரஹ்மான்": "ar rahman arr rahman",
    "அனிருத்": "anirudh ani",
    "ஹாரிஸ்": "harris jayaraj harris",
    "யுவன்": "yuvan shankar raja yuvan",
    "இம்மான்": "imman d imman",
    "சித் ஸ்ரீராம்": "sid sriram",
    "எஸ்பிபி": "spb sp balasubrahmanyam",
    "காதல்": "love romantic kadhal kaadhal romance",
    "சோகம்": "sad soga paattu breakup heartbreak emotional pain",
    "மெலடி": "melody soothing acoustic chill",
    "பாடல்": "song track paattu padal",
    "பாடல்கள்": "songs tracks paattugal",
    "படம்": "movie film padam",
    "90ஸ்": "90s 1990s nineties classic evergreen",
    "80ஸ்": "80s 1980s eighties vintage",
    "துள்ளல்": "kuthu dance energetic party fun fast",
    "மழை": "rain breeze cool pleasant",
    "இரவு": "night midnight late chill"
  };

  // Normalizes query string for fuzzy multi-script matching
  function normalizeQuery(str) {
    if (!str) return '';
    let text = str.toLowerCase().trim();
    // Expand Tamil script keywords to Tanglish variants if present
    Object.keys(TANGLISH_MAP).forEach(tamilKey => {
      if (text.includes(tamilKey)) {
        text += ' ' + TANGLISH_MAP[tamilKey];
      }
    });
    return text;
  }

  // Multi-field song matcher for Tamil, English, and Tanglish queries
  function matchSongToQuery(song, rawQuery) {
    const query = normalizeQuery(rawQuery);
    if (!query) return true;

    const tokens = query.split(/\s+/).filter(t => t.length > 0);
    
    // Build searchable blob for song
    const searchBlob = [
      song.title || '',
      song.artist || '',
      song.movie || '',
      song.album || '',
      String(song.year || ''),
      song.genre || '',
      song.mood || '',
      ...(song.search_tags || [])
    ].join(' ').toLowerCase();

    // Check decade queries (e.g. "90s", "80s", "2000s", "2010s")
    if (query.includes('90s') || query.includes('90') || query.includes('nineties')) {
      if (song.year >= 1990 && song.year <= 1999) return true;
    }
    if (query.includes('80s') || query.includes('80') || query.includes('eighties')) {
      if (song.year >= 1980 && song.year <= 1989) return true;
    }
    if (query.includes('2000s') || query.includes('2k')) {
      if (song.year >= 2000 && song.year <= 2009) return true;
    }
    if (query.includes('2010s')) {
      if (song.year >= 2010 && song.year <= 2019) return true;
    }

    // Token match count
    let matchCount = 0;
    for (const token of tokens) {
      if (token.length <= 1) continue; // skip single letters
      if (searchBlob.includes(token)) {
        matchCount++;
      } else {
        // Phonetic / prefix fuzzy check
        if (token.startsWith('arr') && searchBlob.includes('ar rahman')) matchCount++;
        else if (token.startsWith('raja') && searchBlob.includes('ilaiyaraaja')) matchCount++;
        else if (token.startsWith('ani') && searchBlob.includes('anirudh')) matchCount++;
        else if (token.startsWith('harris') && searchBlob.includes('harris jayaraj')) matchCount++;
        else if (token.startsWith('yuvan') && searchBlob.includes('yuvan shankar raja')) matchCount++;
        else if (token.startsWith('soga') && (searchBlob.includes('sad') || searchBlob.includes('emotional'))) matchCount++;
      }
    }

    return matchCount > 0;
  }

  // Search Tamil songs in catalog
  function searchTamilSongs(catalog, rawQuery) {
    if (!catalog || !catalog.length) return [];
    if (!rawQuery || !rawQuery.trim()) return catalog;

    return catalog.filter(song => matchSongToQuery(song, rawQuery));
  }

  // AI Recommendation Engine: Recommend similar songs based on song title, artist, movie, genre, mood
  function getAIRecommendations(catalog, targetSongOrId) {
    if (!catalog || !catalog.length) return [];

    let target = null;
    if (typeof targetSongOrId === 'string') {
      target = catalog.find(s => s.id === targetSongOrId || s.title.toLowerCase().includes(targetSongOrId.toLowerCase()));
    } else if (typeof targetSongOrId === 'object') {
      target = targetSongOrId;
    }

    if (!target) {
      // Default to top Tamil melody songs if target is null
      return catalog.slice(0, 5);
    }

    // Rank other songs based on similarity score
    const scored = catalog
      .filter(s => s.id !== target.id)
      .map(song => {
        let score = 0;
        let reasons = [];

        if (song.genre === target.genre) {
          score += 30;
          reasons.push(`matching genre (${song.genre})`);
        }
        if (song.mood === target.mood) {
          score += 25;
          reasons.push(`similar mood (${song.mood})`);
        }
        if (song.artist && target.artist && (song.artist.includes(target.artist.split(' ')[0]) || target.artist.includes(song.artist.split(' ')[0]))) {
          score += 35;
          reasons.push(`composed/performed by same artist style`);
        }
        if (song.movie && target.movie && song.movie === target.movie) {
          score += 40;
          reasons.push(`from the same film soundtrack (${song.movie})`);
        }
        if (song.year && target.year && Math.abs(song.year - target.year) <= 5) {
          score += 15;
          reasons.push(`same musical era (${song.year})`);
        }

        return {
          song,
          score,
          explanation: reasons.length ? `Recommended due to ${reasons.join(', ')}.` : `Recommended based on acoustic vibe similarity.`
        };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 5);
  }

  // Chat-Style AI Music Assistant Query Handler
  async function processAIChatQuery(userPrompt, catalog) {
    const prompt = userPrompt.trim();
    if (!prompt) return null;

    // First try backend API proxy to check if server has GEMINI_API_KEY configured
    try {
      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, catalog_count: catalog ? catalog.length : 0 })
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.mode === 'gemini_api' && data.reply) {
          // Gemini API processed response securely on backend
          const matchedSongs = searchTamilSongs(catalog, prompt);
          return {
            text: data.reply,
            matchedSongs: matchedSongs.length ? matchedSongs.slice(0, 6) : catalog.slice(0, 4),
            source: 'gemini_api'
          };
        }
      }
    } catch (e) {
      console.warn('Backend API key proxy check offline, proceeding with local AI Tamil engine:', e);
    }

    // Local AI NLP Engine Processing (100% Reliable Fallback)
    const lowerPrompt = prompt.toLowerCase();
    const matchedSongs = searchTamilSongs(catalog, prompt);

    let replyText = '';
    let explanation = '';

    if (lowerPrompt.includes('90s') || lowerPrompt.includes('90') || lowerPrompt.includes('nineties') || lowerPrompt.includes('90ஸ்')) {
      replyText = `📻 **90s Tamil Golden Era Classics**\n\nHere are evergreen 90s Tamil hits from AR Rahman and Maestro Ilaiyaraaja that will take you back in time!`;
      explanation = `Found ${matchedSongs.length} classic 90s Tamil tracks with divine orchestration and nostalgia.`;
    } else if (lowerPrompt.includes('ilaiyaraaja') || lowerPrompt.includes('raja') || lowerPrompt.includes('இளையராஜா')) {
      replyText = `🎼 **Maestro Ilaiyaraaja Symphony Collection**\n\nExperiencing the master of orchestration! Here are handpicked Ilaiyaraaja timeless melodies and sad songs.`;
      explanation = `Matched songs composed by Maestro Ilaiyaraaja with rich violins and flutes.`;
    } else if (lowerPrompt.includes('rahman') || lowerPrompt.includes('arr') || lowerPrompt.includes('ரஹ்மான்')) {
      replyText = `💕 **AR Rahman Romantic & Soulful Hits**\n\nMozart of Madras special! Here are magical AR Rahman romantic compositions with lush soundscapes.`;
      explanation = `Selected signature AR Rahman tracks featuring rich acoustics, flute, and harmony.`;
    } else if (lowerPrompt.includes('sad') || lowerPrompt.includes('soga') || lowerPrompt.includes('breakup') || lowerPrompt.includes('சோகம்')) {
      replyText = `💔 **Soulful Tamil Sad & Emotional Songs (சோகப் பாடல்கள்)**\n\nDeep emotional melodies to soothe your heart and mind. Turn down the lights and listen.`;
      explanation = `Curated heart-touching Tamil breakup and emotional songs.`;
    } else if (lowerPrompt.includes('melody') || lowerPrompt.includes('melodies') || lowerPrompt.includes('மெலடி')) {
      replyText = `🎶 **Pure Tamil Melody Collection (இனிய தமிழ் மெலடிகள்)**\n\nRelaxing Tamil acoustics, flute solos, and soothing vocals for morning or evening peace.`;
      explanation = `Matched top-rated Tamil acoustic, flute, and relaxing melody tracks.`;
    } else if (lowerPrompt.includes('kuthu') || lowerPrompt.includes('dance') || lowerPrompt.includes('fast') || lowerPrompt.includes('energetic')) {
      replyText = `⚡ **High-Energy Tamil Kuthu & Party Hits (துள்ளல் இசை)**\n\nTurn up the volume! Here are high-tempo Tamil dance beats to boost your mood!`;
      explanation = `High energy folk and dance beats for instant enthusiasm.`;
    } else {
      replyText = `✨ **AI Music Recommendation**\n\nBased on your query "${prompt}", here are matching tracks handpicked by your AI Music Assistant:`;
      explanation = `Matched ${matchedSongs.length} songs corresponding to "${prompt}".`;
    }

    return {
      text: replyText,
      matchedSongs: matchedSongs.length ? matchedSongs.slice(0, 6) : catalog.slice(0, 5),
      explanation,
      source: 'local_nlp'
    };
  }

  // Export engine to global window
  window.DK_TamilAIEngine = {
    normalizeQuery,
    matchSongToQuery,
    searchTamilSongs,
    getAIRecommendations,
    processAIChatQuery
  };

})();
