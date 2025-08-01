const express = require('express');
const router = express.Router();
const { db } = require('../config/database');

// GET /api/presenze/tornata/:id - Presenze per una tornata specifica
router.get('/tornata/:id', async (req, res) => {
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
        
        // Recupera presenze e ospiti
        const presenze = await db.getPresenzeByTornata(id);
        const ospiti = await db.getOspitiByTornata(id);
        const fratelli = await db.getFratelli();
        
        res.json({
            success: true,
            data: {
                tornata: tornata,
                presenze: presenze,
                ospiti: ospiti,
                fratelli: fratelli
            }
        });
        
    } catch (error) {
        console.error('Errore nel recupero presenze:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle presenze',
            error: error.message
        });
    }
});

// POST /api/presenze/tornata/:id - Registra presenze per una tornata
router.post('/tornata/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { presenze } = req.body;
        
        // Verifica che la tornata esista
        const tornata = await db.getTornataById(id);
        if (!tornata) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }
        
        // Validazione presenze
        if (!Array.isArray(presenze)) {
            return res.status(400).json({
                success: false,
                message: 'Le presenze devono essere un array'
            });
        }
        
        // Registra le presenze
        await db.registraPresenzeTornata(id, presenze);
        
        res.json({
            success: true,
            message: 'Presenze registrate con successo',
            count: presenze.length
        });
        
    } catch (error) {
        console.error('Errore nella registrazione presenze:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella registrazione delle presenze',
            error: error.message
        });
    }
});

// GET /api/presenze/ospiti/tornata/:id - Ospiti per una tornata
router.get('/ospiti/tornata/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const ospiti = await db.getOspitiByTornata(id);
        
        res.json({
            success: true,
            data: ospiti
        });
        
    } catch (error) {
        console.error('Errore nel recupero ospiti:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero degli ospiti',
            error: error.message
        });
    }
});

// POST /api/presenze/ospiti - Aggiungi ospite
router.post('/ospiti', async (req, res) => {
    try {
        const { tornata_id, nome, loggia_provenienza, grado, note } = req.body;
        
        // Validazione
        if (!tornata_id || !nome) {
            return res.status(400).json({
                success: false,
                message: 'Tornata ID e nome ospite sono obbligatori'
            });
        }
        
        const result = await db.addOspite(tornata_id, nome, loggia_provenienza, grado, note);
        
        res.status(201).json({
            success: true,
            message: 'Ospite aggiunto con successo',
            data: {
                id: result.insertId,
                tornata_id,
                nome,
                loggia_provenienza,
                grado,
                note
            }
        });
        
    } catch (error) {
        console.error('Errore nell\'aggiunta ospite:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiunta dell\'ospite',
            error: error.message
        });
    }
});

// POST /api/presenze/conferma - Conferma presenza fratello
router.post('/conferma', async (req, res) => {
    try {
        const { fratelloId, tornataId, presente, timestamp } = req.body;
        
        // Validazione
        if (!fratelloId || !tornataId || presente === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Parametri mancanti: fratelloId, tornataId, presente'
            });
        }
        
        // Controlla se esiste già una presenza per questo fratello/tornata
        const presenzaEsistente = await db.executeQuery(`
            SELECT id FROM presenze 
            WHERE fratello_id = ? AND tornata_id = ?
        `, [fratelloId, tornataId]);
        
        if (presenzaEsistente.length > 0) {
            // Aggiorna presenza esistente
            await db.executeQuery(`
                UPDATE presenze 
                SET presente = ?, data_aggiornamento = NOW()
                WHERE fratello_id = ? AND tornata_id = ?
            `, [presente ? 1 : 0, fratelloId, tornataId]);
            
            res.json({
                success: true,
                message: 'Presenza aggiornata con successo',
                action: 'updated'
            });
        } else {
            // Crea nuova presenza
            await db.executeQuery(`
                INSERT INTO presenze (fratello_id, tornata_id, presente, data_creazione)
                VALUES (?, ?, ?, NOW())
            `, [fratelloId, tornataId, presente ? 1 : 0]);
            
            res.json({
                success: true,
                message: 'Presenza registrata con successo',
                action: 'created'
            });
        }
        
    } catch (error) {
        console.error('Errore conferma presenza:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server',
            error: error.message
        });
    }
});

