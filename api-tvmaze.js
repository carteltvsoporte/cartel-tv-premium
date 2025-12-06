let tvShowsData = [];
let filteredTVShows = [];
let categoriesTV = new Map();
let updateInterval;
let isUpdating = false;

const TVMAZE_CACHE_KEY = 'carteltv_tvshows_v3';
const TVMAZE_CACHE_TIME = 'carteltv_tvshows_time_v3';
const TVMAZE_CATEGORIES_KEY = 'carteltv_tv_categories_v3';
const UPDATE_INTERVAL = 3600000;

function loadTVMazeShows(forceRefresh = false) {
    const tvShowsGrid = document.getElementById('tv-shows-grid');
    const totalShowsSpan = document.getElementById('total-shows');
    
    if (!tvShowsGrid || !totalShowsSpan) return;
    
    if (isUpdating && !forceRefresh) return;
    isUpdating = true;
    
    tvShowsGrid.innerHTML = `
        <div class="loading-placeholder" role="status" aria-label="Cargando series">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <p>Cargando series de TV...</p>
        </div>
    `;
    
    loadTVData(forceRefresh)
        .then(() => {
            totalShowsSpan.textContent = tvShowsData.length.toLocaleString();
            displayTVShows(tvShowsData);
            updateTVFilterButtons();
            updateTVFeaturedContent();
            isUpdating = false;
        })
        .catch(error => {
            console.error('Error en loadTVMazeShows:', error);
            loadTVFallbackData();
            isUpdating = false;
        });
}

async function loadTVData(forceRefresh) {
    if (!forceRefresh && await shouldUseCache(TVMAZE_CACHE_TIME, UPDATE_INTERVAL)) {
        const cachedData = localStorage.getItem(TVMAZE_CACHE_KEY);
        const cachedCategories = localStorage.getItem(TVMAZE_CATEGORIES_KEY);
        
        if (cachedData && cachedCategories) {
            tvShowsData = JSON.parse(cachedData);
            categoriesTV = new Map(JSON.parse(cachedCategories));
            filteredTVShows = [...tvShowsData];
            return;
        }
    }
    
    const endpoints = [
        'https://api.tvmaze.com/shows?page=0',
        'https://api.tvmaze.com/shows?page=1',
        'https://api.tvmaze.com/schedule?country=US'
    ];
    
    const responses = await Promise.allSettled(
        endpoints.map(url => 
            fetch(url, {
                signal: AbortSignal.timeout(10000),
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'CARTEL-TV/1.0'
                }
            }).then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
        )
    );
    
    let allShows = [];
    
    responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
            const data = response.value;
            if (Array.isArray(data)) {
                if (index === 2) {
                    data.forEach(item => {
                        if (item.show && !allShows.find(s => s.id === item.show.id)) {
                            allShows.push(item.show);
                        }
                    });
                } else {
                    allShows = [...allShows, ...data];
                }
            }
        }
    });
    
    const uniqueShows = [...new Map(allShows.map(show => [show.id, show])).values()];
    
    tvShowsData = uniqueShows
        .filter(show => show.language === 'English' || show.language === 'Spanish')
        .map(show => ({
            ...show,
            rating: show.rating || { average: 0 },
            genres: show.genres || [],
            summary: show.summary || '',
            premiered: show.premiered || ''
        }))
        .sort((a, b) => (b.rating.average || 0) - (a.rating.average || 0))
        .slice(0, 100);
    
    categorizeTVContent();
    
    localStorage.setItem(TVMAZE_CACHE_KEY, JSON.stringify(tvShowsData));
    localStorage.setItem(TVMAZE_CATEGORIES_KEY, JSON.stringify(Array.from(categoriesTV.entries())));
    localStorage.setItem(TVMAZE_CACHE_TIME, Date.now().toString());
    
    filteredTVShows = [...tvShowsData];
}

function categorizeTVContent() {
    categoriesTV.clear();
    
    const categoryMap = {
        'drama': ['drama', 'soap', 'medical', 'legal', 'family'],
        'comedy': ['comedy', 'sitcom', 'stand-up', 'parody', 'gag'],
        'action': ['action', 'adventure', 'thriller', 'martial', 'war'],
        'sci-fi': ['science-fiction', 'fantasy', 'supernatural', 'horror', 'superhero'],
        'crime': ['crime', 'mystery', 'detective', 'police', 'noir'],
        'reality': ['reality', 'talk-show', 'game-show', 'competition', 'talent'],
        'documentary': ['documentary', 'news', 'biography', 'history', 'educational'],
        'kids': ['children', 'animation', 'family', 'educational', 'preschool']
    };
    
    tvShowsData.forEach(show => {
        const showGenres = show.genres.map(g => g.toLowerCase());
        let categorized = false;
        
        for (const [category, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => 
                showGenres.some(genre => genre.includes(keyword))
            )) {
                if (!categoriesTV.has(category)) {
                    categoriesTV.set(category, []);
                }
                if (!categoriesTV.get(category).find(s => s.id === show.id)) {
                    categoriesTV.get(category).push(show);
                }
                categorized = true;
            }
        }
        
        if (!categorized) {
            if (!categoriesTV.has('other')) {
                categoriesTV.set('other', []);
            }
            if (!categoriesTV.get('other').find(s => s.id === show.id)) {
                categoriesTV.get('other').push(show);
            }
        }
    });
}

