const CONFIG = {
  TMDB_API_KEY: 'cdf9b6a0255cebc133ce4d9aaaee8d6d',
  TVMAZE_API_KEY: 'zA6qewWidZMGR1slbPXX-REnvSJ02VG2',
  OMDB_API_KEY: 'b9a8f8a8',
  TRANSLATION_API_KEY: 'trnsl.1.1.20211001T000000Z.1234567890abcdef.1234567890abcdef',
  BASE_URL: 'https://api.themoviedb.org/3',
  TVMAZE_BASE_URL: 'https://api.tvmaze.com',
  OMDB_BASE_URL: 'https://www.omdbapi.com',
  TRANSLATION_BASE_URL: 'https://translate.yandex.net/api/v1.5/tr.json/translate',
  IMG_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  CACHE_DURATION: 15 * 60 * 1000,
  ACCESS_CODE: 'TV2025',
  API_ROTATION_INTERVAL: 5000
};

const AUTHORIZED_USERS = [
  { name: "Marcos", phone: "50369270" },
  { name: "Carlos Martínez", phone: "623456789" },
  { name: "María Fernández", phone: "634567890" },
  { name: "José Rodríguez", phone: "645678901" },
];

const State = {
  currentType: 'now_playing',
  currentAbortController: null,
  isLoading: false,
  lastItem: null,
  cache: {},
  cacheExpiry: {},
  favorites: JSON.parse(localStorage.getItem('cartel_favorites')) || [],
  watchlist: JSON.parse(localStorage.getItem('cartel_watchlist')) || [],
  history: JSON.parse(localStorage.getItem('cartel_history')) || [],
  settings: JSON.parse(localStorage.getItem('cartel_settings')) || {
    theme: 'azul',
    contentQuality: 'balanced',
    includeTVmaze: true,
    translationEnabled: false,
    translationLanguage: 'en'
  },
  isOnline: navigator.onLine,
  currentApiIndex: 0,
  lastApiCall: 0
};

