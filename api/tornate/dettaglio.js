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
        // Ottieni l'ID dalla query string (?id=123) o dai parametri della route
        const tornata_id = req.query.id || req.params.id;

        if (!tornata_id || isNaN(tornata_id)) {
            return res.status(400).json({
                success: false,
                message: 'ID tornata richiesto e deve essere numerico'
            });
        }

        // Query per ottenere tutti i dettagli della tornata
        const query = `
            SELECT 
                t.*,
                CONCAT(f.nome, ' ', COALESCE(f.cognome, '')) as nome_introduce
            FROM tornate t
            LEFT JOIN fratelli f ON t.chi_introduce = f.id
            WHERE t.id = ?
        `;

        const risultato = await db.executeQuery(query, [parseInt(tornata_id)]);

        if (risultato.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }

        console.log(`✅ Dettagli tornata ${tornata_id} caricati`);

        res.json({
            success: true,
            data: risultato[0]
        });

    } catch (error) {
        console.error('❌ Errore API dettaglio tornata:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento dettagli: ' + error.message
        });
    }
};