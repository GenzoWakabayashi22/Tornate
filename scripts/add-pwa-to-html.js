#!/usr/bin/env node

/**
 * Script per aggiungere meta tag PWA a tutti i file HTML
 * Uso: node scripts/add-pwa-to-html.js
 */

const fs = require('fs');
const path = require('path');

const PWA_META_TAGS = `
    <!-- PWA Meta Tags -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0f3460">

    <!-- iOS Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Tornate">

    <!-- iOS Icons -->
    <link rel="apple-touch-icon" href="/icons/icon-152x152.png">
    <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png">

    <!-- Standard Favicon -->
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png">

    <!-- Android/Chrome -->
    <meta name="mobile-web-app-capable" content="yes">
`;

const PWA_SCRIPT = `
    <!-- PWA Registration -->
    <script src="/js/pwa-register.js"></script>`;

// Funzione ricorsiva per trovare file HTML
function findHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignora la directory includes
      if (!filePath.includes('includes')) {
        findHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html') && !filePath.includes('includes')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Trova tutti i file HTML
const htmlFiles = findHtmlFiles('views');

console.log(`📄 Trovati ${htmlFiles.length} file HTML da aggiornare\n`);

let updated = 0;
let skipped = 0;

htmlFiles.forEach((filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Verifica se PWA è già presente
    if (content.includes('pwa-register.js') || content.includes('PWA Meta Tags')) {
      console.log(`⏭️  Saltato (già aggiornato): ${filePath}`);
      skipped++;
      return;
    }

    // Aggiungi meta tag dopo <title>
    if (content.includes('</title>')) {
      content = content.replace('</title>', `</title>${PWA_META_TAGS}`);
    }

    // Aggiungi script prima di </body>
    if (content.includes('</body>')) {
      content = content.replace('</body>', `${PWA_SCRIPT}\n</body>`);
    }

    // Scrivi il file aggiornato
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Aggiornato: ${filePath}`);
    updated++;

  } catch (error) {
    console.error(`❌ Errore con ${filePath}:`, error.message);
  }
});

console.log(`\n📊 Riepilogo:`);
console.log(`   ✅ Aggiornati: ${updated}`);
console.log(`   ⏭️  Saltati: ${skipped}`);
console.log(`\n✨ Completato!\n`);
