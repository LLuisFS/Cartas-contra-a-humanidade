const fs = require('fs');
const path = require('path');
const { loadCards } = require('./csvParser');

const rootDir = path.resolve(__dirname, '..');
const serverCardsPath = path.resolve(__dirname, 'data/cards.json');
const force = process.argv.includes('--force');

if (fs.existsSync(serverCardsPath) && !force) {
  console.log('ℹ️  [buildCards] Arquivo cards.json já existe. Atualização por CSV desativada para proteger suas cartas.');
  console.log('    Caso queira forçar a recriação a partir do CSV, execute: node server/buildCards.js --force');
  process.exit(0);
}

console.log('🔄 Compilando baralhos CSV para JSON estático...');

const { whiteCards, blackCards } = loadCards(rootDir, true);

if (whiteCards.length !== 491 || blackCards.length !== 115) {
  console.warn(`[Atenção] Esperado 491 brancas e 115 pretas. Obtido: ${whiteCards.length} brancas e ${blackCards.length} pretas.`);
}

const payload = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  counts: {
    white: whiteCards.length,
    black: blackCards.length
  },
  whiteCards,
  blackCards
};

// Ensure directories exist
const dataDirRoot = path.resolve(rootDir, 'data');
const dataDirServer = path.resolve(__dirname, 'data');

if (!fs.existsSync(dataDirRoot)) fs.mkdirSync(dataDirRoot, { recursive: true });
if (!fs.existsSync(dataDirServer)) fs.mkdirSync(dataDirServer, { recursive: true });

fs.writeFileSync(path.join(dataDirRoot, 'cards.json'), JSON.stringify(payload, null, 2), 'utf-8');
fs.writeFileSync(path.join(dataDirServer, 'cards.json'), JSON.stringify(payload, null, 2), 'utf-8');

console.log(`✅ Arquivo JSON estático gerado com sucesso:`);
console.log(`   - data/cards.json (${whiteCards.length} brancas, ${blackCards.length} pretas)`);
console.log(`   - server/data/cards.json`);
