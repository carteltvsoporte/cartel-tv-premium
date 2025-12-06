let animeData = [];
let filteredAnime = [];
let categoriesAnime = new Map();
let animeUpdateInterval;
let isAnimeUpdating = false;

const JIKAN_CACHE_KEY = 'carteltv_anime_v3';
const JIKAN_CACHE_TIME = 'carteltv_anime_time_v3';
const JIKAN_CATEGORIES_KEY = 'carteltv_anime_categories_v3';
const ANIME_UPDATE_INTERVAL = 3600000;

function loadJikanAnime(forceRefresh = false) {
    const animeGrid = document.getElementById('anime-grid');
    const totalAnimeSpan = document.getElementById('total-anime');
    
    if (!animeGrid || !totalAnimeSpan) return;
    
    if (isAnimeUpdating && !forceRefresh) return;
    isAnimeUpdating = true;
    
    animeGrid.innerHTML = `
        <div class="loading-placeholder" role="status" aria-label="Cargando anime">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <p>Cargando anime...</p>
        </div>
    `;
    
    loadAnimeData(forceRefresh)
        .then(() => {
            totalAnimeSpan.textContent = animeData.length.toLocaleString();
            displayAnime(animeData);
            updateAnimeFilterButtons();
            updateAnimeFeaturedContent();
            isAnimeUpdating = false;
        })
        .catch(error => {
            console.error('Error en loadJikanAnime:', error);
            loadAnimeFallbackData();
            isAnimeUpdating = false;
        });
}

async function loadAnimeData(forceRefresh) {
    if (!forceRefresh && await shouldUseAnimeCache(JIKAN_CACHE_TIME, ANIME_UPDATE_INTERVAL)) {
        const cachedData = localStorage.getItem(JIKAN_CACHE_KEY);
        const cachedCategories = localStorage.getItem(JIKAN_CATEGORIES_KEY);
        
        if (cachedData && cachedCategories) {
            animeData = JSON.parse(cachedData);
            categoriesAnime = new Map(JSON.parse(cachedCategories));
            filteredAnime = [...animeData];
            return;
        }
    }
    
    const endpoints = [
        'https://api.jikan.moe/v4/top/anime?filter=bypopularity&limit=25',
        'https://api.jikan.moe/v4/top/anime?filter=airing&limit=25',
        'https://api.jikan.moe/v4/top/anime?filter=upcoming&limit=25',
        'https://api.jikan.moe/v4/top/anime?type=tv&limit=25'
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
    
    let allAnime = [];
    
    responses.forEach(response => {
        if (response.status === 'fulfilled' && response.value.data) {
            const animeList = response.value.data.map(anime => ({
                ...anime,
                genres: anime.genres || [],
                studios: anime.studios || [],
                title_english: anime.title_english || anime.title,
                score: anime.score || 0,
                year: anime.year || anime.aired?.prop?.from?.year || '',
                episodes: anime.episodes || 0,
                status: anime.status || 'Unknown'
            }));
            allAnime = [...allAnime, ...animeList];
        }
    });
    
    const uniqueAnime = [...new Map(allAnime.map(anime => [anime.mal_id, anime])).values()];
    
    animeData = uniqueAnime
        .filter(anime => anime.score > 0 && anime.type === 'TV')
        .sort((a, b) => b.score - a.score)
        .slice(0, 100);
    
    categorizeAnimeContent();
    
    localStorage.setItem(JIKAN_CACHE_KEY, JSON.stringify(animeData));
    localStorage.setItem(JIKAN_CATEGORIES_KEY, JSON.stringify(Array.from(categoriesAnime.entries())));
    localStorage.setItem(JIKAN_CACHE_TIME, Date.now().toString());
    
    filteredAnime = [...animeData];
}

function categorizeAnimeContent() {
    categoriesAnime.clear();
    
    const categoryMap = {
        'shounen': ['shounen', 'battle', 'martial arts', 'adventure'],
        'seinen': ['seinen', 'psychological', 'mature', 'drama'],
        'fantasy': ['fantasy', 'supernatural', 'magic', 'mythology'],
        'romance': ['romance', 'drama', 'slice of life', 'harem'],
        'comedy': ['comedy', 'parody', 'gag humor', 'school'],
        'action': ['action', 'adventure', 'military', 'samurai'],
        'sci-fi': ['sci-fi', 'mecha', 'space', 'cyberpunk'],
        'mystery': ['mystery', 'horror', 'thriller', 'supernatural'],
        'sports': ['sports', 'music', 'racing', 'game']
    };
    
    animeData.forEach(anime => {
        const animeGenres = anime.genres.map(g => g.name.toLowerCase());
        let categorized = false;
        
        for (const [category, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => 
                animeGenres.some(genre => genre.includes(keyword))
            )) {
                if (!categoriesAnime.has(category)) {
                    categoriesAnime.set(category, []);
                }
                if (!categoriesAnime.get(category).find(a => a.mal_id === anime.mal_id)) {
                    categoriesAnime.get(category).push(anime);
                }
                categorized = true;
            }
        }
        
        if (!categorized) {
            if (!categoriesAnime.has('other')) {
                categoriesAnime.set('other', []);
            }
            if (!categoriesAnime.get('other').find(a => a.mal_id === anime.mal_id)) {
                categoriesAnime.get('other').push(anime);
            }
        }
    });
}

