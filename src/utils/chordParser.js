import ChordSheetJS from 'chordsheetjs';
import { simplifyChordSymbol } from './chordDictionary';

const NOTES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const FLAT_TO_SHARP = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

// Regex que identifica um acorde musical isolado (ex: C, Am7, F#m7(b5), G/B, D7M, Bb9, C7+, etc.)
const CHORD_TOKEN_REGEX =
  /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|\+|°|º)?(?:\d+)?(?:\((?:[#b+-]?\d+|[\w/#b+-]+)\))?(?:[#b+-]\d+)?(?:\/[A-G][#b]?)?$/;

/**
 * Verifica se uma palavra isolada é um acorde ou marcador de repetição (ex: "(2x)")
 */
export function isChordToken(token) {
  if (!token) return false;
  const clean = token.trim().replace(/^[|(]+|[|)]+$/g, '');
  if (!clean) return false;
  if (/^\d+x$/i.test(clean)) return true; // (2x), 4x
  return CHORD_TOKEN_REGEX.test(clean);
}

/**
 * Verifica se uma linha inteira é uma "linha de acordes" típica de sites de cifra
 * (ex: "   C        Am7       Bm7         Em")
 */
export function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Se já tem colchetes estilo ChordPro ou comentário, não trata como linha pura de acordes
  if (trimmed.includes('[') || trimmed.startsWith('{')) return false;

  // Remove prefixos como "Intro:" ou "Solo:" para testar os tokens seguintes
  const withoutIntroLabel = trimmed.replace(
    /^(?:intro|introdução|solo|base|refrão|passagem|interlúdio)\s*:\s*/i,
    ''
  );

  const tokens = withoutIntroLabel.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  const chordCount = tokens.filter((t) => isChordToken(t)).length;
  // Se pelo menos 75% dos tokens são acordes válidos (e não é uma frase comum com a palavra "E" ou "A")
  if (tokens.length === 1) {
    // Evita confundir a vogal "A" ou "E" sozinha no começo de frase como acorde se não for maiúscula isolada
    return CHORD_TOKEN_REGEX.test(tokens[0]);
  }
  return chordCount / tokens.length >= 0.75;
}

/**
 * Mescla uma linha de acordes (com posições de coluna) dentro da linha de letra abaixo dela.
 * Ex:
 *   "C              Am7"
 *   "Todos os dias quando acordo"
 * Vira:
 *   "[C]Todos os dias [Am7]quando acordo"
 */
function mergeChordLineWithLyrics(chordLine, lyricLine) {
  const chords = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(chordLine)) !== null) {
    const token = match[0];
    chords.push({
      chord: token,
      index: match.index,
    });
  }

  if (chords.length === 0) return lyricLine;

  let paddedLyrics = lyricLine;
  const maxChordIndex = chords[chords.length - 1].index;
  if (paddedLyrics.length < maxChordIndex) {
    paddedLyrics = paddedLyrics.padEnd(maxChordIndex, ' ');
  }

  // Insere de trás para frente para não deslocar os índices das colunas anteriores
  let result = paddedLyrics;
  for (let i = chords.length - 1; i >= 0; i--) {
    const { chord, index } = chords[i];
    const before = result.slice(0, index);
    const after = result.slice(index);
    result = `${before}[${chord}]${after}`;
  }

  return result.trimEnd();
}

/**
 * Converte automaticamente uma cifra copiada da internet (Cifra Club, Letras, etc.)
 * para o formato ChordPro com colchetes [Acorde], além de extrair Tom, Título e Artista se houver!
 */
export function convertTraditionalCifraToChordPro(rawText) {
  if (!rawText) return { chordPro: '', detectedKey: null };

  // Remove tablaturas de guitarra/violão (E|---0---, B|---1---, etc.)
  const rawLines = rawText
    .replace(/\t/g, '    ')
    .split(/\r?\n/)
    .filter((line) => !/^\s*[eBGDAE]\s*\|[-0-9hpb/~\s|]+/.test(line));

  let detectedKey = null;
  const outputLines = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // 1. Detecta linha de "Tom: X" (muito comum ao copiar do Cifra Club)
    const tomMatch = trimmed.match(/^Tom:\s*([A-G][#b]?m?)/i);
    if (tomMatch) {
      detectedKey = tomMatch[1];
      i++;
      continue;
    }

    // Ignora linhas de metadados de portais ("Afinação:", "Capotraste", "[Tab - ...]")
    if (/^(?:afina[çc][ãa]o|capotraste|forma dos acordes)\s*:/i.test(trimmed)) {
      i++;
      continue;
    }

    // 2. Detecta cabeçalhos de seção como [Intro], [Primeira Parte], [Refrão], Refrão:
    const bracketSectionMatch = trimmed.match(
      /^\[((?:Intro|Primeira|Segunda|Terceira|Quarta|Refrão|Pré-Refrão|Ponte|Solo|Final|Outro|Verso| Parte|Estrofe)[^\]]*)\](.*)$/i
    );
    if (bracketSectionMatch) {
      const sectionTitle = bracketSectionMatch[1].trim();
      const restOfLine = bracketSectionMatch[2].trim();
      outputLines.push(`{comment: ${sectionTitle}}`);
      if (restOfLine) {
        // Ex: "[Intro] C  Am7  Bm7  Em" -> coloca os acordes na linha seguinte
        const formattedChords = restOfLine
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => (isChordToken(t) && !t.startsWith('(') ? `[${t}]` : t))
          .join(' ');
        outputLines.push(formattedChords);
      }
      i++;
      continue;
    }

    const colonSectionMatch = trimmed.match(
      /^(Intro|Introdução|Primeira Parte|Segunda Parte|Terceira Parte|Refrão|Pré-Refrão|Solo|Final|Ponte)\s*:\s*(.*)$/i
    );
    if (colonSectionMatch) {
      const sectionTitle = colonSectionMatch[1].trim();
      const restOfLine = colonSectionMatch[2].trim();
      outputLines.push(`{comment: ${sectionTitle}}`);
      if (restOfLine) {
        const formattedChords = restOfLine
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => (isChordToken(t) && !t.startsWith('(') ? `[${t}]` : t))
          .join(' ');
        outputLines.push(formattedChords);
      }
      i++;
      continue;
    }

    // 3. Se for linha de acordes tradicional (acima da letra ou solo)
    if (isChordLine(line)) {
      const nextLine = i + 1 < rawLines.length ? rawLines[i + 1] : null;
      const nextTrimmed = nextLine ? nextLine.trim() : '';

      // Se a próxima linha existe, não é vazia, não é outra linha de acordes e não é cabeçalho de seção
      if (
        nextLine !== null &&
        nextTrimmed !== '' &&
        !isChordLine(nextLine) &&
        !nextTrimmed.startsWith('[') &&
        !nextTrimmed.startsWith('{')
      ) {
        outputLines.push(mergeChordLineWithLyrics(line, nextLine));
        i += 2; // Consumiu a linha de acorde + a linha de letra!
        continue;
      } else {
        // É uma linha só de acordes (ex: Intro ou interlúdio instrumental)
        const onlyChords = trimmed
          .split(/\s+/)
          .filter(Boolean)
          .map((t) => (isChordToken(t) && !t.startsWith('(') ? `[${t}]` : t))
          .join(' ');
        outputLines.push(onlyChords);
        i++;
        continue;
      }
    }

    // 4. Linha normal (já em ChordPro, letra pura ou vazia)
    outputLines.push(line);
    i++;
  }

  return {
    chordPro: outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
    detectedKey,
  };
}

