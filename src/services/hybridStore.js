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
        activeRoomId: 'roda-principal',
      };
    }
    return {
      masterPassword: DEFAULT_MASTER_PASSWORD,
      activeRoomId: 'roda-principal',
      ...JSON.parse(raw),
    };
  } catch {
    return {
      masterPassword: DEFAULT_MASTER_PASSWORD,
      activeRoomId: 'roda-principal',
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
          activeRoomId: data.activeRoomId || 'roda-principal',
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

function getDefaultSession(roomId = 'roda-principal', roomName = 'Resenha Musical dos Amigos') {
  return {
    id: roomId,
    roomName,
    currentSongId: INITIAL_SONGS[0].id,
    transpose: 0,
    queue: [
      {
        queueId: 'q-alceu-anunciacao',
        songId: 'alceu-anunciacao',
        votes: 3,
        voters: ['Thiago', 'Bia', 'Carlos'],
        requestedBy: 'Thiago',
        addedAt: new Date(Date.now() - 60000).toISOString(),
      },
      {
        queueId: 'q-tim-maia-descobridor',
        songId: 'tim-maia-descobridor',
        votes: 1,
        voters: ['Mariana'],
        requestedBy: 'Mariana',
        addedAt: new Date().toISOString(),
      },
    ],
    history: [
      {
        historyId: 'h-1',
        songId: 'paralamas-meu-erro',
        playedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      },
    ],
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
      roomName: parsed.roomName || 'Resenha Musical dos Amigos',
      queue: sortQueueByVotes(parsed.queue || []),
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

export function subscribeToSession(callback, roomId = 'roda-principal') {
  if (!localListeners.sessions.has(roomId)) {
    localListeners.sessions.set(roomId, new Set());
  }
  const roomSet = localListeners.sessions.get(roomId);
  roomSet.add(callback);
  callback(getLocalSession(roomId));

  let unsubFirestore = null;
  if (db) {
    const sessionRef = doc(db, 'sessions', roomId);
    unsubFirestore = onSnapshot(
      sessionRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          const initial = getLocalSession(roomId);
          try {
            await withTimeout(setDoc(sessionRef, initial), 3000);
          } catch {
            // fallback
          }
          callback(initial);
          return;
        }
        const cloudData = docSnap.data();
        const normalized = {
          ...cloudData,
          id: roomId,
          roomName: cloudData.roomName || 'Resenha Musical dos Amigos',
          queue: sortQueueByVotes(cloudData.queue || []),
        };
        localStorage.setItem(LOCAL_SESSION_PREFIX + roomId, JSON.stringify(normalized));
        callback(normalized);
      },
      (error) => {
        console.warn('Firestore aviso (session):', error.code || error.message);
        callback(getLocalSession(roomId));
      }
    );
  }

  return () => {
    roomSet.delete(callback);
    unsubFirestore?.();
  };
}

export async function updateLiveSession(partialSession, roomId = 'roda-principal') {
  const updated = saveLocalSession(partialSession, roomId);

  if (db) {
    try {
      const sessionRef = doc(db, 'sessions', roomId);
      await withTimeout(
        setDoc(sessionRef, updated, { merge: true }),
        3500
      );
    } catch (err) {
      console.warn('Sessão atualizada localmente:', err.message);
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
    const listRaw = localStorage.getItem(LOCAL_ROOMS_LIST_KEY);
    const list = listRaw ? JSON.parse(listRaw) : [];
    const filtered = list.filter((r) => r.id !== roomId);
    filtered.unshift({ id: roomId, roomName: cleanName, createdAt: new Date().toISOString() });
    localStorage.setItem(LOCAL_ROOMS_LIST_KEY, JSON.stringify(filtered.slice(0, 15)));
  } catch {
    // ignore
  }

  return { roomId, roomName: cleanName };
}

export function getSavedRoomsList() {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_LIST_KEY);
    if (!raw) {
      return [{ id: 'roda-principal', roomName: 'Resenha Musical dos Amigos' }];
    }
    return JSON.parse(raw);
  } catch {
    return [{ id: 'roda-principal', roomName: 'Resenha Musical dos Amigos' }];
  }
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
  roomId = 'roda-principal'
) {
  const cleanVoter = voterName.trim() || 'Amigo da Roda';
  const currentQueue = [...(currentSession?.queue || [])];
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
  roomId = 'roda-principal'
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

  await updateLiveSession(
    {
      currentSongId: nextSongId,
      transpose: nextTranspose,
      history: updatedHistory,
    },
    roomId
  );
}
