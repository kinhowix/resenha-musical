import React, { useState, useMemo, useEffect } from 'react';
import {
  Disc3,
  ThumbsUp,
  Search,
  Trophy,
  Music,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Guitar,
  X,
} from 'lucide-react';
import {
  parseChordProSong,
  transposeChordSymbol,
  extractUniqueChords,
} from '../utils/chordParser';
import { simplifyChordSymbol } from '../utils/chordDictionary';
import ChordDiagram from './ChordDiagram';
import FloatingScrollControl from './FloatingScrollControl';

const VOTER_NAME_KEY = 'resenha_guest_name_v1';
const VOTED_SONGS_SESSION_KEY = 'resenha_voted_songs_v1';

export default function GuestRoomView({
  roomName,
  songs = [],
  currentSong,
  transpose = 0,
  queue = [],
  onVoteSong,
}) {
  // Aba super simples: 'choose' (Escolher Música & Ranking) ou 'lyrics' (Ver Música Tocando Agora)
  const [guestSection, setGuestSection] = useState('choose');
  const [search, setSearch] = useState('');
  const [guestName, setGuestName] = useState(
    () => localStorage.getItem(VOTER_NAME_KEY) || ''
  );
  const [votedIds, setVotedIds] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(VOTED_SONGS_SESSION_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Controles de leitura da cifra/letra para os amigos
  const [fontSize, setFontSize] = useState(16);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2.0);
  const [isSimplified, setIsSimplified] = useState(false);
  const [showDiagrams, setShowDiagrams] = useState(true);
  const [selectedPopupChord, setSelectedPopupChord] = useState(null);

  useEffect(() => {
    if (!isAutoScrolling || guestSection !== 'lyrics') return;
    const intervalMs = Math.max(12, Math.round(90 - scrollSpeed * 15));
    const timer = setInterval(() => {
      window.scrollBy({ top: 1, behavior: 'auto' });
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) setIsAutoScrolling(false);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isAutoScrolling, scrollSpeed, guestSection]);

  const handleNameChange = (val) => {
    setGuestName(val);
    localStorage.setItem(VOTER_NAME_KEY, val);
  };

  const handleVote = (songId) => {
    onVoteSong(songId, guestName.trim() || 'Amigo da Roda');
    const nextVoted = [...votedIds, `${songId}-${Date.now()}`];
    setVotedIds(nextVoted);
    try {
      sessionStorage.setItem(VOTED_SONGS_SESSION_KEY, JSON.stringify(nextVoted));
    } catch {
      // ignore
    }
  };

  const parsedLines = useMemo(() => {
    return parseChordProSong(currentSong?.content || '', transpose, isSimplified);
  }, [currentSong?.content, transpose, isSimplified]);

  const uniqueChords = useMemo(() => {
    return extractUniqueChords(parsedLines);
  }, [parsedLines]);

  const currentKey = useMemo(() => {
    const transposedKey = transposeChordSymbol(
      currentSong?.originalKey || 'C',
      transpose
    );
    return isSimplified ? simplifyChordSymbol(transposedKey) : transposedKey;
  }, [currentSong?.originalKey, transpose, isSimplified]);

  const filteredSongs = useMemo(() => {
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist.toLowerCase().includes(search.toLowerCase()) ||
        (s.rhythm && s.rhythm.toLowerCase().includes(search.toLowerCase()))
    );
  }, [songs, search]);

  return (
    <div className="space-y-6 pb-32">
      {/* Banner de Boas-Vindas da Sala */}
      <div className="bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Sala Ao Vivo
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {roomName || 'Resenha Musical'}
            </h1>
            <p className="text-sm text-zinc-300 mt-1">
              Escolha as próximas músicas para subir no ranking ou acompanhe a letra do que está tocando!
            </p>
          </div>

          {/* Campo simples para o convidado colocar o nome se quiser */}
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3 sm:w-64 shrink-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
              Seu Nome (Opcional):
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Tio João, Ana..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Cartão Destaque: TOCANDO AGORA */}
        {currentSong && (
          <div className="mt-5 bg-zinc-950/90 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                <Disc3
                  className="w-7 h-7 animate-spin"
                  style={{ animationDuration: '6s' }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Tocando Agora na Roda
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold">
                    Tom: {currentKey}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  {currentSong.title}
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setGuestSection(guestSection === 'lyrics' ? 'choose' : 'lyrics')
              }
              className={`py-3 px-5 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                guestSection === 'lyrics'
                  ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25'
              }`}
            >
              <Music className="w-4 h-4" />
              {guestSection === 'lyrics'
                ? 'Voltar para Escolher Músicas'
                : 'Ver Letra e Acordes Agora'}
            </button>
          </div>
        )}
      </div>

      {/* Dois Botões Gigantes e Intuitivos para Alternar Visão */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setGuestSection('choose')}
          className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 border transition cursor-pointer ${
            guestSection === 'choose'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <ThumbsUp className="w-5 h-5" />
          <span>Escolher Música ({songs.length})</span>
        </button>

        <button
          onClick={() => setGuestSection('lyrics')}
          className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 border transition cursor-pointer ${
            guestSection === 'lyrics'
              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Music className="w-5 h-5" />
          <span>Cifra Tocando Agora</span>
        </button>
      </div>

      {/* VISÃO 1: CIFRA E LETRA DA MÚSICA TOCANDO AGORA */}
      {guestSection === 'lyrics' && currentSong && (
        <div className="space-y-4">
          {/* Painel de Diagramas de Acordes para os Convidados */}
          {showDiagrams && uniqueChords.length > 0 && (
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-3.5 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Guitar className="w-3.5 h-3.5 text-amber-400" />
                  Desenhos dos Acordes ({uniqueChords.length}){' '}
                  {isSimplified && (
                    <span className="text-emerald-400 font-extrabold">
                      • Versão Simplificada
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {uniqueChords.map((chordName) => (
                  <div
                    key={chordName}
                    onClick={() => setSelectedPopupChord(chordName)}
                    className="cursor-pointer hover:scale-105 transition"
                  >
                    <ChordDiagram chord={chordName} size="md" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-4 sm:p-8 shadow-xl">
            {/* Barra Simples de Leitura para os Amigos */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-zinc-800">
              <div>
                <span className="text-xs uppercase font-bold text-amber-400">
                  Acompanhando ao vivo
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  {currentSong.title} — {currentSong.artist}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Cifra Simplificada para Violeiros Iniciantes */}
                <button
                  type="button"
                  onClick={() => setIsSimplified((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    isSimplified
                      ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {isSimplified ? 'Simplificada!' : 'Simplificar Cifra'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagrams((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    showDiagrams
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <Guitar className="w-3.5 h-3.5" />
                  <span>Acordes</span>
                </button>

                <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                  <button
                    onClick={() => setFontSize((f) => Math.max(13, f - 2))}
                    className="p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                    title="Diminuir Letra"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setFontSize((f) => Math.min(26, f + 2))}
                    className="p-1.5 text-zinc-300 hover:text-white cursor-pointer"
                    title="Aumentar Letra"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Cifra Completa com Acordes Clicáveis */}
            <div
              className="chord-sheet-container select-text overflow-x-auto"
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
                        <span
                          onClick={() =>
                            pair.chords?.trim() &&
                            setSelectedPopupChord(pair.chords.trim())
                          }
                          className={`chord-symbol ${
                            pair.chords?.trim()
                              ? 'cursor-pointer hover:underline hover:text-amber-300'
                              : ''
                          }`}
                        >
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
          </div>

          {/* Controle Flutuante Fixo de Rolagem (+ e -) */}
          <FloatingScrollControl
            isAutoScrolling={isAutoScrolling}
            onToggleScroll={() => setIsAutoScrolling((prev) => !prev)}
            scrollSpeed={scrollSpeed}
            onChangeSpeed={setScrollSpeed}
          />
        </div>
      )}

      {/* VISÃO 2: RANKING DA FILA + ESCOLHER MÚSICAS */}
      {guestSection === 'choose' && (
        <div className="space-y-6">
          {/* RANKING DAS PRÓXIMAS MÚSICAS (Votação Ao Vivo) */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    Ranking das Próximas Músicas ({queue.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400">
                    As músicas mais votadas pelos amigos sobem para o topo da fila!
                  </p>
                </div>
              </div>
            </div>

            {queue.length === 0 ? (
              <div className="text-center py-8 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-400">
                <p className="text-base font-semibold">
                  Nenhuma música na fila ainda!
                </p>
                <p className="text-xs mt-1">
                  Toque em &ldquo;Escolher&rdquo; na lista abaixo para pedir a próxima música.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {queue.map((item, idx) => {
                  const song = songs.find((s) => s.id === item.songId);
                  if (!song) return null;
                  const votes = item.votes ?? 1;
                  const votersList = Array.isArray(item.voters)
                    ? item.voters.join(', ')
                    : item.requestedBy || 'Galera';

                  return (
                    <div
                      key={item.queueId}
                      className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 sm:p-4 border transition ${
                        idx === 0
                          ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                          : 'bg-zinc-950/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl font-mono text-sm font-extrabold flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-zinc-950 shadow'
                              : idx === 1
                              ? 'bg-zinc-700 text-white'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {idx + 1}º
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-white text-base truncate">
                              {song.title}
                            </h3>
                            {idx === 0 && (
                              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-extrabold uppercase">
                                Próxima a Tocar!
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300 truncate">
                            {song.artist} •{' '}
                            <span className="text-amber-400">
                              Escolhida por: {votersList}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Botão de Somar +1 Ponto direto no Ranking */}
                      <button
                        onClick={() => handleVote(song.id)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-extrabold text-xs sm:text-sm shadow transition cursor-pointer shrink-0"
                      >
                        <ThumbsUp className="w-4 h-4 fill-current" />
                        <span>{votes} {votes === 1 ? 'ponto' : 'pontos'}</span>
                        <span className="bg-zinc-950/20 px-1.5 py-0.5 rounded text-[11px]">
                          +1
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTA COMPLETA DE MÚSICAS DISPONÍVEIS PARA ESCOLHER */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-white mb-1">
              Músicas Disponíveis para Escolher
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mb-4">
              Toque no botão ao lado da música para colocar na fila ou somar +1 ponto!
            </p>

            {/* Busca grande e fácil de usar */}
            <div className="relative mb-5">
              <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar música ou cantor..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSongs.map((song) => {
                const isCurrentlyPlaying = currentSong?.id === song.id;
                const queueEntry = queue.find((q) => q.songId === song.id);
                const currentPoints = queueEntry ? queueEntry.votes ?? 1 : 0;

                return (
                  <div
                    key={song.id}
                    className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition ${
                      isCurrentlyPlaying
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : queueEntry
                        ? 'bg-zinc-950/90 border-amber-500/30'
                        : 'bg-zinc-950/60 border-zinc-800/90'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base truncate">
                          {song.title}
                        </h3>
                        {isCurrentlyPlaying && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-extrabold uppercase shrink-0">
                            Tocando
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400 truncate">
                        {song.artist}
                      </p>
                      {currentPoints > 0 && (
                        <span className="inline-block mt-1 text-xs font-bold text-amber-400">
                          🔥 Já está na fila com {currentPoints}{' '}
                          {currentPoints === 1 ? 'ponto' : 'pontos'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleVote(song.id)}
                      className={`px-4 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0 ${
                        queueEntry
                          ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/10'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>
                        {queueEntry ? `Votar (+1)` : 'Escolher'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Diagrama Ampliado ao Clicar em um Acorde */}
      {selectedPopupChord && (
        <div
          onClick={() => setSelectedPopupChord(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-amber-500/40 rounded-3xl p-5 flex flex-col items-center gap-3 shadow-2xl"
          >
            <div className="flex items-center justify-between w-full gap-6">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Desenho no Violão
              </span>
              <button
                onClick={() => setSelectedPopupChord(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ChordDiagram chord={selectedPopupChord} size="lg" />
            <span className="text-[11px] text-zinc-400">
              Dedos: 1=Indicador • 2=Médio • 3=Anelar • 4=Mínimo
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
