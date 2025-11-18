-- ====================================
-- VERIFICA E FIX MIGRAZIONE USERNAME
-- ====================================
-- Questo script verifica se il campo username esiste
-- e lo aggiunge se mancante con gli username corretti
-- Data: 2025-11-18

USE kilwinning_db;

-- ====================================
-- STEP 1: Aggiungi colonna username se non esiste
-- ====================================
SET @db_name = 'kilwinning_db';
SET @table_name = 'fratelli';
SET @column_name = 'username';

-- Verifica se la colonna esiste
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = @table_name
    AND COLUMN_NAME = @column_name
);

-- Se la colonna non esiste, aggiungila
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE fratelli ADD COLUMN username VARCHAR(50) UNIQUE AFTER email',
    'SELECT "Colonna username già esistente" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================
-- STEP 2: Genera username per fratelli senza username
-- ====================================
-- Logica: prima_lettera_nome.cognome in minuscolo
-- Esempio: "Paolo Giulio Gazzano" → "paolo.giulio.gazzano"

UPDATE fratelli
SET username = LOWER(REPLACE(nome, ' ', '.'))
WHERE username IS NULL OR username = '';

-- ====================================
-- STEP 3: Gestisci duplicati (se esistono)
-- ====================================
-- Aggiungi numero progressivo per eventuali duplicati
UPDATE fratelli f1
LEFT JOIN (
    SELECT username, MIN(id) as min_id
    FROM fratelli
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
) f2 ON f1.username = f2.username AND f1.id != f2.min_id
SET f1.username = CONCAT(f1.username, '.', f1.id)
WHERE f2.username IS NOT NULL;

-- ====================================
-- STEP 4: Verifica risultati
-- ====================================
SELECT
    '=== VERIFICA USERNAME FRATELLI ===' AS info;

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
WHERE attivo = 1
ORDER BY tipo DESC, nome ASC;

-- ====================================
-- STEP 5: Mostra statistiche
-- ====================================
SELECT
    '=== STATISTICHE ===' AS info;

SELECT
    COUNT(*) as totale_fratelli,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as con_username,
    COUNT(CASE WHEN username IS NULL THEN 1 END) as senza_username,
    COUNT(CASE WHEN attivo = 1 THEN 1 END) as attivi,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin
FROM fratelli;

-- ====================================
-- STEP 6: Mostra username per login
-- ====================================
SELECT
    '=== USERNAME PER LOGIN ===' AS info;

SELECT
    CONCAT('Username: ', username, ' | Nome: ', nome, ' | Password: ', password_hash) as credenziali
FROM fratelli
WHERE attivo = 1
ORDER BY nome;

-- ====================================
-- NOTE IMPORTANTI
-- ====================================
-- 1. Ogni fratello ora ha un username unico formato da: nome.cognome (in minuscolo)
-- 2. La password è il nome senza spazi in minuscolo (es. "paologiuliogazzano")
-- 3. Per il login usare:
--    - Username: paolo.giulio.gazzano
--    - Password: paologiuliogazzano
-- 4. Gli username sono case-insensitive (maiuscole/minuscole non importano)
-- ====================================
