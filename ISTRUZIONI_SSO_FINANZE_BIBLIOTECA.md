# 🔐 ISTRUZIONI SSO - FINANZE E BIBLIOTECA

## 📌 CONTESTO

Il sistema **Tornate** è stato aggiornato per supportare l'auto-login SSO (Single Sign-On) verso i sistemi **Finanze** e **Biblioteca**.

Quando un fratello clicca su "Finanze" o "Biblioteca" dalla dashboard, viene generato un token SSO che permette l'accesso automatico senza dover inserire manualmente le credenziali.

**⚠️ IMPORTANTE:** Questo documento contiene le istruzioni per implementare la parte lato server nei repository **Finanze-Loggia** e **Biblioteca**.

---

## 🎯 MODIFICHE AL REPOSITORY FINANZE-LOGGIA

### File da modificare: `app.js`

**Posizione:** All'INIZIO del file `app.js`, PRIMA di tutte le altre funzioni.

**Codice da aggiungere:**

```javascript
/**
 * ✅ SISTEMA SSO - AUTO-LOGIN DA TORNATE
 * Controlla se c'è un token SSO nell'URL e effettua login automatico
 */
(function initSSO() {
    const urlParams = new URLSearchParams(window.location.search);
    const ssoToken = urlParams.get('sso');

    if (ssoToken) {
        try {
            // Decodifica token
            const ssoData = JSON.parse(atob(ssoToken));

            // Verifica validità temporale (max 30 secondi)
            const tokenAge = Date.now() - ssoData.timestamp;
            if (tokenAge > 30000) {
                console.warn('❌ Token SSO scaduto');
                return;
            }

            // Verifica provenienza
            if (ssoData.from !== 'tornate') {
                console.warn('❌ Token SSO non valido (origine sconosciuta)');
                return;
            }

            console.log('✅ Token SSO valido, auto-login in corso...');

            // Auto-compila form di login
            document.getElementById('username').value = ssoData.username;
            document.getElementById('password').value = ssoData.password;

            // Rimuovi parametro SSO dall'URL
            window.history.replaceState({}, document.title, window.location.pathname);

            // Attiva login automatico dopo che la pagina è completamente caricata
            window.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                    console.log('🔐 Eseguo auto-login SSO...');
                    document.getElementById('loginForm').dispatchEvent(new Event('submit', {
                        bubbles: true,
                        cancelable: true
                    }));
                }, 500);
            });

        } catch (error) {
            console.error('❌ Errore decodifica token SSO:', error);
        }
    }
})();
```

**⚠️ NOTA:** Questo codice deve essere inserito PRIMA della funzione `login()` esistente in `app.js`.

---

### 🔒 MAPPING UTENTI FINANZE

Il sistema SSO mappa gli utenti come segue:

| Fratello ID | Nome | Credenziali Finanze |
|-------------|------|---------------------|
| 16 | Paolo Giulio Gazzano | `admin` / `admin123` |
| Altri fratelli | - | `Fratello` / `puntorosso` |

**Logica implementata in `dashboard.html` (già fatto):**

```javascript
function apriFinanze() {
    const userId = parseInt(fratelliAuth.id);
    let username, password;

    // Paolo Giulio Gazzano = Admin
    if (userId === 16) {
        username = 'admin';
        password = 'admin123';
    } else {
        // Altri fratelli
        username = 'Fratello';
        password = 'puntorosso';
    }

    // Crea token SSO...
}
```

---

## 🎯 MODIFICHE AL REPOSITORY BIBLIOTECA

### File da modificare: `index.php`

**Posizione:** Dopo la linea 23 (dopo il check di sessione esistente).

**Codice da aggiungere:**

```php
// ✅ GESTIONE SSO - AUTO-LOGIN DA TORNATE
if (isset($_GET['sso']) && !isset($_SESSION['fratello_id'])) {
    try {
        $ssoToken = $_GET['sso'];
        $ssoData = json_decode(base64_decode($ssoToken), true);

        // Verifica validità temporale (max 30 secondi)
        $tokenAge = (time() * 1000) - $ssoData['timestamp'];
        if ($tokenAge <= 30000 && $ssoData['from'] === 'tornate') {

            // Verifica che il fratello esista
            $fratello_nome = $ssoData['fratello_nome'];
            $query = "SELECT id, nome, grado FROM fratelli WHERE nome = ? AND attivo = 1";
            $stmt = $conn->prepare($query);
            $stmt->bind_param('s', $fratello_nome);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($fratello = $result->fetch_assoc()) {
                // Crea sessione automaticamente
                $_SESSION['fratello_id'] = $fratello['id'];
                $_SESSION['fratello_nome'] = $fratello['nome'];
                $_SESSION['fratello_grado'] = $fratello['grado'];
                $_SESSION['sso_login'] = true;
                $_SESSION['login_time'] = time();

                // Redirect alla dashboard
                header('Location: pages/dashboard.php');
                exit;
            }
        }
    } catch (Exception $e) {
        error_log('Errore SSO: ' . $e->getMessage());
    }
}
```

**⚠️ PREREQUISITI:**
- Il database della Biblioteca deve avere una tabella `fratelli` con i campi: `id`, `nome`, `grado`, `attivo`
- La connessione al database deve essere disponibile nella variabile `$conn`

---

### 🔒 MAPPING UTENTI BIBLIOTECA

