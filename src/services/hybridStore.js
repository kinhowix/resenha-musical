import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  increment,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { INITIAL_SONGS } from '../data/initialSongs';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBeq4Tq8b6Z-5xMzJth2-7BjI8bBwdJx2I',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'resenha-musical.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'resenha-musical',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'resenha-musical.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '291158238285',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:291158238285:web:8727cbfd1cf61adc576804',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let db = null;
if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (err) {
    console.error('Erro ao inicializar Firebase, usando Modo Local:', err);
  }
}

export const DEFAULT_MASTER_PASSWORD = 'milavikinho01';

const LOCAL_SONGS_KEY = 'resenha_musical_songs_v1';
const LOCAL_SESSION_PREFIX = 'resenha_musical_room_';
const LOCAL_ROOMS_LIST_KEY = 'resenha_musical_rooms_list_v1';
const LOCAL_SETTINGS_KEY = 'resenha_musical_settings_v1';

const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('resenha_musical_realtime_channel')
    : null;

const localListeners = {
  songs: new Set(),
  sessions: new Map(), // roomId -> Set of callbacks
  rooms: new Set(),
  status: new Set(),
  settings: new Set(),
};

let connectionStatus = {
  mode: db ? 'connecting' : 'local',
  error: null,
};

function updateConnectionStatus(mode, error = null) {
  connectionStatus = { mode, error };
  localListeners.status.forEach((cb) => cb(connectionStatus));
}

export function subscribeToConnectionStatus(callback) {
  localListeners.status.add(callback);
  callback(connectionStatus);
  return () => localListeners.status.delete(callback);
}

function withTimeout(promise, ms = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('FIRESTORE_TIMEOUT')), ms)
    ),
  ]);
}

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const { type, roomId } = event.data || {};
    if (type === 'SONGS_UPDATED') {
      notifyLocalSongs();
    } else if (type === 'SESSION_UPDATED' && roomId) {
      notifyLocalSession(roomId);
    } else if (type === 'SETTINGS_UPDATED') {
      notifyLocalSettings();
    } else if (type === 'ROOMS_UPDATED') {
      notifyLocalRooms();
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_SONGS_KEY) notifyLocalSongs();
    if (e.key && e.key.startsWith(LOCAL_SESSION_PREFIX)) {
      const roomId = e.key.replace(LOCAL_SESSION_PREFIX, '');
      notifyLocalSession(roomId);
    }
    if (e.key === LOCAL_SETTINGS_KEY) notifyLocalSettings();
    if (e.key === LOCAL_ROOMS_LIST_KEY) notifyLocalRooms();
  });
}

// ==========================================
// CONFIGURAÇÕES MESTRE (Senha Mestre)
// ==========================================

function getLocalSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) {
      return {
        masterPassword: DEFAULT_MASTER_PASSWORD,
        activeRoomId: null,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      masterPassword: parsed.masterPassword || DEFAULT_MASTER_PASSWORD,
      activeRoomId:
        parsed.activeRoomId !== undefined ? parsed.activeRoomId : null,
    };
  } catch {
    return {
      masterPassword: DEFAULT_MASTER_PASSWORD,
      activeRoomId: null,
    };
  }
}

function saveLocalSettings(partial) {
  const updated = { ...getLocalSettings(), ...partial };
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
  notifyLocalSettings();
  broadcastChannel?.postMessage({ type: 'SETTINGS_UPDATED' });
  return updated;
}

function notifyLocalSettings() {
  const settings = getLocalSettings();
  localListeners.settings.forEach((cb) => cb(settings));
}

export function subscribeToAppSettings(callback) {
  localListeners.settings.add(callback);
  callback(getLocalSettings());

  let unsubFirestore = null;
  if (db) {
    const settingsRef = doc(db, 'settings', 'global');
    unsubFirestore = onSnapshot(
      settingsRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          const initial = getLocalSettings();
          try {
            await withTimeout(setDoc(settingsRef, initial), 3000);
          } catch {
            // ignore
          }
          callback(initial);
          return;
        }
        const data = docSnap.data();
        const merged = {
          masterPassword: data.masterPassword || DEFAULT_MASTER_PASSWORD,
          activeRoomId:
            data.activeRoomId !== undefined ? data.activeRoomId : null,
        };
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(merged));
        callback(merged);
      },
      () => {
        callback(getLocalSettings());
      }
    );
  }

  return () => {
    localListeners.settings.delete(callback);
    unsubFirestore?.();
  };
}