function updateAnimeFilterButtons() {
    const filterContainer = document.querySelector('#anime-section .filter-options');
    if (!filterContainer) return;
    
    filterContainer.innerHTML = `
        <button class="filter-btn active" data-filter="all" aria-pressed="true">
            Todos (${animeData.length})
        </button>
    `;
    
    const sortedCategories = Array.from(categoriesAnime.entries())
        .sort((a, b) => b[1].length - a[1].length);
    
    sortedCategories.forEach(([category, animeList]) => {
        if (animeList.length > 0) {
            const button = document.createElement('button');
            button.className = 'filter-btn';
            button.dataset.filter = category;
            button.setAttribute('aria-pressed', 'false');
            button.textContent = `${capitalizeFirst(category)} (${animeList.length})`;
            filterContainer.appendChild(button);
        }
    });
    
    filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleAnimeFilter);
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAnimeFilter.call(btn, e);
            }
        });
    });
}

function handleAnimeFilter() {
    const filterContainer = this.parentElement;
    filterContainer.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
    });
    
    this.classList.add('active');
    this.setAttribute('aria-pressed', 'true');
    const filter = this.dataset.filter;
    
    if (filter === 'all') {
        filteredAnime = [...animeData];
    } else {
        filteredAnime = categoriesAnime.get(filter) || [];
    }
    
    displayAnime(filteredAnime);
    updateAnimeSectionAccessibility(filter);
}

function displayAnime(animeList) {
    const animeGrid = document.getElementById('anime-grid');
    if (!animeGrid) return;
    
    if (!animeList || animeList.length === 0) {
        animeGrid.innerHTML = `
            <div class="loading-placeholder" role="status">
                <i class="fas fa-dragon" aria-hidden="true"></i>
                <p>No hay anime disponible en esta categoría</p>
            </div>
        `;
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    animeList.forEach(anime => {
        const card = createAnimeCard(anime);
        fragment.appendChild(card);
    });
    
    animeGrid.innerHTML = '';
    animeGrid.appendChild(fragment);
}

function createAnimeCard(anime) {
    const article = document.createElement('article');
    article.className = 'media-card';
    article.dataset.id = anime.mal_id;
    article.setAttribute('role', 'article');
    article.setAttribute('aria-labelledby', `anime-title-${anime.mal_id}`);
    article.tabIndex = 0;
    
    const imageUrl = anime.images?.jpg?.image_url || 
        `https://via.placeholder.com/210x295/2a2a2a/666?text=${encodeURIComponent(anime.title.substring(0, 15))}`;
    const score = anime.score?.toFixed(1) || 'N/A';
    const year = anime.year || 'N/A';
    const episodes = anime.episodes || '?';
    const synopsis = anime.synopsis ? 
        anime.synopsis.substring(0, 120).replace(/\n/g, ' ') + '...' : 
        'Sin descripción disponible';
    const genres = anime.genres?.slice(0, 2).map(g => 
        `<span class="genre-tag">${g.name}</span>`
    ).join('') || '';
    
    article.innerHTML = `
        <img src="${imageUrl}" alt="${anime.title}" loading="lazy" width="210" height="295">
        <div class="media-info">
            <h3 id="anime-title-${anime.mal_id}">${anime.title}</h3>
            <div class="media-meta">
                <span class="media-year" aria-label="Año: ${year}, Episodios: ${episodes}">${year} • ${episodes} eps</span>
                <span class="media-rating" aria-label="Puntuación: ${score} de 10">
                    <i class="fas fa-star" aria-hidden="true"></i>${score}
                </span>
            </div>
            <div class="media-genres" aria-label="Géneros">${genres}</div>
            <p class="media-summary">${synopsis}</p>
        </div>
    `;
    
    article.addEventListener('click', () => showAnimeDetails(anime.mal_id));
    article.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            showAnimeDetails(anime.mal_id);
        }
    });
    
    return article;
}

