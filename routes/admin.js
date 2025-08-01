const express = require('express');
const path = require('path');
const router = express.Router();
const { db } = require('../config/database');

// ✅ MIDDLEWARE DI AUTENTICAZIONE MIGLIORATO
// Ora accetta SIA session admin CHE session fratelli con privilegi admin
function requireAuth(req, res, next) {
    console.log('🔍 Admin Auth Check - Session:', req.sessionID, 'User:', req.session?.user?.username);
    
    // Controlla se c'è una sessione valida
    if (!req.session || !req.session.user) {
        console.log('❌ Nessuna sessione trovata - Redirect a homepage');
        return res.redirect('/?error=login_required');
    }
    
    // ✅ ACCETTA ENTRAMBI I TIPI DI SESSIONE:
    // 1. Sessione admin classica (ruolo: 'admin')
    // 2. Sessione fratello con privilegi admin (admin_access: true)
    const user = req.session.user;
    const isAdminSession = user.ruolo === 'admin';
    const isFratelloAdmin = user.admin_access === true;
    
    if (!isAdminSession && !isFratelloAdmin) {
        console.log('❌ Utente senza privilegi admin:', user.username);
        return res.redirect('/?error=access_denied');
    }
    
    console.log('✅ Accesso admin autorizzato per:', user.username, 
                `(${isAdminSession ? 'Admin' : 'Fratello con privilegi'})`);
    next();
}

// ❌ RIMOSSA LA ROUTE LOGIN ADMIN SEPARATA
// Non serve più, l'accesso admin avviene tramite la dashboard fratelli

// ✅ REDIRECT DELLA ROOT ADMIN
router.get('/', (req, res) => {
    // Se c'è già una sessione valida, vai direttamente alla dashboard
    if (req.session && req.session.user) {
        const user = req.session.user;
        const hasAdminAccess = user.ruolo === 'admin' || user.admin_access === true;
        
        if (hasAdminAccess) {
            console.log('✅ Sessione admin valida, redirect a dashboard');
            return res.redirect('/admin/dashboard');
        }
    }
    
    // Altrimenti redirect alla homepage per il login
    console.log('❌ Nessuna sessione admin, redirect a homepage');
    res.redirect('/?error=admin_login_required');
});

// Dashboard principale (protetta)
router.get('/dashboard', requireAuth, (req, res) => {
    console.log('📊 Caricamento admin dashboard per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-dashboard.html'));
});

// ===== PAGINE ADMIN PROTETTE =====

// Gestione Tornate
router.get('/tornate', requireAuth, (req, res) => {
    console.log('📅 Caricamento admin tornate per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-tornate.html'));
});

// Registra Presenze
router.get('/presenze', requireAuth, (req, res) => {
    console.log('✍️ Caricamento admin presenze per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-presenze.html'));
});

// Gestione Fratelli
router.get('/fratelli', requireAuth, (req, res) => {
    console.log('👥 Caricamento admin fratelli per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-fratelli.html'));
});
// Gestione Gradi Fratelli  <-- AGGIUNGI QUESTA SEZIONE COMPLETA
router.get('/gradi-fratelli', requireAuth, (req, res) => {
    console.log('👑 Caricamento admin gradi fratelli per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-gradi-fratelli.html'));
});

// Gestione Ruoli
router.get('/ruoli', requireAuth, (req, res) => {
    console.log('🏛️ Caricamento admin ruoli per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-ruoli.html'));
});

// Gestione Tavole
router.get('/tavole', requireAuth, (req, res) => {
    console.log('📖 Caricamento admin tavole per:', req.session.user.username);
    res.sendFile(path.join(__dirname, '../views/admin-tavole.html'));
});

// ✅ NUOVA ROUTE: API per verificare privilegi admin
router.get('/api/check-access', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.json({ 
            hasAccess: false, 
            message: 'Nessuna sessione attiva' 
        });
    }
    
    const user = req.session.user;
    const hasAdminAccess = user.ruolo === 'admin' || user.admin_access === true;
    
    res.json({
        hasAccess: hasAdminAccess,
        user: {
            username: user.username,
            tipo: user.ruolo === 'admin' ? 'Admin' : 'Fratello con privilegi',
            sessionId: req.sessionID
        }
    });
});

// ✅ NUOVA ROUTE: Logout admin (mantiene compatibilità)
router.post('/logout', (req, res) => {
    console.log('🚪 Logout admin per:', req.session?.user?.username || req.session?.user?.nome);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Errore logout admin:', err);
            return res.status(500).json({ success: false });
        }
        
        res.clearCookie('kilwinning_session');
        console.log('✅ Logout admin completato, redirect alla homepage');
        
        res.json({ 
            success: true, 
            redirect: '/',
            message: 'Logout completato'
        });
    });
});

// ✅ AGGIUNGI ANCHE QUESTA ROUTE GET per compatibilità
router.get('/logout', (req, res) => {
    console.log('🚪 Logout admin GET per:', req.session?.user?.username || req.session?.user?.nome);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Errore logout admin:', err);
        }
        
        res.clearCookie('kilwinning_session');
        console.log('✅ Logout admin GET completato, redirect alla homepage');
        
        // Redirect diretto per GET
        res.redirect('/');
    });
});
// ✅ ALIAS per compatibilità gestione fratelli - VERSIONE CORRETTA
router.get('/api/admin/fratelli', requireAuth, async (req, res) => {
    try {
        console.log('👥 Caricamento lista fratelli per admin (alias)');
        
        // Usa direttamente il database invece di fetch
        const fratelli = await db.getFratelli();
        
        console.log(`✅ Caricati ${fratelli.length} fratelli attivi (alias)`);
        
        res.json({
            success: true,
            data: fratelli
        });
        
    } catch (error) {
        console.error('❌ Errore caricamento fratelli (alias):', error);
        res.status(500).json({
            success: false,
            message: 'Errore nel caricamento dei fratelli: ' + error.message
        });
    }
});
module.exports = router;