export async function updateMasterPassword(newPassword) {
  const clean = newPassword.trim();
  if (!clean) return;
  saveLocalSettings({ masterPassword: clean });

  if (db) {
    try {
      await withTimeout(
        setDoc(
          doc(db, 'settings', 'global'),
          { masterPassword: clean, updatedAt: new Date().toISOString() },
          { merge: true }
        ),
        3500
      );
    } catch {
      // ignore
    }
  }
}

// ==========================================
// MÚSICAS (CRUD + Tempo Real)
// ==========================================

function getLocalSongs() {
  try {
    const raw = localStorage.getItem(LOCAL_SONGS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(INITIAL_SONGS));
      return INITIAL_SONGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SONGS;
  }
}

function saveLocalSongs(songs) {
  localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(songs));
  notifyLocalSongs();
  broadcastChannel?.postMessage({ type: 'SONGS_UPDATED' });
}

function notifyLocalSongs() {
  const songs = getLocalSongs();
  localListeners.songs.forEach((cb) => cb(songs));
}

export function subscribeToSongs(callback) {
  localListeners.songs.add(callback);
  callback(getLocalSongs());

  let unsubFirestore = null;
  if (db) {
    const songsCol = collection(db, 'songs');
    unsubFirestore = onSnapshot(
      songsCol,
      async (snapshot) => {
        updateConnectionStatus('cloud', null);
        if (snapshot.empty) {
          const currentLocal = getLocalSongs();
          try {
            for (const song of currentLocal) {
              await withTimeout(setDoc(doc(db, 'songs', song.id), song), 3000);
            }
          } catch (err) {
            updateConnectionStatus('local', err.message);
          }
          return;
        }
        const cloudList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(cloudList));
        callback(cloudList);
      },
      (error) => {
        console.warn('Firestore aviso (songs):', error.code || error.message);
        updateConnectionStatus('local', error.code || error.message);
        callback(getLocalSongs());
      }
    );
  }

  return () => {
    localListeners.songs.delete(callback);
    unsubFirestore?.();
  };
}

