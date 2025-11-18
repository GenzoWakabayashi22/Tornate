const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();



// Importa la configurazione database
const { testConnection, db } = require('./config/database');

// Finanze database pool (separate database)
const mysql = require('mysql2/promise');
const poolFinanze = mysql.createPool({
    host: process.env.DB_HOST_FINANZE || process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER_FINANZE || 'jmvvznbb_finanze_user',
    password: process.env.DB_PASSWORD_FINANZE || 'Puntorosso22',
    database: process.env.DB_NAME_FINANZE || 'jmvvznbb_finanze_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const app = express();

// ========== SSO CONFIGURATION ==========
// Chiave segreta per la firma dei token JWT (Finanze SSO)
const FINANZE_JWT_SECRET = process.env.FINANZE_JWT_SECRET || 'kilwinning_finanze_secret_key_2025_super_secure';

// ========== TRUST PROXY CONFIGURATION ==========
// Abilita trust proxy per supportare X-Forwarded-* headers dietro reverse proxy
app.set('trust proxy', true);

// ========== MIDDLEWARE MULTI-DOMINIO ==========
// AGGIUNGI DOPO: const app = express();

app.use((req, res, next) => {
    const hostname = req.get('host') || '';

    if (hostname.includes('biblioteca')) {
        req.appType = 'biblioteca';
        console.log(`📚 Richiesta BIBLIOTECA: ${req.method} ${req.path}`);
    } else if (hostname.includes('finanze')) {
        req.appType = 'finanze';
        console.log(`💰 Richiesta FINANZE: ${req.method} ${req.path}`);
    } else {
        // QUALSIASI altro dominio = tornate
        req.appType = 'tornate';
        console.log(`🏛️ Richiesta TORNATE: ${req.method} ${req.path}`);
    }

    next();
});

// File statici condizionali per dominio
app.use('/css', (req, res, next) => {
    if (req.appType === 'biblioteca') {
        express.static(path.join(__dirname, 'public/biblioteca/css'))(req, res, next);
    } else {
        express.static(path.join(__dirname, 'public/css'))(req, res, next);
    }
});

app.use('/js', (req, res, next) => {
    if (req.appType === 'biblioteca') {
        express.static(path.join(__dirname, 'public/biblioteca/js'))(req, res, next);
    } else {
        express.static(path.join(__dirname, 'public/js'))(req, res, next);
    }
});

app.use('/images', (req, res, next) => {
    if (req.appType === 'biblioteca') {
        express.static(path.join(__dirname, 'public/biblioteca/images'))(req, res, next);
    } else {
        express.static(path.join(__dirname, 'public/images'))(req, res, next);
    }
});

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet({
    contentSecurityPolicy: false, // Disabilita per ora, può bloccare script inline
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 1000, // limite per IP
    message: 'Troppe richieste da questo IP'
});
app.use('/api/', limiter);

// ========== MIDDLEWARE BASE ==========
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ========== CONFIGURAZIONE SESSIONI ==========
app.use(session({
    secret: process.env.SESSION_SECRET || 'kilwinning_presenze_secret_2025_super_strong',
    resave: true,
    saveUninitialized: false,
    rolling: true,  // ✅ Rolling mantiene la sessione attiva con ogni richiesta
    name: 'kilwinning_session',
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 10 * 60 * 1000,  // ✅ FIX: 10 minuti di timeout (600,000 ms)
        sameSite: 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.loggiakilwinning.com' : undefined // Condividi cookie tra sottodomini in produzione
    },
    genid: function(req) {
        return 'kilw_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}));

// Middleware per loggare sessioni (DEBUG)
app.use((req, res, next) => {
    if (req.path.startsWith('/admin') || req.path.startsWith('/fratelli')) {
        console.log(`🔍 ${req.method} ${req.path} - Session: ${req.sessionID} - User: ${req.session?.user?.username || 'none'}`);
    }
    next();
});

// Middleware: verifica se l'utente è il Tesoriere (solo Paolo può modificare Finanze)
const requireTesoriere = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'Autenticazione richiesta' });
    }

    const nome = req.session.user.nome || '';
    const isTesoriere = nome.includes('Paolo Giulio Gazzano');

    if (!isTesoriere) {
        return res.status(403).json({
            error: 'Permesso negato: solo il Tesoriere può modificare i dati finanziari'
        });
    }

    next();
};

// ========== ROTTE MODULARI ==========

// Area admin (pagine HTML)
app.use('/admin', require('./routes/admin'));

// API Routes
app.use('/api/presenze', require('./routes/presenze'));
app.use('/api/tornate', require('./routes/tornate'));
app.use('/api/tavole', require('./routes/tavole'));
app.use('/api/fratello', require('./routes/fratello-tavole'));


// ========== API FRATELLI (INLINE) ==========

// ✅ API: Login fratelli con autenticazione password
app.post('/api/fratelli/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('🔐 Tentativo login username:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username e password obbligatori'
            });
        }

        // Cerca il fratello nel database con password_hash e role tramite username
        const query = `
            SELECT
                id, nome, username, grado, cariche_fisse,
                password_hash, role, tipo, attivo
            FROM fratelli
            WHERE username = ? AND attivo = 1
        `;

        // ✅ CORRETTO: Utilizzo di db.executeQuery invece di un inesistente db.query
        const result = await db.executeQuery(query, [username]);

        // ✅ Verifica robusta del risultato
        if (!result || !Array.isArray(result) || result.length === 0) {
            console.log('❌ Username non trovato o non attivo:', username);
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        const fratello = result[0];

        // ✅ Verifica che fratello sia valido
        if (!fratello || !fratello.password_hash) {
            console.log('❌ Dati fratello incompleti:', username);
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        // Verifica password (confronto diretto con password_hash)
        if (password !== fratello.password_hash) {
            console.log('❌ Password errata per:', fratello.username);
            return res.status(401).json({
                success: false,
                message: 'Credenziali non valide'
            });
        }

        // ========================================
        // DETERMINA PRIVILEGI ADMIN
        // ========================================

        let userRole = 'user';
        let hasAdminAccess = false;

        // Paolo Giulio Gazzano è SEMPRE admin (hardcoded per sicurezza)
        if (fratello.username === 'paolo.giulio.gazzano') {
            userRole = 'admin';
            hasAdminAccess = true;
            console.log('👑 Login ADMIN: Paolo Giulio Gazzano');
        }
        // Oppure verifica dal database
        else if (fratello.role === 'admin') {
            userRole = 'admin';
            hasAdminAccess = true;
            console.log('👑 Login ADMIN da database:', fratello.nome);
        } else {
            console.log('👤 Login USER:', fratello.nome);
        }

        // Crea sessione fratello
        req.session.user = {
            id: fratello.id,
            username: fratello.username,
            nome: fratello.nome,
            grado: fratello.grado,
            cariche_fisse: fratello.cariche_fisse,
            tipo: fratello.tipo,
            role: userRole,  // ✅ USA userRole (NON fratello.role direttamente)
            ruolo: fratello.cariche_fisse || 'Fratello',  // ✅ FIX: Usa cariche_fisse per il ruolo
            admin_access: hasAdminAccess,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        // Salva sessione
        req.session.save((err) => {
            if (err) {
                console.error('❌ Errore salvataggio sessione:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Errore interno sessione'
                });
            }

            console.log(`✅ Login successful:`, fratello.nome,
                `[@${fratello.username}]`,
                `[${fratello.tipo}]`,
                hasAdminAccess ? '(ADMIN)' : '(user)');

            res.json({
                success: true,
                user: req.session.user,
                admin_access: hasAdminAccess,
                sessionId: req.sessionID
            });
        });

    } catch (error) {
        console.error('❌ Errore login fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore interno del server'
        });
    }
});

