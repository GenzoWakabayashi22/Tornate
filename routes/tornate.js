const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// 🔧 ROUTE POST CORRETTA per tornate.js

router.post('/', async (req, res) => {
    try {
        console.log('🔥 POST TORNATE - VERSIONE CORRETTA');
        console.log('📥 Body ricevuto:', req.body);
        
        // ✅ VALIDAZIONE DATI
        const { data, discussione, location } = req.body;
        
        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Data obbligatoria'
            });
        }
        
        // ✅ PREPARA DATI CON NOMI CORRETTI
        const tornataData = {
            data: data,
            orario_inizio: req.body.orario_inizio || null,
            discussione: discussione || 'Nuova Tornata',
            chi_introduce: req.body.chi_introduce || null,
            location: location || 'Tolfa',
            cena: req.body.cena === true || req.body.cena === 'true', // ✅ CORRETTO
            costo_cena: req.body.costo_cena || null,
            descrizione_cena: req.body.descrizione_cena || null,
            argomento_istruzione: req.body.argomento_istruzione || null,
            orario_istruzione: req.body.orario_istruzione || null, // ✅ CORRETTO
            link_audio: req.body.link_audio || null,
            link_pagina: req.body.link_pagina || null,
            tipo_loggia: req.body.tipo_loggia || 'nostra',
            tipo: req.body.tipo || 'ordinaria',
            stato: req.body.stato || 'programmata',
            note: req.body.note || null
        };
        
        console.log('📋 Dati preparati per database:', tornataData);
        
        // ✅ INIZIO TRANSAZIONE ESPLICITA
        await db.executeQuery('START TRANSACTION');
        
        try {
            // ✅ USA IL METODO CORRETTO
            const result = await db.addTornata(tornataData);
            console.log('📊 Risultato INSERT:', result);
            
            // ✅ COMMIT FORZATO
            console.log('💾 COMMIT...');
            await db.executeQuery('COMMIT');
            console.log('✅ COMMIT COMPLETATO');
            
            // ✅ VERIFICA IMMEDIATA
            const verifica = await db.executeQuery('SELECT * FROM tornate WHERE id = ?', [result.insertId]);
            console.log('🔍 VERIFICA POST-COMMIT:', verifica.length > 0 ? 'TROVATA' : 'NON TROVATA');
            
            if (result.insertId && verifica.length > 0) {
                console.log('🎉 SUCCESSO COMPLETO! ID:', result.insertId);
                
                res.status(201).json({
                    success: true,
                    message: 'Tornata creata e salvata con successo',
                    data: { 
                        id: result.insertId,
                        ...verifica[0]
                    }
                });
            } else {
                throw new Error('Tornata non trovata dopo il commit');
            }
            
        } catch (error) {
            // ✅ ROLLBACK IN CASO DI ERRORE
            console.log('💥 ERRORE - ROLLBACK...');
            await db.executeQuery('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('💥 ERRORE CRITICO:', error);
        
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione: ' + error.message,
            error: error.code || error.message
        });
    }
});
// GET /api/tornate - Lista tutte le tornate con filtri opzionali
router.get('/', async (req, res) => {
    try {
        const { anno, tipo_loggia, stato } = req.query;
        
        const filtri = {};
        if (anno) filtri.anno = anno;
        if (tipo_loggia) filtri.tipo_loggia = tipo_loggia;
        if (stato) filtri.stato = stato;
        
        const tornate = await db.getTornate(filtri);
        
        res.json({
            success: true,
            data: tornate,
            count: tornate.length
        });
        
    } catch (error) {
        console.error('Errore nel recupero tornate:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle tornate',
            error: error.message
        });
    }
});

// 🔧 FIX API PROSSIME - TUTTE LE TORNATE FUTURE

