const allowedUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
    { username: 'usuario', password: 'usuario123', role: 'user', name: 'Usuario Regular' },
    { username: 'invitado', password: 'invitado123', role: 'guest', name: 'Invitado' },
    { username: 'juan', password: 'juan123', role: 'user', name: 'Juan Pérez' },
    { username: 'maria', password: 'maria123', role: 'user', name: 'María García' },
    { username: 'carlos', password: 'carlos123', role: 'user', name: 'Carlos López' },
    { username: 'ana', password: 'ana123', role: 'user', name: 'Ana Martínez' },
    { username: 'pedro', password: 'pedro123', role: 'user', name: 'Pedro Sánchez' }
];

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 300000;
const ATTEMPT_WINDOW = 900000;

function validateUser(username, password) {
    const normalizedUsername = username.toLowerCase().trim();
    const userAgent = navigator.userAgent;
    const attemptKey = `${normalizedUsername}_${userAgent.substring(0, 50)}`;
    
    if (isBlocked(attemptKey)) {
        console.warn(`Usuario bloqueado temporalmente: ${normalizedUsername}`);
        return false;
    }
    
    const user = allowedUsers.find(u => u.username.toLowerCase() === normalizedUsername);
    
    if (!user) {
        recordFailedAttempt(attemptKey);
        console.warn(`Usuario no encontrado: ${normalizedUsername}`);
        return false;
    }
    
    if (user.password !== password) {
        recordFailedAttempt(attemptKey);
        console.warn(`Contraseña incorrecta para: ${normalizedUsername}`);
        return false;
    }
    
    resetFailedAttempts(attemptKey);
    
    const userData = {
        username: user.username,
        name: user.name,
        role: user.role,
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    
    localStorage.setItem('carteltv_current_user', JSON.stringify(userData));
    localStorage.setItem('carteltv_session_id', userData.sessionId);
    localStorage.setItem('carteltv_last_login', new Date().toISOString());
    
    console.info(`Login exitoso: ${user.name} (${user.role})`);
    return true;
}

function recordFailedAttempt(key) {
    const now = Date.now();
    let attempts = loginAttempts.get(key) || [];
    
    attempts = attempts.filter(time => now - time < ATTEMPT_WINDOW);
    attempts.push(now);
    loginAttempts.set(key, attempts);
    
    const attemptCount = attempts.length;
    localStorage.setItem('carteltv_login_attempts', JSON.stringify(Array.from(loginAttempts.entries())));
    
    if (attemptCount >= MAX_ATTEMPTS) {
        console.warn(`Bloqueo activado para: ${key}`);
        localStorage.setItem(`carteltv_blocked_${key}`, (now + LOCK_TIME).toString());
    }
    
    return attemptCount;
}

function isBlocked(key) {
    const blockedUntil = localStorage.getItem(`carteltv_blocked_${key}`);
    if (!blockedUntil) return false;
    
    const now = Date.now();
    if (now < parseInt(blockedUntil)) {
        return true;
    }
    
    localStorage.removeItem(`carteltv_blocked_${key}`);
    return false;
}

function resetFailedAttempts(key) {
    loginAttempts.delete(key);
    localStorage.removeItem(`carteltv_blocked_${key}`);
    localStorage.setItem('carteltv_login_attempts', JSON.stringify(Array.from(loginAttempts.entries())));
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function checkActiveSession() {
    try {
        const userData = localStorage.getItem('carteltv_current_user');
        const sessionId = localStorage.getItem('carteltv_session_id');
        
        if (!userData || !sessionId) return null;
        
        const user = JSON.parse(userData);
        const loginTime = new Date(user.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursSinceLogin < 24 && user.sessionId === sessionId) {
            console.info(`Sesión activa encontrada para: ${user.name}`);
            return user;
        }
        
        logout();
        return null;
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        return null;
    }
}

function logout() {
    const userData = localStorage.getItem('carteltv_current_user');
    if (userData) {
        const user = JSON.parse(userData);
        console.info(`Cerrando sesión de: ${user.name}`);
    }
    
    localStorage.removeItem('carteltv_current_user');
    localStorage.removeItem('carteltv_session_id');
}

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('carteltv_current_user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

function loadLoginAttemptsFromStorage() {
    try {
        const storedAttempts = localStorage.getItem('carteltv_login_attempts');
        if (storedAttempts) {
            const attemptsArray = JSON.parse(storedAttempts);
            attemptsArray.forEach(([key, times]) => {
                const now = Date.now();
                const recentAttempts = times.filter(time => now - time < ATTEMPT_WINDOW);
                if (recentAttempts.length > 0) {
                    loginAttempts.set(key, recentAttempts);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando intentos:', error);
    }
}

function setupAutoLogout() {
    const checkSession = () => {
        const userData = localStorage.getItem('carteltv_current_user');
        if (userData) {
            const user = JSON.parse(userData);
            const loginTime = new Date(user.loginTime);
            const now = new Date();
            const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
            
            if (hoursSinceLogin >= 24) {
                logout();
                window.location.reload();
            }
        }
    };
    
    setInterval(checkSession, 600000);
    
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkSession();
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    loadLoginAttemptsFromStorage();
    setupAutoLogout();
    
    const activeUser = checkActiveSession();
    
    if (activeUser && typeof window.currentUser === 'undefined') {
        window.currentUser = activeUser;
        
        const loginOverlay = document.getElementById('login-overlay');
        const mainPlatform = document.getElementById('main-platform');
        const currentUserSpan = document.getElementById('current-user');
        
        if (loginOverlay && mainPlatform && currentUserSpan) {
            currentUserSpan.textContent = activeUser.name || activeUser.username;
            loginOverlay.classList.add('hidden');
            mainPlatform.classList.remove('hidden');
            
            if (typeof window.loadPlatformData === 'function') {
                setTimeout(() => window.loadPlatformData(), 100);
            }
            
            if (typeof window.showNotification === 'function') {
                setTimeout(() => {
                    window.showNotification(`¡Bienvenido de nuevo, ${activeUser.name}!`, 'success');
                }, 500);
            }
        }
    }
    
    if (typeof window.handleLogout === 'function') {
        const originalHandleLogout = window.handleLogout;
        window.handleLogout = function() {
            logout();
            originalHandleLogout();
        };
    }
});

window.validateUser = validateUser;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.checkActiveSession = checkActiveSession;