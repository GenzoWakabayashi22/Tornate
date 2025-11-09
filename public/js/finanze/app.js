// Configurazione API
const API_BASE = '';

// Check session from Tornate
const fratelliAuth = JSON.parse(sessionStorage.getItem('fratelliAuth') || '{}');
const userNome = fratelliAuth.nome || 'Fratello';
const isAdmin = fratelliAuth.nome && fratelliAuth.nome.includes('Paolo Giulio Gazzano');

// Update welcome message
if (document.getElementById('userWelcome')) {
    document.getElementById('userWelcome').textContent = `Benvenuto, ${userNome}`;
}

// Disable edit buttons if not admin
if (!isAdmin) {
    document.addEventListener('DOMContentLoaded', () => {
        const editButtons = [
            'addTransactionBtn',
            'manageCategoriesBtn',
            'addCategoryBtn'
        ];
        editButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.disabled = true;
                btn.title = 'Solo il Tesoriere può modificare';
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    });
}

let currentUser = { username: userNome, role: isAdmin ? 'admin' : 'viewer' };

// State management
let categorieEntrate = [];
let categorieUscite = [];
let allTransactions = [];
let filteredTransactions = [];
let isEditingTransaction = false;
let editingTransactionId = null;

// Paginazione
let currentMainPage = 1;
let currentModalPage = 1;
let mainTableLimit = 25;
let modalTableLimit = 25;
let totalMainTransactions = 0;

// Inizializzazione app
document.addEventListener('DOMContentLoaded', function() {
    // Imposta data corrente nel form
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transactionDate').value = today;

    // Mostra l'app principale
    showMainApp();

    // Event listeners
    document.getElementById('transactionForm').addEventListener('submit', handleAddTransaction);

    // Aggiungi event listener per il form categorie se esiste
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', handleAddCategory);
    }
});

// === GESTIONE UI ===

function showMainApp() {
    // Mostra info utente con ruolo
    const welcomeElement = document.getElementById('userWelcome');
    if (welcomeElement) {
        welcomeElement.textContent = `Benvenuto, ${userNome}`;
    }

    // Nascondi bottoni se non admin
    const addTransactionBtn = document.querySelector('button[onclick="openModal(\'addTransactionModal\')"]');
    const manageCategoriesBtn = document.querySelector('button[onclick="openModal(\'manageCategoriesModal\')"]');

    if (addTransactionBtn) addTransactionBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (manageCategoriesBtn) manageCategoriesBtn.style.display = isAdmin ? 'inline-block' : 'none';

    // FIX 1: Sincronizza il limite della tabella principale con il valore del dropdown
    const mainTableLimitSelect = document.getElementById('mainTableLimit');
    if (mainTableLimitSelect) {
        mainTableLimit = parseInt(mainTableLimitSelect.value);
        console.log(`📊 Main table limit initialized to: ${mainTableLimit}`);
    }

    // Carica dati iniziali
    loadDashboard();
    loadTransactions();
    loadCategories();

    // NUOVO: Inizializza i filtri dopo che i dati sono caricati
    setTimeout(() => {
        if (typeof inizializzaSistemaFiltri === 'function') {
            inizializzaSistemaFiltri();
            console.log('🔍 Sistema filtri inizializzato da app.js');
        }
    }, 1500);
}

// === GESTIONE DASHBOARD ===

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/api/finanze/riepilogo?anno=${new Date().getFullYear()}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            document.getElementById('saldoAttuale').textContent = formatCurrency(data.saldo_finale);
            document.getElementById('entrateAnno').textContent = formatCurrency(data.totale_entrate);
            document.getElementById('usciteAnno').textContent = formatCurrency(data.totale_uscite);
        }
    } catch (error) {
        console.error('Errore caricamento dashboard:', error);
    }
}

// === GESTIONE TRANSAZIONI ===

