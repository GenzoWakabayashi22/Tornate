#!/usr/bin/env node

/**
 * Script per generare icone PNG da SVG per la PWA
 * Richiede: npm install sharp --save-dev
 *
 * Uso: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Dimensioni richieste per iOS e PWA
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const SVG_PATH = path.join(__dirname, '../public/icons/icon-master.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

console.log('🎨 Generazione icone PWA...\n');

// Verifica se sharp è installato
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Errore: sharp non è installato');
  console.log('\n📦 Installa sharp con: npm install sharp --save-dev\n');
  console.log('💡 In alternativa, usa un tool online per convertire icon-master.svg in PNG:');
  console.log('   - https://cloudconvert.com/svg-to-png');
  console.log('   - https://svgtopng.com/');
  console.log('\nDimensioni necessarie:', SIZES.join(', '));
  process.exit(1);
}

// Verifica che il file SVG esista
if (!fs.existsSync(SVG_PATH)) {
  console.error('❌ File SVG non trovato:', SVG_PATH);
  process.exit(1);
}

// Genera le icone
async function generateIcons() {
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);

    try {
      await sharp(SVG_PATH)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ Generata: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Errore generando icon-${size}x${size}.png:`, error.message);
    }
  }

  console.log('\n✨ Generazione icone completata!\n');
}

generateIcons().catch((error) => {
  console.error('❌ Errore durante la generazione:', error);
  process.exit(1);
});
