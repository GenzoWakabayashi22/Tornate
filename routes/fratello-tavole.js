const express = require('express');
const router = express.Router();

// Middleware per verificare che sia un fratello autenticato
function requireFratelloAuth(req, res, next) {
    if (!req.session.user || req.session.user.ruolo !== 'fratello') {
        return res.status(403).json({ 
            success: false, 
            message: 'Accesso negato. Solo i fratelli possono accedere a questa sezione.' 
        });
    }
    next();
}

// GET /api/fratello/tavole - Lista tavole del fratello loggato
router.get('/tavole', requireFratelloAuth, async (req, res) => {
    try {
        console.log('📚 [FRATELLO-TAVOLE] Caricamento tavole fratello...');
        
        const db = req.app.get('db');
        const fratelloId = req.session.user.id;
        
        console.log(`📚 [DEBUG] Fratello ID: ${fratelloId}`);
        console.log(`📚 [DEBUG] Database object:`, typeof db);
        
        // ✅ USA IL METODO CORRETTO DEL DATABASE
        const filtri = {
            chi_introduce: fratelloId // ✅ Filtro per il fratello loggato
        };
        
        console.log(`📚 [DEBUG] Filtri applicati:`, filtri);
        
        // ✅ METODO CORRETTO - db.getTavole() esiste nel database.js
        const tavole = await db.getTavole(filtri);
        
        console.log(`📚 [DEBUG] Tavole trovate: ${tavole.length}`);
        console.log(`📚 [DEBUG] Dati tavole:`, tavole);
        
        // Calcola statistiche
        const currentYear = new Date().getFullYear();
        const stats = {
            totali: tavole.length,
            anno_corrente: tavole.filter(t => new Date(t.data_trattazione).getFullYear() === currentYear).length,
            programmate: tavole.filter(t => t.stato === 'programmata').length,
            in_preparazione: tavole.filter(t => t.stato === 'in_preparazione').length,
            completate: tavole.filter(t => t.stato === 'completata').length
        };
        
        // ✅ FORMATTAZIONE CORRETTA - usa i campi reali dal database
        const tavoleFormatted = tavole.map(tavola => ({
            id: tavola.id,
            data_trattazione: tavola.data_trattazione,
            titolo_discussione: tavola.titolo_discussione,
            stato: tavola.stato,
            fratello: {
                id: tavola.chi_introduce,
                nome: tavola.nome_introduce, // ✅ Campo corretto dal JOIN nel database
                grado: tavola.grado_introduce || null
            },
            spunti_suggeriti: tavola.spunti_suggeriti,
            link_tavola: tavola.link_tavola,
            note: tavola.note,
            created_at: tavola.created_at,
            updated_at: tavola.updated_at
        }));
        
        console.log('✅ [DEBUG] Invio risposta di successo');
        console.log('📊 [DEBUG] Statistiche:', stats);
        
        res.json({
            success: true,
            tavole: tavoleFormatted,
            stats: stats
        });
        
    } catch (error) {
        console.error('❌ [DEBUG] Errore nel recupero tavole fratello:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore interno del server: ' + error.message
        });
    }
});

// GET /api/fratello/tavole/:id - Dettagli singola tavola (solo se è sua)
router.get('/tavole/:id', requireFratelloAuth, async (req, res) => {
    try {
        const db = req.app.get('db');
        const tavolaId = req.params.id;
        const fratelloId = req.session.user.id;
        
        console.log(`🔍 [DEBUG] Caricamento dettagli tavola ID: ${tavolaId} per fratello: ${fratelloId}`);
        
        // ✅ USA METODO DATABASE CORRETTO
        const tavola = await db.getTavolaById(tavolaId);
        
        if (!tavola) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tavola non trovata' 
            });
        }
        
        // ✅ VERIFICA CHE LA TAVOLA APPARTENGA AL FRATELLO
        if (tavola.chi_introduce != fratelloId) {
            return res.status(403).json({ 
                success: false, 
                message: 'Non hai i permessi per visualizzare questa tavola' 
            });
        }
        
        // ✅ FORMATTAZIONE CORRETTA
        const tavolaFormatted = {
            id: tavola.id,
            data_trattazione: tavola.data_trattazione,
            titolo_discussione: tavola.titolo_discussione,
            stato: tavola.stato,
            fratello: {
                id: tavola.chi_introduce,
                nome: tavola.nome_introduce, // ✅ Campo corretto dal JOIN
                grado: tavola.grado_introduce || null
            },
            spunti_suggeriti: tavola.spunti_suggeriti,
            link_tavola: tavola.link_tavola,
            note: tavola.note,
            created_at: tavola.created_at,
            updated_at: tavola.updated_at
        };
        
        console.log(`✅ Tavola trovata: ${tavola.titolo_discussione}`);
        
        res.json({
            success: true,
            tavola: tavolaFormatted
        });
        
    } catch (error) {
        console.error('❌ Errore nel recupero dettagli tavola:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Errore interno del server: ' + error.message
        });
    }
});

module.exports = router;