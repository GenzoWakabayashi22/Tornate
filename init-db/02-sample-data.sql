USE kilwinning_db;

-- Inserimento di alcuni fratelli di esempio
INSERT INTO fratelli (nome, grado, cariche_fisse, telefono, email) VALUES
('Paolo', 'Maestro', 'admin', '+393331112233', 'paolo@example.com'),
('Emiliano', 'Maestro', 'admin', '+393334445566', 'emiliano@example.com'),
('Marco', 'Compagno', NULL, '+393337778899', 'marco@example.com'),
('Giovanni', 'Maestro', NULL, '+393330001122', 'giovanni@example.com'),
('Alessandro', 'Apprendista', NULL, '+393333334444', 'alessandro@example.com');

-- Inserimento di alcune tornate di esempio
INSERT INTO tornate (data, discussione, chi_introduce, cena, tipo, stato) VALUES
(DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Discussione sui simboli massonici', 1, true, 'ordinaria', 'programmata'),
(DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'La via iniziatica', 2, true, 'ordinaria', 'programmata'),
(DATE_ADD(CURDATE(), INTERVAL -14 DAY), 'L\'esoterismo e la massoneria', 3, false, 'ordinaria', 'conclusa');

-- Inserimento di alcune presenze
INSERT INTO presenze (fratello_id, tornata_id, presente, ruolo) VALUES
(1, 3, 1, 'Venerabile'),
(2, 3, 1, 'Oratore'),
(3, 3, 1, 'Segretario'),
(4, 3, 1, NULL),
(5, 3, 0, NULL);

-- Inserimento di alcuni ospiti
INSERT INTO ospiti (tornata_id, nome, loggia_provenienza, grado) VALUES
(3, 'Roberto Bianchi', 'Loggia Esempio', 'Maestro'),
(3, 'Stefano Rossi', 'Loggia Fraternità', 'Maestro');

-- Inserimento di alcune tavole architettoniche
INSERT INTO tavole (titolo, autore_id, data_presentazione, tornata_id, stato, grado) VALUES
('I simboli del grado di apprendista', 1, DATE_ADD(CURDATE(), INTERVAL -14 DAY), 3, 'presentata', 'Apprendista'),
('Il tempio massonico: storia e significato', 2, NULL, NULL, 'bozza', 'Maestro');

-- Inserimento utenti (password: kilwinning2025)
INSERT INTO utenti (username, password_hash, ruolo) VALUES
('admin', '$2a$10$6SZzUeQNI7CxfMRwXJKK0.UBlUfEWQf2OP2vEBKbO/LgJS6TCbS0W', 'admin'),
('user', '$2a$10$6SZzUeQNI7CxfMRwXJKK0.UBlUfEWQf2OP2vEBKbO/LgJS6TCbS0W', 'utente');
