# Icone PWA per Tornate

## Generazione Automatica

Per generare le icone PNG da SVG:

```bash
# Installa dipendenza (una sola volta)
npm install sharp --save-dev

# Genera tutte le icone
node scripts/generate-icons.js
```

## Generazione Manuale

Se preferisci non installare dipendenze, puoi:

1. Aprire `icon-master.svg` in un editor grafico (Inkscape, GIMP, Photoshop)
2. Esportare come PNG nelle seguenti dimensioni:
   - 72x72
   - 96x96
   - 128x128
   - 144x144
   - 152x152
   - 192x192
   - 384x384
   - 512x512

3. Salvare i file come: `icon-{dimensione}x{dimensione}.png`

## Tool Online

Alternativamente usa un convertitore online:
- https://cloudconvert.com/svg-to-png
- https://svgtopng.com/

Carica `icon-master.svg` e scarica le varie dimensioni.

## Note iOS

Per iOS, le dimensioni più importanti sono:
- **152x152** - iPad
- **192x192** - iPhone standard
- **512x512** - Alta risoluzione

## Personalizzazione

Modifica `icon-master.svg` per personalizzare:
- Colori (attualmente: blu #0f3460, rosso #e94560, oro #f1c40f)
- Simboli massonici
- Testo "TORNATE"