async function loadTransactions() {
    const container = document.getElementById('transactionsContainer');
    container.innerHTML = '<div class="loading"></div> <span>Caricamento...</span>';

    try {
        const offset = (currentMainPage - 1) * mainTableLimit;
        console.log(`📊 Loading transactions: page ${currentMainPage}, limit ${mainTableLimit}, offset ${offset}`);
        const response = await fetch(`${API_BASE}/api/finanze/transazioni?limit=${mainTableLimit}&offset=${offset}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            // Se la risposta è il nuovo formato con oggetto
            if (data.transactions) {
                console.log(`✅ Loaded ${data.transactions.length} transactions of ${data.total} total`);
                displayTransactions(data.transactions, container, isAdmin);
                updateMainPagination(data.transactions.length, data.total, data.hasMore);
            } else {
                // Compatibilità con il vecchio formato (array diretto)
                console.log(`✅ Loaded ${data.length} transactions (legacy format)`);
                displayTransactions(data, container, isAdmin);
                updateMainPagination(data.length);
            }
        } else {
            container.innerHTML = '<p>Errore nel caricamento delle transazioni</p>';
        }
    } catch (error) {
        container.innerHTML = '<p>Errore di connessione</p>';
        console.error('Errore caricamento transazioni:', error);
    }
}

async function loadAllTransactions() {
    const container = document.getElementById('allTransactionsContainer');
    container.innerHTML = '<div class="loading"></div> <span>Caricamento...</span>';

    try {
        const response = await fetch(`${API_BASE}/api/finanze/transazioni?limit=1000`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();

            // Se la risposta è il nuovo formato con oggetto
            if (data.transactions) {
                allTransactions = data.transactions;
            } else {
                // Compatibilità con il vecchio formato (array diretto)
                allTransactions = data;
            }

            filteredTransactions = [...allTransactions];
            populateYearFilter();
            currentModalPage = 1;
            displayModalTransactions();
        } else {
            container.innerHTML = '<p>Errore nel caricamento delle transazioni</p>';
        }
    } catch (error) {
        container.innerHTML = '<p>Errore di connessione</p>';
        console.error('Errore caricamento transazioni:', error);
    }
}

function displayModalTransactions() {
    const container = document.getElementById('allTransactionsContainer');
    const startIndex = (currentModalPage - 1) * modalTableLimit;
    const endIndex = startIndex + modalTableLimit;
    const pageTransactions = filteredTransactions.slice(startIndex, endIndex);

    displayTransactions(pageTransactions, container, isAdmin);
    updateModalPagination();
}

function displayTransactions(transactions, container, showActions = false) {
    if (transactions.length === 0) {
        container.innerHTML = '<p>Nessuna transazione trovata</p>';
        return;
    }

    let html = `
        <table class="table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Descrizione</th>
                    <th>Importo</th>
                    ${showActions ? '<th>Azioni</th>' : ''}
                </tr>
            </thead>
            <tbody>
    `;

    transactions.forEach(transaction => {
        const categoria = transaction.categoria_entrata || transaction.categoria_uscita;
        const badgeClass = transaction.tipo === 'entrata' ? 'badge-entrata' : 'badge-uscita';

        html += `
            <tr>
                <td>${formatDate(transaction.data_transazione)}</td>
                <td><span class="badge ${badgeClass}">${transaction.tipo}</span></td>
                <td>${categoria}</td>
                <td>${transaction.descrizione}</td>
                <td class="${transaction.tipo === 'entrata' ? 'entrate' : 'uscite'}">
                    ${transaction.tipo === 'entrata' ? '+' : '-'}${formatCurrency(transaction.importo)}
                </td>
                ${showActions ? `
                    <td class="actions-column">
                        <div class="actions-buttons">
                            <button class="btn btn-sm" onclick="editTransaction(${transaction.id})" style="padding: 5px 10px;">✏️</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteTransaction(${transaction.id})" style="padding: 5px 10px;">🗑️</button>
                        </div>
                    </td>
                ` : ''}
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

async function editTransaction(id) {
    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può modificare le transazioni.");
        return;
    }

    console.log('Modificando transazione ID:', id);

    try {
        const response = await fetch(`${API_BASE}/api/finanze/transazioni/${id}`, {
            credentials: 'include'
        });

        if (response.ok) {
            const transaction = await response.json();
            console.log('Dati transazione caricati:', transaction);

            // Popola il form con i dati della transazione
            document.getElementById('transactionDate').value = transaction.data_transazione;
            document.getElementById('transactionType').value = transaction.tipo;
            document.getElementById('transactionAmount').value = transaction.importo;
            document.getElementById('transactionDescription').value = transaction.descrizione;

            // Aggiorna le categorie basate sul tipo
            await updateCategories();

            // Seleziona la categoria corretta
            const categoriaId = transaction.tipo === 'entrata' ? transaction.categoria_entrata_id : transaction.categoria_uscita_id;
            document.getElementById('transactionCategory').value = categoriaId;

            // Imposta modalità editing
            isEditingTransaction = true;
            editingTransactionId = id;

            // Cambia il titolo e il testo del pulsante
            document.querySelector('#addTransactionModal .modal-header h3').textContent = 'Modifica Transazione';
            document.querySelector('#transactionForm button[type="submit"]').innerHTML = '💾 Aggiorna Transazione';

            // Chiudi la modal delle transazioni se è aperta
            const viewModal = document.getElementById('viewTransactionsModal');
            if (viewModal && viewModal.style.display === 'block') {
                closeModal('viewTransactionsModal');
            }

            // Apri la modal di editing
            openModal('addTransactionModal');

            console.log('Modal di editing aperta per transazione ID:', id);
        } else {
            console.error('Errore response:', response.status);
            alert('Errore nel caricamento della transazione');
        }
    } catch (error) {
        console.error('Errore caricamento transazione:', error);
        alert('Errore nel caricamento della transazione');
    }
}

async function deleteTransaction(id) {
    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può eliminare le transazioni.");
        return;
    }

    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/finanze/transazioni/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            // Ricarica i dati
            loadDashboard();
            loadTransactions();
            if (document.getElementById('viewTransactionsModal').style.display === 'block') {
                loadAllTransactions();
            }

            // NUOVO: Aggiorna anche i filtri
            setTimeout(() => {
                if (typeof aggiornaFiltriDopoCambimenti === 'function') {
                    aggiornaFiltriDopoCambimenti();
                }
            }, 500);

            alert('Transazione eliminata con successo');
        } else {
            alert('Errore nell\'eliminazione della transazione');
        }
    } catch (error) {
        console.error('Errore eliminazione transazione:', error);
        alert('Errore nell\'eliminazione della transazione');
    }
}