// PUT /api/presenze/ospiti/:id - Modifica ospite
router.put('/ospiti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, loggia_provenienza, grado, note } = req.body;
        
        if (!nome) {
            return res.status(400).json({
                success: false,
                message: 'Nome ospite è obbligatorio'
            });
        }
        
        await db.updateOspite(id, nome, loggia_provenienza, grado, note);
        
        res.json({
            success: true,
            message: 'Ospite aggiornato con successo'
        });
        
    } catch (error) {
        console.error('Errore nell\'aggiornamento ospite:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dell\'ospite',
            error: error.message
        });
    }
});

// DELETE /api/presenze/ospiti/:id - Elimina ospite
router.delete('/ospiti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.deleteOspite(id);
        
        res.json({
            success: true,
            message: 'Ospite eliminato con successo'
        });
        
    } catch (error) {
        console.error('Errore nell\'eliminazione ospite:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione dell\'ospite',
            error: error.message
        });
    }
});

// GET /api/presenze/statistiche - Statistiche presenze generali
router.get('/statistiche', async (req, res) => {
    try {
        const { anno } = req.query;
        
        const stats = await db.getStatistichePresenze(anno);
        
        res.json({
            success: true,
            data: stats,
            filtro_anno: anno || 'tutti'
        });
        
    } catch (error) {
        console.error('Errore statistiche presenze:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle statistiche',
            error: error.message
        });
    }
});

// GET /api/presenze/fratello/:id - Presenze di un fratello specifico
router.get('/fratello/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { anno } = req.query;
        
    let sql = `
    SELECT 
        t.id, 
        t.data, 
        t.tipo, 
        t.discussione AS titolo,
        t.location, 
        t.argomento_istruzione,
        t.orario_istruzione,
        t.orario_inizio,
        t.cena,
        t.costo_cena,
        t.descrizione_cena,
        t.tipo_loggia,
        COALESCE(p.presente, 0) AS presenza_confermata,
        f.data_iniziazione
    FROM tornate t
    LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
    LEFT JOIN fratelli f ON f.id = ?
    WHERE t.tipo_loggia = 'nostra'
      AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
`;

        const params = [id, id];

        if (anno) {
            sql += ' AND YEAR(t.data) = ?';
            params.push(anno);
        }

        sql += ' ORDER BY t.data DESC';
        
        const presenze = await db.executeQuery(sql, params);
        const fratello = await db.getFratelloById(id);
        
        res.json({
            success: true,
            data: {
                fratello: fratello,
                presenze: presenze,
                totale: presenze.length,
                presenti: presenze.filter(p => p.presenza_confermata === 1).length,
                assenti: presenze.filter(p => p.presenza_confermata === 0).length
            }
        });
        
    } catch (error) {
        console.error('Errore presenze fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle presenze del fratello',
            error: error.message
        });
    }
});

