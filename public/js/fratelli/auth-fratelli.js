// fratelli-auth.js - Sistema di autenticazione per fratelli
// Percorso: /js/fratelli/auth.js

class FratelliAuth {
    constructor() {
        this.storageKey = 'fratelliAuth';
        this.passwordCorretta = 'tolfa';
        this.baseURL = '/api/fratelli';
    }

    // Lista completa fratelli dal database
    getFratelliList() {
        return [
            // MAESTRI
            { id: 15, nome: "Antonio De Chiara", grado: "Maestro", ruolo: "" },
            { id: 16, nome: "Paolo Giulio Gazzano", grado: "Maestro", ruolo: "Ven.mo Maestro" },
            { id: 17, nome: "Luca Terranova", grado: "Maestro", ruolo: "Primo Sorvegliante" },
            { id: 19, nome: "Francesco Stefani", grado: "Maestro", ruolo: "" },
            { id: 20, nome: "Gabriele Recanatesi", grado: "Maestro", ruolo: "" },
            { id: 21, nome: "Marco Jacopucci", grado: "Maestro", ruolo: "" },
            { id: 22, nome: "Davide Santori", grado: "Maestro", ruolo: "" },
            
            // COMPAGNI
            { id: 3, nome: "Antonio Cozzolino", grado: "Compagno", ruolo: "Compagno d'Armonia" },
            { id: 5, nome: "Marco De Giovanni", grado: "Compagno", ruolo: "Secondo Diacono" },
            { id: 10, nome: "Alessio De Martis", grado: "Compagno", ruolo: "Segretario" },
            { id: 11, nome: "Francesco Ropresti", grado: "Compagno", ruolo: "Primo Diacono" },
            { id: 12, nome: "Emiliano Menicucci", grado: "Compagno", ruolo: "Secondo Sorvegliante" },
            { id: 13, nome: "Roberto Vinci", grado: "Compagno", ruolo: "Oratore" },
            { id: 14, nome: "Roberto Terranova", grado: "Compagno", ruolo: "" },
            
            // APPRENDISTI
            { id: 1, nome: "Stefano Bonifazi", grado: "Apprendista", ruolo: "" },
            { id: 2, nome: "Giancarlo Bordi", grado: "Apprendista", ruolo: "" },
            { id: 9, nome: "Luca Guiducci", grado: "Apprendista", ruolo: "Bibliotecario" },
            { id: 6, nome: "Leonardo Lunetto", grado: "Apprendista", ruolo: "Copritore" },
            { id: 7, nome: "Stefano Piantone", grado: "Apprendista", ruolo: "" },
            { id: 8, nome: "Andrea Spampinato", grado: "Apprendista", ruolo: "Tesoriere" },
            { id: 18, nome: "Dario Genova", grado: "Apprendista", ruolo: "" }
        ];
    }

    // Verifica se l'utente è autenticato
    isAuthenticated() {
        const authData = this.getAuthData();
        return authData !== null;
    }

    // Ottieni dati autenticazione
    getAuthData() {
        try {
            const data = sessionStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Errore parsing auth data:', error);
            this.logout();
            return null;
        }
    }

    // Login fratello
    async login(fratelloId, password) {
        // Validazione password
        if (password !== this.passwordCorretta) {
            throw new Error('Password non corretta');
        }

        // Trova fratello
        const fratelli = this.getFratelliList();
        const fratello = fratelli.find(f => f.id == fratelloId);
        
        if (!fratello) {
            throw new Error('Fratello non trovato');
        }

        // Crea dati sessione
        const authData = {
            id: fratello.id,
            nome: fratello.nome,
            grado: fratello.grado,
            ruolo: fratello.ruolo,
            loginTime: new Date().toISOString(),
            sessionToken: this.generateSessionToken()
        };

        // Salva in sessione
        sessionStorage.setItem(this.storageKey, JSON.stringify(authData));

        // Simula chiamata API per login tracking
        try {
            await this.trackLogin(fratello.id);
        } catch (error) {
            console.warn('Errore tracking login:', error);
        }

        return authData;
    }

    // Logout
    logout() {
        sessionStorage.removeItem(this.storageKey);
        window.location.href = '/fratelli/login';
    }