async function handleAddTransaction(event) {
    event.preventDefault();

    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può inserire o modificare transazioni.");
        return;
    }

    hideMessage('transactionError');
    hideMessage('transactionSuccess');

    const formData = {
        data_transazione: document.getElementById('transactionDate').value,
        tipo: document.getElementById('transactionType').value,
        categoria_id: document.getElementById('transactionCategory').value,
        importo: document.getElementById('transactionAmount').value,
        descrizione: document.getElementById('transactionDescription').value
    };

    try {
        const url = isEditingTransaction
            ? `${API_BASE}/api/finanze/transazioni/${editingTransactionId}`
            : `${API_BASE}/api/finanze/transazioni`;

        const method = isEditingTransaction ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            const message = isEditingTransaction ? 'Transazione aggiornata con successo!' : 'Transazione salvata con successo!';
            showMessage('transactionSuccess', message);

            // Reset form e stato
            resetTransactionForm();

            // Ricarica dati
            loadDashboard();
            loadTransactions();
            if (document.getElementById('viewTransactionsModal').style.display === 'block') {
                loadAllTransactions();
            }

            // NUOVO: Aggiorna anche i filtri
            setTimeout(() => {
                if (typeof aggiornaFiltriDopoCambimenti === 'function') {
                    aggiornaFiltriDopoCambimenti();
                }
            }, 500);

            // Chiudi modal dopo 2 secondi
            setTimeout(() => {
                closeModal('addTransactionModal');
            }, 2000);
        } else {
            showMessage('transactionError', data.error);
        }
    } catch (error) {
        showMessage('transactionError', 'Errore di connessione al server');
        console.error('Errore transazione:', error);
    }
}

function resetTransactionForm() {
    document.getElementById('transactionForm').reset();
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];

    // Reset stato editing
    isEditingTransaction = false;
    editingTransactionId = null;

    // Reset titolo e pulsante
    document.querySelector('#addTransactionModal .modal-header h3').textContent = 'Nuova Transazione';
    document.querySelector('#transactionForm button[type="submit"]').innerHTML = '💾 Salva Transazione';
}

