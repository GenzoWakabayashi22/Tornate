#!/usr/bin/env node

/**
 * SCRIPT DI BACKUP AUTOMATICO - NON BREAKING
 *
 * Crea backup del database MySQL prima del deployment.
 * Può essere eseguito manualmente o automaticamente via cron/CI.
 *
 * Uso:
 *   node scripts/backup.js                    # Backup con nome auto
 *   node scripts/backup.js --name=pre-deploy  # Backup con nome custom
 *   node scripts/backup.js --cleanup          # Rimuove backup vecchi (>30gg)
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurazione
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const MAX_BACKUP_AGE_DAYS = 30;

// Parse arguments
const args = process.argv.slice(2);
const customName = args.find(arg => arg.startsWith('--name='))?.split('=')[1];
const shouldCleanup = args.includes('--cleanup');

/**
 * Main function
 */
async function main() {
    try {
        console.log('🔄 Inizio processo di backup...');

        // Verifica configurazione
        if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
            throw new Error('Variabili DB non configurate. Controlla il file .env');
        }

        // Crea directory backup se non esiste
        ensureBackupDir();

        // Esegui backup
        const backupFile = await createBackup(customName);
        console.log(`✅ Backup completato: ${backupFile}`);

        // Cleanup vecchi backup se richiesto
        if (shouldCleanup) {
            await cleanupOldBackups();
        }

        // Mostra statistiche
        showBackupStats();

        process.exit(0);

    } catch (error) {
        console.error('❌ Errore durante il backup:', error.message);
        process.exit(1);
    }
}

/**
 * Crea directory backup se non esiste
 */
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log(`📁 Directory backup creata: ${BACKUP_DIR}`);
    }
}

/**
 * Crea backup del database
 */
function createBackup(customName) {
    return new Promise((resolve, reject) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = customName
            ? `${customName}_${timestamp}.sql`
            : `backup_${timestamp}.sql`;
        const filepath = path.join(BACKUP_DIR, filename);

        // Comando mysqldump
        const command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${filepath}`;

        console.log(`📦 Creazione backup: ${filename}...`);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Errore mysqldump: ${error.message}`));
                return;
            }

            // Verifica che il file sia stato creato
            if (!fs.existsSync(filepath)) {
                reject(new Error('File backup non creato'));
                return;
            }

            // Verifica dimensione file
            const stats = fs.statSync(filepath);
            if (stats.size === 0) {
                fs.unlinkSync(filepath);
                reject(new Error('Backup vuoto - possibile errore'));
                return;
            }

            console.log(`📊 Dimensione backup: ${formatBytes(stats.size)}`);
            resolve(filepath);
        });
    });
}

/**
 * Rimuove backup più vecchi di MAX_BACKUP_AGE_DAYS giorni
 */
function cleanupOldBackups() {
    return new Promise((resolve, reject) => {
        console.log('🧹 Pulizia backup vecchi...');

        try {
            const files = fs.readdirSync(BACKUP_DIR);
            const now = Date.now();
            const maxAge = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000;
            let removedCount = 0;

            files.forEach(file => {
                if (!file.endsWith('.sql')) return;

                const filepath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filepath);
                const age = now - stats.mtimeMs;

                if (age > maxAge) {
                    fs.unlinkSync(filepath);
                    console.log(`  🗑️  Rimosso: ${file} (${Math.floor(age / 86400000)} giorni)`);
                    removedCount++;
                }
            });

            if (removedCount === 0) {
                console.log('  ✅ Nessun backup vecchio da rimuovere');
            } else {
                console.log(`✅ Rimossi ${removedCount} backup vecchi`);
            }

            resolve();

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Mostra statistiche backup directory
 */
function showBackupStats() {
    try {
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = files.filter(f => f.endsWith('.sql'));

        if (backups.length === 0) {
            console.log('\n📊 Nessun backup presente');
            return;
        }

        let totalSize = 0;
        backups.forEach(file => {
            const filepath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filepath);
            totalSize += stats.size;
        });

        console.log('\n📊 STATISTICHE BACKUP:');
        console.log(`   Totale backup: ${backups.length}`);
        console.log(`   Spazio occupato: ${formatBytes(totalSize)}`);
        console.log(`   Directory: ${BACKUP_DIR}`);

        // Mostra ultimi 5 backup
        console.log('\n📋 Ultimi 5 backup:');
        backups
            .map(file => {
                const filepath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filepath);
                return {
                    name: file,
                    size: stats.size,
                    date: stats.mtime
                };
            })
            .sort((a, b) => b.date - a.date)
            .slice(0, 5)
            .forEach(backup => {
                const date = backup.date.toISOString().slice(0, 19).replace('T', ' ');
                console.log(`   - ${backup.name} (${formatBytes(backup.size)}) - ${date}`);
            });

    } catch (error) {
        console.error('⚠️  Errore nel recupero statistiche:', error.message);
    }
}

/**
 * Formatta bytes in formato leggibile
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Esegui main
main();
