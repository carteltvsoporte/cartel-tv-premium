const API_KEY = 'cdf9b6a0255cebc133ce4d9aaaee8d6d';
const BASE_URL = 'https://api.themoviedb.org/3';
const ANIME_BASE_URL = 'https://api.jikan.moe/v4';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';
const BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w780';
const CACHE_DURATION = 24 * 60 * 60 * 1000;

const CACHE_STRATEGIES = {
    POPULAR: 2 * 60 * 60 * 1000,
    TRENDING: 30 * 60 * 1000,
    SEARCH: 15 * 60 * 1000,
    DETAILS: 24 * 60 * 60 * 1000
};

const SPANISH_DESCRIPTIONS = {
    no_description: "No hay descripción disponible en este momento. Esta película/serie promete ofrecer una experiencia única con su narrativa cautivadora y personajes memorables que te mantendrán enganchado desde el principio hasta el final.",
    no_synopsis: "Sinopsis no disponible. Esta producción destaca por su calidad visual y narrativa, ofreciendo momentos de gran intensidad dramática y escenas que quedarán grabadas en la memoria del espectador.",
    genres: {
        'Action': 'Acción',
        'Adventure': 'Aventura',
        'Animation': 'Animación',
        'Comedy': 'Comedia',
        'Crime': 'Crimen',
        'Documentary': 'Documental',
        'Drama': 'Drama',
        'Family': 'Familiar',
        'Fantasy': 'Fantasía',
        'History': 'Historia',
        'Horror': 'Terror',
        'Music': 'Música',
        'Mystery': 'Misterio',
        'Romance': 'Romance',
        'Science Fiction': 'Ciencia Ficción',
        'TV Movie': 'Película de TV',
        'Thriller': 'Suspense',
        'War': 'Bélica',
        'Western': 'Western'
    },
    status: {
        'Released': 'Estrenada',
        'In Production': 'En Producción',
        'Post Production': 'Postproducción',
        'Returning Series': 'Serie en Curso',
        'Ended': 'Finalizada',
        'Canceled': 'Cancelada'
    }
};

class APIManager {
    constructor() {
        this.endpoints = {
            tmdb: {
                base: BASE_URL,
                key: API_KEY,
                priority: 1,
                rateLimit: 1000
            },
            jikan: {
                base: ANIME_BASE_URL,
                priority: 2,
                rateLimit: 2000
            }
        };
        this.lastRequest = {};
    }

    async request(service, endpoint, options = {}) {
        const config = this.endpoints[service];
        const now = Date.now();
        
        if (this.lastRequest[service] && 
            now - this.lastRequest[service] < config.rateLimit) {
            await new Promise(resolve => 
                setTimeout(resolve, config.rateLimit - (now - this.lastRequest[service]))
            );
        }

        this.lastRequest[service] = Date.now();
        
        const url = service === 'tmdb' 
            ? `${config.base}${endpoint}?api_key=${config.key}&language=es-ES`
            : `${config.base}${endpoint}`;

        return this.fetchWithRetry(url, options);
    }

    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    continue;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    async unifiedSearch(query) {
        const [movies, tv, anime] = await Promise.allSettled([
            this.request('tmdb', `/search/movie&query=${encodeURIComponent(query)}`),
            this.request('tmdb', `/search/tv&query=${encodeURIComponent(query)}`),
            this.request('jikan', `/anime?q=${encodeURIComponent(query)}&limit=12`)
        ]);

        const results = [];
        
        if (movies.status === 'fulfilled') {
            results.push(...movies.value.results.map(item => ({ ...item, type: 'movie' })));
        }
        
        if (tv.status === 'fulfilled') {
            results.push(...tv.value.results.map(item => ({ ...item, type: 'tv' })));
        }
        
        if (anime.status === 'fulfilled') {
            results.push(...anime.value.data.map(item => ({ ...item, type: 'anime' })));
        }

        return results.sort((a, b) => (b.popularity || b.score || 0) - (a.popularity || a.score || 0));
    }
}

class RecommendationEngine {
    constructor() {
        this.userPreferences = this.loadPreferences();
    }

    loadPreferences() {
        return JSON.parse(localStorage.getItem('ctvp_user_preferences') || '{}');
    }

    savePreferences(preferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
        localStorage.setItem('ctvp_user_preferences', JSON.stringify(this.userPreferences));
    }

