import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Disc3,
  QrCode,
  Play,
  Trash2,
  PlusCircle,
  Trophy,
  Sparkles,
  Copy,
  Check,
  ThumbsUp,
  Share2,
  MessageSquarePlus,
  Plus,
} from 'lucide-react';

export default function JukeboxView({
  roomId = 'roda-principal',
  roomName = 'Resenha Musical',
  songs,
  queue = [],
  suggestions = [],
  currentSong,
  onPlayFromQueue,
  onRemoveFromQueue,
  onAddToQueue,
  onRemoveSuggestion,
  onClearSuggestions,
  onImportSuggestion,
}) {
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id || '');
  const [requesterName, setRequesterName] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sala=${encodeURIComponent(
          roomId
        )}`
      : `https://resenha-musical.vercel.app/?sala=${roomId}`;

  const handleAddRequest = (e) => {
    e.preventDefault();
    if (!selectedSongId) return;
    onAddToQueue(selectedSongId, requesterName.trim() || 'Amigo da Roda');
    setRequesterName('');
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `🎸 Entra aí na nossa sala *${roomName}* no Resenha Musical para acompanhar as cifras ao vivo e votar nas próximas músicas:\n${shareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
      {/* Coluna Esquerda: Fila Coletiva + Formulário Rápido */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tocando Agora Banner */}
        {currentSong && (
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-zinc-900 border border-amber-500/40 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Disc3 className="w-6 h-6 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Rolando Agora na Sala &ldquo;{roomName}&rdquo;
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {currentSong.title}
                </h3>
                <p className="text-xs text-zinc-300">
                  {currentSong.artist} • Tom Original: {currentSong.originalKey}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Adicionar Pedido / Voto Rápido */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Adicionar ou Votar em Música na Fila
          </h3>

          <form
            onSubmit={handleAddRequest}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-5">
              <select
                value={selectedSongId}
                onChange={(e) => setSelectedSongId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {songs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {s.artist} ({s.originalKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Quem está pedindo? (ex: Bia)"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> +1 Ponto
              </button>
            </div>
          </form>
        </div>

        {/* Lista da Fila de Reprodução Ordenada por Pontos/Votos */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Ranking da Fila ({queue.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Ordenado automaticamente pelas músicas com mais pontos dos amigos
              </p>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              <p className="text-sm">A fila está vazia no momento.</p>
              <p className="text-xs mt-1">
                Compartilhe o QR Code ao lado para os amigos votarem nas músicas!
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
                    className={`flex items-center justify-between gap-3 border rounded-xl p-3.5 transition ${
                      idx === 0
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-zinc-950/80 border-zinc-800/90 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-800 text-amber-400'
                        }`}
                      >
                        {idx + 1}º
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">
                            {song.title}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-extrabold">
                            <ThumbsUp className="w-3 h-3" /> {votes}{' '}
                            {votes === 1 ? 'pt' : 'pts'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 truncate">
                          {song.artist} •{' '}
                          <span className="text-amber-400/90 font-medium">
                            Votos: {votersList}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onPlayFromQueue(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Tocar Agora
                      </button>
                      <button
                        onClick={() => onRemoveFromQueue(item.queueId)}
                        title="Remover da fila"
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel do Mestre: Sugestões de Músicas Enviadas pelos Amigos */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-amber-500" />
                Sugestões dos Amigos ({suggestions.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Músicas que os convidados pediram para você cadastrar no repertório
              </p>
            </div>

            {suggestions.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja limpar todas as sugestões enviadas pelos amigos?'
                    )
                  ) {
                    onClearSuggestions?.();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Todas
              </button>
            )}
          </div>

          {suggestions.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              <p className="text-sm">Nenhuma sugestão pendente.</p>
              <p className="text-xs mt-1">
                Quando os convidados sugerirem músicas novas na tela deles, elas aparecerão aqui!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {suggestions.map((sug) => (
                <div
                  key={sug.suggestionId}
                  className="flex items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3.5 hover:border-zinc-700 transition"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">
                      {sug.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      {sug.artist || 'Artista não informado'} •{' '}
                      <span className="text-amber-400 font-medium">
                        Sugerida por: {sug.suggestedBy || 'Amigo'}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {onImportSuggestion && (
                      <button
                        type="button"
                        onClick={() => onImportSuggestion(sug)}
                        title="Abrir tela de Nova Cifra já preenchida com esta sugestão"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/40 font-bold text-xs transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Cadastrar Cifra
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveSuggestion?.(sug.suggestionId)}
                      title="Excluir esta sugestão"
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: QR Code da Sala */}
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-3">
            <QrCode className="w-3.5 h-3.5" /> Convite da Sala
          </div>
          <h3 className="text-lg font-bold text-white">{roomName}</h3>
          <p className="text-xs text-zinc-400 mt-1 mb-5">
            Seus amigos escaneiam este QR Code ou entram pelo link para ver a música tocando agora e votar no ranking da fila!
          </p>

          <div className="bg-white p-4 rounded-2xl shadow-xl">
            <QRCodeSVG
              value={shareUrl}
              size={190}
              bgColor="#ffffff"
              fgColor="#09090b"
              level="M"
            />
          </div>

          <div className="w-full space-y-2.5 mt-5">
            <button
              onClick={copyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Link Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Atalho da Sala
                </>
              )}
            </button>

            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Compartilhar no WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
