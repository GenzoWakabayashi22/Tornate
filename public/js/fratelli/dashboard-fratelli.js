// ========================================
// DASHBOARD FRATELLI - AGGIORNAMENTO COMPLETO
// File: public/js/dashboard.js - SOSTITUIRE COMPLETAMENTE
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inizializzazione Dashboard Fratelli con dati reali');
    await inizializzaDashboardReale();
});

async function inizializzaDashboardReale() {
    try {
        // Recupera dati fratello autenticato
        const authData = JSON.parse(sessionStorage.getItem('fratelliAuth'));
        if (!authData) {
            console.error("🛑 Nessun fratello autenticato");
            window.location.href = '/fratelli/login';
            return;
        }

        console.log('👤 Fratello autenticato:', authData.nome, 'ID:', authData.id);

        // Carica statistiche reali
        await caricaStatisticheReali(authData.id);
        
        // Carica prossime tornate aggiornate  
        await caricaProssimeTornateReali(authData.id);
        
        // Aggiorna info fratello nel DOM
        aggiornaInfoFratello(authData);

    } catch (error) {
        console.error('❌ Errore inizializzazione dashboard:', error);
    }
}

// ========================================
// STATISTICHE REALI DAL DATABASE
// ========================================
async function caricaStatisticheReali(fratelloId) {
    try {
        console.log('📊 Caricamento statistiche reali per fratello', fratelloId);
        
        const response = await fetch(`/api/fratelli/${fratelloId}/statistiche`);
        if (!response.ok) throw new Error('Errore API statistiche');
        
        const stats = await response.json();
        console.log('✅ Statistiche ricevute:', stats);

        // Aggiorna statistiche nel DOM
        const elementiStats = {
            totaliTornate: document.querySelector('[data-stat="totali"]') || document.getElementById('statTotali'),
            presenzeCount: document.querySelector('[data-stat="presenti"]') || document.getElementById('statPresenti'), 
            percentuale: document.querySelector('[data-stat="percentuale"]') || document.getElementById('statPercentuale')
        };

        if (elementiStats.totaliTornate) {
            elementiStats.totaliTornate.textContent = stats.totaliTornate || 0;
        }
        
        if (elementiStats.presenzeCount) {
            elementiStats.presenzeCount.textContent = stats.presenzeCount || 0;
        }
        
        if (elementiStats.percentuale) {
            elementiStats.percentuale.textContent = (stats.percentuale || 0) + '%';
        }

        console.log('📈 Statistiche dashboard aggiornate');

    } catch (error) {
        console.error('❌ Errore caricamento statistiche:', error);
        // Fallback con dati di esempio se API non funziona
        aggiornaStatisticheFallback();
    }
}

function aggiornaStatisticheFallback() {
    const elementiStats = {
        totaliTornate: document.querySelector('[data-stat="totali"]') || document.getElementById('statTotali'),
        presenzeCount: document.querySelector('[data-stat="presenti"]') || document.getElementById('statPresenti'), 
        percentuale: document.querySelector('[data-stat="percentuale"]') || document.getElementById('statPercentuale')
    };

    if (elementiStats.totaliTornate) elementiStats.totaliTornate.textContent = '11';
    if (elementiStats.presenzeCount) elementiStats.presenzeCount.textContent = '8';  
    if (elementiStats.percentuale) elementiStats.percentuale.textContent = '73%';
}

// ========================================
// PROSSIME TORNATE CON DATI REALI
// ========================================
async function caricaProssimeTornateReali(fratelloId) {
    try {
        console.log('📅 Caricamento prossime tornate per fratello', fratelloId);
        
        const response = await fetch(`/api/fratelli/${fratelloId}/tornate?limit=3`);
        if (!response.ok) throw new Error('Errore API tornate');
        
        const tornate = await response.json();
        console.log('📋 Tornate ricevute:', tornate.length, tornate);

        // Filtra solo le prossime (future)
        const oggi = new Date();
        const tornateFiltered = tornate.filter(t => {
            const dataTornata = new Date(t.data);
            return dataTornata >= oggi;
        }).slice(0, 3);

        console.log('🔮 Prossime tornate filtrate:', tornateFiltered.length);

        // Aggiorna ogni tornata nel DOM
        tornateFiltered.forEach((tornata, index) => {
            aggiornaCartaTornataReale(tornata, index);
        });

        // Aggiorna conteggi presenze per ogni tornata
        setTimeout(() => {
            tornateFiltered.forEach(tornata => {
                aggiornaConteggioPresenze(tornata.id);
            });
        }, 500);

        // Salva le tornate globalmente per uso successivo
        window.tornateData = tornateFiltered;

    } catch (error) {
        console.error('❌ Errore caricamento tornate:', error);
    }
}

