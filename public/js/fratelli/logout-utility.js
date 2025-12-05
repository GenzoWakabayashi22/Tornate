/**
 * Utility di logout migliorata per tutte le pagine fratelli
 * Garantisce che il logout sia SEMPRE reale (sessione server distrutta)
 */

/**
 * Funzione di logout migliorata con gestione errori completa
 * @returns {Promise<void>}
 */
async function logoutFratelli() {
    if (!confirm('Sei sicuro di voler uscire dall\'area riservata?')) {
        return;
    }

    console.log('🚪 Inizio procedura logout...');
    let serverLogoutSuccess = false;

    try {
        // ✅ OBBLIGATORIO: Chiama l'endpoint di logout sul server
        console.log('📡 Chiamata POST /api/fratelli/logout...');
        const response = await fetch('/api/fratelli/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Logout server completato con successo');
            serverLogoutSuccess = true;
        } else {
            console.error('⚠️ Risposta logout non OK:', response.status, data);
            alert('⚠️ Logout server non completato correttamente, procedo comunque con la pulizia locale.');
        }
    } catch (error) {
        console.error('❌ Errore chiamata logout:', error);
        alert('❌ Errore di rete durante il logout. La sessione verrà comunque cancellata localmente.');
    }
    
    // ✅ SEMPRE: Rimuovi dati locali (anche in caso di errore server)
    console.log('🧹 Pulizia dati locali...');
    sessionStorage.removeItem('fratelliAuth');
    localStorage.removeItem('fratelliAuth');
    
    // ✅ Mostra messaggio appropriato
    if (serverLogoutSuccess) {
        console.log('✅ Logout completo - redirect a homepage');
    } else {
        console.log('⚠️ Logout forzato lato client - redirect a homepage');
    }
    
    // Redirect alla homepage
    window.location.href = '/';
}

// ✅ Rendi disponibile globalmente con entrambi i nomi per compatibilità
window.logoutFratelli = logoutFratelli;
window.logout = logoutFratelli; // Alias per compatibilità con codice esistente

console.log('✅ Logout utility caricata');