function setupAccessModal() {
  const accessModal = document.getElementById('access-modal');
  const accessNameInput = document.getElementById('access-name');
  const accessPhoneInput = document.getElementById('access-phone');
  const submitButton = document.getElementById('submit-code');
  const subscribeBtn = document.getElementById('subscribe-btn');
  const errorMessage = document.getElementById('error-message');
  
  const hasAccess = localStorage.getItem('cartel_access_granted');
  if (hasAccess === 'true') {
    accessModal.classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    return;
  }
  
  submitButton.addEventListener('click', () => {
    const enteredName = accessNameInput.value.trim();
    const enteredPhone = accessPhoneInput.value.trim();
    
    if (!enteredName || !enteredPhone) {
      errorMessage.textContent = 'Todos los campos son obligatorios';
      errorMessage.classList.remove('hidden');
      return;
    }
    
    const isValidUser = AUTHORIZED_USERS.some(user => 
      user.name.toLowerCase() === enteredName.toLowerCase() &&
      user.phone === enteredPhone
    );
    
    if (isValidUser) {
      localStorage.setItem('cartel_access_granted', 'true');
      localStorage.setItem('cartel_user_name', enteredName);
      accessModal.classList.add('hidden');
      document.getElementById('main-app').classList.remove('hidden');
      showNotification(`Bienvenido/a, ${enteredName}`);
    } else {
      errorMessage.textContent = 'Credenciales incorrectas. Verifique sus datos.';
      errorMessage.classList.remove('hidden');
      accessPhoneInput.value = '';
      accessPhoneInput.focus();
    }
  });
  
  subscribeBtn.addEventListener('click', () => {
    const name = accessNameInput.value.trim() || 'Usuario interesado';
    const phone = accessPhoneInput.value.trim() || 'No proporcionado';
    
    const subject = 'Solicitud de inscripción - CTVP';
    const body = `Hola, me interesa inscribirme en CTVP Premium.\n\nNombre: ${name}\nTeléfono: ${phone}\n\nPor favor contáctenme con más información.`;
    
    const mailtoLink = `mailto:carteltv.soporte@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, '_blank');
    
    showNotification('Redirigiendo a Gmail para inscripción...');
  });
  
  [accessNameInput, accessPhoneInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        submitButton.click();
      }
    });
  });
}

function setupTheme() {
  const savedTheme = State.settings.theme;
  applyTheme(savedTheme);
  
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === savedTheme;
    radio.addEventListener('change', (e) => {
      applyTheme(e.target.value);
      saveSettings();
    });
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  State.settings.theme = theme;
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'azul' ? 'dorado' : 'azul';
  
  applyTheme(newTheme);
  
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === newTheme;
  });
  
  saveSettings();
  showNotification(`Tema cambiado a ${newTheme === 'azul' ? 'Azul Profesional' : 'Dorado Premium'}`);
}

function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'azul' ? '🔵' : '💎';
  }
}

function setupSettings() {
  const contentQuality = document.getElementById('content-quality');
  if (contentQuality) {
    contentQuality.value = State.settings.contentQuality;
    contentQuality.addEventListener('change', saveSettings);
  }
  
  const tvmazeToggle = document.getElementById('tvmaze-toggle');
  if (tvmazeToggle) {
    tvmazeToggle.checked = State.settings.includeTVmaze;
    tvmazeToggle.addEventListener('change', saveSettings);
  }
  
  const translationToggle = document.getElementById('translation-toggle');
  const translationLanguage = document.getElementById('translation-language');
  
  if (translationToggle) {
    translationToggle.checked = State.settings.translationEnabled;
    translationToggle.addEventListener('change', saveSettings);
  }
  
  if (translationLanguage) {
    translationLanguage.value = State.settings.translationLanguage;
    translationLanguage.addEventListener('change', saveSettings);
  }
}

function saveSettings() {
  State.settings = {
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'azul',
    contentQuality: document.getElementById('content-quality')?.value || 'balanced',
    includeTVmaze: document.getElementById('tvmaze-toggle')?.checked || true,
    translationEnabled: document.getElementById('translation-toggle')?.checked || false,
    translationLanguage: document.getElementById('translation-language')?.value || 'en'
  };
  
  localStorage.setItem('cartel_settings', JSON.stringify(State.settings));
  applyTheme(State.settings.theme);
}

function setupNavigation() {
  const menuBtn = document.getElementById('menu-btn');
  const sideMenu = document.getElementById('side-menu');
  const closeMenu = document.getElementById('close-menu');
  
  if (menuBtn && sideMenu) {
    menuBtn.addEventListener('click', () => {
      sideMenu.classList.add('open');
    });
  }
  
  if (closeMenu && sideMenu) {
    closeMenu.addEventListener('click', () => {
      sideMenu.classList.remove('open');
    });
  }
  
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      showSection(section);
      sideMenu.classList.remove('open');
    });
  });
}

function showSection(sectionId) {
  const sections = document.querySelectorAll('.content-section');
  sections.forEach(section => section.classList.remove('active'));
  
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
    
    if (sectionId === 'favorites') {
      loadFavorites();
    } else if (sectionId === 'watchlist') {
      loadWatchlist();
    } else if (sectionId === 'history') {
      loadHistory();
    }
  }
}

function setupFavorites() {
  const favoriteBtn = document.getElementById('favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', toggleFavorite);
  }
  
  updateStats();
}

function toggleFavorite() {
  if (!State.lastItem) return;
  
  const item = State.lastItem.item;
  const existingIndex = State.favorites.findIndex(fav => 
    fav.id === item.id && fav.media_type === (item.title ? 'movie' : 'tv')
  );
  
  if (existingIndex >= 0) {
    State.favorites.splice(existingIndex, 1);
    showNotification('Eliminado de favoritos');
  } else {
    State.favorites.push({
      ...item,
      media_type: item.title ? 'movie' : 'tv',
      added_at: new Date().toISOString()
    });
    showNotification('Añadido a favoritos');
  }
  
  localStorage.setItem('cartel_favorites', JSON.stringify(State.favorites));
  updateFavoriteButton();
  updateStats();
}

function updateFavoriteButton() {
  const favoriteBtn = document.getElementById('favorite-btn');
  if (!favoriteBtn || !State.lastItem) return;
  
  const item = State.lastItem.item;
  const isFavorite = State.favorites.some(fav => 
    fav.id === item.id && fav.media_type === (item.title ? 'movie' : 'tv')
  );
  
  favoriteBtn.innerHTML = isFavorite ? 
    '<span class="action-icon">💔</span> Quitar Favorito' :
    '<span class="action-icon">❤️</span> Favorito';
}

function loadFavorites() {
  const grid = document.getElementById('favorites-grid');
  if (!grid) return;
  
  if (State.favorites.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">❤️</span>
        <h3>No hay favoritos aún</h3>
        <p>Los contenidos que marques como favoritos aparecerán aquí</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = State.favorites.map(item => `
    <div class="grid-item" data-id="${item.id}" data-type="${item.media_type}" data-source="${item.source || 'tmdb'}">
      <img src="${item.source === 'tvmaze' ? item.poster_path : CONFIG.IMG_BASE_URL + item.poster_path}" 
           alt="${item.title || item.name}" 
           class="grid-poster"
           onerror="this.src='https://via.placeholder.com/200x300/1a1a25/6c757d?text=Sin+imagen'">
      <div class="grid-info">
        <div class="grid-title">${item.title || item.name}</div>
        <div class="grid-year">${(item.release_date || item.first_air_date)?.substring(0, 4) || 'N/A'}</div>
      </div>
    </div>
  `).join('');
}

function setupWatchlist() {
  const watchlistBtn = document.getElementById('watchlist-btn');
  if (watchlistBtn) {
    watchlistBtn.addEventListener('click', toggleWatchlist);
  }
}

function toggleWatchlist() {
  if (!State.lastItem) return;
  
  const item = State.lastItem.item;
  const existingIndex = State.watchlist.findIndex(watch => 
    watch.id === item.id && watch.media_type === (item.title ? 'movie' : 'tv')
  );
  
  if (existingIndex >= 0) {
    State.watchlist.splice(existingIndex, 1);
    showNotification('Eliminado de la lista');
  } else {
    State.watchlist.push({
      ...item,
      media_type: item.title ? 'movie' : 'tv',
      added_at: new Date().toISOString()
    });
    showNotification('Añadido a por ver');
  }
  
  localStorage.setItem('cartel_watchlist', JSON.stringify(State.watchlist));
  updateWatchlistButton();
  updateStats();
}

function updateWatchlistButton() {
  const watchlistBtn = document.getElementById('watchlist-btn');
  if (!watchlistBtn || !State.lastItem) return;
  
  const item = State.lastItem.item;
  const inWatchlist = State.watchlist.some(watch => 
    watch.id === item.id && watch.media_type === (item.title ? 'movie' : 'tv')
  );
  
  watchlistBtn.innerHTML = inWatchlist ? 
    '<span class="action-icon">✅</span> En Lista' :
    '<span class="action-icon">📝</span> Por Ver';
}

function loadWatchlist() {
  const grid = document.getElementById('watchlist-grid');
  if (!grid) return;
  
  if (State.watchlist.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <h3>Lista vacía</h3>
        <p>Agrega contenido a tu lista para verlo después</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = State.watchlist.map(item => `
    <div class="grid-item" data-id="${item.id}" data-type="${item.media_type}" data-source="${item.source || 'tmdb'}">
      <img src="${item.source === 'tvmaze' ? item.poster_path : CONFIG.IMG_BASE_URL + item.poster_path}" 
           alt="${item.title || item.name}" 
           class="grid-poster"
           onerror="this.src='https://via.placeholder.com/200x300/1a1a25/6c757d?text=Sin+imagen'">
      <div class="grid-info">
        <div class="grid-title">${item.title || item.name}</div>
        <div class="grid-year">${(item.release_date || item.first_air_date)?.substring(0, 4) || 'N/A'}</div>
      </div>
    </div>
  `).join('');
}

function addToHistory(item, action = 'viewed') {
  State.history.unshift({
    ...item,
    media_type: item.title ? 'movie' : 'tv',
    action,
    timestamp: new Date().toISOString()
  });
  
  State.history = State.history.slice(0, 50);
  localStorage.setItem('cartel_history', JSON.stringify(State.history));
}

function loadHistory() {
  const historyList = document.getElementById('history-list');
  if (!historyList) return;
  
  if (State.history.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🕒</span>
        <h3>Sin historial</h3>
        <p>Tu actividad aparecerá aquí</p>
      </div>
    `;
    return;
  }
  
  historyList.innerHTML = State.history.map(item => `
    <div class="history-item">
      <div class="history-content">
        <strong>${item.title || item.name}</strong>
        <span class="history-action">${getActionText(item.action)}</span>
        <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
      </div>
    </div>
  `).join('');
}

function getActionText(action) {
  const actions = {
    viewed: 'visto',
    favorited: 'agregado a favoritos',
    watchlisted: 'agregado a por ver'
  };
  return actions[action] || action;
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'ahora mismo';
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  if (days < 7) return `hace ${days} d`;
  
  return date.toLocaleDateString('es-ES');
}

function updateStats() {
  const favCount = document.getElementById('fav-count');
  const watchCount = document.getElementById('watch-count');
  
  if (favCount) favCount.textContent = State.favorites.length;
  if (watchCount) watchCount.textContent = State.watchlist.length;
}

function showNotification(message, duration = 3000) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notification-text');
  
  if (!notification || !notificationText) return;
  
  notificationText.textContent = message;
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, duration);
}

