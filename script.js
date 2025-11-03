// Configuration
const CONFIG = {
  TMDB_API_KEY: 'cdf9b6a0255cebc133ce4d9aaaee8d6d',
  TVMAZE_API_KEY: 'zA6qewWidZMGR1slbPXX-REnvSJ02VG2',
  BASE_URL: 'https://api.themoviedb.org/3',
  TVMAZE_BASE_URL: 'https://api.tvmaze.com',
  IMG_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  AUTO_UPDATE_INTERVAL: 5 * 60 * 1000,
  CACHE_DURATION: 15 * 60 * 1000
};

// Application State
const State = {
  currentType: 'now_playing',
  currentAbortController: null,
  autoUpdateTimer: null,
  lastUpdate: null,
  isPageVisible: true,
  isLoading: false,
  lastItem: null,
  cache: {},
  cacheExpiry: {},
  contentSignatures: {},
  favorites: JSON.parse(localStorage.getItem('cartel_favorites')) || [],
  watchlist: JSON.parse(localStorage.getItem('cartel_watchlist')) || [],
  history: JSON.parse(localStorage.getItem('cartel_history')) || [],
  settings: JSON.parse(localStorage.getItem('cartel_settings')) || {
    theme: 'auto',
    notifications: true,
    updates: true,
    smartMode: true,
    contentQuality: 'balanced',
    includeTVmaze: true
  },
  deferredPrompt: null,
  isOnline: navigator.onLine
};

// PWA Service Worker Registration
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado correctamente');
      
      if ('Notification' in window && 'PushManager' in window) {
        await setupPushNotifications(registration);
      }
    } catch (error) {
      console.log('Error registrando Service Worker:', error);
    }
  }
}

// Push Notifications Setup
async function setupPushNotifications(registration) {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Permisos de notificación concedidos');
    }
  } catch (error) {
    console.log('Error configurando notificaciones:', error);
  }
}

// Install Prompt Handling
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    State.deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    State.deferredPrompt = null;
    hideInstallButton();
    showNotification('¡Cartel TV instalado correctamente! 🎉');
  });
}

function showInstallButton() {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.classList.remove('hidden');
  }
}

function hideInstallButton() {
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.classList.add('hidden');
  }
}

async function installApp() {
  if (State.deferredPrompt) {
    State.deferredPrompt.prompt();
    const { outcome } = await State.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      State.deferredPrompt = null;
    }
  }
}

// Theme Management
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
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (theme === 'auto') {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  
  State.settings.theme = theme;
  updateThemeIcon(theme, isDark);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  applyTheme(newTheme);
  
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === newTheme;
  });
  
  saveSettings();
  showNotification(`Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`);
}

function updateThemeIcon(theme, isDark) {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    const effectiveTheme = theme === 'auto' ? (isDark ? 'dark' : 'light') : theme;
    themeIcon.textContent = effectiveTheme === 'dark' ? '🌙' : '☀️';
  }
}

// Settings Management
function setupSettings() {
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    notificationsToggle.checked = State.settings.notifications;
    notificationsToggle.addEventListener('change', saveSettings);
  }
  
  const updatesToggle = document.getElementById('updates-toggle');
  if (updatesToggle) {
    updatesToggle.checked = State.settings.updates;
    updatesToggle.addEventListener('change', saveSettings);
  }
  
  const smartModeToggle = document.getElementById('smart-mode-toggle');
  if (smartModeToggle) {
    smartModeToggle.checked = State.settings.smartMode;
    smartModeToggle.addEventListener('change', saveSettings);
  }
  
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
}

function saveSettings() {
  State.settings = {
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'auto',
    notifications: document.getElementById('notifications-toggle')?.checked || true,
    updates: document.getElementById('updates-toggle')?.checked || true,
    smartMode: document.getElementById('smart-mode-toggle')?.checked || true,
    contentQuality: document.getElementById('content-quality')?.value || 'balanced',
    includeTVmaze: document.getElementById('tvmaze-toggle')?.checked || true
  };
  
  localStorage.setItem('cartel_settings', JSON.stringify(State.settings));
  applyTheme(State.settings.theme);
}