async function showAnimeDetails(id) {
    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) return;
    
    modalBody.innerHTML = `
        <div class="loading-placeholder" role="status" aria-label="Cargando detalles">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
            <p>Cargando detalles del anime...</p>
        </div>
    `;
    
    modal.classList.add('active');
    modal.removeAttribute('hidden');
    modal.setAttribute('aria-hidden', 'false');
    
    try {
        const response = await fetch(`https://api.jikan.moe/v4/anime/${id}/full`, {
            signal: AbortSignal.timeout(10000)
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const anime = data.data;
        
        modalBody.innerHTML = createAnimeDetailHTML(anime);
        
        modalBody.querySelectorAll('a[target="_blank"]').forEach(link => {
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        modalBody.querySelectorAll('.character-item').forEach(item => {
            item.addEventListener('click', () => {
                const charId = item.dataset.id;
                if (charId) {
                    showCharacterDetails(charId);
                }
            });
        });
        
    } catch (error) {
        console.error('Error loading anime details:', error);
        const anime = animeData.find(a => a.mal_id == id);
        if (anime) {
            modalBody.innerHTML = createBasicAnimeDetailHTML(anime);
        } else {
            modalBody.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error al cargar los detalles. Inténtalo de nuevo más tarde.</p>
                </div>
            `;
        }
    }
}

function createAnimeDetailHTML(anime) {
    const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || 
        `https://via.placeholder.com/400x600/2a2a2a/666?text=${encodeURIComponent(anime.title)}`;
    const score = anime.score?.toFixed(1) || 'N/A';
    const year = anime.year || anime.aired?.prop?.from?.year || 'N/A';
    const episodes = anime.episodes || '?';
    const status = anime.status || 'Desconocido';
    const synopsis = anime.synopsis?.replace(/\n/g, '<br>') || 'Sin descripción disponible';
    const genres = anime.genres?.map(g => g.name).join(', ') || 'Sin géneros';
    const studios = anime.studios?.map(s => s.name).join(', ') || 'Desconocido';
    const rating = anime.rating || 'Sin clasificación';
    const duration = anime.duration || 'Desconocido';
    const broadcast = anime.broadcast?.string || 'No programado';
    
    let charactersHTML = '';
    if (anime.characters && anime.characters.length > 0) {
        charactersHTML = `
            <div class="modal-section">
                <h3><i class="fas fa-users"></i> Personajes Principales</h3>
                <div class="cast-grid">
                    ${anime.characters.slice(0, 6).map(char => {
                        const voiceActor = char.voice_actors?.find(v => v.language === 'Japanese');
                        return `
                            <div class="cast-item character-item" data-id="${char.character?.mal_id}">
                                <img src="${char.character?.images?.jpg?.image_url || 'https://via.placeholder.com/50x70/2a2a2a/666'}" 
                                     alt="${char.character?.name}" width="50" height="70">
                                <div>
                                    <strong>${char.character?.name || 'Desconocido'}</strong>
                                    <p>Voz: ${voiceActor?.person?.name || 'N/A'}</p>
                                    <p>${char.role || 'Personaje principal'}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    let recommendationsHTML = '';
    if (anime.recommendations && anime.recommendations.length > 0) {
        recommendationsHTML = `
            <div class="modal-section">
                <h3><i class="fas fa-thumbs-up"></i> Recomendaciones</h3>
                <div class="cast-grid">
                    ${anime.recommendations.slice(0, 3).map(rec => {
                        const recImage = rec.entry?.images?.jpg?.image_url || 'https://via.placeholder.com/60x84/2a2a2a/666';
                        return `
                            <div class="cast-item recommendation-item" data-id="${rec.entry?.mal_id}">
                                <img src="${recImage}" alt="${rec.entry?.title}" width="60" height="84">
                                <div>
                                    <strong>${rec.entry?.title}</strong>
                                    <p>Votos: ${rec.votes?.toLocaleString() || 0}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="modal-detail">
            <div class="modal-poster">
                <img src="${imageUrl}" alt="${anime.title}" loading="lazy" width="400" height="600">
            </div>
            <div class="modal-info">
                <h2>${anime.title}</h2>
                <div class="modal-meta">
                    <span><i class="fas fa-star" aria-hidden="true"></i> ${score}/10</span>
                    <span><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${year}</span>
                    <span><i class="fas fa-play-circle" aria-hidden="true"></i> ${episodes} eps</span>
                    <span><i class="fas fa-flag" aria-hidden="true"></i> ${status}</span>
                </div>
                <div class="modal-meta">
                    <span><i class="fas fa-tag" aria-hidden="true"></i> ${genres}</span>
                    <span><i class="fas fa-building" aria-hidden="true"></i> ${studios}</span>
                    <span><i class="fas fa-clock" aria-hidden="true"></i> ${duration}</span>
                </div>
                <div class="modal-summary">
                    <h3>Sinopsis</h3>
                    <p>${synopsis}</p>
                </div>
                ${charactersHTML}
                ${recommendationsHTML}
                <div class="modal-section">
                    <h3><i class="fas fa-info-circle"></i> Información Adicional</h3>
                    <p><strong>Clasificación:</strong> ${rating}</p>
                    <p><strong>Emisión:</strong> ${broadcast}</p>
                    <p><strong>Tipo:</strong> ${anime.type || 'TV'}</p>
                    ${anime.url ? `<p><strong>Más información:</strong> <a href="${anime.url}" target="_blank" rel="noopener">MyAnimeList</a></p>` : ''}
                </div>
            </div>
        </div>
    `;
}

function createBasicAnimeDetailHTML(anime) {
    const imageUrl = anime.images?.jpg?.image_url || 
        `https://via.placeholder.com/400x600/2a2a2a/666?text=${encodeURIComponent(anime.title)}`;
    const score = anime.score?.toFixed(1) || 'N/A';
    const year = anime.year || 'N/A';
    const episodes = anime.episodes || '?';
    const synopsis = anime.synopsis?.substring(0, 500).replace(/\n/g, '<br>') + '...' || 'Sin descripción disponible';
    const genres = anime.genres?.map(g => g.name).join(', ') || 'Sin géneros';
    
    return `
        <div class="modal-detail">
            <div class="modal-poster">
                <img src="${imageUrl}" alt="${anime.title}" loading="lazy" width="400" height="600">
            </div>
            <div class="modal-info">
                <h2>${anime.title}</h2>
                <div class="modal-meta">
                    <span><i class="fas fa-star" aria-hidden="true"></i> ${score}/10</span>
                    <span><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${year}</span>
                    <span><i class="fas fa-play-circle" aria-hidden="true"></i> ${episodes} eps</span>
                </div>
                <div class="modal-summary">
                    <h3>Sinopsis</h3>
                    <p>${synopsis}</p>
                </div>
                <div class="modal-section">
                    <p><strong>Géneros:</strong> ${genres}</p>
                    <p><strong>Nota:</strong> Algunos detalles no están disponibles debido a limitaciones temporales de la API.</p>
                </div>
            </div>
        </div>
    `;
}

function updateAnimeFeaturedContent() {
    updateFeaturedAnime();
    updateTrendingAnime();
}

function updateFeaturedAnime() {
    const featuredAnime = document.getElementById('featured-anime');
    if (!featuredAnime || animeData.length === 0) return;
    
    const featured = animeData
        .filter(a => a.score > 8.5)
        .slice(0, 3);
    
    if (featured.length === 0) return;
    
    featuredAnime.innerHTML = featured.map((anime, index) => `
        <div class="trending-item" data-id="${anime.mal_id}" role="button" tabindex="0" aria-label="${anime.title}, puntuación: ${anime.score?.toFixed(1) || 'N/A'}">
            <div class="trending-rank" aria-hidden="true">${index + 1}</div>
            <img src="${anime.images?.jpg?.image_url || 'https://via.placeholder.com/60x84/2a2a2a/666'}" alt="${anime.title}" width="60" height="84">
            <div class="trending-info">
                <h4>${anime.title}</h4>
                <p><i class="fas fa-star" aria-hidden="true"></i> ${anime.score?.toFixed(1) || 'N/A'}/10</p>
            </div>
        </div>
    `).join('');
    
    featuredAnime.querySelectorAll('.trending-item').forEach(item => {
        item.addEventListener('click', () => showAnimeDetails(item.dataset.id));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showAnimeDetails(item.dataset.id);
            }
        });
    });
}

function updateTrendingAnime() {
    const trendingAnime = document.getElementById('trending-anime');
    if (!trendingAnime || animeData.length === 0) return;
    
    const trending = [...animeData]
        .filter(a => a.score > 7.5)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
    
    trendingAnime.innerHTML = trending.map((anime, index) => `
        <div class="trending-item" data-id="${anime.mal_id}" role="button" tabindex="0">
            <div class="trending-rank" aria-hidden="true">${index + 1}</div>
            <div class="trending-info">
                <h4>${anime.title}</h4>
                <p>${anime.genres?.[0]?.name || 'Anime'} • <i class="fas fa-star" aria-hidden="true"></i> ${anime.score?.toFixed(1) || 'N/A'}/10</p>
            </div>
        </div>
    `).join('');
    
    trendingAnime.querySelectorAll('.trending-item').forEach(item => {
        item.addEventListener('click', () => showAnimeDetails(item.dataset.id));
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showAnimeDetails(item.dataset.id);
            }
        });
    });
}

function updateAnimeSectionAccessibility(filter) {
    const section = document.getElementById('anime-section');
    const count = filter === 'all' ? animeData.length : categoriesAnime.get(filter)?.length || 0;
    
    section.setAttribute('aria-label', `Anime - Mostrando ${count} ${filter === 'all' ? 'animes totales' : `animes de ${filter}`}`);
}

function showCharacterDetails(characterId) {
    console.log('Mostrando detalles del personaje:', characterId);
}

function startAnimeAutoUpdate() {
    if (animeUpdateInterval) clearInterval(animeUpdateInterval);
    
    animeUpdateInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadJikanAnime(true);
        }
    }, ANIME_UPDATE_INTERVAL);
}

