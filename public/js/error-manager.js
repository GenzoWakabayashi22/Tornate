// ========================================
// 🚨 FIX COMPLETO GESTIONE ERRORI - PORTALE TORNATE
// Soluzione unificata per alert, timeout e gestione errori API
// ========================================

// ========================================
// 1️⃣ SISTEMA ALERT UNIFICATO E ROBUSTO
// ========================================

class AlertManager {
    constructor() {
        this.activeAlerts = new Map();
        this.defaultTimeout = 5000;
        this.maxAlerts = 3;
        this.init();
    }

    init() {
        // Crea container se non esiste
        if (!document.getElementById('alertContainer')) {
            const container = document.createElement('div');
            container.id = 'alertContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }

        // Inietta CSS se non presente
        this.injectCSS();
    }

    injectCSS() {
        if (document.getElementById('alert-manager-styles')) return;

        const style = document.createElement('style');
        style.id = 'alert-manager-styles';
        style.textContent = `
            .alert-unified {
                margin-bottom: 10px;
                padding: 12px 16px;
                border-radius: 8px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                opacity: 0;
                display: flex;
                align-items: center;
                gap: 8px;
                border-left: 4px solid;
                position: relative;
                overflow: hidden;
            }

            .alert-unified.show {
                transform: translateX(0);
                opacity: 1;
            }

            .alert-unified.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .alert-unified-success {
                background: #d4edda;
                color: #155724;
                border-left-color: #28a745;
            }

            .alert-unified-error {
                background: #f8d7da;
                color: #721c24;
                border-left-color: #dc3545;
            }

            .alert-unified-warning {
                background: #fff3cd;
                color: #856404;
                border-left-color: #ffc107;
            }

            .alert-unified-info {
                background: #d1ecf1;
                color: #0c5460;
                border-left-color: #17a2b8;
            }

            .alert-unified-close {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                opacity: 0.6;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .alert-unified-close:hover {
                opacity: 1;
            }

            .alert-unified-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                background: rgba(0,0,0,0.2);
                transition: width linear;
            }

            @media (max-width: 768px) {
                .alert-unified {
                    margin: 5px;
                    max-width: calc(100vw - 40px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(message, type = 'info', options = {}) {
        const {
            timeout = this.defaultTimeout,
            closable = true,
            persistent = false,
            id = null
        } = options;

        // Limita numero di alert simultanei
        if (this.activeAlerts.size >= this.maxAlerts) {
            const oldestAlert = this.activeAlerts.keys().next().value;
            this.hide(oldestAlert);
        }

        const alertId = id || 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const container = document.getElementById('alertContainer');

        // Icone per tipo
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        // Crea elemento alert
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert-unified alert-unified-${type}`;
        alertElement.innerHTML = `
            <span class="alert-unified-icon">${icons[type] || 'ℹ️'}</span>
            <span class="alert-unified-message">${message}</span>
            ${closable ? '<button class="alert-unified-close" onclick="window.alertManager.hide(\'' + alertId + '\')">&times;</button>' : ''}
            ${!persistent && timeout > 0 ? '<div class="alert-unified-progress"></div>' : ''}
        `;

        container.appendChild(alertElement);
        this.activeAlerts.set(alertId, alertElement);

        // Animazione di entrata
        requestAnimationFrame(() => {
            alertElement.classList.add('show');
        });

        // Progress bar per timeout
        if (!persistent && timeout > 0) {
            const progressBar = alertElement.querySelector('.alert-unified-progress');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transitionDuration = timeout + 'ms';
                requestAnimationFrame(() => {
                    progressBar.style.width = '0%';
                });
            }

            // Auto-hide dopo timeout
            setTimeout(() => {
                this.hide(alertId);
            }, timeout);
        }

        return alertId;
    }

