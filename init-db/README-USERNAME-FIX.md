# 🔧 Fix Login Username - Guida Rapida

## 🔍 Problema Identificato

Il login non funziona perché **il campo `username` potrebbe non esistere** nella tabella `fratelli` del database di produzione.

### Causa
La migrazione `05-add-username-login.sql` potrebbe non essere stata eseguita sul server.

---

## ✅ Soluzione (2 Opzioni)

### **Opzione 1: Script SQL Automatico** (Consigliato)

Esegui lo script SQL che verifica e corregge automaticamente il problema:

```bash
# Connettiti al database MySQL
mysql -u jmvvznbb_tornate_user -p kilwinning_db

# Esegui lo script
source /path/to/Tornate/init-db/06-verify-and-fix-username.sql
```

**Cosa fa lo script:**
1. ✅ Verifica se il campo `username` esiste
2. ✅ Se non esiste, lo aggiunge
3. ✅ Genera username automatici per tutti i fratelli
4. ✅ Gestisce eventuali duplicati
5. ✅ Mostra un report completo

---

### **Opzione 2: Verifica Manuale**

**Step 1: Verifica se il campo username esiste**

```sql
USE kilwinning_db;

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'kilwinning_db'
AND TABLE_NAME = 'fratelli'
AND COLUMN_NAME = 'username';
```

**Se il risultato è vuoto** (campo non esiste), vai allo Step 2.

**Step 2: Aggiungi il campo username**

```sql
USE kilwinning_db;

-- Aggiungi colonna username
ALTER TABLE fratelli
ADD COLUMN username VARCHAR(50) UNIQUE AFTER email;

-- Genera username automatici
UPDATE fratelli
SET username = LOWER(REPLACE(nome, ' ', '.'))
WHERE username IS NULL;

-- Verifica risultati
SELECT id, nome, username, password_hash
FROM fratelli
WHERE attivo = 1;
```

---

## 🔐 Credenziali di Login Generate

Dopo l'esecuzione dello script, gli username saranno nel formato:

**Formato:** `nome.cognome` (tutto minuscolo)

**Esempi:**
```
Nome: "Paolo Giulio Gazzano"
→ Username: paolo.giulio.gazzano
→ Password: paologiuliogazzano

Nome: "Manuel Morici"
→ Username: manuel.morici
→ Password: manuelmorici
```

---

## 🧪 Test Login

Dopo aver eseguito lo script, testa il login con:

**URL:** https://tornate.loggiakilwinning.com

**Credenziali Test (Paolo):**
- Username: `paolo.giulio.gazzano`
- Password: `paologiuliogazzano`

---

## 📝 Note Importanti

1. **Password temporanee**: Le password sono il nome senza spazi in minuscolo
2. **Username case-insensitive**: Maiuscole/minuscole non importano
3. **Comunicare agli utenti**: Dopo la migrazione, comunica a ogni fratello il proprio username
4. **Cambio password**: I fratelli dovrebbero cambiare la password dopo il primo accesso

---

## 🆘 Troubleshooting

### Login fallisce ancora dopo la migrazione

**1. Verifica che il server sia aggiornato:**
```bash
cd /path/to/Tornate
git pull origin claude/fix-login-username-01SqZKF1AbDwhiZs6JueCLKS
pm2 restart tornate
```

**2. Verifica username nel database:**
```sql
SELECT id, nome, username, password_hash, attivo
FROM fratelli
WHERE nome LIKE '%Paolo%';
```

**3. Controlla i log del server:**
```bash
pm2 logs tornate --lines 50
```

**4. Test diretto dell'API:**
```bash
curl -X POST https://tornate.loggiakilwinning.com/api/fratelli/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "paolo.giulio.gazzano",
    "password": "paologiuliogazzano"
  }'
```

---

## 📞 Supporto

Se il problema persiste:
1. Controlla i log del server: `pm2 logs tornate`
2. Verifica la connessione al database
3. Contatta l'amministratore di sistema

---

**Ultima modifica:** 2025-11-18
**Autore:** Claude (AI Assistant)
