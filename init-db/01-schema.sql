-- Creazione del database se non esiste
CREATE DATABASE IF NOT EXISTS kilwinning_db;
USE kilwinning_db;

-- Tabella fratelli
CREATE TABLE IF NOT EXISTS fratelli (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    grado VARCHAR(50) DEFAULT 'Apprendista',
    cariche JSON NULL,
    cariche_fisse VARCHAR(255) NULL,
    telefono VARCHAR(20) NULL,
    email VARCHAR(100) NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabella tornate
CREATE TABLE IF NOT EXISTS tornate (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data DATE NOT NULL,
    orario_inizio VARCHAR(10) DEFAULT '21:00',
    discussione VARCHAR(255) DEFAULT 'Tornata Ordinaria',
    chi_introduce INT NULL,
    location VARCHAR(100) DEFAULT 'Tolfa',
    cena BOOLEAN DEFAULT false,
    costo_cena DECIMAL(10,2) NULL,
    descrizione_cena TEXT NULL,
    argomento_istruzione VARCHAR(255) NULL,
    orario_istruzione VARCHAR(10) NULL,
    link_audio VARCHAR(255) NULL,
    link_pagina VARCHAR(255) NULL,
    tipo_loggia ENUM('nostra', 'esterna') DEFAULT 'nostra',
    tipo ENUM('ordinaria', 'speciale', 'istruzione') DEFAULT 'ordinaria',
    stato ENUM('programmata', 'conclusa', 'cancellata') DEFAULT 'programmata',
    note TEXT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chi_introduce) REFERENCES fratelli(id) ON DELETE SET NULL
);

-- Tabella presenze
CREATE TABLE IF NOT EXISTS presenze (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fratello_id INT NOT NULL,
    tornata_id INT NOT NULL,
    presente BOOLEAN DEFAULT 0,
    ruolo VARCHAR(100) NULL,
    data_conferma TIMESTAMP NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fratello_id) REFERENCES fratelli(id) ON DELETE CASCADE,
    FOREIGN KEY (tornata_id) REFERENCES tornate(id) ON DELETE CASCADE,
    UNIQUE KEY unique_presenza (fratello_id, tornata_id)
);

-- Tabella ospiti
CREATE TABLE IF NOT EXISTS ospiti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tornata_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    loggia_provenienza VARCHAR(100) NULL,
    grado VARCHAR(50) NULL,
    note TEXT NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tornata_id) REFERENCES tornate(id) ON DELETE CASCADE
);

-- Tabella tavole architettoniche
CREATE TABLE IF NOT EXISTS tavole (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titolo VARCHAR(255) NOT NULL,
    autore_id INT NOT NULL,
    data_presentazione DATE NULL,
    tornata_id INT NULL,
    testo_completo TEXT NULL,
    file_path VARCHAR(255) NULL,
    tags JSON NULL,
    grado ENUM('Apprendista', 'Compagno', 'Maestro') DEFAULT 'Apprendista',
    stato ENUM('bozza', 'presentata', 'approvata', 'archiviata') DEFAULT 'bozza',
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (autore_id) REFERENCES fratelli(id),
    FOREIGN KEY (tornata_id) REFERENCES tornate(id) ON DELETE SET NULL
);

-- Tabella utenti
CREATE TABLE IF NOT EXISTS utenti (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    ruolo ENUM('admin', 'utente') DEFAULT 'utente',
    ultimo_accesso TIMESTAMP NULL,
    data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_modifica TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indici aggiuntivi per ottimizzare le performance
CREATE INDEX idx_tornate_data ON tornate(data);
CREATE INDEX idx_presenze_tornata ON presenze(tornata_id);
CREATE INDEX idx_presenze_fratello ON presenze(fratello_id);
