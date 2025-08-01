// =========================================
// 🏛️ ADMIN PRESENZE GESTIONE
// Sistema completo per gestione presenze admin
// =========================================

// Variabili globali
let fratelliData = [];
let tornateData = [];
let presenzeData = {};
let filteredFratelli = [];
let selectedFratelloId = null;
let currentFilters = {
    anno: '2025',
    tipo: 'tutti',
    presenza: 'tutti',
    search: ''
};

// =========================================
// 🚀 INIZIALIZZAZIONE
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

function initializeEventListeners() {
    // Filtri
    document.getElementById('filterAnno').addEventListener('change', updateFilters);
    document.getElementById('filterTipo').addEventListener('change', updateFilters);
    document.getElementById('filterPresenza').addEventListener('change', updateFilters);
    document.getElementById('searchFratello').addEventListener('input', updateFilters);
}

async function loadInitialData() {
    showMainLoading(true);
    
    try {
        await Promise.all([
            loadFratelli(),
            loadTornate()
        ]);
        
        await calculatePresenze();
        renderFratelliTable();
        updateOverviewStats();
        
    } catch (error) {
        console.error('❌ Errore caricamento dati iniziali:', error);
        showError('Errore nel caricamento dei dati');
    } finally {
        showMainLoading(false);
    }
}

// =========================================
// 📊 CARICAMENTO DATI
// =========================================
async function loadFratelli() {
    try {
        console.log('👥 Caricamento fratelli...');
        const response = await fetch('/api/admin/fratelli');
        const result = await response.json();
        
        if (result.success) {
            fratelliData = result.data;
            console.log(`✅ Caricati ${fratelliData.length} fratelli`);
        } else {
            throw new Error(result.message || 'Errore caricamento fratelli');
        }
    } catch (error) {
        console.error('❌ Errore caricamento fratelli:', error);
        throw error;
    }
}

async function loadTornate() {
    try {
        console.log('📅 Caricamento tornate...');
        const response = await fetch('/api/tornate');
        const result = await response.json();
        
        if (result.success) {
            tornateData = result.data;
            console.log(`✅ Caricate ${tornateData.length} tornate`);
        } else {
            throw new Error(result.message || 'Errore caricamento tornate');
        }
    } catch (error) {
        console.error('❌ Errore caricamento tornate:', error);
        throw error;
    }
}

async function calculatePresenze() {
    console.log('🔄 Calcolo statistiche presenze...');
    
    for (const fratello of fratelliData) {
        try {
            const stats = await getFratelloStats(fratello.id);
            fratello.presenzeStats = stats;
        } catch (error) {
            console.error(`❌ Errore calcolo stats per fratello ${fratello.id}:`, error);
            fratello.presenzeStats = {
                totali: 0,
                presenze: 0,
                percentuale: 0,
                ultima: null
            };
        }
    }
    
    console.log('✅ Statistiche presenze calcolate');
}

async function getFratelloStats(fratelloId) {
    try {
        const response = await fetch(`/api/admin/presenze/fratello/${fratelloId}/stats?anno=${currentFilters.anno}&tipo=${currentFilters.tipo}`);
        const result = await response.json();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error(`❌ Errore stats fratello ${fratelloId}:`, error);
        return {
            totali: 0,
            presenze: 0,
            percentuale: 0,
            ultima: null
        };
    }
}

// =========================================
// 🔍 GESTIONE FILTRI
// =========================================
function updateFilters() {
    currentFilters.anno = document.getElementById('filterAnno').value;
    currentFilters.tipo = document.getElementById('filterTipo').value;
    currentFilters.presenza = document.getElementById('filterPresenza').value;
    currentFilters.search = document.getElementById('searchFratello').value.toLowerCase();
    
    console.log('🔍 Filtri aggiornati:', currentFilters);
    
    // Ricalcola stats con nuovi filtri
    calculatePresenze().then(() => {
        applyFilters();
        renderFratelliTable();
        updateOverviewStats();
    });
}