// ✅ API: Verifica sessione fratello (VERSIONE CORRETTA)
app.get('/api/fratelli/me', async (req, res) => {
    console.log('🔍 [DEBUG] /api/fratelli/me chiamata');
    console.log('🔍 [DEBUG] Session ID:', req.sessionID);
    console.log('🔍 [DEBUG] Session user:', req.session?.user?.nome);

    let timeout;
    try {
        // ✅ TIMEOUT PER EVITARE 503
        timeout = setTimeout(() => {
            console.error('❌ [DEBUG] TIMEOUT - Risposta dopo 3 secondi');
            if (!res.headersSent) {
                res.status(503).json({
                    success: false,
                    error: 'Database timeout',
                    message: 'Server temporaneamente non disponibile',
                    debug: 'Timeout dopo 3 secondi'
                });
            }
        }, 3000);

        if (req.session && req.session.user) {
            // Aggiorna ultima attività
            req.session.user.lastActivity = new Date().toISOString();

            // ✅ SALVATAGGIO SESSIONE CON ERROR HANDLING
            req.session.save((err) => {
                clearTimeout(timeout);

                if (err) {
                    console.error('❌ [DEBUG] Errore salvataggio sessione:', err);
                    if (!res.headersSent) {
                        return res.status(500).json({
                            success: false,
                            error: 'Session save error',
                            message: 'Errore interno sessione',
                            debug: err.message
                        });
                    }
                    return;
                }

                console.log('✅ [DEBUG] Sessione fratello valida per:', req.session.user.nome);

                if (!res.headersSent) {
                    res.json({
                        success: true,
                        authenticated: true,
                        user: req.session.user,
                        sessionId: req.sessionID,
                        debug: 'Session loaded successfully'
                    });
                }
            });
        } else {
            clearTimeout(timeout);
            console.log('❌ [DEBUG] Sessione fratello non trovata o invalida');

            if (!res.headersSent) {
                res.status(401).json({
                    success: false,
                    authenticated: false,
                    message: 'Sessione non valida',
                    debug: 'No valid session found'
                });
            }
        }

    } catch (error) {
        if(timeout) clearTimeout(timeout);
        console.error('💥 [DEBUG] Errore catturato in /api/fratelli/me:', error);

        if (!res.headersSent) {
            res.status(503).json({
                success: false,
                error: 'Server error',
                message: 'Errore interno del server',
                debug: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
});

// ✅ API: Logout fratello
app.post('/api/fratelli/logout', (req, res) => {
    console.log('🚪 Logout fratello:', req.session?.user?.nome);

    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Errore logout:', err);
            return res.status(500).json({ success: false });
        }

        res.clearCookie('kilwinning_session');
        console.log('✅ Logout fratello completato');

        res.json({ success: true, redirect: '/' });
    });
});

// ========================================
// ✅ NUOVO ENDPOINT SSO FINANZE
// ========================================

// API: Genera token JWT per accesso SSO a Finanze
app.get('/api/fratelli/sso-finanze', (req, res) => {
    console.log('💰 [SSO FINANZE] Richiesta generazione token SSO');

    try {
        // Verifica autenticazione
        if (!req.session || !req.session.user) {
            console.log('❌ [SSO FINANZE] Tentativo di accesso senza autenticazione');
            return res.status(401).json({
                success: false,
                error: 'Autenticazione richiesta',
                message: 'Devi effettuare il login per accedere a Finanze'
            });
        }

        // Estrai informazioni utente dalla sessione
        const user = req.session.user;

        // Validazione dati utente
        if (!user.id || !user.username || !user.nome) {
            console.log('❌ [SSO FINANZE] Dati utente incompleti');
            return res.status(400).json({
                success: false,
                error: 'Dati utente incompleti',
                message: 'Informazioni utente non valide'
            });
        }

        // Crea payload JWT completo con tutte le informazioni necessarie
        const payload = {
            id: user.id,
            username: user.username,
            nome: user.nome,
            role: user.role,
            admin_access: user.admin_access || false,
            grado: user.grado || 'Apprendista',
            source: 'tornate',
            timestamp: Date.now()
        };

        // Genera JWT con scadenza di 5 minuti (sicurezza)
        const token = jwt.sign(payload, FINANZE_JWT_SECRET, {
            expiresIn: '5m',
            issuer: 'tornate.loggiakilwinning.com',
            audience: 'finanze.loggiakilwinning.com'
        });

        // Costruisci URL di destinazione con token
        const redirectUrl = `https://finanze.loggiakilwinning.com/sso-login?token=${token}`;

        console.log(`✅ [SSO FINANZE] Token generato per: ${user.nome} (@${user.username})`);
        console.log(`📋 [SSO FINANZE] Role: ${user.role}, Admin: ${user.admin_access}`);

        // Restituisci risposta con URL di reindirizzamento
        res.json({
            success: true,
            redirect_url: redirectUrl,
            expiresIn: 300 // 5 minuti in secondi
        });

    } catch (error) {
        console.error('❌ [SSO FINANZE] Errore generazione token:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno',
            message: 'Errore nella generazione del token SSO'
        });
    }
});

console.log('✅ API SSO Finanze (/api/fratelli/sso-finanze) caricata correttamente');

// ✅ API SSO: Genera token JWT per accesso a Finanze (VECCHIO ENDPOINT - MANTIENI PER COMPATIBILITÀ)
app.get('/api/auth/generate-finanze-token', (req, res) => {
    console.log('🔐 Richiesta generazione token SSO per Finanze');

    try {
        // Verifica che l'utente sia autenticato
        if (!req.session || !req.session.user) {
            console.log('❌ Tentativo di accesso senza autenticazione');
            return res.status(401).json({
                success: false,
                error: 'Autenticazione richiesta',
                message: 'Devi effettuare il login per accedere a Finanze'
            });
        }

        // Estrai informazioni utente dalla sessione
        const user = req.session.user;
        const nome = user.nome || user.username;

        if (!nome) {
            console.log('❌ Nome utente non trovato nella sessione');
            return res.status(400).json({
                success: false,
                error: 'Dati utente incompleti',
                message: 'Informazioni utente non valide'
            });
        }

        // Crea payload JWT con nome utente
        const payload = {
            nome: nome,
            userId: user.id,
            timestamp: Date.now(),
            from: 'tornate'
        };

        // Genera JWT con scadenza di 60 secondi (per sicurezza)
        const token = jwt.sign(payload, FINANZE_JWT_SECRET, {
            expiresIn: '60s',
            issuer: 'tornate.loggiakilwinning.com',
            audience: 'finanze.loggiakilwinning.com'
        });

        // Costruisci URL di destinazione con token
        const redirectUrl = `https://finanze.loggiakilwinning.com/login.html?sso_token=${token}`;

        console.log(`✅ Token SSO generato per: ${nome}`);

        // Restituisci risposta con URL di reindirizzamento
        res.json({
            success: true,
            redirectUrl: redirectUrl,
            expiresIn: 60
        });

    } catch (error) {
        console.error('❌ Errore generazione token SSO:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno',
            message: 'Errore nella generazione del token SSO'
        });
    }
});

console.log('✅ API SSO per Finanze caricata correttamente');

// ✅ API DI TEST DATABASE
app.get('/api/test/db', async (req, res) => {
    console.log('🔍 [DEBUG] Test connessione database');

    try {
        // Test semplice connessione database
        const testQuery = await db.executeQuery('SELECT 1 as test');
        console.log('✅ [DEBUG] Database connesso:', testQuery);

        res.json({
            success: true,
            message: 'Database connesso',
            test_result: testQuery,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ [DEBUG] Errore connessione database:', error);

        res.status(503).json({
            success: false,
            error: 'Database error',
            message: 'Errore connessione database',
            debug: error.message
        });
    }
});

// ✅ API HEALTH CHECK
app.get('/api/health', (req, res) => {
    console.log('🔍 [DEBUG] Health check');

    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// ========== ALTRE API FRATELLI ==========

// GET /api/fratelli - Lista tutti i fratelli
app.get('/api/fratelli', async (req, res) => {
    try {
        console.log('🔍 API: Caricamento lista fratelli');

        const query = `
            SELECT
                id,
                nome,
                grado,
                cariche_fisse as carica,
                tipo,
                role,
                attivo,
                telefono
            FROM fratelli
            WHERE attivo = 1
            ORDER BY
                CASE tipo WHEN 'fratello' THEN 1 WHEN 'ospite' THEN 2 END,
                CASE grado WHEN 'Maestro' THEN 1 WHEN 'Compagno' THEN 2 WHEN 'Apprendista' THEN 3 END,
                nome ASC
        `;

        const fratelli = await db.executeQuery(query);

        console.log(`✅ Caricati ${fratelli.length} fratelli`);

        res.json({
            success: true,
            data: fratelli,
            count: fratelli.length
        });

    } catch (error) {
        console.error('❌ Errore API fratelli:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento dei fratelli',
            error: error.message,
            data: []
        });
    }
});

// ✅ RIMOSSO: Endpoint /api/fratelli/login-list non più necessario
// Il login ora usa username/password invece di una lista dropdown

// GET /api/fratelli/:id - Dettagli singolo fratello
app.get('/api/fratelli/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fratello = await db.getFratelloById(id);

        if (!fratello) {
            return res.status(404).json({
                success: false,
                message: 'Fratello non trovato'
            });
        }

        res.json({
            success: true,
            data: fratello
        });

    } catch (error) {
        console.error('❌ Errore API fratello singolo:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero del fratello',
            error: error.message
        });
    }
});

