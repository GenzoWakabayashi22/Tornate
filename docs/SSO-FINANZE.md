# 📝 Documentazione SSO Finanze

**Sistema di Single Sign-On tra Tornate e Finanze**

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Flusso di Autenticazione](#flusso-di-autenticazione)
4. [Configurazione](#configurazione)
5. [API Endpoints](#api-endpoints)
6. [Formato Token JWT](#formato-token-jwt)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Sicurezza](#sicurezza)

---

## 📖 Panoramica

Il sistema SSO (Single Sign-On) permette agli utenti autenticati su **Tornate** di accedere automaticamente all'applicazione **Finanze** senza dover effettuare un secondo login.

### Caratteristiche

- ✅ **Autenticazione unica**: Login una volta, accesso a entrambe le app
- 🔐 **Token JWT sicuri**: Token firmati con scadenza di 5 minuti
- 👑 **Gestione ruoli**: Trasferimento automatico dei privilegi admin
- 🚀 **Esperienza seamless**: Redirect automatico senza interruzioni

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUSSO SSO                              │
└─────────────────────────────────────────────────────────────────┘

   Tornate                         Finanze
   ┌─────────┐                    ┌─────────┐
   │  Login  │                    │         │
   │  User   │                    │         │
   └────┬────┘                    │         │
        │                         │         │
        │ 1. Click "Finanze"      │         │
        │                         │         │
   ┌────▼────────────────┐        │         │
   │ Dashboard           │        │         │
   │ apriFinanze()       │        │         │
   └────┬────────────────┘        │         │
        │                         │         │
        │ 2. GET /api/fratelli/   │         │
        │    sso-finanze          │         │
        │                         │         │
   ┌────▼────────────────┐        │         │
   │ Server Tornate      │        │         │
   │ - Verifica sessione │        │         │
   │ - Crea payload JWT  │        │         │
   │ - Firma token       │        │         │
   └────┬────────────────┘        │         │
        │                         │         │
        │ 3. Response con         │         │
        │    redirect_url +       │         │
        │    token JWT            │         │
        │                         │         │
   ┌────▼────────────────┐        │         │
   │ Browser redirect    ├────────┼─────────┐
   └─────────────────────┘        │         │
                                  │         │
                           4. GET │  /sso-  │
                              login?token=  │
                                  │         │
                             ┌────▼─────────▼──┐
                             │ Server Finanze  │
                             │ - Verifica JWT  │
                             │ - Crea sessione │
                             │ - Redirect /    │
                             │   dashboard     │
                             └────┬────────────┘
                                  │
                             ┌────▼────────┐
                             │  Dashboard  │
                             │   Finanze   │
                             └─────────────┘
```

---

## 🔄 Flusso di Autenticazione

### Step-by-Step

1. **Utente autenticato su Tornate**
   - L'utente ha già effettuato il login su `tornate.loggiakilwinning.com`
   - Sessione attiva con dati utente memorizzati

2. **Click su "Finanze"**
   - L'utente clicca sul link/icona Finanze nella dashboard
   - Viene chiamata la funzione JavaScript `apriFinanze()`

3. **Richiesta Token SSO**
   - La dashboard fa una chiamata a `GET /api/fratelli/sso-finanze`
   - Il server verifica la sessione attiva

4. **Generazione Token JWT**
   - Il server estrae i dati dell'utente dalla sessione
   - Crea un payload JWT con:
     - ID utente
     - Username
     - Nome completo
     - Ruolo (admin/user)
     - Privilegi admin
     - Grado massonico
     - Source: "tornate"
   - Firma il token con `FINANZE_JWT_SECRET`
   - Token valido per 5 minuti

5. **Redirect a Finanze**
   - Il browser viene reindirizzato a:
     ```
     https://finanze.loggiakilwinning.com/sso-login?token=<JWT>
     ```

6. **Verifica Token in Finanze**
   - Il server Finanze riceve il token
   - Verifica la firma con lo stesso `FINANZE_JWT_SECRET`
   - Valida:
     - Token non scaduto
     - Source = "tornate"
     - Payload completo

7. **Creazione Sessione Finanze**
   - Il server Finanze crea una nuova sessione
   - Memorizza i dati utente dal token JWT
   - Redirect automatico alla dashboard Finanze

8. **Utente autenticato**
   - L'utente è ora loggato su Finanze
   - Mantiene i suoi privilegi (admin/user)

---

## ⚙️ Configurazione

### 1. Tornate - File `.env`

Aggiungi/verifica queste variabili:

```env
# SSO Finanze
FINANZE_JWT_SECRET=kilwinning_finanze_secret_key_2025_super_secure

# Database Finanze (opzionale, per integrazione diretta)
DB_HOST_FINANZE=localhost
DB_USER_FINANZE=jmvvznbb_finanze_user
DB_PASSWORD_FINANZE=Puntorosso22
DB_NAME_FINANZE=jmvvznbb_finanze_db
```

### 2. Finanze - File `.env`

**⚠️ IMPORTANTE**: Il secret DEVE essere identico!

```env
# SSO da Tornate
FINANZE_JWT_SECRET=kilwinning_finanze_secret_key_2025_super_secure
```

### 3. Installazione Dipendenze

Entrambe le app richiedono il package `jsonwebtoken`:

```bash
npm install jsonwebtoken
```

### 4. Configurazione Netsons (Hosting)

Accedi al pannello Netsons e aggiungi la variabile ambiente:

1. **Tornate**: Vai su "Variabili Ambiente"
   - Nome: `FINANZE_JWT_SECRET`
   - Valore: `kilwinning_finanze_secret_key_2025_super_secure`

2. **Finanze**: Vai su "Variabili Ambiente"
   - Nome: `FINANZE_JWT_SECRET`
   - Valore: `kilwinning_finanze_secret_key_2025_super_secure` (STESSO!)

3. **Riavvia entrambe le app Node.js**

---

## 🔌 API Endpoints

### Tornate - Generazione Token

#### `GET /api/fratelli/sso-finanze`

**Descrizione**: Genera un token JWT per l'accesso SSO a Finanze

**Autenticazione**: Richiesta (sessione attiva)

**Headers**:
```http
Content-Type: application/json
Cookie: kilwinning_session=<session_id>
```

**Response Success (200)**:
```json
{
  "success": true,
  "redirect_url": "https://finanze.loggiakilwinning.com/sso-login?token=eyJhbGc...",
  "expiresIn": 300
}
```

**Response Error (401)**:
```json
{
  "success": false,
  "error": "Autenticazione richiesta",
  "message": "Devi effettuare il login per accedere a Finanze"
}
```

**Response Error (500)**:
```json
{
  "success": false,
  "error": "Errore interno",
  "message": "Errore nella generazione del token SSO"
}
```

---

### Finanze - Verifica Token

#### `GET /sso-login`

**Descrizione**: Accetta un token JWT da Tornate e crea la sessione

**Query Parameters**:
- `token` (required): Token JWT generato da Tornate

**Esempio**:
```
GET https://finanze.loggiakilwinning.com/sso-login?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success**: Redirect a `/dashboard`

**Error**: Redirect a `/login?error=<error_type>`

Possibili errori:
- `token_missing`: Token non presente nella query string
- `invalid_source`: Token non proviene da "tornate"
- `invalid_token`: Token invalido o scaduto
- `session_error`: Errore nella creazione della sessione

---

## 🔐 Formato Token JWT

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "id": 16,
  "username": "paolo.giulio.gazzano",
  "nome": "Paolo Giulio Gazzano",
  "role": "admin",
  "admin_access": true,
  "grado": "Maestro",
  "source": "tornate",
  "timestamp": 1705587234567,
  "iat": 1705587234,
  "exp": 1705587534,
  "iss": "tornate.loggiakilwinning.com",
  "aud": "finanze.loggiakilwinning.com"
}
```

### Campi del Payload

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | number | ID univoco del fratello nel database |
| `username` | string | Username di login (es: paolo.giulio.gazzano) |
| `nome` | string | Nome completo del fratello |
| `role` | string | Ruolo applicativo: "admin" o "user" |
| `admin_access` | boolean | Flag privilegi amministrativi |
| `grado` | string | Grado massonico (Apprendista/Compagno/Maestro) |
| `source` | string | Sorgente del token (sempre "tornate") |
| `timestamp` | number | Timestamp di generazione |
| `iat` | number | Issued At (timestamp generazione) |
| `exp` | number | Expiration (scadenza, +5 minuti) |
| `iss` | string | Issuer (emittente del token) |
| `aud` | string | Audience (destinatario del token) |

---

## 🧪 Testing

### Test Manuale

1. **Login su Tornate**
   - Vai su `tornate.loggiakilwinning.com`
   - Effettua il login con le tue credenziali

2. **Apri la Dashboard**
   - Verifica che il tuo nome sia visualizzato
   - Se sei Paolo, verifica il badge "Admin"

3. **Click su Finanze**
   - Clicca sull'icona/link "Finanze" (💰)
   - Dovresti vedere il messaggio "⏳ Generazione token di accesso..."

4. **Redirect Automatico**
   - Verrai automaticamente reindirizzato a Finanze
   - Dovresti essere già autenticato
   - Verifica che il tuo nome sia visualizzato

5. **Verifica Ruoli**
   - Se sei Paolo, dovresti vedere le funzioni admin
   - Altri fratelli vedranno solo le funzioni user

### Test con curl

**1. Ottieni il session cookie**:
```bash
curl -c cookies.txt -X POST https://tornate.loggiakilwinning.com/api/fratelli/login \
  -H "Content-Type: application/json" \
  -d '{"username":"paolo.giulio.gazzano", "password":"tuapassword"}'
```

**2. Richiedi il token SSO**:
```bash
curl -b cookies.txt https://tornate.loggiakilwinning.com/api/fratelli/sso-finanze
```

**Output atteso**:
```json
{
  "success": true,
  "redirect_url": "https://finanze.loggiakilwinning.com/sso-login?token=eyJhbGc...",
  "expiresIn": 300
}
```

**3. Decodifica il token** (opzionale):
```bash
# Copia il token dal redirect_url e usa jwt.io per decodificarlo
# Oppure:
echo "eyJhbGc..." | base64 -d
```

---

## 🐛 Troubleshooting

### Problema: "Token SSO non valido"

**Possibili cause**:
1. Secret diversi tra Tornate e Finanze
2. Token scaduto (>5 minuti)
3. Token corrotto durante il trasferimento

**Soluzioni**:
```bash
# 1. Verifica che il secret sia identico
# Tornate .env
grep FINANZE_JWT_SECRET .env

# Finanze .env
grep FINANZE_JWT_SECRET .env

# Devono essere IDENTICI!

# 2. Verifica variabili ambiente su Netsons
# Pannello → App → Variabili Ambiente → Verifica FINANZE_JWT_SECRET

# 3. Riavvia entrambe le app
```

---

### Problema: "Sessione scaduta"

**Causa**: La sessione su Tornate è scaduta prima di generare il token

**Soluzione**:
- Effettua di nuovo il login su Tornate
- Riprova il click su Finanze

---

### Problema: "Redirect loop infinito"

**Causa**: Finanze non riesce a creare la sessione

**Soluzioni**:
```bash
# 1. Verifica logs Finanze
tail -f /path/to/finanze/logs/app.log

# 2. Verifica installazione jsonwebtoken
cd /path/to/finanze
npm list jsonwebtoken

# Se non installato:
npm install jsonwebtoken

# 3. Riavvia app Finanze
```

---

### Problema: "Admin access non funziona"

**Causa**: Il ruolo admin non viene trasferito correttamente

**Verifica**:
1. Controlla che Paolo abbia `role = 'admin'` nel database Tornate
2. Verifica i log durante il login:
   ```
   👑 Login ADMIN: Paolo Giulio Gazzano
   ```
3. Controlla il payload del token JWT (decodifica su jwt.io)

**Fix**:
```sql
-- Esegui lo script SQL
mysql -u root -p kilwinning_db < init-db/07-set-admin-roles.sql
```

---

### Problema: "Token scade troppo velocemente"

**Causa**: Il token ha una scadenza di 5 minuti per sicurezza

**Soluzione** (se necessario aumentare):
```javascript
// In server.js, endpoint /api/fratelli/sso-finanze
// Cambia expiresIn da '5m' a '10m' o altro valore
const token = jwt.sign(payload, FINANZE_JWT_SECRET, {
    expiresIn: '10m',  // ← Modifica qui
    issuer: 'tornate.loggiakilwinning.com',
    audience: 'finanze.loggiakilwinning.com'
});
```

---

## 🔒 Sicurezza

### Best Practices

1. **Secret Forte**
   ```bash
   # Genera un secret casuale forte:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Token Scadenza Breve**
   - Default: 5 minuti
   - Mai più di 15 minuti

3. **Verifica Source**
   - Finanze accetta SOLO token con `source: 'tornate'`

4. **HTTPS Obbligatorio**
   - Mai usare HTTP in produzione
   - Usa HTTPS per entrambe le app

5. **Validazione Payload**
   - Verifica TUTTI i campi del payload
   - Non fidarti MAI di dati non verificati

6. **Logging**
   - Log di tutti i tentativi SSO
   - Monitora tentativi falliti

### Checklist Sicurezza

- [ ] `FINANZE_JWT_SECRET` è una stringa casuale di almeno 32 caratteri
- [ ] Il secret è identico in Tornate e Finanze
- [ ] Il secret NON è committato nel repository
- [ ] HTTPS è abilitato su entrambe le app
- [ ] Token scadenza ≤ 5 minuti
- [ ] Validazione `source === 'tornate'` implementata in Finanze
- [ ] Logging attivo per debug e monitoring
- [ ] Cookie `httpOnly` e `secure` in produzione

---

## 📚 Riferimenti

- **JWT.io**: https://jwt.io (per decodificare e verificare token)
- **jsonwebtoken npm**: https://www.npmjs.com/package/jsonwebtoken
- **SSO Best Practices**: https://auth0.com/docs/authenticate/single-sign-on

---

## 📞 Supporto

Per problemi o domande:
- **Email**: segreteria@loggiakilwinning.com
- **GitHub Issues**: [Repository Tornate](https://github.com/GenzoWakabayashi22/Tornate)

---

**Versione**: 1.0.0
**Data**: 18 Gennaio 2025
**Autore**: Sistema Tornate R∴L∴ Kilwinning