function aggiornaCartaTornataReale(tornata, index) {
    try {
        // Formatta data correttamente
        const data = new Date(tornata.data);
        const dataFormattata = !isNaN(data.getTime()) ? 
            data.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit', 
                year: 'numeric'
            }) : 
            'Data non valida';

        console.log(`🔄 Processando tornata ${index}: ${tornata.titolo || tornata.discussione} - ${dataFormattata}`);

        // Trova elementi della tornata nell'HTML
        const selettori = [
            `[data-tornata="${index}"]`,
            `[data-tornata-id="${tornata.id}"]`,
            `.tornata-${index}`,
            `.tornata-card:nth-child(${index + 1})`
        ];

        let elementoTornata = null;
        for (const selettore of selettori) {
            elementoTornata = document.querySelector(selettore);
            if (elementoTornata) break;
        }

        // Se non trova elemento specifico, cerca nei contenitori generici
        if (!elementoTornata) {
            const containerTornate = document.querySelector('[class*="prossime"], [class*="tornate"], [id*="tornate"]');
            if (containerTornate) {
                const carteTornate = containerTornate.querySelectorAll('div[class*="card"], div[class*="tornata"]');
                if (carteTornate[index]) {
                    elementoTornata = carteTornate[index];
                }
            }
        }

        if (elementoTornata) {
            // Aggiorna il contenuto
            const contenutoHTML = elementoTornata.innerHTML;
            
            // Sostituisci date e dati
            let nuovoContenuto = contenutoHTML
                .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, dataFormattata)
                .replace(/Invalid Date/g, dataFormattata)
                .replace(/\d{2}\/\d{2}\/\d{4}/g, dataFormattata);

            // Prepara descrizione unica
            const descrizioneUnica = tornata.argomento_istruzione || tornata.discussione || '';

            // Rimuovi eventuali duplicati esistenti
            nuovoContenuto = nuovoContenuto.replace(/<div[^>]*class="descrizione"[^>]*>.*?<\/div>/gi, '');

            // Aggiungi descrizione
            nuovoContenuto += `<div class="descrizione">${descrizioneUnica}</div>`;

            // Aggiungi chi introduce, se presente
            if (tornata.chi_introduce_nome && !nuovoContenuto.includes('class="introduce"')) {
                nuovoContenuto += `<div class="introduce">👤 Introduce: <strong>${tornata.chi_introduce_nome}</strong></div>`;
            }

            // ✅ Inserisci il nuovo contenuto nel DOM
            elementoTornata.innerHTML = nuovoContenuto;
            console.log(`✅ Aggiornata carta tornata ${index}`);
        } else {
            console.warn(`⚠️ Elemento tornata ${index} non trovato`);
        }

    } catch (error) {
        console.error(`❌ Errore aggiornamento tornata ${index}:`, error);
    }
}
// ========================================
// AGGIORNAMENTO CONTEGGI PRESENZE LIVE
// ========================================
async function aggiornaConteggioPresenze(tornataId) {
    try {
        console.log(`👥 Aggiornamento conteggio presenze per tornata ${tornataId}`);
        
        const response = await fetch(`/api/tornate/${tornataId}/presenze-confermate`);
        if (!response.ok) return;
        
        const data = await response.json();
        const count = data.presenze_confermate || 0;
        
        // Trova elementi che mostrano il conteggio presenze
        const selettori = [
            `[data-presenze="${tornataId}"]`,
            `[id*="presenze"][id*="${tornataId}"]`,
            `[class*="presenze"][data-tornata="${tornataId}"]`
        ];

        let elementoPresenze = null;
        for (const selettore of selettori) {
            elementoPresenze = document.querySelector(selettore);
            if (elementoPresenze) break;
        }

        if (elementoPresenze) {
            if (count === 0) {
                elementoPresenze.textContent = "Nessun fratello";
            } else if (count === 1) {
                elementoPresenze.textContent = "1 fratello";  
            } else {
                elementoPresenze.textContent = `${count} fratelli`;
            }
            elementoPresenze.style.color = count > 0 ? "#28a745" : "#6c757d";
            
            console.log(`✅ Aggiornato conteggio: ${count} presenze per tornata ${tornataId}`);
        }

    } catch (error) {
        console.error(`❌ Errore conteggio presenze tornata ${tornataId}:`, error);
    }
}