    hide(alertId) {
        const alertElement = this.activeAlerts.get(alertId);
        if (!alertElement) return;

        alertElement.classList.remove('show');
        alertElement.classList.add('hide');

        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
            this.activeAlerts.delete(alertId);
        }, 300);
    }

    clear() {
        for (const alertId of this.activeAlerts.keys()) {
            this.hide(alertId);
        }
    }

    // Metodi di convenienza
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', { timeout: 8000, ...options });
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', { timeout: 6000, ...options });
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }
}

// ========================================
// 2️⃣ GESTIONE ERRORI API UNIFICATA
// ========================================

class APIErrorHandler {
    constructor() {
        this.defaultTimeout = 10000; // 10 secondi
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 secondo
    }

    /**
     * 🔧 Wrapper per fetch con gestione errori completa
     */
    async fetchWithErrorHandling(url, options = {}) {
        const {
            timeout = this.defaultTimeout,
            retry = false,
            showLoading = false,
            loadingMessage = 'Caricamento...'
        } = options;

        let loadingId = null;

        try {
            // Mostra loading se richiesto
            if (showLoading) {
                loadingId = window.alertManager.info(loadingMessage, { persistent: true });
            }

            // Crea controller per timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            // Aggiungi signal per abort
            const fetchOptions = {
                ...options,
                signal: controller.signal
            };

            // Esegui fetch
            const response = await fetch(url, fetchOptions);
            clearTimeout(timeoutId);

            // Nascondi loading
            if (loadingId) {
                window.alertManager.hide(loadingId);
            }

            // Gestisci errori HTTP
            if (!response.ok) {
                throw new APIError(
                    this.getErrorMessage(response.status),
                    response.status,
                    url
                );
            }

            return response;

        } catch (error) {
            // Nascondi loading in caso di errore
            if (loadingId) {
                window.alertManager.hide(loadingId);
            }

            // Gestisci diversi tipi di errore
            if (error.name === 'AbortError') {
                throw new APIError('Timeout: Il server non risponde', 408, url);
            }

            if (error instanceof APIError) {
                throw error;
            }

            // Errore di rete
            throw new APIError('Errore di connessione', 0, url, error);
        }
    }

    /**
     * 🔄 Retry automatico per operazioni critiche
     */
    async fetchWithRetry(url, options = {}) {
        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                return await this.fetchWithErrorHandling(url, {
                    ...options,
                    showLoading: attempt === 1 && options.showLoading
                });
            } catch (error) {
                lastError = error;
                
                if (attempt < this.retryAttempts) {
                    console.warn(`🔄 Tentativo ${attempt} fallito, riprovo in ${this.retryDelay}ms:`, error.message);
                    await this.delay(this.retryDelay * attempt); // Backoff esponenziale
                }
            }
        }

        throw lastError;
    }

    /**
     * 📝 Messaggi di errore user-friendly
     */
    getErrorMessage(status) {
        const messages = {
            400: 'Richiesta non valida',
            401: 'Accesso non autorizzato - effettua il login',
            403: 'Non hai i permessi per questa operazione',
            404: 'Risorsa non trovata',
            408: 'Timeout: il server non risponde',
            429: 'Troppe richieste - riprova più tardi',
            500: 'Errore interno del server',
            502: 'Server temporaneamente non disponibile',
            503: 'Servizio temporaneamente non disponibile',
            504: 'Timeout del server'
        };

        return messages[status] || `Errore HTTP ${status}`;
    }

    /**
     * 🎯 Gestione errore con notifica automatica
     */
    handleError(error, context = '') {
        console.error(`❌ Errore API${context ? ' in ' + context : ''}:`, error);

        let message = 'Errore sconosciuto';
        
        if (error instanceof APIError) {
            message = error.message;
            
            // Errori specifici che richiedono azioni
            if (error.status === 401) {
                window.alertManager.error('Sessione scaduta. Reindirizzamento al login...', {
                    timeout: 3000
                });
                setTimeout(() => {
                    window.location.href = '/fratelli/login';
                }, 3000);
                return;
            }
        } else if (error.message) {
            message = error.message;
        }

        window.alertManager.error(message);
    }

    /**
     * ⏳ Utility delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ========================================
// 3️⃣ CLASSE ERRORE API CUSTOM
// ========================================

class APIError extends Error {
    constructor(message, status = 0, url = '', originalError = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.url = url;
        this.originalError = originalError;
        this.timestamp = new Date().toISOString();
    }
}

// ========================================
// 4️⃣ FUNZIONI LEGACY COMPATIBILITY
// ========================================

// Sostituisce le funzioni showAlert esistenti
function showAlert(message, type = 'info', options = {}) {
    return window.alertManager.show(message, type, options);
}

function showSuccess(message, options = {}) {
    return window.alertManager.success(message, options);
}

function showError(message, options = {}) {
    return window.alertManager.error(message, options);
}

function showWarning(message, options = {}) {
    return window.alertManager.warning(message, options);
}

function showInfo(message, options = {}) {
    return window.alertManager.info(message, options);
}

// ========================================
// 5️⃣ INIZIALIZZAZIONE GLOBALE
// ========================================

// Inizializza manager globali
window.alertManager = new AlertManager();
window.apiErrorHandler = new APIErrorHandler();

// Gestione errori JavaScript globali
window.addEventListener('error', (event) => {
    console.error('🚨 Errore JavaScript globale:', event.error);
    window.alertManager.error('Si è verificato un errore inaspettato');
});

// Gestione promise rejections non catturate
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Promise rejection non gestita:', event.reason);
    window.alertManager.error('Errore nell\'esecuzione dell\'operazione');
});

console.log('✅ Sistema gestione errori caricato e pronto');

// ========================================
// 6️⃣ UTILITÀ PER OPERAZIONI COMUNI
// ========================================

/**
 * 🔧 Wrapper per chiamate API del portale tornate
 */
