# 🏛️ Tornate - Sistema Gestionale R∴L∴ Kilwinning

Sistema completo per la gestione di tornate, presenze, fratelli e tavole architettoniche della Loggia Kilwinning.

## 📋 Funzionalità

- 📅 **Gestione Tornate** - Pianificazione e organizzazione tornate rituali
- 👥 **Gestione Fratelli** - Database membri con gradi e cariche
- ✅ **Tracciamento Presenze** - Sistema presenze con statistiche
- 📖 **Tavole Architettoniche** - Gestione lavori e documenti
- 🔐 **Autenticazione** - Sistema login per fratelli e admin
- 🌐 **Multi-dominio** - Supporto tornate + biblioteca

## 🚀 Quick Start

```bash
# Installa dipendenze
npm install

# Configura variabili d'ambiente
cp .env.example .env
# Modifica .env con le tue credenziali

# Avvia server
npm start
```

Server disponibile su: http://localhost:3000

## 🛡️ Nuovi Miglioramenti (Sicurezza & Monitoring)

### ✅ Installati e Pronti

- **Logger Strutturato** (`config/logger.js`) - Log su file con rotation
- **Middleware Sicurezza** (`middleware/security.js`) - Input sanitization, audit log
- **Health Check** (`routes/health.js`) - Endpoint monitoring
- **Backup Automatico** (`scripts/backup.js`) - Backup database

Vedi [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) per l'integrazione graduale.

## 📦 Script NPM Disponibili

```bash
npm start              # Avvia server produzione
npm run dev            # Avvia server development
npm run backup         # Backup database
npm run backup:pre-deploy  # Backup pre-deployment
npm run logs:view      # Visualizza log in tempo reale
npm run logs:errors    # Visualizza solo errori
npm run health         # Check stato applicazione
```

## 🔧 Configurazione

Variabili d'ambiente richieste (vedi `.env.example`):

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=kilwinning_db
SESSION_SECRET=your_random_secret_32_chars
```

## 📊 Monitoring

### Health Checks

```bash
# Check rapido
curl http://localhost:3000/health

# Check dettagliato con info sistema
curl http://localhost:3000/health/detailed

# Check readiness (DB connesso?)
curl http://localhost:3000/health/ready
```

### Logs

I log sono salvati in `./logs/`:
- `combined.log` - Tutti i log
- `error.log` - Solo errori

```bash
# Visualizza log
npm run logs:view

# Filtra errori specifici
grep "ERROR" logs/combined.log

# Audit trail (azioni admin)
grep "AUDIT" logs/combined.log
```

## 🗄️ Backup Database

```bash
# Backup manuale
npm run backup

# Backup automatico (cron)
# Aggiungi a crontab:
0 2 * * * cd /path/to/Tornate && npm run backup:cleanup
```

I backup sono salvati in `./backups/`

## 🏗️ Struttura Progetto

```
Tornate/
├── config/           # Configurazioni (DB, logger)
├── middleware/       # Middleware Express
├── routes/           # Route API e pagine
├── public/           # File statici (JS, CSS)
├── views/            # Template HTML
├── scripts/          # Script utility (backup, etc)
├── logs/             # Log applicazione
├── backups/          # Backup database
└── init-db/          # SQL schema iniziale
```

## 🔐 Sicurezza

- ✅ Helmet configurato per security headers
- ✅ Rate limiting su API
- ✅ Session management con express-session
- ✅ Input sanitization disponibile
- ✅ Audit logging per azioni admin
- ✅ CORS configurabile

## 📱 Endpoint Principali

### Public
- `/` - Homepage
- `/fratelli/login` - Login fratelli
- `/health` - Health check

### API Fratelli
- `GET /api/fratelli` - Lista fratelli
- `GET /api/fratelli/:id/statistiche` - Statistiche presenza
- `POST /api/fratelli/login` - Autenticazione

### API Tornate
- `GET /api/tornate` - Lista tornate
- `GET /api/tornate/:id` - Dettaglio tornata
- `POST /api/tornate` - Crea tornata (admin)

### API Presenze
- `GET /api/presenze/fratello/:id` - Presenze fratello
- `GET /api/presenze/riepilogo-fratelli` - Riepilogo generale

## 🐛 Troubleshooting

### Server non si avvia

```bash
# Verifica dipendenze
npm install

# Verifica .env configurato
cat .env

# Controlla logs
tail -f logs/error.log
```

### Database non si connette

```bash
# Verifica credenziali in .env
# Test connessione manuale
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Verifica health check
curl http://localhost:3000/health/ready
```

### Errori 401/403

- Verifica sessione attiva
- Controlla privilegi utente
- Vedi audit log: `grep "AUDIT" logs/combined.log`

## 📚 Documentazione

- [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Guida integrazione miglioramenti
- [.env.example](./.env.example) - Configurazione variabili d'ambiente

## 🤝 Contribuire

Per modifiche al codice:

1. Crea backup: `npm run backup`
2. Testa localmente
3. Verifica logs: `npm run logs:view`
4. Commit e push

## 📄 License

ISC - Loggia Kilwinning

---

**Versione:** 1.0.0
**Node.js:** >=18.0.0
**Stack:** Express.js + MySQL + Winston
