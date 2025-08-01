// session-keeper.js - Mantiene viva la sessione admin
// Aggiungi questo script a TUTTE le pagine admin

class SessionKeeper {
    constructor() {
        this.interval = null;
        this.checkInterval = 2 * 60 * 1000; // Ogni 2 minuti
        this.isActive = true;
        
        this.startKeeping();
        this.setupEventListeners();
    }
    
    startKeeping() {
        console.log('🔄 SessionKeeper avviato - check ogni', this.checkInterval / 1000, 'secondi');
        
        this.interval = setInterval(() => {
            if (this.isActive) {
                this.extendSession();
            }
        }, this.checkInterval);
        
        // Check immediato
        this.checkSession();
    }
    
    async checkSession() {
        try {
            const response = await fetch('/auth/me');
            const result = await response.json();
            
            if (!result.success || !result.authenticated) {
                console.log('❌ Sessione non valida, redirect al login');
                this.redirectToLogin();
            } else {
                console.log('✅ Sessione valida per:', result.user.username);
            }
        } catch (error) {
            console.warn('⚠️ Errore check sessione:', error);
        }
    }
    
    async extendSession() {
        try {
            const response = await fetch('/auth/extend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('🔄 Sessione estesa automaticamente');
            } else {
                console.warn('⚠️ Impossibile estendere sessione');
                this.redirectToLogin();
            }
        } catch (error) {
            console.warn('⚠️ Errore estensione sessione:', error);
        }
    }
    
    setupEventListeners() {
        // Pause durante inattività
        document.addEventListener('visibilitychange', () => {
            this.isActive = !document.hidden;
            console.log('👁️ Pagina', document.hidden ? 'nascosta' : 'visibile', '- SessionKeeper', this.isActive ? 'attivo' : 'in pausa');
        });
        
        // Extend su attività utente
        ['click', 'keypress', 'scroll'].forEach(event => {
            document.addEventListener(event, this.debounce(() => {
                this.extendSession();
            }, 30000)); // Max 1 volta ogni 30 secondi
        });
    }
    
    redirectToLogin() {
        this.stop();
        if (confirm('Sessione scaduta. Vuoi effettuare nuovamente il login?')) {
            window.location.href = '/admin';
        }
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

// Auto-start solo nelle pagine admin
if (window.location.pathname.startsWith('/admin')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.sessionKeeper = new SessionKeeper();
    });
}