function updateTVFilterButtons() {
    const filterContainer = document.querySelector('#tv-section .filter-options');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = `
        <button class="filter-btn active" data-filter="all" aria-pressed="true">
            Todas (${tvShowsData.length})
        </button>
    `;
    
    const sortedCategories = Array.from(categoriesTV.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    sortedCategories.forEach(([category, shows]) => {
        if (shows.length > 0) {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = category;
            button.setAttribute('aria-pressed', 'false');
            button.textContent = `${capitalizeFirst(category)} (${shows.length})`;
            filterContainer.appendChild(button);
        }
    });
    
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleTVFilter);
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTVFilter.call(btn, e);
            }
        });
    });
}

function handleTVFilter() {
    const filterContainer = this.parentElement;
    filterContainer.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
    });
    
    this.classList.add('active');
    this.setAttribute('aria-pressed', 'true');
    const filter = this.dataset.filter;
    
    if (filter === 'all') {
        filteredTVShows = [...tvShowsData];
    } else {
        filteredTVShows = categoriesTV.get(filter) || [];
    }
    
    displayTVShows(filteredTVShows);
    updateTVSectionAccessibility(filter);
}

function displayTVShows(shows) {
    const tvShowsGrid = document.getElementById('tv-shows-grid');
    if (!tvShowsGrid) return;
    
    if (!shows || shows.length === 0) {
        tvShowsGrid.innerHTML = `
            <div class="loading-placeholder" role="status">
                <i class="fas fa-tv" aria-hidden="true"></i>
                <p>No hay series disponibles en esta categoría</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    shows.forEach(show => {
        const card = createTVShowCard(show);
        fragment.appendChild(card);
    });
    
    tvShowsGrid.innerHTML = '';
    tvShowsGrid.appendChild(fragment);
}

function createTVShowCard(show) {
    const article = document.createElement('article');
    article.className = 'media-card';
    article.dataset.id = show.id;
    article.setAttribute('role', 'article');
    article.setAttribute('aria-labelledby', `show-title-${show.id}`);
    article.tabIndex = 0;
    
    const imageUrl = show.image?.medium || 
        `https://via.placeholder.com/210x295/2a2a2a/666?text=${encodeURIComponent(show.name.substring(0, 15))}`;
    const rating = show.rating?.average?.toFixed(1) || 'N/A';
    const year = show.premiered?.substring(0, 4) || 'N/A';
    const summary = show.summary ? 
        show.summary.replace(/<[^>]+>/g, '').substring(0, 120) + '...' : 
        'Sin descripción disponible';
    const genres = show.genres?.slice(0, 2).map(g => 
        `<span class="genre-tag">${g}</span>`
    ).join('') || '';
    
    article.innerHTML = `
        <img src="${imageUrl}" alt="${show.name}" loading="lazy" width="210" height="295">
        <div class="media-info">
            <h3 id="show-title-${show.id}">${show.name}</h3>
            <div class="media-meta">
                <span class="media-year" aria-label="Año de estreno">${year}</span>
                <span class="media-rating" aria-label="Calificación: ${rating} de 10">
                    <i class="fas fa-star" aria-hidden="true"></i>${rating}
                </span>
            </div>
            <div class="media-genres" aria-label="Géneros">${genres}</div>
            <p class="media-summary">${summary}</p>
        </div>
    `;
    
    article.addEventListener('click', () => showTVShowDetails(show.id));
    article.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showTVShowDetails(show.id);
        }
    });
    
    return article;
}