    async getRecommendations() {
        const preferences = this.userPreferences;
        const recommendations = [];

        if (preferences.favoriteGenres) {
            for (const genre of preferences.favoriteGenres.slice(0, 3)) {
                const movies = await apiManager.request('tmdb', 
                    `/discover/movie&with_genres=${genre.id}&sort_by=popularity.desc`);
                recommendations.push(...movies.results.slice(0, 5));
            }
        }

        return [...new Map(recommendations.map(item => [item.id, item])).values()]
            .slice(0, 20);
    }
}

const apiManager = new APIManager();
const recommendationEngine = new RecommendationEngine();

const modeSelector = document.querySelector('.mode-selector-container');
const modeOptions = document.querySelectorAll('.mode-option');
const navCategories = document.querySelectorAll('.nav-category');
const navSubitems = document.querySelectorAll('.nav-subitem');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const contentGrid = document.getElementById('content-grid');
const sectionTitle = document.getElementById('section-title');
const sectionSubtitle = document.getElementById('section-subtitle');
const modal = document.getElementById('detail-modal');
const modalClose = document.getElementById('modal-close');
const userMenuBtn = document.getElementById('user-menu-btn');
const logoutBtn = document.getElementById('logout-btn');
const viewModeButtons = document.querySelectorAll('.btn-view-mode');
const filterBtn = document.getElementById('filter-btn');

let currentCategory = 'popular';
let currentType = 'movie';
let currentMode = 'movies';
let currentView = 'grid';

const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
        }
    });
}, {
    rootMargin: '50px 0px',
    threshold: 0.1
});

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuthentication()) {
        window.location.href = 'auth-modal.html';
        return;
    }
    
    initializeApp();
    setupEventListeners();
    setupPeriodicUpdates();
    updateUserUI();
});

function initializeApp() {
    modeSelector.style.display = 'flex';
    setCurrentMode('movies');
    loadContent();
}

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
    modeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const mode = option.dataset.mode;
            setCurrentMode(mode);
            modeSelector.style.display = 'none';
        });
    });
    
    navSubitems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            currentType = item.dataset.type;
            currentCategory = item.dataset.category;
            loadContent();
            updateNavigationUI();
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
    
    userMenuBtn.addEventListener('click', toggleUserMenu);
    logoutBtn.addEventListener('click', logout);
    
    viewModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            setCurrentView(view);
        });
    });
    
    filterBtn.addEventListener('click', showFilterOptions);
    
    document.getElementById('favorites-link').addEventListener('click', showFavorites);
    document.getElementById('btn-favorite').addEventListener('click', handleFavorite);
}

function setCurrentMode(mode) {
    currentMode = mode;
    
    modeOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.mode === mode);
    });
    
    updateNavigationForMode(mode);
    loadContent();
}

function setCurrentView(view) {
    currentView = view;
    
    viewModeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    applyContentView();
}

function updateNavigationForMode(mode) {
    navCategories.forEach(category => {
        const categoryMode = category.dataset.category;
        if (categoryMode === 'movies' || categoryMode === 'tv') {
            category.style.display = mode === 'movies' ? 'block' : 'none';
        } else if (categoryMode === 'anime') {
            category.style.display = mode === 'anime' ? 'block' : 'none';
        }
    });
    
    if (mode === 'movies') {
        currentType = 'movie';
        currentCategory = 'popular';
    } else {
        currentType = 'anime';
        currentCategory = 'airing';
    }
    
    updateNavigationUI();
}

function updateNavigationUI() {
    navSubitems.forEach(item => {
        const isActive = item.dataset.type === currentType && 
                        item.dataset.category === currentCategory;
        item.classList.toggle('active', isActive);
    });
}

async function loadContent() {
    const cacheKey = `ctvp_${currentMode}_${currentType}_${currentCategory}`;
    
    if (isCacheValid(cacheKey)) {
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            displayContent(cachedData);
            return;
        }
    }
    
    try {
        showLoading();
        
        let data;
        if (currentMode === 'movies') {
            const response = await apiManager.request('tmdb', `/${currentType}/${currentCategory}`);
            const result = await response.json();
            data = result.results || [];
        } else {
            let endpoint = '';
            
            if (currentCategory === 'favorite') {
                endpoint = 'top/anime?filter=favorite';
            } else if (['tv', 'movie', 'ova', 'special'].includes(currentCategory)) {
                endpoint = `top/anime?type=${currentCategory}`;
            } else {
                endpoint = `top/anime?filter=${currentCategory}`;
            }
            
            const response = await apiManager.request('jikan', `/${endpoint}&limit=24`);
            const animeData = await response.json();
            data = animeData.data || [];
        }
        
        saveToCache(cacheKey, data);
        displayContent(data);
    } catch (error) {
        console.error('Error loading content:', error);
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            displayContent(cachedData);
            showNotification('Usando datos en caché', 'warning');
        } else {
            showEmptyState('Error al cargar contenido. Intenta más tarde.');
        }
    }
}

