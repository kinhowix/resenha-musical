const FLAT_TO_SHARP = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/**
 * Simplifica um acorde complexo para sua versão básica (tríade Maior ou Menor)
 * para violeiros iniciantes, sem alterar a cifra original salva no banco!
 * Exemplos:
 *  - "Am7(9)" -> "Am"
 *  - "G/B" -> "G"
 *  - "F7M(#11)" -> "F"
 *  - "Bm7(b5)" -> "Bm"
 *  - "Cadd9" -> "C"
 *  - "D4" -> "D"
 */
export function simplifyChordSymbol(chordStr) {
  if (!chordStr) return chordStr;
  const trimmed = chordStr.trim();

  // Preserva indicações como "(2x)" se vierem junto ou isoladas
  if (/^\(?\d+x\)?$/i.test(trimmed)) return trimmed;

  // 1. Remove baixo invertido (ex: G/B -> G, D/F# -> D), mas preserva acordes como D4/7 antes de limpar
  const withoutSlash = trimmed.replace(/\/[A-G][#b]?.*$/, '');

  // 2. Extrai a nota fundamental (Root: A-G + # ou b) e verifica se é menor ('m' ou 'min', mas não 'maj')
  const match = withoutSlash.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return trimmed;

  const root = match[1];
  const suffix = match[2] || '';

  // Verifica se o acorde é menor (começa com 'm' mas NÃO é 'maj') ou meio-diminuto/diminuto
  const isMinor =
    /^(?:m(?!aj)|min)/i.test(suffix) ||
    /m7\(b5\)/i.test(suffix);

  return isMinor ? `${root}m` : root;
}

/**
 * Dicionário de posições dos acordes no violão (6 cordas: E A D G B e)
 * frets: array de 6 posições (da 6ª corda E grave até a 1ª corda e aguda)
 *   -1 = corda não tocada (X)
 *    0 = corda solta (O)
 *   >0 = casa pressionada
 * fingers: dedos correspondentes (1 = indicador, 2 = médio, 3 = anelar, 4 = mínimo)
 * barres: array opcional de pestanas [{ fret, fromString, toString }] (cordas de 1 a 6, onde 6 é a mais grave)
 * baseFret: casa inicial exibida no diagrama (padrão 1)
 */
export const CHORD_SHAPES = {
  // ================= MAIORES =================
  C: {
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    baseFret: 1,
  },
  'C#': {
    frets: [-1, 4, 6, 6, 6, 4],
    fingers: [0, 1, 2, 3, 4, 1],
    barres: [{ fret: 4, fromString: 5, toString: 1 }],
    baseFret: 4,
  },
  D: {
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    baseFret: 1,
  },
  'D#': {
    frets: [-1, 6, 8, 8, 8, 6],
    fingers: [0, 1, 2, 3, 4, 1],
    barres: [{ fret: 6, fromString: 5, toString: 1 }],
    baseFret: 6,
  },
  E: {
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    baseFret: 1,
  },
  F: {
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ fret: 1, fromString: 6, toString: 1 }],
    baseFret: 1,
  },
  'F#': {
    frets: [2, 4, 4, 3, 2, 2],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ fret: 2, fromString: 6, toString: 1 }],
    baseFret: 1,
  },
  G: {
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    baseFret: 1,
  },
  'G#': {
    frets: [4, 6, 6, 5, 4, 4],
    fingers: [1, 3, 4, 2, 1, 1],
    barres: [{ fret: 4, fromString: 6, toString: 1 }],
    baseFret: 4,
  },
  A: {
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    baseFret: 1,
  },
  'A#': {
    frets: [-1, 1, 3, 3, 3, 1],
    fingers: [0, 1, 2, 3, 4, 1],
    barres: [{ fret: 1, fromString: 5, toString: 1 }],
    baseFret: 1,
  },
  B: {
    frets: [-1, 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    barres: [{ fret: 2, fromString: 5, toString: 1 }],
    baseFret: 1,
  },

  // ================= MENORES =================
  Cm: {
    frets: [-1, 3, 5, 5, 4, 3],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ fret: 3, fromString: 5, toString: 1 }],
    baseFret: 3,
  },
  'C#m': {
    frets: [-1, 4, 6, 6, 5, 4],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ fret: 4, fromString: 5, toString: 1 }],
    baseFret: 4,
  },
  Dm: {
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    baseFret: 1,
  },
  'D#m': {
    frets: [-1, 6, 8, 8, 7, 6],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ fret: 6, fromString: 5, toString: 1 }],
    baseFret: 6,
  },
  Em: {
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    baseFret: 1,
  },
  Fm: {
    frets: [1, 3, 3, 1, 1, 1],
    fingers: [1, 3, 4, 1, 1, 1],
    barres: [{ fret: 1, fromString: 6, toString: 1 }],
    baseFret: 1,
  },
  'F#m': {
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    barres: [{ fret: 2, fromString: 6, toString: 1 }],
    baseFret: 1,
  },
  Gm: {
    frets: [3, 5, 5, 3, 3, 3],
    fingers: [1, 3, 4, 1, 1, 1],
    barres: [{ fret: 3, fromString: 6, toString: 1 }],
    baseFret: 3,
  },
  'G#m': {
    frets: [4, 6, 6, 4, 4, 4],
    fingers: [1, 3, 4, 1, 1, 1],
    barres: [{ fret: 4, fromString: 6, toString: 1 }],
    baseFret: 4,
  },
  Am: {
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    baseFret: 1,
  },
  'A#m': {
    frets: [-1, 1, 3, 3, 2, 1],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ fret: 1, fromString: 5, toString: 1 }],
    baseFret: 1,
  },
  Bm: {
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    barres: [{ fret: 2, fromString: 5, toString: 1 }],
    baseFret: 1,
  },

  // ================= COM SÉTIMA (7 e m7 e 7M) =================
  C7: {
    frets: [-1, 3, 2, 3, 1, 0],
    fingers: [0, 3, 2, 4, 1, 0],
    baseFret: 1,
  },
  C7M: {
    frets: [-1, 3, 2, 0, 0, 0],
    fingers: [0, 3, 2, 0, 0, 0],
    baseFret: 1,
  },
  D7: {
    frets: [-1, -1, 0, 2, 1, 2],
    fingers: [0, 0, 0, 2, 1, 3],
    baseFret: 1,
  },
  D7M: {
    frets: [-1, -1, 0, 2, 2, 2],
    fingers: [0, 0, 0, 1, 2, 3],
    baseFret: 1,
  },
  Dm7: {
    frets: [-1, -1, 0, 2, 1, 1],
    fingers: [0, 0, 0, 2, 1, 1],
    baseFret: 1,
  },
  E7: {
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [0, 2, 0, 1, 0, 0],
    baseFret: 1,
  },
  Em7: {
    frets: [0, 2, 2, 0, 3, 0],
    fingers: [0, 1, 2, 0, 3, 0],
    baseFret: 1,
  },
  F7M: {
    frets: [-1, -1, 3, 2, 1, 0],
    fingers: [0, 0, 3, 2, 1, 0],
    baseFret: 1,
  },
  'F#m7': {
    frets: [2, 4, 2, 2, 2, 2],
    fingers: [1, 3, 1, 1, 1, 1],
    barres: [{ fret: 2, fromString: 6, toString: 1 }],
    baseFret: 1,
  },
  G7: {
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, 0, 0, 0, 1],
    baseFret: 1,
  },
  A7: {
    frets: [-1, 0, 2, 0, 2, 0],
    fingers: [0, 0, 1, 0, 2, 0],
    baseFret: 1,
  },
  A7M: {
    frets: [-1, 0, 2, 1, 2, 0],
    fingers: [0, 0, 2, 1, 3, 0],
    baseFret: 1,
  },
  Am7: {
    frets: [-1, 0, 2, 0, 1, 0],
    fingers: [0, 0, 2, 0, 1, 0],
    baseFret: 1,
  },
  B7: {
    frets: [-1, 2, 1, 2, 0, 2],
    fingers: [0, 2, 1, 3, 0, 4],
    baseFret: 1,
  },
  Bm7: {
    frets: [-1, 2, 4, 2, 3, 2],
    fingers: [0, 1, 3, 1, 2, 1],
    barres: [{ fret: 2, fromString: 5, toString: 1 }],
    baseFret: 1,
  },
  'C#m7': {
    frets: [-1, 4, 6, 4, 5, 4],
    fingers: [0, 1, 3, 1, 2, 1],
    barres: [{ fret: 4, fromString: 5, toString: 1 }],
    baseFret: 4,
  },
};