// POST /api/fratelli - Crea nuovo fratello
app.post('/api/fratelli', async (req, res) => {
    try {
        const { nome, grado, cariche = null, cariche_fisse = null } = req.body;

        if (!nome || !grado) {
            return res.status(400).json({
                success: false,
                message: 'Nome e grado sono obbligatori'
            });
        }

        const result = await db.addFratello(nome, grado, cariche, cariche_fisse);

        res.status(201).json({
            success: true,
            message: 'Fratello creato con successo',
            data: {
                id: result.insertId,
                nome,
                grado,
                cariche,
                cariche_fisse
            }
        });

    } catch (error) {
        console.error('❌ Errore creazione fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del fratello',
            error: error.message
        });
    }
});

// API per aggiornare i gradi di un fratello
app.put('/api/fratelli/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            data_iniziazione,
            data_passaggio,
            data_elevazione,
            data_ex_venerabile,
            data_eccellentissimo,
            data_arco_reale,
            data_royal_ark
        } = req.body;

        const sql = `
            UPDATE fratelli
            SET data_iniziazione = ?,
                data_passaggio = ?,
                data_elevazione = ?,
                data_ex_venerabile = ?,
                data_eccellentissimo = ?,
                data_arco_reale = ?,
                data_royal_ark = ?
            WHERE id = ?
        `;

        await db.executeQuery(sql, [
            data_iniziazione || null,
            data_passaggio || null,
            data_elevazione || null,
            data_ex_venerabile || null,
            data_eccellentissimo || null,
            data_arco_reale || null,
            data_royal_ark || null,
            id
        ]);

        res.json({
            success: true,
            message: 'Gradi aggiornati con successo'
        });

    } catch (error) {
        console.error('Errore aggiornamento gradi:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento dei gradi',
            error: error.message
        });
    }
});

// DELETE /api/fratelli/:id - Elimina fratello
app.delete('/api/fratelli/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const fratello = await db.getFratelloById(id);
        if (!fratello) {
            return res.status(404).json({
                success: false,
                message: 'Fratello non trovato'
            });
        }

        await db.deleteFratello(id);

        res.json({
            success: true,
            message: 'Fratello eliminato con successo'
        });

    } catch (error) {
        console.error('❌ Errore eliminazione fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del fratello',
            error: error.message
        });
    }
});
// ========== API PRESENZE CON FILTRO DATA INIZIAZIONE ==========

// GET /api/presenze - Lista tutte le presenze
app.get('/api/presenze', async (req, res) => {
    try {
        const { fratello_id, tornata_id, anno } = req.query;

        console.log('🔍 API: Caricamento presenze - Filtri:', { fratello_id, tornata_id, anno });

        let query = `
            SELECT
                p.fratello_id,
                p.tornata_id,
                p.presente,
                p.ruolo,
                p.data_creazione,
                t.data as data_tornata,
                t.discussione,
                t.tipo,
                t.stato,
                f.nome as nome_fratello,
                f.grado,
                f.data_iniziazione
            FROM presenze p
                     LEFT JOIN tornate t ON p.tornata_id = t.id
                     LEFT JOIN fratelli f ON p.fratello_id = f.id
            WHERE 1=1
              AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
        `;

        const params = [];

        // Filtri opzionali
        if (fratello_id) {
            query += ' AND p.fratello_id = ?';
            params.push(fratello_id);
        }

        if (tornata_id) {
            query += ' AND p.tornata_id = ?';
            params.push(tornata_id);
        }

        if (anno) {
            query += ' AND YEAR(t.data) = ?';
            params.push(anno);
        }

        query += ' ORDER BY t.data DESC, f.nome ASC';

        const presenze = await db.executeQuery(query, params);

        console.log(`✅ Caricate ${presenze.length} presenze (dalla data iniziazione)`);

        res.json({
            success: true,
            data: presenze,
            count: presenze.length
        });

    } catch (error) {
        console.error('❌ Errore API presenze:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle presenze',
            error: error.message,
            data: []
        });
    }
});

// GET /api/presenze/fratello/:id - VERSIONE CORRETTA CON FILTRO DATA INIZIAZIONE
app.get('/api/presenze/fratello/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { anno } = req.query;

        console.log(`📋 [PRESENZE] Lista presenze per fratello ${id} - Anno: ${anno || 'TUTTI'}`);

        // Query con filtro data iniziazione
        let sql = `
            SELECT
                t.*,
                COALESCE(p.presente, 0) as presenza_confermata,
                p.ruolo as ruolo_presenza,
                p.created_at as data_conferma,
                f.data_iniziazione,
                f.nome as fratello_nome
            FROM tornate t
                     LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                     LEFT JOIN fratelli f ON f.id = ?
            WHERE t.tipo_loggia = 'nostra'
              AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
        `;

        const params = [id, id];

        if (anno && anno !== 'tutti') {
            sql += ' AND YEAR(t.data) = ?';
            params.push(anno);
        }

        sql += ' ORDER BY t.data DESC';

        const presenze = await db.executeQuery(sql, params);
        const fratello = await db.getFratelloById(id);

        // Log per debug
        if (presenze.length > 0) {
            console.log(`📅 Prima tornata considerata: ${presenze[presenze.length - 1].data}`);
            console.log(`📅 Data iniziazione fratello: ${presenze[0].data_iniziazione}`);
        }

        res.json({
            success: true,
            data: {
                fratello: fratello,
                presenze: presenze,
                totale: presenze.length,
                presenti: presenze.filter(p => p.presenza_confermata === 1).length,
                assenti: presenze.filter(p => p.presenza_confermata === 0).length,
                data_iniziazione: presenze[0]?.data_iniziazione
            }
        });

    } catch (error) {
        console.error('❌ Errore presenze fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel recupero delle presenze del fratello',
            error: error.message
        });
    }
});

