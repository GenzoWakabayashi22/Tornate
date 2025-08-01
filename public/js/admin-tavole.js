console.log('🔥 SCRIPT CARICATO: admin-tavole.js - VERSIONE COPIATA DA TORNATE');

// Variabili globali
let tavoleData = [];
let fratelliData = [];
let currentEditId = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadFratelli();
    loadTavole();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Form submit
    document.getElementById('tavolaForm').addEventListener('submit', handleFormSubmit);
    
    // Filtri change
    document.getElementById('filtroAnno').addEventListener('change', applicaFiltri);
    document.getElementById('filtroStato').addEventListener('change', applicaFiltri);
}

// Carica lista fratelli per il dropdown
async function loadFratelli() {
    try {
        const response = await fetch('/api/fratelli');
        const data = await response.json();
        
        if (Array.isArray(data)) {
            fratelliData = data;
            populateFratelliDropdown();
        }
    } catch (error) {
        console.error('Errore caricamento fratelli:', error);
    }
}

// Popola dropdown fratelli
function populateFratelliDropdown() {
    const select = document.getElementById('chi_introduce');
    
    // Pulisci opzioni esistenti (tranne la prima)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Aggiungi fratelli
    fratelliData.forEach(fratello => {
        const option = document.createElement('option');
        option.value = fratello.id;
        option.textContent = `${fratello.nome} (${fratello.grado})`;
        select.appendChild(option);
    });
}

