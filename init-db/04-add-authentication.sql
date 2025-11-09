-- Migrazione: Aggiungi autenticazione e distinzione fratelli/ospiti
USE kilwinning_db;

-- 1. Aggiungi colonne per autenticazione e tipo
ALTER TABLE fratelli
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NULL AFTER email,
ADD COLUMN IF NOT EXISTS role ENUM('admin', 'user', 'guest') DEFAULT 'user' AFTER password_hash,
ADD COLUMN IF NOT EXISTS tipo ENUM('fratello', 'ospite') DEFAULT 'fratello' AFTER role,
ADD COLUMN IF NOT EXISTS attivo BOOLEAN DEFAULT TRUE AFTER tipo;

-- 2. Imposta password per fratelli esistenti (password = nome in minuscolo)
-- IMPORTANTE: Dopo l'accesso, i fratelli dovranno cambiare la password!
UPDATE fratelli
SET password_hash = LOWER(REPLACE(nome, ' ', ''))
WHERE password_hash IS NULL;

-- 3. Imposta ruolo admin per Paolo Giulio Gazzano
UPDATE fratelli
SET role = 'admin'
WHERE nome LIKE '%Paolo%' AND nome LIKE '%Gazzano%';

-- 4. Verifica fratelli aggiunti
SELECT id, nome, grado, tipo, role,
       CASE WHEN password_hash IS NOT NULL THEN '✓' ELSE '✗' END as has_password
FROM fratelli
ORDER BY tipo, nome;

-- 5. Note per utenti
-- Password temporanee create: nome senza spazi in minuscolo
-- Esempio: "Paolo Gazzano" → password: "paologazzano"
-- Esempio: "Manuel Morici" → password: "manuelmorici"
