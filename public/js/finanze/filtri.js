/**
 * SISTEMA FILTRI AVANZATI - filtri.js
 * Sistema dedicato per filtri e analisi delle transazioni
 * Si integra con app.js esistente
 */

// ===== VARIABILI GLOBALI FILTRI =====
let tutteTransazioni = [];
let transazioniFiltrate = [];
let tutteCategorie = { entrate: [], uscite: [] };
let filtriAttivi = {
    anno: '',
    tipo: '',
    categoria: ''
};

// ===== INIZIALIZZAZIONE FILTRI =====

/**
 * Inizializza il sistema di filtri
 * Chiamata automaticamente quando l'app è pronta
 */
async function inizializzaSistemaFiltri() {
    console.log('🔍 Inizializzazione sistema filtri...');

    try {
        await caricaDatiPerFiltri();
        popolaDropdownFiltri();
        applicaFiltriAttuali();
        console.log('✅ Sistema filtri inizializzato correttamente');
    } catch (error) {
        console.error('❌ Errore inizializzazione filtri:', error);
    }
}

/**
 * Carica tutti i dati necessari per i filtri
 */
async function caricaDatiPerFiltri() {
    try {
        // Carica tutte le transazioni (limite alto per avere tutto)
        const responseTransazioni = await fetch(`${API_BASE}/api/finanze/transazioni?limit=10000`, {
            credentials: 'include'
        });

        if (responseTransazioni.ok) {
            const dataTransazioni = await responseTransazioni.json();
            tutteTransazioni = dataTransazioni.transactions || dataTransazioni;
            transazioniFiltrate = [...tutteTransazioni];
            console.log(`📊 Caricate ${tutteTransazioni.length} transazioni per i filtri`);
        }

        // Carica le categorie
        await caricaCategoriePerFiltri();

    } catch (error) {
        console.error('Errore caricamento dati filtri:', error);
        throw error;
    }
}

/**
 * Carica le categorie per i filtri
 */
async function caricaCategoriePerFiltri() {
    try {
        const [responseEntrate, responseUscite] = await Promise.all([
            fetch(`${API_BASE}/api/finanze/categorie/entrate`, {
                credentials: 'include'
            }),
            fetch(`${API_BASE}/api/finanze/categorie/uscite`, {
                credentials: 'include'
            })
        ]);

        if (responseEntrate.ok) {
            tutteCategorie.entrate = await responseEntrate.json();
        }
        if (responseUscite.ok) {
            tutteCategorie.uscite = await responseUscite.json();
        }

        console.log(`📋 Caricate ${tutteCategorie.entrate.length} categorie entrate e ${tutteCategorie.uscite.length} categorie uscite`);
    } catch (error) {
        console.error('Errore caricamento categorie per filtri:', error);
    }
}

// ===== POPOLAMENTO DROPDOWN =====

/**
 * Popola tutti i dropdown dei filtri
 */
function popolaDropdownFiltri() {
    popolaFiltroAnni();
    popolaFiltroCategorie();
}

/**
 * Popola il dropdown degli anni
 */
function popolaFiltroAnni() {
    const selectAnno = document.getElementById('filtroAnno');
    if (!selectAnno) return;

    // Estrae anni unici dalle transazioni e li ordina dal più recente
    const anni = [...new Set(tutteTransazioni.map(t => new Date(t.data_transazione).getFullYear()))]
        .sort((a, b) => b - a);

    selectAnno.innerHTML = '<option value="">Tutti gli anni</option>';
    anni.forEach(anno => {
        selectAnno.innerHTML += `<option value="${anno}">${anno}</option>`;
    });
}

/**
 * Popola il dropdown delle categorie con optgroup
 */
function popolaFiltroCategorie() {
    const selectCategoria = document.getElementById('filtroCategoria');
    if (!selectCategoria) return;

    selectCategoria.innerHTML = '<option value="">Tutte le categorie</option>';

    // Crea optgroup per entrate
    if (tutteCategorie.entrate.length > 0) {
        const optgroupEntrate = document.createElement('optgroup');
        optgroupEntrate.label = '💰 Entrate';

        tutteCategorie.entrate.forEach(categoria => {
            const option = document.createElement('option');
            option.value = `entrata_${categoria.id}`;
            option.textContent = categoria.nome;
            optgroupEntrate.appendChild(option);
        });

        selectCategoria.appendChild(optgroupEntrate);
    }

    // Crea optgroup per uscite
    if (tutteCategorie.uscite.length > 0) {
        const optgroupUscite = document.createElement('optgroup');
        optgroupUscite.label = '💸 Uscite';

        tutteCategorie.uscite.forEach(categoria => {
            const option = document.createElement('option');
            option.value = `uscita_${categoria.id}`;
            option.textContent = categoria.nome;
            optgroupUscite.appendChild(option);
        });

        selectCategoria.appendChild(optgroupUscite);
    }
}