// Carica tavole
async function loadTavole() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/tavole');
        const result = await response.json();
        
        if (result.success) {
            tavoleData = result.data;
            renderTavoleTable();
            updateStats();
        } else {
            throw new Error(result.message || 'Errore nel caricamento');
        }
    } catch (error) {
        console.error('Errore caricamento tavole:', error);
        showError('Errore nel caricamento delle tavole: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Applica filtri
async function applicaFiltri() {
    const anno = document.getElementById('filtroAnno').value;
    const stato = document.getElementById('filtroStato').value;
    
    showLoading(true);
    
    try {
        const params = new URLSearchParams();
        if (anno) params.append('anno', anno);
        if (stato) params.append('stato', stato);
        
        const response = await fetch(`/api/tavole?${params}`);
        const result = await response.json();
        
        if (result.success) {
            tavoleData = result.data;
            renderTavoleTable();
            updateStats();
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Errore applicazione filtri:', error);
        showError('Errore nell\'applicazione dei filtri: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Renderizza tabella tavole
function renderTavoleTable() {
    const tbody = document.getElementById('tavoleTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    tbody.innerHTML = '';
    
    if (tavoleData.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    tavoleData.forEach(tavola => {
        const row = document.createElement('tr');
        
        // Formatta data
        const dataFormatted = new Date(tavola.data_trattazione).toLocaleDateString('it-IT');
        
        // Tronca titolo se troppo lungo
        const titolo = tavola.titolo_discussione 
            ? (tavola.titolo_discussione.length > 50 
                ? tavola.titolo_discussione.substring(0, 47) + '...' 
                : tavola.titolo_discussione)
            : '-';
        
        row.innerHTML = `
            <td>${dataFormatted}</td>
            <td title="${tavola.titolo_discussione || ''}">${titolo}</td>
            <td>${tavola.nome_introduce || '-'}</td>
            <td>
                <span class="status-badge status-${tavola.stato}">
                    ${getStatoLabel(tavola.stato)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="editTavola(${tavola.id})" title="Modifica">
                        ✏️
                    </button>
                    <button class="btn btn-secondary" onclick="viewTavola(${tavola.id})" title="Dettagli">
                        👁️
                    </button>
                    <button class="btn btn-danger" onclick="deleteTavola(${tavola.id})" title="Elimina">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// Aggiorna statistiche
function updateStats() {
    const totalTavole = tavoleData.length;
    const anno2025 = tavoleData.filter(t => new Date(t.data_trattazione).getFullYear() === 2025).length;
    const programmate = tavoleData.filter(t => t.stato === 'programmata').length;
    const completate = tavoleData.filter(t => t.stato === 'completata').length;
    
    document.getElementById('totalTavole').textContent = totalTavole;
    document.getElementById('tavoleAnno').textContent = anno2025;
    document.getElementById('tavoleProgr').textContent = programmate;
    document.getElementById('tavoleCompl').textContent = completate;
}

// Apri modal
function openModal(mode, tavolaId = null) {
    const modal = document.getElementById('tavolaModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('tavolaForm');
    
    currentEditId = tavolaId;
    
    if (mode === 'nuova') {
        modalTitle.textContent = 'Nuova Tavola Architettonica';
        form.reset();
        // Imposta data di oggi come default
        document.getElementById('data_trattazione').value = new Date().toISOString().split('T')[0];
    } else if (mode === 'modifica' && tavolaId) {
        modalTitle.textContent = 'Modifica Tavola Architettonica';
        loadTavolaInForm(tavolaId);
    }
    
    modal.style.display = 'block';
}

// Chiudi modal
function closeModal() {
    const modal = document.getElementById('tavolaModal');
    modal.style.display = 'none';
    currentEditId = null;
}

// Carica tavola nel form
function loadTavolaInForm(tavolaId) {
    const tavola = tavoleData.find(t => t.id == tavolaId);
    if (!tavola) return;
    
    // Riempi campi del form
    document.getElementById('data_trattazione').value = tavola.data_trattazione;
    document.getElementById('titolo_discussione').value = tavola.titolo_discussione || '';
    document.getElementById('chi_introduce').value = tavola.chi_introduce || '';
    document.getElementById('spunti_suggeriti').value = tavola.spunti_suggeriti || '';
    document.getElementById('link_tavola').value = tavola.link_tavola || '';
    document.getElementById('stato').value = tavola.stato || 'programmata';
    document.getElementById('note').value = tavola.note || '';
}

// ✅ FUNZIONE CORRETTA - USA SEMPRE ENDPOINT ADMIN PROTETTI
async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('📝 Form submit iniziato (VERSIONE ADMIN CORRETTA)');
    
    const formData = new FormData(e.target);
    const tavolaData = {};
    
    // Conversione corretta FormData -> Object
    for (let [key, value] of formData.entries()) {
        tavolaData[key] = value || null;
    }
    
    console.log('📝 Dati da inviare:', tavolaData);
    
    try {
        // ✅ USA SEMPRE ENDPOINT ADMIN PROTETTI
        let url = '/api/admin/tavole';
        let method = 'POST';
        
        if (currentEditId) {
            url = '/api/admin/tavole/' + currentEditId;  // ✅ ANCHE UPDATE USA ADMIN
            method = 'PUT';
        }
        
        console.log('📤 Invio a:', method, url);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tavolaData)
        });
        
        console.log('📤 Response status:', response.status);
        console.log('📤 Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📥 Risposta ricevuta:', result);
        
        if (result.success) {
            const message = result.message || (currentEditId ? 'Tavola aggiornata con successo!' : 'Tavola creata con successo!');
            
            console.log('🎉 SUCCESSO! Messaggio:', message);
            
            // Chiudi modal e ricarica
            alert('✅ ' + message);
            closeModal();
            
            // Ricarica la tabella
            console.log('🔄 Ricaricamento tabella...');
            await loadTavole();
            
            console.log('🎉 OPERAZIONE COMPLETATA!');
            
        } else {
            console.error('❌ Errore risposta:', result);
            throw new Error(result.message || 'Errore nel salvataggio');
        }
        
    } catch (error) {
        console.error('❌ Errore salvataggio:', error);
        alert('❌ Errore nel salvataggio: ' + error.message);
    }
}

// Modifica tavola
function editTavola(id) {
    openModal('modifica', id);
}

// Visualizza dettagli tavola
function viewTavola(id) {
    const tavola = tavoleData.find(t => t.id == id);
    if (!tavola) return;
    
    // Crea modal personalizzato per i dettagli
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal';
    detailsModal.style.display = 'block';
    
    detailsModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📚 RIEPILOGO TAVOLA ARCHITETTONICA</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            
            <div style="padding: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>📅 Data Trattazione:</strong><br>
                        ${new Date(tavola.data_trattazione).toLocaleDateString('it-IT')}
                    </div>
                    <div>
                        <strong>⚡ Stato:</strong><br>
                        <span class="status-badge status-${tavola.stato}">
                            ${getStatoLabel(tavola.stato)}
                        </span>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <strong>📚 Titolo Discussione:</strong><br>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 5px;">
                        ${tavola.titolo_discussione || 'Nessun titolo specificato'}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <strong>👤 Chi introduce:</strong><br>
                    ${tavola.nome_introduce || 'Nessuno assegnato'}
                </div>
                
                ${tavola.spunti_suggeriti ? `
                <div style="margin-bottom: 20px;">
                    <strong>💭 Spunti Suggeriti:</strong><br>
                    <div style="background: #e8f4fd; padding: 10px; border-radius: 5px; margin-top: 5px; border-left: 4px solid #007bff;">
                        ${tavola.spunti_suggeriti}
                    </div>
                </div>
                ` : ''}
                
                ${tavola.link_tavola ? `
                <div style="margin-bottom: 20px;">
                    <strong>🔗 Link Tavola:</strong><br>
                    <div style="margin-top: 10px;">
                        📄 <a href="${tavola.link_tavola}" target="_blank" style="color: #007bff; text-decoration: none;">Apri Tavola</a>
                    </div>
                </div>
                ` : ''}
                
                ${tavola.note ? `
                <div style="margin-bottom: 20px;">
                    <strong>📝 Note:</strong><br>
                    <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 5px; border-left: 4px solid #ffc107;">
                        ${tavola.note}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: right; border-top: 1px solid #ddd; padding-top: 15px;">
                <button class="btn btn-primary" onclick="editTavola(${tavola.id}); this.closest('.modal').remove();" style="margin-right: 10px;">
                    ✏️ Modifica
                </button>
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                    Chiudi
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(detailsModal);
    
    // Chiudi cliccando fuori
    detailsModal.onclick = function(event) {
        if (event.target === detailsModal) {
            detailsModal.remove();
        }
    };
}

// Elimina tavola
async function deleteTavola(id) {
    const tavola = tavoleData.find(t => t.id == id);
    if (!tavola) return;
    
    const confirmed = confirm(`Sei sicuro di voler eliminare la tavola "${tavola.titolo_discussione}"?`);
    if (!confirmed) return;
    
    try {
        // ✅ USA ENDPOINT ADMIN PROTETTO ANCHE PER DELETE
        const response = await fetch(`/api/admin/tavole/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Tavola eliminata con successo');
            loadTavole(); // Ricarica tabella
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore eliminazione tavola:', error);
        showError('Errore nell\'eliminazione: ' + error.message);
    }
}

// Utility functions
function getStatoLabel(stato) {
    const labels = {
        'programmata': 'Programmata',
        'in_preparazione': 'In Preparazione',
        'completata': 'Completata', 
        'annullata': 'Annullata'
    };
    return labels[stato] || stato;
}

function showLoading(show) {
    const loading = document.getElementById('loadingTavole');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (show) {
        loading.style.display = 'block';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'none';
    } else {
        loading.style.display = 'none';
    }
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Gestione click fuori dal modal
window.onclick = function(event) {
    const modal = document.getElementById('tavolaModal');
    if (event.target == modal) {
        closeModal();
    }
}