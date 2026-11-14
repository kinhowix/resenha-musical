import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  KeyRound,
  Lock,
  Unlock,
  PlusCircle,
  Copy,
  Check,
  Share2,
  X,
  ShieldCheck,
  Radio,
  Trash2,
  RotateCcw,
  Users,
  UserPlus,
  Pencil,
  User,
  Timer,
  Flame,
} from 'lucide-react';
import { subscribeToRooms } from '../services/hybridStore';

export default function MasterMenuModal({
  isOpen,
  onClose,
  isMaster,
  currentMasterUser,
  masterPassword,
  masterUsers = [],
  onUnlockMaster,
  onLockMaster,
  onChangePassword,
  onSaveMasterUser,
  onDeleteMasterUser,
  currentRoomId,
  currentRoomName,
  countdownTargetAt,
  onSetCountdown,
  onCreateOrSwitchRoom,
  onDeleteRoom,
  onDeleteOldRooms,
  onClearCurrentRoom,
  connStatus,
}) {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [roomsList, setRoomsList] = useState([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('15');

  // Campos para criar/renomear sala
  const [newRoomName, setNewRoomName] = useState(currentRoomName || '');
  const [copied, setCopied] = useState(false);

  // Campos para CRUD de Usuários Mestres (Amigos)
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormPass, setUserFormPass] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(null);

  // Campos para alterar a senha mestre principal
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passSavedMsg, setPassSavedMsg] = useState('');

  useEffect(() => {
    setNewRoomName(currentRoomName || '');
  }, [currentRoomName]);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToRooms((list) => {
      setRoomsList(list);
    });
    return () => unsub?.();
  }, [isOpen]);

  if (!isOpen) return null;

  const savedRooms = roomsList;
  const oldRoomsCount = currentRoomId
    ? savedRooms.filter((r) => r.id !== currentRoomId).length
    : savedRooms.length;

  const roomShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?sala=${encodeURIComponent(
          currentRoomId
        )}`
      : `https://resenha-musical.vercel.app/?sala=${currentRoomId}`;

  const handleLogin = (e) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim();
    const cleanPass = passwordInput.trim();

    // 1. Verifica se é a Senha Mestre Principal (Dono/Admin)
    if (cleanPass === masterPassword) {
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      onUnlockMaster({
        id: 'owner',
        name: cleanUser || 'Mestre Principal',
        isOwner: true,
      });
      return;
    }

    // 2. Verifica na lista de Amigos Mestres cadastrados
    const matchedUser = masterUsers.find((u) => {
      const samePass = u.password === cleanPass;
      if (!samePass) return false;
      if (!cleanUser) return true;
      return u.username.toLowerCase() === cleanUser.toLowerCase();
    });

    if (matchedUser) {
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
      onUnlockMaster({
        id: matchedUser.id,
        name: matchedUser.username,
        isOwner: false,
      });
      return;
    }

    setLoginError('Usuário ou Senha Mestre incorretos. Tente novamente!');
  };

  const handleSaveUserForm = async (e) => {
    e.preventDefault();
    if (!userFormName.trim() || !userFormPass.trim()) return;
    await onSaveMasterUser?.({
      id: editingUserId,
      username: userFormName.trim(),
      password: userFormPass.trim(),
    });
    setEditingUserId(null);
    setUserFormName('');
    setUserFormPass('');
  };

  const handleCopyUserCredentials = (u) => {
    const appBaseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://resenha-musical.vercel.app';
    const msg = `🎸 *Acesso Mestre — Resenha Musical*\n\nLink do App: ${appBaseUrl}\n👤 Usuário: *${u.username}*\n🔑 Senha: *${u.password}*\n\nBasta clicar no botão "Mestre" no topo do site e entrar com esses dados para criar sua própria sala!`;
    navigator.clipboard?.writeText(msg);
    setCopiedUserId(u.id);
    setTimeout(() => setCopiedUserId(null), 2500);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateOrSwitchRoom(newRoomName.trim());
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(roomShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `🎸 Entra aí na nossa sala *${currentRoomName}* no Resenha Musical para acompanhar as cifras ao vivo e votar nas próximas músicas:\n${roomShareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleSaveNewPassword = (e) => {
    e.preventDefault();
    if (newPassword.trim().length < 4) return;
    onChangePassword(newPassword.trim());
    setNewPassword('');
    setShowChangePass(false);
    setPassSavedMsg('Senha Mestre atualizada com sucesso!');
    setTimeout(() => setPassSavedMsg(''), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isMaster
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {isMaster ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                {isMaster ? 'Painel do Mestre da Roda' : 'Acesso Mestre'}
              </h2>
              <p className="text-xs text-zinc-400">
                {isMaster
                  ? `Logado como: ${currentMasterUser?.name || 'Mestre'} • Gerencie salas e acessos`
                  : 'Exclusivo para o anfitrião e amigos mestres cadastrados'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TELA DE LOGIN COM USUÁRIO E SENHA MESTRE */}
        {!isMaster ? (
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Usuário / Nome (Opcional para Senha Principal)
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Ex: joao, carlos (ou deixe em branco se for o dono)"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Senha de Acesso Mestre *
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              {loginError && (
                <p className="text-xs text-red-400 mt-2 font-semibold">
                  {loginError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-sm font-medium cursor-pointer"
              >
                Voltar como Convidado
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-sm font-extrabold shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Entrar como Mestre
              </button>
            </div>
          </form>
        ) : (
          /* PAINEL DO MESTRE LOGADO */
          <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
            {/* Alerta caso as Regras do Firebase Firestore ainda estejam bloqueando (Modo Local) */}
            {connStatus?.mode !== 'cloud' && (
              <div className="bg-amber-500/15 border border-amber-500/50 rounded-2xl p-4 space-y-2 text-xs">
                <p className="font-extrabold text-amber-300 text-sm">
                  ⚠️ Atenção: Sincronização entre PC e Celular bloqueada no Firebase!
                </p>
                <p className="text-zinc-300">
                  O banco de dados do Firebase está com a regra padrão bloqueada (<code>if false;</code>). Para o voto do celular aparecer no PC em tempo real:
                </p>
                <ol className="list-decimal list-inside text-zinc-300 space-y-1">
                  <li>
                    Abra as{' '}
                    <a
                      href="https://console.firebase.google.com/project/resenha-musical/firestore/databases/-default-/rules"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 underline font-bold"
                    >
                      Regras do Firestore no Firebase Console (clique aqui)
                    </a>
                  </li>
                  <li>
                    Troque <code>allow read, write: if false;</code> por{' '}
                    <code className="text-emerald-400 font-bold">allow read, write: if true;</code>
                  </li>
                  <li>Clique no botão <strong>Publicar (Publish)</strong> lá no Firebase!</li>
                </ol>
              </div>
            )}

            {/* 1. Criar / Definir Nome da Sala */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-400">
                1. Criar ou Mudar Sala da Resenha
              </label>
              <form
                onSubmit={handleCreateRoom}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ex: Churrasco do Kinho, Resenha de Sábado..."
                  className="w-full sm:flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs sm:text-sm cursor-pointer shrink-0"
                >
                  <PlusCircle className="w-4 h-4" /> Ativar Sala
                </button>
              </form>

              {/* Gerenciamento de Salas e Comandos do Nível Mestre */}
              <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-300">
                    Salas registradas ({savedRooms.length}):
                  </span>
                  {oldRoomsCount > 0 && (
                    <button
                      type="button"
                      disabled={isCleaning}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Deseja apagar TODAS as ${oldRoomsCount} salas antigas do banco de dados e manter apenas a sala atual "${currentRoomName}"?`
                          )
                        ) {
                          return;
                        }
                        setIsCleaning(true);
                        await onDeleteOldRooms?.();
                        setIsCleaning(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {isCleaning
                          ? 'Apagando...'
                          : `Apagar Salas Antigas (${oldRoomsCount})`}
                      </span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {savedRooms.length === 0 ? (
                    <div className="text-center py-4 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-400">
                      Nenhuma sala ativa no momento. Digite um nome acima e clique em <strong>Ativar Sala</strong> para iniciar a resenha!
                    </div>
                  ) : (
                    savedRooms.map((r) => {
                      const isCurrent = r.id === currentRoomId;
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition ${
                            isCurrent
                              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setNewRoomName(r.roomName);
                              onCreateOrSwitchRoom(r.roomName);
                            }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <Radio
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isCurrent ? 'text-amber-400' : 'text-zinc-500'
                              }`}
                            />
                            <span className="font-bold truncate">{r.roomName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-extrabold uppercase shrink-0">
                                Ativa
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            title={`Apagar sala "${r.roomName}"`}
                            onClick={async () => {
                              const msg = `Deseja apagar permanentemente a sala "${r.roomName}"?`;
                              if (!window.confirm(msg)) return;
                              await onDeleteRoom?.(r.id, r.roomName);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Comandos Rápidos do Mestre para Limpeza */}
                {currentRoomId && (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Deseja zerar a fila de votação e o histórico da sala "${currentRoomName}"?`
                          )
                        ) {
                          return;
                        }
                        await onClearCurrentRoom?.();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Zerar Fila e Histórico da Sala Atual</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Link de Atalho e QR Code para Enviar aos Amigos */}
            {currentRoomId && (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold">
                  <Radio className="w-3.5 h-3.5" /> Sala Ativa: {currentRoomName}
                </div>

                <p className="text-xs text-zinc-300">
                  Envie este link para os seus amigos! Quem entrar por ele cai direto no menu simplificado da sala{' '}
                  <strong className="text-white">{currentRoomName}</strong> (sem precisar de senha):
                </p>

                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <QRCodeSVG
                    value={roomShareUrl}
                    size={150}
                    bgColor="#ffffff"
                    fgColor="#09090b"
                    level="M"
                  />
                </div>

                <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 truncate">
                  {roomShareUrl}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" /> Atalho Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copiar Atalho
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-extrabold transition cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" /> Enviar no WhatsApp
                  </button>
                </div>

                {/* Cronômetro Regressivo "Aquecendo o Gogó" (1 gravação apenas, 0 requisições por segundo) */}
                <div className="w-full pt-3 mt-2 border-t border-zinc-800/80 text-left space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Timer className="w-4 h-4" /> Contador &ldquo;Aquecendo o Gogó&rdquo;
                    </span>
                    {countdownTargetAt && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Contagem Ativa
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Coloque uma contagem regressiva na tela dos celulares enquanto a galera vai entrando e votando nas primeiras músicas:
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onSetCountdown?.(mins)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-amber-500 border border-zinc-700 hover:border-amber-400 text-zinc-200 hover:text-zinc-950 text-xs font-extrabold transition cursor-pointer"
                      >
                        +{mins} min
                      </button>
                    ))}

                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customMinutes}
                        onChange={(e) => setCustomMinutes(e.target.value)}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 text-xs text-center text-white focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseInt(customMinutes, 10);
                          if (val > 0) onSetCountdown?.(val);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold cursor-pointer"
                      >
                        Iniciar
                      </button>
                    </div>
                  </div>

                  {countdownTargetAt && (
                    <button
                      type="button"
                      onClick={() => onSetCountdown?.(null)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold transition cursor-pointer"
                    >
                      <Flame className="w-3.5 h-3.5" /> Encerrar Contagem (Começar a Tocar Agora!)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. Gerenciar Usuários Mestres (Amigos que podem criar salas) */}
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>Usuários Mestres para Amigos ({masterUsers.length})</span>
                </label>
              </div>
              <p className="text-xs text-zinc-400">
                Cadastre um usuário e senha para emprestar o modo Mestre aos seus amigos em outras resenhas:
              </p>

              <form
                onSubmit={handleSaveUserForm}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2"
              >
                <input
                  type="text"
                  required
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="Nome / Usuário (ex: carlos)"
                  className="sm:col-span-5 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  required
                  value={userFormPass}
                  onChange={(e) => setUserFormPass(e.target.value)}
                  placeholder="Senha (ex: violao10)"
                  className="sm:col-span-4 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
                />
                <div className="sm:col-span-3 flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs transition cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{editingUserId ? 'Salvar' : 'Incluir'}</span>
                  </button>
                  {editingUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUserId(null);
                        setUserFormName('');
                        setUserFormPass('');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
                    >
                      X
                    </button>
                  )}
                </div>
              </form>

              {masterUsers.length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pt-2 border-t border-zinc-800/80">
                  {masterUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white">{u.username}</span>
                        <span className="text-zinc-500 mx-1.5">•</span>
                        <span className="font-mono text-amber-400">
                          Senha: {u.password}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyUserCredentials(u)}
                          title="Copiar convite com usuário e senha para enviar no WhatsApp"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-bold transition cursor-pointer"
                        >
                          {copiedUserId === u.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-amber-400" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(u.id);
                            setUserFormName(u.username);
                            setUserFormPass(u.password);
                          }}
                          title={`Editar "${u.username}"`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/15 transition cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Deseja remover o acesso Mestre de "${u.username}"?`
                              )
                            ) {
                              return;
                            }
                            await onDeleteMasterUser?.(u.id);
                          }}
                          title={`Excluir "${u.username}"`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Alterar Senha Mestre Principal ou Sair do Modo Mestre */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              {passSavedMsg && (
                <p className="text-xs text-emerald-400 font-bold">
                  {passSavedMsg}
                </p>
              )}

              {!showChangePass ? (
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePass(true)}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 font-medium cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" /> Alterar Senha Mestre
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onLockMaster();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold transition cursor-pointer"
                  >
                    Bloquear Modo Mestre (Ver como Convidado)
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSaveNewPassword}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2.5"
                >
                  <label className="block text-xs font-bold text-zinc-300">
                    Nova Senha Mestre:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      minLength={4}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChangePass(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