function setupNotifications() {
  const closeBtn = document.getElementById('notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('notification').classList.remove('show');
    });
  }
}

function setupNetworkStatus() {
  window.addEventListener('online', () => {
    State.isOnline = true;
    showNotification('Conexión restaurada', 2000);
  });
  
  window.addEventListener('offline', () => {
    State.isOnline = false;
    showNotification('Sin conexión', 4000);
  });
}

function cleanup() {
  if (State.currentAbortController) {
    State.currentAbortController.abort();
    State.currentAbortController = null;
  }
}

function canUseApi() {
  const now = Date.now();
  if (now - State.lastApiCall < CONFIG.API_ROTATION_INTERVAL) {
    return false;
  }
  State.lastApiCall = now;
  return true;
}

async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES, delay = CONFIG.INITIAL_DELAY) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (!canUseApi()) {
        await new Promise(r => setTimeout(r, CONFIG.API_ROTATION_INTERVAL));
        continue;
      }
      
      const res = await fetch(url, {
        signal: State.currentAbortController?.signal,
        headers: { Accept: 'application/json' }
      });
      
      if (!res.ok) {
        if (res.status === 429 && i < retries) {
          await new Promise(r => setTimeout(r, delay * (2 ** i)));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay * (2 ** i)));
    }
  }
}

