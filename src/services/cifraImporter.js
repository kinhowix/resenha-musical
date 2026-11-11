// Serviço de busca automática de músicas e importação de cifras (Cifra Club + Catálogo da Roda)

export const RODA_POPULAR_SUGGESTIONS = [
  { title: 'Evidências', artist: 'Chitãozinho & Xororó', rhythm: 'Sertanejo' },
  { title: 'Boate Azul', artist: 'Bruno & Marrone', rhythm: 'Sertanejo / Modão' },
  { title: 'Cheia de Manias', artist: 'Raça Negra', rhythm: 'Pagode / Samba' },
  { title: 'Deixa a Vida Me Levar', artist: 'Zeca Pagodinho', rhythm: 'Samba' },
  { title: 'Tempo Perdido', artist: 'Legião Urbana', rhythm: 'Pop Rock' },
  { title: 'Pais e Filhos', artist: 'Legião Urbana', rhythm: 'Pop Rock' },
  { title: 'Primeiros Erros', artist: 'Capital Inicial', rhythm: 'Pop Rock' },
  { title: 'Anna Júlia', artist: 'Los Hermanos', rhythm: 'Pop Rock' },
  { title: 'Dormi na Praça', artist: 'Bruno & Marrone', rhythm: 'Sertanejo' },
  { title: 'Fio de Cabelo', artist: 'Chitãozinho & Xororó', rhythm: 'Sertanejo' },
  { title: 'Sinônimos', artist: 'Zé Ramalho', rhythm: 'MPB / Sertanejo' },
  { title: 'Chão de Giz', artist: 'Zé Ramalho', rhythm: 'MPB' },
  { title: 'Tente Outra Vez', artist: 'Raul Seixas', rhythm: 'Rock / MPB' },
  { title: 'Metamorfose Ambulante', artist: 'Raul Seixas', rhythm: 'Rock / MPB' },
  { title: 'Aquarela', artist: 'Toquinho', rhythm: 'MPB' },
  { title: 'Sozinho', artist: 'Caetano Veloso', rhythm: 'MPB' },
  { title: 'Trem das Onze', artist: 'Adoniran Barbosa', rhythm: 'Samba' },
  { title: 'Exagerado', artist: 'Cazuza', rhythm: 'Pop Rock' },
  { title: 'Gostava Tanto de Você', artist: 'Tim Maia', rhythm: 'Soul / MPB' },
  { title: 'Azul da Cor do Mar', artist: 'Tim Maia', rhythm: 'Soul / MPB' },
  { title: 'Telegrama', artist: 'Zeca Baleiro', rhythm: 'MPB' },
  { title: 'Borbulhas de Amor', artist: 'Fagner', rhythm: 'MPB' },
  { title: 'La Belle de Jour', artist: 'Alceu Valença', rhythm: 'MPB / Xote' },
  { title: 'Flor de Lis', artist: 'Djavan', rhythm: 'MPB / Samba' },
];

