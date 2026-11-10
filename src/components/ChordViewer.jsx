import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  RotateCcw,
  SkipForward,
  Music,
  Edit3,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Radio,
} from 'lucide-react';
import { parseChordProSong, transposeChordSymbol } from '../utils/chordParser';

export default function ChordViewer({
  song,
  transpose = 0,
  onTransposeChange,
  onNextInQueue,
  onMarkPlayed,
  onEditSong,
  queueCount = 0,
  nextSongTitle = null,
  syncRoom,
  onToggleSyncRoom,
}) {
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2); // 1 a 5
  const [fontSize, setFontSize] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 15 : 18
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sincroniza estado com Fullscreen API (Android/PC)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Wake Lock API: evita que a tela do Android ou iPhone apague enquanto a música está aberta
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Ignora silenciosamente se o dispositivo estiver em modo economia de bateria
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release?.().catch(() => {});
    };
  }, [song?.id, isAutoScrolling]);

  // Rolagem Automática usando window.scrollBy (ou container no modo tela cheia do iOS)
  useEffect(() => {
    if (!isAutoScrolling) return;

    const intervalMs = Math.max(18, 85 - scrollSpeed * 14);
    const timer = setInterval(() => {
      window.scrollBy({ top: 1, behavior: 'auto' });

      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setIsAutoScrolling(false);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isAutoScrolling, scrollSpeed]);

  // Para rolagem ao trocar de música e sobe pro topo
  useEffect(() => {
    setIsAutoScrolling(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [song?.id]);

  // Funciona tanto em Android/Desktop (Fullscreen API) quanto no iPhone iOS Safari (CSS Modo Foco)
  const toggleFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          setIsFullscreen(true);
        } else {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } else {
        // Fallback nativo para iPhone (iOS Safari não tem requestFullscreen para divs)
        setIsFullscreen((prev) => !prev);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const parsedLines = useMemo(() => {
    return parseChordProSong(song?.content || '', transpose);
  }, [song?.content, transpose]);

  const currentKey = useMemo(() => {
    return transposeChordSymbol(song?.originalKey || 'C', transpose);
  }, [song?.originalKey, transpose]);

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <Music className="w-12 h-12 mb-3 text-amber-500/50" />
        <p className="text-lg text-center px-4">
          Selecione uma música no repertório ou na fila para começar!
        </p>
      </div>
    );
  }

  return (
    <div className="relative pb-36">
      {/* Barra de Controle Flutuante (Adaptada para Mobile Android/iPhone & Desktop) */}
      <div className="sticky top-14 sm:top-16 z-30 mb-4 sm:mb-6 bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-2.5 sm:p-4 shadow-xl">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {/* Info da Música + Tom Atual */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex flex-col items-center justify-center bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-xl px-2.5 py-1 shrink-0">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-amber-300/80">
                  Tom
                </span>
                <span className="text-base sm:text-lg font-extrabold font-mono leading-tight">
                  {currentKey}
                </span>
              </div>

              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-white truncate">
                  {song.title}
                </h1>
                <p className="text-xs text-zinc-400 truncate">
                  {song.artist}{' '}
                  {song.rhythm && (
                    <span className="text-zinc-500">• {song.rhythm}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Botão Tela Cheia compacto no celular */}
            <button
              onClick={toggleFullscreen}
              title="Modo Tela Cheia"
              className={`sm:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer shrink-0 ${
                isFullscreen
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300'
              }`}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Controles de Transposição + Rolagem + Fonte + Tela Cheia */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
            {/* Transposição Dinâmica (-1 / +1) */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 sm:p-1">
              <button
                onClick={() => onTransposeChange(transpose - 1)}
                title="Diminuir 1 semitom (-1/2)"
                className="p-1.5 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 rounded-lg transition cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-1.5 text-xs font-mono font-bold text-amber-400 min-w-[2.8rem] text-center">
                {transpose === 0
                  ? 'Tom'
                  : transpose > 0
                  ? `+${transpose}`
                  : `${transpose}`}
              </span>
              <button
                onClick={() => onTransposeChange(transpose + 1)}
                title="Aumentar 1 semitom (+1/2)"
                className="p-1.5 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-200 rounded-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
              {transpose !== 0 && (
                <button
                  onClick={() => onTransposeChange(0)}
                  title="Voltar ao tom original"
                  className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Rolagem Automática */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 sm:p-1 gap-1">
              <button
                onClick={() => setIsAutoScrolling((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isAutoScrolling
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'hover:bg-zinc-800 text-zinc-200'
                }`}
              >
                {isAutoScrolling ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />{' '}
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />{' '}
                    <span>Rolar</span>
                  </>
                )}
              </button>

              <div className="flex items-center px-1 gap-0.5">
                {[1, 2, 3, 4, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setScrollSpeed(spd)}
                    className={`w-5 h-6 sm:w-6 sm:h-6 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                      scrollSpeed === spd
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>
            </div>

            {/* Fonte +/- (Visível no celular também para ajustar na tela do Android/iPhone!) */}
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 sm:p-1">
              <button
                onClick={() => setFontSize((f) => Math.max(12, f - 1))}
                title="Diminuir letra"
                className="p-1.5 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFontSize((f) => Math.min(28, f + 1))}
                title="Aumentar letra"
                className="p-1.5 hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 rounded-lg cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Botão Tela Cheia (Desktop) */}
            <button
              onClick={toggleFullscreen}
              title="Modo Tela Cheia"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                isFullscreen
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" /> Sair Tela Cheia
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" /> Tela Cheia
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Folha de Cifra */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-8 shadow-inner overflow-x-auto">
        <div
          className="chord-sheet-container select-text"
          style={{ fontSize: `${fontSize}px` }}
        >
          {parsedLines.map((line) => {
            if (line.type === 'empty') {
              return <div key={line.id} className="h-4 sm:h-5" />;
            }

            if (line.type === 'comment') {
              return (
                <div key={line.id} className="my-2">
                  <span className="section-comment">{line.text}</span>
                </div>
              );
            }

            return (
              <div key={line.id} className="chord-row">
                {line.pairs.map((pair) => (
                  <span key={pair.id} className="chord-pair">
                    <span className="chord-symbol">
                      {pair.chords || '\u00A0'}
                    </span>
                    <span className="chord-lyrics">
                      {pair.lyrics || (pair.chords ? ' ' : '')}
                    </span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {/* Rodapé da Cifra: Ações de Roda (Concluir / Próxima da Fila / Editar) */}
        <div className="mt-10 pt-5 border-t border-zinc-800 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditSong(song)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" /> Editar Cifra
            </button>

            <button
              onClick={onToggleSyncRoom}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                syncRoom
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              {syncRoom ? 'Sincronizado' : 'Modo Individual'}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={() => onMarkPlayed(song.id)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Marcar como Tocada
            </button>

            {queueCount > 0 && (
              <button
                onClick={onNextInQueue}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs sm:text-sm font-bold shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <SkipForward className="w-4 h-4 fill-current" />
                Próxima da Fila {nextSongTitle ? `(${nextSongTitle})` : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