// GET /api/presenze/fratello/:id/statistiche - VERSIONE CORRETTA CON FILTRO DATA INIZIAZIONE
app.get('/api/presenze/fratello/:id/statistiche', async (req, res) => {
    try {
        const { id } = req.params;
        const { anno } = req.query;

        console.log(`📊 [PRESENZE] Statistiche per fratello ${id} - Anno: ${anno || 'TUTTI'}`);

        // ✅ GESTISCI CASO "TUTTI" VS ANNO SPECIFICO
        const isTutti = !anno || anno === 'tutti' || anno === 'Tutti';

        if (isTutti) {
            // 🌍 CALCOLO PER TUTTI GLI ANNI (CON FILTRO DATA INIZIAZIONE)
            console.log('🔄 Calcolo per TUTTI gli anni dalla data iniziazione...');

            // Query per statistiche generali (tutti gli anni, dalla data iniziazione)
            const queryStatsAll = `
                SELECT
                    COUNT(DISTINCT t.id) as totaliTornate,
                    COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) as presenzeCount,
                    COUNT(DISTINCT CASE WHEN p.presente = 0 THEN t.id END) as assenzeCount,
                    ROUND(
                            (COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) * 100.0) /
                            NULLIF(COUNT(DISTINCT t.id), 0), 1
                    ) as percentuale,
                    f.data_iniziazione,
                    f.nome as fratello_nome
                FROM tornate t
                         LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                         LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra'
                  AND t.data <= CURDATE()
                  AND t.stato = 'completata'
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
            `;
            const statsAll = await db.executeQuery(queryStatsAll, [id, id]);

            // Query per presenze consecutive (dalla data iniziazione)
            const queryConsecutiveAll = `
                SELECT
                    t.id, t.data, YEAR(t.data) as anno, COALESCE(p.presente, 0) as presente
                FROM tornate t
                    LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                    LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra'
                  AND t.data <= CURDATE()
                  AND t.stato = 'completata'
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                ORDER BY t.data DESC
                    LIMIT 1000
            `;

            const presenzeDettaglio = await db.executeQuery(queryConsecutiveAll, [id, id]);

            // Calcola presenze consecutive partendo dalle più recenti
            let presenzeConsecutive = 0;
            for (const tornata of presenzeDettaglio) {
                if (tornata.presente === 1) {
                    presenzeConsecutive++;
                } else {
                    break; // Interrompi al primo 0 (assenza)
                }
            }

            const result = {
                totaliTornate: statsAll[0]?.totaliTornate || 0,
                presenzeCount: statsAll[0]?.presenzeCount || 0,
                assenzeCount: statsAll[0]?.assenzeCount || 0,
                percentuale: Math.round(statsAll[0]?.percentuale || 0),
                presenzeConsecutive: presenzeConsecutive,
                anno: 'Tutti',
                data_iniziazione: statsAll[0]?.data_iniziazione,
                fratello_nome: statsAll[0]?.fratello_nome
            };

            console.log(`✅ [PRESENZE] Statistiche TUTTI gli anni per fratello ${id}:`, result);
            console.log(`📅 Data iniziazione: ${result.data_iniziazione}`);

            res.json({
                success: true,
                data: result,
                fratello_id: id
            });

        } else {
            // 📅 CALCOLO PER ANNO SPECIFICO (CON FILTRO DATA INIZIAZIONE)
            console.log(`🔄 Calcolo per anno specifico: ${anno} dalla data iniziazione`);

            const queryStats = `
                SELECT
                    COUNT(DISTINCT t.id) as totaliTornate,
                    COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) as presenzeCount,
                    COUNT(DISTINCT CASE WHEN p.presente = 0 THEN t.id END) as assenzeCount,
                    ROUND(
                            (COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) * 100.0) /
                            NULLIF(COUNT(DISTINCT t.id), 0), 1
                    ) as percentuale,
                    f.data_iniziazione,
                    f.nome as fratello_nome
                FROM tornate t
                         LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                         LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra'
                    AND YEAR(t.data) = ?
                  AND t.data <= CURDATE()
                  AND t.stato = 'completata'
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
            `;

            const queryConsecutive = `
                SELECT
                    t.id, t.data, COALESCE(p.presente, 0) as presente
                FROM tornate t
                         LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = ?
                         LEFT JOIN fratelli f ON f.id = ?
                WHERE t.tipo_loggia = 'nostra'
                    AND YEAR(t.data) = ?
                  AND t.data <= CURDATE()
                  AND t.stato = 'completata'
                  AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                ORDER BY t.data DESC
            `;

            const [stats, presenzeDettaglio] = await Promise.all([
                db.executeQuery(queryStats, [id, id, anno]),
                db.executeQuery(queryConsecutive, [id, id, anno])
            ]);

            // Calcola presenze consecutive per l'anno
            let presenzeConsecutive = 0;
            for (const tornata of presenzeDettaglio) {
                if (tornata.presente === 1) {
                    presenzeConsecutive++;
                } else {
                    break;
                }
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
            console.log(`📅 Data iniziazione: ${result.data_iniziazione}`);

            res.json({
                success: true,
                data: result,
                fratello_id: id
            });
        }

    } catch (error) {
        console.error('❌ Errore calcolo statistiche presenze:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel calcolo delle statistiche presenze',
            error: error.message
        });
    }
});

// GET /api/presenze/riepilogo-fratelli - VERSIONE CORRETTA PER RIEPILOGO
app.get('/api/presenze/riepilogo-fratelli', async (req, res) => {
    try {
        const { anno } = req.query;

        console.log(`👥 [RIEPILOGO] Caricamento riepilogo fratelli - Anno: ${anno || 'TUTTI'}`);

        // Query per riepilogo con filtro data iniziazione
        let sql = `
            SELECT
                f.id,
                f.nome,
                f.grado,
                f.cariche_fisse as carica,
                f.data_iniziazione,
                COUNT(DISTINCT t.id) as tornate_disponibili,
                COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) as presenze,
                ROUND(
                        (COUNT(DISTINCT CASE WHEN p.presente = 1 THEN t.id END) * 100.0) /
                        NULLIF(COUNT(DISTINCT t.id), 0), 1
                ) as percentuale,
                MAX(CASE WHEN p.presente = 1 THEN t.data END) as ultima_presenza
            FROM fratelli f
                     LEFT JOIN tornate t ON t.tipo_loggia = 'nostra'
                AND t.stato = 'completata'
                AND t.data <= CURDATE()
                AND t.data >= COALESCE(f.data_iniziazione, '1900-01-01')
                     LEFT JOIN presenze p ON t.id = p.tornata_id AND p.fratello_id = f.id
            WHERE f.attivo = 1
        `;

        const params = [];

        if (anno && anno !== 'tutti') {
            sql += ' AND YEAR(t.data) = ?';
            params.push(anno);
        }

        sql += `
            GROUP BY f.id, f.nome, f.grado, f.cariche_fisse, f.data_iniziazione
            ORDER BY f.nome
        `;

        const riepilogo = await db.executeQuery(sql, params);

        console.log(`✅ [RIEPILOGO] Caricati ${riepilogo.length} fratelli`);

        res.json({
            success: true,
            data: riepilogo,
            anno: anno || 'tutti'
        });

    } catch (error) {
        console.error('❌ Errore caricamento riepilogo fratelli:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento del riepilogo fratelli',
            error: error.message
        });
    }
});

console.log('✅ API PRESENZE CON FILTRO DATA INIZIAZIONE caricate correttamente');
// ========================================
// 📊 API STATISTICHE DASHBOARD - CON FILTRO DATA INIZIAZIONE
// ========================================

// ❌ RIMOSSO: Questo blocco è duplicato e causa un errore. La rotta è già definita sopra.
/*
app.get('/api/fratelli/:id/statistiche', async (req, res) => {
    // ... codice duplicato ...
});
*/

console.log('✅ API DASHBOARD STATISTICHE con filtro data iniziazione caricata!');
// ========== MIDDLEWARE ADMIN ==========
function requireAdminAccess(req, res, next) {
    console.log('🔍 Controllo privilegi admin...');

    if (!req.session || !req.session.user) {
        console.log('❌ Nessuna sessione attiva');
        return res.status(401).json({
            success: false,
            message: 'Accesso negato - Login richiesto'
        });
    }

    const user = req.session.user;
    const hasAdminAccess = user.ruolo === 'admin' || user.admin_access === true;

    if (!hasAdminAccess) {
        console.log('❌ Utente senza privilegi admin:', user.username);
        return res.status(403).json({
            success: false,
            message: 'Accesso negato - Privilegi admin richiesti'
        });
    }

    console.log('✅ Accesso admin autorizzato per:', user.username);
    next();
}

// ========== API ADMIN/FRATELLI ==========

// POST /api/admin/fratelli - Crea fratello (SOLO ADMIN)
app.post('/api/admin/fratelli', requireAdminAccess, async (req, res) => {
    try {
        console.log('👥 ADMIN: Creazione nuovo fratello');
        console.log('📥 Dati ricevuti:', req.body);

        const { nome, grado, cariche = null, cariche_fisse = null } = req.body;

        if (!nome || !grado) {
            return res.status(400).json({
                success: false,
                message: 'Nome e grado sono obbligatori'
            });
        }

        // Inizio transazione esplicita
        await db.executeQuery('START TRANSACTION');

        try {
            const result = await db.addFratello(nome, grado, cariche, cariche_fisse);

            // Commit esplicito
            await db.executeQuery('COMMIT');
            console.log('✅ Fratello creato con ID:', result.insertId);

            // Verifica che sia stato salvato
            const verifica = await db.getFratelloById(result.insertId);

            if (!verifica) {
                throw new Error('Fratello non trovato dopo il salvataggio');
            }

            res.status(201).json({
                success: true,
                message: 'Fratello creato con successo',
                data: {
                    id: result.insertId,
                    nome,
                    grado,
                    cariche,
                    cariche_fisse
                }
            });

        } catch (dbError) {
            await db.executeQuery('ROLLBACK');
            throw dbError;
        }

    } catch (error) {
        console.error('❌ Errore creazione fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione del fratello: ' + error.message,
            error: error.message
        });
    }
});