// Navigation and Menu
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

// Favorites Management
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
    showNotification('❌ Eliminado de favoritos');
  } else {
    State.favorites.push({
      ...item,
      media_type: item.title ? 'movie' : 'tv',
      added_at: new Date().toISOString()
    });
    showNotification('❤️ Añadido a favoritos');
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

// Watchlist Management
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
    showNotification('❌ Eliminado de la lista');
  } else {
    State.watchlist.push({
      ...item,
      media_type: item.title ? 'movie' : 'tv',
      added_at: new Date().toISOString()
    });
    showNotification('📝 Añadido a por ver');
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

// History Management
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

// Stats Update
function updateStats() {
  const favCount = document.getElementById('fav-count');
  const watchCount = document.getElementById('watch-count');
  
  if (favCount) favCount.textContent = State.favorites.length;
  if (watchCount) watchCount.textContent = State.watchlist.length;
}

// Share Functionality
function setupSharing() {
  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareContent);
  }
}

async function shareContent() {
  if (!State.lastItem) return;
  
  const item = State.lastItem.item;
  const title = item.title || item.name;
  const year = (item.release_date || item.first_air_date)?.substring(0, 4) || '';
  const text = `🎬 ¡Mira "${title}${year ? ` (${year})` : ''}" en Cartel TV!`;
  const url = window.location.href;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Cartel TV',
        text,
        url
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        fallbackShare(text, url);
      }
    }
  } else {
    fallbackShare(text, url);
  }
}