router.get('/prossime', async (req, res) => {
    try {
        const { fratello_id } = req.query;
        
        console.log('🔍 API Prossime - Fratello ID:', fratello_id);
        
        let query = `
            SELECT 
                t.id, 
                DATE_FORMAT(t.data, '%Y-%m-%d') as data,
                t.orario_inizio, 
                t.discussione, 
                t.location, 
                t.tipo,
                t.tipo_loggia,
                t.stato
        `;
        
        // ✅ SE C'È IL FRATELLO ID, AGGIUNGI LE PRESENZE
        if (fratello_id && !isNaN(fratello_id)) {
            query += `, p.presente as presenza_confermata`;
        }
        
        query += `
            FROM tornate t
        `;
        
        // ✅ LEFT JOIN CON PRESENZE SE C'È IL FRATELLO
        if (fratello_id && !isNaN(fratello_id)) {
            query += `
                LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
            `;
        }
        
        query += `
            WHERE DATE(t.data) >= CURDATE()
                AND t.stato = 'programmata'
            ORDER BY DATE(t.data) ASC 
            LIMIT 5
        `;
        
        // ✅ RIMUOVI: AND t.tipo_loggia = 'nostra'
        // ✅ AUMENTA LIMIT a 5 per vedere più tornate
        
        const params = fratello_id && !isNaN(fratello_id) ? [fratello_id] : [];
        
        console.log('📋 Query SQL:', query);
        console.log('📋 Parametri:', params);
        
        const results = await db.executeQuery(query, params);
        
        console.log('📋 Risultati trovati:', results.length);
        
        const tornate = results.map(t => ({
            id: t.id,
            data: t.data,
            orario: t.orario_inizio || '19:30:00',
            titolo: t.discussione || 'Tornata',
            luogo: t.location || 'Tolfa',
            tipo: t.tipo || 'ordinaria',
            tipo_loggia: t.tipo_loggia || 'nostra', // ✅ AGGIUNGI QUESTO
            presenza_confermata: t.presenza_confermata || null
        }));
        
        res.json(tornate);
        
    } catch (error) {
        console.error('❌ Errore API prossime:', error);
        res.status(500).json([]);
    }
});
// GET /api/tornate/calendario/:anno - Tornate per calendario
router.get('/calendario/:anno', async (req, res) => {
    try {
        const { anno } = req.params;
        const { mese } = req.query;
        
        const tornate = await db.getTornatePerCalendario(anno, mese);
        
        // Organizza per mese per il frontend
        const calendario = {};
        tornate.forEach(tornata => {
            const data = new Date(tornata.data);
            const meseKey = data.getMonth() + 1; // 1-12
            
            if (!calendario[meseKey]) {
                calendario[meseKey] = [];
            }
            
            calendario[meseKey].push({
                ...tornata,
                data_formatted: data.toLocaleDateString('it-IT')
            });
        });
        
        res.json({
            success: true,
            anno: parseInt(anno),
            calendario: calendario,
            totale_tornate: tornate.length
        });
        
    } catch (error) {
        console.error('Errore calendario tornate:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del calendario',
            error: error.message
        });
    }
});

// GET /api/tornate/stats/introduzioni - Statistiche chi ha introdotto discussioni
router.get('/stats/introduzioni', async (req, res) => {
    try {
        const { anno } = req.query;
        
        const stats = await db.getStatisticheIntroduzioni(anno);
        
        res.json({
            success: true,
            data: stats,
            filtro_anno: anno || 'tutti'
        });
        
    } catch (error) {
        console.error('Errore statistiche introduzioni:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche',
            error: error.message
        });
    }
});

// ✅ ROUTE /:id DEVE ESSERE DOPO LE ROUTE SPECIFICHE

// GET /api/tornate/:id - Dettagli singola tornata
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const tornata = await db.getTornataById(id);
        
        if (!tornata) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }
        
        // Recupera anche le presenze per questa tornata
        const presenze = await db.getPresenzeByTornata(id);
        
        res.json({
            success: true,
            data: {
                ...tornata,
                presenze: presenze
            }
        });
        
    } catch (error) {
        console.error('Errore nel recupero tornata:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero della tornata',
            error: error.message
        });
    }
});



