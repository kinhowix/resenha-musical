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
  Mic,
  MessageSquarePlus,
  Send,
  X,
  Timer,
  Flame,
  LogIn,
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

function normalizeGuestText(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function GuestRoomView({
  hasActiveRoom = true,
  roomName,
  countdownTargetAt = null,
  songs = [],
  currentSong,
  transpose = 0,
  queue = [],
  autoSuggestedSongs = [],
  suggestions = [],
  onVoteSong,
  onSuggestSong,
  onJoinRoom,
  onOpenMasterLogin,
}) {
  // Aba super simples: 'choose' (Escolher Música & Ranking) ou 'lyrics' (Ver Música Tocando Agora / Consultada)
  const [guestSection, setGuestSection] = useState('choose');
  const [previewSongId, setPreviewSongId] = useState(null);
  const [search, setSearch] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(null);
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
  const [lyricsOnly, setLyricsOnly] = useState(false);
  const [selectedPopupChord, setSelectedPopupChord] = useState(null);

  // Campos para enviar sugestão de música nova ao Mestre
  const [sugTitle, setSugTitle] = useState('');
  const [sugArtist, setSugArtist] = useState('');
  const [sugSent, setSugSent] = useState(false);

  // Calcula localmente a contagem regressiva a partir de countdownTargetAt (0 requisições extras!)
  useEffect(() => {
    if (!countdownTargetAt) {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const targetMs = new Date(countdownTargetAt).getTime();
      if (Number.isNaN(targetMs)) {
        setRemainingSeconds(null);
        return;
      }
      const diffSec = Math.max(0, Math.ceil((targetMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [countdownTargetAt]);

  const formatCountdown = (totalSec) => {
    if (totalSec === null || totalSec === undefined) return '';
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleJoinRoomSubmit = (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    onJoinRoom?.(roomCodeInput.trim());
  };

  const handleSendSuggestion = (e) => {
    e.preventDefault();
    if (!sugTitle.trim()) return;
    onSuggestSong?.({
      title: sugTitle.trim(),
      artist: sugArtist.trim(),
      suggestedBy: guestName.trim() || 'Amigo da Roda',
    });
    setSugTitle('');
    setSugArtist('');
    setSugSent(true);
    setTimeout(() => setSugSent(false), 3500);
  };

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

  const activeDisplaySong = useMemo(() => {
    if (previewSongId) {
      return songs.find((s) => s.id === previewSongId) || currentSong || songs[0] || null;
    }
    return currentSong || songs[0] || null;
  }, [previewSongId, songs, currentSong]);

  const activeTranspose =
    previewSongId && previewSongId !== currentSong?.id ? 0 : transpose;

  const parsedLines = useMemo(() => {
    return parseChordProSong(
      activeDisplaySong?.content || '',
      activeTranspose,
      isSimplified
    );
  }, [activeDisplaySong?.content, activeTranspose, isSimplified]);

  const uniqueChords = useMemo(() => {
    return extractUniqueChords(parsedLines);
  }, [parsedLines]);

  const currentKey = useMemo(() => {
    const transposedKey = transposeChordSymbol(
      activeDisplaySong?.originalKey || 'C',
      activeTranspose
    );
    return isSimplified ? simplifyChordSymbol(transposedKey) : transposedKey;
  }, [activeDisplaySong?.originalKey, activeTranspose, isSimplified]);

  const filteredSongs = useMemo(() => {
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.artist.toLowerCase().includes(search.toLowerCase()) ||
        (s.rhythm && s.rhythm.toLowerCase().includes(search.toLowerCase()))
    );
  }, [songs, search]);

  // Verifica 100% localmente (zero requisições) se a música que o amigo está digitando na sugestão já existe
  const suggestionMatchesInRepertoire = useMemo(() => {
    const normSug = normalizeGuestText(sugTitle);
    if (!normSug || normSug.length < 3) return [];
    return songs.filter((s) => {
      const normTitle = normalizeGuestText(s.title);
      return (
        normTitle === normSug ||
        normTitle.includes(normSug) ||
        normSug.includes(normTitle)
      );
    });
  }, [sugTitle, songs]);

  const renderSuggestionBox = () => (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 shrink-0">
          <MessageSquarePlus className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white">
            Não achou sua música? Envie uma Sugestão!
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400">
            {hasActiveRoom
              ? 'Peça qualquer música para o Mestre cadastrar na resenha!'
              : 'Mesmo antes da sala abrir, você já pode deixar sugestões de músicas para o Mestre preparar!'}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSendSuggestion}
        className="grid grid-cols-1 sm:grid-cols-12 gap-3 mt-4"
      >
        <div className="sm:col-span-5">
          <input
            type="text"
            required
            value={sugTitle}
            onChange={(e) => setSugTitle(e.target.value)}
            placeholder="Nome da música (ex: Pinhal) *"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="sm:col-span-4">
          <input
            type="text"
            value={sugArtist}
            onChange={(e) => setSugArtist(e.target.value)}
            placeholder="Cantor / Banda (opcional)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            className="w-full h-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Sugestão</span>
          </button>
        </div>
      </form>

      {/* Aviso instantâneo local caso a música digitada já exista no repertório */}
      {suggestionMatchesInRepertoire.length > 0 && (
        <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
          <p className="text-xs sm:text-sm font-bold text-emerald-300">
            🎉 Boa notícia! Encontramos música(s) com esse nome que já estão no repertório:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestionMatchesInRepertoire.slice(0, 3).map((match) => (
              <div
                key={match.id}
                className="flex items-center gap-2 bg-zinc-950/90 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <span className="font-bold text-emerald-400">{match.title}</span>
                <span className="text-zinc-400">— {match.artist}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewSongId(match.id);
                    setGuestSection('lyrics');
                  }}
                  className="ml-1 px-2 py-0.5 rounded-lg bg-emerald-500 text-zinc-950 font-extrabold hover:bg-emerald-400 transition cursor-pointer"
                >
                  Ver Letra
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sugSent && (
        <div className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold">
          ✅ Sugestão enviada para o Mestre da Resenha!
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80">
          <span className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
            Últimas sugestões enviadas pela galera ({suggestions.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <span
                key={s.suggestionId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
              >
                <strong className="text-amber-400">{s.title}</strong>
                {s.artist && <span>— {s.artist}</span>}
                <span className="text-zinc-500">({s.suggestedBy})</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-32">
      {/* Banner Superior: Sala Ao Vivo OU Recepção Exclusiva (Fora da Sala) */}
      {!hasActiveRoom ? (
        <div className="bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
                <Guitar className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Bem-vindo ao Resenha Musical
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                  Cante junto com a galera direto pelo seu celular! 🎶
                </h1>
                <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-2xl">
                  Aqui na nossa resenha, <strong className="text-amber-400">as músicas, letras e cifras aparecem ao vivo na tela do celular de todo mundo</strong> para cantarmos juntos! Você também vota nas suas músicas preferidas para subirem no ranking da fila.
                </p>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                  🔒 <strong className="text-white">As salas são exclusivas para convidados:</strong> para entrar na votação ao vivo, basta tocar no <strong className="text-emerald-400">link de convite enviado no seu WhatsApp</strong> (ou ler o QR Code da sala). Enquanto isso, você já pode explorar o repertório e enviar sugestões abaixo!
                </p>
              </div>
            </div>

            {/* Caixa lateral: Seu Nome + Entrar pelo nome/código da sala */}
            <div className="bg-zinc-950/85 border border-zinc-800 rounded-2xl p-4 lg:w-80 shrink-0 space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                  Seu Nome na Resenha (Opcional):
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Tio João, Ana..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {onJoinRoom && (
                <form
                  onSubmit={handleJoinRoomSubmit}
                  className="pt-2 border-t border-zinc-800/80 space-y-1.5"
                >
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-300">
                    Tem o nome ou código da sala?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      placeholder="Ex: Churrasco do Alex"
                      className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs sm:text-sm transition cursor-pointer shrink-0"
                    >
                      <LogIn className="w-4 h-4" /> Entrar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {onOpenMasterLogin && (
            <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-zinc-400">
                Recebeu o convite pelo WhatsApp? Abra pelo link do convite para cair direto na sala da resenha!
              </span>
              <button
                type="button"
                onClick={onOpenMasterLogin}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-extrabold transition cursor-pointer"
              >
                Sou o Anfitrião (Criar Sala com Senha Mestre)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-zinc-950 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Sala Exclusiva Ao Vivo
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {roomName || 'Resenha Musical'}
              </h1>
              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-2xl">
                🎶 <strong className="text-amber-400">As letras e cifras aparecem ao vivo aqui na tela do seu celular</strong> para todo mundo cantar junto! Vote nas músicas abaixo para preparar a fila da nossa roda!
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

          {/* Contador Regressivo "Aquecendo o Gogó" */}
          {remainingSeconds !== null && (
            <div
              className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${remainingSeconds > 0
                ? 'bg-gradient-to-r from-amber-500/20 via-zinc-950 to-zinc-950 border-amber-500/60 shadow-lg shadow-amber-500/10'
                : 'bg-gradient-to-r from-emerald-500/20 via-zinc-950 to-zinc-950 border-emerald-500/50'
                }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${remainingSeconds > 0
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-emerald-500 text-zinc-950'
                    }`}
                >
                  {remainingSeconds > 0 ? (
                    <Timer className="w-7 h-7 animate-pulse" />
                  ) : (
                    <Flame className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${remainingSeconds > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                  >
                    {remainingSeconds > 0
                      ? '🎤 Vão aquecendo o gogó!'
                      : '🔥 O aquecimento terminou!'}
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white">
                    {remainingSeconds > 0
                      ? 'A nossa resenha de música começa em instantes!'
                      : 'A Roda Começou! Solta a voz com a galera!'}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-0.5">
                    {remainingSeconds > 0
                      ? 'Aproveite enquanto o relógio roda para já ir votando nas músicas abaixo e montar a fila!'
                      : 'Acompanhe a letra na tela e continue votando nas próximas músicas!'}
                  </p>
                </div>
              </div>

              {remainingSeconds > 0 && (
                <div className="bg-zinc-950 border-2 border-amber-500/70 rounded-2xl px-5 py-2.5 text-center shrink-0 shadow-inner">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-amber-400">
                    Começa em
                  </span>
                  <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
                    {formatCountdown(remainingSeconds)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cartão Destaque: TOCANDO AGORA */}
          {currentSong && (
            <div className="bg-zinc-950/90 border border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                onClick={() => {
                  setPreviewSongId(null);
                  setGuestSection(
                    guestSection === 'lyrics' ? 'choose' : 'lyrics'
                  );
                }}
                className={`py-3 px-5 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 cursor-pointer shrink-0 ${guestSection === 'lyrics' && !previewSongId
                  ? 'bg-zinc-800 text-white hover:bg-zinc-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25'
                  }`}
              >
                <Music className="w-4 h-4" />
                {guestSection === 'lyrics' && !previewSongId
                  ? 'Voltar para Escolher Músicas'
                  : 'Ver Letra e Acordes Agora'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dois Botões Gigantes e Intuitivos para Alternar Visão */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setGuestSection('choose')}
          className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 border transition cursor-pointer ${guestSection === 'choose'
            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
        >
          <ThumbsUp className="w-5 h-5" />
          <span>
            {hasActiveRoom
              ? `Escolher Música (${songs.length})`
              : `Repertório & Sugestões (${songs.length})`}
          </span>
        </button>

        <button
          onClick={() => {
            if (hasActiveRoom) setPreviewSongId(null);
            setGuestSection('lyrics');
          }}
          className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 border transition cursor-pointer ${guestSection === 'lyrics'
            ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
            : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
        >
          <Music className="w-5 h-5" />
          <span>
            {hasActiveRoom && !previewSongId
              ? 'Cifra Tocando Agora'
              : 'Ver Letra / Cifra'}
          </span>
        </button>
      </div>

      {/* VISÃO 1: CIFRA E LETRA DA MÚSICA TOCANDO AGORA OU CONSULTADA */}
      {guestSection === 'lyrics' && activeDisplaySong && (
        <div className="space-y-4">
          {/* Painel de Diagramas de Acordes para os Convidados (Oculto se estiver no Modo Só Letra) */}
          {!lyricsOnly && showDiagrams && uniqueChords.length > 0 && (
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
                  {hasActiveRoom && !previewSongId
                    ? 'Acompanhando ao vivo'
                    : 'Visualizando música do repertório'}
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  {activeDisplaySong.title} — {activeDisplaySong.artist}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Botão Modo Cantor: Ocultar Cifras (Só Letra) */}
                <button
                  type="button"
                  onClick={() => setLyricsOnly((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${lyricsOnly
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                    }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>
                    {lyricsOnly
                      ? 'Mostrando Só Letra (Ver Cifras)'
                      : 'Ocultar Cifras (Só Cantar)'}
                  </span>
                </button>

                {/* Botão Cifra Simplificada para Violeiros Iniciantes (aparece quando cifras estão visíveis) */}
                {!lyricsOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsSimplified((prev) => !prev)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${isSimplified
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
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${showDiagrams
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                    >
                      <Guitar className="w-3.5 h-3.5" />
                      <span>Desenhos</span>
                    </button>
                  </>
                )}

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

            {/* Cifra Completa ou Apenas Letra Limpa (para quem só vai cantar!) */}
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

                if (lyricsOnly) {
                  const fullLineLyrics = line.pairs
                    .map((p) => p.lyrics || '')
                    .join('')
                    .trim();
                  // Se a linha só tinha acordes (ex: Intro instrumental), oculta no modo Só Letra
                  if (!fullLineLyrics) return null;

                  return (
                    <div
                      key={line.id}
                      className="text-zinc-100 leading-relaxed mb-2 font-sans font-medium"
                    >
                      {fullLineLyrics}
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
                          className={`chord-symbol ${pair.chords?.trim()
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

      {/* VISÃO 2: RANKING DA FILA + ESCOLHER MÚSICAS + SUGESTÕES */}
      {guestSection === 'choose' && (
        <div className="space-y-6">
          {/* Quando não há sala ativa, exibe a Caixa de Sugestões logo no topo para os amigos já irem sugerindo */}
          {!hasActiveRoom && renderSuggestionBox()}

          {/* RANKING DAS PRÓXIMAS MÚSICAS (Votação Ao Vivo - apenas quando há sala aberta) */}
          {hasActiveRoom && (
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
                <div className="space-y-3">
                  <div className="text-center py-5 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-400">
                    <p className="text-sm sm:text-base font-semibold">
                      Nenhuma música votada ainda!
                    </p>
                    <p className="text-xs mt-1">
                      Se ninguém votar, o violão segue a sugestão automática abaixo. Vote para colocar a sua na frente!
                    </p>
                  </div>

                  {autoSuggestedSongs.length > 0 && (
                    <div className="space-y-2">
                      {autoSuggestedSongs.slice(0, 3).map((song, idx) => (
                        <div
                          key={song.id}
                          className="flex items-center justify-between gap-3 rounded-2xl p-3.5 bg-zinc-950/60 border border-zinc-800/80"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 text-zinc-400 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                              {idx + 1}º
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-zinc-200 text-sm sm:text-base truncate">
                                  {song.title}
                                </h3>
                                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold shrink-0">
                                  Auto (0 votos)
                                </span>
                              </div>
                              <p className="text-xs text-zinc-400 truncate">
                                {song.artist}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleVote(song.id)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40 font-extrabold text-xs transition cursor-pointer shrink-0"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Votar (+1)</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                        className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 sm:p-4 border transition ${idx === 0
                          ? 'bg-amber-500/15 border-amber-500/50 shadow-md'
                          : 'bg-zinc-950/80 border-zinc-800'
                          }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl font-mono text-sm font-extrabold flex items-center justify-center shrink-0 ${idx === 0
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
          )}

          {/* LISTA COMPLETA DE MÚSICAS DISPONÍVEIS NO REPERTÓRIO */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg sm:text-xl font-extrabold text-white mb-1">
              {hasActiveRoom
                ? 'Músicas Disponíveis para Escolher'
                : `Músicas Já Cadastradas no Repertório (${songs.length})`}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mb-4">
              {hasActiveRoom
                ? 'Toque no botão ao lado da música para colocar na fila ou somar +1 ponto!'
                : 'Consulte abaixo todas as músicas que já estão prontas no repertório do Mestre. Se sentir falta de alguma, envie sua sugestão acima!'}
            </p>

            {/* Busca grande e fácil de usar */}
            <div className="relative mb-5">
              <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar música ou cantor no repertório..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSongs.map((song) => {
                const isCurrentlyPlaying =
                  hasActiveRoom && currentSong?.id === song.id;
                const queueEntry = hasActiveRoom
                  ? queue.find((q) => q.songId === song.id)
                  : null;
                const currentPoints = queueEntry ? queueEntry.votes ?? 1 : 0;

                return (
                  <div
                    key={song.id}
                    className={`rounded-2xl border p-4 flex items-center justify-between gap-3 transition ${isCurrentlyPlaying
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
                        {song.artist} • Tom: {song.originalKey}
                      </p>
                      {currentPoints > 0 && (
                        <span className="inline-block mt-1 text-xs font-bold text-amber-400">
                          🔥 Já está na fila com {currentPoints}{' '}
                          {currentPoints === 1 ? 'ponto' : 'pontos'}
                        </span>
                      )}
                    </div>

                    {hasActiveRoom ? (
                      <button
                        onClick={() => handleVote(song.id)}
                        className={`px-4 py-3 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0 ${queueEntry
                          ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40'
                          : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/10'
                          }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>
                          {queueEntry ? `Votar (+1)` : 'Escolher'}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewSongId(song.id);
                          setGuestSection('lyrics');
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                      >
                        <Music className="w-3.5 h-3.5" />
                        <span>Ver Letra</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* CAIXINHA DE SUGESTÕES PARA O MESTRE (quando há sala ativa, fica abaixo da lista) */}
          {hasActiveRoom && renderSuggestionBox()}
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