// === GESTIONE CATEGORIE ===

async function loadCategories() {
    try {
        // Carica categorie entrate
        const entrateResponse = await fetch(`${API_BASE}/api/finanze/categorie/entrate`, {
            credentials: 'include'
        });
        if (entrateResponse.ok) {
            categorieEntrate = await entrateResponse.json();
        }

        // Carica categorie uscite
        const usciteResponse = await fetch(`${API_BASE}/api/finanze/categorie/uscite`, {
            credentials: 'include'
        });
        if (usciteResponse.ok) {
            categorieUscite = await usciteResponse.json();
        }
    } catch (error) {
        console.error('Errore caricamento categorie:', error);
    }
}

async function loadCategoriesManagement() {
    await loadCategories();
    displayCategoriesManagement();
}

function displayCategoriesManagement() {
    const container = document.getElementById('categoriesManagementContainer');

    let html = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div>
                <h4 style="color: #38a169; margin-bottom: 15px;">💰 Categorie Entrate</h4>
                <div class="categories-list">
    `;

    categorieEntrate.forEach(categoria => {
        html += `
            <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
                <div>
                    <strong>${categoria.nome}</strong>
                    ${categoria.descrizione ? `<br><small style="color: #718096;">${categoria.descrizione}</small>` : ''}
                </div>
                <div>
                    ${isAdmin ? `
                        <button class="btn btn-sm" onclick="editCategory('entrate', ${categoria.id}, '${categoria.nome}', '${categoria.descrizione || ''}')" style="padding: 4px 8px; margin-right: 5px;">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCategory('entrate', ${categoria.id})" style="padding: 4px 8px;">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
            <div>
                <h4 style="color: #e53e3e; margin-bottom: 15px;">💸 Categorie Uscite</h4>
                <div class="categories-list">
    `;

    categorieUscite.forEach(categoria => {
        html += `
            <div class="category-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px;">
                <div>
                    <strong>${categoria.nome}</strong>
                    ${categoria.descrizione ? `<br><small style="color: #718096;">${categoria.descrizione}</small>` : ''}
                </div>
                <div>
                    ${isAdmin ? `
                        <button class="btn btn-sm" onclick="editCategory('uscite', ${categoria.id}, '${categoria.nome}', '${categoria.descrizione || ''}')" style="padding: 4px 8px; margin-right: 5px;">✏️</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCategory('uscite', ${categoria.id})" style="padding: 4px 8px;">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function updateCategories() {
    return new Promise((resolve) => {
        const tipo = document.getElementById('transactionType').value;
        const categorySelect = document.getElementById('transactionCategory');

        categorySelect.innerHTML = '<option value="">Seleziona categoria</option>';

        const categorie = tipo === 'entrata' ? categorieEntrate : categorieUscite;

        categorie.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nome;
            categorySelect.appendChild(option);
        });

        resolve();
    });
}

let isEditingCategory = false;
let editingCategoryId = null;
let editingCategoryType = null;

function openAddCategoryModal() {
    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può inserire o modificare categorie.");
        return;
    }

    resetCategoryForm();
    openModal('addCategoryModal');
}

function editCategory(tipo, id, nome, descrizione) {
    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può modificare le categorie.");
        return;
    }

    // Popola il form
    document.getElementById('categoryType').value = tipo;
    document.getElementById('categoryName').value = nome;
    document.getElementById('categoryDescription').value = descrizione;

    // Imposta modalità editing
    isEditingCategory = true;
    editingCategoryId = id;
    editingCategoryType = tipo;

    // Cambia titolo e pulsante
    document.querySelector('#addCategoryModal .modal-header h3').textContent = 'Modifica Categoria';
    document.querySelector('#categoryForm button[type="submit"]').innerHTML = '💾 Aggiorna Categoria';

    openModal('addCategoryModal');
}