export async function saveSong(songData) {
  const id =
    songData.id ||
    `${songData.artist}-${songData.title}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now().toString().slice(-4);

  const payload = {
    ...songData,
    id,
    playCount: songData.playCount ?? 0,
    updatedAt: new Date().toISOString(),
  };

  const songs = getLocalSongs();
  const existingIdx = songs.findIndex((s) => s.id === id);
  if (existingIdx >= 0) {
    songs[existingIdx] = { ...songs[existingIdx], ...payload };
  } else {
    songs.unshift(payload);
  }
  saveLocalSongs(songs);

  if (db) {
    try {
      await withTimeout(setDoc(doc(db, 'songs', id), payload, { merge: true }), 3500);
      updateConnectionStatus('cloud', null);
    } catch (err) {
      updateConnectionStatus('local', err.message);
    }
  }

  return payload;
}

export async function removeSong(songId) {
  const songs = getLocalSongs().filter((s) => s.id !== songId);
  saveLocalSongs(songs);

  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, 'songs', songId)), 3500);
    } catch {
      // ignore
    }
  }
}

// ==========================================
// SALAS E FILA COM RANKING DE VOTOS (PONTOS)
// ==========================================

export function slugifyRoomId(roomName) {
  return (
    roomName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'roda-principal'
  );
}

function formatRoomNameFromId(roomId = 'roda-principal') {
  if (!roomId || roomId === 'roda-principal') return 'Resenha Musical dos Amigos';
  return roomId
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getDefaultSession(roomId = 'roda-principal', roomName) {
  const resolvedName = roomName || formatRoomNameFromId(roomId);
  return {
    id: roomId,
    roomName: resolvedName,
    currentSongId: INITIAL_SONGS[0].id,
    transpose: 0,
    queue: [],
    suggestions: [],
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Ordena a fila sempre pelo maior número de pontos/votos (e desempata por quem pediu primeiro)
 */
export function sortQueueByVotes(queue = []) {
  return [...queue].sort((a, b) => {
    const votesA = a.votes ?? 1;
    const votesB = b.votes ?? 1;
    if (votesB !== votesA) return votesB - votesA;
    return new Date(a.addedAt || 0).getTime() - new Date(b.addedAt || 0).getTime();
  });
}

function getLocalSession(roomId = 'roda-principal') {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_PREFIX + roomId);
    if (!raw) {
      const initial = getDefaultSession(roomId);
      localStorage.setItem(LOCAL_SESSION_PREFIX + roomId, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      roomName: parsed.roomName || formatRoomNameFromId(roomId),
      queue: sortQueueByVotes(parsed.queue || []),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return getDefaultSession(roomId);
  }
}

function saveLocalSession(partialSession, roomId = 'roda-principal') {
  const current = getLocalSession(roomId);
  const updatedQueue = partialSession.queue
    ? sortQueueByVotes(partialSession.queue)
    : current.queue;

  const updated = {
    ...current,
    ...partialSession,
    id: roomId,
    queue: updatedQueue,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_SESSION_PREFIX + roomId, JSON.stringify(updated));
  notifyLocalSession(roomId);
  broadcastChannel?.postMessage({ type: 'SESSION_UPDATED', roomId });
  return updated;
}

function notifyLocalSession(roomId) {
  const session = getLocalSession(roomId);
  const set = localListeners.sessions.get(roomId);
  if (set) {
    set.forEach((cb) => cb(session));
  }
}

export function subscribeToSession(callback, roomId) {
  if (!roomId) {
    callback(null);
    return () => {};
  }

  if (!localListeners.sessions.has(roomId)) {
    localListeners.sessions.set(roomId, new Set());
  }
  const roomSet = localListeners.sessions.get(roomId);
  roomSet.add(callback);

  // Só entrega sessão local imediatamente se ela já existir salva localmente
  const existingLocalRaw = localStorage.getItem(LOCAL_SESSION_PREFIX + roomId);
  if (existingLocalRaw) {
    callback(getLocalSession(roomId));
  }

  let unsubFirestore = null;
  if (db) {
    const sessionRef = doc(db, 'sessions', roomId);
    unsubFirestore = onSnapshot(
      sessionRef,
      (docSnap) => {
        updateConnectionStatus('cloud', null);
        if (!docSnap.exists()) {
          // Se a sala foi apagada no Firestore, remove do cache local também e avisa que não existe!
          localStorage.removeItem(LOCAL_SESSION_PREFIX + roomId);
          callback(null);
          return;
        }
        const cloudData = docSnap.data();
        const normalized = {
          ...cloudData,
          id: roomId,
          roomName: cloudData.roomName || formatRoomNameFromId(roomId),
          queue: sortQueueByVotes(cloudData.queue || []),
          suggestions: Array.isArray(cloudData.suggestions)
            ? cloudData.suggestions
            : [],
        };
        localStorage.setItem(LOCAL_SESSION_PREFIX + roomId, JSON.stringify(normalized));
        callback(normalized);
      },
      (error) => {
        console.warn('Firestore aviso (session):', error.code || error.message);
        updateConnectionStatus('local', error.code || error.message);
        const raw = localStorage.getItem(LOCAL_SESSION_PREFIX + roomId);
        callback(raw ? getLocalSession(roomId) : null);
      }
    );
  } else if (!existingLocalRaw) {
    callback(null);
  }

  return () => {
    roomSet.delete(callback);
    unsubFirestore?.();
  };
}

export async function updateLiveSession(partialSession, roomId) {
  if (!roomId) return null;
  const updated = saveLocalSession(partialSession, roomId);

  if (db) {
    try {
      const sessionRef = doc(db, 'sessions', roomId);
      await withTimeout(
        setDoc(sessionRef, updated, { merge: true }),
        3500
      );
      updateConnectionStatus('cloud', null);
    } catch (err) {
      console.warn('Sessão atualizada localmente:', err.message);
      updateConnectionStatus('local', err.code || err.message);
    }
  }
  return updated;
}

/**
 * Cria ou atualiza uma Sala pelo Mestre
 */
export async function createOrSwitchRoom(roomName, initialSongId) {
  const cleanName = roomName.trim() || 'Resenha Musical';
  const roomId = slugifyRoomId(cleanName);

  // Verifica se a sala já existe no local ou nuvem
  let existing = null;
  if (db) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sessions', roomId)), 2500);
      if (snap.exists()) existing = snap.data();
    } catch {
      // ignore
    }
  }

  if (!existing) {
    const rawLocal = localStorage.getItem(LOCAL_SESSION_PREFIX + roomId);
    if (rawLocal) {
      try {
        existing = JSON.parse(rawLocal);
      } catch {
        existing = null;
      }
    }
  }

  const sessionPayload = existing
    ? { ...existing, roomName: cleanName }
    : {
        id: roomId,
        roomName: cleanName,
        currentSongId: initialSongId || INITIAL_SONGS[0].id,
        transpose: 0,
        queue: [],
        history: [],
        updatedAt: new Date().toISOString(),
      };

  await updateLiveSession(sessionPayload, roomId);
  saveLocalSettings({ activeRoomId: roomId });

  if (db) {
    try {
      await withTimeout(
        setDoc(doc(db, 'settings', 'global'), { activeRoomId: roomId }, { merge: true }),
        3000
      );
    } catch {
      // ignore
    }
  }

  // Salva na lista de salas criadas pelo mestre
  try {
    const list = getSavedRoomsList();
    const filtered = list.filter((r) => r.id !== roomId);
    filtered.unshift({
      id: roomId,
      roomName: cleanName,
      updatedAt: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_ROOMS_LIST_KEY, JSON.stringify(filtered.slice(0, 30)));
    notifyLocalRooms();
    broadcastChannel?.postMessage({ type: 'ROOMS_UPDATED' });
  } catch {
    // ignore
  }

  return { roomId, roomName: cleanName };
}

function notifyLocalRooms() {
  const list = getSavedRoomsList();
  localListeners.rooms.forEach((cb) => cb(list));
}

export function getSavedRoomsList() {
  try {
    const map = new Map();

    // 1. Lê da lista salva
    const raw = localStorage.getItem(LOCAL_ROOMS_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((r) => {
          if (r && r.id) {
            map.set(r.id, {
              id: r.id,
              roomName: r.roomName || r.id,
              updatedAt: r.updatedAt || r.createdAt || null,
            });
          }
        });
      }
    }

    // 2. Descobre sessões salvas no localStorage (caso existam salas antigas)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_SESSION_PREFIX)) {
        const roomId = key.replace(LOCAL_SESSION_PREFIX, '');
        if (roomId && !map.has(roomId)) {
          try {
            const sess = JSON.parse(localStorage.getItem(key) || '{}');
            map.set(roomId, {
              id: roomId,
              roomName: sess.roomName || roomId,
              updatedAt: sess.updatedAt || null,
            });
          } catch {
            map.set(roomId, { id: roomId, roomName: roomId });
          }
        }
      }
    }

    return Array.from(map.values());
  } catch {
    return [];
  }
}

/**
 * Inscreve na lista de salas (combina Firestore 'sessions' + localStorage em tempo real)
 */
export function subscribeToRooms(callback) {
  localListeners.rooms.add(callback);
  callback(getSavedRoomsList());

  let unsubFirestore = null;
  if (db) {
    const sessionsCol = collection(db, 'sessions');
    unsubFirestore = onSnapshot(
      sessionsCol,
      (snapshot) => {
        const cloudRooms = snapshot.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            roomName: data.roomName || d.id,
            updatedAt: data.updatedAt || null,
            queueCount: Array.isArray(data.queue) ? data.queue.length : 0,
          };
        });

        localStorage.setItem(LOCAL_ROOMS_LIST_KEY, JSON.stringify(cloudRooms));
        callback(cloudRooms);
      },
      () => {
        callback(getSavedRoomsList());
      }
    );
  }

  return () => {
    localListeners.rooms.delete(callback);
    unsubFirestore?.();
  };
}

/**
 * Exclui uma sala específica (do Firestore e do navegador local)
 * e retorna a próxima sala disponível (ou null se todas foram apagadas)
 */
export async function deleteRoom(roomId) {
  if (!roomId) return null;

  // Remove do localStorage
  let remainingRooms = [];
  try {
    localStorage.removeItem(LOCAL_SESSION_PREFIX + roomId);
    const raw = localStorage.getItem(LOCAL_ROOMS_LIST_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        remainingRooms = list.filter((r) => r.id !== roomId);
        localStorage.setItem(
          LOCAL_ROOMS_LIST_KEY,
          JSON.stringify(remainingRooms)
        );
      }
    }
  } catch {
    // ignore
  }

  // Remove do Firebase Firestore
  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, 'sessions', roomId)), 3500);
    } catch (err) {
      console.warn('Erro ao excluir sala na nuvem:', err.message);
    }
  }

  // Se a sala apagada era a sala ativa global, atualiza activeRoomId para a próxima sala ou null
  const currentSettings = getLocalSettings();
  const nextActiveId =
    remainingRooms.length > 0 ? remainingRooms[0].id : null;

  if (currentSettings.activeRoomId === roomId) {
    saveLocalSettings({ activeRoomId: nextActiveId });
    if (db) {
      try {
        await withTimeout(
          setDoc(
            doc(db, 'settings', 'global'),
            { activeRoomId: nextActiveId },
            { merge: true }
          ),
          3000
        );
      } catch {
        // ignore
      }
    }
  }

  notifyLocalRooms();
  broadcastChannel?.postMessage({ type: 'ROOMS_UPDATED' });
  return remainingRooms[0] || null;
}

/**
 * Apaga TODAS as salas antigas, mantendo apenas a sala ativa atual (`keepRoomId`)
 */
export async function deleteOldRooms(keepRoomId) {
  const idsToDelete = new Set();

  // Coleta salas locais
  try {
    const localList = getSavedRoomsList();
    localList.forEach((r) => {
      if (r.id && r.id !== keepRoomId) idsToDelete.add(r.id);
    });

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_SESSION_PREFIX)) {
        const id = key.replace(LOCAL_SESSION_PREFIX, '');
        if (id && id !== keepRoomId) idsToDelete.add(id);
      }
    }
  } catch {
    // ignore
  }

  // Coleta e apaga salas na nuvem (Firestore)
  if (db) {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'sessions')), 4000);
      snap.docs.forEach((d) => {
        if (d.id !== keepRoomId) idsToDelete.add(d.id);
      });
    } catch {
      // ignore
    }
  }

  for (const id of idsToDelete) {
    try {
      localStorage.removeItem(LOCAL_SESSION_PREFIX + id);
    } catch {
      // ignore
    }
    if (db) {
      try {
        await withTimeout(deleteDoc(doc(db, 'sessions', id)), 3500);
      } catch {
        // ignore
      }
    }
  }

  // Mantém apenas a sala atual na lista local (se houver)
  try {
    if (keepRoomId) {
      const currentSess = getLocalSession(keepRoomId);
      const remaining = [
        {
          id: keepRoomId,
          roomName: currentSess.roomName || keepRoomId,
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(LOCAL_ROOMS_LIST_KEY, JSON.stringify(remaining));
    } else {
      localStorage.setItem(LOCAL_ROOMS_LIST_KEY, JSON.stringify([]));
    }
  } catch {
    // ignore
  }

  notifyLocalRooms();
  broadcastChannel?.postMessage({ type: 'ROOMS_UPDATED' });
  return idsToDelete.size;
}

/**
 * Limpa a fila de votação e o histórico da sala ativa (Reiniciar Sala)
 */
export async function clearRoomQueueAndHistory(roomId) {
  if (!roomId) return null;
  return await updateLiveSession({ queue: [], history: [] }, roomId);
}

/**
 * Convidado envia uma Sugestão de Música que ainda não está na lista do repertório
 */
export async function addSongSuggestion(
  { title, artist = '', suggestedBy = 'Amigo da Roda' },
  currentSession,
  roomId
) {
  if (!roomId) return [];
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) return [];

  const cleanArtist = (artist || '').trim();
  const cleanUser = (suggestedBy || '').trim() || 'Amigo da Roda';

  let baseSuggestions = Array.isArray(currentSession?.suggestions)
    ? [...currentSession.suggestions]
    : [];

  if (db) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sessions', roomId)), 2500);
      if (snap.exists() && Array.isArray(snap.data()?.suggestions)) {
        baseSuggestions = [...snap.data().suggestions];
      }
    } catch {
      // fallback
    }
  }

  const newSuggestion = {
    suggestionId: `sug-${Date.now()}`,
    title: cleanTitle,
    artist: cleanArtist,
    suggestedBy: cleanUser,
    createdAt: new Date().toISOString(),
  };

  const updated = [newSuggestion, ...baseSuggestions];
  await updateLiveSession({ suggestions: updated }, roomId);
  return updated;
}

/**
 * Mestre remove uma sugestão específica
 */
export async function removeSongSuggestion(
  suggestionId,
  currentSession,
  roomId
) {
  if (!roomId) return [];
  const currentList = Array.isArray(currentSession?.suggestions)
    ? currentSession.suggestions
    : [];
  const updated = currentList.filter((s) => s.suggestionId !== suggestionId);
  await updateLiveSession({ suggestions: updated }, roomId);
  return updated;
}

/**
 * Mestre limpa todas as sugestões da sala
 */
export async function clearRoomSuggestions(roomId) {
  if (!roomId) return;
  await updateLiveSession({ suggestions: [] }, roomId);
}

/**
 * Convidado escolhe/vota em uma música:
 * - Se a música ainda não estiver na fila, entra com 1 ponto (voto).
 * - Se já estiver na fila, soma +1 ponto e sobe automaticamente no Ranking!
 */
export async function voteOrAddSongToQueue(
  songId,
  voterName = 'Amigo da Roda',
  currentSession,
  roomId
) {
  if (!roomId) return [];
  const cleanVoter = voterName.trim() || 'Amigo da Roda';
  let baseQueue = [...(currentSession?.queue || [])];

  if (db) {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'sessions', roomId)), 2500);
      if (snap.exists() && Array.isArray(snap.data()?.queue)) {
        baseQueue = [...snap.data().queue];
      }
    } catch {
      // usa fila local caso falhe
    }
  }

  const currentQueue = baseQueue;
  const existingIdx = currentQueue.findIndex((item) => item.songId === songId);

  if (existingIdx >= 0) {
    const item = currentQueue[existingIdx];
    const currentVotes = item.votes ?? 1;
    const currentVoters = Array.isArray(item.voters)
      ? item.voters
      : item.requestedBy
      ? [item.requestedBy]
      : [];

    const updatedVoters = currentVoters.includes(cleanVoter)
      ? currentVoters
      : [...currentVoters, cleanVoter];

    currentQueue[existingIdx] = {
      ...item,
      votes: currentVotes + 1,
      voters: updatedVoters,
    };
  } else {
    currentQueue.push({
      queueId: `q-${songId}-${Date.now()}`,
      songId,
      votes: 1,
      voters: [cleanVoter],
      requestedBy: cleanVoter,
      addedAt: new Date().toISOString(),
    });
  }

  const sortedQueue = sortQueueByVotes(currentQueue);
  await updateLiveSession({ queue: sortedQueue }, roomId);
  return sortedQueue;
}

export async function registerSongPlayed(
  songId,
  nextSongId,
  nextTranspose = 0,
  currentSession,
  roomId
) {
  const now = new Date().toISOString();
  const newHistoryEntry = {
    historyId: `h-${Date.now()}`,
    songId,
    playedAt: now,
  };

  const updatedHistory = [
    newHistoryEntry,
    ...(currentSession?.history || []).slice(0, 29),
  ];

  const songs = getLocalSongs().map((s) =>
    s.id === songId
      ? { ...s, playCount: (s.playCount || 0) + 1, lastPlayedAt: now }
      : s
  );
  saveLocalSongs(songs);

  if (db) {
    const songRef = doc(db, 'songs', songId);
    try {
      await withTimeout(
        updateDoc(songRef, {
          playCount: increment(1),
          lastPlayedAt: now,
        }),
        3000
      );
    } catch {
      // ignore
    }
  }

  if (roomId) {
    await updateLiveSession(
      {
        currentSongId: nextSongId,
        transpose: nextTranspose,
        history: updatedHistory,
      },
      roomId
    );
  }
}

/**
 * Zera a contagem de vezes tocadas (playCount) de uma música específica (Mestre)
 */
export async function resetSongPlayCount(songId) {
  if (!songId) return;
  const songs = getLocalSongs().map((s) =>
    s.id === songId ? { ...s, playCount: 0, lastPlayedAt: null } : s
  );
  saveLocalSongs(songs);

  if (db) {
    try {
      await withTimeout(
        setDoc(
          doc(db, 'songs', songId),
          { playCount: 0, lastPlayedAt: null },
          { merge: true }
        ),
        3000
      );
    } catch {
      // ignore
    }
  }
}

/**
 * Zera a contagem de vezes tocadas (playCount) de TODAS as músicas ("As Campeãs da Resenha")
 */
export async function resetAllSongsPlayCount() {
  const currentSongs = getLocalSongs();
  const songsToReset = currentSongs.filter((s) => (s.playCount || 0) > 0);
  const updatedSongs = currentSongs.map((s) => ({
    ...s,
    playCount: 0,
    lastPlayedAt: null,
  }));
  saveLocalSongs(updatedSongs);

  if (db) {
    for (const song of songsToReset) {
      try {
        await withTimeout(
          setDoc(
            doc(db, 'songs', song.id),
            { playCount: 0, lastPlayedAt: null },
            { merge: true }
          ),
          3000
        );
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Limpa apenas o histórico recente de músicas tocadas da sala atual (Mestre)
 */
export async function clearRoomHistory(roomId) {
  if (!roomId) return;
  await updateLiveSession({ history: [] }, roomId);
}

