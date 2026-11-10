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

const LOCAL_SONGS_KEY = 'resenha_musical_songs_v1';
const LOCAL_SESSION_KEY = 'resenha_musical_session_v1';
const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('resenha_musical_realtime_channel')
    : null;

const localListeners = {
  songs: new Set(),
  session: new Set(),
  status: new Set(),
};

let connectionStatus = {
  mode: db ? 'connecting' : 'local', // 'cloud' | 'local' | 'connecting'
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

// Helper com timeout para que o Firebase nunca trave se o Firestore ainda não tiver sido criado no painel
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
    const { type } = event.data || {};
    if (type === 'SONGS_UPDATED') {
      notifyLocalSongs();
    } else if (type === 'SESSION_UPDATED') {
      notifyLocalSession();
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_SONGS_KEY) notifyLocalSongs();
    if (e.key === LOCAL_SESSION_KEY) notifyLocalSession();
  });
}

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

function getDefaultSession() {
  return {
    id: 'roda-principal',
    currentSongId: INITIAL_SONGS[0].id,
    transpose: 0,
    queue: [
      {
        queueId: 'q-1',
        songId: 'alceu-anunciacao',
        requestedBy: 'Thiago',
        addedAt: new Date().toISOString(),
      },
      {
        queueId: 'q-2',
        songId: 'tim-maia-descobridor',
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

function getLocalSession() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) {
      const initial = getDefaultSession();
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getDefaultSession();
  }
}

function saveLocalSession(sessionData) {
  const updated = {
    ...getLocalSession(),
    ...sessionData,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
  notifyLocalSession();
  broadcastChannel?.postMessage({ type: 'SESSION_UPDATED' });
}

function notifyLocalSession() {
  const session = getLocalSession();
  localListeners.session.forEach((cb) => cb(session));
}

// ==========================================
// API HÍBRIDA: MÚSICAS (CRUD + Tempo Real)
// ==========================================

export function subscribeToSongs(callback) {
  // Sempre registra no listener local e já entrega imediatamente as músicas locais
  // para que a tela nunca fique vazia ou travada!
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
          // Faz seed inicial automático no Firestore com as músicas locais atuais
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
        // Sincroniza cache local com o que veio da nuvem
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

  // 1. Atualiza imediatamente a lista local na tela (UI otimista instantânea!)
  const songs = getLocalSongs();
  const existingIdx = songs.findIndex((s) => s.id === id);
  if (existingIdx >= 0) {
    songs[existingIdx] = { ...songs[existingIdx], ...payload };
  } else {
    songs.unshift(payload);
  }
  saveLocalSongs(songs);

  // 2. Tenta gravar no Firestore em paralelo (com timeout para não travar se o banco não estiver ativo)
  if (db) {
    try {
      await withTimeout(setDoc(doc(db, 'songs', id), payload, { merge: true }), 3500);
      updateConnectionStatus('cloud', null);
    } catch (err) {
      console.warn('Salvo localmente (Firestore pendente):', err.message);
      updateConnectionStatus('local', err.message);
    }
  }

  return payload;
}

export async function removeSong(songId) {
  // 1. Remove imediatamente da lista local
  const songs = getLocalSongs().filter((s) => s.id !== songId);
  saveLocalSongs(songs);

  // 2. Remove do Firestore se ativo
  if (db) {
    try {
      await withTimeout(deleteDoc(doc(db, 'songs', songId)), 3500);
    } catch (err) {
      console.warn('Removido localmente (Firestore pendente):', err.message);
    }
  }
}

// ==========================================
// API HÍBRIDA: SESSÃO DA RODA (Jukebox & Sync)
// ==========================================

export function subscribeToSession(callback, roomId = 'roda-principal') {
  localListeners.session.add(callback);
  callback(getLocalSession());

  let unsubFirestore = null;
  if (db) {
    const sessionRef = doc(db, 'sessions', roomId);
    unsubFirestore = onSnapshot(
      sessionRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          const initial = getLocalSession();
          try {
            await withTimeout(setDoc(sessionRef, initial), 3000);
          } catch {
            // fallback
          }
          callback(initial);
          return;
        }
        const cloudSession = docSnap.data();
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(cloudSession));
        callback(cloudSession);
      },
      (error) => {
        console.warn('Firestore aviso (session):', error.code || error.message);
        callback(getLocalSession());
      }
    );
  }

  return () => {
    localListeners.session.delete(callback);
    unsubFirestore?.();
  };
}

export async function updateLiveSession(partialSession, roomId = 'roda-principal') {
  // 1. Atualiza imediatamente na tela/local
  saveLocalSession(partialSession);

  // 2. Sincroniza com o Firestore
  if (db) {
    try {
      const sessionRef = doc(db, 'sessions', roomId);
      await withTimeout(
        setDoc(
          sessionRef,
          { ...partialSession, updatedAt: new Date().toISOString() },
          { merge: true }
        ),
        3500
      );
    } catch (err) {
      console.warn('Sessão atualizada localmente (Firestore pendente):', err.message);
    }
  }
}

export async function registerSongPlayed(songId, nextSongId, nextTranspose = 0, currentSession) {
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

  // Atualiza contador local imediatamente
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

  await updateLiveSession({
    currentSongId: nextSongId,
    transpose: nextTranspose,
    history: updatedHistory,
  });
}