async function showTVShowDetails(id) {
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <div class="loading-placeholder" role="status" aria-label="Cargando detalles">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <p>Cargando detalles de la serie...</p>
        </div>
    `;
    
    modal.classList.add('active');
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    
    try {
        const [showResponse, castResponse] = await Promise.allSettled([
            fetch(`https://api.tvmaze.com/shows/${id}?embed[]=cast&embed[]=episodes`, {
                signal: AbortSignal.timeout(8000)
            }),
            fetch(`https://api.tvmaze.com/shows/${id}/cast`, {
                signal: AbortSignal.timeout(8000)
            })
        ]);
        
        let show = tvShowsData.find(s => s.id == id) || {};
        let cast = [];
        let episodes = [];
        
        if (showResponse.status === 'fulfilled' && showResponse.value.ok) {
            const data = await showResponse.value.json();
            show = { ...show, ...data };
            if (data._embedded) {
                cast = data._embedded.cast || [];
                episodes = data._embedded.episodes || [];
            }
        }
        
        if (castResponse.status === 'fulfilled' && castResponse.value.ok) {
            const data = await castResponse.value.json();
            cast = cast.length > 0 ? cast : data;
        }
        
        modalBody.innerHTML = createTVShowDetailHTML(show, cast, episodes);
        
        modalBody.querySelectorAll('a[target="_blank"]').forEach(link => {
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
    } catch (error) {
        console.error('Error loading TV show details:', error);
        modalBody.innerHTML = `
            <div class="loading-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error al cargar los detalles. Inténtalo de nuevo más tarde.</p>
            </div>
        `;
    }
}

function createTVShowDetailHTML(show, cast, episodes) {
    const imageUrl = show.image?.original || show.image?.medium || 
        `https://via.placeholder.com/400x600/2a2a2a/666?text=${encodeURIComponent(show.name)}`;
    const rating = show.rating?.average?.toFixed(1) || 'N/A';
    const year = show.premiered?.substring(0, 4) || 'N/A';
    const status = show.status || 'Desconocido';
    const summary = show.summary?.replace(/<[^>]+>/g, '') || 'Sin descripción disponible';
    const genres = show.genres?.join(', ') || 'Sin géneros';
    const network = show.network?.name || show.webChannel?.name || 'Desconocido';
    const schedule = show.schedule ? 
        `${show.schedule.days?.join(', ') || ''} ${show.schedule.time || ''}`.trim() : 
        'Sin horario';
    
    let castHTML = '';
    if (cast.length > 0) {
        castHTML = `
            <div class="modal-section">
                <h3><i class="fas fa-users"></i> Reparto Principal</h3>
                <div class="cast-grid">
                    ${cast.slice(0, 6).map(person => `
                        <div class="cast-item">
                            <strong>${person.person?.name || 'Desconocido'}</strong>
                            <p>${person.character?.name || 'Rol no especificado'}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    let episodesHTML = '';
    if (episodes.length > 0) {
        const recentEpisodes = episodes
            .filter(e => e.airdate)
            .sort((a, b) => new Date(b.airdate) - new Date(a.airdate))
            .slice(0, 5);
        
        if (recentEpisodes.length > 0) {
            episodesHTML = `
                <div class="modal-section">
                    <h3><i class="fas fa-play-circle"></i> Episodios Recientes</h3>
                    <div class="episode-list">
                        ${recentEpisodes.map(episode => {
                            const episodeNum = `S${episode.season?.toString().padStart(2, '0') || '??'}E${episode.number?.toString().padStart(2, '0') || '??'}`;
                            const airdate = episode.airdate ? 
                                new Date(episode.airdate).toLocaleDateString('es-ES') : 
                                'Por anunciar';
                            return `
                                <div class="cast-item">
                                    <strong>${episodeNum}: ${episode.name || 'Sin título'}</strong>
                                    <p>Emitido: ${airdate}</p>
                                    <p>${episode.summary ? episode.summary.replace(/<[^>]+>/g, '').substring(0, 80) + '...' : 'Sin descripción'}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    return `
        <div class="modal-detail">
            <div class="modal-poster">
                <img src="${imageUrl}" alt="${show.name}" loading="lazy" width="400" height="600">
            </div>
            <div class="modal-info">
                <h2>${show.name}</h2>
                <div class="modal-meta">
                    <span><i class="fas fa-star" aria-hidden="true"></i> ${rating}/10</span>
                    <span><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${year}</span>
                    <span><i class="fas fa-flag" aria-hidden="true"></i> ${status}</span>
                    <span><i class="fas fa-tv" aria-hidden="true"></i> ${network}</span>
                </div>
                <div class="modal-meta">
                    <span><i class="fas fa-tag" aria-hidden="true"></i> ${genres}</span>
                    <span><i class="fas fa-clock" aria-hidden="true"></i> ${schedule}</span>
                </div>
                <div class="modal-summary">
                    <h3>Sinopsis</h3>
                    <p>${summary}</p>
                </div>
                ${castHTML}
                ${episodesHTML}
                ${show.officialSite ? `
                    <div class="modal-section">
                        <h3><i class="fas fa-link"></i> Enlaces</h3>
                        <p><a href="${show.officialSite}" target="_blank" rel="noopener">Sitio oficial</a></p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function updateTVFeaturedContent() {
    updateFeaturedTVShows();
    updateTrendingTVShows();
}

function updateFeaturedTVShows() {
    const featuredShows = document.getElementById('featured-shows');
    if (!featuredShows || tvShowsData.length === 0) return;
    
    const featured = tvShowsData
        .filter(s => s.rating?.average > 8)
        .slice(0, 3);
    
    if (featured.length === 0) return;
    
    featuredShows.innerHTML = featured.map((show, index) => `
        <div class="trending-item" data-id="${show.id}" role="button" tabindex="0" aria-label="${show.name}, rating: ${show.rating?.average?.toFixed(1) || 'N/A'}">
            <div class="trending-rank" aria-hidden="true">${index + 1}</div>
            <img src="${show.image?.medium || 'https://via.placeholder.com/60x84/2a2a2a/666'}" alt="${show.name}" width="60" height="84">
            <div class="trending-info">
                <h4>${show.name}</h4>
                <p><i class="fas fa-star" aria-hidden="true"></i> ${show.rating?.average?.toFixed(1) || 'N/A'}/10</p>
            </div>
        </div>
    `).join('');
    
    featuredShows.querySelectorAll('.trending-item').forEach(item => {
        item.addEventListener('click', () => showTVShowDetails(item.dataset.id));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showTVShowDetails(item.dataset.id);
            }
        });
    });
}

function updateTrendingTVShows() {
    const trendingShows = document.getElementById('trending-shows');
    if (!trendingShows || tvShowsData.length === 0) return;
    
    const trending = [...tvShowsData]
        .filter(s => s.rating?.average > 7.5)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    
    trendingShows.innerHTML = trending.map((show, index) => `
        <div class="trending-item" data-id="${show.id}" role="button" tabindex="0">
            <div class="trending-rank" aria-hidden="true">${index + 1}</div>
            <div class="trending-info">
                <h4>${show.name}</h4>
                <p>${show.genres?.[0] || 'Serie'} • <i class="fas fa-star" aria-hidden="true"></i> ${show.rating?.average?.toFixed(1) || 'N/A'}/10</p>
            </div>
        </div>
    `).join('');
    
    trendingShows.querySelectorAll('.trending-item').forEach(item => {
        item.addEventListener('click', () => showTVShowDetails(item.dataset.id));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showTVShowDetails(item.dataset.id);
            }
        });
    });
}

