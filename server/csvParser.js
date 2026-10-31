const fs = require('fs');
const path = require('path');

/**
 * Parses a single CSV line respecting semicolons and double-quoted fields.
 * @param {string} line 
 * @returns {string[]}
 */
function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * Sanitizes card text according to strict rules.
 * @param {string} raw 
 * @returns {string}
 */
function sanitizeText(raw) {
  if (!raw) return '';
  let text = raw;

  // Replace \u00a0 (non-breaking space) with standard space
  text = text.replace(/\u00a0/g, ' ');

  // Fix character '‚' (U+201A single low-9 quotation mark) isolated with 'é'
  text = text.replace(/\u201A/g, 'é');
  text = text.replace(/‚/g, 'é');

  // Strip surrounding quotes if left from raw CSV field
  text = text.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    text = text.slice(1, -1).trim();
    // Also unescape double quotes if any remain
    text = text.replace(/""/g, '"');
  }

  // Replace multiple spaces/tabs with single space
  text = text.replace(/[ \t]+/g, ' ');

  return text.trim();
}

/**
 * Ingests and processes white-cards-pt-br.csv and black-cards-pt-br.csv
 * @param {string} rootDir Workspace root directory
 * @returns {{ whiteCards: Array<{id: number, text: string}>, blackCards: Array<{id: number, text: string, pick: number, blanksCount: number, explicitPick: number}> }}
 */
function loadCards(rootDir = process.cwd(), forceCSV = false) {
  // Check for precompiled static JSON first (ideal for Termux/mobile or production)
  const jsonCandidates = [
    path.resolve(__dirname, 'data/cards.json'),
    path.resolve(rootDir, 'server/data/cards.json'),
    path.resolve(rootDir, 'data/cards.json'),
    path.resolve(rootDir, 'cards.json')
  ];

  if (!forceCSV) {
    for (const jsonPath of jsonCandidates) {
      if (fs.existsSync(jsonPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (content.whiteCards && content.blackCards) {
            return {
              whiteCards: content.whiteCards,
              blackCards: content.blackCards
            };
          }
        } catch (e) {
          console.warn(`[loadCards] Falha ao ler ${jsonPath}`);
        }
      }
    }
  }

  const blackPath = path.resolve(rootDir, 'black-cards-pt-br.csv');
  const whitePath = path.resolve(rootDir, 'white-cards-pt-br.csv');

  if (!fs.existsSync(blackPath)) {
    throw new Error(`Arquivo não encontrado: ${blackPath}`);
  }
  if (!fs.existsSync(whitePath)) {
    throw new Error(`Arquivo não encontrado: ${whitePath}`);
  }

  // 1. Process Black Cards
  const blackRaw = fs.readFileSync(blackPath, 'utf-8');
  const blackLines = blackRaw.split(/\r?\n/).filter((l, idx) => idx > 0 && l.trim().length > 0);

  const blackCards = blackLines.map((line, idx) => {
    const parts = parseCSVLine(line);
    // Ignore 1st column (English) and extract 2nd column (Português)
    const ptCol = parts.length > 1 ? parts[1] : parts[0];
    const cleanText = sanitizeText(ptCol);

    // Count groups of underscores (_+)
    const blanks = cleanText.match(/_+/g) || [];
    const blanksCount = blanks.length;

    // Check for explicit pick in parentheses at end of line: e.g. (2) or (3)
    const explicitMatch = cleanText.match(/\((\d+)\)\s*$/);
    const explicitPick = explicitMatch ? parseInt(explicitMatch[1], 10) : 0;

    // Calculate pick
    const pick = Math.max(1, blanksCount, explicitPick);

    // Remove the suffix (2) or (3) from displayed text
    const textWithoutSuffix = cleanText.replace(/\s*\(\d+\)\s*$/, '').trim();

    return {
      id: idx + 1,
      text: textWithoutSuffix,
      rawText: cleanText,
      pick,
      blanksCount,
      explicitPick
    };
  });

  // 2. Process White Cards
  const whiteRaw = fs.readFileSync(whitePath, 'utf-8');
  const whiteLines = whiteRaw.split(/\r?\n/).filter((l, idx) => idx > 0 && l.trim().length > 0);

  const whiteCards = whiteLines.map((line, idx) => {
    const parts = parseCSVLine(line);
    // Ignore 1st column (English) and extract 2nd column (Português)
    const ptCol = parts.length > 1 ? parts[1] : parts[0];
    const cleanText = sanitizeText(ptCol);

    return {
      id: idx + 1,
      text: cleanText
    };
  });

  // Strict validation
  if (whiteCards.length !== 491) {
    console.warn(`[CSV Parser Warning] Esperado 491 cartas brancas, obtido: ${whiteCards.length}`);
  }
  if (blackCards.length !== 115) {
    console.warn(`[CSV Parser Warning] Esperado 115 cartas pretas, obtido: ${blackCards.length}`);
  }

  return { whiteCards, blackCards };
}

module.exports = {
  parseCSVLine,
  sanitizeText,
  loadCards
};
