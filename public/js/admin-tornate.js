console.log('🔥 SCRIPT CARICATO: admin-tornate.js - VERSIONE AGGIORNATA 2025-06-14');
// Variabili globali
let tornateData = [];
let fratelliData = [];
let currentEditId = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    loadFratelli();
    loadTornate();
    setupEventListeners();
});
// ✅ FUNZIONE ANTI-STRONZATE: FIX IL CASINO DEL SERVER
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    const dateStr = String(dateString);
    console.log('🔍 Input ricevuto:', dateStr);
    
    // Estrai YYYY-MM-DD dalla stringa
    const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
    
    if (match) {
        let extractedDate = match[1];
        
        // 🚨 FIX DEL CASINO: Se la stringa originale contiene T22:00:00 o T23:00:00
        // significa che il server ha fatto casino con il timezone
        if (dateStr.includes('T22:00:00') || dateStr.includes('T23:00:00')) {
            console.log('🔧 RILEVATO CASINO TIMEZONE, applico +1 giorno');
            
            // Aggiungi 1 giorno
            const dateParts = extractedDate.split('-');
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // JS months are 0-based
            const day = parseInt(dateParts[2]);
            
            const fixedDate = new Date(year, month, day + 1);
            const fixedYear = fixedDate.getFullYear();
            const fixedMonth = String(fixedDate.getMonth() + 1).padStart(2, '0');
            const fixedDay = String(fixedDate.getDate()).padStart(2, '0');
            
            extractedDate = `${fixedYear}-${fixedMonth}-${fixedDay}`;
            console.log(`✅ CORRETTO: ${match[1]} → ${extractedDate}`);
        }
        
        return extractedDate;
    }
    
    console.warn(`❌ FORMATO NON RICONOSCIUTO: ${dateString}`);
    return '';
}
// Setup event listeners
function setupEventListeners() {
    // Form submit
    document.getElementById('tornataForm').addEventListener('submit', handleFormSubmit);
    
    // Checkbox cena - mostra/nascondi costo e descrizione
    document.getElementById('cena').addEventListener('change', function() {
        const costoField = document.getElementById('costo_cena');
        const descrizioneField = document.getElementById('descrizione_cena');
        costoField.disabled = !this.checked;
        descrizioneField.disabled = !this.checked;
        if (!this.checked) {
            costoField.value = '';
            descrizioneField.value = '';
        }
    });
    
    // Filtri change
    document.getElementById('filtroAnno').addEventListener('change', applicaFiltri);
    document.getElementById('filtroTipoLoggia').addEventListener('change', applicaFiltri);
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

// Carica tornate
async function loadTornate() {
    showLoading(true);
    
    try {
        const response = await fetch('/api/tornate');
        const result = await response.json();
        
        if (result.success) {
            tornateData = result.data;
            renderTornateTable();
            updateStats();
        } else {
            throw new Error(result.message || 'Errore nel caricamento');
        }
    } catch (error) {
        console.error('Errore caricamento tornate:', error);
        showError('Errore nel caricamento delle tornate: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Applica filtri
async function applicaFiltri() {
    const anno = document.getElementById('filtroAnno').value;
    const tipoLoggia = document.getElementById('filtroTipoLoggia').value;
    const stato = document.getElementById('filtroStato').value;
    
    showLoading(true);
    
    try {
        const params = new URLSearchParams();
        if (anno) params.append('anno', anno);
        if (tipoLoggia) params.append('tipo_loggia', tipoLoggia);
        if (stato) params.append('stato', stato);
        
        const response = await fetch(`/api/tornate?${params}`);
        const result = await response.json();
        
        if (result.success) {
            tornateData = result.data;
            renderTornateTable();
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

// Renderizza tabella tornate
function renderTornateTable() {
    const tbody = document.getElementById('tornateTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');
    
    tbody.innerHTML = '';
    
    if (tornateData.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    tornateData.forEach(tornata => {
        const row = document.createElement('tr');
        
        // Formatta data
        const dataFormatted = new Date(tornata.data).toLocaleDateString('it-IT');
        
        // Tronca discussione se troppo lunga
        const discussione = tornata.discussione 
            ? (tornata.discussione.length > 50 
                ? tornata.discussione.substring(0, 47) + '...' 
                : tornata.discussione)
            : '-';
        
        row.innerHTML = `
            <td>${dataFormatted}</td>
            <td title="${tornata.discussione || ''}">${discussione}</td>
            <td>${tornata.nome_introduce || '-'}</td>
            <td>${tornata.location || '-'}</td>
            <td class="presenze-cell" id="presenze-${tornata.id}">
                <span class="presenze-loading">Caricamento...</span>
            </td>
            <td>
                <span class="tipo-badge tipo-${tornata.tipo_loggia}">
                    ${tornata.tipo_loggia === 'nostra' ? 'Nostra' : 'Altra'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${tornata.stato}">
                    ${getStatoLabel(tornata.stato)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="editTornata(${tornata.id})" title="Modifica">
                        ✏️
                    </button>
                    <button class="btn btn-secondary" onclick="viewTornata(${tornata.id})" title="Dettagli">
                        👁️
                    </button>
                    <button class="btn btn-success" onclick="openWhatsAppModal(${tornata.id})" title="Invia WhatsApp">
                        📱
                    </button>
                    <button class="btn btn-danger" onclick="deleteTornata(${tornata.id})" title="Elimina">
                        🗑️
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
        
        // Carica presenze in modo asincrono
        caricaPresenzePerTornata(tornata.id).then(count => {
            aggiornaPresenzeCell(tornata.id, count);
        });
    });
}

// Aggiorna statistiche
function updateStats() {
    const totalTornate = tornateData.length;
    const anno2025 = tornateData.filter(t => new Date(t.data).getFullYear() === 2025).length;
    const programmate = tornateData.filter(t => t.stato === 'programmata').length;
    const completate = tornateData.filter(t => t.stato === 'completata').length;
    
    document.getElementById('totalTornate').textContent = totalTornate;
    document.getElementById('tornateAnno').textContent = anno2025;
    document.getElementById('tornateProgr').textContent = programmate;
    document.getElementById('tornateCompl').textContent = completate;
}

// Apri modal
function openModal(mode, tornataId = null) {
    const modal = document.getElementById('tornataModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('tornataForm');
    
    currentEditId = tornataId;
    
    if (mode === 'nuova') {
        modalTitle.textContent = 'Nuova Tornata';
        form.reset();
        // Imposta data di oggi come default
        document.getElementById('data').value = new Date().toISOString().split('T')[0];
    } else if (mode === 'modifica' && tornataId) {
        modalTitle.textContent = 'Modifica Tornata';
        loadTornataInForm(tornataId);
    }
    
    modal.style.display = 'block';
}

// Chiudi modal
function closeModal() {
    const modal = document.getElementById('tornataModal');
    modal.style.display = 'none';
    currentEditId = null;
}

// Carica tornata nel form
function loadTornataInForm(tornataId) {
    const tornata = tornateData.find(t => t.id == tornataId);
    if (!tornata) return;
    
    // Riempi campi del form
    // ✅ CONVERSIONE CORRETTA DELLA DATA
// ✅ FORMATTAZIONE SENZA PROBLEMI DI TIMEZONE
const dataFormattata = formatDateForInput(tornata.data);
document.getElementById('data').value = dataFormattata;
    document.getElementById('orario_inizio').value = tornata.orario_inizio || '';
    document.getElementById('discussione').value = tornata.discussione || '';
    document.getElementById('chi_introduce').value = tornata.chi_introduce || '';
    document.getElementById('location').value = tornata.location || '';
    document.getElementById('tipo').value = tornata.tipo || 'ordinaria';
    document.getElementById('tipo_loggia').value = tornata.tipo_loggia || 'nostra';
    document.getElementById('cena').checked = tornata.cena;
    document.getElementById('costo_cena').value = tornata.costo_cena || '';
    document.getElementById('costo_cena').disabled = !tornata.cena;
    document.getElementById('descrizione_cena').value = tornata.descrizione_cena || '';
    document.getElementById('descrizione_cena').disabled = !tornata.cena;
    document.getElementById('argomento_istruzione').value = tornata.argomento_istruzione || '';
    document.getElementById('orario_istruzione').value = tornata.orario_istruzione || '';
    document.getElementById('link_audio').value = tornata.link_audio || '';
    document.getElementById('link_pagina').value = tornata.link_pagina || '';
    document.getElementById('stato').value = tornata.stato || 'programmata';
    document.getElementById('note').value = tornata.note || '';
}

// ✅ FUNZIONE CORRETTA - USA SEMPRE ENDPOINT ADMIN PROTETTI
async function handleFormSubmit(e) {
    e.preventDefault();
    
    console.log('📝 DEBUG: handleFormSubmit chiamata - VERSIONE CORRETTA');
    console.log('📝 DEBUG: cena checkbox value:', document.getElementById('cena').checked);
    
    console.log('📝 Form submit iniziato (VERSIONE ADMIN CORRETTA)');
    
    const formData = new FormData(e.target);
    const tornataData = {};
    
    // Conversione corretta FormData -> Object
    for (let [key, value] of formData.entries()) {
        tornataData[key] = value || null;
    }
    
    // Gestione checkbox corretta
    tornataData.cena = document.getElementById('cena').checked;
    
    console.log('📝 Dati da inviare:', tornataData);
    
    try {
        // ✅ USA SEMPRE ENDPOINT ADMIN PROTETTI
        let url = '/api/admin/tornate';
        let method = 'POST';
        
        if (currentEditId) {
            url = '/api/admin/tornate/' + currentEditId;  // ✅ ANCHE UPDATE USA ADMIN
            method = 'PUT';
        }
        
        console.log('📤 Invio a:', method, url);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tornataData)
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
            const message = result.message || (currentEditId ? 'Tornata aggiornata con successo!' : 'Tornata creata con successo!');
            
            console.log('🎉 SUCCESSO! Messaggio:', message);
            
            // Chiudi modal e ricarica
            alert('✅ ' + message);
            closeModal();
            
            // Ricarica la tabella
            console.log('🔄 Ricaricamento tabella...');
            await loadTornate();
            
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

// Modifica tornata
function editTornata(id) {
    openModal('modifica', id);
}

// Visualizza dettagli tornata
function viewTornata(id) {
    const tornata = tornateData.find(t => t.id == id);
    if (!tornata) return;
    
    // Crea modal personalizzato per i dettagli
    const detailsModal = document.createElement('div');
    detailsModal.className = 'modal';
    detailsModal.style.display = 'block';
    
    detailsModal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>📋 RIEPILOGO TORNATA</h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            
            <div style="padding: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>📅 Data:</strong><br>
                        ${new Date(tornata.data).toLocaleDateString('it-IT')}
                    </div>
                    <div>
                        <strong>🕐 Ora Inizio:</strong><br>
                        ${tornata.orario_inizio || 'Non specificata'}
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <strong>💬 Discussione:</strong><br>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 5px;">
                        ${tornata.discussione || 'Nessuna discussione specificata'}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>👤 Chi introduce:</strong><br>
                        ${tornata.nome_introduce || 'Nessuno'}
                    </div>
                    <div>
                        <strong>📍 Location:</strong><br>
                        ${tornata.location || 'Non specificata'}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>🏛️ Tipo Tornata:</strong><br>
                        ${capitalizeFirst(tornata.tipo || 'ordinaria')} 
                        <span class="tipo-badge tipo-${tornata.tipo_loggia}" style="margin-left: 10px;">
                            ${tornata.tipo_loggia === 'nostra' ? 'Nostra Loggia' : 'Altra Loggia'}
                        </span>
                    </div>
                    <div>
                        <strong>⚡ Stato:</strong><br>
                        <span class="status-badge status-${tornata.stato}">
                            ${getStatoLabel(tornata.stato)}
                        </span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <strong>🍽️ Cena:</strong><br>
                        ${tornata.cena ? `✅ Sì (€${tornata.costo_cena || 'N/A'})` : '❌ No'}
                        ${tornata.descrizione_cena ? `<br><em style="color: #666; font-size: 0.9em;">${tornata.descrizione_cena}</em>` : ''}
                    </div>
                    <div>
                        <strong>📚 Ora Istruzione:</strong><br>
                        ${tornata.orario_istruzione || 'Non prevista'}
                    </div>
                </div>
                
                ${tornata.argomento_istruzione ? `
                <div style="margin-bottom: 20px;">
                    <strong>📖 Argomento Istruzione:</strong><br>
                    <div style="background: #e8f4fd; padding: 10px; border-radius: 5px; margin-top: 5px; border-left: 4px solid #007bff;">
                        ${tornata.argomento_istruzione}
                    </div>
                </div>
                ` : ''}
                
                ${(tornata.link_audio || tornata.link_pagina) ? `
                <div style="margin-bottom: 20px;">
                    <strong>🔗 Link Disponibili:</strong><br>
                    <div style="margin-top: 10px;">
                        ${tornata.link_audio ? `
                        <div style="margin-bottom: 5px;">
                            🎵 <a href="${tornata.link_audio}" target="_blank" style="color: #007bff; text-decoration: none;">Audio Tornata</a>
                        </div>
                        ` : ''}
                        ${tornata.link_pagina ? `
                        <div>
                            📄 <a href="${tornata.link_pagina}" target="_blank" style="color: #007bff; text-decoration: none;">Pagina Istruzione</a>
                        </div>
                        ` : ''}
                    </div>
                </div>
                ` : ''}
                
                ${tornata.note ? `
                <div style="margin-bottom: 20px;">
                    <strong>📝 Note:</strong><br>
                    <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 5px; border-left: 4px solid #ffc107;">
                        ${tornata.note}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div style="text-align: right; border-top: 1px solid #ddd; padding-top: 15px;">
                <button class="btn btn-primary" onclick="editTornata(${tornata.id}); this.closest('.modal').remove();" style="margin-right: 10px;">
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

// Elimina tornata
async function deleteTornata(id) {
    const tornata = tornateData.find(t => t.id == id);
    if (!tornata) return;
    
    const confirmed = confirm(`Sei sicuro di voler eliminare la tornata del ${new Date(tornata.data).toLocaleDateString('it-IT')}?`);
    if (!confirmed) return;
    
    try {
        // ✅ USA ENDPOINT ADMIN PROTETTO ANCHE PER DELETE
        const response = await fetch(`/api/admin/tornate/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Tornata eliminata con successo');
            loadTornate(); // Ricarica tabella
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('Errore eliminazione tornata:', error);
        showError('Errore nell\'eliminazione: ' + error.message);
    }
}

// Carica il conteggio delle presenze per una specifica tornata
async function caricaPresenzePerTornata(tornataId) {
    try {
        console.log(`📊 Caricamento presenze per tornata ${tornataId}`);
        
        const response = await fetch(`/api/presenze/tornata/${tornataId}`);
        if (!response.ok) {
            console.error(`❌ Errore HTTP ${response.status} per tornata ${tornataId}`);
            return 0;
        }
        
        const data = await response.json();
        if (data.success && data.data && data.data.presenze) {
            // Conta solo i fratelli PRESENTI (presente === 1)
            const presenti = data.data.presenze.filter(p => p.presente === 1);
            console.log(`✅ Tornata ${tornataId}: ${presenti.length} fratelli presenti`);
            return presenti.length;
        }
        
        return 0;
    } catch (error) {
        console.error(`💥 Errore caricamento presenze per tornata ${tornataId}:`, error);
        return 0;
    }
}

// Aggiorna la visualizzazione delle presenze in una cella
function aggiornaPresenzeCell(tornataId, count) {
    const cell = document.getElementById(`presenze-${tornataId}`);
    if (!cell) return;
    
    if (count === 0) {
        cell.innerHTML = '<span class="presenze-zero">0</span>';
    } else {
        cell.innerHTML = `<span class="presenze-number">${count}</span>`;
    }
}

// Apri modal WhatsApp per tornata esistente
async function openWhatsAppModal(tornataId) {
    try {
        console.log(`📱 Preparazione modal WhatsApp per tornata ${tornataId}`);
        
        // Mostra loading
        const loadingModal = document.createElement('div');
        loadingModal.className = 'modal';
        loadingModal.style.display = 'block';
        loadingModal.innerHTML = `
            <div class="modal-content" style="text-align: center; max-width: 400px;">
                <h3>📱 Preparazione WhatsApp...</h3>
                <div class="loading">Caricamento dati in corso...</div>
            </div>
        `;
        document.body.appendChild(loadingModal);
        
        // Chiama API backend per preparare dati WhatsApp
        const response = await fetch(`/api/tornate/${tornataId}/whatsapp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Rimuovi loading
        document.body.removeChild(loadingModal);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const whatsappData = await response.json();
        
        if (!whatsappData.success) {
            throw new Error(whatsappData.message || 'Errore preparazione WhatsApp');
        }
        
        // Mostra modal con i dati
        showWhatsAppLinksModal(whatsappData.data);
        
    } catch (error) {
        console.error('❌ Errore preparazione WhatsApp:', error);
        
        // Rimuovi loading se esiste ancora
        const loadingModal = document.querySelector('.modal');
        if (loadingModal && loadingModal.innerHTML.includes('Preparazione WhatsApp')) {
            document.body.removeChild(loadingModal);
        }
        
        showError('Errore nella preparazione dei link WhatsApp: ' + error.message);
    }
}

// Mostra modal con tutti i link WhatsApp pronti
function showWhatsAppLinksModal(whatsappData) {
    if (!whatsappData || whatsappData.error) {
        showError('Errore nella preparazione dei link WhatsApp: ' + (whatsappData?.error || 'Sconosciuto'));
        return;
    }

    console.log('📱 Mostra modal WhatsApp:', whatsappData);

    const modal = document.createElement('div');
    modal.className = 'modal whatsapp-links-modal';
    modal.style.display = 'block';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #25D366, #128C7E); color: white;">
                <h2>
                    📱 Annuncio WhatsApp Pronto!
                </h2>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            
            <div style="padding: 25px;">
                <div style="background: #d4edda; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #25D366;">
                    <h3 style="margin: 0 0 10px 0; color: #155724;">
                        ✅ Tornata pronta per invio!
                    </h3>
                    <p style="margin: 0; color: #155724;">
                        <strong>${whatsappData.total_fratelli} fratelli</strong> riceveranno il messaggio WhatsApp.
                        Clicca i pulsanti qui sotto per inviare.
                    </p>
                </div>

                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0;">📱 Anteprima messaggio:</h4>
                    <div style="background: white; padding: 12px; border-radius: 8px; border-left: 4px solid #25D366; font-family: system-ui; line-height: 1.4; white-space: pre-line;">
                        ${whatsappData.message}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <h4>🚀 Invia messaggi:</h4>
                    
                    <div style="margin-bottom: 15px;">
                        <button onclick="sendWhatsAppToAll(${JSON.stringify(whatsappData.links).replace(/"/g, '&quot;')})" 
                                class="btn" 
                                style="background: linear-gradient(135deg, #25D366, #128C7E); color: white; padding: 15px 25px; font-size: 1.1rem; border-radius: 10px; border: none; cursor: pointer; width: 100%;">
                            📢 INVIA A TUTTI I ${whatsappData.total_fratelli} FRATELLI
                        </button>
                    </div>
                    
                    <details style="border: 1px solid #ddd; border-radius: 8px; padding: 10px;">
                        <summary style="cursor: pointer; font-weight: bold; padding: 5px;">
                            📋 Oppure invia individualmente (${whatsappData.total_fratelli} fratelli)
                        </summary>
                        <div style="max-height: 300px; overflow-y: auto; margin-top: 10px;">
                            ${whatsappData.links.map(link => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                                    <span>${link.fratello_nome}</span>
                                    <button onclick="window.open('${link.link}', '_blank')" 
                                            class="btn btn-sm" 
                                            style="background: #25D366; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                                        📱 Invia
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                </div>

                <div style="background: #fff3cd; padding: 15px; border-radius: 10px; border-left: 4px solid #ffc107;">
                    <h5 style="margin: 0 0 5px 0;">💡 Come funziona:</h5>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>Clicca "INVIA A TUTTI" per aprire ${whatsappData.total_fratelli} chat WhatsApp</li>
                        <li>Ogni chat si aprirà con il messaggio già pronto</li>
                        <li>Premi semplicemente "Invio" per inviare</li>
                        <li>I fratelli riceveranno il link per confermare presenza</li>
                    </ol>
                </div>
            </div>
            
            <div style="text-align: center; border-top: 1px solid #ddd; padding: 15px;">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove();">
                    ⏭️ Chiudi
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Chiudi cliccando fuori
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// Invia WhatsApp a tutti i fratelli
function sendWhatsAppToAll(links) {
    if (!links || links.length === 0) {
        showError('Nessun link disponibile');
        return;
    }

    const confirmed = confirm(`Vuoi aprire ${links.length} chat WhatsApp?\n\nOgni chat si aprirà con il messaggio già pronto. Dovrai solo premere "Invio" per inviare.`);
    
    if (!confirmed) return;

    console.log(`📱 Apertura ${links.length} chat WhatsApp...`);
    
    // Apri una chat ogni 2 secondi per evitare blocchi del browser
    links.forEach((link, index) => {
        setTimeout(() => {
            console.log(`📱 Aprendo chat ${index + 1}/${links.length}: ${link.fratello_nome}`);
            window.open(link.link, '_blank');
        }, index * 2000);
    });
    
    // Chiudi modal
    document.querySelector('.whatsapp-links-modal').remove();
    
    showSuccess(`Apertura di ${links.length} chat WhatsApp in corso...`);
}

// Utility functions
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function getStatoLabel(stato) {
    const labels = {
        'programmata': 'Programmata',
        'completata': 'Completata', 
        'annullata': 'Annullata'
    };
    return labels[stato] || stato;
}

function showLoading(show) {
    const loading = document.getElementById('loadingTornate');
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
    const modal = document.getElementById('tornataModal');
    if (event.target == modal) {
        closeModal();
    }
}