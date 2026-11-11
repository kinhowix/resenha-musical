import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  X,
  HelpCircle,
  Eye,
  Code2,
  Wand2,
  ClipboardPaste,
  CheckCircle2,
  Search,
  Globe,
  Loader2,
  Download,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  parseChordProSong,
  convertTraditionalCifraToChordPro,
  isChordLine,
} from '../utils/chordParser';
import {
  RODA_POPULAR_SUGGESTIONS,
  searchSongsOnline,
  fetchCifraOnline,
} from '../services/cifraImporter';

const KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
];

export default function SongFormModal({ isOpen, onClose, onSave, initialData }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [rhythm, setRhythm] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [convertFeedback, setConvertFeedback] = useState(null);

  // Estados da Busca Automática na Internet (Cifra Club)
  const [onlineQuery, setOnlineQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    setConvertFeedback(null);
    setImportError(null);
    setOnlineQuery('');
    setSearchResults([]);
    if (initialData) {
      setTitle(initialData.title || '');
      setArtist(initialData.artist || '');
      setOriginalKey(initialData.originalKey || 'G');
      setRhythm(initialData.rhythm || '');
      setContent(initialData.content || '');
    } else {
      setTitle('');
      setArtist('');
      setOriginalKey('G');
      setRhythm('');
      setContent('');
    }
  }, [initialData, isOpen]);

  // Verifica se o texto atual tem linhas de acordes tradicionais (tipo Cifra Club)
  const hasTraditionalFormat = useMemo(() => {
    if (!content) return false;
    return content.split(/\r?\n/).some((l) => isChordLine(l));
  }, [content]);

  const previewLines = useMemo(() => {
    return parseChordProSong(content, 0);
  }, [content]);

  if (!isOpen) return null;

  // Converte texto tradicional (acordes em cima da letra) para ChordPro [Acorde]
  const handleSmartConvert = (rawTextToConvert = content, customMsg = null) => {
    if (!rawTextToConvert.trim()) return;
    const { chordPro, detectedKey } =
      convertTraditionalCifraToChordPro(rawTextToConvert);

    setContent(chordPro);
    if (detectedKey && KEYS.includes(detectedKey)) {
      setOriginalKey(detectedKey);
      setConvertFeedback(
        customMsg ||
          `Cifra convertida e Tom "${detectedKey}" detectado automaticamente!`
      );
    } else {
      setConvertFeedback(
        customMsg || 'Cifra convertida para o padrão [Acorde] com sucesso!'
      );
    }
    setTimeout(() => setConvertFeedback(null), 5000);
  };

  // Busca na internet ou importa direto caso o usuário tenha colado um link do Cifra Club
  const handleOnlineSearchOrUrl = async (e) => {
    e?.preventDefault();
    const q = onlineQuery.trim();
    if (!q) return;

    setImportError(null);

    // Se o usuário colou direto um link do Cifra Club
    if (q.includes('cifraclub.com.br')) {
      await handleImportFromCifraClub({ url: q });
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchSongsOnline(q);
      setSearchResults(results);
      if (results.length === 0) {
        setImportError(
          'Nenhuma música encontrada com esse nome. Tente digitar "Nome da Música + Cantor" ou cole o link do Cifra Club.'
        );
      }
    } catch {
      setImportError('Erro ao pesquisar músicas. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  // Puxa a cifra completa do Cifra Club em 1 clique!
  const handleImportFromCifraClub = async ({
    url,
    title: targetTitle = '',
    artist: targetArtist = '',
    rhythm: targetRhythm = '',
  }) => {
    setIsImporting(true);
    setImportError(null);
    try {
      const data = await fetchCifraOnline({
        url,
        title: targetTitle,
        artist: targetArtist,
      });

      const finalTitle = data.title || targetTitle;
      const finalArtist = data.artist || targetArtist;

      if (finalTitle) setTitle(finalTitle);
      if (finalArtist) setArtist(finalArtist);
      if (targetRhythm && !rhythm) setRhythm(targetRhythm);

      handleSmartConvert(
        data.rawCifra,
        `🎸 "${finalTitle}" (${finalArtist}) importada automaticamente da internet! Clique em "Salvar Música" abaixo.`
      );
      setSearchResults([]);
      setOnlineQuery('');
    } catch (err) {
      setImportError(
        err.message ||
          'Não foi possível puxar a cifra automaticamente. Tente colar o link direto da música no Cifra Club!'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Colar direto da área de transferência e já converter!
  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;
      handleSmartConvert(clipText);
    } catch {
      setConvertFeedback(
        'Cole o texto na caixa abaixo (Ctrl+V ou Segurar e Colar) e clique em Converter!'
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const finalContent = hasTraditionalFormat
      ? convertTraditionalCifraToChordPro(content).chordPro
      : content;

    onSave({
      ...(initialData || {}),
      title: title.trim(),
      artist: artist.trim() || 'Artista Desconhecido',
      originalKey,
      rhythm: rhythm.trim(),
      content: finalContent,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-800 bg-zinc-950/60 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              {initialData ? 'Editar Música' : 'Cadastrar Nova Cifra'}
            </h2>
            <p className="text-xs text-zinc-400">
              Busque a música automaticamente na internet ou cole de qualquer site de cifras!
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* BUSCADOR AUTOMÁTICO DE CIFRAS NA INTERNET */}
          {!initialData && (
            <div className="bg-gradient-to-br from-amber-500/15 via-zinc-950 to-zinc-950 border border-amber-500/40 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Busca Automática de Cifras na Internet
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  Puxa letra, acordes e tom sozinho!
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={onlineQuery}
                    onChange={(e) => setOnlineQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleOnlineSearchOrUrl(e);
                      }
                    }}
                    placeholder="Digite a música/cantor (ex: Evidências) ou cole link do Cifra Club..."
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={isSearching || isImporting}
                  onClick={handleOnlineSearchOrUrl}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs sm:text-sm shadow transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isSearching || isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Buscando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Buscar Cifra</span>
                    </>
                  )}
                </button>
              </div>

              {/* Resultados da Busca Online */}
              {searchResults.length > 0 && (
                <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-2.5 space-y-1.5 max-h-52 overflow-y-auto">
                  <span className="text-[11px] font-bold text-zinc-400 px-1 block">
                    Clique na música abaixo para importar a cifra completa:
                  </span>
                  {searchResults.map((item, idx) => (
                    <div
                      key={`${item.artist}-${item.title}-${idx}`}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/80 transition"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {item.artist} {item.rhythm ? `• ${item.rhythm}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isImporting}
                        onClick={() => handleImportFromCifraClub(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Importar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Atalhos de Clássicos da Roda em 1 Clique */}
              <div className="pt-1">
                <span className="text-[11px] text-zinc-400 flex items-center gap-1 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Clássicos prontos para importar em 1 clique:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {RODA_POPULAR_SUGGESTIONS.slice(0, 12).map((sug) => (
                    <button
                      key={`${sug.artist}-${sug.title}`}
                      type="button"
                      disabled={isImporting}
                      onClick={() => handleImportFromCifraClub(sug)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-amber-500/20 border border-zinc-800 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 text-[11px] font-medium transition cursor-pointer disabled:opacity-50"
                    >
                      + {sug.title} ({sug.artist})
                    </button>
                  ))}
                </div>
              </div>

              {importError && (
                <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}

          <form id="song-crud-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Nome da Música *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Evidências"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Artista / Banda *
                </label>
                <input
                  type="text"
                  required
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex: Chitãozinho & Xororó"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Tom Original
                </label>
                <select
                  value={originalKey}
                  onChange={(e) => setOriginalKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                >
                  {KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Ritmo / Batida (Opcional)
                </label>
                <input
                  type="text"
                  value={rhythm}
                  onChange={(e) => setRhythm(e.target.value)}
                  placeholder="Ex: Sertanejo, Pagode, Pop Rock..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Barra de Colar Manualmente da Área de Transferência */}
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-zinc-300">
                <span className="font-bold text-amber-400">Ou cole manualmente:</span>{' '}
                Copiou o texto de uma cifra? Clique ao lado para colar e formatar:
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" /> Colar & Converter
                </button>

                {hasTraditionalFormat && (
                  <button
                    type="button"
                    onClick={() => handleSmartConvert(content)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow transition cursor-pointer animate-pulse"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Converter Acordes Agora
                  </button>
                )}
              </div>
            </div>

            {convertFeedback && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{convertFeedback}</span>
              </div>
            )}

            {/* Editor / Preview Switch */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  Letra e Acordes *
                </label>

                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      !showPreview
                        ? 'bg-amber-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" /> Texto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                      showPreview
                        ? 'bg-amber-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver Cifra Pronta
                  </button>
                </div>
              </div>

              {!showPreview ? (
                <textarea
                  rows={9}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Use a busca automática acima ou cole aqui a cifra copiada do Cifra Club...`}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              ) : (
                <div className="w-full h-[240px] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-4 chord-sheet-container text-sm">
                  {previewLines.map((line) => {
                    if (line.type === 'empty') return <div key={line.id} className="h-4" />;
                    if (line.type === 'comment') {
                      return (
                        <div key={line.id} className="my-1">
                          <span className="section-comment">{line.text}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={line.id} className="chord-row">
                        {line.pairs.map((pair) => (
                          <span key={pair.id} className="chord-pair">
                            <span className="chord-symbol">{pair.chords || '\u00A0'}</span>
                            <span className="chord-lyrics">
                              {pair.lyrics || (pair.chords ? ' ' : '')}
                            </span>
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-2 flex items-start gap-2 text-[11px] text-zinc-400 bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2.5">
                <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  Você pode pesquisar pelo nome da música lá em cima, colar o link direto do Cifra Club ou colar o texto com acordes: o sistema formata tudo automaticamente!
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <Save className="w-4 h-4" /> Salvar Música
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