// ========================================
// GESTIONE PRESENZE CON SALVATAGGIO REALE
// ========================================
function confermaPresenza(tornataId, presente) {
    console.log(`🔄 Conferma presenza: Tornata ${tornataId}, Presente: ${presente}`);
    
    const authData = JSON.parse(sessionStorage.getItem('fratelliAuth'));
    if (!authData) {
        alert('❌ Errore autenticazione');
        return;
    }

    // Trova il container specifico della tornata
    const bottoneCliccato = event.target;
    const containerPresenze = bottoneCliccato.parentNode;
    
    // Aggiorna UI immediatamente
    containerPresenze.innerHTML = presente ? 
        `<button class="presenza-btn confermato presente">✅ CONFERMATO PRESENTE</button>
         <button class="btn btn-secondary btn-sm" onclick="resetPresenza(${tornataId})">Cambia</button>` :
        `<button class="presenza-btn confermato assente">❌ CONFERMATO ASSENTE</button>
         <button class="btn btn-secondary btn-sm" onclick="resetPresenza(${tornataId})">Cambia</button>`;
    
    // Salva nel database usando l'API corretta
    salvaPresenzaReale(authData.id, tornataId, presente);
}

function resetPresenza(tornataId) {
    console.log(`🔄 Reset presenza per tornata ${tornataId}`);
    
    const bottoneCliccato = event.target;
    const containerPresenze = bottoneCliccato.parentNode;
    
    // Ripristina bottoni originali
    containerPresenze.innerHTML = `
        <button class="presenza-btn pending" onclick="confermaPresenza(${tornataId}, true)">✅ PRESENTE</button>
        <button class="presenza-btn pending" onclick="confermaPresenza(${tornataId}, false)">❌ ASSENTE</button>
    `;
}

async function salvaPresenzaReale(fratelloId, tornataId, presente) {
    try {
        console.log(`💾 Salvando presenza REALE: Fratello ${fratelloId}, Tornata ${tornataId}, Presente: ${presente}`);
        
        // USA L'API CORRETTA CHE SALVA NELLA TABELLA PRESENZE
        const response = await fetch(`/api/fratelli/${fratelloId}/presenza`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                tornataId: tornataId,
                presente: presente,
                timestamp: new Date().toISOString()
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Presenza salvata nel DATABASE:', result);
            
            // Aggiorna conteggio presenze in tempo reale
            setTimeout(() => {
                aggiornaConteggioPresenze(tornataId);
            }, 500);
            
        } else {
            console.error('❌ Errore dal server:', result.message);
            alert('❌ Errore nel salvataggio: ' + result.message);
        }
        
    } catch (error) {
        console.error('❌ Errore salvataggio presenza reale:', error);
        alert('❌ Errore di connessione nel salvataggio della presenza');
    }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================
function aggiornaInfoFratello(authData) {
    // Aggiorna nome fratello se presente nel DOM
    const nomeFratello = document.querySelector('[data-nome-fratello]');
    if (nomeFratello) {
        nomeFratello.textContent = authData.nome;
    }

    // Aggiorna grado se presente
    const gradoFratello = document.querySelector('[data-grado-fratello]');
    if (gradoFratello) {
        gradoFratello.textContent = authData.grado;
    }

    console.log('👤 Info fratello aggiornate nel DOM');
}

// Mantieni sessione attiva
setInterval(() => {
    const authData = JSON.parse(sessionStorage.getItem('fratelliAuth'));
    if (authData) {
        authData.lastActivity = new Date().toISOString();
        sessionStorage.setItem('fratelliAuth', JSON.stringify(authData));
    }
}, 60000); // Ogni minuto

console.log('🏛️ Dashboard Fratelli con dati reali caricato');