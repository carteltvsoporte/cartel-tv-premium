const CONFIG = {
  TMDB_API_KEY: 'cdf9b6a0255cebc133ce4d9aaaee8d6d',
  TVMAZE_API_KEY: 'zA6qewWidZMGR1slbPXX-REnvSJ02VG2',
  BASE_URL: 'https://api.themoviedb.org/3',
  TVMAZE_BASE_URL: 'https://api.tvmaze.com',
  IMG_BASE_URL: 'https://image.tmdb.org/t/p/w500',
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  CACHE_DURATION: 15 * 60 * 1000,
  ACCESS_CODE: 'TV2025'
};

const AUTHORIZED_USERS = [
  { name: "Ana García López", phone: "612345678", password: "Ana2024!" },
  { name: "Carlos Martínez Ruiz", phone: "623456789", password: "Carlos#123" },
  { name: "María Fernández Sol", phone: "634567890", password: "Maria$456" },
  { name: "José Rodríguez Mar", phone: "645678901", password: "Jose789%" },
  { name: "Laura Sánchez Gil", phone: "656789012", password: "Laura&012" },
  { name: "David Pérez Torres", phone: "667890123", password: "David345@" },
  { name: "Elena Gómez Díaz", phone: "678901234", password: "Elena678!" },
  { name: "Miguel López Vega", phone: "689012345", password: "Miguel901#" },
  { name: "Sofía Martín Castro", phone: "690123456", password: "Sofia234$" },
  { name: "Javier Romero Navarro", phone: "601234567", password: "Javier567%" }
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
    includeTVmaze: true
  },
  isOnline: navigator.onLine
};

function setupAccessModal() {
  const accessModal = document.getElementById('access-modal');
  const accessNameInput = document.getElementById('access-name');
  const accessPhoneInput = document.getElementById('access-phone');
  const accessPasswordInput = document.getElementById('access-password');
  const submitButton = document.getElementById('submit-code');
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
    const enteredPassword = accessPasswordInput.value.trim();
    
    if (!enteredName || !enteredPhone || !enteredPassword) {
      errorMessage.textContent = 'Todos los campos son obligatorios';
      errorMessage.classList.remove('hidden');
      return;
    }
    
    const isValidUser = AUTHORIZED_USERS.some(user => 
      user.name.toLowerCase() === enteredName.toLowerCase() &&
      user.phone === enteredPhone &&
      user.password === enteredPassword
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
      accessPasswordInput.value = '';
      accessPasswordInput.focus();
    }
  });
  
  [accessNameInput, accessPhoneInput, accessPasswordInput].forEach(input => {
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
}

function saveSettings() {
  State.settings = {
    theme: document.querySelector('input[name="theme"]:checked')?.value || 'azul',
    contentQuality: document.getElementById('content-quality')?.value || 'balanced',
    includeTVmaze: document.getElementById('tvmaze-toggle')?.checked || true
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

      case 'upcoming_tv':
        const upcomingTV = await fetchWithRetry(`${CONFIG.BASE_URL}/tv/on_the_air?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`);
        rawData = upcomingTV.results || [];
        break;
        
      case 'tvmaze_shows':
        rawData = State.settings.includeTVmaze ? await fetchTVmazeShows() : [];
        break;

      case 'tvmaze_schedule':
        rawData = State.settings.includeTVmaze ? await fetchTVmazeSchedule() : [];
        break;
        
      case 'trending':
        const [trendingMovies, trendingTVs] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/movie/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`)
        ]);
        rawData = [...(trendingMovies.results || []), ...(trendingTVs.results || [])];
        break;

      case 'latest':
        const [latestMovies, latestTV] = await Promise.all([
          fetchWithRetry(`${CONFIG.BASE_URL}/movie/latest?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`),
          fetchWithRetry(`${CONFIG.BASE_URL}/tv/latest?api_key=${CONFIG.TMDB_API_KEY}&language=${language}`)
        ]);
        rawData = [latestMovies, latestTV].filter(item => item && (item.title || item.name));
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

      case 'documentary':
        const documentary = await fetchWithRetry(`${CONFIG.BASE_URL}/discover/movie?api_key=${CONFIG.TMDB_API_KEY}&language=${language}&with_genres=99`);
        rawData = documentary.results || [];
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
      renderContent(items[randomIndex]);
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