const mysql = require('mysql2/promise');
require('dotenv').config();

// Configurazione del pool di connessioni
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

console.log("🔎 ENV check:", {
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASSWORD ? '********' : 'MANCANTE',
  DB_NAME: process.env.DB_NAME
});

const pool = mysql.createPool(dbConfig);

// Funzione per testare la connessione
async function testConnection() {
    try {
        console.log('🔧 TEST CONNESSIONE DB...');
        const connection = await pool.getConnection();
        console.log('✅ DB CONNESSO');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ ERRORE CONNESSIONE DB:', {
            message: error.message,
            code: error.code,
            host: dbConfig.host,
            user: dbConfig.user,
            port: dbConfig.port
        });
        return false;
    }
}

// Funzione per eseguire query
async function executeQuery(sql, params = []) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Errore query:', error.message);
        throw error;
    }
}

// Funzioni specifiche per le tabelle
const db = {
    executeQuery, 
    
    // FRATELLI
    async getFratelli() {
        return await executeQuery('SELECT * FROM fratelli ORDER BY nome');
    },
    
    async getFratelloById(id) {
        const results = await executeQuery('SELECT * FROM fratelli WHERE id = ?', [id]);
        return results[0];
    },
    
    async addFratello(nome, grado, cariche = null, cariche_fisse = null) {
        return await executeQuery(
            'INSERT INTO fratelli (nome, grado, cariche, cariche_fisse) VALUES (?, ?, ?, ?)',
            [nome, grado, cariche, cariche_fisse]
        );
    },
    
    async updateFratelloRuolo(id, cariche_fisse) {
        return await executeQuery(
            'UPDATE fratelli SET cariche_fisse = ? WHERE id = ?',
            [cariche_fisse, id]
        );
    },
    
    async updateFratello(id, nome, grado, cariche = null, cariche_fisse = null) {
        return await executeQuery(
            'UPDATE fratelli SET nome = ?, grado = ?, cariche = ?, cariche_fisse = ? WHERE id = ?',
            [nome, grado, cariche, cariche_fisse, id]
        );
    },
    
    async deleteFratello(id) {
        return await executeQuery('DELETE FROM fratelli WHERE id = ?', [id]);
    },
    
    // Tornate future con limit
    getProssimeTornate: async (fratelloId, limit = 3) => {
        return await executeQuery(`
            SELECT t.*, 
                   (SELECT p.presente 
                    FROM presenze p 
                    WHERE p.tornata_id = t.id AND p.fratello_id = ?) AS presenza_confermata
            FROM tornate t
            WHERE t.data > CURDATE()
            ORDER BY t.data ASC
            LIMIT ?
        `, [fratelloId, limit]);
    },
    
    // TORNATE - VERSIONE COMPLETA
    async getTornate(filtri = {}) {
        let sql = `
            SELECT t.*, 
                   f.nome as nome_introduce
            FROM tornate t
            LEFT JOIN fratelli f ON t.chi_introduce = f.id
        `;
        
        const params = [];
        const conditions = [];
        
        if (filtri.anno) {
            conditions.push('YEAR(t.data) = ?');
            params.push(filtri.anno);
        }
        
        if (filtri.tipo_loggia) {
            conditions.push('t.tipo_loggia = ?');
            params.push(filtri.tipo_loggia);
        }
        
        if (filtri.stato) {
            conditions.push('t.stato = ?');
            params.push(filtri.stato);
        }
        
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        
        sql += ' ORDER BY t.data DESC';
        
        return await executeQuery(sql, params);
    },
    
    async getTornataById(id) {
        const results = await executeQuery(`
            SELECT t.*, 
                   f.nome as nome_introduce
            FROM tornate t
            LEFT JOIN fratelli f ON t.chi_introduce = f.id
            WHERE t.id = ?
        `, [id]);
        return results[0];
    },
    
    // ✅ METODO addTornata CORRETTO CON DEBUG
    async addTornata(tornataData) {
        console.log('🔍 [DB] addTornata chiamato con:', tornataData);
        
        const {
            data,
            orario_inizio,
            discussione,
            chi_introduce = null,
            location,
            cena = false, // ✅ Campo corretto dall'admin form
            costo_cena = null,
            descrizione_cena = null,
            argomento_istruzione = null,
            orario_istruzione = null, // ✅ Campo corretto
            link_audio = null,
            link_pagina = null,
            tipo_loggia = 'nostra',
            tipo = 'ordinaria',
            note = null,
            stato = 'programmata'
        } = tornataData;
        
        console.log('🔧 [DB] Dati processati per INSERT:', {
            data, orario_inizio, discussione, location, tipo, tipo_loggia, stato,
            cena, costo_cena, argomento_istruzione
        });
        
        const query = `
            INSERT INTO tornate (
                data, orario_inizio, discussione, chi_introduce, location,
                cena, costo_cena, descrizione_cena, argomento_istruzione, orario_istruzione,
                link_audio, link_pagina, tipo_loggia, tipo, note, stato
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            data, 
            orario_inizio, 
            discussione, 
            chi_introduce, 
            location,
            cena ? 1 : 0, // ✅ Converte boolean in tinyint
            costo_cena, 
            descrizione_cena, 
            argomento_istruzione, 
            orario_istruzione,
            link_audio, 
            link_pagina, 
            tipo_loggia, 
            tipo, 
            note, 
            stato
        ];
        
        console.log('📋 [DB] Query SQL:', query);
        console.log('📋 [DB] Valori:', values);
        
        try {
            const result = await executeQuery(query, values);
            console.log('✅ [DB] INSERT eseguito con successo:', result);
            return result;
        } catch (error) {
            console.error('❌ [DB] ERRORE INSERT:', error);
            throw error;
        }
    },
    
    async updateTornata(id, tornataData) {
        const {
            data,
            orario_inizio,
            discussione,
            chi_introduce,
            location,
            cena,
            costo_cena,
            descrizione_cena,
            argomento_istruzione,
            orario_istruzione,
            link_audio,
            link_pagina,
            tipo_loggia,
            tipo,
            note,
            stato
        } = tornataData;
        
        return await executeQuery(`
            UPDATE tornate SET
                data = ?, orario_inizio = ?, discussione = ?, chi_introduce = ?,
                location = ?, cena = ?, costo_cena = ?, descrizione_cena = ?, 
                argomento_istruzione = ?, orario_istruzione = ?, link_audio = ?, 
                link_pagina = ?, tipo_loggia = ?, tipo = ?, note = ?, stato = ?
            WHERE id = ?
        `, [
            data, orario_inizio, discussione, chi_introduce, location,
            cena, costo_cena, descrizione_cena, argomento_istruzione, orario_istruzione,
            link_audio, link_pagina, tipo_loggia, tipo, note, stato, id
        ]);
    },
    
    async deleteTornata(id) {
        return await executeQuery('DELETE FROM tornate WHERE id = ?', [id]);
    },
    // TAVOLE ARCHITETTONICHE
async getTavole(filtri = {}) {
    let sql = `
        SELECT t.*, 
               f.nome as nome_introduce
        FROM tavole t
        LEFT JOIN fratelli f ON t.chi_introduce = f.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (filtri.anno) {
        conditions.push('YEAR(t.data_trattazione) = ?');
        params.push(filtri.anno);
    }
    
    if (filtri.stato) {
        conditions.push('t.stato = ?');
        params.push(filtri.stato);
    }
    
    if (filtri.chi_introduce) {
        conditions.push('t.chi_introduce = ?');
        params.push(filtri.chi_introduce);
    }
    
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    sql += ' ORDER BY t.data_trattazione DESC';
    
    return await executeQuery(sql, params);
},

async getTavolaById(id) {
    const results = await executeQuery(`
        SELECT t.*, 
               f.nome as nome_introduce
        FROM tavole t
        LEFT JOIN fratelli f ON t.chi_introduce = f.id
        WHERE t.id = ?
    `, [id]);
    return results[0];
},

async addTavola(tavolaData) {
    console.log('🔍 [DB] addTavola chiamato con:', tavolaData);
    
    const {
        data_trattazione,
        titolo_discussione,
        chi_introduce = null,
        spunti_suggeriti = null,
        link_tavola = null,
        stato = 'programmata',
        note = null
    } = tavolaData;
    
    const query = `
        INSERT INTO tavole (
            data_trattazione, titolo_discussione, chi_introduce, 
            spunti_suggeriti, link_tavola, stato, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
        data_trattazione,
        titolo_discussione,
        chi_introduce,
        spunti_suggeriti,
        link_tavola,
        stato,
        note
    ];
    
    console.log('📋 [DB] Query SQL Tavola:', query);
    console.log('📋 [DB] Valori Tavola:', values);
    
    try {
        const result = await executeQuery(query, values);
        console.log('✅ [DB] INSERT tavola eseguito con successo:', result);
        return result;
    } catch (error) {
        console.error('❌ [DB] ERRORE INSERT tavola:', error);
        throw error;
    }
},

async updateTavola(id, tavolaData) {
    const {
        data_trattazione,
        titolo_discussione,
        chi_introduce,
        spunti_suggeriti,
        link_tavola,
        stato,
        note
    } = tavolaData;
    
    return await executeQuery(`
        UPDATE tavole SET
            data_trattazione = ?, titolo_discussione = ?, chi_introduce = ?,
            spunti_suggeriti = ?, link_tavola = ?, stato = ?, note = ?
        WHERE id = ?
    `, [
        data_trattazione, titolo_discussione, chi_introduce,
        spunti_suggeriti, link_tavola, stato, note, id
    ]);
},

async deleteTavola(id) {
    return await executeQuery('DELETE FROM tavole WHERE id = ?', [id]);
},
   
    // CALENDARIO - Tornate per mese
    async getTornatePerCalendario(anno, mese = null) {
        let sql = `
            SELECT t.id, t.data, t.orario_inizio, t.tipo, t.tipo_loggia, 
                   t.location, t.stato, f.nome as nome_introduce
            FROM tornate t
            LEFT JOIN fratelli f ON t.chi_introduce = f.id
            WHERE YEAR(t.data) = ?
        `;
        const params = [anno];
        
        if (mese) {
            sql += ' AND MONTH(t.data) = ?';
            params.push(mese);
        }
        
        sql += ' ORDER BY t.data ASC';
        
        return await executeQuery(sql, params);
    },
    
    // PRESENZE
    async getPresenzeByTornata(tornata_id) {
        return await executeQuery(`
            SELECT p.*, f.nome, f.grado 
            FROM presenze p 
            JOIN fratelli f ON p.fratello_id = f.id 
            WHERE p.tornata_id = ?
            ORDER BY f.nome
        `, [tornata_id]);
    },
    
    async addPresenza(fratello_id, tornata_id, ruolo = null, presente = 1) {
        return await executeQuery(
            'INSERT INTO presenze (fratello_id, tornata_id, ruolo, presente) VALUES (?, ?, ?, ?)',
            [fratello_id, tornata_id, ruolo, presente]
        );
    },
    
    async updatePresenza(id, presente, ruolo = null) {
        return await executeQuery(
            'UPDATE presenze SET presente = ?, ruolo = ? WHERE id = ?',
            [presente, ruolo, id]
        );
    },
    
    async deletePresenza(id) {
        return await executeQuery('DELETE FROM presenze WHERE id = ?', [id]);
    },
    
    // Altri metodi esistenti...
    async registraPresenzeTornata(tornata_id, presenzeData) {
        await executeQuery('DELETE FROM presenze WHERE tornata_id = ?', [tornata_id]);
        
        const insertPromises = presenzeData.map(presenzaData => {
            const { fratello_id, presente, ruolo } = presenzaData;
            return this.addPresenza(fratello_id, tornata_id, ruolo, presente);
        });
        
        return await Promise.all(insertPromises);
    },
    
    // OSPITI
    async getOspitiByTornata(tornata_id) {
        return await executeQuery(`
            SELECT * FROM ospiti 
            WHERE tornata_id = ? 
            ORDER BY nome
        `, [tornata_id]);
    },
    
    async addOspite(tornata_id, nome, loggia_provenienza = null, grado = null, note = null) {
        return await executeQuery(
            'INSERT INTO ospiti (tornata_id, nome, loggia_provenienza, grado, note) VALUES (?, ?, ?, ?, ?)',
            [tornata_id, nome, loggia_provenienza, grado, note]
        );
    },
    
    async updateOspite(id, nome, loggia_provenienza = null, grado = null, note = null) {
        return await executeQuery(
            'UPDATE ospiti SET nome = ?, loggia_provenienza = ?, grado = ?, note = ? WHERE id = ?',
            [nome, loggia_provenienza, grado, note, id]
        );
    },
    
    async deleteOspite(id) {
        return await executeQuery('DELETE FROM ospiti WHERE id = ?', [id]);
    },
    
    // STATISTICHE
    async getStatistichePresenze(anno = null) {
        let sql = `
            SELECT 
                f.nome,
                f.grado,
                COUNT(p.id) as presenze_totali,
                COUNT(CASE WHEN p.presente = 1 THEN 1 END) as presenze_effettive,
                COUNT(CASE WHEN p.ruolo IS NOT NULL AND p.presente = 1 THEN 1 END) as ruoli_ricoperti
            FROM fratelli f
            LEFT JOIN presenze p ON f.id = p.fratello_id
        `;
        
        const params = [];
        
        if (anno) {
            sql += ` 
                LEFT JOIN tornate t ON p.tornata_id = t.id
                WHERE YEAR(t.data) = ?
            `;
            params.push(anno);
        }
        
        sql += `
            GROUP BY f.id, f.nome, f.grado
            ORDER BY presenze_effettive DESC
        `;
        
        return await executeQuery(sql, params);
    },
    
    async getStatisticheIntroduzioni(anno = null) {
        let sql = `
            SELECT 
                f.nome,
                COUNT(t.id) as discussioni_introdotte,
                GROUP_CONCAT(t.discussione SEPARATOR '; ') as elenco_discussioni
            FROM fratelli f
            JOIN tornate t ON f.id = t.chi_introduce
        `;
        
        const params = [];
        
        if (anno) {
            sql += ' WHERE YEAR(t.data) = ?';
            params.push(anno);
        }
        
        sql += `
            GROUP BY f.id, f.nome
            ORDER BY discussioni_introdotte DESC
        `;
        
        return await executeQuery(sql, params);
    },
    
    // UTENTI
    async getUtenteByUsername(username) {
        const results = await executeQuery('SELECT * FROM utenti WHERE username = ?', [username]);
        return results[0];
    },
    
    async addUtente(username, password_hash, ruolo = 'utente') {
        return await executeQuery(
            'INSERT INTO utenti (username, password_hash, ruolo) VALUES (?, ?, ?)',
            [username, password_hash, ruolo]
        );
    }
};

module.exports = {
    pool,
    testConnection,
    executeQuery,
    db
};