async function deleteCategory(tipo, id) {
    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può eliminare le categorie.");
        return;
    }

    if (!confirm('Sei sicuro di voler eliminare questa categoria?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/finanze/categorie/${tipo}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            await loadCategoriesManagement();
            await loadCategories(); // Ricarica anche per i dropdown

            // NUOVO: Aggiorna anche i filtri
            setTimeout(() => {
                if (typeof aggiornaFiltriDopoCambimenti === 'function') {
                    aggiornaFiltriDopoCambimenti();
                }
            }, 500);

            alert('Categoria eliminata con successo');
        } else {
            alert('Errore nell\'eliminazione della categoria');
        }
    } catch (error) {
        console.error('Errore eliminazione categoria:', error);
        alert('Errore nell\'eliminazione della categoria');
    }
}

async function handleAddCategory(event) {
    event.preventDefault();

    // Controllo permessi
    if (!isAdmin) {
        alert("Solo il Tesoriere può inserire o modificare categorie.");
        return;
    }

    hideMessage('categoryError');
    hideMessage('categorySuccess');

    const tipo = document.getElementById('categoryType').value;
    const nome = document.getElementById('categoryName').value;
    const descrizione = document.getElementById('categoryDescription').value;

    try {
        const url = isEditingCategory
            ? `${API_BASE}/api/finanze/categorie/${editingCategoryType}/${editingCategoryId}`
            : `${API_BASE}/api/finanze/categorie/${tipo}`;

        const method = isEditingCategory ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ nome, descrizione })
        });

        const data = await response.json();

        if (response.ok) {
            const message = isEditingCategory ? 'Categoria aggiornata con successo!' : 'Categoria creata con successo!';
            showMessage('categorySuccess', message);

            // Reset form
            resetCategoryForm();

            // Ricarica categorie
            await loadCategoriesManagement();
            await loadCategories();

            // NUOVO: Aggiorna anche i filtri
            setTimeout(() => {
                if (typeof aggiornaFiltriDopoCambimenti === 'function') {
                    aggiornaFiltriDopoCambimenti();
                    console.log('🔍 Filtri aggiornati dopo modifica categoria');
                }
            }, 500);

            // Chiudi modal dopo 2 secondi
            setTimeout(() => {
                closeModal('addCategoryModal');
            }, 2000);
        } else {
            showMessage('categoryError', data.error);
        }
    } catch (error) {
        showMessage('categoryError', 'Errore di connessione al server');
        console.error('Errore categoria:', error);
    }
}

function resetCategoryForm() {
    document.getElementById('categoryForm').reset();

    // Reset stato editing
    isEditingCategory = false;
    editingCategoryId = null;
    editingCategoryType = null;

    // Reset titolo e pulsante
    document.querySelector('#addCategoryModal .modal-header h3').textContent = 'Nuova Categoria';
    document.querySelector('#categoryForm button[type="submit"]').innerHTML = '💾 Salva Categoria';
}

// === GESTIONE FILTRI ===

function populateYearFilter() {
    const yearSelect = document.getElementById('filterYear');
    const years = [...new Set(allTransactions.map(t => new Date(t.data_transazione).getFullYear()))].sort((a, b) => b - a);

    yearSelect.innerHTML = '<option value="">Tutti gli anni</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // Popola anche il filtro categoria
    populateCategoryFilter();
}

/**
 * Populates the category filter dropdown with all available categories.
 * Uses globally loaded categorieEntrate and categorieUscite arrays to show
 * all available categories, not just those with existing transactions.
 */
function populateCategoryFilter() {
    const categorySelect = document.getElementById('filterCategory');
    if (!categorySelect) return;

    categorySelect.innerHTML = '<option value="">Tutte le categorie</option>';

    // Aggiungi optgroup per entrate
    if (categorieEntrate && categorieEntrate.length > 0) {
        const optgroupEntrate = document.createElement('optgroup');
        optgroupEntrate.label = '💰 Entrate';
        categorieEntrate.forEach(cat => {
            const option = document.createElement('option');
            option.value = `entrata_${cat.id}`;
            option.textContent = cat.nome;
            optgroupEntrate.appendChild(option);
        });
        categorySelect.appendChild(optgroupEntrate);
    }

    // Aggiungi optgroup per uscite
    if (categorieUscite && categorieUscite.length > 0) {
        const optgroupUscite = document.createElement('optgroup');
        optgroupUscite.label = '💸 Uscite';
        categorieUscite.forEach(cat => {
            const option = document.createElement('option');
            option.value = `uscita_${cat.id}`;
            option.textContent = cat.nome;
            optgroupUscite.appendChild(option);
        });
        categorySelect.appendChild(optgroupUscite);
    }
}