// ===== LOGICA FILTRI =====

/**
 * Applica i filtri correnti
 * Funzione principale chiamata quando cambiano i filtri
 */
function applicaFiltri() {
    // Legge i valori dai dropdown
    filtriAttivi.anno = document.getElementById('filtroAnno')?.value || '';
    filtriAttivi.tipo = document.getElementById('filtroTipo')?.value || '';
    filtriAttivi.categoria = document.getElementById('filtroCategoria')?.value || '';

    // Filtra le transazioni
    filtraTransazioni();

    // Aggiorna le statistiche
    aggiornaStatisticheFiltrate();

    // Mostra l'analisi appropriata
    if (filtriAttivi.categoria) {
        mostraDettaglioCategoria();
    } else {
        mostraTopCategorie();
    }

    console.log('🔍 Filtri applicati:', filtriAttivi, `→ ${transazioniFiltrate.length} transazioni`);
}

/**
 * Applica i filtri correnti (alias per compatibilità)
 */
function applicaFiltriAttuali() {
    applicaFiltri();
}

/**
 * Filtra le transazioni in base ai criteri selezionati
 */
function filtraTransazioni() {
    transazioniFiltrate = tutteTransazioni.filter(transazione => {
        // Filtro per anno
        if (filtriAttivi.anno) {
            const annoTransazione = new Date(transazione.data_transazione).getFullYear();
            if (annoTransazione != filtriAttivi.anno) {
                return false;
            }
        }

        // Filtro per tipo (entrata/uscita)
        if (filtriAttivi.tipo && transazione.tipo !== filtriAttivi.tipo) {
            return false;
        }

        // Filtro per categoria
        if (filtriAttivi.categoria) {
            const [tipoCategoria, categoriaId] = filtriAttivi.categoria.split('_');

            if (tipoCategoria === 'entrata' && transazione.categoria_entrata_id != categoriaId) {
                return false;
            }
            if (tipoCategoria === 'uscita' && transazione.categoria_uscita_id != categoriaId) {
                return false;
            }
        }

        return true;
    });
}

// ===== AGGIORNAMENTO STATISTICHE =====

/**
 * Aggiorna le statistiche filtrate nel dashboard
 */
function aggiornaStatisticheFiltrate() {
    // Calcola totali
    const entrateFiltrate = transazioniFiltrate
        .filter(t => t.tipo === 'entrata')
        .reduce((sum, t) => sum + parseFloat(t.importo || 0), 0);

    const usciteFiltrate = transazioniFiltrate
        .filter(t => t.tipo === 'uscita')
        .reduce((sum, t) => sum + parseFloat(t.importo || 0), 0);

    const saldoFiltrato = entrateFiltrate - usciteFiltrate;
    const numeroTransazioni = transazioniFiltrate.length;

    // Aggiorna l'interfaccia
    updateElementText('entrateFiltrate', formatCurrency(entrateFiltrate));
    updateElementText('usciteFiltrate', formatCurrency(usciteFiltrate));
    updateElementText('saldoFiltrato', formatCurrency(saldoFiltrato));
    updateElementText('numeroTransazioni', numeroTransazioni.toString());
}

/**
 * Utility per aggiornare il testo di un elemento se esiste
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// ===== ANALISI E VISUALIZZAZIONI =====

/**
 * Mostra le top 5 categorie per le transazioni filtrate
 */
function mostraTopCategorie() {
    const containerTop = document.getElementById('topCategorie');
    const containerDettaglio = document.getElementById('dettaglioCategoria');

    if (containerTop) containerTop.classList.remove('hidden');
    if (containerDettaglio) containerDettaglio.classList.add('hidden');

    // Calcola statistiche per categoria
    const categorieStats = {};

    transazioniFiltrate.forEach(transazione => {
        const nomeCategoria = transazione.categoria_entrata || transazione.categoria_uscita;
        const chiave = `${transazione.tipo}_${nomeCategoria}`;

        if (!categorieStats[chiave]) {
            categorieStats[chiave] = {
                nome: nomeCategoria,
                tipo: transazione.tipo,
                importo: 0,
                transazioni: 0
            };
        }

        categorieStats[chiave].importo += parseFloat(transazione.importo || 0);
        categorieStats[chiave].transazioni++;
    });

    // Ordina per importo e prende le top 5
    const topCategorie = Object.values(categorieStats)
        .sort((a, b) => b.importo - a.importo)
        .slice(0, 5);

    // Genera HTML per la visualizzazione
    generaHTMLTopCategorie(topCategorie);
}