async function fetchOMDBDetails(imdbId) {
  try {
    const url = `${CONFIG.OMDB_BASE_URL}/?i=${imdbId}&apikey=${CONFIG.OMDB_API_KEY}`;
    const data = await fetchWithRetry(url);
    return data;
  } catch (error) {
    console.error('Error fetching OMDB details:', error);
    return null;
  }
}

async function translateText(text, targetLang) {
  if (!text || !State.settings.translationEnabled) return text;
  
  try {
    const url = `${CONFIG.TRANSLATION_BASE_URL}?key=${CONFIG.TRANSLATION_API_KEY}&text=${encodeURIComponent(text)}&lang=${targetLang}`;
    const response = await fetchWithRetry(url);
    
    if (response && response.text && response.text.length > 0) {
      return response.text[0];
    }
    return text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

async function fetchTVmazeShows() {
  try {
    const response = await fetch(`${CONFIG.TVMAZE_BASE_URL}/shows`);
    
    if (!response.ok) {
      throw new Error(`TVmaze HTTP ${response.status}`);
    }
    
    const shows = await response.json();
    
    return shows
      .filter(show => show.image && show.image.medium && show.name)
      .slice(0, 50)
      .map(show => ({
        id: `tvmaze-${show.id}`,
        name: show.name,
        overview: show.summary ? show.summary.replace(/<[^>]*>/g, '') : 'Sin descripción disponible',
        first_air_date: show.premiered || '',
        poster_path: show.image.medium,
        vote_average: show.rating?.average || 0,
        genre_ids: show.genres || [],
        media_type: 'tv',
        source: 'tvmaze'
      }));
  } catch (error) {
    console.error('Error fetching TVmaze shows:', error);
    return [];
  }
}

async function fetchTVmazeSchedule() {
  try {
    const response = await fetch(`${CONFIG.TVMAZE_BASE_URL}/schedule`);
    
    if (!response.ok) {
      throw new Error(`TVmaze Schedule HTTP ${response.status}`);
    }
    
    const schedule = await response.json();
    
    const uniqueShows = new Map();
    
    schedule.forEach(episode => {
      if (episode.show && episode.show.image && !uniqueShows.has(episode.show.id)) {
        uniqueShows.set(episode.show.id, {
          id: `tvmaze-${episode.show.id}`,
          name: episode.show.name,
          overview: episode.show.summary ? episode.show.summary.replace(/<[^>]*>/g, '') : 'Episodio en emisión',
          first_air_date: episode.airdate || '',
          poster_path: episode.show.image.medium,
          vote_average: episode.show.rating?.average || 0,
          genre_ids: episode.show.genres || [],
          media_type: 'tv',
          source: 'tvmaze',
          episode: {
            name: episode.name,
            season: episode.season,
            number: episode.number
          }
        });
      }
    });
    
    return Array.from(uniqueShows.values()).slice(0, 30);
  } catch (error) {
    console.error('Error fetching TVmaze schedule:', error);
    return [];
  }
}

async function fetchContentByType(type) {
  const now = Date.now();
  const cacheValid = State.cache[type]?.length > 0 && now < State.cacheExpiry[type];

  if (cacheValid) {
    return State.cache[type];
  }

  let language = 'es-ES';
  let rawData = [];

  try {
    switch (type) {
      case 'now_playing':
        const nowPlaying = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/now_playing?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&region=ES`);
        rawData = nowPlaying.results || [];
        break;
        
      case 'popular_movies':
        const popMovies = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = popMovies.results || [];
        break;
        
      case 'top_rated_movies':
        const topMovies = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/top_rated?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = topMovies.results || [];
        break;
        
      case 'upcoming':
        const upcoming = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/upcoming?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&region=ES`);
        rawData = upcoming.results || [];
        break;

      case 'upcoming_movies':
        const upcomingMovies = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/upcoming?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&region=ES`);
        rawData = upcomingMovies.results || [];
        break;
        
      case 'trending_movies':
        const trendingMovies = await fetchWithRetry(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = trendingMovies.results || [];
        break;

      case 'latest_movies':
        const latestMovies = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/latest?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = [latestMovies].filter(item => item && item.title);
        break;

      case 'action':
        const action = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=28`);
        rawData = action.results || [];
        break;

      case 'comedy':
        const comedy = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=35`);
        rawData = comedy.results || [];
        break;

      case 'drama':
        const drama = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=18`);
        rawData = drama.results || [];
        break;

      case 'thriller':
        const thriller = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=53`);
        rawData = thriller.results || [];
        break;

      case 'horror':
        const horror = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=27`);
        rawData = horror.results || [];
        break;

      case 'romance':
        const romance = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10749`);
        rawData = romance.results || [];
        break;

      case 'scifi':
        const scifi = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=878`);
        rawData = scifi.results || [];
        break;

      case 'fantasy':
        const fantasy = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=14`);
        rawData = fantasy.results || [];
        break;

      case 'adventure':
        const adventure = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=12`);
        rawData = adventure.results || [];
        break;

      case 'animation':
        const animation = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=16`);
        rawData = animation.results || [];
        break;

      case 'documentary':
        const documentary = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=99`);
        rawData = documentary.results || [];
        break;

      case 'family':
        const family = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10751`);
        rawData = family.results || [];
        break;

      case 'on_the_air':
        const [tmdbOnAir, tvmazeSchedule] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/tv/on_the_air?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          State.settings.includeTVmaze ? fetchTVmazeSchedule() : Promise.resolve([])
        ]);
        
        const tmdbShows = tmdbOnAir.results || [];
        const combinedShows = [...tmdbShows, ...tvmazeSchedule];
        rawData = combinedShows;
        break;
        
      case 'popular_tv':
        const [popTVs, tvmazeShows] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/tv/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          State.settings.includeTVmaze ? fetchTVmazeShows() : Promise.resolve([])
        ]);
        
        rawData = [...(popTVs.results || []), ...tvmazeShows];
        break;
        
      case 'top_rated_tv':
        const topTVs = await fetchWithRetry(`${CONFIG.BASE_URL}/tv/top_rated?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = topTVs.results || [];
        break;

      case 'airing_today':
        const airingToday = await fetchWithRetry(`${CONFIG.BASE_URL}/tv/airing_today?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = airingToday.results || [];
        break;

      case 'trending_tv':
        const trendingTV = await fetchWithRetry(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = trendingTV.results || [];
        break;

      case 'latest_tv':
        const latestTV = await fetchWithRetry(`${CONFIG.BASE_URL}/tv/latest?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = [latestTV].filter(item => item && item.name);
        break;

      case 'upcoming_tv':
        const upcomingTV = await fetchWithRetry(`${CONFIG.BASE_URL}/tv/on_the_air?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = upcomingTV.results || [];
        break;

      case 'tv_drama':
        const tvDrama = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=18`);
        rawData = tvDrama.results || [];
        break;

      case 'tv_comedy':
        const tvComedy = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=35`);
        rawData = tvComedy.results || [];
        break;

      case 'tv_action':
        const tvAction = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10759`);
        rawData = tvAction.results || [];
        break;

      case 'tv_scifi':
        const tvScifi = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10765`);
        rawData = tvScifi.results || [];
        break;

      case 'tv_fantasy':
        const tvFantasy = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10765`);
        rawData = tvFantasy.results || [];
        break;

      case 'tv_crime':
        const tvCrime = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=80`);
        rawData = tvCrime.results || [];
        break;

      case 'tv_mystery':
        const tvMystery = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=9648`);
        rawData = tvMystery.results || [];
        break;

      case 'tv_animation':
        const tvAnimation = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=16`);
        rawData = tvAnimation.results || [];
        break;

      case 'tv_reality':
        const tvReality = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=10764`);
        rawData = tvReality.results || [];
        break;
        
      case 'tvmaze_shows':
        rawData = State.settings.includeTVmaze ? await fetchTVmazeShows() : [];
        break;

      case 'tvmaze_schedule':
        rawData = State.settings.includeTVmaze ? await fetchTVmazeSchedule() : [];
        break;

      case 'netflix_originals':
        const netflix = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_networks=213`);
        rawData = netflix.results || [];
        break;

      case 'disney_originals':
        const disney = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_networks=2739`);
        rawData = disney.results || [];
        break;

      case 'hbo_originals':
        const hbo = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_networks=49`);
        rawData = hbo.results || [];
        break;

      case 'prime_originals':
        const prime = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/tv?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_networks=1024`);
        rawData = prime.results || [];
        break;

      case 'trending_all':
        const [trendingAllMovies, trendingAllTVs] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`)
        ]);
        rawData = [...(trendingAllMovies.results || []), ...(trendingAllTVs.results || [])];
        break;

      case 'weekly_trending':
        const weeklyTrending = await fetchWithRetry(`${CONFIG.BASE_URL}/trending/all/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = weeklyTrending.results || [];
        break;

      case 'daily_trending':
        const dailyTrending = await fetchWithRetry(`${CONFIG.BASE_URL}/trending/all/day?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = dailyTrending.results || [];
        break;

      case 'classic_movies':
        const classic = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&primary_release_date.lte=1990&sort_by=vote_average.desc`);
        rawData = classic.results || [];
        break;

      case 'cult_movies':
        const cult = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_keywords=viewed&sort_by=vote_count.desc`);
        rawData = cult.results || [];
        break;

      case 'award_winners':
        const awards = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_keywords=award&sort_by=vote_average.desc`);
        rawData = awards.results || [];
        break;

      case 'indie_movies':
        const indie = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=18&with_original_language=en&without_keywords=hollywood`);
        rawData = indie.results || [];
        break;

      case 'foreign_movies':
        const foreign = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_original_language=es&region=ES`);
        rawData = foreign.results || [];
        break;
        
      default:
        throw new Error('Tipo no soportado');
    }

    const valid = rawData.filter(item => {
      if (item.source === 'tvmaze') {
        return item.poster_path && item.name;
      }
      return item.poster_path && (item.title || item.name);
    });

    State.cache[type] = valid;
    State.cacheExpiry[type] = now + CONFIG.CACHE_DURATION;

    return valid;
  } catch (error) {
    console.error(`Error fetching content for ${type}:`, error);
    return State.cache[type] || [];
  }
}

