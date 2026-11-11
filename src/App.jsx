import React, { useState, useEffect, useMemo } from 'react';
import {
  Guitar,
  BookOpen,
  Disc3,
  History,
  Cloud,
  HardDrive,
  Plus,
  Lock,
  Unlock,
  Share2,
} from 'lucide-react';
import {
  DEFAULT_MASTER_PASSWORD,
  subscribeToSongs,
  saveSong,
  removeSong,
  subscribeToSession,
  updateLiveSession,
  registerSongPlayed,
  subscribeToConnectionStatus,
  subscribeToAppSettings,
  updateMasterPassword,
  createOrSwitchRoom,
  deleteRoom,
  deleteOldRooms,
  clearRoomQueueAndHistory,
  voteOrAddSongToQueue,
} from './services/hybridStore';
import ChordViewer from './components/ChordViewer';
import SongListView from './components/SongListView';
import JukeboxView from './components/JukeboxView';
import HistoryView from './components/HistoryView';
import SongFormModal from './components/SongFormModal';
import GuestRoomView from './components/GuestRoomView';
import MasterMenuModal from './components/MasterMenuModal';

const MASTER_AUTH_STORAGE_KEY = 'resenha_is_master_authenticated_v1';

export default function App() {
  const [songs, setSongs] = useState([]);
  const [appSettings, setAppSettings] = useState({
    masterPassword: DEFAULT_MASTER_PASSWORD,
    activeRoomId: 'roda-principal',
  });

  // Identifica a sala pelo link (?sala=nome-da-sala) ou usa a sala ativa do Mestre
  const [urlRoomId, setUrlRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('sala') || null;
  });

  const currentRoomId = urlRoomId || appSettings.activeRoomId || 'roda-principal';

  const [session, setSession] = useState({
    id: currentRoomId,
    roomName: 'Resenha Musical dos Amigos',
    currentSongId: null,
    transpose: 0,
    queue: [],
    history: [],
  });

  // Estado de autenticação do Mestre (persiste no navegador do Mestre)
  const [isMaster, setIsMaster] = useState(() => {
    return localStorage.getItem(MASTER_AUTH_STORAGE_KEY) === 'true';
  });
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'viewer';
  });

  const [syncRoom, setSyncRoom] = useState(true);
  const [localSongId, setLocalSongId] = useState(null);
  const [localTranspose, setLocalTranspose] = useState(0);

  // Modal de CRUD (Criar / Editar Música)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [toast, setToast] = useState(null);
  const [connStatus, setConnStatus] = useState({
    mode: 'connecting',
    error: null,
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Inscreve nas configurações globais e lista de músicas
  useEffect(() => {
    const unsubSongs = subscribeToSongs((list) => {
      setSongs(list);
    });
    const unsubStatus = subscribeToConnectionStatus((st) => {
      setConnStatus(st);
    });
    const unsubSettings = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });

    return () => {
      unsubSongs?.();
      unsubStatus?.();
      unsubSettings?.();
    };
  }, []);

  // Inscreve na sessão em tempo real da Sala atual (currentRoomId)
  useEffect(() => {
    const unsubSession = subscribeToSession((sess) => {
      setSession(sess);
    }, currentRoomId);

    return () => {
      unsubSession?.();
    };
  }, [currentRoomId]);

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

  // Autenticação Mestre
  const handleUnlockMaster = () => {
    setIsMaster(true);
    localStorage.setItem(MASTER_AUTH_STORAGE_KEY, 'true');
    showToast('Modo Mestre desbloqueado! Bem-vindo!');
  };

  const handleLockMaster = () => {
    setIsMaster(false);
    localStorage.removeItem(MASTER_AUTH_STORAGE_KEY);
    showToast('Modo Convidado ativado.');
  };

  const handleChangeMasterPassword = async (newPass) => {
    await updateMasterPassword(newPass);
    showToast('Senha Mestre alterada com sucesso!');
  };

  // Criar ou alternar Sala pelo Mestre
  const handleCreateOrSwitchRoom = async (roomNameInput) => {
    const { roomId, roomName } = await createOrSwitchRoom(
      roomNameInput,
      currentSong?.id
    );
    setUrlRoomId(roomId);
    // Atualiza a URL sem recarregar a página para já facilitar o compartilhamento
    const newUrl = `${window.location.pathname}?sala=${encodeURIComponent(roomId)}`;
    window.history.replaceState({}, '', newUrl);
    showToast(`Sala "${roomName}" ativa e pronta para compartilhar!`);
  };

  // Excluir uma sala específica (Mestre)
  const handleDeleteRoom = async (targetRoomId, targetRoomName) => {
    if (targetRoomId === currentRoomId) {
      if (targetRoomId === 'roda-principal') {
        await clearRoomQueueAndHistory('roda-principal');
        await updateLiveSession(
          { roomName: 'Resenha Musical dos Amigos' },
          'roda-principal'
        );
        showToast('Roda Principal reiniciada e limpa!');
        return;
      }
      // Alterna primeiro para a Roda Principal antes de apagar a sala antiga
      await handleCreateOrSwitchRoom('Resenha Musical dos Amigos');
    }
    await deleteRoom(targetRoomId);
    showToast(`Sala "${targetRoomName || targetRoomId}" apagada com sucesso!`);
  };

  // Apagar todas as salas antigas, mantendo apenas a atual (Mestre)
  const handleDeleteOldRooms = async () => {
    const count = await deleteOldRooms(currentRoomId);
    showToast(
      count > 0
        ? `${count} ${count === 1 ? 'sala antiga apagada' : 'salas antigas apagadas'}!`
        : 'Nenhuma sala antiga para apagar.'
    );
  };

  // Limpar fila e histórico da sala ativa (Mestre)
  const handleClearCurrentRoom = async () => {
    await clearRoomQueueAndHistory(currentRoomId);
    showToast(`Fila e histórico da sala "${session.roomName}" zerados!`);
  };

  // Selecionar música (Mestre)
  const handleSelectSong = async (songId) => {
    if (syncRoom) {
      await updateLiveSession({ currentSongId: songId, transpose: 0 }, currentRoomId);
    } else {
      setLocalSongId(songId);
      setLocalTranspose(0);
    }
    setActiveTab('viewer');
  };

  // Alterar tom (+1 / -1 semitom)
  const handleTransposeChange = async (newTranspose) => {
    if (syncRoom) {
      await updateLiveSession({ transpose: newTranspose }, currentRoomId);
    } else {
      setLocalTranspose(newTranspose);
    }
  };

  // Votar / Escolher música para a Fila com Ranking de Pontos
  const handleVoteOrAddSong = async (songId, voterName = 'Amigo da Roda') => {
    await voteOrAddSongToQueue(songId, voterName, session, currentRoomId);
    const songTitle = songs.find((s) => s.id === songId)?.title || 'Música';
    showToast(`+1 ponto para "${songTitle}" no ranking da fila!`);
  };

  // Remover item da fila (Mestre)
  const handleRemoveFromQueue = async (queueId) => {
    const updatedQueue = (session.queue || []).filter(
      (item) => item.queueId !== queueId
    );
    await updateLiveSession({ queue: updatedQueue }, currentRoomId);
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
        session,
        currentRoomId
      );
    }
    await updateLiveSession(
      {
        currentSongId: queueItem.songId,
        transpose: 0,
        queue: updatedQueue,
      },
      currentRoomId
    );
    setActiveTab('viewer');
  };

  // Pular para a próxima música mais votada da fila
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
      session,
      currentRoomId
    );
    showToast('Música salva no histórico de Tocadas da Resenha!');
  };

  // Salvar (Criar ou Atualizar) música
  const handleSaveSong = async (songData) => {
    const isEditing = Boolean(songData.id);
    const saved = await saveSong(songData);
    showToast(`"${saved.title}" salva no repertório!`);
    if (!isEditing) {
      await updateLiveSession({ currentSongId: saved.id, transpose: 0 }, currentRoomId);
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
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Linha 1 Mobile / Esquerda Desktop: Logo, Nome da Sala e Botão Mestre */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div
              onClick={() => setActiveTab('viewer')}
              className="flex items-center gap-2.5 cursor-pointer min-w-0"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <Guitar className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-lg tracking-tight text-white truncate">
                    {session.roomName || 'Resenha Musical'}
                  </span>
                  <span
                    title={
                      connStatus.mode === 'cloud'
                        ? 'Conectado e sincronizando no Firebase Firestore!'
                        : 'Modo Local'
                    }
                    className={`hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                      connStatus.mode === 'cloud'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    {connStatus.mode === 'cloud' ? (
                      <>
                        <Cloud className="w-3 h-3" /> Ao Vivo
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3 h-3" /> Local
                      </>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 truncate">
                  {isMaster
                    ? 'Painel Mestre Ativo'
                    : 'Resenha Musical • Sincronizado em Tempo Real'}
                </p>
              </div>
            </div>

            {/* Botão Mestre visível na Linha 1 no Celular para não espremer as abas */}
            <div className="flex sm:hidden items-center gap-1.5 shrink-0">
              {isMaster && (
                <button
                  onClick={() => {
                    setEditingSong(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-extrabold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Cifra
                </button>
              )}

              <button
                onClick={() => setIsMasterModalOpen(true)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  isMaster
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                }`}
              >
                {isMaster ? (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Sala</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Mestre</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Linha 2 Mobile / Centro Desktop: Navegação por Abas do Mestre */}
          {isMaster && (
            <nav className="flex items-center justify-between sm:justify-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('viewer')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'jukebox'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Disc3 className="w-3.5 h-3.5 shrink-0" />
                <span>Ranking</span>
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
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-amber-500 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span>Tocadas</span>
              </button>
            </nav>
          )}

          {/* Direita Desktop: Botão Sala/Mestre + Nova Cifra */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {isMaster && (
              <button
                onClick={() => {
                  setEditingSong(null);
                  setIsModalOpen(true);
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> Nova Cifra
              </button>
            )}

            <button
              onClick={() => setIsMasterModalOpen(true)}
              title={
                isMaster
                  ? 'Configurar Sala e Compartilhar Atalho'
                  : 'Acesso Mestre (Anfitrião)'
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                isMaster
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {isMaster ? (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Sala & Convite</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Mestre</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-5">
        {!isMaster ? (
          /* VISÃO INTUITIVA PARA OS AMIGOS / CONVIDADOS DA SALA */
          <GuestRoomView
            roomName={session.roomName}
            songs={songs}
            currentSong={currentSong}
            transpose={effectiveTranspose}
            queue={session.queue || []}
            onVoteSong={handleVoteOrAddSong}
          />
        ) : (
          /* VISÃO COMPLETA DO MESTRE */
          <>
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
                onAddToQueue={handleVoteOrAddSong}
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
                roomId={currentRoomId}
                roomName={session.roomName}
                songs={songs}
                queue={session.queue || []}
                currentSong={currentSong}
                onPlayFromQueue={handlePlayFromQueue}
                onRemoveFromQueue={handleRemoveFromQueue}
                onAddToQueue={handleVoteOrAddSong}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                songs={songs}
                history={session.history || []}
                onSelectSong={handleSelectSong}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Cadastro / Edição de Música (Mestre) */}
      <SongFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSong}
        initialData={editingSong}
      />

      {/* Modal de Acesso Mestre / Criação de Sala & Link para Amigos */}
      <MasterMenuModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
        isMaster={isMaster}
        masterPassword={appSettings.masterPassword || DEFAULT_MASTER_PASSWORD}
        onUnlockMaster={handleUnlockMaster}
        onLockMaster={handleLockMaster}
        onChangePassword={handleChangeMasterPassword}
        currentRoomId={currentRoomId}
        currentRoomName={session.roomName}
        onCreateOrSwitchRoom={handleCreateOrSwitchRoom}
        onDeleteRoom={handleDeleteRoom}
        onDeleteOldRooms={handleDeleteOldRooms}
        onClearCurrentRoom={handleClearCurrentRoom}
        connStatus={connStatus}
      />

      {/* Toast de Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-extrabold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-2xl animate-bounce">
          {toast}
        </div>
      )}
    </div>
  );
}
