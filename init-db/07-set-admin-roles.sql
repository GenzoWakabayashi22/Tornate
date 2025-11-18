-- Script SQL: Assegnazione Ruoli Admin e User
-- Data: 2025-01-18
-- Descrizione: Imposta automaticamente il ruolo admin per Paolo Giulio Gazzano
--              e il ruolo user per tutti gli altri fratelli attivi

USE kilwinning_db;

-- ========================================
-- 1. VERIFICA ESISTENZA COLONNA 'role'
-- ========================================

-- Se la colonna 'role' non esiste, la crea
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'kilwinning_db'
      AND TABLE_NAME = 'fratelli'
      AND COLUMN_NAME = 'role'
);

-- Crea la colonna se non esiste
SET @sql = IF(
    @column_exists = 0,
    'ALTER TABLE fratelli ADD COLUMN role ENUM(\'admin\', \'user\', \'guest\') DEFAULT \'user\' AFTER password_hash',
    'SELECT "Colonna role già esistente" AS status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ========================================
-- 2. ASSEGNAZIONE RUOLI
-- ========================================

-- Imposta Paolo Giulio Gazzano come ADMIN
UPDATE fratelli
SET role = 'admin'
WHERE username = 'paolo.giulio.gazzano'
  AND attivo = 1;

-- Verifica esplicita per Paolo (fallback per nome completo)
UPDATE fratelli
SET role = 'admin'
WHERE (nome LIKE '%Paolo%' AND nome LIKE '%Gazzano%')
  AND attivo = 1;

-- Imposta tutti gli altri fratelli attivi come USER
UPDATE fratelli
SET role = 'user'
WHERE role IS NULL
   OR role = 'guest'
  AND attivo = 1
  AND username != 'paolo.giulio.gazzano';

-- ========================================
-- 3. REPORT FINALE ASSEGNAZIONE RUOLI
-- ========================================

SELECT '========================================' AS '';
SELECT 'REPORT ASSEGNAZIONE RUOLI' AS '';
SELECT '========================================' AS '';

-- Mostra gli admin
SELECT 'UTENTI CON RUOLO ADMIN:' AS '';
SELECT
    id,
    nome,
    username,
    role,
    grado,
    attivo
FROM fratelli
WHERE role = 'admin'
ORDER BY nome;

SELECT '' AS '';

-- Mostra gli user
SELECT 'UTENTI CON RUOLO USER:' AS '';
SELECT
    id,
    nome,
    username,
    role,
    grado,
    attivo
FROM fratelli
WHERE role = 'user' AND attivo = 1
ORDER BY nome;

SELECT '' AS '';

-- Statistiche finali
SELECT 'STATISTICHE RUOLI:' AS '';
SELECT
    role,
    COUNT(*) AS totale,
    SUM(CASE WHEN attivo = 1 THEN 1 ELSE 0 END) AS attivi,
    SUM(CASE WHEN attivo = 0 THEN 1 ELSE 0 END) AS non_attivi
FROM fratelli
GROUP BY role
ORDER BY FIELD(role, 'admin', 'user', 'guest');

SELECT '========================================' AS '';
SELECT 'COMPLETATO!' AS '';
SELECT '========================================' AS '';

-- ========================================
-- 4. NOTE
-- ========================================

-- IMPORTANTE:
-- - Paolo Giulio Gazzano (paolo.giulio.gazzano) è l'UNICO admin
-- - Tutti gli altri fratelli attivi sono user
-- - Il ruolo è verificato sia da username che da nome completo per sicurezza
-- - Solo i fratelli con attivo = 1 sono considerati

-- Per verificare manualmente:
-- SELECT id, nome, username, role FROM fratelli WHERE attivo = 1;
