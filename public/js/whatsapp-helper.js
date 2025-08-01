// ==========================================
// WHATSAPP HELPER - SISTEMA R∴L∴ KILWINNING
// File: public/js/whatsapp-helper.js
// ==========================================

class WhatsAppHelper {
    constructor() {
        this.baseUrl = 'https://wa.me/';
        this.websiteUrl = window.location.origin;
    }

    // Pulisce e formatta numero telefono
    cleanPhone(phone) {
        if (!phone) return '';
        return phone.replace(/[^\d+]/g, '');
    }

    // Crea link WhatsApp
    createLink(phone, message) {
        const cleanPhone = this.cleanPhone(phone);
        const encodedMessage = encodeURIComponent(message);
        return `${this.baseUrl}${cleanPhone}?text=${encodedMessage}`;
    }

    // Apre WhatsApp
    openWhatsApp(phone, message) {
        const link = this.createLink(phone, message);
        window.open(link, '_blank');
    }

    // Formatta data in italiano
    formatDate(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('it-IT', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Calcola giorni fino alla data
    getDaysUntil(dateString) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateString + 'T00:00:00');
        const diffTime = targetDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // TEMPLATE MESSAGGI
    buildPresenceConfirmMessage(fratello, tornata, isPresente) {
        const status = isPresente ? 'CONFERMATA' : 'ANNULLATA';
        const emoji = isPresente ? '✅' : '❌';
        
        return `🏛️ R∴L∴ Kilwinning

${emoji} Presenza ${status}

📅 ${this.formatDate(tornata.data)}
🗣️ ${tornata.discussione}
📍 ${tornata.location}
${tornata.chi_introduce ? `👤 Introduce: ${tornata.chi_introduce}` : ''}
${tornata.cena ? `🍽️ Cena: €${tornata.costo_cena}` : ''}

${isPresente ? 'Ti aspettiamo Fratello!' : 'Grazie per l\'avviso.'}
⚖️ Libertà, Uguaglianza, Fratellanza`;
    }

    buildAdminNotificationMessage(fratello, tornata, isPresente) {
        const status = isPresente ? 'CONFERMATO' : 'ANNULLATO';
        const emoji = isPresente ? '✅' : '❌';
        
        return `📋 Aggiornamento Presenze

${emoji} ${fratello.nome} ha ${status} la presenza per:

📅 ${this.formatDate(tornata.data)}
🗣️ ${tornata.discussione}
📍 ${tornata.location}

👥 Controlla presenze complete:
${this.websiteUrl}/presenze-prossima-tornata.html

🏛️ R∴L∴ Kilwinning - Sistema Automatico`;
    }

    buildReminderMessage(fratello, tornata) {
        const daysUntil = this.getDaysUntil(tornata.data);
        let urgency = '';
        
        if (daysUntil === 0) urgency = '(OGGI!)';
        else if (daysUntil === 1) urgency = '(DOMANI!)';
        else if (daysUntil === 2) urgency = '(DOPODOMANI)';
        else if (daysUntil > 0) urgency = `(tra ${daysUntil} giorni)`;
        else urgency = '(SCADUTA)';
        
        return `⏰ Reminder Tornata

Caro Fratello ${fratello.nome},

Non hai ancora confermato la presenza per:
📅 ${this.formatDate(tornata.data)} ${urgency}
🗣️ ${tornata.discussione}
📍 ${tornata.location}
${tornata.chi_introduce ? `👤 Introduce: ${tornata.chi_introduce}` : ''}

🔗 Conferma subito: ${this.websiteUrl}/tornate.html

🏛️ R∴L∴ Kilwinning`;
    }

    buildNewTornataMessage(tornata) {
        return `🏛️ NUOVA TORNATA PROGRAMMATA

📅 Data: ${this.formatDate(tornata.data)}
🕐 Ore: 21:00
🗣️ Argomento: ${tornata.discussione}
${tornata.chi_introduce ? `👤 Introduce: ${tornata.chi_introduce}` : ''}
📍 ${tornata.location}
${tornata.cena ? `🍽️ Cena: €${tornata.costo_cena} (facoltativa)` : ''}

⚠️ CONFERMATE LA PRESENZA entro 48h:
🔗 ${this.websiteUrl}/tornate.html

⚖️ Libertà, Uguaglianza, Fratellanza`;
    }

    buildDirectContactMessage(fromFratello, toFratello, subject) {
        return `🏛️ R∴L∴ Kilwinning

Caro Fratello ${toFratello.nome},

Ti contatto per: ${subject}

Fraternamente,
${fromFratello.nome}
${fromFratello.cariche_fisse || 'Fratello'}`;
    }

    // GESTIONE MODAL WHATSAPP
    showWhatsAppModal(whatsappLinks, presente) {
        if (!whatsappLinks || whatsappLinks.error) {
            console.log('❌ Nessun link WhatsApp disponibile:', whatsappLinks?.error);
            return;
        }

        // Rimuovi modal esistente
        this.closeWhatsAppModal();

        // Crea nuovo modal
        const modal = document.createElement('div');
        modal.className = 'whatsapp-modal';
        modal.innerHTML = this.buildModalHTML(whatsappLinks, presente);
        
        document.body.appendChild(modal);
        
        // Aggiungi stili se non esistono
        if (!document.querySelector('#whatsapp-modal-styles')) {
            this.addModalStyles();
        }

        // Aggiungi event listeners
        this.addModalEventListeners(whatsappLinks);
    }

    buildModalHTML(whatsappLinks, presente) {
        const statusText = presente ? 'Presenza Confermata!' : 'Assenza Registrata!';
        const statusIcon = presente ? '✅' : '❌';
        
        return `
            <div class="whatsapp-modal-content">
                <div class="whatsapp-header">
                    <h3>
                        <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                        ${statusIcon} ${statusText}
                    </h3>
                    <button class="close-btn" data-action="close">&times;</button>
                </div>
                
                <div class="whatsapp-body">
                    <p><strong>Vuoi inviare una notifica WhatsApp?</strong></p>
                    
                    <div class="whatsapp-buttons">
                        ${whatsappLinks.fratello_confirmation ? `
                        <button class="whatsapp-btn self" data-action="open-link" data-link="${whatsappLinks.fratello_confirmation}">
                            <i class="fab fa-whatsapp"></i>
                            <span>
                                <strong>Invia a me stesso</strong>
                                <small>Promemoria personale</small>
                            </span>
                        </button>
                        ` : ''}
                        
                        ${whatsappLinks.admin_notifications.map(admin => `
                        <button class="whatsapp-btn admin" data-action="open-link" data-link="${admin.link}">
                            <i class="fab fa-whatsapp"></i>
                            <span>
                                <strong>Notifica ${admin.name}</strong>
                                <small>${admin.role || 'Amministratore'}</small>
                            </span>
                        </button>
                        `).join('')}
                        
                        <button class="whatsapp-btn all" data-action="notify-all">
                            <i class="fab fa-whatsapp"></i>
                            <span>
                                <strong>Notifica tutti gli admin</strong>
                                <small>Apre ${whatsappLinks.admin_notifications.length} chat</small>
                            </span>
                        </button>
                    </div>
                    
                    <div class="manual-option">
                        <h4>💬 Messaggio da copiare manualmente:</h4>
                        <div class="message-preview">${whatsappLinks.messages.fratello.replace(/\n/g, '<br>')}</div>
                        <button class="copy-btn" data-action="copy-message">
                            <i class="fas fa-copy"></i> Copia Messaggio
                        </button>
                    </div>
                </div>
                
                <div class="whatsapp-footer">
                    <button class="skip-btn" data-action="close">
                        Salta notifiche WhatsApp
                    </button>
                </div>
            </div>
        `;
    }

    addModalEventListeners(whatsappLinks) {
        const modal = document.querySelector('.whatsapp-modal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            switch (action) {
                case 'close':
                    this.closeWhatsAppModal();
                    break;
                    
                case 'open-link':
                    const link = e.target.closest('[data-link]')?.dataset.link;
                    if (link) {
                        window.open(link, '_blank');
                        this.closeWhatsAppModal();
                    }
                    break;
                    
                case 'notify-all':
                    this.notifyAllAdmins(whatsappLinks.admin_notifications);
                    break;
                    
                case 'copy-message':
                    this.copyMessage(whatsappLinks.messages.fratello);
                    break;
            }
        });