/**
 * Performs search when the user clicks the search button or presses Enter.
 * FIX 3: Added dedicated search function for better UX.
 */
function performSearch() {
    console.log('🔍 Performing search...');
    filterTransactions(true); // Reset to page 1 when searching
}

/**
 * Clears the search box and resets filters.
 * FIX 3: Added clear search function for better UX.
 */
function clearSearch() {
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.value = '';
        console.log('✕ Search cleared');
        filterTransactions(true); // Reset to page 1 after clearing
    }
}

/**
 * Filters transactions in the modal based on search text and filter criteria.
 * @param {boolean} shouldResetPage - Whether to reset to page 1 after filtering.
 *                                     Set to false for search box (to maintain current page),
 *                                     true for dropdown filters (to reset to first page).
 */
function filterTransactions(shouldResetPage = true) {
    const searchText = document.getElementById('searchBox')?.value.toLowerCase() || '';
    const yearFilter = document.getElementById('filterYear').value;
    const typeFilter = document.getElementById('filterType').value;
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    modalTableLimit = parseInt(document.getElementById('modalTableLimit').value);

    filteredTransactions = [...allTransactions];

    // Filtro per ricerca testuale
    if (searchText) {
        filteredTransactions = filteredTransactions.filter(t => {
            const categoria = (t.categoria_entrata || t.categoria_uscita || '').toLowerCase();
            const descrizione = (t.descrizione || '').toLowerCase();
            const importo = t.importo.toString();
            const data = formatDate(t.data_transazione);

            return categoria.includes(searchText) ||
                   descrizione.includes(searchText) ||
                   importo.includes(searchText) ||
                   data.includes(searchText);
        });
    }

    // Filtro per anno
    if (yearFilter) {
        filteredTransactions = filteredTransactions.filter(t => new Date(t.data_transazione).getFullYear() === parseInt(yearFilter));
    }

    // Filtro per tipo
    if (typeFilter) {
        filteredTransactions = filteredTransactions.filter(t => t.tipo === typeFilter);
    }

    // Filtro per categoria
    if (categoryFilter) {
        const [tipoCategoria, categoriaId] = categoryFilter.split('_');
        filteredTransactions = filteredTransactions.filter(t => {
            if (tipoCategoria === 'entrata') {
                return t.tipo === 'entrata' && t.categoria_entrata_id === parseInt(categoriaId);
            } else {
                return t.tipo === 'uscita' && t.categoria_uscita_id === parseInt(categoriaId);
            }
        });
    }

    // Only reset page if requested (not for text search)
    if (shouldResetPage) {
        currentModalPage = 1;
    }
    displayModalTransactions();
}

// === GESTIONE PAGINAZIONE ===

function updateMainPagination(transactionsCount, total = null, hasMore = null) {
    const paginationControls = document.getElementById('mainPaginationControls');
    const paginationInfo = document.getElementById('mainPaginationInfo');
    const prevBtn = document.getElementById('mainPrevBtn');
    const nextBtn = document.getElementById('mainNextBtn');

    if (transactionsCount === 0) {
        paginationControls.classList.add('hidden');
        return;
    }

    paginationControls.classList.remove('hidden');

    const startIndex = ((currentMainPage - 1) * mainTableLimit) + 1;
    const endIndex = startIndex + transactionsCount - 1;

    if (total !== null) {
        paginationInfo.textContent = `Mostra ${startIndex}-${endIndex} di ${total} transazioni (Pagina ${currentMainPage})`;
        nextBtn.disabled = !hasMore;
    } else {
        paginationInfo.textContent = `Mostra ${startIndex}-${endIndex} (Pagina ${currentMainPage})`;
        nextBtn.disabled = transactionsCount < mainTableLimit;
    }

    prevBtn.disabled = currentMainPage === 1;
}

