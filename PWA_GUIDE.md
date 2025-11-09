# 📱 Guida PWA - Tornate Loggia Kilwinning

## Cosa è Cambiato?

L'applicazione Tornate è stata trasformata in una **Progressive Web App (PWA)** completamente funzionale, installabile su iPhone, iPad e Mac.

## ✨ Nuove Funzionalità

### 1. **Installabile su Dispositivi iOS/macOS**

#### Su iPhone/iPad:
1. Apri **Safari** e vai su `tornate.loggiakilwinning.com`
2. Tocca il pulsante **"Condividi"** (quadrato con freccia)
3. Scorri e seleziona **"Aggiungi a Home"**
4. Conferma il nome e tocca **"Aggiungi"**
5. L'app appare sulla tua home screen! 🎉

#### Su Mac:
1. Apri **Safari** o **Chrome** e vai sul sito
2. In Chrome: clicca l'icona **"+"** nella barra degli indirizzi → **"Installa Tornate"**
3. In Safari: File → Aggiungi al Dock
4. L'app si apre come applicazione standalone!

### 2. **Modalità Standalone**

Una volta installata:
- ✅ Si apre **a schermo intero** (no barra browser)
- ✅ Appare nel multitasking come app nativa
- ✅ Ha la propria icona personalizzata
- ✅ Esperienza app-like completa

### 3. **Funzionamento Offline**

Grazie al Service Worker:
- ✅ Pagine visitate vengono **cachate automaticamente**
- ✅ L'app funziona anche **senza connessione**
- ✅ I dati si sincronizzano quando torni online
- ✅ Asset statici (CSS, JS, icone) sempre disponibili

### 4. **Aggiornamenti Automatici**

- ✅ Quando c'è una nuova versione, appare un **banner di notifica**
- ✅ Puoi aggiornare con un tap o rimandare
- ✅ Gli aggiornamenti si installano senza passare dall'App Store

## 📁 File Aggiunti

```
/public/
├── manifest.json                    # Configurazione PWA
├── service-worker.js                # Gestione offline e caching
├── js/pwa-register.js               # Registrazione e gestione PWA
└── icons/
    ├── icon-master.svg              # Icona sorgente vettoriale
    ├── icon-{dimensione}.png        # Icone varie dimensioni
    └── README.md                    # Guida generazione icone

/scripts/
├── generate-icons.js                # Script per generare icone PNG
└── add-pwa-to-html.js              # Script per aggiungere meta tag

/views/
└── includes/
    └── pwa-meta-tags.html          # Meta tag riutilizzabili
```

## 🔧 Modifiche ai File Esistenti

### `server.js`
Aggiunte route PWA:
```javascript
GET /manifest.json          // Configurazione app
GET /service-worker.js      // Service worker
GET /icons/:filename        // Icone dinamiche
```

### File HTML (`views/**/*.html`)
Aggiunti a tutti i file HTML:
- Meta tag PWA (manifest, theme-color)
- Meta tag iOS (apple-mobile-web-app-*)
- Icone iOS/Android
- Script registrazione PWA

## 🎨 Personalizzazione Icone

### Opzione 1: Generazione Automatica (Consigliata)

```bash
# Installa dipendenza
npm install sharp --save-dev

# Genera tutte le icone
node scripts/generate-icons.js
```

### Opzione 2: Manuale

1. Apri `/public/icons/icon-master.svg` in un editor grafico
2. Personalizza colori, simboli, testo
3. Esporta come PNG nelle dimensioni: 72, 96, 128, 144, 152, 192, 384, 512
4. Salva in `/public/icons/` come `icon-{dimensione}x{dimensione}.png`

### Opzione 3: Online

Usa un convertitore online:
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

## 🧪 Test della PWA

### Verifica Installabilità

1. Apri **Chrome DevTools** (F12)
2. Vai su **"Application"** tab
3. Nella sidebar, clicca **"Manifest"**
4. Verifica che tutti i campi siano corretti
5. Clicca **"Service Workers"** → verifica che sia registrato

### Test Offline

1. In DevTools, vai su **"Network"** tab
2. Seleziona **"Offline"** nel dropdown
3. Naviga l'app → dovrebbe funzionare!
4. Verifica nella **"Application" → "Cache Storage"**

### Test iOS

1. Installa l'app su iPhone
2. Attiva **Modalità Aereo**
3. Apri l'app → le pagine visitate dovrebbero caricare
4. Disattiva Modalità Aereo → sincronizzazione automatica

## 🔄 Come Funziona il Caching

### Strategie Implementate

**Network First (API & Pagine HTML):**
```
1. Prova a scaricare da Internet
2. Se fallisce, usa la cache
3. Se non c'è cache, mostra errore offline
```

**Cache First (Asset Statici: CSS, JS, Icone):**
```
1. Cerca nella cache
2. Se trovato, restituisci immediatamente
3. Aggiorna cache in background
4. Se non in cache, scarica da rete
```