function applyFilters() {
    filteredFratelli = fratelliData.filter(fratello => {
        // Filtro presenza
        if (currentFilters.presenza !== 'tutti') {
            const perc = fratello.presenzeStats?.percentuale || 0;
            switch (currentFilters.presenza) {
                case 'alta':
                    if (perc < 80) return false;
                    break;
                case 'media':
                    if (perc < 50 || perc >= 80) return false;
                    break;
                case 'bassa':
                    if (perc >= 50) return false;
                    break;
            }
        }
        
        // Filtro ricerca
        if (currentFilters.search) {
            const searchTerm = currentFilters.search;
            const nome = fratello.nome?.toLowerCase() || '';
            const grado = fratello.grado?.toLowerCase() || '';
            const cariche = fratello.cariche_fisse?.toLowerCase() || '';
            
            if (!nome.includes(searchTerm) && 
                !grado.includes(searchTerm) && 
                !cariche.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    console.log(`🔍 Filtri applicati: ${filteredFratelli.length}/${fratelliData.length} fratelli`);
}

// =========================================
// 🎨 RENDERING INTERFACCIA
// =========================================
function renderFratelliTable() {
    const tbody = document.getElementById('fratelliTableBody');
    const table = document.getElementById('fratelliTable');
    const emptyState = document.getElementById('emptyFratelli');
    
    if (filteredFratelli.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    tbody.innerHTML = '';
    
    filteredFratelli.forEach(fratello => {
        const stats = fratello.presenzeStats;
        const row = document.createElement('tr');
        row.className = 'fratello-row';
        row.onclick = () => selectFratello(fratello.id);
        
        // Badge percentuale
        let badgeClass = 'badge-low';
        if (stats.percentuale >= 80) badgeClass = 'badge-high';
        else if (stats.percentuale >= 50) badgeClass = 'badge-medium';
        
        // Ultima presenza
        const ultimaPresenza = stats.ultima ? 
            new Date(stats.ultima).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) : 
            'Mai';
        
        row.innerHTML = `
            <td>
                <div style="font-weight: bold;">${fratello.nome}</div>
                ${fratello.cariche_fisse ? `<div style="font-size: 12px; color: #007bff;">📋 ${fratello.cariche_fisse}</div>` : ''}
            </td>
            <td>${fratello.grado}</td>
            <td>${stats.presenze}/${stats.totali}</td>
            <td>
                <span class="presence-badge ${badgeClass}">
                    ${stats.percentuale}%
                </span>
            </td>
            <td style="font-size: 12px; color: #6c757d;">${ultimaPresenza}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function selectFratello(fratelloId) {
    selectedFratelloId = fratelloId;
    
    // Aggiorna selezione visiva
    document.querySelectorAll('.fratello-row').forEach(row => {
        row.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
    
    // Mostra dettagli
    loadFratelloDetails(fratelloId);
}

async function loadFratelloDetails(fratelloId) {
    const fratello = fratelliData.find(f => f.id === fratelloId);
    if (!fratello) return;
    
    // Mostra pannello dettagli
    document.getElementById('emptySelection').style.display = 'none';
    document.getElementById('fratelloDetails').classList.add('active');
    
    // Aggiorna header
    document.getElementById('detailNome').textContent = fratello.nome;
    document.getElementById('detailGrado').textContent = fratello.grado;
    document.getElementById('detailCarica').textContent = fratello.cariche_fisse || 'Nessuna carica';
    
    // Mostra loading tornate
    const tornateList = document.getElementById('tornateList');
    tornateList.innerHTML = '<div class="loading"><div>🔄 Caricamento dettagli...</div></div>';
    
    try {
        // Carica dettagli completi
        await loadFratelloPresenze(fratelloId);
        
    } catch (error) {
        console.error('❌ Errore caricamento dettagli fratello:', error);
        tornateList.innerHTML = '<div class="empty-state"><h3>❌ Errore</h3><p>Impossibile caricare i dettagli</p></div>';
    }
}

async function loadFratelloPresenze(fratelloId) {
    try {
        const response = await fetch(`/api/admin/presenze/fratello/${fratelloId}/dettaglio?anno=${currentFilters.anno}&tipo=${currentFilters.tipo}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            
            // Aggiorna statistiche summary
            document.getElementById('statTotale').textContent = data.stats.totali;
            document.getElementById('statPresenze').textContent = data.stats.presenze;
            document.getElementById('statPercentuale').textContent = `${data.stats.percentuale}%`;
            
            // Render tornate
            renderFratelloTornate(data.tornate);
            
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Errore caricamento presenze fratello:', error);
        throw error;
    }
}

function renderFratelloTornate(tornate) {
    const container = document.getElementById('tornateList');
    
    if (tornate.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>📅 Nessuna tornata</h3><p>Nessuna tornata trovata per i filtri selezionati</p></div>';
        return;
    }
    
    container.innerHTML = '';
    
    tornate.forEach(tornata => {
        const item = document.createElement('div');
        item.className = `tornata-item ${tornata.presente ? 'presente' : 'assente'}`;
        
        const data = new Date(tornata.data).toLocaleDateString('it-IT', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        const discussione = tornata.discussione || 'Nessuna discussione';
        const displayDiscussione = discussione.length > 50 ? 
            discussione.substring(0, 47) + '...' : discussione;
        
        item.innerHTML = `
            <div class="tornata-header">
                <div class="tornata-data">${data}</div>
                <div class="tornata-tipo">${tornata.tipo}</div>
            </div>
            <div style="font-size: 14px; color: #495057; margin-bottom: 10px;">
                ${displayDiscussione}
            </div>
            ${tornata.ruolo ? `<div style="font-size: 12px; color: #007bff; margin-bottom: 10px;">🏛️ Ruolo: ${tornata.ruolo}</div>` : ''}
            <div class="presence-controls">
                <div class="presence-toggle">
                    <button class="toggle-btn presente ${tornata.presente ? 'active' : ''}" 
                            onclick="toggleFratelloPresenza(${tornata.id}, true)">
                        ✅ Presente
                    </button>
                    <button class="toggle-btn assente ${!tornata.presente ? 'active' : ''}" 
                            onclick="toggleFratelloPresenza(${tornata.id}, false)">
                        ❌ Assente
                    </button>
                </div>
                <select class="ruolo-select" 
                        onchange="updateFratelloRuolo(${tornata.id}, this.value)"
                        ${!tornata.presente ? 'disabled' : ''}>
                    <option value="">Nessun ruolo</option>
                    <option value="Ven.mo Maestro" ${tornata.ruolo === 'Ven.mo Maestro' ? 'selected' : ''}>Ven.mo Maestro</option>
                    <option value="Primo Sorvegliante" ${tornata.ruolo === 'Primo Sorvegliante' ? 'selected' : ''}>Primo Sorvegliante</option>
                    <option value="Secondo Sorvegliante" ${tornata.ruolo === 'Secondo Sorvegliante' ? 'selected' : ''}>Secondo Sorvegliante</option>
                    <option value="Oratore" ${tornata.ruolo === 'Oratore' ? 'selected' : ''}>Oratore</option>
                    <option value="Segretario" ${tornata.ruolo === 'Segretario' ? 'selected' : ''}>Segretario</option>
                    <option value="Tesoriere" ${tornata.ruolo === 'Tesoriere' ? 'selected' : ''}>Tesoriere</option>
                    <option value="Copritore" ${tornata.ruolo === 'Copritore' ? 'selected' : ''}>Copritore</option>
                    <option value="Primo Diacono" ${tornata.ruolo === 'Primo Diacono' ? 'selected' : ''}>Primo Diacono</option>
                    <option value="Secondo Diacono" ${tornata.ruolo === 'Secondo Diacono' ? 'selected' : ''}>Secondo Diacono</option>
                    <option value="Compagno d'Armonia" ${tornata.ruolo === "Compagno d'Armonia" ? 'selected' : ''}>Compagno d'Armonia</option>
                    <option value="Elemosiniere" ${tornata.ruolo === 'Elemosiniere' ? 'selected' : ''}>Elemosiniere</option>
                    <option value="Portaspada" ${tornata.ruolo === 'Portaspada' ? 'selected' : ''}>Portaspada</option>
                </select>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// =========================================
// 🔄 MODIFICA PRESENZE
// =========================================
async function toggleFratelloPresenza(tornataId, presente) {
    if (!selectedFratelloId) return;
    
    try {
        const response = await fetch(`/api/admin/presenze/modifica`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fratello_id: selectedFratelloId,
                tornata_id: tornataId,
                presente: presente ? 1 : 0,
                ruolo: presente ? null : null // Reset ruolo se assente
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Aggiorna visualizzazione
            await loadFratelloDetails(selectedFratelloId);
            
            // Aggiorna stats nella tabella principale
            await calculatePresenze();
            renderFratelliTable();
            updateOverviewStats();
            
            showSuccess('Presenza aggiornata con successo');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Errore modifica presenza:', error);
        showError('Errore nella modifica della presenza: ' + error.message);
    }
}

async function updateFratelloRuolo(tornataId, ruolo) {
    if (!selectedFratelloId) return;
    
    try {
        const response = await fetch(`/api/admin/presenze/modifica`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fratello_id: selectedFratelloId,
                tornata_id: tornataId,
                presente: 1, // Deve essere presente per avere un ruolo
                ruolo: ruolo || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Ruolo aggiornato con successo');
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Errore modifica ruolo:', error);
        showError('Errore nella modifica del ruolo: ' + error.message);
    }
}

// =========================================
// 📊 STATISTICHE OVERVIEW
// =========================================
function updateOverviewStats() {
    const totalFratelli = filteredFratelli.length;
    const totalTornate = getTotalTornateForFilters();
    const presenzaMedia = getPresenzaMediaOverall();
    
    document.getElementById('totalFratelli').textContent = totalFratelli;
    document.getElementById('totalTornate').textContent = totalTornate;
    document.getElementById('presenzaMedia').textContent = `${presenzaMedia}%`;
}

function getTotalTornateForFilters() {
    let filtered = tornateData;
    
    if (currentFilters.anno !== 'tutti') {
        filtered = filtered.filter(t => new Date(t.data).getFullYear().toString() === currentFilters.anno);
    }
    
    if (currentFilters.tipo !== 'tutti') {
        filtered = filtered.filter(t => t.tipo === currentFilters.tipo);
    }
    
    return filtered.length;
}

function getPresenzaMediaOverall() {
    if (filteredFratelli.length === 0) return 0;
    
    const totalPercentuale = filteredFratelli.reduce((sum, f) => {
        return sum + (f.presenzeStats?.percentuale || 0);
    }, 0);
    
    return Math.round(totalPercentuale / filteredFratelli.length);
}

// =========================================
// 🔧 UTILITY FUNCTIONS
// =========================================
function showMainLoading(show) {
    const loading = document.getElementById('loadingFratelli');
    const table = document.getElementById('fratelliTable');
    
    if (show) {
        loading.style.display = 'block';
        table.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

function showSuccess(message) {
    // Implementazione temporanea con alert
    // TODO: Sostituire con toast notification
    alert('✅ ' + message);
}

function showError(message) {
    // Implementazione temporanea con alert  
    // TODO: Sostituire con toast notification
    alert('❌ ' + message);
}

// =========================================
// 🎯 DEBUG & CONSOLE
// =========================================
console.log('✅ Admin Presenze Gestione - Script caricato');

// Esponi funzioni globali per debug
window.adminPresenze = {
    fratelliData,
    tornateData,
    currentFilters,
    selectedFratelloId,
    refreshData: loadInitialData
};