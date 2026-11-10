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
} from 'lucide-react';
import {
  parseChordProSong,
  convertTraditionalCifraToChordPro,
  isChordLine,
} from '../utils/chordParser';

const KEYS = [
  'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
];

const EXAMPLE_INTERNET_CIFRA = `Tom: D
[Intro] D  Bm  G  A

[Primeira Parte]
D                       Bm
  Bateu uma vontade de tocar violão
G                        A
  Chamei os amigos pra nossa reunião
D                      Bm
  Copiei a cifra direto da internet
G                    A                 D
  E o sistema já converte num passe de mágica`;

export default function SongFormModal({ isOpen, onClose, onSave, initialData }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [originalKey, setOriginalKey] = useState('G');
  const [rhythm, setRhythm] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [convertFeedback, setConvertFeedback] = useState(null);

  useEffect(() => {
    setConvertFeedback(null);
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
  const handleSmartConvert = (rawTextToConvert = content) => {
    if (!rawTextToConvert.trim()) return;
    const { chordPro, detectedKey } =
      convertTraditionalCifraToChordPro(rawTextToConvert);

    setContent(chordPro);
    if (detectedKey && KEYS.includes(detectedKey)) {
      setOriginalKey(detectedKey);
      setConvertFeedback(
        `Cifra convertida e Tom "${detectedKey}" detectado automaticamente!`
      );
    } else {
      setConvertFeedback(
        'Cifra convertida para o padrão [Acorde] com sucesso!'
      );
    }
    setTimeout(() => setConvertFeedback(null), 4000);
  };

  // Colar direto da área de transferência e já converter!
  const handlePasteFromClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (!clipText) return;
      handleSmartConvert(clipText);
    } catch {
      // Caso o navegador peça permissão manual, foca no textarea
      setConvertFeedback(
        'Cole o texto na caixa abaixo (Ctrl+V ou Segurar e Colar) e clique em Converter!'
      );
    }
  };

  const handleLoadExample = () => {
    if (!title) setTitle('Noite de Resenha');
    if (!artist) setArtist('Galera do Violão');
    handleSmartConvert(EXAMPLE_INTERNET_CIFRA);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    // Se o usuário colou cifra da internet e esqueceu de clicar em converter, converte ao salvar!
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
              Cole direto de qualquer site de cifras (Cifra Club, etc.) que nós formatamos pra você!
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
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1"
        >
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

          {/* Barra de Importação Rápida da Internet */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-zinc-200">
              <span className="font-bold text-amber-400">Importador Inteligente:</span>{' '}
              Copie a cifra da internet (com acordes em cima da letra) e cole aqui!
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Colar & Converter
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

              {!content && (
                <button
                  type="button"
                  onClick={handleLoadExample}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
                >
                  Testar Exemplo
                </button>
              )}
            </div>
          </div>

          {convertFeedback && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3.5 py-2">
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
                rows={10}
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Cole aqui a cifra copiada do Cifra Club ou digite no formato:\n\nTom: G\nG                D\nHoje é dia de tocar com os amigos\nEm               C\nNa resenha musical`}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs sm:text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            ) : (
              <div className="w-full h-[250px] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl p-4 chord-sheet-container text-sm">
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
                Tanto faz colar com <strong>acordes na linha de cima</strong> (padrão Cifra Club) ou entre colchetes <code className="text-amber-400">[G]</code>: o sistema reconhece os dois formatos e posiciona os acordes na sílaba certa!
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
  );
}