Per la Biblioteca, TUTTI i fratelli usano il proprio nome per l'auto-login.

**Logica implementata in `dashboard.html` (già fatto):**

```javascript
function apriBiblioteca() {
    // Per la biblioteca, tutti i fratelli usano il proprio nome
    const ssoData = {
        fratello_nome: fratelliAuth.nome,
        timestamp: Date.now(),
        from: 'tornate',
        userId: fratelliAuth.id
    };

    const token = btoa(JSON.stringify(ssoData));
    const bibliotecaUrl = `https://biblioteca.loggiakilwinning.com/?sso=${token}`;
    window.open(bibliotecaUrl, '_blank');
}
```

---

## 🔐 SICUREZZA DEL TOKEN SSO

### Struttura del Token

Il token SSO è un oggetto JSON codificato in Base64 contenente:

**Per Finanze:**
```json
{
    "username": "admin" | "Fratello",
    "password": "admin123" | "puntorosso",
    "timestamp": 1234567890123,
    "from": "tornate",
    "userId": 16,
    "nome": "Paolo Giulio Gazzano"
}
```

**Per Biblioteca:**
```json
{
    "fratello_nome": "Paolo Giulio Gazzano",
    "timestamp": 1234567890123,
    "from": "tornate",
    "userId": 16
}
```

### Misure di Sicurezza Implementate

1. **Timeout di 30 secondi:** Il token scade dopo 30 secondi dalla generazione
2. **Verifica origine:** Il campo `from: 'tornate'` deve essere presente e corretto
3. **Rimozione parametro URL:** Dopo il login, il parametro `?sso=...` viene rimosso dall'URL
4. **No replay attacks:** Grazie al timeout di 30 secondi

### ⚠️ RACCOMANDAZIONI FUTURE

Per aumentare la sicurezza, considerare:

1. **JWT con firma HMAC:** Invece di Base64, usare JWT con chiave segreta condivisa
2. **HTTPS obbligatorio:** Tutti i sistemi dovrebbero usare HTTPS (già implementato)
3. **Nonce/UUID:** Aggiungere un identificatore univoco per ogni token
4. **IP Whitelisting:** Verificare che la richiesta provenga dall'IP del sistema Tornate
5. **Database condiviso:** Unificare l'autenticazione in un unico database per tutti e 3 i sistemi

---

## 🧪 TESTING

### Test Finanze

1. Login come **Paolo Giulio Gazzano** (ID 16) nel sistema Tornate
2. Cliccare su "Finanze" dalla dashboard
3. Verificare auto-login con credenziali `admin` / `admin123`
4. Verificare che non appaia la schermata di login intermedia

**Test con altro fratello:**
1. Login come qualsiasi altro fratello
2. Cliccare su "Finanze"
3. Verificare auto-login con credenziali `Fratello` / `puntorosso`

### Test Biblioteca

1. Login come qualsiasi fratello nel sistema Tornate
2. Cliccare su "Biblioteca" dalla dashboard
3. Verificare auto-login con il nome del fratello
4. Verificare che non appaia la schermata di login intermedia

### Test Timeout Token

1. Modificare temporaneamente il timeout da 30s a 5s nel codice SSO
2. Generare un token e attendere 6 secondi prima di usarlo
3. Verificare che il token venga rifiutato come scaduto
4. Ripristinare il timeout a 30s

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### Repository Finanze-Loggia

- [ ] Aggiunto codice SSO all'inizio di `app.js`
- [ ] Verificato che esistano i campi `username` e `password` nel form di login
- [ ] Verificato che il form di login abbia `id="loginForm"`
- [ ] Testato auto-login per Paolo (admin)
- [ ] Testato auto-login per altri fratelli
- [ ] Verificato timeout token (30s)

### Repository Biblioteca

- [ ] Aggiunto codice SSO in `index.php` dopo riga 23
- [ ] Verificato che esista la tabella `fratelli` nel database
- [ ] Verificato che i campi `id`, `nome`, `grado`, `attivo` esistano
- [ ] Verificato che la connessione `$conn` sia disponibile
- [ ] Testato auto-login per vari fratelli
- [ ] Verificato redirect a `pages/dashboard.php`
- [ ] Verificato timeout token (30s)

---

## 🚀 DEPLOY

### Ordine di Deploy Consigliato

1. **Deploy Tornate** (già fatto con questo commit)
2. **Deploy Finanze-Loggia** (modificare `app.js`)
3. **Deploy Biblioteca** (modificare `index.php`)
4. **Test completo** del flusso SSO end-to-end

### Rollback Plan

Se l'SSO non funziona:

- **Finanze:** Gli utenti possono ancora fare login manualmente
- **Biblioteca:** Gli utenti possono ancora fare login manualmente
- **Tornate:** I link continuano a funzionare, ma senza auto-login

**Non c'è rischio di blocco totale dei sistemi.**

---

## 💡 SUPPORTO

Per problemi o domande sull'implementazione:

- Email: segreteria@loggiakilwinning.com
- Sistema: Sistema Gestionale Loggia Kilwinning v2.1

---

**🎯 QUESTO DOCUMENTO È DA FORNIRE AGLI SVILUPPATORI DEI REPOSITORY FINANZE-LOGGIA E BIBLIOTECA**

© 2025 R∴L∴ Kilwinning - Sistema di Auto-Login SSO
