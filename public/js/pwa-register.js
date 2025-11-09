/**
 * Registrazione Service Worker per PWA
 * Include gestione update e notifiche all'utente
 */

// Verifica supporto Service Worker
if ('serviceWorker' in navigator) {
  // Registra al caricamento pagina
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });

    console.log('✅ Service Worker registrato con successo:', registration.scope);

    // Gestione aggiornamenti
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Nuovo service worker disponibile
          showUpdateNotification();
        }
      });
    });

    // Controlla aggiornamenti ogni ora
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Registrazione Service Worker fallita:', error);
  }
}

// Mostra notifica di aggiornamento disponibile
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
      color: white;
      padding: 15px 20px;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <p style="margin: 0 0 10px 0; font-size: 14px;">
        📱 <strong>Nuova versione disponibile!</strong>
      </p>
      <button onclick="refreshApp()" style="
        background: #e94560;
        border: none;
        color: white;
        padding: 8px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        margin-right: 10px;
      ">
        Aggiorna Ora
      </button>
      <button onclick="dismissUpdate()" style="
        background: transparent;
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        padding: 8px 20px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 13px;
      ">
        Più Tardi
      </button>
    </div>
  `;

  document.body.appendChild(updateBanner);
}

// Ricarica app con nuovo service worker
window.refreshApp = function() {
  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });

  window.location.reload();
};

// Nascondi banner aggiornamento
window.dismissUpdate = function() {
  const banner = document.getElementById('pwa-update-banner');
  if (banner) {
    banner.remove();
  }
};

// Gestione installazione PWA
let deferredPrompt;
let installButton;

window.addEventListener('beforeinstallprompt', (e) => {
  // Previeni il prompt automatico
  e.preventDefault();

  // Salva l'evento per dopo
  deferredPrompt = e;

  // Mostra pulsante installazione personalizzato
  showInstallButton();
});

function showInstallButton() {
  // Verifica se esiste già un container per il pulsante
  let installContainer = document.getElementById('pwa-install-container');

  if (!installContainer) {
    installContainer = document.createElement('div');
    installContainer.id = 'pwa-install-container';
    installContainer.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        animation: slideInUp 0.5s ease-out;
      ">
        <button id="pwa-install-button" style="
          background: linear-gradient(135deg, #e94560 0%, #d63447 100%);
          border: none;
          color: white;
          padding: 12px 24px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: transform 0.2s, box-shadow 0.2s;
        ">
          <span style="font-size: 18px;">📱</span>
          <span>Installa App</span>
        </button>
      </div>
    `;

    // Aggiungi animazione CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #pwa-install-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(233, 69, 96, 0.6);
      }

      #pwa-install-button:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(installContainer);
  }

  installButton = document.getElementById('pwa-install-button');

  if (installButton) {
    installButton.addEventListener('click', installPWA);
  }
}

async function installPWA() {
  if (!deferredPrompt) {
    return;
  }

  // Mostra il prompt di installazione
  deferredPrompt.prompt();

  // Aspetta la scelta dell'utente
  const { outcome } = await deferredPrompt.userChoice;

  console.log(`Installazione PWA: ${outcome}`);

  if (outcome === 'accepted') {
    console.log('✅ Utente ha accettato l\'installazione');

    // Nascondi il pulsante
    const container = document.getElementById('pwa-install-container');
    if (container) {
      container.remove();
    }
  }

  // Reset del prompt
  deferredPrompt = null;
}

// Rileva se app è già installata
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installata con successo!');

  // Nascondi pulsante installazione
  const container = document.getElementById('pwa-install-container');
  if (container) {
    container.remove();
  }

  // Opzionale: mostra messaggio di benvenuto
  showWelcomeMessage();
});

function showWelcomeMessage() {
  const welcomeDiv = document.createElement('div');
  welcomeDiv.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 10001;
      text-align: center;
      max-width: 90%;
      width: 320px;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
      <h2 style="margin: 0 0 10px 0; color: #0f3460;">App Installata!</h2>
      <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
        Tornate è ora disponibile sulla tua home screen
      </p>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: #0f3460;
        border: none;
        color: white;
        padding: 10px 30px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
      ">
        Inizia
      </button>
    </div>
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10000;
    " onclick="this.parentElement.remove()"></div>
  `;

  document.body.appendChild(welcomeDiv);

  // Rimuovi automaticamente dopo 5 secondi
  setTimeout(() => {
    if (welcomeDiv.parentElement) {
      welcomeDiv.remove();
    }
  }, 5000);
}

// Verifica se l'app è in modalità standalone (installata)
function isPWAInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone ||
         document.referrer.includes('android-app://');
}

if (isPWAInstalled()) {
  console.log('✅ App in esecuzione in modalità standalone (installata)');

  // Aggiungi classe al body per styling specifico PWA
  document.body.classList.add('pwa-installed');
}

// Esporta funzioni utili
window.PWA = {
  isInstalled: isPWAInstalled,
  clearCache: async function() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.active) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        registration.active.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    }
  }
};
