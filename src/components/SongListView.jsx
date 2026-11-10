import React, { useState } from 'react';
import {
  Search,
  Plus,
  Play,
  ListPlus,
  Edit2,
  Trash2,
  Music2,
  Flame,
} from 'lucide-react';

export default function SongListView({
  songs,
  currentSongId,
  onSelectSong,
  onAddToQueue,
  onNewSong,
  onEditSong,
  onDeleteSong,
}) {
  const [search, setSearch] = useState('');
  const [guestName, setGuestName] = useState('');
  const [addingSongId, setAddingSongId] = useState(null);

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      (s.rhythm && s.rhythm.toLowerCase().includes(search.toLowerCase()))
  );

  const handleConfirmQueue = (songId) => {
    onAddToQueue(songId, guestName.trim() || 'Galera da Roda');
    setAddingSongId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Busca */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Music2 className="w-5 h-5 text-amber-500" />
            Repertório da Resenha
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {songs.length} músicas cadastradas • Toque agora ou coloque na fila da roda!
          </p>
        </div>

        <button
          onClick={onNewSong}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" /> Cadastrar Música
        </button>
      </div>

      {/* Campo de Busca */}
      <div className="relative">
        <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por música, artista ou ritmo (ex: Legião, Baião, Rock)..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition"
        />
      </div>

      {/* Grid de Músicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSongs.map((song) => {
          const isPlaying = song.id === currentSongId;
          const isPromptingQueue = addingSongId === song.id;

          return (
            <div
              key={song.id}
              className={`group rounded-2xl border p-4 transition flex flex-col justify-between gap-4 ${
                isPlaying
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5'
                  : 'bg-zinc-900/60 border-zinc-800/90 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[9px] uppercase text-zinc-500 font-semibold">
                      Tom
                    </span>
                    <span className="text-sm font-mono font-bold text-amber-400">
                      {song.originalKey || 'C'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white truncate text-base">
                        {song.title}
                      </h3>
                      {isPlaying && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-zinc-950 rounded-full">
                          Na Tela
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {song.rhythm && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {song.rhythm}
                        </span>
                      )}
                      {song.playCount > 0 && (
                        <span className="text-[11px] flex items-center gap-1 text-amber-400/90">
                          <Flame className="w-3 h-3" /> {song.playCount}x tocada
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editar / Excluir */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditSong(song)}
                    title="Editar música"
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteSong(song.id)}
                    title="Excluir música"
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ações: Tocar Agora ou Pedir na Jukebox */}
              {isPromptingQueue ? (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Seu nome (ex: Lucas)"
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleConfirmQueue(song.id)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold cursor-pointer"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setAddingSongId(null)}
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                  >
                    X
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    onClick={() => onSelectSong(song.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 font-semibold text-xs transition cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Abrir na Roda Agora
                  </button>
                  <button
                    onClick={() => setAddingSongId(song.id)}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition cursor-pointer"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> + Fila Jukebox
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

