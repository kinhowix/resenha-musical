import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Disc3,
  QrCode,
  Play,
  Trash2,
  PlusCircle,
  Users,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';

export default function JukeboxView({
  songs,
  queue = [],
  currentSong,
  onPlayFromQueue,
  onRemoveFromQueue,
  onAddToQueue,
}) {
  const [selectedSongId, setSelectedSongId] = useState(songs[0]?.id || '');
  const [requesterName, setRequesterName] = useState('');
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?tab=jukebox`
      : 'https://resenha-musical.vercel.app/?tab=jukebox';

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
                  Rolando Agora na Roda
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

        {/* Adicionar Pedido Rápido (Celular dos Amigos) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Pedir Música na Jukebox
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
                <PlusCircle className="w-4 h-4" /> Entrar na Fila
              </button>
            </div>
          </form>
        </div>

        {/* Lista da Fila de Reprodução */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Próximas da Roda ({queue.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Ordem dos pedidos feitos pelos amigos em tempo real
              </p>
            </div>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl text-zinc-500">
              <p className="text-sm">A fila está vazia no momento.</p>
              <p className="text-xs mt-1">
                Peça uma música acima ou escaneie o QR Code ao lado!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item, idx) => {
                const song = songs.find((s) => s.id === item.songId);
                if (!song) return null;

                return (
                  <div
                    key={item.queueId}
                    className="flex items-center justify-between gap-3 bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3.5 hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-zinc-800 text-amber-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-sm truncate">
                          {song.title}
                        </h4>
                        <p className="text-xs text-zinc-400 truncate">
                          {song.artist} •{' '}
                          <span className="text-amber-400/90 font-medium">
                            Pedido por {item.requestedBy || 'Galera'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onPlayFromQueue(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Puxar Agora
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
      </div>

      {/* Coluna Direita: QR Code da Roda */}
      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-3">
            <QrCode className="w-3.5 h-3.5" /> Jukebox Coletiva
          </div>
          <h3 className="text-lg font-bold text-white">QR Code da Roda</h3>
          <p className="text-xs text-zinc-400 mt-1 mb-5">
            Seus amigos escaneiam este QR Code no celular para acompanhar a cifra sincronizada e adicionar músicas na fila!
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

          <button
            onClick={copyLink}
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> Link Copiado!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> Copiar Link da Roda
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