### Svuota Cache Manualmente

Da JavaScript console:
```javascript
await PWA.clearCache();
location.reload();
```

## 📊 Compatibilità

| Piattaforma | Supporto | Note |
|------------|----------|------|
| **iOS 12+** | ✅ Completo | Installabile da Safari |
| **macOS Safari** | ✅ Completo | Aggiungi al Dock |
| **macOS Chrome** | ✅ Completo | Installazione automatica |
| **Android** | ✅ Completo | Chrome, Edge, Firefox |
| **Windows** | ✅ Completo | Chrome, Edge |
| **Linux** | ✅ Completo | Chrome, Firefox |

## 🚀 Deploy in Produzione

### Requisiti Obbligatori

1. **HTTPS** - Le PWA richiedono connessione sicura
   - Usa Let's Encrypt per certificato gratuito
   - Localhost funziona anche su HTTP (solo test)

2. **Domini Corretti** - Aggiorna `manifest.json`:
   ```json
   {
     "start_url": "https://tornate.loggiakilwinning.com/"
   }
   ```

3. **Service Worker Scope** - Già configurato per `/`

### Checklist Deploy

- [ ] HTTPS attivo e funzionante
- [ ] Icone PNG generate (tutte le dimensioni)
- [ ] `manifest.json` con URL corretti
- [ ] Test su dispositivo iOS reale
- [ ] Test offline funzionante
- [ ] Cache configurata correttamente

## 🐛 Troubleshooting

### "Aggiungi a Home" non appare (iOS)

**Soluzione:**
- Usa **Safari**, non Chrome/Firefox
- Visita il sito via HTTPS (non HTTP)
- Aspetta 30 secondi sulla pagina
- Il prompt PWA è solo su iOS 13+

### Service Worker non si registra

**Soluzione:**
```bash
# Verifica che il file esista
ls -la public/service-worker.js

# Verifica permessi
chmod 644 public/service-worker.js

# Controlla log browser
# DevTools → Console → cerca errori SW
```

### Icone non appaiono

**Soluzione:**
1. Genera le icone: `node scripts/generate-icons.js`
2. Verifica che esistano: `ls -la public/icons/`
3. Controlla DevTools → Network per errori 404
4. Riavvia il server

### Cache vecchia non si aggiorna

**Soluzione:**
```javascript
// Da console browser
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister();
  location.reload();
});
```

Oppure cambia `CACHE_NAME` in `service-worker.js`:
```javascript
const CACHE_NAME = 'tornate-v1.0.1'; // incrementa versione
```

## 📱 Best Practices iOS

### Splash Screen Personalizzata (Opzionale)

Aggiungi immagini splash per iOS in `<head>`:
```html
<link rel="apple-touch-startup-image"
      href="/splash/iphone-x.png"
      media="(device-width: 375px) and (device-height: 812px)">
```

### Status Bar Styling

Già configurato in tutti gli HTML:
```html
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

Opzioni: `default`, `black`, `black-translucent`

## 🔐 Sicurezza

### Service Worker Best Practices

✅ **Implementato:**
- Cache solo risorse stesse dominio
- No cache di dati sensibili (password, token)
- Aggiornamento automatico SW
- Nessun accesso non autorizzato

❌ **NON fare:**
- Non cachare `/api/login` o endpoint autenticazione
- Non cachare dati personali in localStorage
- Non disabilitare HTTPS in produzione

## 📈 Monitoraggio

### Metriche da Tracciare

Aggiungi Google Analytics o similare per monitorare:
- Installazioni PWA (evento `appinstalled`)
- Utilizzo offline vs online
- Performance caching
- Errori Service Worker

Esempio:
```javascript
window.addEventListener('appinstalled', () => {
  gtag('event', 'pwa_installed');
});
```

## 🎓 Risorse Aggiuntive

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Apple: Configuring Web Applications](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Google: PWA Checklist](https://web.dev/pwa-checklist/)
- [Can I Use: Service Workers](https://caniuse.com/serviceworkers)

## 💡 Prossimi Passi (Opzionali)

1. **Push Notifications** - Notifiche tornate
2. **Background Sync** - Sincronizzazione dati offline
3. **Share API** - Condivisione tavole
4. **App Shortcuts** - Scorciatoie contestuali
5. **Badging API** - Badge notifiche iOS

## 🆘 Supporto

Per problemi o domande:
1. Controlla questa guida
2. Verifica troubleshooting
3. Controlla log browser (DevTools → Console)
4. Contatta lo sviluppatore

---

**Versione PWA:** 1.0.0
**Data Implementazione:** Novembre 2025
**Compatibilità:** iOS 12+, macOS 10.14+, Android 5+

✨ **L'app Tornate è ora installabile su tutti i dispositivi!** 🎉