// PUT /api/admin/fratelli/:id - Aggiorna fratello (SOLO ADMIN)
app.put('/api/admin/fratelli/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('👥 ADMIN: Aggiornamento fratello ID:', req.params.id);

        const { id } = req.params;
        const { nome, grado, cariche = null, cariche_fisse = null } = req.body;

        const fratelloEsistente = await db.getFratelloById(id);
        if (!fratelloEsistente) {
            return res.status(404).json({
                success: false,
                message: 'Fratello non trovato'
            });
        }

        await db.updateFratello(id, nome, grado, cariche, cariche_fisse);

        console.log('✅ Fratello aggiornato con successo');

        res.json({
            success: true,
            message: 'Fratello aggiornato con successo'
        });

    } catch (error) {
        console.error('❌ Errore aggiornamento fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento del fratello: ' + error.message,
            error: error.message
        });
    }
});

// DELETE /api/admin/fratelli/:id - Elimina fratello (SOLO ADMIN)
app.delete('/api/admin/fratelli/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('👥 ADMIN: Eliminazione fratello ID:', req.params.id);

        const { id } = req.params;

        const fratello = await db.getFratelloById(id);
        if (!fratello) {
            return res.status(404).json({
                success: false,
                message: 'Fratello non trovato'
            });
        }

        await db.deleteFratello(id);

        console.log('✅ Fratello eliminato con successo');

        res.json({
            success: true,
            message: 'Fratello eliminato con successo'
        });

    } catch (error) {
        console.error('❌ Errore eliminazione fratello:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione del fratello: ' + error.message,
            error: error.message
        });
    }
});

// ========== API ADMIN/TORNATE ==========

// POST /api/admin/tornate - Crea tornata (SOLO ADMIN)
app.post('/api/admin/tornate', requireAdminAccess, async (req, res) => {
    try {
        console.log('📅 ADMIN: Creazione nuova tornata');
        console.log('📥 Dati ricevuti:', req.body);

        // Validazione dati
        const { data, discussione, location } = req.body;

        if (!data) {
            return res.status(400).json({
                success: false,
                message: 'Data obbligatoria'
            });
        }

        // Prepara dati con nomi corretti
        const tornataData = {
            data: data,
            orario_inizio: req.body.orario_inizio || null,
            discussione: discussione || 'Nuova Tornata',
            chi_introduce: req.body.chi_introduce || null,
            location: location || 'Tolfa',
            cena: req.body.cena === true || req.body.cena === 'true',
            costo_cena: req.body.costo_cena || null,
            descrizione_cena: req.body.descrizione_cena || null,
            argomento_istruzione: req.body.argomento_istruzione || null,
            orario_istruzione: req.body.orario_istruzione || null,
            link_audio: req.body.link_audio || null,
            link_pagina: req.body.link_pagina || null,
            tipo_loggia: req.body.tipo_loggia || 'nostra',
            tipo: req.body.tipo || 'ordinaria',
            stato: req.body.stato || 'programmata',
            note: req.body.note || null
        };

        console.log('📋 Dati preparati per database:', tornataData);

        // Inizio transazione esplicita
        await db.executeQuery('START TRANSACTION');

        try {
            const result = await db.addTornata(tornataData);
            console.log('📊 Risultato INSERT:', result);

            // Commit esplicito
            await db.executeQuery('COMMIT');
            console.log('✅ COMMIT completato');

            // Verifica immediata
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

        } catch (dbError) {
            console.log('💥 ERRORE - ROLLBACK...');
            await db.executeQuery('ROLLBACK');
            throw dbError;
        }

    } catch (error) {
        console.error('💥 ERRORE CRITICO ADMIN TORNATE:', error);

        res.status(500).json({
            success: false,
            message: 'Errore nella creazione: ' + error.message,
            error: error.code || error.message
        });
    }
});

// PUT /api/admin/tornate/:id - Aggiorna tornata (SOLO ADMIN)
app.put('/api/admin/tornate/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('📅 ADMIN: Aggiornamento tornata ID:', req.params.id);
        console.log('📥 Dati ricevuti:', req.body);

        const { id } = req.params;

        // Verifica che la tornata esista
        const tornataEsistente = await db.executeQuery('SELECT * FROM tornate WHERE id = ?', [id]);
        if (tornataEsistente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }

        // Prepara dati per l'aggiornamento
        const tornataData = {
            data: req.body.data,
            orario_inizio: req.body.orario_inizio || null,
            discussione: req.body.discussione || 'Tornata',
            chi_introduce: req.body.chi_introduce || null,
            location: req.body.location || 'Tolfa',
            cena: req.body.cena === true || req.body.cena === 'true',
            costo_cena: req.body.costo_cena || null,
            descrizione_cena: req.body.descrizione_cena || null,
            argomento_istruzione: req.body.argomento_istruzione || null,
            orario_istruzione: req.body.orario_istruzione || null,
            link_audio: req.body.link_audio || null,
            link_pagina: req.body.link_pagina || null,
            tipo_loggia: req.body.tipo_loggia || 'nostra',
            tipo: req.body.tipo || 'ordinaria',
            stato: req.body.stato || 'programmata',
            note: req.body.note || null
        };

        console.log('📋 Dati preparati per aggiornamento:', tornataData);

        // Inizio transazione esplicita
        await db.executeQuery('START TRANSACTION');

        try {
            const result = await db.updateTornata(id, tornataData);
            console.log('📊 Risultato UPDATE:', result);

            // Commit esplicito
            await db.executeQuery('COMMIT');
            console.log('✅ COMMIT completato');

            // Verifica immediata
            const verifica = await db.executeQuery('SELECT * FROM tornate WHERE id = ?', [id]);
            console.log('🔍 VERIFICA POST-COMMIT:', verifica.length > 0 ? 'TROVATA' : 'NON TROVATA');

            if (verifica.length > 0) {
                console.log('🎉 AGGIORNAMENTO COMPLETATO! ID:', id);

                res.json({
                    success: true,
                    message: 'Tornata aggiornata con successo',
                    data: verifica[0]
                });
            } else {
                throw new Error('Tornata non trovata dopo l\'aggiornamento');
            }

        } catch (dbError) {
            console.log('💥 ERRORE - ROLLBACK...');
            await db.executeQuery('ROLLBACK');
            throw dbError;
        }

    } catch (error) {
        console.error('💥 ERRORE CRITICO ADMIN TORNATE UPDATE:', error);

        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento: ' + error.message,
            error: error.code || error.message
        });
    }
});

// DELETE /api/admin/tornate/:id - Elimina tornata (SOLO ADMIN)
app.delete('/api/admin/tornate/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('📅 ADMIN: Eliminazione tornata ID:', req.params.id);

        const { id } = req.params;

        // Verifica che la tornata esista
        const tornata = await db.executeQuery('SELECT * FROM tornate WHERE id = ?', [id]);
        if (tornata.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tornata non trovata'
            });
        }

        // Elimina prima le presenze collegate
        await db.executeQuery('DELETE FROM presenze WHERE tornata_id = ?', [id]);
        console.log('✅ Presenze collegate eliminate');

        // Elimina la tornata
        const result = await db.executeQuery('DELETE FROM tornate WHERE id = ?', [id]);
        console.log('✅ Tornata eliminata:', result);

        if (result.affectedRows === 0) {
            throw new Error('Nessuna riga eliminata');
        }

        res.json({
            success: true,
            message: 'Tornata eliminata con successo'
        });

    } catch (error) {
        console.error('❌ Errore eliminazione tornata:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della tornata: ' + error.message,
            error: error.message
        });
    }
});

