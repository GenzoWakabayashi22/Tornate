// Variabili globali
let tornateData = [];
let currentTornata = null;
let fratelliData = [];
let presenzeData = {};
let ospitiData = [];

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadTornate();
});

// Carica lista tornate
async function loadTornate() {
    try {
        const response = await fetch('/api/tornate');
        const result = await response.json();
        
        if (result.success) {
            tornateData = result.data;
            populateTornateDropdown();
        }
    } catch (error) {
        console.error('Errore caricamento tornate:', error);
        showError('Errore nel caricamento delle tornate');
    }
}

// Popola dropdown tornate
function populateTornateDropdown() {
    const select = document.getElementById('tornataSelect');
    
    // Pulisci opzioni esistenti
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Aggiungi tornate (ordinate per data)
    const tornateOrdinate = tornateData.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    tornateOrdinate.forEach(tornata => {
        const option = document.createElement('option');
        option.value = tornata.id;
        
        const data = new Date(tornata.data).toLocaleDateString('it-IT');
        const discussione = tornata.discussione ? 
            (tornata.discussione.length > 30 ? tornata.discussione.substring(0, 27) + '...' : tornata.discussione) 
            : 'Nessuna discussione';
        
        option.textContent = `${data} - ${discussione}`;
        select.appendChild(option);
    });
}

