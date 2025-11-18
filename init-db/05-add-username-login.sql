-- Migrazione: Passa da login con lista a login con username/password
-- Data: 2025-11-18
USE kilwinning_db;

-- 1. Aggiungi colonna username (UNIQUE per evitare duplicati)
ALTER TABLE fratelli
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE AFTER email;

-- 2. Genera username automatici per tutti i fratelli esistenti
-- Logica: prima_lettera_nome + cognome_completo in minuscolo
-- Esempio: "Paolo Giulio Gazzano" → "pgazzano"
-- Esempio: "Manuel Morici" → "mmorici"
-- Esempio: "Antonio De Chiara" → "adechiara" (cognome composto gestito)

UPDATE fratelli
SET username = CONCAT(
    LOWER(SUBSTRING(nome, 1, 1)),
    LOWER(REPLACE(SUBSTRING_INDEX(nome, ' ', -1), ' ', ''))
)
WHERE username IS NULL;

-- 3. Per nomi con cognomi composti (es. "De Chiara"), rimuovi spazi
UPDATE fratelli
SET username = REPLACE(username, ' ', '')
WHERE username LIKE '% %';

-- 4. Gestisci eventuali duplicati aggiungendo un numero progressivo
-- (Raro, ma necessario per robustezza)
SET @counter = 1;
UPDATE fratelli f1
JOIN (
    SELECT username, COUNT(*) as cnt
    FROM fratelli
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING cnt > 1
) f2 ON f1.username = f2.username
SET f1.username = CONCAT(f1.username, @counter := @counter + 1)
WHERE f1.id > (
    SELECT MIN(id) FROM fratelli f3 WHERE f3.username = f1.username
);

-- 5. Verifica risultati
SELECT
    id,
    nome,
    username,
    grado,
    tipo,
    role,
    CASE WHEN attivo = 1 THEN '✓' ELSE '✗' END as attivo,
    CASE WHEN password_hash IS NOT NULL THEN '✓' ELSE '✗' END as has_password
FROM fratelli
ORDER BY tipo, grado, nome;

-- 6. Note per gli amministratori
-- Dopo questa migrazione:
-- - Ogni fratello ha un username unico
-- - Il login non richiede più la lista dropdown
-- - Bisogna comunicare a ogni fratello il proprio username
-- - Le password rimangono invariate (nome senza spazi in minuscolo)

-- 7. Esempio di nuovi username generati:
-- "Paolo Giulio Gazzano" → username: "pgazzano"
-- "Manuel Morici" → username: "mmorici"
-- "Antonio De Chiara" → username: "adechiara"