function displayContent(items) {
    contentGrid.innerHTML = '';
    
    if (!items || items.length === 0) {
        showEmptyState('No se encontró contenido en esta categoría.');
        return;
    }
    
    items.forEach(item => {
        const card = createContentCard(item);
        contentGrid.appendChild(card);
    });
    
    applyContentView();
    updateSectionTitle();
}

function createContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.tabIndex = 0;
    
    let imageUrl, title, year, rating, badge, type;
    
    if (currentMode === 'movies') {
        imageUrl = item.poster_path 
            ? `${IMAGE_BASE_URL}${item.poster_path}`
            : 'https://via.placeholder.com/300x450/161b22/8b949e?text=Imagen+No+Disponible';
        
        title = currentType === 'movie' ? item.title : item.name;
        const releaseDate = currentType === 'movie' ? item.release_date : item.first_air_date;
        year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
        rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        badge = currentType === 'movie' ? 'Película' : 'Serie';
        type = currentType;
    } else {
        imageUrl = item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || 
                  'https://via.placeholder.com/300x450/161b22/00adb5?text=Anime';
        
        if (imageUrl.includes('cdn.myanimelist.net')) {
            imageUrl = imageUrl.replace('/large/', '/medium/').replace('.jpg', 'l.jpg');
        }
        
        title = item.title || item.name || 'Título no disponible';
        year = item.year || item.aired?.prop?.from?.year || 'N/A';
        rating = item.score ? item.score.toFixed(1) : 'N/A';
        badge = item.type || 'Anime';
        type = 'anime';
    }
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy" decoding="async">
        <div class="card-badge">${badge}</div>
        <div class="card-info">
            <h3 class="card-title">${title}</h3>
            <div class="card-meta">
                <span>${year}</span>
                <div class="card-rating">
                    <svg width="12" height="12" viewBox="0 0 24 24">
                        <use href="#star-icon"></use>
                    </svg>
                    <span>${rating}</span>
                </div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showDetails(item, type));
    card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') showDetails(item, type);
    });
    
    return card;
}

function applyContentView() {
    const cards = contentGrid.querySelectorAll('.content-card');
    cards.forEach(card => {
        if (currentView === 'list') {
            card.style.display = 'flex';
            card.style.flexDirection = 'row';
            card.querySelector('.card-image').style.width = '120px';
            card.querySelector('.card-image').style.height = '180px';
            card.querySelector('.card-info').style.flex = '1';
        } else {
            card.style.display = 'block';
            card.querySelector('.card-image').style.width = '100%';
            card.querySelector('.card-image').style.height = '270px';
        }
    });
}

async function showDetails(item, type) {
    const cacheKey = `ctvp_details_${currentMode}_${type}_${item.id || item.mal_id}`;
    
    try {
        let details = getFromCache(cacheKey);
        
        if (!details) {
            if (currentMode === 'movies') {
                const response = await apiManager.request('tmdb', `/${type}/${item.id}`);
                details = await response.json();
            } else {
                const response = await apiManager.request('jikan', `/anime/${item.mal_id}`);
                const animeData = await response.json();
                details = animeData.data;
            }
            saveToCache(cacheKey, details);
        }
        
        populateModal(details, type);
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading details:', error);
        showNotification('Error al cargar los detalles', 'error');
    }
}