function updateTVSectionAccessibility(filter) {
    const section = document.getElementById('tv-section');
    const count = filter === 'all' ? tvShowsData.length : categoriesTV.get(filter)?.length || 0;
    
    section.setAttribute('aria-label', `Series de TV - Mostrando ${count} ${filter === 'all' ? 'series totales' : `series de ${filter}`}`);
}

function startTVAutoUpdate() {
    if (updateInterval) clearInterval(updateInterval);
    
    updateInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadTVMazeShows(true);
        }
    }, UPDATE_INTERVAL);
}

async function shouldUseCache(cacheTimeKey, maxAge = UPDATE_INTERVAL) {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (!cachedTime) return false;
    
    const cacheAge = Date.now() - parseInt(cachedTime);
    return cacheAge < maxAge;
}

function loadTVFallbackData() {
    const fallbackData = [
        {
            id: 1, name: "Stranger Things",
            image: { medium: "https://static.tvmaze.com/uploads/images/medium_portrait/445/1113929.jpg" },
            rating: { average: 8.7 }, genres: ["Drama", "Fantasy", "Horror"],
            summary: "When a young boy disappears, a small town uncovers a mystery involving secret experiments.",
            premiered: "2016-07-15", status: "Running"
        },
        {
            id: 2, name: "The Mandalorian",
            image: { medium: "https://static.tvmaze.com/uploads/images/medium_portrait/228/570902.jpg" },
            rating: { average: 8.7 }, genres: ["Action", "Adventure", "Fantasy"],
            summary: "After the fall of the Empire, a lone gunfighter makes his way through the galaxy.",
            premiered: "2019-11-12", status: "Running"
        }
    ];
    
    tvShowsData = fallbackData;
    filteredTVShows = [...tvShowsData];
    
    const totalShowsSpan = document.getElementById('total-shows');
    if (totalShowsSpan) {
        totalShowsSpan.textContent = tvShowsData.length.toLocaleString();
    }
    
    displayTVShows(tvShowsData);
    categorizeTVContent();
    updateTVFilterButtons();
    updateTVFeaturedContent();
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    window.loadTVMazeShows = loadTVMazeShows;
    window.displayTVShows = displayTVShows;
    window.showTVShowDetails = showTVShowDetails;
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const cacheTime = localStorage.getItem(TVMAZE_CACHE_TIME);
            if (cacheTime && (Date.now() - parseInt(cacheTime)) > UPDATE_INTERVAL) {
                loadTVMazeShows(true);
            }
        }
    });
    
    startTVAutoUpdate();
});