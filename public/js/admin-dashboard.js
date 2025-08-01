// =========================================
// 🏛️ ADMIN DASHBOARD KILWINNING - SOLO MENU E NAVIGAZIONE
// =========================================

let sidebarOpen = false;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏛️ Dashboard Kilwinning - Menu inizializzato');
    setupEventListeners();
    checkAuth();
    loadDashboardStats();
});

// Setup event listeners
function setupEventListeners() {
    // Menu toggle mobile
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
    
    // Overlay mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });
}

// =========================================
// 🔐 AUTENTICAZIONE
// =========================================
async function checkAuth() {
    try {
        const response = await fetch('/auth/me');
        const result = await response.json();
        
        if (!result.success) {
            window.location.href = '/admin?error=login_required';
            return;
        }
        
        const userEl = document.getElementById('currentUser');
        if (userEl) {
            userEl.textContent = result.user.username;
        }
        
    } catch (error) {
        console.error('Errore verifica autenticazione:', error);
        window.location.href = '/admin';
    }
}

function logout() {
    if (!confirm('Sei sicuro di voler uscire?')) {
        return;
    }
    
    // Prima pulisci tutto localmente
    sessionStorage.clear();
    localStorage.clear();
    
    // Poi fai la chiamata logout
    fetch('/auth/logout', { method: 'POST' })
        .finally(() => {
            // BYPASS del server - vai direttamente alla home
            window.location.replace('/');
        });
}
// =========================================
// 📱 GESTIONE SIDEBAR
// =========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (window.innerWidth <= 768) {
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
        sidebarOpen = !sidebarOpen;
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    sidebarOpen = false;
}

// =========================================
// 📊 DASHBOARD STATS
// =========================================
async function loadDashboardStats() {
    try {
        // Carica fratelli
        const fratelliResp = await fetch('/api/fratelli');
        const fratelli = fratelliResp.ok ? await fratelliResp.json() : [];
        
        // Carica tornate anno corrente
        const tornateResp = await fetch('/api/tornate?anno=2025');
        const tornateResult = await tornateResp.json();
        const tornate = tornateResult.success ? tornateResult.data : [];
        
        // Aggiorna stats
        const statFratelli = document.getElementById('stat-fratelli');
        const statTornate = document.getElementById('stat-tornate');
        const statPresenze = document.getElementById('stat-presenze');
        const statProssima = document.getElementById('stat-prossima');
        
        if (statFratelli) statFratelli.textContent = fratelli.length;
        if (statTornate) statTornate.textContent = tornate.length;
        if (statPresenze) statPresenze.textContent = '86%'; // Placeholder
        
        // Prossima tornata
        const prossimaTornata = tornate
            .filter(t => new Date(t.data) > new Date() && t.stato === 'programmata')
            .sort((a, b) => new Date(a.data) - new Date(b.data))[0];
        
        if (statProssima) {
            if (prossimaTornata) {
                const data = new Date(prossimaTornata.data).toLocaleDateString('it-IT');
                statProssima.textContent = data;
            } else {
                statProssima.textContent = 'N/A';
            }
        }
        
        // Carica attività recenti
        loadRecentActivities();
        
    } catch (error) {
        console.error('Errore caricamento statistiche dashboard:', error);
    }
}

async function loadRecentActivities() {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    
    try {
        const activities = [
            { type: 'tornata', message: 'Tornata del 17/06/2025 programmata', time: 'Oggi' },
            { type: 'fratello', message: 'Sistema presenze aggiornato', time: '2 giorni fa' },
            { type: 'presenze', message: 'Database ottimizzato', time: '1 settimana fa' }
        ];
        
        container.innerHTML = activities.map(activity => `
            <div style="padding: 10px; border-left: 3px solid #3b82f6; margin-bottom: 10px; background: #f8fafc;">
                <div style="font-weight: 500;">${activity.message}</div>
                <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${activity.time}</div>
            </div>
        `).join('');
        
    } catch (error) {
        if (container) {
            container.innerHTML = '<div style="color: #ef4444;">Errore nel caricamento delle attività</div>';
        }
    }
}

// =========================================
// 📱 RESPONSIVE HANDLING
// =========================================
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeSidebar();
    }
});

// =========================================
// 🔄 AUTO-REFRESH STATS
// =========================================
setInterval(() => {
    loadDashboardStats();
}, 5 * 60 * 1000); // Ogni 5 minuti

console.log('✅ Dashboard menu - Caricato correttamente!');