// GET /api/presenze/fratello/:id/statistiche - Statistiche presenze fratello
router.get('/fratello/:id/statistiche', async (req, res) => {
    try {
        const { id } = req.params;
        const { anno } = req.query;
        
        console.log(`📊 [PRESENZE] Statistiche per fratello ${id}, anno: ${anno || 'Tutti'}`);
        
        if (!anno || anno === 'Tutti') {
            // 🌍 CALCOLO PER TUTTI GLI ANNI (CON FILTRO DATA INIZIAZIONE)
            console.log('🔄 Calcolo per TUTTI gli anni dalla data iniziazione...');
            
            // Query per statistiche generali (tutti gli anni, dalla data iniziazione)
            const queryStatsAll = `
                SELECT 
                    COUNT(DISTINCT t.id) as totaliTornate,
COUNT(DISTINCT CASE WHEN p.presente = 1 AND t.tipo_loggia = 'nostra' THEN t.id END) as presenzeCount,
COUNT(DISTINCT CASE WHEN p.presente = 0 AND t.tipo_loggia = 'nostra' THEN t.id END) as assenzeCount,
                    ROUND(
                        (COUNT(DISTINCT CASE WHEN p.presente = 1 AND t.tipo_loggia = 'nostra' THEN t.id END) * 100.0) /
                        NULLIF(COUNT(DISTINCT t.id), 0), 1
                    ) as percentuale,
                    f.data_iniziazione,
                    f.nome as fratello_nome
                FROM tornate t
                LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra'
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                  AND t.data <= CURDATE()
                  AND t.stato = 'completata'
            `;
            const statsAll = await db.executeQuery(queryStatsAll, [id, id]);
            
            // 🎯 CORREZIONE PRESENZE CONSECUTIVE - TUTTI GLI ANNI
            const queryConsecutiveAll = `
                SELECT 
                    t.id, t.data, YEAR(t.data) as anno, COALESCE(p.presente, 0) as presente
                FROM tornate t
                LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra' 
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                  AND t.data <= CURDATE() 
                  AND t.stato = 'completata'
                ORDER BY t.data ASC
            `;
            
            const presenzeDettaglioAll = await db.executeQuery(queryConsecutiveAll, [id, id]);
            
            // 🎯 CALCOLO CORRETTO PRESENZE CONSECUTIVE
            let presenzeConsecutiveAll = 0;
            let consecutiveAttualeAll = 0;
            let massimeConsecutiveAll = 0;
            
            for (const tornata of presenzeDettaglioAll) {
                if (tornata.presente === 1) {
                    consecutiveAttualeAll++;
                    massimeConsecutiveAll = Math.max(massimeConsecutiveAll, consecutiveAttualeAll);
                } else {
                    consecutiveAttualeAll = 0;
                }
            }
            
            // 🚨 LOGICA SPECIALE: SE NON CI SONO MAI ASSENZE
            const totaleAssenzeAll = statsAll[0]?.assenzeCount || 0;
            if (totaleAssenzeAll === 0) {
                // Non è mai mancato → TUTTE le presenze sono consecutive
                presenzeConsecutiveAll = statsAll[0]?.presenzeCount || 0;
            } else {
                // Ci sono assenze → usa la sequenza più lunga
                presenzeConsecutiveAll = massimeConsecutiveAll;
            }
            
            const result = {
                totaliTornate: statsAll[0]?.totaliTornate || 0,
                presenzeCount: statsAll[0]?.presenzeCount || 0,
                assenzeCount: statsAll[0]?.assenzeCount || 0,
                percentuale: Math.round(statsAll[0]?.percentuale || 0),
                presenzeConsecutive: presenzeConsecutiveAll,
                anno: 'Tutti',
                data_iniziazione: statsAll[0]?.data_iniziazione,
                fratello_nome: statsAll[0]?.fratello_nome
            };
            
            console.log(`✅ [PRESENZE] Statistiche TUTTI gli anni per fratello ${id}:`, result);
            console.log(`📅 Data iniziazione: ${result.data_iniziazione}`);
            console.log(`🎯 Presenze consecutive: ${presenzeConsecutiveAll} (assenze: ${totaleAssenzeAll})`);
            
            res.json({
                success: true,
                data: result,
                fratello_id: id
            });
            
        } else {
            // 📅 CALCOLO PER ANNO SPECIFICO
            console.log(`🔄 Calcolo per anno specifico: ${anno}`);
            
            const queryStats = `
    SELECT 
        COUNT(DISTINCT CASE WHEN p.presente IN (0,1) AND t.tipo_loggia = 'nostra' THEN t.id END) as totaliTornate,
        COUNT(DISTINCT CASE WHEN p.presente = 1 AND t.tipo_loggia = 'nostra' THEN t.id END) as presenzeCount,
        COUNT(DISTINCT CASE WHEN p.presente = 0 AND t.tipo_loggia = 'nostra' THEN t.id END) as assenzeCount,
        ROUND(
            (COUNT(DISTINCT CASE WHEN p.presente = 1 AND t.tipo_loggia = 'nostra' THEN t.id END) * 100.0) /
            NULLIF(COUNT(DISTINCT CASE WHEN p.presente IN (0,1) AND t.tipo_loggia = 'nostra' THEN t.id END), 0),
        1) as percentuale,
        f.data_iniziazione,
        f.nome as fratello_nome
    FROM tornate t
    LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
    LEFT JOIN fratelli f ON f.id = ?
    WHERE t.tipo_loggia = 'nostra'
      AND YEAR(t.data) = ?
      AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
      AND t.data <= CURDATE()
      AND t.stato = 'completata'
`;
            const stats = await db.executeQuery(queryStats, [id, id, anno]);
            
            // 🎯 CORREZIONE PRESENZE CONSECUTIVE - ANNO SPECIFICO
            const queryConsecutive = `
                SELECT 
                    t.id, t.data, COALESCE(p.presente, 0) as presente
                FROM tornate t
                LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra' 
                  AND YEAR(t.data) = ?
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                  AND t.data <= CURDATE() 
                  AND t.stato = 'completata'
                ORDER BY t.data ASC
            `;
            
            const presenzeDettaglio = await db.executeQuery(queryConsecutive, [id, id, anno]);
            
            // 🎯 CALCOLO CORRETTO PRESENZE CONSECUTIVE
            let presenzeConsecutive = 0;
            let consecutiveAttuale = 0;
            let massimeConsecutive = 0;
            
            for (const tornata of presenzeDettaglio) {
                if (tornata.presente === 1) {
                    consecutiveAttuale++;
                    massimeConsecutive = Math.max(massimeConsecutive, consecutiveAttuale);
                } else {
                    consecutiveAttuale = 0;
                }
            }
            
            // 🚨 LOGICA SPECIALE: SE NON CI SONO MAI ASSENZE IN QUESTO ANNO
            const totaleAssenze = stats[0]?.assenzeCount || 0;
            if (totaleAssenze === 0) {
                // Non è mai mancato in questo anno → TUTTE consecutive
                presenzeConsecutive = stats[0]?.presenzeCount || 0;
            } else {
                // Ci sono assenze → usa la sequenza più lunga
                presenzeConsecutive = massimeConsecutive;
            }
            
            const result = {
                totaliTornate: stats[0]?.totaliTornate || 0,
                presenzeCount: stats[0]?.presenzeCount || 0,
                assenzeCount: stats[0]?.assenzeCount || 0,
                percentuale: Math.round(stats[0]?.percentuale || 0),
                presenzeConsecutive: presenzeConsecutive,
                anno: anno,
                data_iniziazione: stats[0]?.data_iniziazione,
                fratello_nome: stats[0]?.fratello_nome
            };
            
            console.log(`✅ [PRESENZE] Statistiche anno ${anno} per fratello ${id}:`, result);
            console.log(`🎯 Presenze consecutive: ${presenzeConsecutive} (assenze: ${totaleAssenze})`);
            
            res.json({
                success: true,
                data: result,
                fratello_id: id
            });
        }
        
    } catch (error) {
        console.error('❌ [PRESENZE] Errore API statistiche:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle statistiche',
            error: error.message,
            data: {
                totaliTornate: 0,
                presenzeCount: 0,
                assenzeCount: 0,
                percentuale: 0,
                presenzeConsecutive: 0,
                anno: anno || 'Tutti'
            }
        });
    }
});