window.tornateAPI = {
    async get(endpoint, options = {}) {
        try {
            const response = await window.apiErrorHandler.fetchWithErrorHandling(`/api/${endpoint}`, {
                method: 'GET',
                ...options
            });
            return await response.json();
        } catch (error) {
            window.apiErrorHandler.handleError(error, `GET /${endpoint}`);
            throw error;
        }
    },

    async post(endpoint, data, options = {}) {
        try {
            const response = await window.apiErrorHandler.fetchWithErrorHandling(`/api/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data),
                ...options
            });
            return await response.json();
        } catch (error) {
            window.apiErrorHandler.handleError(error, `POST /${endpoint}`);
            throw error;
        }
    },

    async put(endpoint, data, options = {}) {
        try {
            const response = await window.apiErrorHandler.fetchWithErrorHandling(`/api/${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: JSON.stringify(data),
                ...options
            });
            return await response.json();
        } catch (error) {
            window.apiErrorHandler.handleError(error, `PUT /${endpoint}`);
            throw error;
        }
    },

    async delete(endpoint, options = {}) {
        try {
            const response = await window.apiErrorHandler.fetchWithErrorHandling(`/api/${endpoint}`, {
                method: 'DELETE',
                ...options
            });
            return await response.json();
        } catch (error) {
            window.apiErrorHandler.handleError(error, `DELETE /${endpoint}`);
            throw error;
        }
    }
};

/**
 * 🎯 Test del sistema (solo per development)
 */
function testErrorSystem() {
    console.log('🧪 Test sistema gestione errori:');
    
    window.alertManager.success('Test successo');
    setTimeout(() => window.alertManager.error('Test errore'), 1000);
    setTimeout(() => window.alertManager.warning('Test warning'), 2000);
    setTimeout(() => window.alertManager.info('Test info'), 3000);
    
    // Test API (decommentare per testare)
    // window.tornateAPI.get('test-endpoint-inesistente');
}

// Auto-test in development
if (window.location.hostname === 'localhost' || window.location.hostname.includes('dev')) {
    // testErrorSystem(); // Decommentare per test
}