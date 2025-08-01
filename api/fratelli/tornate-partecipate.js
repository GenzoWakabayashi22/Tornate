const { db } = require('../../config/database');

module.exports = async (req, res) => {
    // Imposta headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            message: 'Metodo non permesso'
        });
    }

    try {
        // Per ora uso un ID fisso per testare - dopo implementeremo l'autenticazione
        const fratello_id_test = 16; // Cambia con un ID che esiste nel tuo DB
        
        // Se hai già un sistema di autenticazione, decommenta:
        // const fratello_id = req.session?.fratello_id || req.user?.id;
        // if (!fratello_id) {
        //     return res.status(401).json({ success: false, message: 'Non autenticato' });
        // }

        const fratello_id = fratello_id_test;

        // Query per le ultime 5 tornate partecipate
        const query = `
            SELECT 
                t.id,
                t.data,
                t.discussione,
                p.ruolo,
                p.presente,
                t.stato,
                t.tipo,
                t.location
            FROM tornate t
            INNER JOIN presenze p ON t.id = p.tornata_id
            WHERE p.fratello_id = ?
            ORDER BY t.data DESC
            LIMIT 5
        `;

        const risultati = await db.executeQuery(query, [fratello_id]);

        console.log(`✅ Caricate ${risultati.length} tornate per fratello ${fratello_id}`);

        res.json({
            success: true,
            data: risultati,
            debug: {
                fratello_id: fratello_id,
                total_rows: risultati.length
            }
        });

    } catch (error) {
        console.error('❌ Errore API tornate-partecipate:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle tornate: ' + error.message
        });
    }
};