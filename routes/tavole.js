const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// 🔧 ROUTE POST CORRETTA per tavole.js - COPIATA DALLE TORNATE

router.post('/', async (req, res) => {
    try {
        console.log('🔥 POST TAVOLE - VERSIONE CORRETTA COPIATA DA TORNATE');
        console.log('📥 Body ricevuto:', req.body);
        
        // ✅ VALIDAZIONE DATI
        const { data_trattazione, titolo_discussione } = req.body;
        
        if (!data_trattazione) {
            return res.status(400).json({
                success: false,
                message: 'Data trattazione obbligatoria'
            });
        }
        
        if (!titolo_discussione) {
            return res.status(400).json({
                success: false,
                message: 'Titolo discussione obbligatorio'
            });
        }
        
        // ✅ PREPARA DATI CON NOMI CORRETTI
        const tavolaData = {
            data_trattazione: data_trattazione,
            titolo_discussione: titolo_discussione || 'Nuova Tavola',
            chi_introduce: req.body.chi_introduce || null,
            spunti_suggeriti: req.body.spunti_suggeriti || null,
            link_tavola: req.body.link_tavola || null,
            stato: req.body.stato || 'programmata',
            note: req.body.note || null
        };
        
        console.log('📋 Dati preparati per database:', tavolaData);
        
        // ✅ INIZIO TRANSAZIONE ESPLICITA
        await db.executeQuery('START TRANSACTION');
        
        try {
            // ✅ USA IL METODO CORRETTO
            const result = await db.addTavola(tavolaData);
            console.log('📊 Risultato INSERT:', result);
            
            // ✅ COMMIT FORZATO
            console.log('💾 COMMIT...');
            await db.executeQuery('COMMIT');
            console.log('✅ COMMIT COMPLETATO');
            
            // ✅ VERIFICA IMMEDIATA
            const verifica = await db.executeQuery('SELECT * FROM tavole WHERE id = ?', [result.insertId]);
            console.log('🔍 VERIFICA POST-COMMIT:', verifica.length > 0 ? 'TROVATA' : 'NON TROVATA');
            
            if (result.insertId && verifica.length > 0) {
                console.log('🎉 SUCCESSO COMPLETO! ID:', result.insertId);
                
                res.status(201).json({
                    success: true,
                    message: 'Tavola creata e salvata con successo',
                    data: { 
                        id: result.insertId,
                        ...verifica[0]
                    }
                });
            } else {
                throw new Error('Tavola non trovata dopo il commit');
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

// GET /api/tavole - Lista tutte le tavole con filtri opzionali
router.get('/', async (req, res) => {
    try {
        const { anno, stato } = req.query;
        
        const filtri = {};
        if (anno) filtri.anno = anno;
        if (stato) filtri.stato = stato;
        
        const tavole = await db.getTavole(filtri);
        
        res.json({
            success: true,
            data: tavole,
            count: tavole.length
        });
        
    } catch (error) {
        console.error('Errore nel recupero tavole:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle tavole',
            error: error.message
        });
    }
});

// GET /api/tavole/:id - Dettagli singola tavola
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const tavola = await db.getTavolaById(id);
        
        if (!tavola) {
            return res.status(404).json({
                success: false,
                message: 'Tavola non trovata'
            });
        }
        
        res.json({
            success: true,
            data: tavola
        });
        
    } catch (error) {
        console.error('Errore nel recupero tavola:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero della tavola',
            error: error.message
        });
    }
});

// PUT /api/tavole/:id - Aggiorna tavola
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const bodyData = req.body;
        
        // Verifica che la tavola esista
        const tavolaEsistente = await db.getTavolaById(id);
        if (!tavolaEsistente) {
            return res.status(404).json({
                success: false,
                message: 'Tavola non trovata'
            });
        }
        
        // ✅ CONVERSIONE ULTRA-SICURA - ZERO UNDEFINED GARANTITO
        const tavolaData = {
            data_trattazione: bodyData.data_trattazione || null,
            titolo_discussione: bodyData.titolo_discussione || null,
            chi_introduce: bodyData.chi_introduce ? parseInt(bodyData.chi_introduce) : null,
            spunti_suggeriti: bodyData.spunti_suggeriti || null,
            link_tavola: bodyData.link_tavola || null,
            stato: bodyData.stato || 'programmata',
            note: bodyData.note || null
        };
        
        // 🔍 DEBUG: Verifica finale che NON ci siano undefined
        console.log('🔍 DATI FINALI PROCESSATI:', JSON.stringify(tavolaData, null, 2));
        
        const hasUndefined = Object.values(tavolaData).some(val => val === undefined);
        if (hasUndefined) {
            console.error('❌ ERRORE: Trovati valori undefined!', tavolaData);
            return res.status(400).json({
                success: false,
                message: 'Errore nella preparazione dati',
                error: 'Valori undefined rilevati'
            });
        }
        
        // Aggiorna nel database
        await db.updateTavola(id, tavolaData);
        
        // Recupera la tavola aggiornata
        const tavolaAggiornata = await db.getTavolaById(id);
        
        res.json({
            success: true,
            message: 'Tavola aggiornata con successo',
            data: tavolaAggiornata
        });
        
    } catch (error) {
        console.error('❌ ERRORE AGGIORNAMENTO TAVOLA:', error.message);
        console.error('❌ STACK:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della tavola',
            error: error.message
        });
    }
});

// DELETE /api/tavole/:id - Elimina tavola (solo admin)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verifica che la tavola esista
        const tavola = await db.getTavolaById(id);
        if (!tavola) {
            return res.status(404).json({
                success: false,
                message: 'Tavola non trovata'
            });
        }
        
        await db.deleteTavola(id);
        
        res.json({
            success: true,
            message: 'Tavola eliminata con successo'
        });
        
    } catch (error) {
        console.error('Errore eliminazione tavola:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della tavola',
            error: error.message
        });
    }
});

// PATCH /api/tavole/:id/stato - Cambia solo lo stato della tavola
router.patch('/:id/stato', async (req, res) => {
    try {
        const { id } = req.params;
        const { stato } = req.body;
        
        const statiValidi = ['programmata', 'in_preparazione', 'completata', 'annullata'];
        if (!statiValidi.includes(stato)) {
            return res.status(400).json({
                success: false,
                message: 'Stato non valido. Valori ammessi: ' + statiValidi.join(', ')
            });
        }
        
        await db.updateTavola(id, { stato });
        
        const tavolaAggiornata = await db.getTavolaById(id);
        
        res.json({
            success: true,
            message: `Stato cambiato in: ${stato}`,
            data: tavolaAggiornata
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

module.exports = router;