function populateModal(details, type) {
    let backdropUrl, posterUrl, title, releaseDate, year, rating, overview, genres, runtime, status;
    
    if (currentMode === 'movies') {
        backdropUrl = details.backdrop_path 
            ? `${BACKDROP_BASE_URL}${details.backdrop_path}`
            : 'https://via.placeholder.com/780x439/161b22/e94560?text=Imagen+No+Disponible';
        
        posterUrl = details.poster_path 
            ? `${IMAGE_BASE_URL}${details.poster_path}`
            : 'https://via.placeholder.com/300x450/161b22/e94560?text=Imagen+No+Disponible';
        
        title = type === 'movie' ? details.title : details.name;
        releaseDate = type === 'movie' ? details.release_date : details.first_air_date;
        year = releaseDate ? releaseDate.substring(0, 4) : 'N/A';
        rating = details.vote_average ? details.vote_average.toFixed(1) : 'N/A';
        overview = getDetailedSpanishDescription(details, type);
        genres = details.genres || [];
        runtime = type === 'movie' ? details.runtime : null;
        status = SPANISH_DESCRIPTIONS.status[details.status] || details.status || 'N/A';
    } else {
        backdropUrl = details.images?.jpg?.large_image_url || 
                     'https://via.placeholder.com/780x439/161b22/00adb5?text=Anime';
        
        posterUrl = details.images?.jpg?.large_image_url || details.images?.jpg?.image_url || 
                   'https://via.placeholder.com/300x450/161b22/00adb5?text=Anime';
        
        if (backdropUrl.includes('cdn.myanimelist.net')) {
            backdropUrl = backdropUrl.replace('/large/', '/medium/');
        }
        if (posterUrl.includes('cdn.myanimelist.net')) {
            posterUrl = posterUrl.replace('/large/', '/medium/').replace('.jpg', 'l.jpg');
        }
        
        title = details.title || details.title_english || 'Título no disponible';
        year = details.year || details.aired?.prop?.from?.year || 'N/A';
        rating = details.score ? details.score.toFixed(1) : 'N/A';
        overview = getDetailedAnimeDescription(details);
        genres = details.genres || [];
        runtime = details.duration || 'N/A';
        status = details.status || 'N/A';
    }
    
    modalBackdrop.src = backdropUrl;
    modalBackdrop.alt = `Fondo de ${title}`;
    modalPoster.src = posterUrl;
    modalPoster.alt = `Póster de ${title}`;
    modalTitle.textContent = title;
    
    let metaHTML = `<span>${year}</span>`;
    
    if (currentMode === 'movies') {
        if (type === 'movie') {
            metaHTML += `<span>${runtime || 'N/A'} min</span>`;
        } else {
            metaHTML += `<span>${details.number_of_seasons || 'N/A'} temporadas</span>`;
        }
    } else {
        metaHTML += `<span>${runtime}</span>`;
    }
    
    metaHTML += `<span>★ ${rating}</span>`;
    metaHTML += `<span>${status}</span>`;
    
    document.getElementById('modal-meta').innerHTML = metaHTML;
    document.getElementById('modal-overview').textContent = overview;
    
    const modalGenres = document.getElementById('modal-genres');
    modalGenres.innerHTML = '';
    if (genres.length > 0) {
        genres.forEach(genre => {
            const genreName = SPANISH_DESCRIPTIONS.genres[genre.name] || genre.name || genre;
            const genreTag = document.createElement('span');
            genreTag.className = 'genre-tag';
            genreTag.textContent = genreName;
            modalGenres.appendChild(genreTag);
        });
    }
    
    populateAdditionalDetails(details, type);
}

function getDetailedSpanishDescription(details, type) {
    let overview = details.overview;
    
    if (!overview || overview.trim() === '') {
        const title = type === 'movie' ? details.title : details.name;
        const genres = details.genres?.map(g => SPANISH_DESCRIPTIONS.genres[g.name] || g.name).join(', ') || 'varios géneros';
        
        return `${title} es una ${type === 'movie' ? 'película' : 'serie'} de ${genres} que ha capturado la atención del público y la crítica. Con una narrativa cuidadosamente construida y personajes profundamente desarrollados, esta producción ofrece una experiencia cinematográfica memorable. La dirección artística y la fotografía crean una atmósfera única que complementa perfectamente la trama. Los actores principales ofrecen interpretaciones convincentes que dan vida a personajes complejos y fascinantes. La banda sonora y el diseño de sonido contribuyen significativamente a la inmersión del espectador en este universo narrativo. Sin duda, una obra que dejará una huella durarada en quienes tengan la oportunidad de disfrutarla.`;
    }
    
    if (overview.length < 200) {
        const enhancedText = ` ${overview}. Esta producción se destaca por su excelente dirección, actuaciones memorables y una narrativa que mantiene al espectador completamente inmerso desde el inicio hasta el final. Cada escena está cuidadosamente elaborada para maximizar el impacto emocional y narrativo, creando una experiencia cinematográfica verdaderamente envolvente.`;
        overview += enhancedText;
    }
    
    return overview;
}

