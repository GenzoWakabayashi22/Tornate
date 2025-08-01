// Variabili globali
let fratelliData = [];
let filteredData = [];
let currentEditId = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', function () {
    loadFratelli();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Form submit
    document.getElementById('fratelloForm').addEventListener('submit', handleFormSubmit);
}

// Carica lista fratelli
async function loadFratelli() {
    showLoading(true);

    try {
        const response = await fetch('/api/fratelli');
        const result = await response.json();

        console.log("📦 Risposta API completa:", result);
        console.log("📦 Primo fratello esempio:", result.data?.[0]);

        if (result.success && Array.isArray(result.data)) {
            fratelliData = result.data.sort((a, b) => a.nome.localeCompare(b.nome));
        } else if (Array.isArray(result)) {
            fratelliData = result.sort((a, b) => a.nome.localeCompare(b.nome));
        } else {
            throw new Error('Formato dati non valido: ' + JSON.stringify(result));
        }

        filteredData = [...fratelliData];
        renderFratelliTable();
        updateStats();

    } catch (error) {
        console.error('Errore caricamento fratelli:', error);
        showError('Errore nel caricamento dei fratelli: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Applica filtri
function applicaFiltri() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const gradoFiltro = document.getElementById('filtroGrado').value;

    filteredData = fratelliData.filter(fratello => {
        const matchNome = fratello.nome.toLowerCase().includes(searchTerm);
        const matchGrado = !gradoFiltro || fratello.grado === gradoFiltro;
        return matchNome && matchGrado;
    });

    renderFratelliTable();
}

// Reset filtri
function resetFiltri() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filtroGrado').value = '';
    filteredData = [...fratelliData];
    renderFratelliTable();
}

// Renderizza tabella fratelli
function renderFratelliTable() {
    const tbody = document.getElementById('fratelliTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (filteredData.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'block';
    emptyState.style.display = 'none';

    filteredData.forEach(fratello => {
        const row = document.createElement('tr');
        const gradoBadgeClass = `grado-${fratello.grado.toLowerCase()}`;

        console.log(`🔍 Fratello ${fratello.nome}: cariche_fisse = "${fratello.cariche_fisse}"`);

        let ruoloDisplay = '';
        if (
            fratello.cariche_fisse &&
            fratello.cariche_fisse.trim() !== '' &&
            fratello.cariche_fisse !== 'null' &&
            fratello.cariche_fisse !== 'undefined'
        ) {
            ruoloDisplay = `<span class="ruolo-fisso">📋 ${fratello.cariche_fisse}</span>`;
            console.log(`✅ Ruolo fisso per ${fratello.nome}: ${fratello.cariche_fisse}`);
        } else {
            ruoloDisplay = '<span style="color: #999;">Nessuno</span>';
            console.log(`❌ Nessun ruolo per ${fratello.nome} (valore: "${fratello.cariche_fisse}")`);
        }

        row.innerHTML = `
            <td><strong>${fratello.nome}</strong></td>
            <td><span class="grado-badge ${gradoBadgeClass}">${fratello.grado}</span></td>
            <td>${ruoloDisplay}</td>
            <td>${fratello.cariche || '<span style="color: #999;">Nessuna</span>'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="editFratello(${fratello.id})" title="Modifica">✏️ Modifica</button>
                    <button class="btn btn-danger" onclick="deleteFratello(${fratello.id}, '${fratello.nome}')" title="Elimina">🗑️ Elimina</button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// Aggiorna statistiche
function updateStats() {
    const total = fratelliData.length;
    const maestri = fratelliData.filter(f => f.grado === 'Maestro').length;
    const compagni = fratelliData.filter(f => f.grado === 'Compagno').length;
    const apprendisti = fratelliData.filter(f => f.grado === 'Apprendista').length;
    const conRuoli = fratelliData.filter(f =>
        f.cariche_fisse &&
        f.cariche_fisse.trim() !== '' &&
        f.cariche_fisse !== 'undefined' &&
        f.cariche_fisse !== 'null'
    ).length;

    document.getElementById('totalFratelli').textContent = total;
    document.getElementById('totalMaestri').textContent = maestri;
    document.getElementById('totalCompagni').textContent = compagni;
    document.getElementById('totalApprendisti').textContent = apprendisti;
    document.getElementById('totalConRuoli').textContent = conRuoli;
}

// Apri modal
function openModal(mode, fratelloId = null) {
    const modal = document.getElementById('fratelloModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('fratelloForm');

    currentEditId = fratelloId;

    if (mode === 'nuovo') {
        modalTitle.textContent = 'Nuovo Fratello';
        form.reset();
    } else if (mode === 'modifica' && fratelloId) {
        modalTitle.textContent = 'Modifica Fratello';
        loadFratelloInForm(fratelloId);
    }

    modal.style.display = 'block';
}

// Chiudi modal
function closeModal() {
    document.getElementById('fratelloModal').style.display = 'none';
    currentEditId = null;
}

// Carica fratello nel form
function loadFratelloInForm(fratelloId) {
    const fratello = fratelliData.find(f => f.id == fratelloId);
    if (!fratello) return;

    document.getElementById('nome').value = fratello.nome || '';
    document.getElementById('grado').value = fratello.grado || '';
    document.getElementById('cariche_fisse').value = fratello.cariche_fisse || '';
    document.getElementById('cariche').value = fratello.cariche || '';
}

// Salvataggio semplificato
async function handleFormSubmit(e) {
    e.preventDefault();
    console.log('👥 ADMIN: Salvataggio fratello iniziato...');

    const formData = new FormData(e.target);
    const fratelloData = {};

    for (let [key, value] of formData.entries()) {
        fratelloData[key] = value || null;
    }

    console.log('📋 Dati fratello da salvare:', fratelloData);

    try {
        let url = '/api/admin/fratelli';
        let method = 'POST';

        if (currentEditId) {
            url = `/api/admin/fratelli/${currentEditId}`;
            method = 'PUT';
        }

        console.log(`📤 Invio ${method} a: ${url}`);

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fratelloData)
        });

        console.log('📥 Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Risposta ricevuta:', result);

        if (result.success) {
            showSuccess(result.message || 'Fratello salvato con successo!');
            closeModal();
            console.log('🔄 Ricaricamento dati dal database...');
            await loadFratelli();
            console.log('✅ Dati aggiornati visualizzati');
        } else {
            throw new Error(result.message || 'Errore nel salvataggio');
        }

    } catch (error) {
        console.error('❌ Errore salvataggio fratello:', error);
        showError('Errore nel salvataggio: ' + error.message);
    }
}

// Modifica fratello
function editFratello(id) {
    openModal('modifica', id);
}

// Elimina fratello
async function deleteFratello(id, nome) {
    const confirmed = confirm(`⚠️ ATTENZIONE!\n\nSei sicuro di voler eliminare il fratello "${nome}"?\n\nQuesta azione:\n- Rimuoverà TUTTE le sue presenze\n- Rimuoverà il suo ruolo fisso\n- NON può essere annullata\n\nDigita "ELIMINA" per confermare.`);

    if (!confirmed) return;

    const confirmText = prompt(`Per confermare l'eliminazione di "${nome}", digita esattamente: ELIMINA`);

    if (confirmText !== 'ELIMINA') {
        showError('Eliminazione annullata - testo di conferma non corretto');
        return;
    }

    try {
        const response = await fetch(`/api/admin/fratelli/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showSuccess(`Fratello "${nome}" eliminato con successo`);
            loadFratelli();
        } else {
            throw new Error(result.message || 'Errore nell\'eliminazione');
        }

    } catch (error) {
        console.error('Errore eliminazione fratello:', error);
        showError('Errore nell\'eliminazione: ' + error.message);
    }
}

// Utility
function showLoading(show) {
    const loading = document.getElementById('loadingFratelli');
    const tableContainer = document.getElementById('tableContainer');
    const emptyState = document.getElementById('emptyState');

    loading.style.display = show ? 'block' : 'none';
    if (show) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'none';
    }
}

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Gestione click fuori dal modal
window.onclick = function (event) {
    const modal = document.getElementById('fratelloModal');
    if (event.target === modal) {
        closeModal();
    }
};