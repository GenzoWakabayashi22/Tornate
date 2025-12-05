// session-keeper.js - Mantiene viva la sessione per pagine admin e fratelli
// Aggiungi questo script a TUTTE le pagine protette

class SessionKeeper {
    constructor() {
        this.interval = null;
        this.checkInterval = 2 * 60 * 1000; // Ogni 2 minuti (120 secondi)
        this.isActive = true;
        this.isFratelliPage = window.location.pathname.startsWith('/fratelli');
        this.isAdminPage = window.location.pathname.startsWith('/admin');
        
        this.startKeeping();
        this.setupEventListeners();
    }
    
    startKeeping() {
        const seconds = this.checkInterval / 1000;
        console.log('🔄 SessionKeeper avviato - check ogni', seconds, 'secondi');
        console.log('📍 Tipo pagina:', this.isFratelliPage ? 'Fratelli' : (this.isAdminPage ? 'Admin' : 'Unknown'));
        
        this.interval = setInterval(() => {
            if (this.isActive) {
                this.checkSession();
            }
        }, this.checkInterval);
        
        // Check immediato dopo 5 secondi
        setTimeout(() => this.checkSession(), 5000);
    }
    
    async checkSession() {
        try {
            // ✅ Usa l'endpoint corretto in base alla pagina
            const endpoint = this.isFratelliPage ? '/api/fratelli/me' : '/api/fratelli/me';
            
            console.log('🔍 Verifica sessione:', endpoint);
            
            const response = await fetch(endpoint, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.log('❌ Sessione non valida (status:', response.status, ')');
                this.redirectToLogin();
                return;
            }
            
            const result = await response.json();
            
            if (!result.success || !result.authenticated) {
                console.log('❌ Sessione non autenticata, redirect al login');
                this.redirectToLogin();
            } else {
                const userName = result.user?.nome || result.user?.username || 'Utente';
                console.log('✅ Sessione valida per:', userName, '- Admin:', result.user?.admin_access);
                
                // ✅ Aggiorna sessionStorage con i dati più recenti
                if (this.isFratelliPage && result.user) {
                    const currentAuth = sessionStorage.getItem('fratelliAuth');
                    if (currentAuth) {
                        const auth = JSON.parse(currentAuth);
                        // Aggiorna solo se necessario
                        if (auth.admin_access !== result.user.admin_access) {
                            console.log('🔄 Aggiornamento privilegi admin in sessionStorage');
                            sessionStorage.setItem('fratelliAuth', JSON.stringify(result.user));
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Errore check sessione:', error.message);
            // Non forziamo il logout in caso di errore di rete
        }
    }
    
    setupEventListeners() {
        // Pause durante inattività
        document.addEventListener('visibilitychange', () => {
            this.isActive = !document.hidden;
            const status = this.isActive ? 'attivo' : 'in pausa';
            console.log('👁️ Pagina', document.hidden ? 'nascosta' : 'visibile', '- SessionKeeper', status);
        });
        
        // Check sessione su attività utente (massimo 1 volta ogni 30 secondi)
        ['click', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, this.debounce(() => {
                if (this.isActive) {
                    this.checkSession();
                }
            }, 30000)); // Max 1 volta ogni 30 secondi
        });
    }
    
    redirectToLogin() {
        this.stop();
        
        // Pulisci sessionStorage
        sessionStorage.removeItem('fratelliAuth');
        localStorage.removeItem('fratelliAuth');
        
        const message = 'La tua sessione è scaduta. Effettua nuovamente il login.';
        alert(message);
        
        // Redirect alla homepage
        window.location.href = '/';
    }
    
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('🛑 SessionKeeper fermato');
        }
    }
    
    // Utility debounce
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// ✅ Auto-start nelle pagine protette (admin o fratelli)
if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/fratelli')) {
    // Skip solo per pagina di login
    if (!window.location.pathname.includes('/login')) {
        document.addEventListener('DOMContentLoaded', () => {
            window.sessionKeeper = new SessionKeeper();
            console.log('✅ SessionKeeper inizializzato per:', window.location.pathname);
        });
    }
}