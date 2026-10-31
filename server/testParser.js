const path = require('path');
const { loadCards } = require('./csvParser');

console.log('--- Validação dos Baralhos (JSON) ---');
const rootDir = path.resolve(__dirname, '..');
const { whiteCards, blackCards } = loadCards(rootDir);

console.log(`Cartas Brancas carregadas: ${whiteCards.length} (esperado: 491)`);
console.log(`Cartas Pretas carregadas: ${blackCards.length} (esperado: 115)`);

const assert = require('assert');
assert.strictEqual(whiteCards.length, 491, 'Deveria carregar exatamente 491 cartas brancas');
assert.strictEqual(blackCards.length, 115, 'Deveria carregar exatamente 115 cartas pretas');

// Test specific sanitization
const doorCard = blackCards.find(c => c.text.includes('porta de entrada'));
assert(doorCard, 'Carta com caractere especial deve existir');
assert.strictEqual(doorCard.text, '___ é uma porta de entrada para ___');
assert.strictEqual(doorCard.pick, 2, 'Pick da porta de entrada deve ser 2');

// Test cards with explicit pick without blanks
const haikai = blackCards.find(c => c.text.includes('Haikai'));
if (haikai) {
  assert.strictEqual(haikai.pick, 3, 'Haikai pick deve ser 3');
}

console.log('✅ Todos os testes de validação dos baralhos passaram com sucesso!');