// Carica presenze per la tornata selezionata
async function caricaPresenze() {
    const tornataId = document.getElementById('tornataSelect').value;
    
    if (!tornataId) {
        showError('Seleziona una tornata');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`/api/presenze/tornata/${tornataId}`);
        const result = await response.json();
        
        if (result.success) {
            currentTornata = result.data.tornata;
            fratelliData = result.data.fratelli;
            ospitiData = result.data.ospiti;
            
            // Inizializza presenze data
            presenzeData = {};
            result.data.presenze.forEach(presenza => {
                presenzeData[presenza.fratello_id] = {
                    presente: presenza.presente,
                    ruolo: presenza.ruolo
                };
            });
            
            // Se non ci sono presenze registrate, inizializza tutti come assenti
            fratelliData.forEach(fratello => {
                if (!(fratello.id in presenzeData)) {
                    presenzeData[fratello.id] = {
                        presente: false,
                        ruolo: null
                    };
                }
            });
            
            renderTornataInfo();
            renderFratelliList();
            renderOspitiList();
            updateStats();
            
            // Mostra sezioni
            document.getElementById('tornataInfo').style.display = 'block';
            document.getElementById('presenzeContainer').style.display = 'block';
            document.getElementById('saveSection').style.display = 'flex';
            
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore caricamento presenze:', error);
        showError('Errore nel caricamento delle presenze: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Renderizza informazioni tornata
function renderTornataInfo() {
    const title = document.getElementById('tornataTitle');
    const details = document.getElementById('tornataDetails');
    
    const data = new Date(currentTornata.data).toLocaleDateString('it-IT');
    title.textContent = `Tornata del ${data}`;
    
    details.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">🕐 Ora:</span> ${currentTornata.orario_inizio || 'Non specificata'}
        </div>
        <div class="detail-item">
            <span class="detail-label">📍 Location:</span> ${currentTornata.location || 'Non specificata'}
        </div>
        <div class="detail-item">
            <span class="detail-label">🏛️ Tipo:</span> ${capitalizeFirst(currentTornata.tipo || 'ordinaria')}
        </div>
        <div class="detail-item">
            <span class="detail-label">⚡ Stato:</span> ${capitalizeFirst(currentTornata.stato || 'programmata')}
        </div>
        ${currentTornata.discussione ? `
        <div class="detail-item" style="grid-column: 1 / -1;">
            <span class="detail-label">💬 Discussione:</span><br>
            <em>${currentTornata.discussione}</em>
        </div>
        ` : ''}
    `;
}

// Renderizza lista fratelli
function renderFratelliList() {
    const container = document.getElementById('fratelliList');
    const countElement = document.getElementById('fratelliCount');
    
    container.innerHTML = '';
    
    // Ordina fratelli in ordine alfabetico
    const fratelliOrdinati = fratelliData.sort((a, b) => a.nome.localeCompare(b.nome));
    
    fratelliOrdinati.forEach(fratello => {
        const item = document.createElement('div');
        item.className = 'fratello-item';
        
        const presenza = presenzeData[fratello.id];
        const isPresente = presenza ? presenza.presente : false;
        
        // Determina il ruolo automatico dal fratello o dalla presenza salvata
        let ruoloAutomatico = '';
        if (fratello.cariche_fisse) {
            ruoloAutomatico = fratello.cariche_fisse;
        } else if (fratello.cariche) {
            ruoloAutomatico = fratello.cariche;
        }
        
        // Usa il ruolo salvato se esiste, altrimenti quello automatico
        const ruolo = presenza && presenza.ruolo ? presenza.ruolo : ruoloAutomatico;
        
        // Se il fratello è presente e ha un ruolo automatico, assegnalo
        if (isPresente && ruoloAutomatico && (!presenza || !presenza.ruolo)) {
            if (!presenzeData[fratello.id]) {
                presenzeData[fratello.id] = {};
            }
            presenzeData[fratello.id].ruolo = ruoloAutomatico;
        }
        
        item.innerHTML = `
            <div class="fratello-info">
                <div class="fratello-nome">${fratello.nome}</div>
                <div class="fratello-grado">${fratello.grado}</div>
                ${ruoloAutomatico ? `<div class="fratello-ruolo-fisso" style="font-size: 11px; color: #007bff; font-weight: bold;">📋 ${ruoloAutomatico}</div>` : ''}
            </div>
            <div class="presenza-toggle">
                <button class="presenza-btn ${isPresente ? 'presente active' : 'presente'}" 
                        onclick="togglePresenza(${fratello.id}, true)">
                    ✅ Presente
                </button>
                <button class="presenza-btn ${!isPresente ? 'assente active' : 'assente'}" 
                        onclick="togglePresenza(${fratello.id}, false)">
                    ❌ Assente
                </button>
            </div>
           <select class="ruolo-select" onchange="updateRuolo(${fratello.id}, this.value)" ${!isPresente ? 'disabled' : ''}>
    <option value="">Nessun ruolo</option>
    <option value="Ven.mo Maestro" ${ruolo === 'Ven.mo Maestro' ? 'selected' : ''}>Ven.mo Maestro</option>
    <option value="Primo Sorvegliante" ${ruolo === 'Primo Sorvegliante' ? 'selected' : ''}>Primo Sorvegliante</option>
    <option value="Secondo Sorvegliante" ${ruolo === 'Secondo Sorvegliante' ? 'selected' : ''}>Secondo Sorvegliante</option>
    <option value="Oratore" ${ruolo === 'Oratore' ? 'selected' : ''}>Oratore</option>
    <option value="Segretario" ${ruolo === 'Segretario' ? 'selected' : ''}>Segretario</option>
    <option value="Tesoriere" ${ruolo === 'Tesoriere' ? 'selected' : ''}>Tesoriere</option>
    <option value="Copritore" ${ruolo === 'Copritore' ? 'selected' : ''}>Copritore</option>
    <option value="Primo Diacono" ${ruolo === 'Primo Diacono' ? 'selected' : ''}>Primo Diacono</option>
    <option value="Secondo Diacono" ${ruolo === 'Secondo Diacono' ? 'selected' : ''}>Secondo Diacono</option>
    <option value="Compagno d'Armonia" ${ruolo === 'Compagno d\'Armonia' ? 'selected' : ''}>Compagno d'Armonia</option>
    <option value="Bibliotecario" ${ruolo === 'Bibliotecario' ? 'selected' : ''}>Bibliotecario</option>
    <option value="Altro" ${ruolo === 'Altro' ? 'selected' : ''}>Altro</option>
</select>
        `;
        
        container.appendChild(item);
    });
    
    countElement.textContent = fratelliData.length;
}

// Renderizza lista ospiti
function renderOspitiList() {
    const container = document.getElementById('ospitiList');
    const countElement = document.getElementById('ospitiCount');
    
    // Pulisci lista esistente
    const existingItems = container.querySelectorAll('.ospite-item');
    existingItems.forEach(item => item.remove());
    
    ospitiData.forEach(ospite => {
        const item = document.createElement('div');
        item.className = 'ospite-item';
        
        item.innerHTML = `
            <div>
                <strong>${ospite.nome}</strong>
                ${ospite.loggia_provenienza ? `<br><small>da ${ospite.loggia_provenienza}</small>` : ''}
                ${ospite.grado ? `<br><small>${ospite.grado}</small>` : ''}
            </div>
            <button class="btn btn-danger" onclick="rimuoviOspite(${ospite.id})">🗑️</button>
        `;
        
        container.appendChild(item);
    });
    
    countElement.textContent = ospitiData.length;
}

// Toggle presenza fratello
function togglePresenza(fratelloId, presente) {
    if (!presenzeData[fratelloId]) {
        presenzeData[fratelloId] = {};
    }
    
    presenzeData[fratelloId].presente = presente;
    
    // Se assente, rimuovi ruolo
    if (!presente) {
        presenzeData[fratelloId].ruolo = null;
    }
    
    renderFratelliList();
    updateStats();
}

// Aggiorna ruolo fratello
function updateRuolo(fratelloId, ruolo) {
    if (!presenzeData[fratelloId]) {
        presenzeData[fratelloId] = { presente: false };
    }
    
    presenzeData[fratelloId].ruolo = ruolo || null;
}

// Aggiungi ospite
async function aggiungiOspite() {
    const nome = document.getElementById('nuovoOspiteNome').value.trim();
    const loggia = document.getElementById('nuovoOspiteLoggia').value.trim();
    const grado = document.getElementById('nuovoOspiteGrado').value;
    
    if (!nome) {
        showError('Inserisci il nome dell\'ospite');
        return;
    }
    
    try {
        const response = await fetch('/api/presenze/ospiti', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tornata_id: currentTornata.id,
                nome: nome,
                loggia_provenienza: loggia || null,
                grado: grado || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Aggiungi alla lista locale
            ospitiData.push(result.data);
            
            // Pulisci form
            document.getElementById('nuovoOspiteNome').value = '';
            document.getElementById('nuovoOspiteLoggia').value = '';
            document.getElementById('nuovoOspiteGrado').value = '';
            
            renderOspitiList();
            updateStats();
            showSuccess('Ospite aggiunto con successo');
            
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore aggiunta ospite:', error);
        showError('Errore nell\'aggiunta dell\'ospite: ' + error.message);
    }
}

// Rimuovi ospite
async function rimuoviOspite(ospiteId) {
    if (!confirm('Sei sicuro di voler rimuovere questo ospite?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/presenze/ospiti/${ospiteId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Rimuovi dalla lista locale
            ospitiData = ospitiData.filter(ospite => ospite.id !== ospiteId);
            
            renderOspitiList();
            updateStats();
            showSuccess('Ospite rimosso con successo');
            
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore rimozione ospite:', error);
        showError('Errore nella rimozione dell\'ospite: ' + error.message);
    }
}

// Aggiorna statistiche
function updateStats() {
    const presenti = Object.values(presenzeData).filter(p => p.presente).length;
    const assenti = Object.values(presenzeData).filter(p => !p.presente).length;
    const ospiti = ospitiData.length;
    const totale = presenti + ospiti;
    
    document.getElementById('statPresenti').textContent = presenti;
    document.getElementById('statAssenti').textContent = assenti;
    document.getElementById('statOspiti').textContent = ospiti;
    document.getElementById('statTotale').textContent = totale;
}

// Salva presenze
async function salvaPresenze() {
    if (!currentTornata) {
        showError('Nessuna tornata selezionata');
        return;
    }
    
    // Prepara dati presenze
    const presenze = Object.entries(presenzeData).map(([fratelloId, presenza]) => ({
        fratello_id: parseInt(fratelloId),
        presente: presenza.presente ? 1 : 0,
        ruolo: presenza.ruolo
    }));
    
    try {
        const response = await fetch(`/api/presenze/tornata/${currentTornata.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                presenze: presenze
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Presenze salvate con successo! (${result.count} fratelli registrati)`);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore salvataggio presenze:', error);
        showError('Errore nel salvataggio delle presenze: ' + error.message);
    }
}

// Reset presenze
function resetPresenze() {
    if (!confirm('Sei sicuro di voler resettare tutte le presenze?')) {
        return;
    }
    
    // Reset tutti come assenti
    fratelliData.forEach(fratello => {
        presenzeData[fratello.id] = {
            presente: false,
            ruolo: null
        };
    });
    
    renderFratelliList();
    updateStats();
    showSuccess('Presenze resettate');
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function showLoading(show) {
    const loading = document.getElementById('loadingPresenze');
    loading.style.display = show ? 'block' : 'none';
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}