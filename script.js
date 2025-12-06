document.addEventListener('DOMContentLoaded', function() {
    const loginOverlay = document.getElementById('login-overlay');
    const mainPlatform = document.getElementById('main-platform');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginMessage = document.getElementById('login-message');
    const currentUserSpan = document.getElementById('current-user');
    const datetimeSpan = document.getElementById('datetime');
    
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    
    const totalShowsSpan = document.getElementById('total-shows');
    const totalAnimeSpan = document.getElementById('total-anime');
    const totalNewsSpan = document.getElementById('total-news');
    const tvShowsGrid = document.getElementById('tv-shows-grid');
    const animeGrid = document.getElementById('anime-grid');
    const newsContainer = document.getElementById('news-container');
    const featuredShows = document.getElementById('featured-shows');
    const featuredAnime = document.getElementById('featured-anime');
    const trendingShows = document.getElementById('trending-shows');
    const trendingAnime = document.getElementById('trending-anime');
    
    const modal = document.getElementById('detail-modal');
    const closeModal = document.querySelector('.close-modal');
    const modalBody = document.getElementById('modal-body');
    
    const filterBtns = document.querySelectorAll('.filter-btn');
    const linkCards = document.querySelectorAll('.link-card');
    
    let currentUser = null;
    let tvShowsData = [];
    let animeData = [];
    let newsData = [];
    let filteredTVShows = [];
    let filteredAnime = [];
    let activeSearchTimeout = null;
    
    initPlatform();
    
    function initPlatform() {
        setupEventListeners();
        updateDateTime();
        setInterval(updateDateTime, 1000);
        
        if (typeof window.checkActiveSession === 'function') {
            currentUser = window.checkActiveSession();
            if (currentUser && currentUserSpan) {
                currentUserSpan.textContent = currentUser.name || currentUser.username;
            }
        }
        
        document.body.classList.add('platform-loaded');
    }
    
    function setupEventListeners() {
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
            loginBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') handleLogin();
            });
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') handleLogin();
            });
        }
        
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                switchSection(section);
                
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                this.setAttribute('aria-current', 'page');
            });
        });
        
        linkCards.forEach(card => {
            card.addEventListener('click', function() {
                const section = this.getAttribute('data-section');
                switchSection(section);
                
                navLinks.forEach(l => {
                    l.classList.remove('active');
                    l.removeAttribute('aria-current');
                });
                const navLink = document.querySelector(`[data-section="${section}"]`);
                if (navLink) {
                    navLink.classList.add('active');
                    navLink.setAttribute('aria-current', 'page');
                }
            });
            
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
        });
        
        if (searchBtn) searchBtn.addEventListener('click', handleSearch);
        
        if (searchInput) {
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') handleSearch();
            });
            
            searchInput.addEventListener('input', function() {
                if (activeSearchTimeout) clearTimeout(activeSearchTimeout);
                activeSearchTimeout = setTimeout(() => {
                    if (this.value.trim().length >= 3) {
                        handleSearch();
                    }
                }, 500);
            });
        }
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                
                filterBtns.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
                
                const activeSection = document.querySelector('.content-section.active');
                if (activeSection.id === 'tv-section') {
                    if (typeof window.filterTVShows === 'function') {
                        window.filterTVShows(filter);
                    }
                } else if (activeSection.id === 'anime-section') {
                    if (typeof window.filterAnime === 'function') {
                        window.filterAnime(filter);
                    }
                }
            });
        });
        
        if (closeModal) {
            closeModal.addEventListener('click', closeModalHandler);
            closeModal.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    closeModalHandler();
                }
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeModalHandler();
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModalHandler();
            }
        });
        
        document.querySelectorAll('.footer-column a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                if (section) {
                    switchSection(section);
                    
                    navLinks.forEach(l => {
                        l.classList.remove('active');
                        l.removeAttribute('aria-current');
                    });
                    const navLink = document.querySelector(`[data-section="${section}"]`);
                    if (navLink) {
                        navLink.classList.add('active');
                        navLink.setAttribute('aria-current', 'page');
                    }
                }
            });
        });
        
        const refreshData = document.getElementById('refresh-data');
        if (refreshData) {
            refreshData.addEventListener('click', function(e) {
                e.preventDefault();
                refreshAllData();
            });
        }
        
        const aboutBtn = document.getElementById('about-btn');
        if (aboutBtn) {
            aboutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showAboutModal();
            });
        }
        
        const contactBtn = document.getElementById('contact-btn');
        if (contactBtn) {
            contactBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showContactModal();
            });
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!username || !password) {
            showLoginMessage('Por favor, completa todos los campos', 'error');
            usernameInput.focus();
            return;
        }
        
        if (typeof window.validateUser !== 'function') {
            showLoginMessage('Error en el sistema de login', 'error');
            return;
        }
        
        if (window.validateUser(username, password)) {
            currentUser = window.getCurrentUser();
            if (currentUserSpan && currentUser) {
                currentUserSpan.textContent = currentUser.name || currentUser.username;
            }
            
            loginOverlay.classList.add('hidden');
            mainPlatform.classList.remove('hidden');
            
            loadPlatformData();
            
            showLoginMessage('Login exitoso. ¡Bienvenido a CARTEL TV!', 'success');
            
            usernameInput.value = '';
            passwordInput.value = '';
            
            setTimeout(() => {
                const firstNavLink = document.querySelector('.nav-link');
                if (firstNavLink) firstNavLink.focus();
            }, 100);
        } else {
            showLoginMessage('Credenciales incorrectas. Intenta de nuevo.', 'error');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }
    
    function showLoginMessage(message, type) {
        if (!loginMessage) return;
        
        loginMessage.textContent = message;
        loginMessage.className = 'login-message ' + type;
        loginMessage.setAttribute('role', 'alert');
        
        setTimeout(() => {
            loginMessage.textContent = '';
            loginMessage.className = 'login-message';
            loginMessage.removeAttribute('role');
        }, 5000);
    }
    
    function handleLogout() {
        if (typeof window.logout === 'function') {
            window.logout();
        }
        
        currentUser = null;
        if (currentUserSpan) currentUserSpan.textContent = 'Usuario';
        
        mainPlatform.classList.add('hidden');
        loginOverlay.classList.remove('hidden');
        
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        if (usernameInput) usernameInput.focus();
    }
    
    function switchSection(sectionId) {
        contentSections.forEach(section => {
            section.classList.remove('active');
            section.setAttribute('aria-hidden', 'true');
        });
        
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.setAttribute('aria-hidden', 'false');
            
            setTimeout(() => {
                targetSection.focus();
            }, 100);
        }
        
        if (sectionId === 'tv' && typeof window.loadTVMazeShows === 'function') {
            window.loadTVMazeShows();
        } else if (sectionId === 'anime' && typeof window.loadJikanAnime === 'function') {
            window.loadJikanAnime();
        } else if (sectionId === 'news') {
            loadNews();
        } else if (sectionId === 'trending') {
            loadTrendingContent();
        }
        
        updatePageTitle(sectionId);
    }
    
    function updatePageTitle(sectionId) {
        const sectionNames = {
            'home': 'Inicio',
            'tv': 'Series TV',
            'anime': 'Anime',
            'news': 'Noticias',
            'trending': 'Trending'
        };
        
        const sectionName = sectionNames[sectionId] || 'CARTEL TV';
        document.title = `${sectionName} - CARTEL TV`;
    }
    
    function updateDateTime() {
        if (!datetimeSpan) return;
        
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        
        datetimeSpan.textContent = now.toLocaleDateString('es-ES', options);
        datetimeSpan.setAttribute('aria-label', `Fecha y hora actual: ${datetimeSpan.textContent}`);
    }
    
    function handleSearch() {
        const query = searchInput.value.trim();
        
        if (!query) {
            showNotification('Por favor, introduce un término de búsqueda', 'info');
            searchInput.focus();
            return;
        }
        
        if (query.length < 2) {
            showNotification('La búsqueda debe tener al menos 2 caracteres', 'info');
            return;
        }
        
        const activeSection = document.querySelector('.content-section.active');
        const sectionId = activeSection ? activeSection.id.replace('-section', '') : '';
        
        if (sectionId === 'tv' && typeof window.searchTVShows === 'function') {
            window.searchTVShows(query);
        } else if (sectionId === 'anime' && typeof window.searchAnime === 'function') {
            window.searchAnime(query);
        } else if (sectionId === 'news') {
            searchNews(query);
        } else {
            searchGlobal(query);
        }
        
        searchInput.blur();
    }
    
    function searchGlobal(query) {
        const tvResults = window.tvShowsData ? 
            window.tvShowsData.filter(show => 
                show.name.toLowerCase().includes(query.toLowerCase()) || 
                (show.summary && show.summary.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 5) : [];
        
        const animeResults = window.animeData ? 
            window.animeData.filter(anime => 
                anime.title.toLowerCase().includes(query.toLowerCase()) || 
                (anime.synopsis && anime.synopsis.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 5) : [];
        
        const newsResults = newsData.filter(news => 
            news.title.toLowerCase().includes(query.toLowerCase()) || 
            news.content.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
        
        showSearchResultsModal(query, tvResults, animeResults, newsResults);
    }
    
    function showSearchResultsModal(query, tvResults, animeResults, newsResults) {
        let html = `
            <div class="search-results">
                <h2>Resultados de búsqueda: "${query}"</h2>
                <div class="results-section">
        `;
        
        if (tvResults.length > 0) {
            html += `<h3><i class="fas fa-tv"></i> Series de TV (${tvResults.length})</h3>`;
            tvResults.forEach(show => {
                html += `
                    <div class="result-item" data-id="${show.id}" data-type="tv" tabindex="0" role="button">
                        <h4>${show.name}</h4>
                        <p>${show.summary ? show.summary.substring(0, 150) + '...' : 'Sin descripción'}</p>
                    </div>
                `;
            });
        }
        
        if (animeResults.length > 0) {
            html += `<h3><i class="fas fa-dragon"></i> Anime (${animeResults.length})</h3>`;
            animeResults.forEach(anime => {
                html += `
                    <div class="result-item" data-id="${anime.mal_id}" data-type="anime" tabindex="0" role="button">
                        <h4>${anime.title}</h4>
                        <p>${anime.synopsis ? anime.synopsis.substring(0, 150) + '...' : 'Sin descripción'}</p>
                    </div>
                `;
            });
        }
        
        if (newsResults.length > 0) {
            html += `<h3><i class="fas fa-newspaper"></i> Noticias (${newsResults.length})</h3>`;
            newsResults.forEach(news => {
                html += `
                    <div class="result-item" data-id="${news.id}" data-type="news" tabindex="0" role="button">
                        <h4>${news.title}</h4>
                        <p>${news.content.substring(0, 150)}...</p>
                    </div>
                `;
            });
        }
        
        if (tvResults.length === 0 && animeResults.length === 0 && newsResults.length === 0) {
            html += `<p class="no-results">No se encontraron resultados para "${query}"</p>`;
        }
        
        html += `</div></div>`;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        document.querySelectorAll('.result-item').forEach(item => {
            item.addEventListener('click', handleResultClick);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleResultClick.call(item, e);
                }
            });
        });
        
        const firstResult = modalBody.querySelector('.result-item');
        if (firstResult) firstResult.focus();
    }
    
    function handleResultClick() {
        const id = this.getAttribute('data-id');
        const type = this.getAttribute('data-type');
        
        closeModalHandler();
        
        setTimeout(() => {
            if (type === 'tv' && typeof window.showTVShowDetails === 'function') {
                window.showTVShowDetails(id);
            } else if (type === 'anime' && typeof window.showAnimeDetails === 'function') {
                window.showAnimeDetails(id);
            } else if (type === 'news') {
                showNewsDetails(id);
            }
        }, 300);
    }
    
    function searchNews(query) {
        const results = newsData.filter(news => 
            news.title.toLowerCase().includes(query.toLowerCase()) || 
            news.content.toLowerCase().includes(query.toLowerCase())
        );
        
        displayNews(results);
    }
    
    function closeModalHandler() {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('hidden', '');
        
        const activeElement = document.activeElement;
        if (activeElement && activeElement.closest('.modal-content')) {
            const triggerButton = document.querySelector('[aria-expanded="true"]');
            if (triggerButton) triggerButton.focus();
        }
    }
    
    function loadPlatformData() {
        updateCounters();
        
        setTimeout(() => {
            if (typeof window.loadTVMazeShows === 'function') {
                window.loadTVMazeShows();
            }
            if (typeof window.loadJikanAnime === 'function') {
                window.loadJikanAnime();
            }
            loadNews();
            loadTrendingContent();
            loadFeaturedContent();
        }, 500);
    }
    
    function updateCounters() {
        if (totalShowsSpan) totalShowsSpan.textContent = '0';
        if (totalAnimeSpan) totalAnimeSpan.textContent = '0';
        if (totalNewsSpan) totalNewsSpan.textContent = '0';
    }
    
    function refreshAllData() {
        showNotification('Actualizando datos...', 'info');
        
        if (typeof window.loadTVMazeShows === 'function') {
            window.loadTVMazeShows(true);
        }
        if (typeof window.loadJikanAnime === 'function') {
            window.loadJikanAnime(true);
        }
        loadNews(true);
        loadTrendingContent(true);
        loadFeaturedContent(true);
        
        setTimeout(() => {
            showNotification('Datos actualizados correctamente', 'success');
        }, 2000);
    }
    
    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" aria-hidden="true"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    function showAboutModal() {
        const html = `
            <div class="about-modal">
                <h2><i class="fas fa-info-circle"></i> Acerca de CARTEL TV</h2>
                <div class="about-content">
                    <p><strong>CARTEL TV</strong> es una plataforma multimedia educativa desarrollada para fines demostrativos.</p>
                    
                    <h3>Características:</h3>
                    <ul>
                        <li><i class="fas fa-check-circle"></i> Sistema de login seguro</li>
                        <li><i class="fas fa-check-circle"></i> Integración con TVMAZE API</li>
                        <li><i class="fas fa-check-circle"></i> Integración con JIKAN API</li>
                        <li><i class="fas fa-check-circle"></i> Noticias multimedia</li>
                        <li><i class="fas fa-check-circle"></i> Búsqueda y filtrado inteligente</li>
                        <li><i class="fas fa-check-circle"></i> Diseño responsive</li>
                    </ul>
                    
                    <h3>Tecnologías:</h3>
                    <div class="tech-badges">
                        <span class="tech-badge">HTML5</span>
                        <span class="tech-badge">CSS3</span>
                        <span class="tech-badge">JavaScript</span>
                        <span class="tech-badge">TVMAZE API</span>
                        <span class="tech-badge">JIKAN API</span>
                    </div>
                    
                    <p class="disclaimer">Nota: Plataforma educativa. Todo el contenido es obtenido de APIs públicas.</p>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    
    function showContactModal() {
        const html = `
            <div class="contact-modal">
                <h2><i class="fas fa-envelope"></i> Contacto</h2>
                <div class="contact-content">
                    <p>Para preguntas o sugerencias:</p>
                    
                    <div class="contact-methods">
                        <div class="contact-method">
                            <i class="fas fa-envelope"></i>
                            <div>
                                <h4>Email</h4>
                                <p>contacto@carteltv.demo</p>
                            </div>
                        </div>
                        
                        <div class="contact-method">
                            <i class="fas fa-globe"></i>
                            <div>
                                <h4>Sitio Web</h4>
                                <p>www.carteltv.demo</p>
                            </div>
                        </div>
                    </div>
                    
                    <h3>Formulario de contacto</h3>
                    <form id="contact-form">
                        <div class="form-group">
                            <label for="contact-name">Nombre</label>
                            <input type="text" id="contact-name" placeholder="Tu nombre" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="contact-email">Email</label>
                            <input type="email" id="contact-email" placeholder="tu@email.com" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="contact-message">Mensaje</label>
                            <textarea id="contact-message" rows="5" placeholder="Escribe tu mensaje..." required></textarea>
                        </div>
                        
                        <button type="submit" class="submit-btn">Enviar mensaje</button>
                    </form>
                    
                    <p class="contact-note">Nota: Este es un formulario de demostración.</p>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
        
        const contactForm = document.getElementById('contact-form');
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                showNotification('Mensaje enviado correctamente (demo)', 'success');
                closeModalHandler();
            });
        }
    }
    
    function loadNews(forceRefresh = false) {
        newsData = [
            {
                id: 1,
                title: "Nuevas temporadas confirmadas para 2025",
                date: "2025-01-15",
                content: "Varias series populares han confirmado nuevas temporadas para el próximo año, incluyendo algunas sorpresas inesperadas.",
                category: "Series TV"
            },
            {
                id: 2,
                title: "Estreno mundial de anime esperado",
                date: "2025-01-14",
                content: "El próximo anime de estudio reconocido se estrenará globalmente en simultáneo con Japón.",
                category: "Anime"
            },
            {
                id: 3,
                title: "Plataformas streaming actualizan catálogos",
                date: "2025-01-13",
                content: "Las principales plataformas de streaming han anunciado importantes actualizaciones en sus catálogos para este trimestre.",
                category: "Streaming"
            }
        ];
        
        displayNews(newsData);
        if (totalNewsSpan) totalNewsSpan.textContent = newsData.length.toString();
    }
    
    function displayNews(newsList) {
        if (!newsContainer) return;
        
        if (!newsList || newsList.length === 0) {
            newsContainer.innerHTML = `
                <div class="loading-placeholder">
                    <i class="fas fa-newspaper"></i>
                    <p>No hay noticias disponibles</p>
                </div>
            `;
            return;
        }
        
        newsContainer.innerHTML = newsList.map(news => `
            <article class="news-card">
                <h3>${news.title}</h3>
                <div class="news-meta">
                    <span><i class="fas fa-calendar"></i> ${news.date}</span>
                    <span><i class="fas fa-tag"></i> ${news.category}</span>
                </div>
                <div class="news-content">
                    <p>${news.content}</p>
                </div>
            </article>
        `).join('');
    }
    
    function loadTrendingContent(forceRefresh = false) {
        if (typeof window.updateTrendingTVShows === 'function') {
            window.updateTrendingTVShows();
        }
        if (typeof window.updateTrendingAnime === 'function') {
            window.updateTrendingAnime();
        }
    }
    
    function loadFeaturedContent(forceRefresh = false) {
        if (typeof window.updateFeaturedTVShows === 'function') {
            window.updateFeaturedTVShows();
        }
        if (typeof window.updateFeaturedAnime === 'function') {
            window.updateFeaturedAnime();
        }
    }
    
    function showNewsDetails(id) {
        const news = newsData.find(n => n.id == id);
        if (!news) return;
        
        const html = `
            <div class="news-detail">
                <h2>${news.title}</h2>
                <div class="news-meta">
                    <span><i class="fas fa-calendar"></i> ${news.date}</span>
                    <span><i class="fas fa-tag"></i> ${news.category}</span>
                </div>
                <div class="news-content">
                    <p>${news.content}</p>
                </div>
            </div>
        `;
        
        modalBody.innerHTML = html;
        modal.classList.add('active');
        modal.removeAttribute('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    
    function handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            updateDateTime();
        }
    }
    
    const style = document.createElement('style');
    style.textContent = `
        .platform-loaded { opacity: 1 !important; }
        body { opacity: 0; transition: opacity 0.3s ease; }
        
        .search-results .result-item:focus {
            outline: var(--focus-outline);
            outline-offset: var(--focus-outline-offset);
        }
        
        .episode-list {
            display: flex;
            flex-direction: column;
            gap: 0.8rem;
            margin-top: 1rem;
        }
        
        .news-detail {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .news-detail h2 {
            color: var(--primary-color);
            margin-bottom: 1rem;
        }
        
        .news-detail .news-content {
            line-height: 1.8;
            font-size: 1.1rem;
        }
        
        @media (prefers-color-scheme: light) {
            :root {
                --dark-color: #f5f5f5;
                --light-color: #333;
                --card-bg: #ffffff;
                --secondary-color: #e0e0e0;
            }
            
            .media-card, .content-card, .news-card {
                border: 1px solid #ddd;
            }
        }
    `;
    document.head.appendChild(style);
});