/**
 * Genera l'HTML per le top categorie
 */
function generaHTMLTopCategorie(topCategorie) {
    const container = document.getElementById('topCategorieContent');
    if (!container) return;

    if (topCategorie.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">Nessuna transazione trovata con i filtri attuali</p>';
        return;
    }

    let html = '<div style="display: grid; gap: 10px;">';

    topCategorie.forEach((categoria, index) => {
        const badgeClass = categoria.tipo === 'entrata' ? 'badge-entrata' : 'badge-uscita';
        const icon = categoria.tipo === 'entrata' ? '💰' : '💸';
        const colore = categoria.tipo === 'entrata' ? '#38a169' : '#e53e3e';

        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.8); border-radius: 8px; border-left: 4px solid ${colore};">
                <div>
                    <span style="font-size: 18px; margin-right: 8px; font-weight: 600;">#${index + 1}</span>
                    <span class="badge ${badgeClass}">${icon} ${categoria.nome}</span>
                    <small style="color: #718096; margin-left: 10px;">${categoria.transazioni} transazioni</small>
                </div>
                <div style="font-weight: 600; color: ${colore};">
                    ${formatCurrency(categoria.importo)}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

/**
 * Mostra il dettaglio di una categoria specifica
 */
function mostraDettaglioCategoria() {
    const containerTop = document.getElementById('topCategorie');
    const containerDettaglio = document.getElementById('dettaglioCategoria');

    if (containerTop) containerTop.classList.add('hidden');
    if (containerDettaglio) containerDettaglio.classList.remove('hidden');

    const [tipoCategoria, categoriaId] = filtriAttivi.categoria.split('_');
    const categoria = tipoCategoria === 'entrata'
        ? tutteCategorie.entrate.find(c => c.id == categoriaId)
        : tutteCategorie.uscite.find(c => c.id == categoriaId);

    // Raggruppa le transazioni per mese
    const transazioniPerMese = raggruppaPerMese(transazioniFiltrate);

    // Genera l'HTML del dettaglio
    generaHTMLDettaglioCategoria(categoria, transazioniPerMese, tipoCategoria);
}

/**
 * Raggruppa le transazioni per mese
 */
function raggruppaPerMese(transazioni) {
    const perMese = {};

    transazioni.forEach(transazione => {
        const data = new Date(transazione.data_transazione);
        const chiaveMese = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

        if (!perMese[chiaveMese]) {
            perMese[chiaveMese] = { importo: 0, transazioni: 0 };
        }

        perMese[chiaveMese].importo += parseFloat(transazione.importo || 0);
        perMese[chiaveMese].transazioni++;
    });

    return perMese;
}

/**
 * Genera l'HTML per il dettaglio categoria
 */
function generaHTMLDettaglioCategoria(categoria, transazioniPerMese, tipoCategoria) {
    const container = document.getElementById('dettaglioCategoriaContent');
    if (!container) return;

    // Ordina i mesi dal più recente e prende gli ultimi 6
    const mesiOrdinati = Object.keys(transazioniPerMese)
        .sort()
        .reverse()
        .slice(0, 6);

    let html = `
        <div style="background: rgba(255,255,255,0.8); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h5 style="margin: 0 0 10px 0; color: #2d3748;">${categoria?.nome || 'Categoria Sconosciuta'}</h5>
            <p style="margin: 0; color: #718096; font-size: 14px;">${categoria?.descrizione || 'Nessuna descrizione disponibile'}</p>
        </div>

        <h6 style="margin: 15px 0 10px 0; color: #4a5568;">📈 Andamento ultimi 6 mesi</h6>
    `;

    if (mesiOrdinati.length === 0) {
        html += '<p style="text-align: center; color: #718096;">Nessuna transazione nel periodo selezionato</p>';
    } else {
        html += '<div style="display: grid; gap: 8px;">';

        mesiOrdinati.forEach(mese => {
            const datiMese = transazioniPerMese[mese];
            const [anno, numeroMese] = mese.split('-');
            const nomeMese = new Date(anno, numeroMese - 1).toLocaleDateString('it-IT', {
                month: 'long',
                year: 'numeric'
            });

            const colore = tipoCategoria === 'entrata' ? '#38a169' : '#e53e3e';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.6); border-radius: 6px;">
                    <div>
                        <span style="font-weight: 500; text-transform: capitalize;">${nomeMese}</span>
                        <small style="color: #718096; margin-left: 10px;">${datiMese.transazioni} transazioni</small>
                    </div>
                    <div style="font-weight: 600; color: ${colore};">
                        ${formatCurrency(datiMese.importo)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
    }

    container.innerHTML = html;
}

// ===== FUNZIONI UTENTE =====

/**
 * Reset di tutti i filtri
 */
function resetFiltri() {
    const elementiDaResettare = ['filtroAnno', 'filtroTipo', 'filtroCategoria'];

    elementiDaResettare.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.value = '';
        }
    });

    applicaFiltri();
    console.log('🔄 Filtri resettati');
}

/**
 * Esporta le transazioni filtrate in CSV
 */
function esportaFiltrati() {
    if (transazioniFiltrate.length === 0) {
        alert('Nessuna transazione da esportare con i filtri attuali');
        return;
    }

    // Costruisce il nome del file basato sui filtri attivi
    const suffissiFiltri = [];
    if (filtriAttivi.anno) suffissiFiltri.push(`anno-${filtriAttivi.anno}`);
    if (filtriAttivi.tipo) suffissiFiltri.push(filtriAttivi.tipo);
    if (filtriAttivi.categoria) {
        const [tipoCategoria, categoriaId] = filtriAttivi.categoria.split('_');
        const objCategoria = tipoCategoria === 'entrata'
            ? tutteCategorie.entrate.find(c => c.id == categoriaId)
            : tutteCategorie.uscite.find(c => c.id == categoriaId);
        if (objCategoria) {
            suffissiFiltri.push(objCategoria.nome.replace(/[^a-zA-Z0-9]/g, '_'));
        }
    }

    const nomeFile = suffissiFiltri.length > 0
        ? `transazioni_${suffissiFiltri.join('_')}_${new Date().toISOString().split('T')[0]}.csv`
        : `tutte_transazioni_${new Date().toISOString().split('T')[0]}.csv`;

    // Genera il contenuto CSV
    const intestazioni = ['Data', 'Tipo', 'Categoria', 'Descrizione', 'Importo'];
    const righeCSV = transazioniFiltrate.map(transazione => {
        const categoria = transazione.categoria_entrata || transazione.categoria_uscita || 'N/A';
        return [
            formatDate(transazione.data_transazione),
            transazione.tipo,
            `"${categoria}"`,
            `"${transazione.descrizione || ''}"`,
            transazione.importo || 0
        ].join(',');
    });

    const contenutoCSV = [intestazioni.join(','), ...righeCSV].join('\n');

    // Scarica il file
    scaricaFile(contenutoCSV, nomeFile, 'text/csv;charset=utf-8;');

    console.log(`📊 Esportate ${transazioniFiltrate.length} transazioni in ${nomeFile}`);
}

/**
 * Utility per scaricare un file
 */
function scaricaFile(contenuto, nomeFile, tipoMIME) {
    const blob = new Blob([contenuto], { type: tipoMIME });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute('download', nomeFile);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

// ===== INTEGRAZIONE CON APP PRINCIPALE =====

/**
 * Hook per l'inizializzazione quando l'app principale è pronta
 * Si integra con app.js esistente
 */
function integrazioneConAppPrincipale() {
    // Per integrazione con Tornate, non serve più authToken
    // Il sistema usa session-based authentication
    inizializzaSistemaFiltri();
}

/**
 * Funzione per ricaricare i filtri quando cambiano i dati
 * Chiamabile dall'app principale
 */
function aggiornaFiltriDopoCambimenti() {
    if (tutteTransazioni.length > 0) {
        caricaDatiPerFiltri().then(() => {
            popolaDropdownFiltri();
            applicaFiltri();
        });
    }
}

// ===== INIZIALIZZAZIONE AUTOMATICA =====

// Si avvia automaticamente quando il DOM è pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Modulo filtri.js caricato');
    // Attende che l'app principale sia pronta
    setTimeout(integrazioneConAppPrincipale, 1500);
});

// Esporta le funzioni principali per l'uso esterno (se necessario)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        inizializzaSistemaFiltri,
        applicaFiltri,
        resetFiltri,
        esportaFiltrati,
        aggiornaFiltriDopoCambimenti
    };
}