export function toCifraClubSlug(text = '') {
  return text
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .split(/\s+-\s+/)[0]
    .replace(/\b(?:feat|ft|part)\.?\s+.*/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function cleanSongTitle(rawTitle = '') {
  return rawTitle
    .replace(/\s*\([^)]*(?:ao vivo|live|feat|part|ac[uú]stico|remix|version)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .split(/\s+-\s+(?:ao vivo|live|ac[uú]stico)/i)[0]
    .trim();
}

function decodeHtmlEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function extractCifraFromHtmlClient(html, fallbackTitle = '', fallbackArtist = '') {
  if (!html) return null;

  const preStart = html.indexOf('<pre');
  if (preStart === -1) return null;
  const contentStart = html.indexOf('>', preStart);
  const preEnd = html.indexOf('</pre>', contentStart);
  if (contentStart === -1 || preEnd === -1) return null;

  const rawPre = html.slice(contentStart + 1, preEnd);
  const withoutTabs = rawPre.replace(
    /<span[^>]*class=["'][^"']*tablatura[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    ''
  );
  const firstChordMatch = rawPre.match(/data-chord-name=["']([A-G][#b]?m?)["']/i);

  const cleanCifra = decodeHtmlEntities(
    withoutTabs
      .replace(/<[^>]+>/g, '')
      .replace(/\u200B/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );

  if (!cleanCifra) return null;

  let title = fallbackTitle;
  let artist = fallbackArtist;
  const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleTagMatch) {
    const rawTitleTag = decodeHtmlEntities(titleTagMatch[1])
      .replace(/\s*-\s*Cifra Club.*$/i, '')
      .trim();
    const parts = rawTitleTag.split(/\s+-\s+/);
    if (parts.length >= 2) {
      title = parts[0].trim();
      artist = parts.slice(1).join(' - ').trim();
    }
  }

  const keyMatch =
    html.match(/cifra_tom[^>]*>[\s\S]*?>([A-G][#b]?m?)</i) ||
    html.match(/"key"\s*:\s*"([A-G][#b]?m?)"/i);
  const detectedKey = keyMatch?.[1] || firstChordMatch?.[1] || 'G';

  return {
    title,
    artist,
    detectedKey,
    rawCifra: `Tom: ${detectedKey}\n${cleanCifra}`,
  };
}

/**
 * Busca músicas na internet pelo nome ou cantor (iTunes Brasil + Catálogo da Roda)
 */
export async function searchSongsOnline(query) {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const localMatches = RODA_POPULAR_SUGGESTIONS.filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.artist.toLowerCase().includes(lower)
  ).slice(0, 4);

  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(
        q
      )}&country=BR&entity=song&limit=10`
    );
    const data = await res.json();
    const seen = new Set(
      localMatches.map(
        (m) => `${toCifraClubSlug(m.artist)}:${toCifraClubSlug(m.title)}`
      )
    );

    const apiMatches = [];
    for (const item of data.results || []) {
      const cleanTitle = cleanSongTitle(item.trackName || '');
      const cleanArtist = (item.artistName || '').split(',')[0].trim();
      const key = `${toCifraClubSlug(cleanArtist)}:${toCifraClubSlug(cleanTitle)}`;
      if (!cleanTitle || !cleanArtist || seen.has(key)) continue;
      seen.add(key);
      apiMatches.push({
        title: cleanTitle,
        artist: cleanArtist,
        rhythm: item.primaryGenreName || '',
        artwork: item.artworkUrl60 || null,
      });
      if (apiMatches.length >= 6) break;
    }

    return [...localMatches, ...apiMatches].slice(0, 8);
  } catch {
    return localMatches;
  }
}

/**
 * Baixa e extrai a cifra completa do Cifra Club (por Nome+Artista ou Link Direto)
 */
export async function fetchCifraOnline({ url, title = '', artist = '' }) {
  const candidateUrls = [];
  if (url && url.includes('cifraclub.com.br')) {
    candidateUrls.push(url.trim());
  }
  if (artist && title) {
    const artistSlug = toCifraClubSlug(artist.split(',')[0]);
    const songSlug = toCifraClubSlug(title);
    if (artistSlug && songSlug) {
      candidateUrls.push(`https://www.cifraclub.com.br/${artistSlug}/${songSlug}/`);
      const artistSlugNoE = artistSlug.replace(/-e-/g, '-');
      if (artistSlugNoE !== artistSlug) {
        candidateUrls.push(`https://www.cifraclub.com.br/${artistSlugNoE}/${songSlug}/`);
      }
    }
  }

  // 1. Extração direta via r.jina.ai (possui CORS liberado e não sofre bloqueio Akamai/408)
  for (const targetUrl of candidateUrls) {
    try {
      const r = await fetch(`https://r.jina.ai/${targetUrl}`, {
        headers: {
          'X-Return-Format': 'html',
        },
      });
      if (!r.ok) continue;
      const html = await r.text();
      const extracted = extractCifraFromHtmlClient(html, title, artist);
      if (extracted) {
        return {
          ok: true,
          sourceUrl: targetUrl,
          ...extracted,
        };
      }
    } catch {
      // tenta próximo candidato ou API serverless
    }
  }

  // 2. Fallback pela rota Serverless da Vercel (/api/cifra)
  try {
    const params = new URLSearchParams();
    if (url) params.set('url', url);
    if (title) params.set('title', title);
    if (artist) params.set('artist', artist);

    const apiRes = await fetch(`/api/cifra?${params.toString()}`);
    const contentType = apiRes.headers.get('content-type') || '';
    if (apiRes.ok && contentType.includes('application/json')) {
      const json = await apiRes.json();
      if (json.ok && json.rawCifra) {
        return json;
      }
    }
  } catch {
    // ignore
  }

  throw new Error(
    'Não conseguimos puxar essa cifra automaticamente. Tente colar o link direto da música do Cifra Club!'
  );
}