async function getContentByType(type) {
  const items = await fetchContentByType(type);
  if (items.length === 0) {
    throw new Error('No hay contenido disponible en esta categoría.');
  }
  
  return items;
}

async function renderContent(item) {
  const container = document.getElementById('movie-container');
  if (!container) return;
  
  container.innerHTML = '';

  const img = document.createElement('img');
  img.className = 'movie-poster';
  
  if (item.source === 'tvmaze') {
    img.src = item.poster_path;
  } else {
    img.src = `${CONFIG.IMG_BASE_URL}${item.poster_path}`;
  }
  
  let title = item.title || item.name;
  let overview = item.overview?.trim() || 'Sin descripción disponible.';
  
  if (State.settings.translationEnabled) {
    title = await translateText(title, State.settings.translationLanguage);
    overview = await translateText(overview, State.settings.translationLanguage);
  }
  
  img.alt = `Póster de ${title}`;
  img.loading = 'lazy';
  img.onerror = () => {
    img.src = 'https://via.placeholder.com/300x450/1a1a25/6c757d?text=Sin+imagen';
    img.alt = 'Imagen no disponible';
  };

  const titleElement = document.createElement('div');
  titleElement.className = 'movie-title';
  const dateField = item.release_date || item.first_air_date;
  const year = dateField?.substring(0, 4) || 'N/A';
  
  const sourceBadge = item.source === 'tvmaze' ? ' 📺' : '';
  titleElement.textContent = `${title} (${year})${sourceBadge}`;

  const overviewElement = document.createElement('p');
  overviewElement.className = 'movie-overview';
  overviewElement.textContent = overview;

  container.appendChild(img);
  container.appendChild(titleElement);
  
  if (item.episode) {
    const episodeInfo = document.createElement('div');
    episodeInfo.className = 'episode-info';
    let episodeText = `<strong>Episodio:</strong> ${item.episode.name} (T${item.episode.season} E${item.episode.number})`;
    
    if (State.settings.translationEnabled) {
      episodeText = await translateText(episodeText, State.settings.translationLanguage);
    }
    
    episodeInfo.innerHTML = episodeText;
    container.appendChild(episodeInfo);
  }
  
  container.appendChild(overviewElement);
  
  State.lastItem = { item, type: State.currentType };
  addToHistory(item, 'viewed');
  updateFavoriteButton();
  updateWatchlistButton();
}