console.log('✅ API ADMIN TORNATE (PUT/DELETE) caricate correttamente');

// ========== API ADMIN/TAVOLE ==========

// GET /api/admin/tavole - Lista tavole (SOLO ADMIN)
app.get('/api/admin/tavole', requireAdminAccess, async (req, res) => {
    try {
        console.log('📖 ADMIN: Caricamento tavole');

        const filtri = {
            anno: req.query.anno || null,
            stato: req.query.stato || null,
            chi_introduce: req.query.chi_introduce || null
        };

        const tavole = await db.getTavole(filtri);

        console.log(`✅ Caricate ${tavole.length} tavole`);

        res.json({
            success: true,
            data: tavole
        });

    } catch (error) {
        console.error('❌ Errore caricamento tavole:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento delle tavole: ' + error.message,
            error: error.message
        });
    }
});

// POST /api/admin/tavole - Crea tavola (SOLO ADMIN)
app.post('/api/admin/tavole', requireAdminAccess, async (req, res) => {
    try {
        console.log('📖 ADMIN: Creazione nuova tavola');
        console.log('📥 Dati ricevuti:', req.body);

        const { data_trattazione, titolo_discussione } = req.body;

        if (!data_trattazione || !titolo_discussione) {
            return res.status(400).json({
                success: false,
                message: 'Data e titolo discussione sono obbligatori'
            });
        }

        const result = await db.addTavola(req.body);

        console.log('✅ Tavola creata con ID:', result.insertId);

        res.status(201).json({
            success: true,
            message: 'Tavola creata con successo',
            data: {
                id: result.insertId,
                ...req.body
            }
        });

    } catch (error) {
        console.error('❌ Errore creazione tavola:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nella creazione della tavola: ' + error.message,
            error: error.message
        });
    }
});

// PUT /api/admin/tavole/:id - Aggiorna tavola (SOLO ADMIN)
app.put('/api/admin/tavole/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('📖 ADMIN: Aggiornamento tavola ID:', req.params.id);

        const { id } = req.params;

        // Verifica che la tavola esista
        const tavolaEsistente = await db.getTavolaById(id);
        if (!tavolaEsistente) {
            return res.status(404).json({
                success: false,
                message: 'Tavola non trovata'
            });
        }

        await db.updateTavola(id, req.body);

        console.log('✅ Tavola aggiornata con successo');

        res.json({
            success: true,
            message: 'Tavola aggiornata con successo'
        });

    } catch (error) {
        console.error('❌ Errore aggiornamento tavola:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'aggiornamento della tavola: ' + error.message,
            error: error.message
        });
    }
});

// DELETE /api/admin/tavole/:id - Elimina tavola (SOLO ADMIN)
app.delete('/api/admin/tavole/:id', requireAdminAccess, async (req, res) => {
    try {
        console.log('📖 ADMIN: Eliminazione tavola ID:', req.params.id);

        const { id } = req.params;

        const tavola = await db.getTavolaById(id);
        if (!tavola) {
            return res.status(404).json({
                success: false,
                message: 'Tavola non trovata'
            });
        }

        await db.deleteTavola(id);

        console.log('✅ Tavola eliminata con successo');

        res.json({
            success: true,
            message: 'Tavola eliminata con successo'
        });

    } catch (error) {
        console.error('❌ Errore eliminazione tavola:', error);
        res.status(500).json({
            success: false,
            message: 'Errore nell\'eliminazione della tavola: ' + error.message,
            error: error.message
        });
    }
});

console.log('✅ API ADMIN TAVOLE caricate correttamente');

// ===================================
// FINANZE API ROUTES
// ===================================

// GET /api/finanze/categorie/entrate
app.get('/api/finanze/categorie/entrate', async (req, res) => {
    try {
        const [rows] = await poolFinanze.execute(
            'SELECT id, nome, descrizione FROM categorie_entrate WHERE attiva = 1 ORDER BY nome'
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Errore categorie entrate:', error);
        res.status(500).json({ error: 'Errore server nel caricamento categorie entrate' });
    }
});

// GET /api/finanze/categorie/uscite
app.get('/api/finanze/categorie/uscite', async (req, res) => {
    try {
        const [rows] = await poolFinanze.execute(
            'SELECT id, nome, descrizione FROM categorie_uscite WHERE attiva = 1 ORDER BY nome'
        );
        res.json(rows);
    } catch (error) {
        console.error('❌ Errore categorie uscite:', error);
        res.status(500).json({ error: 'Errore server nel caricamento categorie uscite' });
    }
});

// POST /api/finanze/categorie/entrate - Solo Tesoriere
app.post('/api/finanze/categorie/entrate', requireTesoriere, async (req, res) => {
    try {
        const { nome, descrizione } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Il nome della categoria è obbligatorio' });
        }

        const [result] = await poolFinanze.execute(
            'INSERT INTO categorie_entrate (nome, descrizione) VALUES (?, ?)',
            [nome.trim(), descrizione || '']
        );

        res.status(201).json({ message: 'Categoria entrata creata', id: result.insertId });
    } catch (error) {
        console.error('❌ Errore creazione categoria entrata:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Categoria già esistente' });
        } else {
            res.status(500).json({ error: 'Errore server nella creazione categoria' });
        }
    }
});

// POST /api/finanze/categorie/uscite - Solo Tesoriere
app.post('/api/finanze/categorie/uscite', requireTesoriere, async (req, res) => {
    try {
        const { nome, descrizione } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Il nome della categoria è obbligatorio' });
        }

        const [result] = await poolFinanze.execute(
            'INSERT INTO categorie_uscite (nome, descrizione) VALUES (?, ?)',
            [nome.trim(), descrizione || '']
        );

        res.status(201).json({ message: 'Categoria uscita creata', id: result.insertId });
    } catch (error) {
        console.error('❌ Errore creazione categoria uscita:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Categoria già esistente' });
        } else {
            res.status(500).json({ error: 'Errore server nella creazione categoria' });
        }
    }
});

// PUT /api/finanze/categorie/entrate/:id - Solo Tesoriere
app.put('/api/finanze/categorie/entrate/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descrizione } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Il nome della categoria è obbligatorio' });
        }

        const [result] = await poolFinanze.execute(
            'UPDATE categorie_entrate SET nome = ?, descrizione = ? WHERE id = ?',
            [nome.trim(), descrizione || '', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria non trovata' });
        }

        res.json({ message: 'Categoria entrata aggiornata' });
    } catch (error) {
        console.error('❌ Errore modifica categoria entrata:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Nome categoria già esistente' });
        } else {
            res.status(500).json({ error: 'Errore server nella modifica categoria' });
        }
    }
});

// PUT /api/finanze/categorie/uscite/:id - Solo Tesoriere
app.put('/api/finanze/categorie/uscite/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descrizione } = req.body;

        if (!nome || nome.trim() === '') {
            return res.status(400).json({ error: 'Il nome della categoria è obbligatorio' });
        }

        const [result] = await poolFinanze.execute(
            'UPDATE categorie_uscite SET nome = ?, descrizione = ? WHERE id = ?',
            [nome.trim(), descrizione || '', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria non trovata' });
        }

        res.json({ message: 'Categoria uscita aggiornata' });
    } catch (error) {
        console.error('❌ Errore modifica categoria uscita:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Nome categoria già esistente' });
        } else {
            res.status(500).json({ error: 'Errore server nella modifica categoria' });
        }
    }
});

// DELETE /api/finanze/categorie/entrate/:id - Solo Tesoriere
app.delete('/api/finanze/categorie/entrate/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;

        const [transactions] = await poolFinanze.execute(
            'SELECT COUNT(*) as count FROM transazioni WHERE categoria_entrata_id = ?',
            [id]
        );

        if (transactions[0].count > 0) {
            return res.status(400).json({
                error: 'Impossibile eliminare: ci sono transazioni associate a questa categoria'
            });
        }

        const [result] = await poolFinanze.execute(
            'UPDATE categorie_entrate SET attiva = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria non trovata' });
        }

        res.json({ message: 'Categoria entrata eliminata' });
    } catch (error) {
        console.error('❌ Errore eliminazione categoria entrata:', error);
        res.status(500).json({ error: 'Errore server nell\'eliminazione categoria' });
    }
});