function getDetailedAnimeDescription(details) {
    let synopsis = details.synopsis;
    
    if (!synopsis || synopsis.trim() === '') {
        const title = details.title || details.title_english || 'esta serie';
        const genres = details.genres?.map(g => g.name).join(', ') || 'animación japonesa';
        
        return `${title} es un anime del género ${genres} que ha conquistado a audiencias worldwide. Con una animación de alta calidad y una dirección artística excepcional, esta serie transporta a los espectadores a un mundo lleno de personajes carismáticos y situaciones emocionantes. La evolución de los personajes a lo largo de la trama es notable, mostrando un desarrollo psicológico profundo y creíble. Las batallas y secuencias de acción están coreografiadas con maestría, mientras que los momentos dramáticos están cargados de emotividad. La banda sonora complementa perfectamente cada escena, intensificando las emociones y la inmersión. Una obra imprescindible para los amantes del anime que buscan historias bien contadas con personajes inolvidables.`;
    }
    
    if (synopsis.length < 250) {
        const enhancedText = ` ${synopsis}. Este anime se caracteriza por su excepcional calidad de animación, dirección artística meticulosa y personajes profundamente desarrollados que evolucionan de manera orgánica a lo largo de la serie. Cada arco argumental está cuidadosamente construido para mantener la tensión narrativa y el interés del espectador, combinando acción trepidante con momentos de gran carga emocional. La banda sonora, compuesta específicamente para la serie, realza cada escena creando una experiencia auditiva memorable. Sin duda, una obra que representa lo mejor de la animación japonesa contemporánea.`;
        synopsis += enhancedText;
    }
    
    return synopsis;
}

