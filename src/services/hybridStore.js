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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
};

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
  if (db) {
    const songsCol = collection(db, 'songs');
    return onSnapshot(songsCol, async (snapshot) => {
      if (snapshot.empty) {
        // Faz seed inicial automático se o banco Firestore estiver vazio
        for (const song of INITIAL_SONGS) {
          await setDoc(doc(db, 'songs', song.id), song);
        }
        return;
      }
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(list);
    });
  } else {
    localListeners.songs.add(callback);
    callback(getLocalSongs());
    return () => localListeners.songs.delete(callback);
  }
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

  if (db) {
    await setDoc(doc(db, 'songs', id), payload, { merge: true });
  } else {
    const songs = getLocalSongs();
    const existingIdx = songs.findIndex((s) => s.id === id);
    if (existingIdx >= 0) {
      songs[existingIdx] = { ...songs[existingIdx], ...payload };
    } else {
      songs.unshift(payload);
    }
    saveLocalSongs(songs);
  }
  return payload;
}

export async function removeSong(songId) {
  if (db) {
    await deleteDoc(doc(db, 'songs', songId));
  } else {
    const songs = getLocalSongs().filter((s) => s.id !== songId);
    saveLocalSongs(songs);
  }
}

// ==========================================
// API HÍBRIDA: SESSÃO DA RODA (Jukebox & Sync)
// ==========================================

export function subscribeToSession(callback, roomId = 'roda-principal') {
  if (db) {
    const sessionRef = doc(db, 'sessions', roomId);
    return onSnapshot(sessionRef, async (docSnap) => {
      if (!docSnap.exists()) {
        const initial = getDefaultSession();
        await setDoc(sessionRef, initial);
        callback(initial);
        return;
      }
      callback(docSnap.data());
    });
  } else {
    localListeners.session.add(callback);
    callback(getLocalSession());
    return () => localListeners.session.delete(callback);
  }
}

export async function updateLiveSession(partialSession, roomId = 'roda-principal') {
  if (db) {
    const sessionRef = doc(db, 'sessions', roomId);
    await setDoc(
      sessionRef,
      { ...partialSession, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } else {
    saveLocalSession(partialSession);
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

  if (db) {
    const songRef = doc(db, 'songs', songId);
    try {
      await updateDoc(songRef, {
        playCount: increment(1),
        lastPlayedAt: now,
      });
    } catch {
      // ignore if song was deleted
    }
  } else {
    const songs = getLocalSongs().map((s) =>
      s.id === songId
        ? { ...s, playCount: (s.playCount || 0) + 1, lastPlayedAt: now }
        : s
    );
    saveLocalSongs(songs);
  }

  await updateLiveSession({
    currentSongId: nextSongId,
    transpose: nextTranspose,
    history: updatedHistory,
  });
}

