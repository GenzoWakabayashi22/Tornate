/**
 * Utility per gestione accesso admin
 * Garantisce che Paolo (ID 16) ed Emiliano (ID 12) abbiano SEMPRE accesso admin
 */

// ✅ ARRAY ADMIN GLOBALE - usare SOLO questo per verifiche
const ADMIN_USERS = [16, 12]; // Paolo Giulio Gazzano (16), Emiliano Menicucci (12)

/**
 * Verifica se l'utente corrente è admin
 * @returns {boolean}
 */
function isCurrentUserAdmin() {
    try {
        const authData = sessionStorage.getItem('fratelliAuth');
        if (!authData) {
            console.log('❌ Nessuna sessione trovata');
            return false;
        }
        
        const auth = JSON.parse(authData);
        const userId = parseInt(auth.id);
        
        // ✅ Verifica basata SOLO sull'ID
        const isAdmin = ADMIN_USERS.includes(userId);
        console.log('🔍 Check admin per user ID:', userId, '→', isAdmin ? 'ADMIN' : 'USER');
        
        return isAdmin;
    } catch (error) {
        console.error('❌ Errore verifica admin:', error);
        return false;
    }
}

/**
 * Setup accesso admin - mostra bottoni e verifica/aggiorna sessione
 * @returns {Promise<void>}
 */
async function setupAdminAccess() {
    const authData = sessionStorage.getItem('fratelliAuth');
    if (!authData) {
        console.log('❌ Nessuna sessione per setup admin');
        return;
    }

    const auth = JSON.parse(authData);
    const userId = parseInt(auth.id);
    
    console.log('🔍 Setup Admin Access - User ID:', userId);
    console.log('📋 ADMIN_USERS:', ADMIN_USERS);
    console.log('✅ Is Admin?', ADMIN_USERS.includes(userId));

    if (ADMIN_USERS.includes(userId)) {
        // ✅ VERIFICA E AGGIORNA SESSIONE se necessario
        if (!auth.admin_access || auth.role !== 'admin') {
            console.log('⚠️ Sessione senza privilegi admin per ID', userId, '- aggiornamento...');
            auth.admin_access = true;
            auth.role = 'admin';
            sessionStorage.setItem('fratelliAuth', JSON.stringify(auth));
            
            // Forza verifica sessione server per sincronizzare
            try {
                await fetch('/api/fratelli/me', {
                    method: 'GET',
                    credentials: 'include'
                });
                console.log('✅ Sessione server sincronizzata');
            } catch (error) {
                console.warn('⚠️ Errore sincronizzazione sessione:', error);
            }
        }

        // Mostra link admin nel footer
        const adminFooterLink = document.getElementById('adminFooterLink');
        if (adminFooterLink) {
            adminFooterLink.style.display = 'block';
            console.log('✅ Admin footer link mostrato');
        }

        // ✅ Mostra bottone Admin nell'header
        const adminHeaderBtn = document.getElementById('adminHeaderBtn');
        if (adminHeaderBtn) {
            adminHeaderBtn.style.display = 'inline-flex';
            console.log('✅ Admin header button mostrato');
        } else {
            console.warn('⚠️ Admin header button non trovato nel DOM');
        }
    } else {
        console.log('👤 Utente normale - nessun accesso admin');
    }
}

/**
 * Accesso admin con verifica robusta
 * @returns {Promise<void>}
 */
async function accessoAdmin() {
    const authData = sessionStorage.getItem('fratelliAuth');
    if (!authData) {
        alert('❌ Errore: Sessione non valida. Effettua nuovamente il login.');
        window.location.href = '/';
        return;
    }

    const auth = JSON.parse(authData);
    const userId = parseInt(auth.id);
    
    console.log('🔍 Tentativo accesso admin per user ID:', userId);
    console.log('📋 ADMIN_USERS:', ADMIN_USERS);
    
    // Verifica locale
    if (!ADMIN_USERS.includes(userId)) {
        alert('❌ Non hai i privilegi per accedere all\'area amministrativa');
        return;
    }

    // Verifica con il server che la sessione abbia privilegi admin
    try {
        const response = await fetch('/admin/api/check-access', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.hasAccess) {
                console.log('✅ Accesso admin verificato, redirect...');
                window.location.href = '/admin/dashboard';
            } else {
                alert('❌ Sessione senza privilegi admin. Effettua di nuovo il login.');
                console.error('❌ Server rifiuta accesso admin:', data.message);
            }
        } else {
            console.error('❌ Errore verifica accesso admin');
            alert('❌ Errore nella verifica dei privilegi. Riprova.');
        }
    } catch (error) {
        console.error('❌ Errore chiamata verifica admin:', error);
        alert('❌ Errore di connessione. Verifica la tua connessione.');
    }
}

// ✅ Rendi disponibili globalmente
window.ADMIN_USERS = ADMIN_USERS;
window.isCurrentUserAdmin = isCurrentUserAdmin;
window.setupAdminAccess = setupAdminAccess;
window.accessoAdmin = accessoAdmin;

console.log('✅ Admin access utility caricata - ADMIN_USERS:', ADMIN_USERS);