async function shouldUseAnimeCache(cacheTimeKey, maxAge = ANIME_UPDATE_INTERVAL) {
    const cachedTime = localStorage.getItem(cacheTimeKey);
    if (!cachedTime) return false;
    
    const cacheAge = Date.now() - parseInt(cachedTime);
    return cacheAge < maxAge;
}

function loadAnimeFallbackData() {
    const fallbackData = [
        {
            mal_id: 1,
            title: "Attack on Titan",
            images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/10/47347.jpg" } },
            score: 8.5,
            genres: [{name: "Action"}, {name: "Drama"}],
            synopsis: "Humanity fights for survival against giant humanoid creatures.",
            year: 2013,
            episodes: 75,
            status: "Finished Airing"
        },
        {
            mal_id: 2,
            title: "Demon Slayer: Kimetsu no Yaiba",
            images: { jpg: { image_url: "https://cdn.myanimelist.net/images/anime/1286/99889.jpg" } },
            score: 8.7,
            genres: [{name: "Action"}, {name: "Fantasy"}],
            synopsis: "Tanjiro becomes a demon slayer after his family is slaughtered.",
            year: 2019,
            episodes: 26,
            status: "Finished Airing"
        }
    ];
    
    animeData = fallbackData;
    filteredAnime = [...animeData];
    
    const totalAnimeSpan = document.getElementById('total-anime');
    if (totalAnimeSpan) {
        totalAnimeSpan.textContent = animeData.length.toLocaleString();
    }
    
    displayAnime(animeData);
    categorizeAnimeContent();
    updateAnimeFilterButtons();
    updateAnimeFeaturedContent();
}

function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    window.loadJikanAnime = loadJikanAnime;
    window.displayAnime = displayAnime;
    window.showAnimeDetails = showAnimeDetails;
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const cacheTime = localStorage.getItem(JIKAN_CACHE_TIME);
            if (cacheTime && (Date.now() - parseInt(cacheTime)) > ANIME_UPDATE_INTERVAL) {
                loadJikanAnime(true);
            }
        }
    });
    
    startAnimeAutoUpdate();
});