    // Genera token sessione
    generateSessionToken() {
        return 'fratel_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    }

    // Track login (chiamata API)
    async trackLogin(fratelloId) {
        try {
            const response = await fetch(`${this.baseURL}/${fratelloId}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent
                })
            });

            if (!response.ok) {
                throw new Error('Errore tracking login');
            }

            return await response.json();
        } catch (error) {
            console.error('Errore API trackLogin:', error);
            // Non bloccare il login per errori di tracking
        }
    }

    // Middleware per proteggere pagine
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/fratelli/login';
            return false;
        }
        return true;
    }

    // Ottieni informazioni fratello per ID
    getFratelloById(id) {
        const fratelli = this.getFratelliList();
        return fratelli.find(f => f.id == id);
    }

    // Verifica se la sessione è ancora valida
    isSessionValid() {
        const authData = this.getAuthData();
        if (!authData) return false;

        // Verifica se la sessione è più vecchia di 24 ore
        const loginTime = new Date(authData.loginTime);
        const now = new Date();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);

        if (hoursDiff > 24) {
            this.logout();
            return false;
        }

        return true;
    }

    // Aggiorna ultimo accesso
    updateLastAccess() {
        const authData = this.getAuthData();
        if (authData) {
            authData.lastAccess = new Date().toISOString();
            sessionStorage.setItem(this.storageKey, JSON.stringify(authData));
        }
    }
}

// Classe per gestire le presenze
class FratelliPresenze {
    constructor(auth) {
        this.auth = auth;
        this.baseURL = '/api/presenze';
    }

    // Ottieni presenze fratello
    async getPresenzePersonali() {
        const authData = this.auth.getAuthData();
        if (!authData) throw new Error('Non autenticato');

        try {
            const response = await fetch(`${this.baseURL}/fratello/${authData.id}`);
            if (!response.ok) throw new Error('Errore caricamento presenze');
            
            return await response.json();
        } catch (error) {
            console.error('Errore API presenze:', error);
            // Dati di fallback
            return this.getFallbackPresenze();
        }
    }

    // Conferma presenza a tornata
    async confermaPresenza(tornataId, presente) {
        const authData = this.auth.getAuthData();
        if (!authData) throw new Error('Non autenticato');

        try {
            const response = await fetch(`${this.baseURL}/conferma`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fratelloId: authData.id,
                    tornataId: tornataId,
                    presente: presente,
                    timestamp: new Date().toISOString()
                })
            });

            if (!response.ok) throw new Error('Errore conferma presenza');
            
            return await response.json();
        } catch (error) {
            console.error('Errore API conferma presenza:', error);
            throw error;
        }
    }

    // Dati di fallback per presenze
    getFallbackPresenze() {
        return {
            totaliTornate: 14,
            presenzeCount: 12,
            percentuale: 86,
            ultimeTornate: [
                { data: '2025-05-15', presente: true, titolo: 'Tornata Ordinaria' },
                { data: '2025-05-01', presente: true, titolo: 'Tornata Straordinaria' },
                { data: '2025-04-15', presente: false, titolo: 'Tornata Ordinaria' },
                { data: '2025-04-01', presente: true, titolo: 'Tornata Ordinaria' }
            ]
        };
    }
}

// Classe per gestire tornate
class FratelliTornate {
    constructor(auth) {
        this.auth = auth;
        this.baseURL = '/api/tornate';
    }

    // Ottieni prossime tornate
    async getProssimeTornate() {
        try {
            const response = await fetch(`${this.baseURL}/prossime`);
            if (!response.ok) throw new Error('Errore caricamento tornate');
            
            return await response.json();
        } catch (error) {
            console.error('Errore API tornate:', error);
            // Dati di fallback
            return this.getFallbackTornate();
        }
    }

    // Dati di fallback per tornate
    getFallbackTornate() {
        return [
            {
                id: 1,
                data: '2025-06-17',
                ora: '20:30',
                titolo: 'Tornata Ordinaria',
                dettagli: 'Ordine del giorno: Lavori rituali',
                presenza: null
            },
            {
                id: 2,
                data: '2025-07-01',
                ora: '20:30',
                titolo: 'Tornata Straordinaria',
                dettagli: 'Cerimonia di iniziazione',
                presenza: null
            },
            {
                id: 3,
                data: '2025-07-15',
                ora: '20:30',
                titolo: 'Tornata Ordinaria',
                dettagli: 'Lettura balaustra',
                presenza: null
            }
        ];
    }
}

// Inizializzazione globale
window.FratelliAuth = FratelliAuth;
window.FratelliPresenze = FratelliPresenze;
window.FratelliTornate = FratelliTornate;

// Istanza globale auth
window.fratelliAuth = new FratelliAuth();

// Auto-check sessione su tutte le pagine fratelli
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se siamo in una pagina protetta
    if (window.location.pathname.startsWith('/fratelli/') && 
        !window.location.pathname.includes('/login')) {
        
        // Richiedi autenticazione
        if (window.fratelliAuth.requireAuth() && window.fratelliAuth.isSessionValid()) {
            window.fratelliAuth.updateLastAccess();
        }
    }
});