// GET /api/presenze/fratello/:id/non-partecipate - Tornate NON partecipate
router.get('/fratello/:id/non-partecipate', async (req, res) => {
    try {
        const { id } = req.params;
        const { anno, limit = 5 } = req.query;
        
        console.log(`🚫 [PRESENZE] Tornate NON partecipate per fratello ${id}`);
        
        let sql = `
            SELECT 
                t.id, 
                t.data, 
                t.tipo, 
                t.discussione AS titolo,
                t.location, 
                t.argomento_istruzione,
                t.orario_istruzione,
                t.orario_inizio,
                t.cena,
                t.costo_cena,
                t.descrizione_cena,
                t.tipo_loggia,
                t.stato,
                0 AS presenza_confermata,
                f.data_iniziazione
            FROM tornate t
            LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
            LEFT JOIN fratelli f ON f.id = ?
            WHERE t.tipo_loggia = 'nostra'
              AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
              AND t.data <= CURDATE()
              AND t.stato = 'completata'
              AND p.presente = 0
        `;

        const params = [id, id];

        if (anno) {
            sql += ' AND YEAR(t.data) = ?';
            params.push(anno);
        }

        sql += ' ORDER BY t.data DESC';
        
        if (limit) {
            sql += ' LIMIT ?';
            params.push(parseInt(limit));
        }
        
        const tornateNonPartecipate = await db.executeQuery(sql, params);
        const fratello = await db.getFratelloById(id);
        
        console.log(`🚫 Trovate ${tornateNonPartecipate.length} tornate non partecipate per fratello ${id}`);
        
        // 🎯 LOG DI DEBUG
        if (tornateNonPartecipate.length > 0) {
            console.log('🔍 ASSENZE TROVATE:', tornateNonPartecipate.map(t => ({
                data: t.data,
                titolo: t.titolo
            })));
        }
        
        res.json({
            success: true,
            data: tornateNonPartecipate,
            meta: {
                fratello: fratello,
                totale: tornateNonPartecipate.length,
                anno: anno || 'tutti',
                limite: limit
            }
        });
        
    } catch (error) {
        console.error('❌ Errore tornate non partecipate:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle tornate non partecipate',
            error: error.message
        });
    }
});

module.exports = router;