import React from 'react';
import { Trophy, Clock, Play, Flame, Calendar } from 'lucide-react';

export default function HistoryView({ songs, history = [], onSelectSong }) {
  // Top Mais Tocadas (ordenadas por playCount)
  const topPlayedSongs = [...songs]
    .filter((s) => (s.playCount || 0) > 0)
    .sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
      {/* Ranking das Mais Tocadas nos Encontros */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              As Campeãs da Resenha
            </h3>
            <p className="text-xs text-zinc-400">
              Músicas que vocês mais tocaram nos encontros
            </p>
          </div>
        </div>

        {topPlayedSongs.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Nenhuma música marcada como tocada ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {topPlayedSongs.map((song, idx) => (
              <div
                key={song.id}
                className="flex items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      idx === 0
                        ? 'bg-amber-500 text-zinc-950'
                        : idx === 1
                        ? 'bg-zinc-700 text-zinc-100'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {idx + 1}º
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">
                      {song.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate">
                      {song.artist} • Tom: {song.originalKey}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold">
                    <Flame className="w-3.5 h-3.5" /> {song.playCount}x
                  </span>
                  <button
                    onClick={() => onSelectSong(song.id)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-amber-500 text-zinc-300 hover:text-zinc-950 transition cursor-pointer"
                    title="Tocar novamente"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linha do Tempo Recente */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Histórico Recente da Roda
            </h3>
            <p className="text-xs text-zinc-400">
              Últimas músicas tocadas nesta sessão
            </p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            O histórico desta sessão aparecerá aqui conforme vocês tocarem!
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => {
              const song = songs.find((s) => s.id === entry.songId);
              if (!song) return null;

              return (
                <div
                  key={entry.historyId}
                  className="flex items-center justify-between gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">
                      {song.title}
                    </h4>
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span>{song.artist}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Calendar className="w-3 h-3" /> {formatTime(entry.playedAt)}
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectSong(song.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" /> Repetir
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

