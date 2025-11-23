const API_KEY = 'cdf9b6a0255cebc133ce4d9aaaee8d6d';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const navToggle = document.getElementById('nav-toggle');
const navContainer = document.getElementById('nav-container');
const navItems = document.querySelectorAll('.nav-item');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const contentGrid = document.getElementById('content-grid');
const sectionTitle = document.getElementById('section-title');
const modal = document.getElementById('detail-modal');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalPoster = document.getElementById('modal-poster');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalOverview = document.getElementById('modal-overview');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

let currentCategory = 'popular';
let currentType = 'movie';

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) {
        window.location.href = 'auth-modal.html';
        return;
    }
    
    loadContent();
    setupEventListeners();
    setupPeriodicUpdates();
    updateUserUI();
});

function checkAuthentication() {
    const userSession = localStorage.getItem('ctvp_user_session');
    if (!userSession) return false;
    
    try {
        const session = JSON.parse(userSession);
        const loginTime = new Date(session.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        return session && session.name && session.phone && hoursDiff < 24;
    } catch (e) {
        return false;
    }
}

function setupEventListeners() {
    navToggle.addEventListener('click', () => {
        navContainer.classList.toggle('active');
    });
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            navContainer.classList.remove('active');
            
            currentType = item.dataset.type;
            currentCategory = item.dataset.category;
            
            loadContent();
        });
    });
    
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    modalClose.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
    
    logoutBtn.addEventListener('click', logout);
}

async function loadContent() {
    const cacheKey = `ctvp_${currentType}_${currentCategory}`;
    
    if (isCacheValid(cacheKey)) {
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            displayContent(cachedData);
            return;
        }
    }
    
    try {
        showLoading();
        const response = await fetch(
            `${BASE_URL}/${currentType}/${currentCategory}?api_key=${API_KEY}&language=es-ES&page=1`
        );
        const data = await response.json();
        
        saveToCache(cacheKey, data.results);
        displayContent(data.results);
    } catch (error) {
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            displayContent(cachedData);
            showNotification('Usando datos en caché', 'warning');
        } else {
            contentGrid.innerHTML = '<p>Error al cargar contenido</p>';
        }
    }
}

function displayContent(items) {
    contentGrid.innerHTML = '';
    
    items.forEach(item => {
        const card = createContentCard(item);
        contentGrid.appendChild(card);
    });
    
    updateSectionTitle();
}

function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.tabIndex = 0;
    
    const imageUrl = item.poster_path 
        ? `${IMAGE_BASE_URL}${item.poster_path}`
        : 'https://via.placeholder.com/150x225/1a1a2e/e94560?text=Sin+imagen';
    
    const title = currentType === 'movie' ? item.title : item.name;
    const releaseDate = currentType === 'movie' ? item.release_date : item.first_air_date;
    const year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy">
        <div class="card-info">
            <h3 class="card-title">${title}</h3>
            <div class="card-meta">
                <span>${year}</span>
                <span>★ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showDetails(item));
    card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') showDetails(item);
    });
    
    return card;
}