// SOSTITUISCI COMPLETAMENTE la route PUT con questa versione CORRETTA:

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const bodyData = req.body;
        
        // Verifica che la tornata esista
        const tornataEsistente = await db.getTornataById(id);
        if (!tornataEsistente) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }
        
        // ✅ CONVERSIONE ULTRA-SICURA - ZERO UNDEFINED GARANTITO
        const tornataData = {
            data: bodyData.data || null,
            orario_inizio: bodyData.orario_inizio || null,
            discussione: bodyData.discussione || null,
            chi_introduce: bodyData.chi_introduce ? parseInt(bodyData.chi_introduce) : null,
            location: bodyData.location || null,
            tipo: bodyData.tipo || 'ordinaria',
            tipo_loggia: bodyData.tipo_loggia || 'nostra',
            cena: bodyData.cena === true || bodyData.cena === 'true' ? 1 : 0,
            costo_cena: bodyData.costo_cena ? parseFloat(bodyData.costo_cena) : null,
            descrizione_cena: bodyData.descrizione_cena || null,
            argomento_istruzione: bodyData.argomento_istruzione || null,
            orario_istruzione: bodyData.orario_istruzione || null,
            link_audio: bodyData.link_audio || null,
            link_pagina: bodyData.link_pagina || null,
            stato: bodyData.stato || 'programmata',
            note: bodyData.note || null
        };
        
        // 🔍 DEBUG: Verifica finale che NON ci siano undefined
        console.log('🔍 DATI FINALI PROCESSATI:', JSON.stringify(tornataData, null, 2));
        
        const hasUndefined = Object.values(tornataData).some(val => val === undefined);
        if (hasUndefined) {
            console.error('❌ ERRORE: Trovati valori undefined!', tornataData);
            return res.status(400).json({
                success: false,
                message: 'Errore nella preparazione dati',
                error: 'Valori undefined rilevati'
            });
        }
        
        // Aggiorna nel database
        await db.updateTornata(id, tornataData);
        
        // Recupera la tornata aggiornata
        const tornataAggiornata = await db.getTornataById(id);
        
        res.json({
            success: true,
            message: 'Tornata aggiornata con successo',
            data: tornataAggiornata
        });
        
    } catch (error) {
        console.error('❌ ERRORE AGGIORNAMENTO TORNATA:', error.message);
        console.error('❌ STACK:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della tornata',
            error: error.message
        });
    }
});
// DELETE /api/tornate/:id - Elimina tornata (solo admin)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verifica che la tornata esista
        const tornata = await db.getTornataById(id);
        if (!tornata) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }
        
        // Verifica se ci sono presenze associate
        const presenze = await db.getPresenzeByTornata(id);
        if (presenze.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Impossibile eliminare: tornata con presenze registrate',
                presenze_count: presenze.length
            });
        }
        
        await db.deleteTornata(id);
        
        res.json({
            success: true,
            message: 'Tornata eliminata con successo'
        });
        
    } catch (error) {
        console.error('Errore eliminazione tornata:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della tornata',
            error: error.message
        });
    }
});

// PATCH /api/tornate/:id/stato - Cambia solo lo stato della tornata
router.patch('/:id/stato', async (req, res) => {
    try {
        const { id } = req.params;
        const { stato } = req.body;
        
        const statiValidi = ['programmata', 'completata', 'annullata'];
        if (!statiValidi.includes(stato)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido. Valori ammessi: ' + statiValidi.join(', ')
            });
        }
        
        await db.updateTornata(id, { stato });
        
        const tornataAggiornata = await db.getTornataById(id);
        
        res.json({
            success: true,
            message: `Stato cambiato in: ${stato}`,
            data: tornataAggiornata
        });
        
    } catch (error) {
        console.error('Errore cambio stato:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel cambio di stato',
            error: error.message
        });
    }
});
// GET /api/tornate/fratelli/:id/tornate - Tornate specifiche per un fratello con JOIN
router.get('/fratelli/:id/tornate', async (req, res) => {
    try {
        const { id: fratelloId } = req.params;
        const { limit } = req.query;  // ✅ CORRETTO
        
        console.log(`🔍 Recupero tornate per fratello ${fratelloId}${limit ? ` (limit: ${limit})` : ''}`);
        
        // ✅ CAMBIA const IN let
        let query = `
            SELECT 
                t.id,
                DATE_FORMAT(t.data, '%Y-%m-%d') as data,
                t.orario_inizio as ora,
                t.discussione as titolo,
                t.discussione as argomento,
                t.tipo,
                t.location,
                t.argomento_istruzione,
                t.orario_istruzione,
                t.cena,
                t.costo_cena,
                t.descrizione_cena,
                t.note,
                t.chi_introduce,
                t.link_audio,        
                t.link_pagina,       
                f.nome as chi_introduce_nome,
                p.presente as presenza_confermata
            FROM tornate t
            LEFT JOIN fratelli f ON t.chi_introduce = f.id
            LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
            WHERE t.tipo_loggia = 'nostra' AND t.stato = 'completata'
            ORDER BY t.data DESC
        `;
        
        // ✅ ORA FUNZIONA
        if (limit && !isNaN(limit)) {
            query += ` LIMIT ${parseInt(limit)}`;
        }
        
        const tornate = await db.executeQuery(query, [fratelloId]);
        
        console.log(`✅ Trovate ${tornate.length} tornate per fratello ${fratelloId}`);
        
        res.json(tornate);
        
    } catch (error) {
        console.error('❌ Errore nel recupero tornate fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle tornate',
            error: error.message
        });
    }
});
// 🆕 FUNZIONE WHATSAPP CON DATE_FORMAT CORRETTO
async function prepareWhatsAppAnnouncement(tornataId) {
    try {
        // ✅ QUERY CON DATE_FORMAT (per evitare Invalid Date)
        const tornataQuery = `
            SELECT 
                id,
                DATE_FORMAT(data, '%Y-%m-%d') as data,
                orario_inizio,
                discussione,
                chi_introduce,
                location,
                tipo,
                tipo_loggia,
                cena,
                costo_cena,
                descrizione_cena,
                argomento_istruzione,
                orario_istruzione,
                link_audio,
                link_pagina,
                stato,
                note
            FROM tornate 
            WHERE id = ?
        `;

        const tornataResults = await db.executeQuery(tornataQuery, [tornataId]);
        const tornata = tornataResults[0];
        
        if (!tornata) {
            throw new Error('Tornata non trovata');
        }
        
        const websiteUrl = process.env.WEBSITE_URL || 'https://kilwinning-lodge.com';
        
        // Recupera fratelli attivi con telefono
        const fratelliRows = await db.executeQuery(`
            SELECT id, nome, telefono, cariche_fisse 
            FROM fratelli 
            WHERE attivo = 1 AND telefono IS NOT NULL
            ORDER BY nome
        `);
        
        console.log(`📢 Preparazione annuncio per ${fratelliRows.length} fratelli...`);
        
        // Recupera nome introduttore se specificato
        let nomeIntroduttore = '';
        if (tornata.chi_introduce) {
            const introduttoreRows = await db.executeQuery(
                'SELECT nome FROM fratelli WHERE id = ?', 
                [tornata.chi_introduce]
            );
            if (introduttoreRows.length > 0) {
                nomeIntroduttore = introduttoreRows[0].nome;
            }
        }
        
        // Genera messaggio (con data già formattata)
        const message = generateNewTornataMessage(tornata, nomeIntroduttore, websiteUrl);
        
        // Prepara link per ogni fratello
        const whatsappLinks = fratelliRows.map(fratello => ({
            fratello_id: fratello.id,
            fratello_nome: fratello.nome,
            telefono: fratello.telefono,
            link: `https://wa.me/${fratello.telefono.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(message)}`
        }));
        
        return {
            success: true,
            total_fratelli: fratelliRows.length,
            message: message,
            links: whatsappLinks,
            tornata: tornata
        };
        
    } catch (error) {
        console.error('❌ Errore preparazione annuncio:', error);
        throw error;
    }
}