/**
 * Transpõe uma nota ou acorde individualmente em N semitons.
 * Preserva sufixos (m, 7, maj7, 9, sus4, etc.) e baixos (/G#).
 */
export function transposeChordSymbol(chordStr, semitones) {
  if (!chordStr || semitones === 0) return chordStr;

  try {
    const parsed = ChordSheetJS.Chord.parse(chordStr.trim());
    if (parsed) {
      return parsed.transpose(semitones).toString();
    }
  } catch {
    // Fallback manual caso seja alguma notação brasileira específica (ex: 7M, 7+, etc.)
  }

  return chordStr.replace(/([A-G][#b]?)/g, (match) => {
    const normalized = FLAT_TO_SHARP[match] || match;
    const index = NOTES_SHARP.indexOf(normalized);
    if (index === -1) return match;
    const newIndex = (index + (semitones % 12) + 12) % 12;
    return semitones < 0 ? NOTES_FLAT[newIndex] : NOTES_SHARP[newIndex];
  });
}

/**
 * Faz o parse de uma cifra (tanto no formato ChordPro quanto no formato tradicional Acorde-sobre-Letra)
 * e retorna linhas estruturadas para o React.
 * @param {string} rawContent
 * @param {number} transposeDelta
 * @param {boolean} simplify - Se true, converte os acordes para tríades básicas na exibição
 */
export function parseChordProSong(rawContent, transposeDelta = 0, simplify = false) {
  if (!rawContent) return [];

  // Se o texto tiver linhas de acordes tradicionais sem colchetes, converte automaticamente em memória!
  const hasTraditionalLines = rawContent
    .split(/\r?\n/)
    .some((l) => isChordLine(l));

  const normalizedContent = hasTraditionalLines
    ? convertTraditionalCifraToChordPro(rawContent).chordPro
    : rawContent;

  // Usa nosso parser que preserva perfeitamente todo tipo de notação brasileira (7M, 4/7, F#m7(b5), etc.)
  return fallbackRegexParse(normalizedContent, transposeDelta, simplify);
}

/**
 * Extrai a lista de acordes únicos presentes nas linhas já processadas da música
 */
export function extractUniqueChords(parsedLines = []) {
  const seen = new Set();
  const unique = [];

  parsedLines.forEach((line) => {
    if (line.type !== 'musical' || !line.pairs) return;
    line.pairs.forEach((pair) => {
      const c = pair.chords?.trim();
      if (!c || /^\(?\d+x\)?$/i.test(c)) return;
      if (!seen.has(c)) {
        seen.add(c);
        unique.push(c);
      }
    });
  });

  return unique;
}

function fallbackRegexParse(rawContent, transposeDelta, simplify = false) {
  const lines = rawContent.split(/\r?\n/);
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return { id: `line-${lineIdx}`, type: 'empty' };
    }

    const commentMatch = trimmed.match(/^\{(?:comment|c):\s*(.+?)\}$/i);
    if (commentMatch) {
      return {
        id: `line-${lineIdx}`,
        type: 'comment',
        text: commentMatch[1],
      };
    }

    const pairs = [];
    const regex = /\[([^\]]+)\]([^\[]*)/g;
    const firstBracket = line.indexOf('[');

    if (firstBracket === -1) {
      return {
        id: `line-${lineIdx}`,
        type: 'musical',
        pairs: [{ id: `pair-${lineIdx}-0`, chords: '', lyrics: line }],
      };
    }

    if (firstBracket > 0) {
      pairs.push({
        id: `pair-${lineIdx}-lead`,
        chords: '',
        lyrics: line.slice(0, firstBracket),
      });
    }

    let match;
    let idx = 0;
    while ((match = regex.exec(line)) !== null) {
      const transposed = transposeChordSymbol(match[1], transposeDelta);
      const finalChord = simplify ? simplifyChordSymbol(transposed) : transposed;
      pairs.push({
        id: `pair-${lineIdx}-${idx++}`,
        chords: finalChord,
        lyrics: match[2] || '',
      });
    }

    return {
      id: `line-${lineIdx}`,
      type: 'musical',
      pairs,
    };
  });
}