function fallbackShare(text, url) {
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

// Notification System
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

// Network Status
function setupNetworkStatus() {
  window.addEventListener('online', () => {
    State.isOnline = true;
    showNotification('✅ Conexión restaurada', 2000);
  });
  
  window.addEventListener('offline', () => {
    State.isOnline = false;
    showNotification('⚠️ Sin conexión', 4000);
  });
}

// Core Application Functions
function cleanup() {
  if (State.currentAbortController) {
    State.currentAbortController.abort();
    State.currentAbortController = null;
  }
  if (State.autoUpdateTimer) {
    clearTimeout(State.autoUpdateTimer);
    State.autoUpdateTimer = null;
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
}

async function fetchWithRetry(url, retries = CONFIG.MAX_RETRIES, delay = CONFIG.INITIAL_DELAY) {
  for (let i = 0; i <= retries; i++) {
    try {
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

// TVmaze API Functions
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

function generateSignature(items, maxItems = 20) {
  return items
    .slice(0, maxItems)
    .map(item => {
      const id = item.id || 0;
      const date = (item.release_date || item.first_air_date || '0000-00-00').substring(0, 10);
      return `${id}-${date}`;
    })
    .sort()
    .join('|');
}

async function fetchContentByType(type) {
  const now = Date.now();
  const cacheValid = State.cache[type]?.length > 0 && now < State.cacheExpiry[type];

  let language = 'es-ES';
  let rawData = [];

  try {
    switch (type) {
      case 'now_playing':
        const nowPlaying = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/now_playing?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&region=ES`);
        rawData = nowPlaying.results || [];
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
        
      case 'upcoming':
        const upcoming = await fetchWithRetry(`${CONFIG.BASE_URL}/movie/upcoming?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&region=ES`);
        rawData = upcoming.results || [];
        break;
        
      case 'popular':
        const [popMovies, popTVs, tvmazeShows] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/movie/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/tv/popular?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          State.settings.includeTVmaze ? fetchTVmazeShows() : Promise.resolve([])
        ]);
        
        rawData = [
          ...(popMovies.results || []), 
          ...(popTVs.results || []),
          ...tvmazeShows
        ];
        break;
        
      case 'top_rated':
        const [topMovies, topTVs] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/movie/top_rated?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/tv/top_rated?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`)
        ]);
        rawData = [...(topMovies.results || []), ...(topTVs.results || [])];
        break;
        
      case 'trending':
        const [trendingMovies, trendingTVs] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`)
        ]);
        rawData = [...(trendingMovies.results || []), ...(trendingTVs.results || [])];
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

    const newSignature = generateSignature(valid);

    if (cacheValid && State.contentSignatures[type] !== newSignature) {
      console.log(`🔍 Novedades detectadas en "${type}". Actualizando caché.`);
    } else if (cacheValid) {
      return State.cache[type];
    }

    State.cache[type] = valid;
    State.cacheExpiry[type] = now + CONFIG.CACHE_DURATION;
    State.contentSignatures[type] = newSignature;

    return valid;
  } catch (error) {
    console.error(`Error fetching content for ${type}:`, error);
    return State.cache[type] || [];
  }
}

async function getRandomContent(type) {
  const items = await fetchContentByType(type);
  if (items.length === 0) {
    throw new Error('No hay contenido disponible en esta categoría.');
  }
  
  if (State.settings.smartMode && State.history.length > 0) {
    return getSmartRecommendation(items);
  }
  
  return items[Math.floor(Math.random() * items.length)];
}

function getSmartRecommendation(items) {
  const genreWeights = {};
  
  State.history.forEach(item => {
    if (item.genre_ids) {
      item.genre_ids.forEach(genreId => {
        genreWeights[genreId] = (genreWeights[genreId] || 0) + 1;
      });
    }
  });
  
  const scoredItems = items.map(item => {
    let score = 0;
    if (item.genre_ids) {
      item.genre_ids.forEach(genreId => {
        score += genreWeights[genreId] || 0;
      });
    }
    return { item, score };
  });
  
  scoredItems.sort((a, b) => b.score - a.score);
  const topItems = scoredItems.slice(0, Math.ceil(scoredItems.length * 0.3));
  
  return topItems.length > 0 ? 
    topItems[Math.floor(Math.random() * topItems.length)].item : 
    items[Math.floor(Math.random() * items.length)];
}

function renderContent(item) {
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
  
  const title = item.title || item.name;
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

  const overview = document.createElement('p');
  overview.className = 'movie-overview';
  overview.textContent = item.overview?.trim() || 'Sin descripción disponible.';

  container.appendChild(img);
  container.appendChild(titleElement);
  
  if (item.episode) {
    const episodeInfo = document.createElement('div');
    episodeInfo.className = 'episode-info';
    episodeInfo.innerHTML = `
      <strong>Episodio:</strong> ${item.episode.name} 
      (T${item.episode.season} E${item.episode.number})
    `;
    container.appendChild(episodeInfo);
  }
  
  container.appendChild(overview);
  container.classList.add('visible');
  
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
      <button onclick="loadContent(false)" class="action-btn premium-btn">
        Reintentar
      </button>
    </div>
  `;
  container.classList.add('visible');
}

async function loadContent(isAuto = false) {
  if (!State.isPageVisible && isAuto) return;
  if (State.isLoading) return;
  
  State.isLoading = true;
  cleanup();
  State.currentAbortController = new AbortController();

  const btn = document.getElementById('load-btn');
  const loading = document.getElementById('loading');
  const container = document.getElementById('movie-container');

  if (btn) btn.disabled = true;
  if (loading) loading.style.display = 'flex';
  if (container) container.classList.remove('visible');

  try {
    const item = await getRandomContent(State.currentType);
    renderContent(item);
    State.lastUpdate = new Date();
    
    const lastUpdateEl = document.getElementById('last-update');
    if (lastUpdateEl) {
      lastUpdateEl.textContent = `Última: ${formatTime(State.lastUpdate)}`;
    }
    
    updateCountdown();
    
    if (!isAuto) {
      showNotification('🎬 ¡Nueva recomendación cargada!');
    }
  } catch (error) {
    console.error('Error al cargar contenido:', error);
    if (State.lastItem && !isAuto) {
      renderContent(State.lastItem.item);
    } else {
      renderError(error.message || 'No se pudo cargar contenido. Verifica tu conexión.');
    }
  } finally {
    if (loading) loading.style.display = 'none';
    if (btn) btn.disabled = false;
    State.isLoading = false;
    if (isAuto) scheduleAutoUpdate();
  }
}

function updateCountdown() {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;
  
  if (!State.lastUpdate) {
    countdownEl.textContent = '--:--';
    return;
  }
  
  const next = new Date(State.lastUpdate.getTime() + CONFIG.AUTO_UPDATE_INTERVAL);
  const now = new Date();
  
  if (next <= now) {
    countdownEl.textContent = '--:--';
    return;
  }
  
  const diff = next - now;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  countdownEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  setTimeout(updateCountdown, 1000);
}

function scheduleAutoUpdate() {
  cleanup();
  State.autoUpdateTimer = setTimeout(() => loadContent(true), CONFIG.AUTO_UPDATE_INTERVAL);
  updateCountdown();
}

// Smart Filter
function setupSmartFilter() {
  const smartFilter = document.getElementById('smart-filter');
  if (smartFilter) {
    smartFilter.addEventListener('click', () => {
      smartFilter.classList.toggle('active');
      State.settings.smartMode = smartFilter.classList.contains('active');
      saveSettings();
      
      showNotification(
        State.settings.smartMode ? 
        '🤖 Modo inteligente activado' : 
        '🔍 Modo inteligente desactivado'
      );
    });
  }
}

// Shuffle Functionality
function setupShuffle() {
  const shuffleBtn = document.getElementById('shuffle-btn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      loadContent(false);
      showNotification('🔀 Mezclando contenido...');
    });
  }
}

// Refresh Functionality
function setupRefresh() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadContent(false);
    });
  }
}