function renderError(message) {
  const container = document.getElementById('movie-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h3>Error al cargar contenido</h3>
      <p>${message}</p>
      <button onclick="loadContent()" class="action-btn">
        Reintentar
      </button>
    </div>
  `;
}

async function loadContent() {
  if (State.isLoading) return;
  
  State.isLoading = true;
  cleanup();
  State.currentAbortController = new AbortController();

  const btn = document.getElementById('load-btn');
  const loading = document.getElementById('loading');
  const container = document.getElementById('movie-container');

  if (btn) btn.disabled = true;
  if (loading) loading.style.display = 'flex';
  if (container) container.innerHTML = '';

  try {
    const items = await getContentByType(State.currentType);
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      await renderContent(items[randomIndex]);
      showNotification('Contenido cargado correctamente');
    } else {
      renderError('No se encontró contenido en esta categoría');
    }
  } catch (error) {
    console.error('Error al cargar contenido:', error);
    renderError(error.message || 'No se pudo cargar contenido. Verifica tu conexión.');
  } finally {
    if (loading) loading.style.display = 'none';
    if (btn) btn.disabled = false;
    State.isLoading = false;
  }
}

function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.currentType = btn.dataset.type;
      
      loadContent();
      showNotification(`Categoría: ${btn.textContent.trim()}`);
    });
  });
}

function initApp() {
  setupAccessModal();
  setupTheme();
  setupSettings();
  setupNavigation();
  setupFavorites();
  setupWatchlist();
  setupNotifications();
  setupNetworkStatus();
  setupFilters();
  
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => loadContent());
  }

  window.addEventListener('beforeunload', cleanup);
}

window.addEventListener('DOMContentLoaded', initApp);

window.toggleFavorite = toggleFavorite;
window.toggleWatchlist = toggleWatchlist;
window.loadContent = loadContent;