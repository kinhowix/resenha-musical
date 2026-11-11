// Vercel Serverless Function para buscar e extrair cifras do Cifra Club automaticamente

function toCifraClubSlug(text = '') {
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

function decodeHtmlEntities(str = '') {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function extractCifraFromHtml(html, fallbackTitle = '', fallbackArtist = '') {
  if (!html) return null;

  const preStart = html.indexOf('<pre');
  if (preStart === -1) return null;
  const contentStart = html.indexOf('>', preStart);
  const preEnd = html.indexOf('</pre>', contentStart);
  if (contentStart === -1 || preEnd === -1) return null;

  const rawPre = html.slice(contentStart + 1, preEnd);

  // Remove tablaturas (<span class="tablatura">...</span>) para deixar a cifra limpa
  const withoutTabs = rawPre.replace(
    /<span[^>]*class=["'][^"']*tablatura[^"']*["'][^>]*>[\s\S]*?<\/span>/gi,
    ''
  );

  // Detecta o primeiro acorde da música como referência de tom caso não haja marcador explícito
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

  // Extrai Título e Artista do <title> (Ex: "Evidências - Chitãozinho & Xororó - Cifra Club")
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

  // Tenta detectar o Tom oficial na página ou pelo primeiro acorde
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url, artist = '', title = '' } = req.query || {};

  try {
    const candidateUrls = [];

    if (url && typeof url === 'string' && url.includes('cifraclub.com.br')) {
      candidateUrls.push(url.trim());
    }

    if (artist && title) {
      const artistSlug = toCifraClubSlug(artist.split(',')[0]);
      const songSlug = toCifraClubSlug(title);
      if (artistSlug && songSlug) {
        candidateUrls.push(`https://www.cifraclub.com.br/${artistSlug}/${songSlug}/`);
        // Variação sem "e" para duplas caso necessário
        const artistSlugNoE = artistSlug.replace(/-e-/g, '-');
        if (artistSlugNoE !== artistSlug) {
          candidateUrls.push(`https://www.cifraclub.com.br/${artistSlugNoE}/${songSlug}/`);
        }
      }
    }

    for (const targetUrl of candidateUrls) {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) continue;
      const html = await response.text();
      const extracted = extractCifraFromHtml(html, title, artist);
      if (extracted) {
        return res.status(200).json({
          ok: true,
          sourceUrl: targetUrl,
          ...extracted,
        });
      }
    }

    return res.status(404).json({
      ok: false,
      error: 'Cifra não encontrada automaticamente para esta música. Tente colar o link direto do Cifra Club!',
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Erro ao buscar cifra.',
    });
  }
}