/**
 * Busca os dados de diagrama de um acorde.
 * Se o acorde tiver variações (ex: Am7(9), G/B), normaliza ou faz fallback para a tríade base.
 */
export function getChordDiagramData(chordStr) {
  if (!chordStr) return null;
  const clean = chordStr.trim().replace(/^\(|\)$/g, '');
  if (!clean || /^\d+x$/i.test(clean)) return null;

  // Remove baixo invertido para buscar o shape (ex: G/B -> G)
  const withoutSlash = clean.replace(/\/[A-G][#b]?.*$/, '');

  // Normaliza bemóis na nota raiz (ex: Bbm7 -> A#m7, Eb -> D#)
  const normalized = withoutSlash.replace(/^([A-G]b)/, (m) => FLAT_TO_SHARP[m] || m);

  // 1. Tenta match exato no dicionário (ex: Am7, B7, F7M)
  if (CHORD_SHAPES[normalized]) {
    return { name: clean, ...CHORD_SHAPES[normalized] };
  }

  // 2. Converte maj7 / 7+ para 7M
  const majNormalized = normalized.replace(/(?:maj7|7\+)/i, '7M');
  if (CHORD_SHAPES[majNormalized]) {
    return { name: clean, ...CHORD_SHAPES[majNormalized] };
  }

  // 3. Tenta versão com 7ª simples (ex: Am7(9) -> Am7)
  const seventhMatch = normalized.match(/^([A-G]#?m?7)/);
  if (seventhMatch && CHORD_SHAPES[seventhMatch[1]]) {
    return { name: clean, ...CHORD_SHAPES[seventhMatch[1]] };
  }

  // 4. Fallback garantido para a tríade básica (Maior ou Menor)
  const basic = simplifyChordSymbol(normalized).replace(
    /^([A-G]b)/,
    (m) => FLAT_TO_SHARP[m] || m
  );
  if (CHORD_SHAPES[basic]) {
    return { name: clean, ...CHORD_SHAPES[basic] };
  }

  return null;
}