function updateModalPagination() {
    const paginationControls = document.getElementById('modalPaginationControls');
    const paginationInfo = document.getElementById('modalPaginationInfo');
    const prevBtn = document.getElementById('modalPrevBtn');
    const nextBtn = document.getElementById('modalNextBtn');

    if (filteredTransactions.length === 0) {
        paginationControls.classList.add('hidden');
        return;
    }

    paginationControls.classList.remove('hidden');

    const totalPages = Math.ceil(filteredTransactions.length / modalTableLimit);
    const startIndex = ((currentModalPage - 1) * modalTableLimit) + 1;
    const endIndex = Math.min(startIndex + modalTableLimit - 1, filteredTransactions.length);

    paginationInfo.textContent = `${startIndex}-${endIndex} di ${filteredTransactions.length} transazioni (Pagina ${currentModalPage} di ${totalPages})`;

    prevBtn.disabled = currentModalPage === 1;
    nextBtn.disabled = currentModalPage >= totalPages;
}

function changePage(direction) {
    currentMainPage += direction;
    if (currentMainPage < 1) currentMainPage = 1;
    loadTransactions();
}

function changeModalPage(direction) {
    const totalPages = Math.ceil(filteredTransactions.length / modalTableLimit);
    currentModalPage += direction;
    if (currentModalPage < 1) currentModalPage = 1;
    if (currentModalPage > totalPages) currentModalPage = totalPages;
    displayModalTransactions();
}

function changeMainTableLimit() {
    mainTableLimit = parseInt(document.getElementById('mainTableLimit').value);
    currentMainPage = 1;
    console.log(`🔢 Changed main table limit to: ${mainTableLimit}`);
    loadTransactions();
}

// === GESTIONE MODALI ===

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Reset messaggi
    hideMessage('transactionError');
    hideMessage('transactionSuccess');
    hideMessage('categoryError');
    hideMessage('categorySuccess');

    // Carica dati specifici per modal
    if (modalId === 'viewTransactionsModal') {
        loadAllTransactions();
        // FIX 2: Popola il filtro categorie quando si apre la modale
        // Le categorie dovrebbero già essere caricate da loadCategories() in showMainApp()
        // Se non lo sono ancora, aspetta che siano disponibili
        if (categorieEntrate.length > 0 || categorieUscite.length > 0) {
            populateCategoryFilter();
            console.log('🏷️ Category filter populated in modal');
        } else {
            // Riprova dopo un breve momento se le categorie non sono ancora caricate
            setTimeout(() => {
                populateCategoryFilter();
                console.log('🏷️ Category filter populated in modal (delayed)');
            }, 100);
        }
    } else if (modalId === 'manageCategoriesModal') {
        loadCategoriesManagement();
    } else if (modalId === 'addTransactionModal' && !isEditingTransaction) {
        resetTransactionForm();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';

    // Reset form se necessario
    if (modalId === 'addTransactionModal') {
        resetTransactionForm();
    } else if (modalId === 'addCategoryModal') {
        resetCategoryForm();
    }
}

// Chiudi modal cliccando fuori
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        const modalId = event.target.id;
        closeModal(modalId);
    }
}

// === UTILITY FUNCTIONS ===

function formatCurrency(amount) {
    return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount || 0);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('it-IT');
}

function showMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.remove('hidden');
    }
}

function hideMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add('hidden');
    }
}

// === FUNZIONI EXPORT ===

function exportData() {
    // Prima carica tutte le transazioni se non sono già caricate
    if (allTransactions.length === 0) {
        loadAllTransactions().then(() => {
            performExport();
        });
    } else {
        performExport();
    }
}

function performExport() {
    if (allTransactions.length === 0) {
        alert('Nessuna transazione da esportare');
        return;
    }

    const headers = ['Data', 'Tipo', 'Categoria', 'Descrizione', 'Importo'];
    const csvContent = [
        headers.join(','),
        ...allTransactions.map(t => {
            const categoria = t.categoria_entrata || t.categoria_uscita;
            return [
                formatDate(t.data_transazione),
                t.tipo,
                `"${categoria}"`,
                `"${t.descrizione}"`,
                t.importo
            ].join(',');
        })
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transazioni_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