// DELETE /api/finanze/categorie/uscite/:id - Solo Tesoriere
app.delete('/api/finanze/categorie/uscite/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;

        const [transactions] = await poolFinanze.execute(
            'SELECT COUNT(*) as count FROM transazioni WHERE categoria_uscita_id = ?',
            [id]
        );

        if (transactions[0].count > 0) {
            return res.status(400).json({
                error: 'Impossibile eliminare: ci sono transazioni associate a questa categoria'
            });
        }

        const [result] = await poolFinanze.execute(
            'UPDATE categorie_uscite SET attiva = 0 WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Categoria non trovata' });
        }

        res.json({ message: 'Categoria uscita eliminata' });
    } catch (error) {
        console.error('❌ Errore eliminazione categoria uscita:', error);
        res.status(500).json({ error: 'Errore server nell\'eliminazione categoria' });
    }
});

// GET /api/finanze/transazioni
app.get('/api/finanze/transazioni', async (req, res) => {
    try {
        const { anno, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT
                t.id,
                DATE(t.data_transazione) as data_transazione,
                t.tipo,
                t.importo,
                t.descrizione,
                ce.nome as categoria_entrata,
                cu.nome as categoria_uscita,
                t.categoria_entrata_id,
                t.categoria_uscita_id
            FROM transazioni t
            LEFT JOIN categorie_entrate ce ON t.categoria_entrata_id = ce.id
            LEFT JOIN categorie_uscite cu ON t.categoria_uscita_id = cu.id
        `;

        const params = [];
        if (anno) {
            query += ' WHERE YEAR(t.data_transazione) = ?';
            params.push(anno);
        }

        query += ' ORDER BY t.data_transazione DESC, t.id DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await poolFinanze.execute(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM transazioni t';
        const countParams = [];
        if (anno) {
            countQuery += ' WHERE YEAR(t.data_transazione) = ?';
            countParams.push(anno);
        }

        const [countResult] = await poolFinanze.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            transactions: rows,
            total: total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + rows.length) < total
        });
    } catch (error) {
        console.error('❌ Errore get transazioni:', error);
        res.status(500).json({ error: 'Errore server nel caricamento transazioni' });
    }
});

// GET /api/finanze/transazioni/:id
app.get('/api/finanze/transazioni/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await poolFinanze.execute(`
            SELECT
                t.id,
                DATE(t.data_transazione) as data_transazione,
                t.tipo,
                t.importo,
                t.descrizione,
                ce.nome as categoria_entrata,
                cu.nome as categoria_uscita,
                t.categoria_entrata_id,
                t.categoria_uscita_id
            FROM transazioni t
            LEFT JOIN categorie_entrate ce ON t.categoria_entrata_id = ce.id
            LEFT JOIN categorie_uscite cu ON t.categoria_uscita_id = cu.id
            WHERE t.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Transazione non trovata' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('❌ Errore get transazione singola:', error);
        res.status(500).json({ error: 'Errore server nel caricamento transazione' });
    }
});

// POST /api/finanze/transazioni - Solo Tesoriere
app.post('/api/finanze/transazioni', requireTesoriere, async (req, res) => {
    try {
        const { data_transazione, tipo, importo, descrizione, categoria_id } = req.body;

        if (!data_transazione || !tipo || !importo || !descrizione || !categoria_id) {
            return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
        }

        if (!['entrata', 'uscita'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo transazione non valido' });
        }

        const importoNum = parseFloat(importo);
        if (isNaN(importoNum) || importoNum <= 0) {
            return res.status(400).json({ error: 'Importo deve essere un numero maggiore di 0' });
        }

        const categoria_entrata_id = tipo === 'entrata' ? categoria_id : null;
        const categoria_uscita_id = tipo === 'uscita' ? categoria_id : null;

        const [result] = await poolFinanze.execute(
            `INSERT INTO transazioni
             (data_transazione, tipo, importo, descrizione, categoria_entrata_id, categoria_uscita_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [data_transazione, tipo, importoNum, descrizione, categoria_entrata_id, categoria_uscita_id]
        );

        res.status(201).json({ message: 'Transazione creata con successo', id: result.insertId });
    } catch (error) {
        console.error('❌ Errore creazione transazione:', error);
        res.status(500).json({ error: 'Errore server nella creazione transazione' });
    }
});

// PUT /api/finanze/transazioni/:id - Solo Tesoriere
app.put('/api/finanze/transazioni/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_transazione, tipo, importo, descrizione, categoria_id } = req.body;

        if (!data_transazione || !tipo || !importo || !descrizione || !categoria_id) {
            return res.status(400).json({ error: 'Tutti i campi sono obbligatori' });
        }

        if (!['entrata', 'uscita'].includes(tipo)) {
            return res.status(400).json({ error: 'Tipo transazione non valido' });
        }

        const importoNum = parseFloat(importo);
        if (isNaN(importoNum) || importoNum <= 0) {
            return res.status(400).json({ error: 'Importo deve essere un numero maggiore di 0' });
        }

        const categoria_entrata_id = tipo === 'entrata' ? categoria_id : null;
        const categoria_uscita_id = tipo === 'uscita' ? categoria_id : null;

        const [result] = await poolFinanze.execute(
            `UPDATE transazioni
             SET data_transazione = ?, tipo = ?, importo = ?, descrizione = ?,
                 categoria_entrata_id = ?, categoria_uscita_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [data_transazione, tipo, importoNum, descrizione, categoria_entrata_id, categoria_uscita_id, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transazione non trovata' });
        }

        res.json({ message: 'Transazione aggiornata con successo' });
    } catch (error) {
        console.error('❌ Errore modifica transazione:', error);
        res.status(500).json({ error: 'Errore server nella modifica transazione' });
    }
});

// DELETE /api/finanze/transazioni/:id - Solo Tesoriere
app.delete('/api/finanze/transazioni/:id', requireTesoriere, async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await poolFinanze.execute('DELETE FROM transazioni WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Transazione non trovata' });
        }

        res.json({ message: 'Transazione eliminata con successo' });
    } catch (error) {
        console.error('❌ Errore eliminazione transazione:', error);
        res.status(500).json({ error: 'Errore server nell\'eliminazione transazione' });
    }
});

// GET /api/finanze/riepilogo
app.get('/api/finanze/riepilogo', async (req, res) => {
    try {
        const [totaliCumulativi] = await poolFinanze.execute(`
            SELECT
                SUM(CASE WHEN tipo = 'entrata' THEN importo ELSE 0 END) as totale_entrate,
                SUM(CASE WHEN tipo = 'uscita' THEN importo ELSE 0 END) as totale_uscite
            FROM transazioni
        `);

        const totaleEntrate = parseFloat(totaliCumulativi[0].totale_entrate || 0);
        const totaleUscite = parseFloat(totaliCumulativi[0].totale_uscite || 0);
        const saldoAttuale = totaleEntrate - totaleUscite;

        const riepilogo = {
            totale_entrate: totaleEntrate,
            totale_uscite: totaleUscite,
            saldo_finale: saldoAttuale
        };

        res.json(riepilogo);
    } catch (error) {
        console.error('❌ Errore calcolo riepilogo:', error);
        res.status(500).json({ error: 'Errore server nel calcolo riepilogo' });
    }
});

console.log('✅ API FINANZE caricate correttamente');

// ========== ROTTE AREA FRATELLI (HTML) ==========
app.get('/fratelli/login', (req, res) => {
    // ✅ UNIFIED LOGIN: Usa index.html con doppio select (Fratelli/Ospiti)
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/fratelli/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/dashboard.html'));
});

app.get('/fratelli/tornate', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/tornate.html'));
});

app.get('/fratelli/lavori', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/lavori.html'));
});

app.get('/fratelli/tavole', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/tavole.html'));
});

app.get('/fratelli/presenze', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/presenze.html'));
});

app.get('/fratelli/profilo', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/profilo.html'));
});