        // Chiudi modal cliccando fuori
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeWhatsAppModal();
            }
        });
    }

    notifyAllAdmins(adminList) {
        if (!adminList || adminList.length === 0) {
            alert('Nessun amministratore disponibile');
            return;
        }

        adminList.forEach((admin, index) => {
            setTimeout(() => {
                window.open(admin.link, '_blank');
            }, index * 1000); // 1 secondo tra ogni apertura
        });
        
        this.closeWhatsAppModal();
        this.showMessage(`Apertura ${adminList.length} chat WhatsApp...`, 'info');
    }

    copyMessage(message) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(message).then(() => {
                this.showMessage('Messaggio copiato negli appunti!', 'success');
            }).catch(() => {
                this.fallbackCopyMessage(message);
            });
        } else {
            this.fallbackCopyMessage(message);
        }
    }

    fallbackCopyMessage(message) {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            this.showMessage('Messaggio copiato!', 'success');
        } catch (err) {
            console.error('Errore copia:', err);
            this.showMessage('Errore nella copia. Copia manualmente.', 'error');
        }
        document.body.removeChild(textArea);
    }

    closeWhatsAppModal() {
        const modal = document.querySelector('.whatsapp-modal');
        if (modal) {
            modal.remove();
        }
    }

    showMessage(text, type = 'info') {
        // Cerca funzione showMessage esistente nel sistema
        if (typeof showMessage === 'function') {
            showMessage(text, type);
            return;
        }

        // Fallback: alert semplice
        alert(text);
    }

    addModalStyles() {
        const styles = document.createElement('style');
        styles.id = 'whatsapp-modal-styles';
        styles.textContent = `
            .whatsapp-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            .whatsapp-modal-content {
                background: white;
                border-radius: 20px;
                max-width: 500px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }

            .whatsapp-header {
                padding: 20px;
                border-bottom: 1px solid #eee;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                border-radius: 20px 20px 0 0;
            }

            .whatsapp-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2rem;
            }

            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: white;
                opacity: 0.8;
                transition: opacity 0.3s;
            }

            .close-btn:hover {
                opacity: 1;
            }

            .whatsapp-body {
                padding: 25px;
            }

            .whatsapp-body > p {
                margin-bottom: 20px;
                text-align: center;
                color: #2c3e50;
                font-size: 1.1rem;
            }

            .whatsapp-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 20px 0;
            }

            .whatsapp-btn {
                background: linear-gradient(135deg, #25D366, #128C7E);
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 1rem;
                display: flex;
                align-items: center;
                gap: 15px;
                transition: all 0.3s ease;
                text-align: left;
            }

            .whatsapp-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(37, 211, 102, 0.4);
            }

            .whatsapp-btn.admin {
                background: linear-gradient(135deg, #3498db, #2980b9);
            }

            .whatsapp-btn.admin:hover {
                box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
            }

            .whatsapp-btn.all {
                background: linear-gradient(135deg, #e74c3c, #c0392b);
            }

            .whatsapp-btn.all:hover {
                box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
            }

            .whatsapp-btn.self {
                background: linear-gradient(135deg, #9b59b6, #8e44ad);
            }

            .whatsapp-btn.self:hover {
                box-shadow: 0 5px 15px rgba(155, 89, 182, 0.4);
            }

            .whatsapp-btn i {
                font-size: 1.2rem;
                flex-shrink: 0;
            }

            .whatsapp-btn span {
                flex: 1;
            }

            .whatsapp-btn strong {
                display: block;
                margin-bottom: 3px;
            }

            .whatsapp-btn small {
                display: block;
                opacity: 0.9;
                font-size: 0.85rem;
                font-weight: normal;
            }

            .manual-option {
                margin-top: 25px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
                border: 1px solid #e9ecef;
            }

            .manual-option h4 {
                margin-bottom: 15px;
                color: #2c3e50;
                font-size: 1rem;
            }

            .message-preview {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #ddd;
                font-size: 0.9rem;
                line-height: 1.5;
                margin: 15px 0;
                color: #2c3e50;
                font-family: system-ui;
            }

            .copy-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }

            .copy-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
            }

            .whatsapp-footer {
                padding: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                background: #f8f9fa;
                border-radius: 0 0 20px 20px;
            }

            .skip-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 0.95rem;
                transition: all 0.3s ease;
            }

            .skip-btn:hover {
                background: #5a6268;
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { transform: translateY(30px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            @media (max-width: 768px) {
                .whatsapp-modal-content {
                    width: 95%;
                    margin: 20px;
                    max-height: 90vh;
                }
                
                .whatsapp-header {
                    padding: 15px;
                }
                
                .whatsapp-header h3 {
                    font-size: 1.1rem;
                }
                
                .whatsapp-body {
                    padding: 20px;
                }
                
                .whatsapp-buttons {
                    gap: 10px;
                }
                
                .whatsapp-btn {
                    padding: 12px 15px;
                    font-size: 0.95rem;
                }
                
                .manual-option {
                    padding: 15px;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Istanza globale
const whatsappHelper = new WhatsAppHelper();

// Esporta per uso in moduli
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppHelper;
}