// Filter Management
function setupFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
      State.currentType = btn.dataset.type;
      
      loadContent(false);
      showNotification(`Filtro cambiado a: ${btn.textContent.trim()}`);
    });
  });
}

// Loading Screen
function setupLoadingScreen() {
  setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    const mainApp = document.getElementById('main-app');
    
    if (loadingScreen && mainApp) {
      loadingScreen.classList.add('fade-out');
      
      setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainApp.classList.remove('hidden');
        mainApp.classList.add('loaded');
        
        loadContent(false);
      }, 500);
    }
  }, 2000);
}

// Initialize Application
function initApp() {
  setupLoadingScreen();
  setupTheme();
  setupSettings();
  setupNavigation();
  setupFavorites();
  setupWatchlist();
  setupSharing();
  setupNotifications();
  setupNetworkStatus();
  setupSmartFilter();
  setupShuffle();
  setupRefresh();
  setupFilters();
  setupInstallPrompt();
  registerServiceWorker();
  
  document.addEventListener('visibilitychange', () => {
    State.isPageVisible = !document.hidden;
    if (State.isPageVisible && State.lastUpdate) {
      const elapsed = Date.now() - State.lastUpdate.getTime();
      const remaining = Math.max(0, CONFIG.AUTO_UPDATE_INTERVAL - elapsed);
      if (!State.autoUpdateTimer) {
        State.autoUpdateTimer = setTimeout(() => loadContent(true), remaining);
      }
    }
  });

  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => loadContent(false));
  }

  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.addEventListener('click', installApp);
  }

  updateCountdown();
  window.addEventListener('beforeunload', cleanup);
  
  console.log('🎬 Cartel TV Premium inicializado correctamente');
}

// Start the application
window.addEventListener('DOMContentLoaded', initApp);

// Export functions for global access
window.toggleFavorite = toggleFavorite;
window.toggleWatchlist = toggleWatchlist;
window.shareContent = shareContent;
window.loadContent = loadContent;