app.get('/fratelli/riepilogo-fratelli', (req, res) => {
    // Controllo sessione semplice (stesso pattern delle altre pagine fratelli)
    if (!req.session || !req.session.user) {
        return res.redirect('/fratelli/login');
    }

    // ✅ CORRETTO: Percorso giusto
    res.sendFile(path.join(__dirname, 'views/fratelli/riepilogo-fratelli.html'));
});

app.get('/fratelli/biblioteca', (req, res) => {
    // Verifica sessione
    if (!req.session || !req.session.user) {
        return res.redirect('/fratelli/login');
    }
    res.sendFile(path.join(__dirname, 'views/fratelli/biblioteca.html'));
});

app.get('/fratelli/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/fratelli/chat.html'));
});

// GET /fratelli/finanze - Finanze page (richiede autenticazione)
app.get('/fratelli/finanze', (req, res) => {
    // Verifica sessione
    if (!req.session || !req.session.user) {
        return res.redirect('/fratelli/login');
    }
    res.sendFile(path.join(__dirname, 'views', 'fratelli', 'finanze.html'));
});

// ========== API STATUS E TEST ==========
app.get('/api/status', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({
        status: 'online',
        app: 'Presenze Kilwinning',
        version: '1.0.0',
        database: dbStatus ? 'connesso' : 'disconnesso',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        message: 'Server funzionante!',
        environment: process.env.NODE_ENV || 'development',
        database_configured: !!(process.env.DB_HOST && process.env.DB_NAME),
        routes_loaded: {
            admin: '✅ (NO LOGIN SEPARATO)',
            fratelli: '✅ (CON PRIVILEGI ADMIN)',
            presenze: '✅',
            tornate: '✅',
            tavole: '✅ (NUOVO!)' // ✅ AGGIUNTO
        }
    });
});

// ========== HOMEPAGE MULTI-DOMINIO ==========
// SOSTITUISCI la rotta app.get('/', ...) esistente con questa:

app.get('/', (req, res) => {
    if (req.appType === 'biblioteca') {
        // Redirect a /fratelli/biblioteca (richiede login)
        res.redirect('/fratelli/login');
    } else if (req.appType === 'finanze') {
        // Redirect a /fratelli/finanze (richiede login)
        res.redirect('/fratelli/login');
    } else {
        // Homepage Tornate (redirect al login)
        res.redirect('/fratelli/login');
    }
});

// Homepage principale con link ai servizi (se servisse in futuro)
app.get('/home', (req, res) => {
    res.send(`
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <title>R∴L∴ Kilwinning - Sistema Gestione Tornate</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 25px 50px rgba(0,0,0,0.15);
                        width: 100%;
                        max-width: 500px;
                        text-align: center;
                    }
                    .logo { font-size: 3rem; margin-bottom: 15px; }
                    .title { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 8px; }
                    .subtitle { color: #666; margin-bottom: 35px; font-size: 16px; }
                    .access-title { font-size: 20px; font-weight: 600; color: #333; margin-bottom: 25px; }
                    .access-options { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 30px; }
                    .access-card {
                        padding: 25px 20px;
                        border: 2px solid #e9ecef;
                        border-radius: 15px;
                        text-decoration: none;
                        color: #333;
                        transition: all 0.3s;
                        background: #f8f9fa;
                    }
                    .access-card:hover {
                        border-color: #667eea;
                        background: #f0f4ff;
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
                    }
                    .access-icon { font-size: 2.5rem; margin-bottom: 15px; display: block; }
                    .access-label { font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #333; }
                    .access-description { font-size: 14px; color: #666; }
                    .admin-note { font-size: 12px; color: #888; font-style: italic; margin-top: 10px; }
                    .footer { padding-top: 25px; border-top: 1px solid #e9ecef; color: #999; font-size: 14px; }
                    .biblioteca-link {
                        display: inline-block;
                        background: #8B4513;
                        color: white;
                        text-decoration: none;
                        padding: 10px 20px;
                        border-radius: 8px;
                        margin-top: 15px;
                        font-size: 14px;
                    }
                    .biblioteca-link:hover { background: #A0522D; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">🏛️</div>
                    <h1 class="title">R∴L∴ Kilwinning</h1>
                    <p class="subtitle">Sistema Gestione Tornate & Tavole</p>
                    
                    <h2 class="access-title">Accesso Fratelli</h2>
                    
                    <div class="access-options">
                        <a href="/fratelli/login" class="access-card">
                            <span class="access-icon">👥</span>
                            <div class="access-label">Area Fratelli</div>
                            <div class="access-description">Accesso unificato per tutti i fratelli</div>
                            <div class="admin-note">
                                ✨ Paolo e Emiliano avranno accesso automatico all'area amministrativa
                            </div>
                        </a>
                    </div>
                    
                    <a href="https://biblioteca.loggiakilwinning.com" class="biblioteca-link">
                        📚 Visita la Biblioteca (in costruzione)
                    </a>
                    
                    <div class="footer">
                        © 2025 R∴L∴ Kilwinning<br>
                        Sistema di gestione presenze, tornate e tavole<br>
                        <strong>✅ Multi-dominio + 📖 Biblioteca</strong>
                    </div>
                </div>
            </body>
            </html>
        `);
});

// ========== PWA ROUTES ==========
// Serve manifest.json con header corretti
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache 1 ora
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// Serve service-worker.js con header corretti
app.get('/service-worker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate'); // No cache per SW
    res.setHeader('Service-Worker-Allowed', '/'); // Scope globale
    res.sendFile(path.join(__dirname, 'public', 'service-worker.js'));
});

// Serve icone PWA
app.get('/icons/:filename', (req, res) => {
    const filename = req.params.filename;
    const iconPath = path.join(__dirname, 'public', 'icons', filename);

    // Verifica se il file esiste
    if (require('fs').existsSync(iconPath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24 ore
        res.sendFile(iconPath);
    } else {
        // Se l'icona non esiste, serve l'SVG master
        if (filename.startsWith('icon-') && filename.endsWith('.png')) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.sendFile(path.join(__dirname, 'public', 'icons', 'icon-master.svg'));
        } else {
            res.status(404).send('Icona non trovata');
        }
    }
});

// ========== MIDDLEWARE DI ERROR HANDLING ==========
app.use((err, req, res, next) => {
    console.error('💥 Errore middleware:', err);
    res.status(500).json({
        success: false,
        message: 'Errore interno del server',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Errore generico'
    });
});

// ========== 404 HANDLER ==========
app.use((req, res) => { // ✅ CORRETTO: Usare app.use per catturare tutte le rotte non gestite
    console.log(`❌ 404 - Rotta non trovata: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        message: '404 - Endpoint non trovato',
        path: req.path,
        method: req.method
    });
});

// ========== AVVIO SERVER ==========
(async () => {
    try {
        console.log('🚀 Avvio server Kilwinning...');

        // Test connessione database
        const dbOk = await testConnection();
        if (!dbOk) {
            throw new Error('❌ Connessione al database fallita - Verificare le credenziali');
        }
        console.log('✅ Database connesso correttamente');

        const PORT = process.env.PORT || 3000;

        app.listen(PORT, () => {
            console.log(`
🏛️ =====================================
   SERVER KILWINNING MULTI-DOMINIO!
   =====================================
   🌐 Tornate: http://localhost:${PORT}
   📚 Biblioteca: biblioteca.loggiakilwinning.com
   📍 Ambiente: ${process.env.NODE_ENV || 'development'}
   🗄️ Database: ${process.env.DB_NAME || 'non configurato'}
   ⏰ Avvio: ${new Date().toLocaleString('it-IT')}
   
   ✅ FUNZIONALITÀ ATTIVE:
   • 🏛️ Gestione Tornate e Tavole
   • 📚 Biblioteca (in preparazione)
   • 👥 Admin integrato area fratelli
   • 🌐 Multi-dominio configurato
   • 📱 PWA - Installabile su iOS/macOS
   =====================================
`);
        });

    } catch (err) {
        console.error(`
💥 =====================================
   ERRORE CRITICO DURANTE L'AVVIO!
   =====================================
   ${err.message}
   =====================================
        `);
        process.exit(1);
    }
})();