function populateAdditionalDetails(details, type) {
    const modalDetails = document.getElementById('modal-details');
    modalDetails.innerHTML = '';
    
    if (currentMode === 'movies') {
        if (type === 'movie') {
            modalDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Presupuesto</span>
                    <span class="detail-value">${details.budget ? `$${details.budget.toLocaleString('es-ES')}` : 'No disponible'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Ingresos</span>
                    <span class="detail-value">${details.revenue ? `$${details.revenue.toLocaleString('es-ES')}` : 'No disponible'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Idioma Original</span>
                    <span class="detail-value">${details.original_language ? details.original_language.toUpperCase() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Votos</span>
                    <span class="detail-value">${details.vote_count ? details.vote_count.toLocaleString('es-ES') : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Popularidad</span>
                    <span class="detail-value">${details.popularity ? Math.round(details.popularity) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value">${SPANISH_DESCRIPTIONS.status[details.status] || details.status || 'N/A'}</span>
                </div>
            `;
        } else {
            modalDetails.innerHTML = `
                <div class="detail-item">
                    <span class="detail-label">Episodios</span>
                    <span class="detail-value">${details.number_of_episodes || 'En emisión'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Temporadas</span>
                    <span class="detail-value">${details.number_of_seasons || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Idioma Original</span>
                    <span class="detail-value">${details.original_language ? details.original_language.toUpperCase() : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Votos</span>
                    <span class="detail-value">${details.vote_count ? details.vote_count.toLocaleString('es-ES') : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Popularidad</span>
                    <span class="detail-value">${details.popularity ? Math.round(details.popularity) : 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Estado</span>
                    <span class="detail-value">${SPANISH_DESCRIPTIONS.status[details.status] || details.status || 'N/A'}</span>
                </div>
            `;
        }
    } else {
        modalDetails.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Episodios</span>
                <span class="detail-value">${details.episodes || 'En emisión'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Estudio</span>
                <span class="detail-value">${details.studios && details.studios.length > 0 ? details.studios[0].name : 'No disponible'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Emitido</span>
                <span class="detail-value">${details.aired?.string || 'No disponible'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Puntuación</span>
                <span class="detail-value">${details.scored_by ? details.scored_by.toLocaleString('es-ES') + ' usuarios' : 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Clasificación</span>
                <span class="detail-value">${details.rating || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Fuente</span>
                <span class="detail-value">${details.source || 'Original'}</span>
            </div>
        `;
    }
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    const cacheKey = `ctvp_search_${currentMode}_${query.toLowerCase().replace(/\s+/g, '_')}`;
    
    try {
        let allResults = getFromCache(cacheKey);
        
        if (!allResults) {
            showLoading();
            allResults = await apiManager.unifiedSearch(query);
            saveToCache(cacheKey, allResults);
        }
        
        displaySearchResults(allResults, query);
    } catch (error) {
        console.error('Error performing search:', error);
        showEmptyState('Error en la búsqueda. Intenta más tarde.');
    }
}

function displaySearchResults(results, query) {
    contentGrid.innerHTML = '';
    sectionTitle.textContent = `Resultados para: "${query}"`;
    sectionSubtitle.textContent = `${results.length} resultados encontrados`;
    
    if (results.length === 0) {
        showEmptyState('No se encontraron resultados para tu búsqueda.');
    } else {
        results.forEach(item => {
            const card = createContentCard(item);
            contentGrid.appendChild(card);
        });
    }
    applyContentView();
}

function updateSectionTitle() {
    const titles = {
        'movies': {
            'movie_popular': 'Películas Populares',
            'movie_now_playing': 'Películas en Cines',
            'movie_top_rated': 'Películas Mejor Valoradas',
            'movie_upcoming': 'Próximos Estrenos',
            'movie_trending': 'Películas en Tendencia',
            'tv_popular': 'Series Populares',
            'tv_top_rated': 'Series Mejor Valoradas',
            'tv_on_the_air': 'Series en Emisión',
            'tv_airing_today': 'Series que Estrenan Hoy',
            'tv_trending': 'Series en Tendencia'
        },
        'anime': {
            'anime_airing': 'Anime en Emisión',
            'anime_upcoming': 'Anime Próximo',
            'anime_bypopularity': 'Anime Más Popular',
            'anime_favorite': 'Anime Favorito',
            'anime_movie': 'Películas de Anime',
            'anime_ova': 'OVA de Anime',
            'anime_special': 'Especiales de Anime',
            'anime_tv': 'Series de Anime'
        }
    };
    
    const titleKey = `${currentType}_${currentCategory}`;
    sectionTitle.textContent = titles[currentMode][titleKey] || 'Contenido Destacado';
    sectionSubtitle.textContent = currentMode === 'movies' ? 'Descubre las mejores películas y series' : 'Explora el mundo del anime';
}

function updateUserUI() {
    const userSession = localStorage.getItem('ctvp_user_session');
    if (userSession) {
        try {
            const user = JSON.parse(userSession);
            document.getElementById('user-name').textContent = user.name;
            document.getElementById('user-display-name').textContent = user.name;
        } catch (e) {
            console.error('Error mostrando información de usuario:', e);
        }
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('active');
}

function logout() {
    localStorage.removeItem('ctvp_user_session');
    window.location.href = 'auth-modal.html';
}

function showFilterOptions() {
    showNotification('Funcionalidad de filtros en desarrollo', 'info');
}

function showFavorites() {
    const favorites = JSON.parse(localStorage.getItem('ctvp_favorites') || '{}');
    const favoriteItems = Object.values(favorites);
    
    if (favoriteItems.length === 0) {
        showEmptyState('No tienes favoritos guardados.');
    } else {
        displayContent(favoriteItems);
        sectionTitle.textContent = 'Tus Favoritos';
        sectionSubtitle.textContent = `${favoriteItems.length} elementos guardados`;
    }
}

function handleFavorite() {
    const title = document.getElementById('modal-title').textContent;
    const currentItem = {
        id: Date.now(),
        title: title,
        type: currentType,
        addedAt: new Date().toISOString()
    };
    
    toggleFavorite(currentItem, currentType);
}

function toggleFavorite(item, type) {
    const favorites = JSON.parse(localStorage.getItem('ctvp_favorites') || '{}');
    const key = `${type}_${item.id || item.mal_id}`;
    
    if (favorites[key]) {
        delete favorites[key];
        showNotification('Eliminado de favoritos', 'info');
        document.getElementById('btn-favorite').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <use href="#heart-icon"></use>
            </svg>
            Añadir a Favoritos
        `;
    } else {
        favorites[key] = {
            ...item,
            type,
            addedAt: new Date().toISOString()
        };
        showNotification('Añadido a favoritos', 'success');
        document.getElementById('btn-favorite').innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <use href="#heart-icon"></use>
            </svg>
            Quitar de Favoritos
        `;
    }
    
    localStorage.setItem('ctvp_favorites', JSON.stringify(favorites));
}

function showLoading() {
    contentGrid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
        </div>
    `;
}

function showEmptyState(message) {
    contentGrid.innerHTML = `
        <div class="empty-state">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
            <h3>No hay contenido disponible</h3>
            <p>${message}</p>
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
    }, 4000);
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

function preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('.card-image[data-src]:nth-child(-n+8)');
    criticalImages.forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove('lazy');
    });
}