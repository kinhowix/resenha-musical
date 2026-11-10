import React, { useState, useEffect, useMemo } from 'react';
import {
  Guitar,
  BookOpen,
  Disc3,
  History,
  Cloud,
  HardDrive,
  Plus,
} from 'lucide-react';
import {
  isFirebaseConfigured,
  subscribeToSongs,
  saveSong,
  removeSong,
  subscribeToSession,
  updateLiveSession,
  registerSongPlayed,
  subscribeToConnectionStatus,
} from './services/hybridStore';
import ChordViewer from './components/ChordViewer';
import SongListView from './components/SongListView';
import JukeboxView from './components/JukeboxView';
import HistoryView from './components/HistoryView';
import SongFormModal from './components/SongFormModal';

export default function App() {
  const [songs, setSongs] = useState([]);
  const [session, setSession] = useState({
    currentSongId: null,
    transpose: 0,
    queue: [],
    history: [],
  });

  // Se o usuário abrir pelo link do QR Code (?tab=jukebox), já cai na Jukebox
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'viewer';
  });

  // Permite desligar o sync caso alguém queira olhar outra cifra sozinho sem mudar a roda
  const [syncRoom, setSyncRoom] = useState(true);
  const [localSongId, setLocalSongId] = useState(null);
  const [localTranspose, setLocalTranspose] = useState(0);

  // Modal de CRUD (Criar / Editar Música)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [toast, setToast] = useState(null);
  const [connStatus, setConnStatus] = useState({ mode: 'connecting', error: null });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Inscreve nas músicas e na sessão em tempo real (Firestore onSnapshot ou Local Broadcast)
  useEffect(() => {
    const unsubSongs = subscribeToSongs((list) => {
      setSongs(list);
    });
    const unsubSession = subscribeToSession((sess) => {
      setSession(sess);
    });
    const unsubStatus = subscribeToConnectionStatus((st) => {
      setConnStatus(st);
    });

    return () => {
      unsubSongs?.();
      unsubSession?.();
      unsubStatus?.();
    };
  }, []);

  const effectiveSongId = syncRoom
    ? session.currentSongId || songs[0]?.id
    : localSongId || session.currentSongId || songs[0]?.id;

  const effectiveTranspose = syncRoom
    ? session.transpose || 0
    : localTranspose;

  const currentSong = useMemo(() => {
    return songs.find((s) => s.id === effectiveSongId) || songs[0] || null;
  }, [songs, effectiveSongId]);

  const nextQueueItem = session.queue?.[0] || null;
  const nextSongObj = useMemo(() => {
    if (!nextQueueItem) return null;
    return songs.find((s) => s.id === nextQueueItem.songId) || null;
  }, [songs, nextQueueItem]);

  // Selecionar música
  const handleSelectSong = async (songId) => {
    if (syncRoom) {
      await updateLiveSession({ currentSongId: songId, transpose: 0 });
    } else {
      setLocalSongId(songId);
      setLocalTranspose(0);
    }
    setActiveTab('viewer');
  };

  // Alterar tom (+1 / -1 semitom)
  const handleTransposeChange = async (newTranspose) => {
    if (syncRoom) {
      await updateLiveSession({ transpose: newTranspose });
    } else {
      setLocalTranspose(newTranspose);
    }
  };

  // Adicionar música na Fila da Jukebox
  const handleAddToQueue = async (songId, requestedBy = 'Amigo') => {
    const newItem = {
      queueId: `q-${Date.now()}`,
      songId,
      requestedBy,
      addedAt: new Date().toISOString(),
    };
    const updatedQueue = [...(session.queue || []), newItem];
    await updateLiveSession({ queue: updatedQueue });
    const songTitle = songs.find((s) => s.id === songId)?.title || 'Música';
    showToast(`"${songTitle}" adicionada na fila por ${requestedBy}!`);
  };

  // Remover item da fila
  const handleRemoveFromQueue = async (queueId) => {
    const updatedQueue = (session.queue || []).filter(
      (item) => item.queueId !== queueId
    );
    await updateLiveSession({ queue: updatedQueue });
  };

  // Tocar item da fila imediatamente e registrar a anterior como tocada
  const handlePlayFromQueue = async (queueItem) => {
    const updatedQueue = (session.queue || []).filter(
      (item) => item.queueId !== queueItem.queueId
    );
    if (currentSong) {
      await registerSongPlayed(
        currentSong.id,
        queueItem.songId,
        0,
        session
      );
    }
    await updateLiveSession({
      currentSongId: queueItem.songId,
      transpose: 0,
      queue: updatedQueue,
    });
    setActiveTab('viewer');
  };

  // Pular para a próxima música da fila
  const handleNextInQueue = async () => {
    if (!nextQueueItem) return;
    await handlePlayFromQueue(nextQueueItem);
  };

  // Marcar música atual como tocada
  const handleMarkPlayed = async (songId) => {
    await registerSongPlayed(
      songId,
      songId,
      effectiveTranspose,
      session
    );
    showToast('Música salva no histórico de Tocadas da Resenha!');
  };

  // Salvar (Criar ou Atualizar) música
  const handleSaveSong = async (songData) => {
    const isEditing = Boolean(songData.id);
    const saved = await saveSong(songData);
    showToast(`"${saved.title}" salva no repertório!`);
    // Se acabou de cadastrar uma música nova, já seleciona ela ou garante que está visível!
    if (!isEditing) {
      await updateLiveSession({ currentSongId: saved.id, transpose: 0 });
    }
  };

  // Excluir música
  const handleDeleteSong = async (songId) => {
    const target = songs.find((s) => s.id === songId);
    if (!window.confirm(`Deseja excluir "${target?.title || 'esta música'}"?`)) {
      return;
    }
    await removeSong(songId);
    showToast('Música removida do repertório.');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header Principal */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <div
            onClick={() => setActiveTab('viewer')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Guitar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Resenha Musical
                </span>
                <span
                  title={
                    connStatus.mode === 'cloud'
                      ? 'Conectado e sincronizando no Firebase Firestore!'
                      : 'Salvo no navegador (Ative o Firestore Database em Modo de Teste no painel do Firebase para sincronizar na nuvem)'
                  }
                  className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    connStatus.mode === 'cloud'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {connStatus.mode === 'cloud' ? (
                    <>
                      <Cloud className="w-3 h-3" /> Firebase Ativo
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3 h-3" /> Modo Local (Firestore Pendente)
                    </>
                  )}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Cifras em Roda • Sincronização em Tempo Real
              </p>
            </div>
          </div>

          {/* Navegação por Abas */}
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('viewer')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                activeTab === 'viewer'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Guitar className="w-3.5 h-3.5 shrink-0" />
              <span>Cifra</span>
            </button>

            <button
              onClick={() => setActiveTab('repertoire')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                activeTab === 'repertoire'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Músicas ({songs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('jukebox')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                activeTab === 'jukebox'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Disc3 className="w-3.5 h-3.5 shrink-0" />
              <span>Jukebox</span>
              {session.queue?.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'jukebox'
                      ? 'bg-zinc-950 text-amber-400'
                      : 'bg-amber-500 text-zinc-950'
                  }`}
                >
                  {session.queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-zinc-950 shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Tocadas</span>
            </button>
          </nav>

          {/* Atalho Nova Música */}
          <button
            onClick={() => {
              setEditingSong(null);
              setIsModalOpen(true);
            }}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nova Cifra
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6">
        {activeTab === 'viewer' && (
          <ChordViewer
            song={currentSong}
            transpose={effectiveTranspose}
            onTransposeChange={handleTransposeChange}
            onNextInQueue={handleNextInQueue}
            onMarkPlayed={handleMarkPlayed}
            onEditSong={(song) => {
              setEditingSong(song);
              setIsModalOpen(true);
            }}
            queueCount={session.queue?.length || 0}
            nextSongTitle={nextSongObj?.title}
            syncRoom={syncRoom}
            onToggleSyncRoom={() => {
              setSyncRoom((prev) => !prev);
              setLocalSongId(currentSong?.id);
              setLocalTranspose(effectiveTranspose);
            }}
          />
        )}

        {activeTab === 'repertoire' && (
          <SongListView
            songs={songs}
            currentSongId={currentSong?.id}
            onSelectSong={handleSelectSong}
            onAddToQueue={handleAddToQueue}
            onNewSong={() => {
              setEditingSong(null);
              setIsModalOpen(true);
            }}
            onEditSong={(song) => {
              setEditingSong(song);
              setIsModalOpen(true);
            }}
            onDeleteSong={handleDeleteSong}
          />
        )}

        {activeTab === 'jukebox' && (
          <JukeboxView
            songs={songs}
            queue={session.queue || []}
            currentSong={currentSong}
            onPlayFromQueue={handlePlayFromQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onAddToQueue={handleAddToQueue}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            songs={songs}
            history={session.history || []}
            onSelectSong={handleSelectSong}
          />
        )}
      </main>

      {/* Modal de Cadastro / Edição de Música */}
      <SongFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSong}
        initialData={editingSong}
      />

      {/* Toast de Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-2xl animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}