async function showDetails(item) {
    const cacheKey = `ctvp_details_${currentType}_${item.id}`;
    
    try {
        let details = getFromCache(cacheKey);
        
        if (!details) {
            const response = await fetch(
                `${BASE_URL}/${currentType}/${item.id}?api_key=${API_KEY}&language=es-ES`
            );
            details = await response.json();
            saveToCache(cacheKey, details);
        }
        
        const backdropUrl = details.backdrop_path 
            ? `${BACKDROP_BASE_URL}${details.backdrop_path}`
            : 'https://via.placeholder.com/1280x720/1a1a2e/e94560?text=Sin+imagen';
        
        const posterUrl = details.poster_path 
            ? `${IMAGE_BASE_URL}${details.poster_path}`
            : 'https://via.placeholder.com/150x225/1a1a2e/e94560?text=Sin+imagen';
        
        const title = currentType === 'movie' ? details.title : details.name;
        const releaseDate = currentType === 'movie' ? details.release_date : details.first_air_date;
        const year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
        
        modalBackdrop.src = backdropUrl;
        modalBackdrop.alt = `Fondo de ${title}`;
        modalPoster.src = posterUrl;
        modalPoster.alt = `Póster de ${title}`;
        modalTitle.textContent = title;
        
        let metaHTML = `<span>${year}</span>`;
        
        if (currentType === 'movie') {
            metaHTML += `<span>${details.runtime || 'N/A'} min</span>`;
        } else {
            metaHTML += `<span>${details.number_of_seasons || 'N/A'} temporadas</span>`;
        }
        
        metaHTML += `<span>★ ${details.vote_average ? details.vote_average.toFixed(1) : 'N/A'}</span>`;
        
        modalMeta.innerHTML = metaHTML;
        modalOverview.textContent = details.overview || 'No hay descripción disponible.';
        
        modal.style.display = 'block';
    } catch (error) {
        showNotification('Error al cargar los detalles', 'error');
    }
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    const cacheKey = `ctvp_search_${query.toLowerCase().replace(/\s+/g, '_')}`;
    
    try {
        let allResults = getFromCache(cacheKey);
        
        if (!allResults) {
            showLoading();
            
            const [movieResponse, tvResponse] = await Promise.all([
                fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1`),
                fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&language=es-ES&query=${encodeURIComponent(query)}&page=1`)
            ]);
            
            const movieData = await movieResponse.json();
            const tvData = await tvResponse.json();
            
            allResults = [
                ...movieData.results.map(item => ({ ...item, type: 'movie' })),
                ...tvData.results.map(item => ({ ...item, type: 'tv' }))
            ].sort((a, b) => b.popularity - a.popularity);
            
            saveToCache(cacheKey, allResults);
        }
        
        displaySearchResults(allResults, query);
    } catch (error) {
        contentGrid.innerHTML = '<p>Error en la búsqueda</p>';
    }
}

function displaySearchResults(results, query) {
    contentGrid.innerHTML = '';
    sectionTitle.textContent = `Resultados para: "${query}"`;
    
    if (results.length === 0) {
        contentGrid.innerHTML = '<p>No se encontraron resultados</p>';
    } else {
        results.forEach(item => {
            const card = createContentCard(item);
            contentGrid.appendChild(card);
        });
    }
}

function updateSectionTitle() {
    const titles = {
        'movie_popular': 'Películas Populares',
        'movie_now_playing': 'Películas en Cines',
        'movie_top_rated': 'Películas Mejor Valoradas',
        'movie_upcoming': 'Próximos Estrenos',
        'tv_popular': 'Series Populares',
        'tv_top_rated': 'Series Mejor Valoradas'
    };
    
    sectionTitle.textContent = titles[`${currentType}_${currentCategory}`] || 'Contenido';
}

function updateUserUI() {
    const userSession = localStorage.getItem('ctvp_user_session');
    if (userSession) {
        try {
            const user = JSON.parse(userSession);
            userInfo.innerHTML = `<span>Hola, ${user.name}</span>`;
        } catch (e) {
            console.error('Error mostrando información de usuario:', e);
        }
    }
}

function logout() {
    localStorage.removeItem('ctvp_user_session');
    window.location.href = 'auth-modal.html';
}

function showLoading() {
    contentGrid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function isCacheValid(cacheKey) {
    const cacheData = localStorage.getItem(cacheKey);
    if (!cacheData) return false;
    
    try {
        const { timestamp } = JSON.parse(cacheData);
        return (Date.now() - timestamp) < CACHE_DURATION;
    } catch (e) {
        return false;
    }
}

function saveToCache(cacheKey, data) {
    const cacheData = { data, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
}

function getFromCache(cacheKey) {
    try {
        const cacheData = JSON.parse(localStorage.getItem(cacheKey));
        return cacheData ? cacheData.data : null;
    } catch (e) {
        return null;
    }
}

function setupPeriodicUpdates() {
    setInterval(() => {
        const cacheKeys = Object.keys(localStorage).filter(key => key.startsWith('ctvp_'));
        let needsUpdate = false;
        
        for (const key of cacheKeys) {
            if (!isCacheValid(key)) {
                needsUpdate = true;
                break;
            }
        }
        
        if (needsUpdate) {
            loadContent();
        }
    }, 60 * 60 * 1000);
}