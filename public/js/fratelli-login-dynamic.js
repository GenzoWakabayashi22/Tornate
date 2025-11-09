/**
 * Caricamento dinamico fratelli per login
 * Gestisce sezione Fratelli e Ospiti
 */

// Carica lista fratelli da API
async function loadFratelliList() {
    const select = document.getElementById('fratello');
    const loadingDiv = document.getElementById('loadingFratelli');

    try {
        // Mostra loading
        if (loadingDiv) loadingDiv.style.display = 'block';

        const response = await fetch('/api/fratelli/login-list');
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Errore caricamento fratelli');
        }

        const { fratelli, ospiti } = result.data;

        // Pulisci select (mantieni solo la prima option)
        select.innerHTML = '<option value="">-- Scegli il tuo nome --</option>';

        // === SEZIONE FRATELLI ===
        if (fratelli) {
            // Maestri
            if (fratelli.maestri && fratelli.maestri.length > 0) {
                const maestriGroup = document.createElement('optgroup');
                maestriGroup.label = '🔺 Maestri';
                fratelli.maestri.forEach(f => {
                    const option = createOption(f);
                    maestriGroup.appendChild(option);
                });
                select.appendChild(maestriGroup);
            }

            // Compagni
            if (fratelli.compagni && fratelli.compagni.length > 0) {
                const compagniGroup = document.createElement('optgroup');
                compagniGroup.label = '🔸 Compagni';
                fratelli.compagni.forEach(f => {
                    const option = createOption(f);
                    compagniGroup.appendChild(option);
                });
                select.appendChild(compagniGroup);
            }

            // Apprendisti
            if (fratelli.apprendisti && fratelli.apprendisti.length > 0) {
                const apprendistiGroup = document.createElement('optgroup');
                apprendistiGroup.label = '🔹 Apprendisti';
                fratelli.apprendisti.forEach(f => {
                    const option = createOption(f);
                    apprendistiGroup.appendChild(option);
                });
                select.appendChild(apprendistiGroup);
            }
        }

        // === SEZIONE OSPITI ===
        if (ospiti && ospiti.length > 0) {
            const ospitiGroup = document.createElement('optgroup');
            ospitiGroup.label = '👥 Ospiti';
            ospitiGroup.style.borderTop = '2px solid #ddd';
            ospitiGroup.style.marginTop = '5px';

            ospiti.forEach(f => {
                const option = createOption(f);
                ospitiGroup.appendChild(option);
            });
            select.appendChild(ospitiGroup);
        }

        console.log('✅ Fratelli caricati:', result.count);

        // Nascondi loading
        if (loadingDiv) loadingDiv.style.display = 'none';

    } catch (error) {
        console.error('❌ Errore caricamento fratelli:', error);

        // Mostra errore all'utente
        select.innerHTML = '<option value="">Errore caricamento - Riprova</option>';

        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div style="color: #dc3545; font-size: 14px;">
                    ⚠️ Errore caricamento fratelli.
                    <a href="#" onclick="loadFratelliList(); return false;">Riprova</a>
                </div>
            `;
        }
    }
}

// Crea option element per un fratello
function createOption(fratello) {
    const option = document.createElement('option');
    option.value = fratello.id;
    option.dataset.nome = fratello.nome;
    option.dataset.grado = fratello.grado;
    option.dataset.ruolo = fratello.carica || '';
    option.textContent = fratello.nome;
    return option;
}

// Carica fratelli al caricamento pagina
document.addEventListener('DOMContentLoaded', () => {
    loadFratelliList();
});