// ✅ FUNZIONE generateNewTornataMessage AGGIORNATA per gestire data già formattata
function generateNewTornataMessage(tornata, nomeIntroduttore, websiteUrl) {
    let dataFormatted = 'Data da definire';
    
    if (tornata.data) {
        try {
            // ✅ SE LA DATA È GIÀ FORMATTATA (YYYY-MM-DD), usala direttamente
            if (typeof tornata.data === 'string' && tornata.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = tornata.data.split('-');
                const dataObj = new Date(year, month - 1, day);
                
                dataFormatted = dataObj.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                });
            } else {
                // ✅ FALLBACK per altri formati
                const dataString = tornata.data.toString().split('T')[0];
                const [year, month, day] = dataString.split('-');
                const dataObj = new Date(year, month - 1, day);
                
                dataFormatted = dataObj.toLocaleDateString('it-IT', {
                    weekday: 'long',
                    year: 'numeric', 
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('Errore formattazione data:', error);
            dataFormatted = `Data: ${tornata.data}`; // Mostra almeno la data grezza
        }
    }
    
    // 🔧 FIX ORA - PRENDI DAL DATABASE
    const orarioInizio = tornata.orario_inizio || '21:00';
    
    return `🏛️ NUOVA TORNATA PROGRAMMATA

📅 Data: ${dataFormatted}
🕐 Ore: ${orarioInizio}
🗣️ Argomento: ${tornata.discussione || 'Da definire'}
${nomeIntroduttore ? `👤 Introduce: ${nomeIntroduttore}` : ''}
📍 ${tornata.location || 'Tempio Massonico'}
${tornata.cena ? `🍽️ Cena: €${tornata.costo_cena || 'TBD'} (facoltativa)` : ''}

⚠️ CONFERMATE LA PRESENZA entro 48h:
🔗 tornate.loggiakilwinning.com

💙 Amicizia, Moralità e Amore Fraterno`;
}
// 🆕 POST /api/tornate/:id/whatsapp - Prepara link WhatsApp per tornata esistente
router.post('/:id/whatsapp', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`📱 Preparazione link WhatsApp per tornata ${id}`);
        
        // Usa la funzione esistente
        const whatsappData = await prepareWhatsAppAnnouncement(id);
        
        res.json({
            success: true,
            data: whatsappData
        });
        
    } catch (error) {
        console.error('❌ Errore preparazione WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella preparazione dei link WhatsApp',
            error: error.message
        });
    }
});

module.exports = router;